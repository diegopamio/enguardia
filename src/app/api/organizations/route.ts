import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { TranslatedEntityService, getPreferredLocale } from '@/lib/i18n/translation-helpers'

const prisma = new PrismaClient()

// GET /api/organizations - Get all organizations with translations
async function getOrganizations(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get preferred locale from Accept-Language header
  const acceptLanguage = req.headers.get('Accept-Language') || undefined
  const locale = getPreferredLocale(acceptLanguage)

  try {
    const translationService = new TranslatedEntityService(prisma)
    
    // System admins can see all organizations
    if (session.user.role === 'SYSTEM_ADMIN') {
      const organizations = await translationService.getOrganizationsWithTranslations(locale)
      return NextResponse.json({
        organizations,
        locale,
        message: `Organizations loaded in ${locale.toUpperCase()}`
      })
    }

    // Other users only see their own organization
    if (session.user.organizationId) {
      const organization = await translationService.getOrganizationWithTranslation(
        session.user.organizationId,
        locale
      )
      
      if (!organization) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
      }

      return NextResponse.json({
        organizations: [organization],
        locale,
        message: `Organization loaded in ${locale.toUpperCase()}`
      })
    }

    return NextResponse.json({ organizations: [], locale })
  } catch (error) {
    console.error('Error fetching organizations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    )
  }
}

export { getOrganizations as GET } 