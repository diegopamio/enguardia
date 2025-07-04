import { getServerSession } from "next-auth/next"
import { authOptions } from "./auth"
import { UserRole } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"
import { Session } from "next-auth"
import { redirect } from "next/navigation"

// Role hierarchy for permission checking
export const ROLE_HIERARCHY = {
  [UserRole.SYSTEM_ADMIN]: 4,
  [UserRole.ORGANIZATION_ADMIN]: 3,
  [UserRole.REFEREE]: 2,
  [UserRole.PUBLIC]: 1,
} as const

// Authorization error types
export class AuthorizationError extends Error {
  constructor(message: string, public statusCode: number = 403) {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = "Authentication required") {
    super(message)
    this.name = 'AuthenticationError'
  }
}

// Basic session utilities
export async function getSession() {
  return await getServerSession(authOptions)
}

export async function requireAuth(): Promise<Session> {
  const session = await getSession()
  if (!session) {
    throw new AuthenticationError()
  }
  return session
}

// Role-based authorization
export async function requireRole(requiredRole: UserRole): Promise<Session> {
  const session = await requireAuth()
  
  if (ROLE_HIERARCHY[session.user.role] < ROLE_HIERARCHY[requiredRole]) {
    throw new AuthorizationError(
      `Insufficient permissions. Required: ${requiredRole}, Current: ${session.user.role}`
    )
  }
  
  return session
}

// Organization-based authorization
export async function requireOrganizationAccess(organizationId: string): Promise<Session> {
  const session = await requireAuth()
  
  // SYSTEM_ADMIN can access any organization
  if (session.user.role === UserRole.SYSTEM_ADMIN) {
    return session
  }
  
  // Other users can only access their own organization
  if (session.user.organizationId !== organizationId) {
    throw new AuthorizationError(
      `Access denied: Cannot access organization ${organizationId}`
    )
  }
  
  return session
}

// Combined role and organization authorization
export async function requireRoleAndOrganization(
  requiredRole: UserRole, 
  organizationId: string
): Promise<Session> {
  const session = await requireRole(requiredRole)
  
  // SYSTEM_ADMIN bypasses organization restrictions
  if (session.user.role === UserRole.SYSTEM_ADMIN) {
    return session
  }
  
  // Check organization access for non-system admins
  if (session.user.organizationId !== organizationId) {
    throw new AuthorizationError(
      `Access denied: Cannot access organization ${organizationId} with role ${session.user.role}`
    )
  }
  
  return session
}

// Specific role shortcuts
export async function requireSystemAdmin(): Promise<Session> {
  return await requireRole(UserRole.SYSTEM_ADMIN)
}

export async function requireOrganizationAdmin(): Promise<Session> {
  return await requireRole(UserRole.ORGANIZATION_ADMIN)
}

export async function requireReferee(): Promise<Session> {
  return await requireRole(UserRole.REFEREE)
}

// Resource ownership validation
export async function requireResourceOwnership(
  resourceOrgId: string,
  options?: { allowSystemAdmin?: boolean }
): Promise<Session> {
  const session = await requireAuth()
  const { allowSystemAdmin = true } = options || {}
  
  // SYSTEM_ADMIN can access all resources if allowed
  if (allowSystemAdmin && session.user.role === UserRole.SYSTEM_ADMIN) {
    return session
  }
  
  // Check if user belongs to the resource's organization
  if (session.user.organizationId !== resourceOrgId) {
    throw new AuthorizationError(
      "Access denied: Resource belongs to a different organization"
    )
  }
  
  return session
}

// Multi-organization validation (for resources spanning multiple orgs)
export async function requireMultiOrganizationAccess(
  organizationIds: string[]
): Promise<Session> {
  const session = await requireAuth()
  
  // SYSTEM_ADMIN can access any combination of organizations
  if (session.user.role === UserRole.SYSTEM_ADMIN) {
    return session
  }
  
  // For non-system admins, they can only access if their org is in the list
  if (!session.user.organizationId || !organizationIds.includes(session.user.organizationId)) {
    throw new AuthorizationError(
      "Access denied: Insufficient organization access"
    )
  }
  
  return session
}

// API middleware with enhanced options
interface AuthMiddlewareOptions {
  requiredRole?: UserRole
  organizationId?: string
  allowSameOrganization?: boolean
  requireResourceOwnership?: boolean
  customValidator?: (session: Session, req: NextRequest) => Promise<boolean>
}

export function withAuth(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  options: AuthMiddlewareOptions = {}
) {
  return async (req: NextRequest, context?: any) => {
    try {
      const session = await getSession()
      if (!session) {
        return NextResponse.json(
          { error: "Authentication required" }, 
          { status: 401 }
        )
      }

      // Role validation
      if (options.requiredRole) {
        if (ROLE_HIERARCHY[session.user.role] < ROLE_HIERARCHY[options.requiredRole]) {
          return NextResponse.json(
            { error: `Insufficient permissions. Required: ${options.requiredRole}` }, 
            { status: 403 }
          )
        }
      }

      // Organization validation
      if (options.organizationId && session.user.role !== UserRole.SYSTEM_ADMIN) {
        if (options.allowSameOrganization) {
          // Allow if user belongs to the same organization
          if (session.user.organizationId !== options.organizationId) {
            return NextResponse.json(
              { error: "Access denied: Different organization" },
              { status: 403 }
            )
          }
        } else {
          // Strict organization match required
          if (session.user.organizationId !== options.organizationId) {
            return NextResponse.json(
              { error: "Access denied: Organization mismatch" },
              { status: 403 }
            )
          }
        }
      }

      // Custom validation
      if (options.customValidator) {
        const isValid = await options.customValidator(session, req)
        if (!isValid) {
          return NextResponse.json(
            { error: "Access denied: Custom validation failed" },
            { status: 403 }
          )
        }
      }

      // Add session to request context and context object
      (req as any).session = session
      const contextWithSession = { ...context, session }
      return handler(req, contextWithSession)

    } catch (error) {
      if (error instanceof AuthenticationError) {
        return NextResponse.json(
          { error: error.message },
          { status: 401 }
        )
      }
      
      if (error instanceof AuthorizationError) {
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

// Server-side authorization helpers

// Page-level authorization wrapper
export function requireAuthWrapper<T extends any[]>(
  handler: (...args: T) => Promise<any>,
  authCheck: () => Promise<Session>
) {
  return async (...args: T) => {
    try {
      await authCheck()
      return handler(...args)
    } catch (error) {
      if (error instanceof AuthenticationError) {
        // Redirect to sign-in page
        return { redirect: { destination: '/auth/signin', permanent: false } }
      }
      if (error instanceof AuthorizationError) {
        // Return 403 page or redirect to unauthorized page
        return { notFound: true }
      }
      throw error
    }
  }
}

// Utility for extracting organization ID from request
export function extractOrganizationId(req: NextRequest): string | null {
  // Try to get from query parameters
  const url = new URL(req.url)
  const orgFromQuery = url.searchParams.get('organizationId')
  if (orgFromQuery) return orgFromQuery
  
  // Try to get from request body (for POST/PUT requests)
  // Note: This would need to be called after parsing the body
  return null
}

// Validation helpers
export function isSystemAdmin(session: Session): boolean {
  return session.user.role === UserRole.SYSTEM_ADMIN
}

export function isOrganizationAdmin(session: Session): boolean {
  return session.user.role === UserRole.ORGANIZATION_ADMIN
}

export function isReferee(session: Session): boolean {
  return session.user.role === UserRole.REFEREE
}

export function belongsToOrganization(session: Session, organizationId: string): boolean {
  return session.user.organizationId === organizationId
}

/**
 * Check if user has required role (role hierarchy support)
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

/**
 * Page-level authentication guard for protected routes
 * Use this in page components to enforce authentication and roles
 */
export async function requirePageAuth(options: {
  requiredRole?: UserRole
  requireOrganization?: boolean
  redirectTo?: string
} = {}) {
  const session = await getServerSession(authOptions)
  const { requiredRole, requireOrganization = false, redirectTo = '/auth/signin' } = options

  // Check authentication
  if (!session?.user) {
    redirect(redirectTo)
  }

  // Check role requirement
  if (requiredRole) {
    const userRole = session.user.role as UserRole
    if (!hasRole(userRole, requiredRole)) {
      redirect('/unauthorized')
    }
  }

  // Check organization requirement
  if (requireOrganization && !session.user.organizationId) {
    redirect('/unauthorized')
  }

  return session
}

/**
 * Layout-level authentication check
 * Returns null if not authenticated, session if authenticated
 */
export async function checkPageAuth(options: {
  requiredRole?: UserRole
  requireOrganization?: boolean
} = {}) {
  try {
    const session = await getServerSession(authOptions)
    const { requiredRole, requireOrganization = false } = options

    if (!session?.user) {
      return null
    }

    if (requiredRole) {
      const userRole = session.user.role as UserRole
      if (!hasRole(userRole, requiredRole)) {
        return null
      }
    }

    if (requireOrganization && !session.user.organizationId) {
      return null
    }

    return session
  } catch (error) {
    console.error('Auth check failed:', error)
    return null
  }
} 