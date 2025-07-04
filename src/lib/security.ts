import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"

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

// Session security utilities
export const sessionUtils = {
  // Check if session is expired
  isSessionExpired(expiresAt: string): boolean {
    return new Date() > new Date(expiresAt)
  },

  // Generate session fingerprint (for additional security)
  generateSessionFingerprint(userAgent: string, ip: string): string {
    const crypto = require('crypto')
    return crypto
      .createHash('sha256')
      .update(userAgent + ip + process.env.NEXTAUTH_SECRET)
      .digest('hex')
  },

  // Validate session fingerprint
  validateSessionFingerprint(
    storedFingerprint: string,
    userAgent: string,
    ip: string
  ): boolean {
    const currentFingerprint = this.generateSessionFingerprint(userAgent, ip)
    return storedFingerprint === currentFingerprint
  },

  // Force session refresh
  async refreshSession(userId: string): Promise<void> {
    console.log(`Forcing session refresh for user: ${userId} at ${new Date().toISOString()}`)
    // In a real implementation, you might:
    // 1. Invalidate all existing sessions for the user
    // 2. Clear cached session data
    // 3. Force re-authentication on next request
  }
}

// Security headers utility
export const securityHeaders = {
  // Get comprehensive security headers
  getSecurityHeaders(): Record<string, string> {
    return {
      // Prevent MIME type sniffing
      'X-Content-Type-Options': 'nosniff',
      
      // Prevent clickjacking
      'X-Frame-Options': 'DENY',
      
      // Enable XSS protection
      'X-XSS-Protection': '1; mode=block',
      
      // Enforce HTTPS in production
      'Strict-Transport-Security': process.env.NODE_ENV === 'production' 
        ? 'max-age=31536000; includeSubDomains; preload' 
        : '',
      
      // Content Security Policy
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "connect-src 'self' https://accounts.google.com",
        "frame-src 'self' https://accounts.google.com"
      ].join('; '),
      
      // Referrer policy
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      
      // Permissions policy
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    }
  },

  // Apply security headers to NextResponse
  applySecurityHeaders(response: NextResponse): NextResponse {
    const headers = this.getSecurityHeaders()
    Object.entries(headers).forEach(([key, value]) => {
      if (value) { // Only set non-empty headers
        response.headers.set(key, value)
      }
    })
    return response
  },

  // Create secure response with headers
  createSecureResponse(data: any, status: number = 200): NextResponse {
    const response = NextResponse.json(data, { status })
    return this.applySecurityHeaders(response)
  }
}

// Rate limiting utilities (basic implementation)
export const rateLimiter = {
  // Simple in-memory rate limiter (use Redis in production)
  attempts: new Map<string, { count: number; resetTime: number }>(),

  // Check if request should be rate limited
  shouldRateLimit(identifier: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
    const now = Date.now()
    const key = identifier
    const attempt = this.attempts.get(key)

    if (!attempt) {
      this.attempts.set(key, { count: 1, resetTime: now + windowMs })
      return false
    }

    if (now > attempt.resetTime) {
      // Reset window
      this.attempts.set(key, { count: 1, resetTime: now + windowMs })
      return false
    }

    if (attempt.count >= maxAttempts) {
      return true // Rate limited
    }

    attempt.count++
    return false
  },

  // Record failed authentication attempt
  recordFailedAttempt(identifier: string): void {
    this.shouldRateLimit(identifier, 5, 15 * 60 * 1000) // 5 attempts per 15 minutes
  },

  // Clear rate limit for identifier
  clearRateLimit(identifier: string): void {
    this.attempts.delete(identifier)
  },

  // Get remaining attempts
  getRemainingAttempts(identifier: string, maxAttempts: number = 5): number {
    const attempt = this.attempts.get(identifier)
    if (!attempt || Date.now() > attempt.resetTime) {
      return maxAttempts
    }
    return Math.max(0, maxAttempts - attempt.count)
  }
}

// Input validation and sanitization
export const inputValidation = {
  // Sanitize email input
  sanitizeEmail(email: string): string {
    return email.toLowerCase().trim()
  },

  // Validate email format
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  // Sanitize string input (basic XSS prevention)
  sanitizeString(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .trim()
      .substring(0, 1000) // Limit length
  },

  // Validate organization ID format
  isValidOrganizationId(orgId: string): boolean {
    // UUIDs or similar format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(orgId)
  },

  // Validate user ID format
  isValidUserId(userId: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(userId)
  }
}

// Audit logging utilities
export const auditLogger = {
  // Log security events
  logSecurityEvent(event: {
    type: 'AUTH_SUCCESS' | 'AUTH_FAILURE' | 'UNAUTHORIZED_ACCESS' | 'PRIVILEGE_ESCALATION' | 'DATA_ACCESS'
    userId?: string
    email?: string
    ip?: string
    userAgent?: string
    resource?: string
    action?: string
    organizationId?: string
    metadata?: Record<string, any>
  }): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...event,
    }

    // In production, send to proper logging service (e.g., CloudWatch, Datadog)
    if (process.env.NODE_ENV === 'production') {
      console.log('SECURITY_EVENT:', JSON.stringify(logEntry))
    } else {
      console.log('Security Event:', logEntry)
    }
  },

  // Log authentication attempts
  logAuthAttempt(success: boolean, email: string, ip?: string, userAgent?: string): void {
    this.logSecurityEvent({
      type: success ? 'AUTH_SUCCESS' : 'AUTH_FAILURE',
      email,
      ip,
      userAgent,
      metadata: { success }
    })
  },

  // Log unauthorized access attempts
  logUnauthorizedAccess(userId: string, resource: string, action: string, organizationId?: string): void {
    this.logSecurityEvent({
      type: 'UNAUTHORIZED_ACCESS',
      userId,
      resource,
      action,
      organizationId,
      metadata: { denied: true }
    })
  }
}

// Environment and configuration validation
export const configValidation = {
  // Validate required environment variables
  validateEnvironment(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    const required = [
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL',
    ]

    const optional = [
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
    ]

    // Check required variables
    required.forEach(envVar => {
      if (!process.env[envVar]) {
        errors.push(`Missing required environment variable: ${envVar}`)
      }
    })

    // Warn about optional variables
    optional.forEach(envVar => {
      if (!process.env[envVar]) {
        console.warn(`Optional environment variable not set: ${envVar}`)
      }
    })

    // Validate NEXTAUTH_SECRET strength
    if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length < 32) {
      errors.push('NEXTAUTH_SECRET should be at least 32 characters long')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  },

  // Check if running in secure environment
  isSecureEnvironment(): boolean {
    return process.env.NODE_ENV === 'production' && 
           process.env.NEXTAUTH_URL?.startsWith('https://')
  },

  // Get security configuration
  getSecurityConfig() {
    return {
      isProduction: process.env.NODE_ENV === 'production',
      useSecureCookies: this.isSecureEnvironment(),
      enforceHttps: this.isSecureEnvironment(),
      sessionMaxAge: 24 * 60 * 60, // 24 hours
      jwtMaxAge: 24 * 60 * 60, // 24 hours
      bcryptRounds: 12,
      maxLoginAttempts: 5,
      rateLimitWindow: 15 * 60 * 1000, // 15 minutes
    }
  }
} 