/**
 * Tournament Formula Presets System
 * 
 * Provides built-in tournament formulas for common fencing competitions
 * and enables organizations to create, read, update, and delete custom presets.
 * 
 * Feature parity with Engarde's preset system including:
 * - Standard FIE formulas
 * - National championship formats
 * - Club tournament formats
 * - Custom organization presets
 */

import { PhaseType, PhaseStatus, BracketType, SeedingMethod, Weapon } from '@prisma/client'
import { TournamentConfig, PhaseConfig, FormulaTemplate } from './types'

// ===== BUILT-IN PRESET FORMULAS =====

/**
 * Standard preset formulas that match common Engarde configurations
 */
export const BUILT_IN_PRESETS: Record<string, FormulaTemplate> = {
  // Classic formats without match for 3rd place
  'classic-no-3rd': {
    id: 'classic-no-3rd',
    name: 'Classic without match for 3rd place',
    description: 'Standard tournament format with poules followed by direct elimination, no 3rd place playoff',
    weapon: null,
    category: null,
    phases: [
      {
        name: 'Poules',
        phaseType: PhaseType.POULE,
        sequenceOrder: 1,
        qualificationPercentage: 0.7, // Top 70% advance
        pouleSizeVariations: {
          method: 'optimal',
          preferredSize: 7,
          allowedSizes: [6, 7, 8]
        },
        separationRules: {
          club: true,
          country: true,
          maxSameClub: 1,
          maxSameCountry: 2
        }
      },
      {
        name: 'Direct Elimination',
        phaseType: PhaseType.DIRECT_ELIMINATION,
        sequenceOrder: 2,
        bracketConfigs: [{
          bracketType: BracketType.MAIN,
          size: 64, // Will be adjusted based on qualified fencers
          seedingMethod: SeedingMethod.RANKING
        }]
      }
    ],
    isPublic: true,
    organizationId: null
  },

  // Multi-round poule system (like U14 example)
  'multi-round-poules': {
    id: 'multi-round-poules',
    name: 'Multi-round poules (3 rounds)',
    description: 'Three rounds of poules with progressive qualification, ideal for large competitions',
    weapon: null,
    category: null,
    phases: [
      {
        name: 'Poules Round 1',
        phaseType: PhaseType.POULE,
        sequenceOrder: 1,
        qualificationPercentage: 0.68, // ~68% advance (like 125→85)
        pouleSizeVariations: {
          method: 'variable',
          sizes: [7, 6] // Mixed sizes like "17×7, 1×6"
        },
        separationRules: {
          club: true,
          country: true,
          maxSameClub: 1,
          maxSameCountry: 2
        }
      },
      {
        name: 'Poules Round 2',
        phaseType: PhaseType.POULE,
        sequenceOrder: 2,
        qualificationPercentage: 0.76, // ~76% advance (like 85→65)
        pouleSizeVariations: {
          method: 'uniform',
          sizes: [5]
        },
        separationRules: {
          club: true,
          country: true,
          maxSameClub: 1,
          maxSameCountry: 2
        }
      },
      {
        name: 'Poules Round 3',
        phaseType: PhaseType.POULE,
        sequenceOrder: 3,
        qualificationPercentage: 0.74, // ~74% advance (like 65→48)
        pouleSizeVariations: {
          method: 'uniform',
          sizes: [5]
        },
        separationRules: {
          club: true,
          country: true,
          maxSameClub: 1,
          maxSameCountry: 2
        }
      },
      {
        name: 'Direct Elimination',
        phaseType: PhaseType.DIRECT_ELIMINATION,
        sequenceOrder: 4,
        bracketConfigs: [{
          bracketType: BracketType.MAIN,
          size: 64,
          seedingMethod: SeedingMethod.RANKING
        }]
      }
    ],
    isPublic: true,
    organizationId: null
  },

  // FIE World Cup format
  'fie-world-cup': {
    id: 'fie-world-cup',
    name: 'FIE World Cup Format',
    description: 'Official FIE World Cup tournament format with comprehensive bracket system',
    weapon: null,
    category: null,
    phases: [
      {
        name: 'Poules',
        phaseType: PhaseType.POULE,
        sequenceOrder: 1,
        qualificationPercentage: 0.7,
        pouleSizeVariations: {
          method: 'optimal',
          preferredSize: 7,
          allowedSizes: [6, 7, 8]
        },
        separationRules: {
          club: true,
          country: true,
          maxSameClub: 1,
          maxSameCountry: 2
        }
      },
      {
        name: 'Table of 64',
        phaseType: PhaseType.DIRECT_ELIMINATION,
        sequenceOrder: 2,
        bracketConfigs: [{
          bracketType: BracketType.MAIN,
          size: 64,
          seedingMethod: SeedingMethod.RANKING
        }]
      },
      {
        name: 'Classification 9-16',
        phaseType: PhaseType.CLASSIFICATION,
        sequenceOrder: 3,
        bracketConfigs: [{
          bracketType: BracketType.CLASSIFICATION,
          size: 8,
          seedingMethod: SeedingMethod.RANKING
        }]
      }
    ],
    isPublic: true,
    organizationId: null
  },

  // Small club tournament
  'club-tournament': {
    id: 'club-tournament',
    name: 'Club Tournament (Small)',
    description: 'Simple format for small club competitions (8-32 fencers)',
    weapon: null,
    category: null,
    phases: [
      {
        name: 'Poules',
        phaseType: PhaseType.POULE,
        sequenceOrder: 1,
        qualificationPercentage: 0.75,
        pouleSizeVariations: {
          method: 'optimal',
          preferredSize: 6,
          allowedSizes: [5, 6, 7]
        },
        separationRules: {
          club: false, // No club separation in club tournaments
          country: false,
          maxSameClub: 10,
          maxSameCountry: 10
        }
      },
      {
        name: 'Direct Elimination',
        phaseType: PhaseType.DIRECT_ELIMINATION,
        sequenceOrder: 2,
        bracketConfigs: [{
          bracketType: BracketType.MAIN,
          size: 16,
          seedingMethod: SeedingMethod.RANKING
        }]
      }
    ],
    isPublic: true,
    organizationId: null
  },

  // National championship format
  'national-championship': {
    id: 'national-championship',
    name: 'National Championship',
    description: 'Comprehensive national championship format with repechage system',
    weapon: null,
    category: null,
    phases: [
      {
        name: 'Poules',
        phaseType: PhaseType.POULE,
        sequenceOrder: 1,
        qualificationPercentage: 0.65,
        pouleSizeVariations: {
          method: 'optimal',
          preferredSize: 7,
          allowedSizes: [6, 7, 8]
        },
        separationRules: {
          club: true,
          country: false, // National tournament, no country separation
          maxSameClub: 2,
          maxSameCountry: 10
        }
      },
      {
        name: 'Table of 128',
        phaseType: PhaseType.DIRECT_ELIMINATION,
        sequenceOrder: 2,
        bracketConfigs: [{
          bracketType: BracketType.MAIN,
          size: 128,
          seedingMethod: SeedingMethod.RANKING
        }]
      },
      {
        name: 'Repechage',
        phaseType: PhaseType.REPECHAGE,
        sequenceOrder: 3,
        bracketConfigs: [{
          bracketType: BracketType.REPECHAGE,
          size: 16,
          seedingMethod: SeedingMethod.RANKING
        }]
      },
      {
        name: 'Classification 9-16',
        phaseType: PhaseType.CLASSIFICATION,
        sequenceOrder: 4,
        bracketConfigs: [{
          bracketType: BracketType.CLASSIFICATION,
          size: 8,
          seedingMethod: SeedingMethod.RANKING
        }]
      }
    ],
    isPublic: true,
    organizationId: null
  },

  // Direct elimination only
  'direct-elimination-only': {
    id: 'direct-elimination-only',
    name: 'Direct Elimination Only',
    description: 'Pure knockout tournament, no poules (ideal for small fields)',
    weapon: null,
    category: null,
    phases: [
      {
        name: 'Direct Elimination',
        phaseType: PhaseType.DIRECT_ELIMINATION,
        sequenceOrder: 1,
        bracketConfigs: [{
          bracketType: BracketType.MAIN,
          size: 32,
          seedingMethod: SeedingMethod.RANKING
        }]
      }
    ],
    isPublic: true,
    organizationId: null
  },

  // Round robin (everyone fences everyone)
  'round-robin': {
    id: 'round-robin',
    name: 'Round Robin',
    description: 'Everyone fences everyone, no elimination (ideal for very small fields)',
    weapon: null,
    category: null,
    phases: [
      {
        name: 'Round Robin',
        phaseType: PhaseType.POULE,
        sequenceOrder: 1,
        qualificationPercentage: 1.0, // Everyone "qualifies" (no elimination)
        pouleSizeVariations: {
          method: 'single',
          sizes: [16] // One big poule
        },
        separationRules: {
          club: false,
          country: false,
          maxSameClub: 16,
          maxSameCountry: 16
        }
      }
    ],
    isPublic: true,
    organizationId: null
  }
}

// ===== PRESET CATEGORIES =====

export const PRESET_CATEGORIES = {
  CLASSIC: 'Classic Formats',
  FIE: 'FIE Official',
  NATIONAL: 'National Championships',
  CLUB: 'Club Tournaments',
  CUSTOM: 'Custom Formats'
} as const

export type PresetCategory = keyof typeof PRESET_CATEGORIES

// ===== PRESET UTILITIES =====

/**
 * Get all built-in presets organized by category
 */
export function getBuiltInPresets(): Record<PresetCategory, FormulaTemplate[]> {
  return {
    CLASSIC: [
      BUILT_IN_PRESETS['classic-no-3rd'],
      BUILT_IN_PRESETS['multi-round-poules'],
      BUILT_IN_PRESETS['direct-elimination-only'],
      BUILT_IN_PRESETS['round-robin']
    ],
    FIE: [
      BUILT_IN_PRESETS['fie-world-cup']
    ],
    NATIONAL: [
      BUILT_IN_PRESETS['national-championship']
    ],
    CLUB: [
      BUILT_IN_PRESETS['club-tournament']
    ],
    CUSTOM: [] // Will be populated with organization-specific presets
  }
}

/**
 * Get a specific built-in preset by ID
 */
export function getBuiltInPreset(id: string): FormulaTemplate | null {
  return BUILT_IN_PRESETS[id] || null
}

/**
 * Get all preset IDs
 */
export function getBuiltInPresetIds(): string[] {
  return Object.keys(BUILT_IN_PRESETS)
}

/**
 * Check if a preset is built-in (read-only)
 */
export function isBuiltInPreset(id: string): boolean {
  return id in BUILT_IN_PRESETS
}

/**
 * Create a tournament configuration from a preset
 */
export function createTournamentFromPreset(
  preset: FormulaTemplate,
  overrides: Partial<TournamentConfig> = {}
): TournamentConfig {
  const baseConfig: TournamentConfig = {
    id: `tournament-${Date.now()}`,
    name: preset.name,
    weapon: preset.weapon || 'EPEE',
    category: preset.category || 'Senior',
    totalAthletes: 64, // Default, will be adjusted
    phases: preset.phases.map(phase => ({
      ...phase,
      id: `phase-${phase.sequenceOrder}`
    }))
  }

  return {
    ...baseConfig,
    ...overrides
  }
}

/**
 * Validate a formula template
 */
export function validateFormulaTemplate(template: Partial<FormulaTemplate>): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!template.name?.trim()) {
    errors.push('Template name is required')
  }

  if (!template.phases || template.phases.length === 0) {
    errors.push('At least one phase is required')
  }

  if (template.phases) {
    // Validate phase sequence
    const sequences = template.phases.map(p => p.sequenceOrder).sort((a, b) => a - b)
    for (let i = 0; i < sequences.length; i++) {
      if (sequences[i] !== i + 1) {
        errors.push(`Phase sequence must be continuous starting from 1, found gap at ${i + 1}`)
        break
      }
    }

    // Validate phase types
    template.phases.forEach((phase, index) => {
      if (!phase.name?.trim()) {
        errors.push(`Phase ${index + 1} name is required`)
      }
      if (!phase.phaseType) {
        errors.push(`Phase ${index + 1} type is required`)
      }
    })
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Generate preset suggestions based on tournament parameters
 */
export function suggestPresets(params: {
  totalAthletes: number
  weapon?: Weapon
  category?: string
  isClubTournament?: boolean
}): FormulaTemplate[] {
  const suggestions: FormulaTemplate[] = []
  const { totalAthletes, isClubTournament } = params

  // Small tournaments (< 32 fencers)
  if (totalAthletes < 32) {
    suggestions.push(BUILT_IN_PRESETS['club-tournament'])
    suggestions.push(BUILT_IN_PRESETS['direct-elimination-only'])
    if (totalAthletes <= 16) {
      suggestions.push(BUILT_IN_PRESETS['round-robin'])
    }
  }

  // Medium tournaments (32-64 fencers)
  else if (totalAthletes <= 64) {
    suggestions.push(BUILT_IN_PRESETS['classic-no-3rd'])
    if (!isClubTournament) {
      suggestions.push(BUILT_IN_PRESETS['fie-world-cup'])
    }
    suggestions.push(BUILT_IN_PRESETS['club-tournament'])
  }

  // Large tournaments (> 64 fencers)
  else {
    suggestions.push(BUILT_IN_PRESETS['multi-round-poules'])
    suggestions.push(BUILT_IN_PRESETS['national-championship'])
    suggestions.push(BUILT_IN_PRESETS['fie-world-cup'])
    suggestions.push(BUILT_IN_PRESETS['classic-no-3rd'])
  }

  return suggestions
}

// ===== PRESET ADAPTATION =====

/**
 * Adapt a preset to specific tournament parameters
 */
export function adaptPresetToTournament(
  preset: FormulaTemplate,
  params: {
    totalAthletes: number
    weapon?: Weapon
    category?: string
  }
): FormulaTemplate {
  const adapted = { ...preset }
  
  // Update weapon and category if provided
  if (params.weapon) adapted.weapon = params.weapon
  if (params.category) adapted.category = params.category

  // Adapt phases based on athlete count
  adapted.phases = adapted.phases.map(phase => {
    const adaptedPhase = { ...phase }

    // Adjust bracket sizes based on athlete count
    if (phase.bracketConfigs) {
      adaptedPhase.bracketConfigs = phase.bracketConfigs.map(bracket => ({
        ...bracket,
        size: calculateOptimalBracketSize(params.totalAthletes, bracket.size)
      }))
    }

    // Adjust poule sizes for very small tournaments
    if (phase.pouleSizeVariations && params.totalAthletes < 20) {
      adaptedPhase.pouleSizeVariations = {
        ...phase.pouleSizeVariations,
        preferredSize: 5,
        allowedSizes: [4, 5, 6]
      }
    }

    return adaptedPhase
  })

  return adapted
}

/**
 * Calculate optimal bracket size based on athlete count
 */
function calculateOptimalBracketSize(athleteCount: number, preferredSize: number): number {
  const validSizes = [8, 16, 32, 64, 128, 256]
  
  // Find the smallest valid size that can accommodate the athletes
  for (const size of validSizes) {
    if (size >= athleteCount) {
      return size
    }
  }
  
  // If athlete count exceeds largest bracket, use the preferred size
  return preferredSize
} 