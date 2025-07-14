import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/competitions/[id]/poules - Get poules with assignments and matches
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: competitionId } = await params

    // Verify competition exists and user has access
    const competition = await prisma.competition.findFirst({
      where: {
        id: competitionId
      },
      include: {
        tournament: {
          select: { organizationId: true, isPublic: true }
        }
      }
    })

    if (!competition) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 })
    }

    // Check access permission
    const hasAccess = competition.tournament.organizationId === session.user.organizationId || 
                     competition.tournament.isPublic ||
                     session.user.role === 'SYSTEM_ADMIN'
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get phases with poules, assignments, and matches
    const phases = await prisma.phase.findMany({
      where: { competitionId },
      include: {
        poules: {
          include: {
            assignments: {
              include: {
                athlete: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    nationality: true,
                    fieId: true,
                                         clubs: {
                       include: {
                         club: {
                           select: {
                             name: true,
                             city: true,
                             country: true
                           }
                         }
                       },
                       where: {
                         status: 'ACTIVE'
                       }
                     }
                  }
                }
              },
              orderBy: { position: 'asc' }
            },
            matches: {
              include: {
                athleteA: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                },
                athleteB: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                },
                winner: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              },
              orderBy: [
                { athleteAId: 'asc' },
                { athleteBId: 'asc' }
              ]
            }
          },
          orderBy: { number: 'asc' }
        }
      },
      orderBy: { sequenceOrder: 'asc' }
    })

    // Transform the data to match frontend expectations
    const transformedPhases = phases.map(phase => ({
      id: phase.id,
      name: phase.name,
      phaseType: phase.phaseType,
      status: phase.status,
      sequenceOrder: phase.sequenceOrder,
      poules: phase.poules.map(poule => ({
        id: poule.id,
        number: poule.number,
        piste: poule.piste,
        referee: poule.referee,
        startTime: poule.startTime,
        status: poule.status,
        assignments: poule.assignments.map(assignment => ({
          id: assignment.id,
          athleteId: assignment.athleteId,
          position: assignment.position,
          athlete: {
            id: assignment.athlete.id,
            firstName: assignment.athlete.firstName,
            lastName: assignment.athlete.lastName,
            nationality: assignment.athlete.nationality,
            fieId: assignment.athlete.fieId,
            club: assignment.athlete.clubs.length > 0 ? assignment.athlete.clubs[0].club : null
          }
        })),
        matches: poule.matches.map(match => ({
          id: match.id,
          athleteAId: match.athleteAId,
          athleteBId: match.athleteBId,
          scoreA: match.scoreA,
          scoreB: match.scoreB,
          winnerId: match.winnerId,
          status: match.status,
          startTime: match.startTime,
          endTime: match.endTime
        }))
      }))
    }))

    return NextResponse.json({ phases: transformedPhases })

  } catch (error) {
    console.error('Error fetching poules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch poules' },
      { status: 500 }
    )
  }
} 