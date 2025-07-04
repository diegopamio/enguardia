import { NextRequest, NextResponse } from "next/server"
import { withApiAuth, authValidators } from "@/lib/api-auth"
import { UserRole } from "@prisma/client"

// Test endpoint that requires authentication
export const GET = withApiAuth(async (req: NextRequest, session) => {
  return NextResponse.json({
    message: "Authentication successful",
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      organizationId: session.user.organizationId,
      organizationName: session.user.organizationName
    },
    timestamp: new Date().toISOString()
  })
}, { requireAuth: true })

// Test endpoint for organization admins only
export const POST = withApiAuth(async (req: NextRequest, session) => {
  const body = await req.json()
  
  return NextResponse.json({
    message: "Organization admin access confirmed",
    user: {
      role: session.user.role,
      organizationId: session.user.organizationId,
      organizationName: session.user.organizationName
    },
    requestBody: body,
    timestamp: new Date().toISOString()
  })
}, { 
  requiredRole: UserRole.ORGANIZATION_ADMIN,
  organizationRequired: true 
})

// Test endpoint for system admins only
export const PUT = withApiAuth(async (req: NextRequest, session) => {
  return NextResponse.json({
    message: "System admin access confirmed",
    user: {
      role: session.user.role,
      organizationId: session.user.organizationId
    },
    systemInfo: {
      canAccessAllOrganizations: true,
      hasMaximumPrivileges: true
    },
    timestamp: new Date().toISOString()
  })
}, { requiredRole: UserRole.SYSTEM_ADMIN })

// Test endpoint with custom validation
export const PATCH = withApiAuth(async (req: NextRequest, session) => {
  const url = new URL(req.url)
  const targetOrgId = url.searchParams.get('organizationId')
  
  if (targetOrgId) {
    // Validate organization access
    authValidators.organizationAccess(session, targetOrgId)
  }
  
  return NextResponse.json({
    message: "Custom validation passed",
    user: {
      role: session.user.role,
      organizationId: session.user.organizationId
    },
    targetOrganization: targetOrgId,
    timestamp: new Date().toISOString()
  })
}, { 
  requireAuth: true,
  customValidator: async (session, req) => {
    // Custom business logic validation
    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    
    // Example: Only allow "read" actions for PUBLIC users
    if (session.user.role === UserRole.PUBLIC && action !== 'read') {
      return false
    }
    
    return true
  }
}) 