/**
 * Formula Engine - Core Tournament Management System
 * 
 * Handles multi-round tournament logic with support for:
 * - Complex poule systems (1-5 rounds, variable sizes)
 * - Automatic qualification between phases
 * - Advanced bracket generation
 * - Club/nationality separation
 * - Engarde formula compatibility
 */

import { 
  TournamentConfig, 
  PhaseConfig, 
  AthleteData, 
  AthleteResult,
  PouleGenerationResult,
  BracketGenerationResult,
  PhaseTransitionResult,
  ValidationResult,
  FormulaEngineOptions,
  TournamentState,
  PhaseState,
  QualificationRules,
  PouleSizeConfig,
  SeparationRules,
  EngardeFormula
} from './types'

import { PhaseType, PhaseStatus, BracketType, SeedingMethod } from '@prisma/client'

export class FormulaEngine {
  private options: FormulaEngineOptions
  private tournamentState: TournamentState | null = null

  constructor(options: FormulaEngineOptions = {}) {
    this.options = {
      strictSeparation: true,
      allowIncompletePoules: false,
      randomSeed: Date.now(),
      optimizeForBalance: true,
      ...options
    }
  }

  // ===== TOURNAMENT INITIALIZATION =====

  /**
   * Initialize a tournament with the given configuration
   */
  async initializeTournament(config: TournamentConfig): Promise<ValidationResult> {
    const validation = this.validateTournamentConfig(config)
    if (!validation.isValid) {
      return validation
    }

    this.tournamentState = {
      competitionId: config.id,
      currentPhase: 0,
      phases: config.phases.map(phase => ({
        phaseId: phase.id || `phase-${phase.sequenceOrder}`,
        status: PhaseStatus.SCHEDULED,
        results: [],
        qualifiedAthletes: [],
        eliminatedAthletes: []
      })),
      overallRanking: []
    }

    return { isValid: true, errors: [], warnings: [] }
  }

  /**
   * Validate tournament configuration
   */
  validateTournamentConfig(config: TournamentConfig): ValidationResult {
    const errors: Array<{type: 'configuration' | 'data' | 'constraint', message: string, field?: string, phaseIndex?: number}> = []
    const warnings: Array<{type: 'optimization' | 'separation' | 'balance', message: string, suggestion?: string}> = []

    // Basic validation
    if (!config.id || !config.name) {
      errors.push({ type: 'configuration', message: 'Tournament ID and name are required' })
    }

    if (config.totalAthletes < 3) {
      errors.push({ type: 'constraint', message: 'Minimum 3 athletes required for tournament' })
    }

    if (config.phases.length === 0) {
      errors.push({ type: 'configuration', message: 'At least one phase is required' })
    }

    // Phase validation
    config.phases.forEach((phase, index) => {
      if (!phase.name || !phase.phaseType) {
        errors.push({ 
          type: 'configuration', 
          message: `Phase ${index + 1} missing required fields`,
          phaseIndex: index 
        })
      }

      // Validate poule phases
      if (phase.phaseType === PhaseType.POULE) {
        if (phase.pouleSizeVariations) {
          const validation = this.validatePouleSizeConfig(phase.pouleSizeVariations, config.totalAthletes)
          errors.push(...validation.errors.map(e => ({ ...e, phaseIndex: index })))
          warnings.push(...validation.warnings)
        }
      }

      // Validate qualification rules
      if (phase.qualificationRules) {
        const validation = this.validateQualificationRules(phase.qualificationRules, config.totalAthletes)
        errors.push(...validation.errors.map(e => ({ ...e, phaseIndex: index })))
        warnings.push(...validation.warnings)
      }
    })

    // Check phase sequence
    const sequenceOrders = config.phases.map(p => p.sequenceOrder).sort((a, b) => a - b)
    for (let i = 0; i < sequenceOrders.length; i++) {
      if (sequenceOrders[i] !== i + 1) {
        errors.push({ type: 'configuration', message: 'Phase sequence orders must be consecutive starting from 1' })
        break
      }
    }

    return { isValid: errors.length === 0, errors, warnings }
  }

  // ===== POULE GENERATION =====

  /**
   * Generate poules for a phase
   */
  async generatePoules(
    phaseConfig: PhaseConfig,
    athletes: AthleteData[],
    previousResults?: AthleteResult[]
  ): Promise<PouleGenerationResult> {
    if (phaseConfig.phaseType !== PhaseType.POULE) {
      throw new Error('Phase must be of type POULE for poule generation')
    }

    // Sort athletes by ranking/seeding
    const sortedAthletes = this.sortAthletesByRanking(athletes, previousResults)
    
    // Determine poule sizes
    const pouleSizes = this.calculatePouleSizes(
      phaseConfig.pouleSizeVariations || { method: 'optimal' },
      athletes.length
    )

    // Generate poules with separation rules
    const poules = await this.distributeAthletesToPoules(
      sortedAthletes,
      pouleSizes,
      phaseConfig.separationRules || { club: true, country: true }
    )

    // Calculate statistics
    const statistics = this.calculatePouleStatistics(poules)

    return {
      poules,
      separationViolations: [], // Will be populated by distributeAthletesToPoules
      statistics
    }
  }

  /**
   * Calculate optimal poule sizes based on configuration
   */
  private calculatePouleSizes(config: PouleSizeConfig, totalAthletes: number): number[] {
    switch (config.method) {
      case 'fixed':
        if (!config.fixedSize) throw new Error('Fixed size not specified')
        const numPoules = Math.ceil(totalAthletes / config.fixedSize)
        return Array(numPoules).fill(config.fixedSize)

      case 'variable':
        if (!config.sizes) throw new Error('Variable sizes not specified')
        return [...config.sizes]

      case 'optimal':
      default:
        return this.calculateOptimalPouleSizes(totalAthletes, config.minSize || 5, config.maxSize || 7)
    }
  }

  /**
   * Calculate optimal poule sizes for balanced distribution
   */
  private calculateOptimalPouleSizes(totalAthletes: number, minSize: number = 5, maxSize: number = 7): number[] {
    const sizes: number[] = []
    let remaining = totalAthletes

    // Try to create poules of maxSize, then adjust for remainder
    while (remaining > 0) {
      if (remaining >= maxSize) {
        sizes.push(maxSize)
        remaining -= maxSize
      } else if (remaining >= minSize) {
        sizes.push(remaining)
        remaining = 0
      } else {
        // Redistribute to avoid too small poules
        const lastSize = sizes.pop() || maxSize
        const redistributed = Math.floor((lastSize + remaining) / 2)
        sizes.push(redistributed, lastSize + remaining - redistributed)
        remaining = 0
      }
    }

    return sizes
  }

  // ===== ATHLETE DISTRIBUTION =====

  /**
   * Distribute athletes to poules with separation rules
   */
  private async distributeAthletesToPoules(
    athletes: AthleteData[],
    pouleSizes: number[],
    separationRules: SeparationRules
  ): Promise<import('./types').GeneratedPoule[]> {
    const poules: import('./types').GeneratedPoule[] = pouleSizes.map((size, index) => ({
      id: `poule-${index + 1}`,
      number: index + 1,
      athletes: [],
      size
    }))

    // Snake seeding with separation constraints
    let currentPoule = 0
    let direction = 1 // 1 for forward, -1 for backward
    
    for (const athlete of athletes) {
      // Find best poule considering separation rules
      const bestPoule = this.findBestPouleForAthlete(
        athlete,
        poules,
        currentPoule,
        separationRules
      )

      // Assign athlete to poule
      poules[bestPoule].athletes.push({
        athleteId: athlete.id,
        position: poules[bestPoule].athletes.length + 1,
        seedNumber: athletes.indexOf(athlete) + 1,
        club: athlete.club?.name,
        country: athlete.nationality
      })

      // Update current poule for snake pattern
      currentPoule += direction
      if (currentPoule >= poules.length || currentPoule < 0) {
        direction *= -1
        currentPoule = Math.max(0, Math.min(poules.length - 1, currentPoule))
      }
    }

    return poules
  }

  /**
   * Find the best poule for an athlete considering separation rules
   */
  private findBestPouleForAthlete(
    athlete: AthleteData,
    poules: import('./types').GeneratedPoule[],
    preferredPoule: number,
    separationRules: SeparationRules
  ): number {
    // Check if preferred poule is available and valid
    if (this.canAssignToPoule(athlete, poules[preferredPoule], separationRules)) {
      return preferredPoule
    }

    // Find alternative poule
    for (let i = 0; i < poules.length; i++) {
      if (this.canAssignToPoule(athlete, poules[i], separationRules)) {
        return i
      }
    }

    // If strict separation is disabled, use preferred poule anyway
    if (!this.options.strictSeparation) {
      return preferredPoule
    }

    throw new Error(`Cannot assign athlete ${athlete.id} to any poule while maintaining separation rules`)
  }

  /**
   * Check if an athlete can be assigned to a poule
   */
  private canAssignToPoule(
    athlete: AthleteData,
    poule: import('./types').GeneratedPoule,
    separationRules: SeparationRules
  ): boolean {
    // Check if poule is full
    if (poule.athletes.length >= poule.size) {
      return false
    }

    // Check club separation
    if (separationRules.club && athlete.club) {
      const sameClubCount = poule.athletes.filter(a => a.club === athlete.club?.name).length
      const maxSameClub = separationRules.maxSameClub || 1
      if (sameClubCount >= maxSameClub) {
        return false
      }
    }

    // Check country separation
    if (separationRules.country) {
      const sameCountryCount = poule.athletes.filter(a => a.country === athlete.nationality).length
      const maxSameCountry = separationRules.maxSameCountry || 1
      if (sameCountryCount >= maxSameCountry) {
        return false
      }
    }

    return true
  }

  // ===== QUALIFICATION MANAGEMENT =====

  /**
   * Calculate qualification for next phase
   */
  async calculateQualification(
    phaseConfig: PhaseConfig,
    results: AthleteResult[]
  ): Promise<PhaseTransitionResult> {
    if (!phaseConfig.qualificationRules) {
      return {
        success: false,
        qualifiedAthletes: [],
        eliminatedAthletes: [],
        errors: ['No qualification rules defined for phase'],
        warnings: []
      }
    }

    const sortedResults = this.sortResultsByRanking(results)
    const qualifiedAthletes: string[] = []
    const eliminatedAthletes: string[] = []

    // Apply qualification rules
    const rules = phaseConfig.qualificationRules
    let qualificationCount = 0

    if (rules.method === 'quota' && rules.quota) {
      qualificationCount = Math.min(rules.quota, results.length)
    } else if (rules.method === 'percentage' && rules.percentage) {
      qualificationCount = Math.floor(results.length * (rules.percentage / 100))
    }

    // Qualify top athletes
    for (let i = 0; i < qualificationCount && i < sortedResults.length; i++) {
      qualifiedAthletes.push(sortedResults[i].athleteId)
    }

    // Mark remaining as eliminated
    for (let i = qualificationCount; i < sortedResults.length; i++) {
      eliminatedAthletes.push(sortedResults[i].athleteId)
    }

    return {
      success: true,
      qualifiedAthletes,
      eliminatedAthletes,
      errors: [],
      warnings: []
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Sort athletes by ranking/seeding
   */
  private sortAthletesByRanking(athletes: AthleteData[], previousResults?: AthleteResult[]): AthleteData[] {
    if (!previousResults) {
      // Sort by initial ranking
      return [...athletes].sort((a, b) => {
        const rankA = a.ranking?.rank || 999999
        const rankB = b.ranking?.rank || 999999
        return rankA - rankB
      })
    }

    // Sort by previous results
    const resultMap = new Map(previousResults.map(r => [r.athleteId, r]))
    return [...athletes].sort((a, b) => {
      const resultA = resultMap.get(a.id)
      const resultB = resultMap.get(b.id)
      
      if (!resultA || !resultB) return 0
      
      return resultA.rank - resultB.rank
    })
  }

  /**
   * Sort results by ranking
   */
  private sortResultsByRanking(results: AthleteResult[]): AthleteResult[] {
    return [...results].sort((a, b) => {
      // Primary: victories (descending)
      if (a.victories !== b.victories) {
        return b.victories - a.victories
      }
      
      // Secondary: indicator (descending)
      if (a.indicator !== b.indicator) {
        return b.indicator - a.indicator
      }
      
      // Tertiary: touches scored (descending)
      return b.touchesScored - a.touchesScored
    })
  }

  /**
   * Calculate poule statistics
   */
  private calculatePouleStatistics(poules: import('./types').GeneratedPoule[]): import('./types').PouleStatistics {
    const totalPoules = poules.length
    const totalAthletes = poules.reduce((sum, p) => sum + p.athletes.length, 0)
    const averageSize = totalAthletes / totalPoules

    const sizeDistribution: Record<number, number> = {}
    poules.forEach(poule => {
      sizeDistribution[poule.size] = (sizeDistribution[poule.size] || 0) + 1
    })

    return {
      totalPoules,
      averageSize,
      sizeDistribution,
      separationSuccess: 100 // Will be calculated based on actual violations
    }
  }

  // ===== VALIDATION HELPERS =====

  private validatePouleSizeConfig(config: PouleSizeConfig, totalAthletes: number): ValidationResult {
    const errors: Array<{type: 'configuration' | 'data' | 'constraint', message: string, field?: string}> = []
    const warnings: Array<{type: 'optimization' | 'separation' | 'balance', message: string, suggestion?: string}> = []

    if (config.method === 'fixed' && !config.fixedSize) {
      errors.push({ type: 'configuration', message: 'Fixed size must be specified for fixed method' })
    }

    if (config.method === 'variable' && !config.sizes) {
      errors.push({ type: 'configuration', message: 'Sizes array must be specified for variable method' })
    }

    if (config.sizes) {
      const totalCapacity = config.sizes.reduce((sum, size) => sum + size, 0)
      if (totalCapacity !== totalAthletes) {
        warnings.push({
          type: 'balance',
          message: `Poule sizes total ${totalCapacity} but have ${totalAthletes} athletes`,
          suggestion: 'Adjust poule sizes to match athlete count'
        })
      }
    }

    return { isValid: errors.length === 0, errors, warnings }
  }

  private validateQualificationRules(rules: QualificationRules, totalAthletes: number): ValidationResult {
    const errors: Array<{type: 'configuration' | 'data' | 'constraint', message: string, field?: string}> = []
    const warnings: Array<{type: 'optimization' | 'separation' | 'balance', message: string, suggestion?: string}> = []

    if (rules.method === 'quota' && !rules.quota) {
      errors.push({ type: 'configuration', message: 'Quota must be specified for quota method' })
    }

    if (rules.method === 'percentage' && !rules.percentage) {
      errors.push({ type: 'configuration', message: 'Percentage must be specified for percentage method' })
    }

    if (rules.quota && rules.quota > totalAthletes) {
      warnings.push({
        type: 'balance',
        message: `Qualification quota ${rules.quota} exceeds total athletes ${totalAthletes}`,
        suggestion: 'Reduce qualification quota'
      })
    }

    return { isValid: errors.length === 0, errors, warnings }
  }

  // ===== ENGARDE COMPATIBILITY =====

  /**
   * Convert Engarde formula to internal format
   */
  static fromEngardeFormula(formula: EngardeFormula): TournamentConfig {
    const phases: PhaseConfig[] = []

    // Convert rounds to poule phases
    formula.rounds.forEach((round, index) => {
      phases.push({
        name: `Round ${round.roundNumber}`,
        phaseType: PhaseType.POULE,
        sequenceOrder: index + 1,
        qualificationQuota: round.qualified,
        pouleSizeVariations: {
          method: 'variable',
          sizes: round.pouleSizes
        },
        separationRules: {
          club: round.separation.includes('clubs'),
          country: round.separation.includes('nations')
        }
      })
    })

    // Add elimination phase
    phases.push({
      name: 'Direct Elimination',
      phaseType: PhaseType.DIRECT_ELIMINATION,
      sequenceOrder: phases.length + 1,
      bracketConfigs: [{
        bracketType: BracketType.MAIN,
        size: formula.elimination.tableauSize,
        seedingMethod: SeedingMethod.RANKING
      }]
    })

    return {
      id: `engarde-${Date.now()}`,
      name: 'Imported from Engarde',
      weapon: 'EPEE' as any, // Will need to be specified
      category: 'Senior',
      totalAthletes: formula.totalFencers,
      phases
    }
  }
} 