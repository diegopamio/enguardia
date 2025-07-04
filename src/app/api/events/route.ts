import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth-utils"
import { UserRole } from "@prisma/client"
import { detectLocale } from "@/lib/i18n/translation-helpers"
import { 
  CreateEventSchema, 
  EventQuerySchema, 
  AuthValidators, 
  formatValidationErrors 
} from "@/lib/validation"
import { z } from "zod"

// GET /api/events - List events with multilingual support
async function handleGet(req: NextRequest, context: any) {
  try {
    const url = new URL(req.url)
    const locale = detectLocale(req)
    
    // Validate query parameters
    const queryParams = {
      organizationId: url.searchParams.get('organizationId'),
      status: url.searchParams.get('status'),
      weapon: url.searchParams.get('weapon'),
      category: url.searchParams.get('category'),
      limit: url.searchParams.get('limit'),
      offset: url.searchParams.get('offset')
    }
    
    // Remove null values
    const cleanParams = Object.fromEntries(
      Object.entries(queryParams).filter(([_, value]) => value !== null)
    )
    
    const validatedQuery = EventQuerySchema.parse(cleanParams)
    
    // Build where clause
    const where: any = {}
    
    if (validatedQuery.organizationId) {
      where.organizationId = validatedQuery.organizationId
    }
    
    if (validatedQuery.status) {
      where.status = validatedQuery.status
    }
    
    if (validatedQuery.weapon) {
      where.weapon = validatedQuery.weapon
    }
    
    if (validatedQuery.category) {
      where.category = { contains: validatedQuery.category, mode: 'insensitive' }
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        organization: {
          include: {
            translations: {
              where: { locale }
            }
          }
        },
        translations: {
          where: { locale }
        },
        _count: {
          select: {
            registrations: true
          }
        }
      },
      orderBy: {
        startDate: 'asc'
      },
      take: validatedQuery.limit || 50,
      skip: validatedQuery.offset || 0
    })

    // Transform events to include translated fields
    const transformedEvents = events.map((event: any) => ({
      ...event,
      name: event.translations[0]?.name || event.name,
      description: event.translations[0]?.description || event.description,
      organization: {
        ...event.organization,
        name: event.organization.translations[0]?.name || event.organization.name
      },
      participantCount: event._count.registrations
    }))

    return NextResponse.json({
      data: transformedEvents,
      locale
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        formatValidationErrors(error),
        { status: 400 }
      )
    }
    
    console.error('Error fetching events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}

// POST /api/events - Create new event
async function handlePost(req: NextRequest, context: any) {
  try {
    const body = await req.json()
    const validatedData = CreateEventSchema.parse(body)
    const { translations, ...eventData } = validatedData
    
    // Get session from context (set by withAuth middleware)
    const session = context.session
    
    // Additional authorization check
    if (!AuthValidators.canCreateEvent(session.user.role, session.user.organizationId, eventData.organizationId)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create event for this organization' },
        { status: 403 }
      )
    }
    
    // Ensure createdById matches the current user
    if (eventData.createdById !== session.user.id) {
      return NextResponse.json(
        { error: 'createdById must match the authenticated user' },
        { status: 400 }
      )
    }

    // Create event with translations in a transaction
    const event = await prisma.$transaction(async (tx: any) => {
      // If this event is being set as active, deactivate all other events in the organization
      if (eventData.isActive) {
        await tx.event.updateMany({
          where: {
            organizationId: eventData.organizationId,
            isActive: true
          },
          data: {
            isActive: false
          }
        })
      }

      // Create the main event
      const newEvent = await tx.event.create({
        data: eventData
      })

      // Create translations if provided
      if (translations) {
        const translationData = Object.entries(translations).map(([locale, translation]: [string, any]) => ({
          eventId: newEvent.id,
          locale,
          name: translation.name,
          description: translation.description
        }))

        await tx.eventTranslation.createMany({
          data: translationData
        })
      }

      // Return event with translations
      return tx.event.findUnique({
        where: { id: newEvent.id },
        include: {
          translations: true,
          organization: {
            include: {
              translations: true
            }
          }
        }
      })
    })

    return NextResponse.json({
      data: event,
      message: 'Event created successfully'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        formatValidationErrors(error),
        { status: 400 }
      )
    }

    console.error('Error creating event:', error)
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    )
  }
}

// Export the wrapped handlers
export const GET = withAuth(handleGet, {
  requiredRole: UserRole.PUBLIC // Events can be viewed by anyone
})

export const POST = withAuth(handlePost, {
  requiredRole: UserRole.ORGANIZATION_ADMIN // Only org admins can create events
}) 