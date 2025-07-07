import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

// GET /api/competitions/[id] - Get competition by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Await params before accessing properties (Next.js 15 requirement)
    const { id: competitionId } = await params
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
        // Apply organization-based access control
        tournament: {
          OR: [
            {
              organizationId: session.user.organizationId!
            },
            {
              isPublic: true
            }
          ]
        }
      },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            startDate: true,
            venue: true,
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
                firstName: true,
                lastName: true,
                nationality: true,
                fieId: true
              }
            }
          },
          orderBy: {
            seedNumber: "asc"
          }
        },
        phases: {
          select: {
            id: true,
            name: true,
            phaseType: true,
            status: true,
            sequenceOrder: true
          },
          orderBy: {
            sequenceOrder: "asc"
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 