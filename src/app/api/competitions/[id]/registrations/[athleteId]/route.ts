import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { UserRole } from '@prisma/client'

// Validation schema for updating registration
const updateRegistrationSchema = z.object({
  seedNumber: z.number().int().positive().optional(),
  isPresent: z.boolean().optional(),
  status: z.enum(['REGISTERED', 'CHECKED_IN', 'WITHDRAWN', 'DISQUALIFIED']).optional(),
})

// GET /api/competitions/{id}/registrations/{athleteId} - Get specific registration
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; athleteId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: competitionId, athleteId } = await params

    // Verify competition exists and user has access
    const competition = await prisma.competition.findFirst({
      where: {
        id: competitionId,
        tournament: {
          OR: [
            { organizationId: session.user.organizationId },
            { isPublic: true }
          ]
        }
      }
    })

    if (!competition) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 })
    }

    const registration = await prisma.competitionRegistration.findUnique({
      where: {
        competitionId_athleteId: {
          competitionId,
          athleteId
        }
      },
      include: {
        athlete: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            nationality: true,
            fieId: true,
            weapons: {
              select: { weapon: true }
            }
          }
        },
        competition: {
          select: {
            id: true,
            name: true,
            weapon: true,
            category: true
          }
        }
      }
    })

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    return NextResponse.json(registration)

  } catch (error) {
    console.error('Error fetching registration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/competitions/{id}/registrations/{athleteId} - Update registration
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; athleteId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    if (!['SYSTEM_ADMIN', 'ORGANIZATION_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id: competitionId, athleteId } = await params
    const body = await request.json()
    
    const validationResult = updateRegistrationSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    // Verify competition exists and user has access
    const competition = await prisma.competition.findFirst({
      where: {
        id: competitionId,
        tournament: {
          organizationId: session.user.organizationId
        }
      },
      include: {
        tournament: {
          select: { status: true }
        }
      }
    })

    if (!competition) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 })
    }

    // Check business rules
    if (competition.tournament.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Cannot modify registrations for completed tournaments' },
        { status: 400 }
      )
    }

    // Verify registration exists
    const existingRegistration = await prisma.competitionRegistration.findUnique({
      where: {
        competitionId_athleteId: {
          competitionId,
          athleteId
        }
      }
    })

    if (!existingRegistration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    // Update registration
    const updatedRegistration = await prisma.competitionRegistration.update({
      where: {
        competitionId_athleteId: {
          competitionId,
          athleteId
        }
      },
      data: validationResult.data,
      include: {
        athlete: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            nationality: true,
            fieId: true
          }
        }
      }
    })

    return NextResponse.json(updatedRegistration)

  } catch (error) {
    console.error('Error updating registration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/competitions/{id}/registrations/{athleteId} - Remove registration
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; athleteId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    if (!['SYSTEM_ADMIN', 'ORGANIZATION_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id: competitionId, athleteId } = await params

    // Verify competition exists and user has access
    const competition = await prisma.competition.findFirst({
      where: {
        id: competitionId,
        tournament: {
          organizationId: session.user.organizationId
        }
      },
      include: {
        tournament: {
          select: { status: true }
        }
      }
    })

    if (!competition) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 })
    }

    // Check business rules
    if (competition.tournament.status === 'IN_PROGRESS' || competition.tournament.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Cannot remove registrations from tournaments that are in progress or completed' },
        { status: 400 }
      )
    }

    // Verify registration exists
    const existingRegistration = await prisma.competitionRegistration.findUnique({
      where: {
        competitionId_athleteId: {
          competitionId,
          athleteId
        }
      },
      include: {
        athlete: {
          select: { firstName: true, lastName: true }
        }
      }
    })

    if (!existingRegistration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    // Delete registration
    await prisma.competitionRegistration.delete({
      where: {
        competitionId_athleteId: {
          competitionId,
          athleteId
        }
      }
    })

    return NextResponse.json({
      message: `Successfully removed ${existingRegistration.athlete.firstName} ${existingRegistration.athlete.lastName} from competition`
    })

  } catch (error) {
    console.error('Error removing registration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 