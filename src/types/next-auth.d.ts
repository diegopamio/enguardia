import NextAuth from "next-auth"
import { UserRole } from "@prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: UserRole
      organizationId?: string | null
      organizationName?: string | null
    }
  }

  interface User {
    role: UserRole
    organizationId?: string | null
    organizationName?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole
    organizationId?: string | null
    organizationName?: string | null
  }
} 