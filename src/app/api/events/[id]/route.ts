import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth-utils"
import { UserRole } from "@prisma/client"
import { detectLocale } from "@/lib/i18n/translation-helpers"
import { 
  UpdateEventSchema, 
  AuthValidators, 
  formatValidationErrors,
  customValidators
} from "@/lib/validation"
import { z } from "zod"

// GET /api/events/[id] - Get single event with multilingual support
async function handleGet(req: NextRequest, context: { params: { id: string } }) {
  try {
    const { id } = context.params
    const locale = detectLocale(req)

    const event = await prisma.event.findUnique({
      where: { id },
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
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            registrations: true
          }
        }
      }
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Transform event to include translated fields
    const transformedEvent = {
      ...event,
      name: event.translations[0]?.name || event.name,
      description: event.translations[0]?.description || event.description,
      organization: {
        ...event.organization,
        name: event.organization.translations[0]?.name || event.organization.name
      },
      participantCount: event._count.registrations
    }

    return NextResponse.json({
      data: transformedEvent,
      locale
    })
  } catch (error) {
    console.error('Error fetching event:', error)
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    )
  }
}

// PUT /api/events/[id] - Update event
async function handlePut(req: NextRequest, context: any) {
  try {
    const { id } = context.params
    const body = await req.json()
    const validatedData = UpdateEventSchema.parse(body)
    const { translations, ...eventData } = validatedData
    const session = context.session

    // Check if event exists and get current data for validation
    const existingEvent = await prisma.event.findUnique({
      where: { id },
      select: { 
        organizationId: true, 
        status: true,
        startDate: true,
        endDate: true
      }
    })

    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }
    
    // Authorization check
    if (!AuthValidators.canUpdateEvent(session.user.role, session.user.organizationId, existingEvent.organizationId)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update this event' },
        { status: 403 }
      )
    }
    
    // Validate status transition if status is being updated
    if (eventData.status && !customValidators.isValidEventStatus(eventData.status, existingEvent.status)) {
      return NextResponse.json(
        { error: `Invalid status transition from ${existingEvent.status} to ${eventData.status}` },
        { status: 400 }
      )
    }
    
    // Additional date validation for updates
    const startDate = eventData.startDate || existingEvent.startDate
    const endDate = eventData.endDate || existingEvent.endDate
    
    if (eventData.startDate || eventData.endDate) {
      if (!customValidators.isValidDateRange(startDate, endDate)) {
        return NextResponse.json(
          { error: 'Invalid date range: end date must be after start date' },
          { status: 400 }
        )
      }
    }

    // Update event with translations in a transaction
    const event = await prisma.$transaction(async (tx: any) => {
      // If this event is being set as active, deactivate all other events in the organization
      if (eventData.isActive) {
        await tx.event.updateMany({
          where: {
            organizationId: existingEvent.organizationId,
            isActive: true,
            id: { not: id } // Exclude the current event being updated
          },
          data: {
            isActive: false
          }
        })
      }

      // Update the main event
      const updatedEvent = await tx.event.update({
        where: { id },
        data: eventData
      })

      // Update translations if provided
      if (translations) {
        // Delete existing translations
        await tx.eventTranslation.deleteMany({
          where: { eventId: id }
        })

        // Create new translations
        const translationData = Object.entries(translations).map(([locale, translation]: [string, any]) => ({
          eventId: id,
          locale,
          name: translation.name,
          description: translation.description
        }))

        await tx.eventTranslation.createMany({
          data: translationData
        })
      }

      // Return updated event with translations
      return tx.event.findUnique({
        where: { id },
        include: {
          translations: true,
          organization: {
            include: {
              translations: true
            }
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })
    })

    return NextResponse.json({
      data: event,
      message: 'Event updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        formatValidationErrors(error),
        { status: 400 }
      )
    }

    console.error('Error updating event:', error)
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    )
  }
}

// DELETE /api/events/[id] - Delete event
async function handleDelete(req: NextRequest, context: any) {
  try {
    const { id } = context.params
    const session = context.session

    // Check if event exists
    const existingEvent = await prisma.event.findUnique({
      where: { id },
      select: { 
        organizationId: true, 
        name: true, 
        status: true,
        _count: {
          select: {
            registrations: true
          }
        }
      }
    })

    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }
    
    // Authorization check
    if (!AuthValidators.canDeleteEvent(session.user.role, session.user.organizationId, existingEvent.organizationId)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete this event' },
        { status: 403 }
      )
    }
    
    // Business logic validation - prevent deletion of events with registrations
    if (existingEvent._count.registrations > 0) {
      return NextResponse.json(
        { error: 'Cannot delete event with existing registrations. Cancel the event instead.' },
        { status: 400 }
      )
    }
    
    // Prevent deletion of events that are in progress or completed
    if (['IN_PROGRESS', 'COMPLETED'].includes(existingEvent.status)) {
      return NextResponse.json(
        { error: `Cannot delete event with status ${existingEvent.status}` },
        { status: 400 }
      )
    }

    // Delete event (this will cascade to translations, registrations, etc.)
    await prisma.event.delete({
      where: { id }
    })

    return NextResponse.json({
      message: `Event "${existingEvent.name}" deleted successfully`
    })

  } catch (error) {
    console.error('Error deleting event:', error)
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    )
  }
}

// Export the wrapped handlers with authentication
export const GET = withAuth(handleGet, {
  requiredRole: UserRole.PUBLIC // Events can be viewed by anyone
})

export const PUT = withAuth(handlePut, {
  requiredRole: UserRole.ORGANIZATION_ADMIN // Only org admins can update events
})

export const DELETE = withAuth(handleDelete, {
  requiredRole: UserRole.ORGANIZATION_ADMIN // Only org admins can delete events
}) 