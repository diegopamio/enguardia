/**
 * Tournament Management System
 * 
 * Comprehensive tournament management with Engarde feature parity
 * supporting multi-round tournaments, complex formulas, and advanced bracket systems.
 */

// Core Engine
export { FormulaEngine } from './FormulaEngine'

// Types
export * from './types'

// Version info
export const TOURNAMENT_SYSTEM_VERSION = '1.0.0'

// Feature flags for development
export const FEATURES = {
  MULTI_ROUND_POULES: true,
  VARIABLE_POULE_SIZES: true,
  AUTOMATIC_QUALIFICATION: true,
  CLUB_NATIONALITY_SEPARATION: true,
  ENGARDE_COMPATIBILITY: true,
  ADVANCED_BRACKET_SYSTEMS: false, // Coming in next phase
  FORMULA_TEMPLATES: false, // Coming in next phase
  REAL_TIME_UPDATES: false // Coming in next phase
} as const 