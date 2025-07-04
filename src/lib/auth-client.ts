"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { UserRole } from "@prisma/client"
import { Session } from "next-auth"

// Role hierarchy for permission checking
export const ROLE_HIERARCHY = {
  [UserRole.SYSTEM_ADMIN]: 4,
  [UserRole.ORGANIZATION_ADMIN]: 3,
  [UserRole.REFEREE]: 2,
  [UserRole.PUBLIC]: 1,
} as const

export function useRoleCheck() {
  const { data: session, status } = useSession()
  
  const hasRole = (requiredRole: UserRole): boolean => {
    if (!session?.user?.role) return false
    return ROLE_HIERARCHY[session.user.role] >= ROLE_HIERARCHY[requiredRole]
  }
  
  const isSystemAdmin = (): boolean => {
    return session?.user?.role === UserRole.SYSTEM_ADMIN
  }
  
  const isOrganizationAdmin = (): boolean => {
    return session?.user?.role === UserRole.ORGANIZATION_ADMIN
  }
  
  const isReferee = (): boolean => {
    return session?.user?.role === UserRole.REFEREE
  }
  
  const belongsToOrganization = (organizationId: string): boolean => {
    if (!session?.user?.organizationId) return false
    return session.user.organizationId === organizationId || isSystemAdmin()
  }
  
  return {
    session,
    status,
    hasRole,
    isSystemAdmin,
    isOrganizationAdmin,
    isReferee,
    belongsToOrganization,
    loading: status === "loading",
    authenticated: status === "authenticated"
  }
}

export function useRequireAuth(options: {
  requiredRole?: UserRole
  requireOrganization?: boolean
  redirectTo?: string
} = {}) {
  const { session, status, hasRole } = useRoleCheck()
  const router = useRouter()
  
  useEffect(() => {
    if (status === "loading") return
    
    if (!session) {
      router.push(options.redirectTo || "/auth/signin")
      return
    }
    
    if (options.requiredRole && !hasRole(options.requiredRole)) {
      router.push("/unauthorized")
      return
    }
    
    if (options.requireOrganization && !session.user.organizationId) {
      router.push("/setup/organization")
      return
    }
  }, [session, status, router, options.requiredRole, options.requireOrganization, options.redirectTo, hasRole])
  
  return { session, loading: status === "loading" }
} 