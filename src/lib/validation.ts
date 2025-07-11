import { z } from "zod"
import { UserRole } from "@prisma/client"

// Custom validation functions
export const customValidators = {
  isValidDateRange: (startDate: Date, endDate: Date) => {
    return startDate < endDate && startDate >= new Date(Date.now() - 24 * 60 * 60 * 1000)
  },
  
  isValidRegistrationDeadline: (deadline: Date, eventStart: Date) => {
    return deadline <= eventStart
  },
  
  isValidMaxParticipants: (max: number) => max >= 2 && max <= 1000,
  
  isValidTournamentStatus: (status: string, currentStatus?: string) => {
    const validTransitions: Record<string, string[]> = {
      'DRAFT': ['REGISTRATION_OPEN', 'CANCELLED'],
      'REGISTRATION_OPEN': ['REGISTRATION_CLOSED', 'CANCELLED'],
      'REGISTRATION_CLOSED': ['IN_PROGRESS', 'CANCELLED'],
      'IN_PROGRESS': ['COMPLETED', 'CANCELLED'],
      'COMPLETED': [],
      'CANCELLED': []
    }
    
    if (!currentStatus) return true
    return validTransitions[currentStatus]?.includes(status) ?? false
  },

  isValidCompetitionStatus: (status: string, currentStatus?: string) => {
    const validTransitions: Record<string, string[]> = {
      'DRAFT': ['REGISTRATION_OPEN', 'CANCELLED'],
      'REGISTRATION_OPEN': ['REGISTRATION_CLOSED', 'CANCELLED'],
      'REGISTRATION_CLOSED': ['IN_PROGRESS', 'CANCELLED'],
      'IN_PROGRESS': ['COMPLETED', 'CANCELLED'],
      'COMPLETED': [],
      'CANCELLED': []
    }
    
    if (!currentStatus) return true
    return validTransitions[currentStatus]?.includes(status) ?? false
  }
}

// ===== TOURNAMENT VALIDATION SCHEMAS =====

// Tournament creation schema
export const CreateTournamentSchema = z.object({
  name: z.string().min(1, "Tournament name is required").max(100, "Tournament name too long"),
  description: z.string().max(1000, "Description too long").optional(),
  startDate: z.string().transform((str: string) => new Date(str)),
  endDate: z.string().transform((str: string) => new Date(str)),
  venue: z.string().max(200, "Venue name too long").optional(),
  isPublic: z.boolean().default(false),
  isActive: z.boolean().default(false),
  status: z.enum(["DRAFT", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).default("DRAFT"),
  organizationId: z.string().min(1, "Organization ID is required"),
  createdById: z.string().min(1, "Created by ID is required"),
  translations: z.record(z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(1000).optional()
  })).optional()
})
.refine(
  (data) => customValidators.isValidDateRange(data.startDate, data.endDate),
  {
    message: "End date must be after start date and tournament cannot start more than 1 day in the past",
    path: ["endDate"]
  }
)

// Tournament update schema
export const UpdateTournamentSchema = z.object({
  name: z.string().min(1, "Tournament name is required").max(100, "Tournament name too long").optional(),
  description: z.string().max(1000, "Description too long").optional(),
  startDate: z.string().transform((str: string) => new Date(str)).optional(),
  endDate: z.string().transform((str: string) => new Date(str)).optional(),
  venue: z.string().max(200, "Venue name too long").optional(),
  isPublic: z.boolean().optional(),
  isActive: z.boolean().optional(),
  status: z.enum(["DRAFT", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  organizationId: z.string().min(1, "Organization ID is required").optional(),
  translations: z.record(z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(1000).optional()
  })).optional()
})

// ===== COMPETITION VALIDATION SCHEMAS =====

// Competition creation schema
export const CreateCompetitionSchema = z.object({
  tournamentId: z.string().min(1, "Tournament ID is required"),
  name: z.string().min(1, "Competition name is required").max(100, "Competition name too long"),
  weapon: z.enum(["EPEE", "FOIL", "SABRE"]),
  category: z.string().min(1, "Category is required").max(50, "Category too long"),
  maxParticipants: z.number().int().positive().refine(customValidators.isValidMaxParticipants, "Max participants must be between 2 and 1000").optional(),
  registrationDeadline: z.string().transform((str: string) => new Date(str)).optional(),
  status: z.enum(["DRAFT", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).default("DRAFT"),
  translations: z.record(z.object({
    name: z.string().min(1).max(100)
  })).optional()
})

// Competition update schema
export const UpdateCompetitionSchema = z.object({
  name: z.string().min(1, "Competition name is required").max(100, "Competition name too long").optional(),
  weapon: z.enum(["EPEE", "FOIL", "SABRE"]).optional(),
  category: z.string().min(1, "Category is required").max(50, "Category too long").optional(),
  maxParticipants: z.number().int().positive().refine(customValidators.isValidMaxParticipants, "Max participants must be between 2 and 1000").optional(),
  registrationDeadline: z.string().transform((str: string) => new Date(str)).optional(),
  status: z.enum(["DRAFT", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  translations: z.record(z.object({
    name: z.string().min(1).max(100)
  })).optional()
})

// ===== PHASE VALIDATION SCHEMAS =====

// Phase creation schema
export const CreatePhaseSchema = z.object({
  competitionId: z.string().min(1, "Competition ID is required"),
  name: z.string().min(1, "Phase name is required").max(100, "Phase name too long"),
  phaseType: z.enum(["POULE", "DIRECT_ELIMINATION", "CLASSIFICATION"]),
  sequenceOrder: z.number().int().positive(),
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED"]).default("SCHEDULED"),
  startTime: z.string().transform((str: string) => new Date(str)).optional(),
  endTime: z.string().transform((str: string) => new Date(str)).optional(),
  translations: z.record(z.object({
    name: z.string().min(1).max(100)
  })).optional()
})

// Phase update schema
export const UpdatePhaseSchema = z.object({
  name: z.string().min(1, "Phase name is required").max(100, "Phase name too long").optional(),
  phaseType: z.enum(["POULE", "DIRECT_ELIMINATION", "CLASSIFICATION"]).optional(),
  sequenceOrder: z.number().int().positive().optional(),
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED"]).optional(),
  startTime: z.string().transform((str: string) => new Date(str)).optional(),
  endTime: z.string().transform((str: string) => new Date(str)).optional(),
  translations: z.record(z.object({
    name: z.string().min(1).max(100)
  })).optional()
})

// ===== BACKWARD COMPATIBILITY - LEGACY EVENT SCHEMAS =====

// Legacy event creation schema (for backward compatibility)
export const CreateEventSchema = z.object({
  name: z.string().min(1, "Event name is required").max(100, "Event name too long"),
  description: z.string().max(1000, "Description too long").optional(),
  weapon: z.enum(["EPEE", "FOIL", "SABRE"]),
  category: z.string().min(1, "Category is required").max(50, "Category too long"),
  startDate: z.string().transform((str: string) => new Date(str)),
  endDate: z.string().transform((str: string) => new Date(str)),
  venue: z.string().max(200, "Venue name too long").optional(),
  maxParticipants: z.number().int().positive().refine(customValidators.isValidMaxParticipants, "Max participants must be between 2 and 1000").optional(),
  registrationDeadline: z.string().transform((str: string) => new Date(str)).optional(),
  isPublic: z.boolean().default(false),
  isActive: z.boolean().default(false),
  status: z.enum(["DRAFT", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).default("DRAFT"),
  organizationId: z.string().min(1, "Organization ID is required"),
  createdById: z.string().min(1, "Created by ID is required"),
  translations: z.record(z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(1000).optional()
  })).optional()
})
.refine(
  (data) => customValidators.isValidDateRange(data.startDate, data.endDate),
  {
    message: "End date must be after start date and event cannot start more than 1 day in the past",
    path: ["endDate"]
  }
)
.refine(
  (data) => !data.registrationDeadline || 
    customValidators.isValidRegistrationDeadline(data.registrationDeadline, data.startDate),
  {
    message: "Registration deadline must be before or equal to event start date",
    path: ["registrationDeadline"]
  }
)

// Legacy event update schema (for backward compatibility)
export const UpdateEventSchema = z.object({
  name: z.string().min(1, "Event name is required").max(100, "Event name too long").optional(),
  description: z.string().max(1000, "Description too long").optional(),
  weapon: z.enum(["EPEE", "FOIL", "SABRE"]).optional(),
  category: z.string().min(1, "Category is required").max(50, "Category too long").optional(),
  startDate: z.string().transform((str: string) => new Date(str)).optional(),
  endDate: z.string().transform((str: string) => new Date(str)).optional(),
  venue: z.string().max(200, "Venue name too long").optional(),
  maxParticipants: z.number().int().positive().refine(customValidators.isValidMaxParticipants, "Max participants must be between 2 and 1000").optional(),
  registrationDeadline: z.string().transform((str: string) => new Date(str)).optional(),
  isPublic: z.boolean().optional(),
  isActive: z.boolean().optional(),
  status: z.enum(["DRAFT", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  organizationId: z.string().min(1, "Organization ID is required").optional(),
  translations: z.record(z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(1000).optional()
  })).optional()
})

// ===== QUERY VALIDATION SCHEMAS =====

// Tournament query validation
export const TournamentQuerySchema = z.object({
  organizationId: z.string().optional(),
  status: z.enum(["DRAFT", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  limit: z.string().transform(str => parseInt(str)).pipe(z.number().min(1).max(100)).optional(),
  offset: z.string().transform(str => parseInt(str)).pipe(z.number().min(0)).optional()
})

// Competition query validation
export const CompetitionQuerySchema = z.object({
  tournamentId: z.string().optional(),
  weapon: z.enum(["EPEE", "FOIL", "SABRE"]).optional(),
  category: z.string().max(50).optional(),
  status: z.enum(["DRAFT", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  limit: z.string().transform(str => parseInt(str)).pipe(z.number().min(1).max(100)).optional(),
  offset: z.string().transform(str => parseInt(str)).pipe(z.number().min(0)).optional()
})

// Legacy event query validation (for backward compatibility)
export const EventQuerySchema = z.object({
  organizationId: z.string().optional(),
  status: z.enum(["DRAFT", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  weapon: z.enum(["EPEE", "FOIL", "SABRE"]).optional(),
  category: z.string().max(50).optional(),
  limit: z.string().transform(str => parseInt(str)).pipe(z.number().min(1).max(100)).optional(),
  offset: z.string().transform(str => parseInt(str)).pipe(z.number().min(0)).optional()
})

// Validation error formatter
export function formatValidationErrors(error: z.ZodError) {
  return {
    message: "Validation failed",
    errors: error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }))
  }
}

// ===== AUTHORIZATION HELPERS =====

export const AuthValidators = {
  // Tournament authorization
  canCreateTournament: (userRole: UserRole, userOrgId: string | null, targetOrgId: string) => {
    if (userRole === UserRole.SYSTEM_ADMIN) return true
    if (userRole === UserRole.ORGANIZATION_ADMIN && userOrgId === targetOrgId) return true
    return false
  },
  
  canUpdateTournament: (userRole: UserRole, userOrgId: string | null, tournamentOrgId: string) => {
    if (userRole === UserRole.SYSTEM_ADMIN) return true
    if (userRole === UserRole.ORGANIZATION_ADMIN && userOrgId === tournamentOrgId) return true
    return false
  },
  
  canDeleteTournament: (userRole: UserRole, userOrgId: string | null, tournamentOrgId: string) => {
    if (userRole === UserRole.SYSTEM_ADMIN) return true
    if (userRole === UserRole.ORGANIZATION_ADMIN && userOrgId === tournamentOrgId) return true
    return false
  },
  
  canViewTournament: (userRole: UserRole, userOrgId: string | null, tournamentOrgId: string, isPublic: boolean) => {
    if (userRole === UserRole.SYSTEM_ADMIN) return true
    if (isPublic) return true
    if (userOrgId === tournamentOrgId) return true
    return false
  },

  // Competition authorization
  canCreateCompetition: (userRole: UserRole, userOrgId: string | null, tournamentOrgId: string) => {
    if (userRole === UserRole.SYSTEM_ADMIN) return true
    if (userRole === UserRole.ORGANIZATION_ADMIN && userOrgId === tournamentOrgId) return true
    return false
  },
  
  canUpdateCompetition: (userRole: UserRole, userOrgId: string | null, tournamentOrgId: string) => {
    if (userRole === UserRole.SYSTEM_ADMIN) return true
    if (userRole === UserRole.ORGANIZATION_ADMIN && userOrgId === tournamentOrgId) return true
    return false
  },
  
  canDeleteCompetition: (userRole: UserRole, userOrgId: string | null, tournamentOrgId: string) => {
    if (userRole === UserRole.SYSTEM_ADMIN) return true
    if (userRole === UserRole.ORGANIZATION_ADMIN && userOrgId === tournamentOrgId) return true
    return false
  },

  // Legacy event authorization (for backward compatibility)
  canCreateEvent: (userRole: UserRole, userOrgId: string | null, targetOrgId: string) => {
    if (userRole === UserRole.SYSTEM_ADMIN) return true
    if (userRole === UserRole.ORGANIZATION_ADMIN && userOrgId === targetOrgId) return true
    return false
  },
  
  canUpdateEvent: (userRole: UserRole, userOrgId: string | null, eventOrgId: string) => {
    if (userRole === UserRole.SYSTEM_ADMIN) return true
    if (userRole === UserRole.ORGANIZATION_ADMIN && userOrgId === eventOrgId) return true
    return false
  },
  
  canDeleteEvent: (userRole: UserRole, userOrgId: string | null, eventOrgId: string) => {
    if (userRole === UserRole.SYSTEM_ADMIN) return true
    if (userRole === UserRole.ORGANIZATION_ADMIN && userOrgId === eventOrgId) return true
    return false
  },
  
  canViewEvent: (userRole: UserRole, userOrgId: string | null, eventOrgId: string, isPublic: boolean) => {
    if (userRole === UserRole.SYSTEM_ADMIN) return true
    if (isPublic) return true
    if (userOrgId === eventOrgId) return true
    return false
  }
}

// ===== TYPE EXPORTS =====

// Tournament types
export type CreateTournamentInput = z.infer<typeof CreateTournamentSchema>
export type UpdateTournamentInput = z.infer<typeof UpdateTournamentSchema>
export type TournamentQueryInput = z.infer<typeof TournamentQuerySchema>

// Competition types
export type CreateCompetitionInput = z.infer<typeof CreateCompetitionSchema>
export type UpdateCompetitionInput = z.infer<typeof UpdateCompetitionSchema>
export type CompetitionQueryInput = z.infer<typeof CompetitionQuerySchema>

// Phase types
export type CreatePhaseInput = z.infer<typeof CreatePhaseSchema>
export type UpdatePhaseInput = z.infer<typeof UpdatePhaseSchema>

// Legacy event types (for backward compatibility)
export type CreateEventInput = z.infer<typeof CreateEventSchema>
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>
export type EventQueryInput = z.infer<typeof EventQuerySchema>

export const clubSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  city: z.string().optional(),
  country: z.string().min(1, 'Country is required'),
  organizationId: z.string().optional(),
  imageUrl: z.union([
    z.string().url(), // Valid URL
    z.string().length(0), // Empty string
    z.null() // Null value
  ]).optional(),
});

export const athleteSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  // Add other athlete fields here if needed
});