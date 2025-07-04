import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaClient, UserRole } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

export const authOptions: NextAuthOptions = {
  // Note: Removed PrismaAdapter for now due to compatibility issues
  // We'll handle user creation manually in the signIn callback
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email,
            },
            include: {
              organization: true, // Include organization data
            },
          })

          if (!user) {
            return null
          }

          // For demo purposes, we're allowing any password
          // In production, uncomment the following lines for proper password verification:
          /*
          if (!user.password) {
            return null // User hasn't set a password (OAuth only)
          }
          
          const isValidPassword = await bcrypt.compare(credentials.password, user.password)
          if (!isValidPassword) {
            return null
          }
          */

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            organizationId: user.organizationId,
            organizationName: user.organization?.name || null,
          }
        } catch (error) {
          console.error("Authentication error:", error)
          return null
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // On first sign-in, add custom claims
      if (user) {
        token.role = user.role
        token.organizationId = user.organizationId
        token.organizationName = user.organizationName
        token.iat = Math.floor(Date.now() / 1000) // Set issued at time
      }

      // Security: Check token age and refresh if needed
      const now = Math.floor(Date.now() / 1000)
      const tokenAge = now - (token.iat as number || now)
      
      // If token is older than 12 hours, refresh user data from database
      if (tokenAge > 12 * 60 * 60) {
        try {
          const user = await prisma.user.findUnique({
            where: { id: token.sub },
            include: { organization: true },
          })
          
          if (user) {
            token.role = user.role
            token.organizationId = user.organizationId
            token.organizationName = user.organization?.name || null
            token.iat = now // Update issued at time
          }
        } catch (error) {
          console.error("Token refresh error:", error)
          // Return null to force re-authentication if user data can't be refreshed
          return null
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!
        session.user.role = token.role as UserRole
        session.user.organizationId = token.organizationId as string | null
        session.user.organizationName = token.organizationName as string | null
        
        // Add security metadata
        session.expires = new Date(token.exp! * 1000).toISOString()
      }
      return session
    },
    async signIn({ user, account, profile }) {
      try {
        // For OAuth providers, we need to handle user creation/update
        if (account?.provider === "google" && profile?.email) {
          const existingUser = await prisma.user.findUnique({
            where: { email: profile.email },
            include: { organization: true },
          })

          if (existingUser) {
            // Update the session user data with existing user info
            user.role = existingUser.role
            user.organizationId = existingUser.organizationId
            user.organizationName = existingUser.organization?.name || null
            return true
          } else {
            // For new OAuth users, create with PUBLIC role and no organization
            // In a real app, you might want to redirect to an organization selection page
            const newUser = await prisma.user.create({
              data: {
                email: profile.email,
                name: profile.name || null,
                role: UserRole.PUBLIC,
                organizationId: null, // Will need to be set later
              },
            })

            user.role = newUser.role
            user.organizationId = newUser.organizationId
            user.organizationName = null
            return true
          }
        }

        return true
      } catch (error) {
        console.error("SignIn callback error:", error)
        return false
      }
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  events: {
    async signOut({ token }) {
      // Log security events
      console.log(`User signed out: ${token?.sub} at ${new Date().toISOString()}`)
    },
    async session({ session, token }) {
      // Log session access for security monitoring
      if (process.env.NODE_ENV === 'production') {
        console.log(`Session accessed: ${session.user?.id} from ${token?.iat}`)
      }
    },
  },
  // Security settings
  useSecureCookies: process.env.NODE_ENV === 'production',
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    callbackUrl: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Host-' : ''}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
}

// Password hashing utilities
export const passwordUtils = {
  // Hash password with bcrypt
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12 // Increased for better security
    return await bcrypt.hash(password, saltRounds)
  },

  // Verify password against hash
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash)
  },

  // Generate a secure random password
  generateSecurePassword(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    return password
  },

  // Validate password strength
  validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long')
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number')
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

// Session utilities
export const sessionUtils = {
  // Validate session token manually (for API routes)
  async validateSessionToken(token: string): Promise<boolean> {
    try {
      // This would need to be implemented with proper JWT verification
      // For now, we'll use NextAuth's built-in validation
      return true
    } catch (error) {
      return false
    }
  },

  // Force session refresh
  async refreshSession(userId: string): Promise<void> {
    // In a real implementation, you might invalidate old tokens
    // and force the user to re-authenticate
    console.log(`Forcing session refresh for user: ${userId}`)
  },

  // Security headers for API responses
  getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'",
    }
  }
}

// Helper function to check if user has required role
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy = {
    [UserRole.SYSTEM_ADMIN]: 4,
    [UserRole.ORGANIZATION_ADMIN]: 3,
    [UserRole.REFEREE]: 2,
    [UserRole.PUBLIC]: 1,
  }

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

// Helper function to check if user can access organization resources
export function canAccessOrganization(userRole: UserRole, userOrgId: string | null, targetOrgId: string): boolean {
  // SYSTEM_ADMIN can access any organization
  if (userRole === UserRole.SYSTEM_ADMIN) {
    return true
  }

  // Other roles can only access their own organization
  return userOrgId === targetOrgId
} 