import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NotificationError } from '@shared/notifications'

// GET /api/competitions/[id] - Get competition by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentUserSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const competitionId = params.id
    if (!competitionId) {
      return NextResponse.json(
        { error: 'Competition ID is required' },
        { status: 400 }
      )
    }

    // Get competition with related data
    const competition = await prisma.competition.findFirst({
      where: {
        id: competitionId,
        tournament: {
          OR: [
            { organizationId: session.user.organizationId },
            { isPublic: true }
          ]
        }
      },
      include: {
        tournament: {
          include: {
            organization: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        registrations: {
          include: {
            athlete: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            registeredAt: 'asc'
          }
        },
        phases: {
          orderBy: {
            sequenceOrder: 'asc'
          }
        },
        _count: {
          select: {
            registrations: true,
            phases: true
          }
        }
      }
    })

    if (!competition) {
      return NextResponse.json(
        { error: 'Competition not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(competition)

  } catch (error) {
    console.error('Error fetching competition:', error)
    
    if (error instanceof NotificationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/competitions/[id] - Update competition
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentUserSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const competitionId = params.id
    if (!competitionId) {
      return NextResponse.json(
        { error: 'Competition ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name, weapon, category, maxParticipants, registrationDeadline, status } = body

    // Verify user has permission to edit this competition
    const existingCompetition = await prisma.competition.findFirst({
      where: {
        id: competitionId,
        tournament: {
          OR: [
            { organizationId: session.user.organizationId },
            { isPublic: true }
          ]
        }
      },
      include: {
        tournament: true
      }
    })

    if (!existingCompetition) {
      return NextResponse.json(
        { error: 'Competition not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to edit
    if (existingCompetition.tournament.organizationId !== session.user.organizationId && 
        session.user.role !== 'SYSTEM_ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Update competition
    const updatedCompetition = await prisma.competition.update({
      where: { id: competitionId },
      data: {
        name,
        weapon,
        category,
        maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
        status
      },
      include: {
        tournament: {
          include: {
            organization: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            registrations: true,
            phases: true
          }
        }
      }
    })

    return NextResponse.json(updatedCompetition)

  } catch (error) {
    console.error('Error updating competition:', error)
    
    if (error instanceof NotificationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/competitions/[id] - Delete competition
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentUserSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const competitionId = params.id
    if (!competitionId) {
      return NextResponse.json(
        { error: 'Competition ID is required' },
        { status: 400 }
      )
    }

    // Verify user has permission to delete this competition
    const existingCompetition = await prisma.competition.findFirst({
      where: {
        id: competitionId,
        tournament: {
          OR: [
            { organizationId: session.user.organizationId },
            { isPublic: true }
          ]
        }
      },
      include: {
        tournament: true
      }
    })

    if (!existingCompetition) {
      return NextResponse.json(
        { error: 'Competition not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to delete
    if (existingCompetition.tournament.organizationId !== session.user.organizationId && 
        session.user.role !== 'SYSTEM_ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Delete competition (cascade will handle related records)
    await prisma.competition.delete({
      where: { id: competitionId }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting competition:', error)
    
    if (error instanceof NotificationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 