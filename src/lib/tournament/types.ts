/**
 * Tournament Formula Engine Types
 * 
 * Comprehensive type definitions for multi-round tournament management
 * supporting Engarde feature parity including complex formulas like:
 * - Multi-round poule systems (1-5 rounds)
 * - Variable poule sizes within rounds
 * - Automatic qualification between phases
 * - Advanced bracket systems (Main, Repechage, Classification)
 */

import { PhaseType, PhaseStatus, BracketType, SeedingMethod, Weapon } from '@prisma/client'

// ===== CORE TOURNAMENT TYPES =====

export interface TournamentConfig {
  id: string
  name: string
  weapon: Weapon
  category: string
  totalAthletes: number
  phases: PhaseConfig[]
}

export interface PhaseConfig {
  id?: string
  name: string
  phaseType: PhaseType
  sequenceOrder: number
  
  // Multi-round support
  qualificationQuota?: number
  qualificationPercentage?: number
  qualificationRules?: QualificationRules
  
  // Poule-specific configuration
  pouleSizeVariations?: PouleSizeConfig
  separationRules?: SeparationRules
  
  // Bracket-specific configuration
  bracketConfigs?: BracketConfig[]
  
  // General configuration
  configuration?: Record<string, any>
}

// ===== QUALIFICATION SYSTEM =====

export interface QualificationRules {
  method: 'quota' | 'percentage' | 'custom'
  quota?: number
  percentage?: number
  tiebreakRules?: TiebreakRule[]
  customRules?: CustomQualificationRule[]
}

export interface TiebreakRule {
  order: number
  criterion: 'victories' | 'indicator' | 'touchesScored' | 'headToHead' | 'random'
  direction: 'asc' | 'desc'
}

export interface CustomQualificationRule {
  condition: string // e.g., "victories >= 3 AND indicator > 0"
  priority: number
}

// ===== POULE SYSTEM =====

export interface PouleSizeConfig {
  method: 'fixed' | 'variable' | 'optimal'
  fixedSize?: number
  sizes?: number[] // For variable: [7, 7, 7, 6] means 3 poules of 7, 1 poule of 6
  minSize?: number
  maxSize?: number
  distribution?: 'auto' | 'manual'
}

export interface SeparationRules {
  club: boolean
  country: boolean
  maxSameClub?: number
  maxSameCountry?: number
  strictSeparation?: boolean // If true, violates separation rules only if impossible
}

export interface PouleGenerationResult {
  poules: GeneratedPoule[]
  separationViolations: SeparationViolation[]
  statistics: PouleStatistics
}

export interface GeneratedPoule {
  id: string
  number: number
  athletes: AthleteAssignment[]
  size: number
}

export interface AthleteAssignment {
  athleteId: string
  position: number
  seedNumber?: number
  club?: string
  country?: string
}

export interface SeparationViolation {
  pouleNumber: number
  type: 'club' | 'country'
  violatedRule: string
  athleteIds: string[]
}

export interface PouleStatistics {
  totalPoules: number
  averageSize: number
  sizeDistribution: Record<number, number>
  separationSuccess: number // percentage
}

// ===== BRACKET SYSTEM =====

export interface BracketConfig {
  bracketType: BracketType
  size: number
  seedingMethod: SeedingMethod
  configuration?: BracketConfiguration
}

export interface BracketConfiguration {
  // Main bracket config
  eliminationRounds?: number
  byeDistribution?: 'top' | 'bottom' | 'spread'
  
  // Repechage config
  repechageRounds?: number
  repechageSource?: 'firstRound' | 'quarterFinals' | 'semiFinals'
  
  // Classification config
  classificationPositions?: number[]
  classificationMethod?: 'bracket' | 'ranking'
}

export interface BracketGenerationResult {
  brackets: GeneratedBracket[]
  seeding: SeedingResult[]
  byeAssignments: ByeAssignment[]
}

export interface GeneratedBracket {
  id: string
  bracketType: BracketType
  size: number
  rounds: BracketRound[]
}

export interface BracketRound {
  roundNumber: number
  matches: BracketMatch[]
}

export interface BracketMatch {
  id: string
  position: number
  athleteAId?: string
  athleteBId?: string
  winnerId?: string
  isBye: boolean
}

export interface SeedingResult {
  athleteId: string
  seedPosition: number
  bracketType: BracketType
  qualification: QualificationSource
}

export interface QualificationSource {
  phaseId: string
  rank: number
  method: 'poule' | 'bracket' | 'wildcard'
}

export interface ByeAssignment {
  athleteId: string
  round: number
  position: number
}

// ===== ATHLETE DATA =====

export interface AthleteData {
  id: string
  firstName: string
  lastName: string
  nationality: string
  club?: {
    id: string
    name: string
    country: string
  }
  ranking?: {
    rank: number
    points: number
  }
  weapon: Weapon
}

export interface AthleteResult {
  athleteId: string
  phaseId: string
  rank: number
  victories: number
  matches: number
  touchesScored: number
  touchesReceived: number
  indicator: number
  vmRatio: number
  isEliminated: boolean
  qualifiesForNext: boolean
}

// ===== FORMULA TEMPLATES =====

export interface FormulaTemplate {
  id: string
  name: string
  description?: string
  weapon?: Weapon
  category?: string
  phases: PhaseConfig[]
  isPublic: boolean
  organizationId?: string
}

export interface TemplateApplication {
  templateId: string
  competitionId: string
  adaptations: TemplateAdaptation[]
}

export interface TemplateAdaptation {
  phaseIndex: number
  field: string
  originalValue: any
  adaptedValue: any
  reason: string
}

// ===== TOURNAMENT PROGRESSION =====

export interface TournamentState {
  competitionId: string
  currentPhase: number
  phases: PhaseState[]
  overallRanking: AthleteResult[]
}

export interface PhaseState {
  phaseId: string
  status: PhaseStatus
  results: AthleteResult[]
  qualifiedAthletes: string[]
  eliminatedAthletes: string[]
}

// ===== FORMULA ENGINE OPERATIONS =====

export interface FormulaEngineOptions {
  strictSeparation?: boolean
  allowIncompletePoules?: boolean
  randomSeed?: number
  optimizeForBalance?: boolean
}

export interface PhaseTransitionResult {
  success: boolean
  qualifiedAthletes: string[]
  eliminatedAthletes: string[]
  nextPhaseConfig?: PhaseConfig
  errors: string[]
  warnings: string[]
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  type: 'configuration' | 'data' | 'constraint'
  message: string
  field?: string
  phaseIndex?: number
}

export interface ValidationWarning {
  type: 'optimization' | 'separation' | 'balance'
  message: string
  suggestion?: string
}

// ===== ENGARDE COMPATIBILITY =====

export interface EngardeFormula {
  totalFencers: number
  rounds: EngardeRound[]
  elimination: EngardeElimination
}

export interface EngardeRound {
  roundNumber: number
  poules: number
  pouleSizes: number[]
  separation: string[] // ["clubs", "nations"]
  qualified: number
}

export interface EngardeElimination {
  tableauSize: number
  hasThirdPlace: boolean
  repechage?: boolean
}

// Export all types for external use
export type {
  // Re-export Prisma types that are commonly used
  PhaseType,
  PhaseStatus,
  BracketType,
  SeedingMethod,
  Weapon
} 