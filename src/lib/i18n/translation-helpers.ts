import { PrismaClient } from '@prisma/client'

// Supported locales
export const SUPPORTED_LOCALES = ['en', 'es', 'fr'] as const
export type SupportedLocale = typeof SUPPORTED_LOCALES[number]

// Default locale
export const DEFAULT_LOCALE: SupportedLocale = 'en'

// Locale validation
export function isValidLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale)
}

// Get user's preferred locale from request headers or fallback
export function getPreferredLocale(acceptLanguage?: string): SupportedLocale {
  if (!acceptLanguage) return DEFAULT_LOCALE

  // Parse Accept-Language header (e.g., "en-US,en;q=0.9,es;q=0.8")
  const preferred = acceptLanguage
    .split(',')
    .map(lang => lang.split(';')[0].trim())
    .map(lang => lang.split('-')[0]) // Convert en-US to en
    .find(lang => isValidLocale(lang))

  return preferred || DEFAULT_LOCALE
}

// Detect locale from Next.js request
export function detectLocale(req: { headers: Headers } | { headers: { get: (name: string) => string | null } }): SupportedLocale {
  const acceptLanguage = req.headers.get?.('accept-language') ?? 
    (req.headers as Headers).get?.('accept-language') ?? 
    undefined
  return getPreferredLocale(acceptLanguage || undefined)
}

/**
 * Get audit log action description in specified locale
 */
export async function getAuditActionDescription(
  prisma: PrismaClient,
  actionKey: string,
  locale: SupportedLocale = DEFAULT_LOCALE
): Promise<string> {
  try {
    const translation = await prisma.auditLogTranslation.findUnique({
      where: { actionKey_locale: { actionKey, locale } }
    })

    if (translation) {
      return translation.description
    }

    // Fallback to default locale
    if (locale !== DEFAULT_LOCALE) {
      return getAuditActionDescription(prisma, actionKey, DEFAULT_LOCALE)
    }

    // Final fallback to action key itself
    return actionKey.replace(/_/g, ' ').toLowerCase()
  } catch (error) {
    console.error(`Error fetching audit action translation for ${actionKey}:`, error)
    return actionKey.replace(/_/g, ' ').toLowerCase()
  }
}

/**
 * Enhanced entity queries with translations
 */
export class TranslatedEntityService {
  constructor(private prisma: PrismaClient) {}

  async getOrganizationWithTranslation(
    id: string,
    locale: SupportedLocale = DEFAULT_LOCALE
  ) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        translations: {
          where: { locale }
        }
      }
    })

    if (!organization) return null

    const translation = organization.translations[0]
    
    return {
      ...organization,
      // Merge translated fields
      name: translation?.name || organization.name,
      displayName: translation?.displayName || organization.displayName,
      description: translation?.description || organization.description,
      translations: undefined // Remove to avoid confusion
    }
  }

  /**
   * Get all organizations with translations for specified locale
   */
  async getOrganizationsWithTranslations(locale: SupportedLocale = DEFAULT_LOCALE) {
    const organizations = await this.prisma.organization.findMany({
      include: {
        translations: {
          where: { locale }
        }
      }
    })

    return organizations.map(org => {
      const translation = org.translations[0]
      return {
        ...org,
        name: translation?.name || org.name,
        displayName: translation?.displayName || org.displayName,
        description: translation?.description || org.description,
        translations: undefined
      }
    })
  }

  async getEventsWithTranslations(
    organizationId: string,
    locale: SupportedLocale = DEFAULT_LOCALE
  ) {
    const events = await this.prisma.event.findMany({
      where: { organizationId },
      include: {
        translations: {
          where: { locale }
        }
      }
    })

    return events.map(event => {
      const translation = event.translations[0]
      return {
        ...event,
        name: translation?.name || event.name,
        description: translation?.description || event.description,
        translations: undefined
      }
    })
  }
}
 