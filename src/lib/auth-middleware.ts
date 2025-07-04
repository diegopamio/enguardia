import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { UserRole } from "@prisma/client"

const secret = process.env.NEXTAUTH_SECRET

// Role hierarchy for permission checking
export const ROLE_HIERARCHY = {
  [UserRole.SYSTEM_ADMIN]: 4,
  [UserRole.ORGANIZATION_ADMIN]: 3,
  [UserRole.REFEREE]: 2,
  [UserRole.PUBLIC]: 1,
} as const

// Route protection patterns
interface RouteConfig {
  path: string
  requiredRole?: UserRole
  requireAuth?: boolean
  allowedRoles?: UserRole[]
  organizationRequired?: boolean
}

const PROTECTED_ROUTES: RouteConfig[] = [
  // Admin routes
  {
    path: '/admin',
    requiredRole: UserRole.SYSTEM_ADMIN,
    requireAuth: true
  },
  
  // Organization management
  {
    path: '/organization',
    requiredRole: UserRole.ORGANIZATION_ADMIN,
    requireAuth: true,
    organizationRequired: true
  },
  
  // Referee tools
  {
    path: '/referee',
    requiredRole: UserRole.REFEREE,
    requireAuth: true,
    organizationRequired: true
  },
  
  // Profile and user areas
  {
    path: '/profile',
    requireAuth: true
  },
  
  // API routes
  {
    path: '/api/admin',
    requiredRole: UserRole.SYSTEM_ADMIN,
    requireAuth: true
  },
  
  {
    path: '/api/organization',
    requiredRole: UserRole.ORGANIZATION_ADMIN,
    requireAuth: true,
    organizationRequired: true
  },
  
  {
    path: '/api/referee',
    requiredRole: UserRole.REFEREE,
    requireAuth: true,
    organizationRequired: true
  }
]

export async function authMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Get the token from the request
  const token = await getToken({ req: request, secret })
  
  // Find matching route configuration
  const routeConfig = PROTECTED_ROUTES.find(route => 
    pathname.startsWith(route.path)
  )
  
  if (!routeConfig) {
    // No protection needed for this route
    return NextResponse.next()
  }
  
  // Check authentication requirement
  if (routeConfig.requireAuth && !token) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/signin'
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }
  
  if (token) {
    const userRole = token.role as UserRole
    const userOrgId = token.organizationId as string | null
    
    // Check role requirements
    if (routeConfig.requiredRole) {
      if (ROLE_HIERARCHY[userRole] < ROLE_HIERARCHY[routeConfig.requiredRole]) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }
    }
    
    // Check allowed roles
    if (routeConfig.allowedRoles) {
      if (!routeConfig.allowedRoles.includes(userRole)) {
        return NextResponse.json(
          { error: 'Role not allowed for this route' },
          { status: 403 }
        )
      }
    }
    
    // Check organization requirement
    if (routeConfig.organizationRequired && userRole !== UserRole.SYSTEM_ADMIN) {
      if (!userOrgId) {
        return NextResponse.json(
          { error: 'Organization membership required' },
          { status: 403 }
        )
      }
    }
  }
  
  return NextResponse.next()
}

// Helper function to check if a path is protected
export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route.path))
}

// Helper function to get route requirements
export function getRouteRequirements(pathname: string): RouteConfig | null {
  return PROTECTED_ROUTES.find(route => pathname.startsWith(route.path)) || null
} 