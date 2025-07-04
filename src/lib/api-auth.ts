import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "./auth"
import { UserRole } from "@prisma/client"
import { Session } from "next-auth"

// Role hierarchy for permission checking
export const ROLE_HIERARCHY = {
  [UserRole.SYSTEM_ADMIN]: 4,
  [UserRole.ORGANIZATION_ADMIN]: 3,
  [UserRole.REFEREE]: 2,
  [UserRole.PUBLIC]: 1,
} as const

// Custom error classes
export class ApiAuthError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message)
    this.name = 'ApiAuthError'
  }
}

// Authorization configuration for API routes
interface ApiAuthConfig {
  requiredRole?: UserRole
  requireAuth?: boolean
  allowedRoles?: UserRole[]
  organizationRequired?: boolean
  allowCrossOrganization?: boolean
  customValidator?: (session: Session, req: NextRequest) => Promise<boolean>
}

// Main API authorization wrapper
export function withApiAuth(
  handler: (req: NextRequest, session: Session) => Promise<NextResponse>,
  config: ApiAuthConfig = {}
) {
  return async (req: NextRequest) => {
    try {
      // Get session
      const session = await getServerSession(authOptions)
      
      // Check authentication requirement
      if (config.requireAuth !== false && !session) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        )
      }
      
      if (session) {
        const userRole = session.user.role
        const userOrgId = session.user.organizationId
        
        // Check role requirements
        if (config.requiredRole) {
          if (ROLE_HIERARCHY[userRole] < ROLE_HIERARCHY[config.requiredRole]) {
            return NextResponse.json(
              { 
                error: "Insufficient permissions",
                required: config.requiredRole,
                current: userRole
              },
              { status: 403 }
            )
          }
        }
        
        // Check allowed roles
        if (config.allowedRoles && !config.allowedRoles.includes(userRole)) {
          return NextResponse.json(
            { 
              error: "Role not allowed",
              allowedRoles: config.allowedRoles,
              current: userRole
            },
            { status: 403 }
          )
        }
        
        // Check organization requirement
        if (config.organizationRequired && userRole !== UserRole.SYSTEM_ADMIN) {
          if (!userOrgId) {
            return NextResponse.json(
              { error: "Organization membership required" },
              { status: 403 }
            )
          }
        }
        
        // Custom validation
        if (config.customValidator) {
          const isValid = await config.customValidator(session, req)
          if (!isValid) {
            return NextResponse.json(
              { error: "Custom authorization failed" },
              { status: 403 }
            )
          }
        }
      }
      
      return handler(req, session!)
      
    } catch (error) {
      console.error('API Auth Error:', error)
      
      if (error instanceof ApiAuthError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.statusCode }
        )
      }
      
      return NextResponse.json(
        { error: "Internal authentication error" },
        { status: 500 }
      )
    }
  }
}

// Specific authorization validators
export const authValidators = {
  // Require system admin
  systemAdmin: (session: Session) => {
    if (session.user.role !== UserRole.SYSTEM_ADMIN) {
      throw new ApiAuthError("System administrator access required", 403)
    }
    return true
  },
  
  // Require organization admin or higher
  organizationAdmin: (session: Session) => {
    if (ROLE_HIERARCHY[session.user.role] < ROLE_HIERARCHY[UserRole.ORGANIZATION_ADMIN]) {
      throw new ApiAuthError("Organization administrator access required", 403)
    }
    return true
  },
  
  // Require referee or higher
  referee: (session: Session) => {
    if (ROLE_HIERARCHY[session.user.role] < ROLE_HIERARCHY[UserRole.REFEREE]) {
      throw new ApiAuthError("Referee access required", 403)
    }
    return true
  },
  
  // Validate organization access
  organizationAccess: (session: Session, organizationId: string) => {
    if (session.user.role === UserRole.SYSTEM_ADMIN) {
      return true // System admin can access any organization
    }
    
    if (session.user.organizationId !== organizationId) {
      throw new ApiAuthError(
        `Access denied: Cannot access organization ${organizationId}`,
        403
      )
    }
    return true
  },
  
  // Validate resource ownership (for organization-scoped resources)
  resourceOwnership: (session: Session, resourceOrgId: string) => {
    if (session.user.role === UserRole.SYSTEM_ADMIN) {
      return true // System admin can access any resource
    }
    
    if (session.user.organizationId !== resourceOrgId) {
      throw new ApiAuthError(
        "Access denied: Resource belongs to different organization",
        403
      )
    }
    return true
  },
  
  // Validate user management permissions
  userManagement: (session: Session, targetUserRole: UserRole, targetUserOrgId: string) => {
    const managerRole = session.user.role
    const managerOrgId = session.user.organizationId
    
    // SYSTEM_ADMIN can manage anyone
    if (managerRole === UserRole.SYSTEM_ADMIN) {
      return true
    }
    
    // ORGANIZATION_ADMIN can manage users in their organization (except other ORGANIZATION_ADMINs)
    if (managerRole === UserRole.ORGANIZATION_ADMIN) {
      if (managerOrgId !== targetUserOrgId) {
        throw new ApiAuthError("Cannot manage users from other organizations", 403)
      }
      
      if (ROLE_HIERARCHY[managerRole] <= ROLE_HIERARCHY[targetUserRole]) {
        throw new ApiAuthError("Cannot manage users with equal or higher role", 403)
      }
      
      return true
    }
    
    // REFEREE and PUBLIC cannot manage other users
    throw new ApiAuthError("Insufficient permissions for user management", 403)
  }
}

// Request body helpers
export async function getRequestBody<T = any>(req: NextRequest): Promise<T> {
  try {
    const body = await req.json()
    return body as T
  } catch (error) {
    throw new ApiAuthError("Invalid request body", 400)
  }
}

// URL parameter helpers
export function getUrlParams(req: NextRequest): Record<string, string> {
  const url = new URL(req.url)
  const params: Record<string, string> = {}
  
  url.searchParams.forEach((value, key) => {
    params[key] = value
  })
  
  return params
}

// Organization ID extraction from various sources
export async function extractOrganizationId(req: NextRequest): Promise<string | null> {
  // Try URL parameters first
  const url = new URL(req.url)
  const orgFromUrl = url.searchParams.get('organizationId')
  if (orgFromUrl) return orgFromUrl
  
  // Try path segments (e.g., /api/organization/[orgId]/events)
  const pathSegments = url.pathname.split('/')
  const orgIndex = pathSegments.findIndex(segment => segment === 'organization')
  if (orgIndex !== -1 && orgIndex < pathSegments.length - 1) {
    return pathSegments[orgIndex + 1]
  }
  
  // Try request body for POST/PUT requests
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const body = await req.clone().json()
      if (body.organizationId) return body.organizationId
    } catch (error) {
      // Ignore JSON parsing errors
    }
  }
  
  return null
}

// Utility functions for common authorization patterns
export const apiAuth = {
  // Wrapper for system admin only endpoints
  systemAdminOnly: (handler: (req: NextRequest, session: Session) => Promise<NextResponse>) =>
    withApiAuth(handler, { requiredRole: UserRole.SYSTEM_ADMIN }),
  
  // Wrapper for organization admin or higher endpoints
  organizationAdminUp: (handler: (req: NextRequest, session: Session) => Promise<NextResponse>) =>
    withApiAuth(handler, { requiredRole: UserRole.ORGANIZATION_ADMIN }),
  
  // Wrapper for referee or higher endpoints
  refereeUp: (handler: (req: NextRequest, session: Session) => Promise<NextResponse>) =>
    withApiAuth(handler, { requiredRole: UserRole.REFEREE }),
  
  // Wrapper for authenticated users
  authenticated: (handler: (req: NextRequest, session: Session) => Promise<NextResponse>) =>
    withApiAuth(handler, { requireAuth: true }),
  
  // Wrapper with organization validation
  withOrganization: (
    handler: (req: NextRequest, session: Session, organizationId: string) => Promise<NextResponse>
  ) =>
    withApiAuth(async (req, session) => {
      const organizationId = await extractOrganizationId(req)
      if (!organizationId) {
        return NextResponse.json(
          { error: "Organization ID required" },
          { status: 400 }
        )
      }
      
      // Validate organization access
      authValidators.organizationAccess(session, organizationId)
      
      return handler(req, session, organizationId)
    }, { requireAuth: true, organizationRequired: true })
}

// Error response helpers
export const apiError = {
  unauthorized: (message = "Authentication required") =>
    NextResponse.json({ error: message }, { status: 401 }),
  
  forbidden: (message = "Access denied") =>
    NextResponse.json({ error: message }, { status: 403 }),
  
  badRequest: (message = "Bad request") =>
    NextResponse.json({ error: message }, { status: 400 }),
  
  notFound: (message = "Resource not found") =>
    NextResponse.json({ error: message }, { status: 404 }),
  
  internal: (message = "Internal server error") =>
    NextResponse.json({ error: message }, { status: 500 })
} 