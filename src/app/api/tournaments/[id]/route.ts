import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UpdateTournamentSchema, formatValidationErrors, AuthValidators } from '@/lib/validation'
import { UserRole } from '@prisma/client'

// GET /api/tournaments/[id] - Get tournament by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        organization: {
          select: { id: true, name: true }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        translations: true,
        competitions: {
          include: {
            translations: true,
            registrations: {
              include: {
                athlete: {
                  select: { id: true, firstName: true, lastName: true }
                }
              }
            },
            phases: {
              include: {
                translations: true,
                poules: {
                  include: {
                    assignments: {
                      include: {
                        athlete: {
                          select: { id: true, firstName: true, lastName: true }
                        }
                      }
                    }
                  }
                },
                brackets: true
              },
              orderBy: { sequenceOrder: 'asc' }
            }
          },
          orderBy: [
            { weapon: 'asc' },
            { category: 'asc' }
          ]
        }
      }
    })

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    // Check authorization
    if (!AuthValidators.canViewTournament(session.user.role as UserRole, session.user.organizationId, tournament.organizationId, tournament.isPublic)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Add computed fields
    const tournamentWithStats = {
      ...tournament,
      competitionCount: tournament.competitions.length,
      totalParticipants: tournament.competitions.reduce((total, comp) => total + comp.registrations.length, 0),
      competitions: tournament.competitions.map(comp => ({
        ...comp,
        participantCount: comp.registrations.length,
        phaseCount: comp.phases.length
      }))
    }

    return NextResponse.json(tournamentWithStats)

  } catch (error) {
    console.error('Tournament fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/tournaments/[id] - Update tournament
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()
    
    const validationResult = UpdateTournamentSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(formatValidationErrors(validationResult.error), { status: 400 })
    }

    // Check if tournament exists and get current data
    const existingTournament = await prisma.tournament.findUnique({
      where: { id },
      select: { organizationId: true, status: true }
    })

    if (!existingTournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    // Check authorization
    if (!AuthValidators.canUpdateTournament(session.user.role as UserRole, session.user.organizationId, existingTournament.organizationId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { translations, ...tournamentData } = validationResult.data

    // Update tournament with translations in a transaction
    const tournament = await prisma.$transaction(async (tx: any) => {
      // If setting as active, deactivate other tournaments in the organization
      if (tournamentData.isActive) {
        await tx.tournament.updateMany({
          where: { 
            organizationId: existingTournament.organizationId,
            isActive: true,
            id: { not: id }
          },
          data: { isActive: false }
        })
      }

      // Update the main tournament
      const updatedTournament = await tx.tournament.update({
        where: { id },
        data: tournamentData
      })

      // Update translations if provided
      if (translations) {
        // Delete existing translations
        await tx.tournamentTranslation.deleteMany({
          where: { tournamentId: id }
        })

        // Create new translations
        const translationData = Object.entries(translations).map(([locale, translation]: [string, any]) => ({
          tournamentId: id,
          locale,
          name: translation.name,
          description: translation.description
        }))

        await tx.tournamentTranslation.createMany({
          data: translationData
        })
      }

      // Return updated tournament with translations and organization
      return tx.tournament.findUnique({
        where: { id },
        include: {
          translations: true,
          organization: {
            select: { id: true, name: true }
          },
          createdBy: {
            select: { id: true, name: true, email: true }
          },
          competitions: {
            select: {
              id: true,
              name: true,
              weapon: true,
              category: true,
              status: true,
              _count: {
                select: { registrations: true }
              }
            }
          }
        }
      })
    })

    return NextResponse.json(tournament)

  } catch (error) {
    console.error('Tournament update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/tournaments/[id] - Delete tournament
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Check if tournament exists and get current data
    const existingTournament = await prisma.tournament.findUnique({
      where: { id },
      select: { 
        organizationId: true,
        status: true,
        _count: {
          select: { competitions: true }
        }
      }
    })

    if (!existingTournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    // Check authorization
    if (!AuthValidators.canDeleteTournament(session.user.role as UserRole, session.user.organizationId, existingTournament.organizationId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if tournament can be deleted (no active competitions)
    if (existingTournament.status === 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Cannot delete tournament that is in progress' },
        { status: 400 }
      )
    }

    if (existingTournament._count.competitions > 0) {
      return NextResponse.json(
        { error: 'Cannot delete tournament with existing competitions. Delete competitions first.' },
        { status: 400 }
      )
    }

    // Delete tournament (cascade will handle translations)
    await prisma.tournament.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Tournament deleted successfully' })

  } catch (error) {
    console.error('Tournament deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 