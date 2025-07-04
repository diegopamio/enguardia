import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CreateCompetitionSchema, formatValidationErrors, AuthValidators, CompetitionQuerySchema } from '@/lib/validation'
import { UserRole } from '@prisma/client'

// GET /api/competitions - List competitions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const queryResult = CompetitionQuerySchema.safeParse(Object.fromEntries(searchParams))
    
    if (!queryResult.success) {
      return NextResponse.json(formatValidationErrors(queryResult.error), { status: 400 })
    }

    const { tournamentId, weapon, category, status, limit = 20, offset = 0 } = queryResult.data

    // Build where clause based on user permissions and filters
    const whereClause: any = {}

    // Apply tournament filter
    if (tournamentId) {
      whereClause.tournamentId = tournamentId
    }

    // Apply other filters
    if (weapon) {
      whereClause.weapon = weapon
    }
    if (category) {
      whereClause.category = category
    }
    if (status) {
      whereClause.status = status
    }

    // Apply organization-based access control
    if (session.user.role !== UserRole.SYSTEM_ADMIN) {
      whereClause.tournament = {
        OR: [
          { organizationId: session.user.organizationId },
          { isPublic: true }
        ]
      }
    }

    const competitions = await prisma.competition.findMany({
      where: whereClause,
      include: {
        tournament: {
          select: { 
            id: true, 
            name: true, 
            organizationId: true,
            organization: {
              select: { id: true, name: true }
            }
          }
        },
        translations: true,
        registrations: {
          include: {
            athlete: {
              select: { id: true, firstName: true, lastName: true }
            }
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
          orderBy: { sequenceOrder: 'asc' }
        },
        _count: {
          select: { 
            registrations: true,
            phases: true
          }
        }
      },
      orderBy: [
        { tournament: { startDate: 'desc' } },
        { weapon: 'asc' },
        { category: 'asc' }
      ],
      take: limit,
      skip: offset
    })

    // Transform data to include computed fields
    const transformedCompetitions = competitions.map(competition => ({
      ...competition,
      participantCount: competition._count.registrations,
      phaseCount: competition._count.phases
    }))

    return NextResponse.json({ 
      competitions: transformedCompetitions,
      pagination: {
        limit,
        offset,
        hasMore: competitions.length === limit
      }
    })

  } catch (error) {
    console.error('Competition listing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/competitions - Create competition
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validationResult = CreateCompetitionSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(formatValidationErrors(validationResult.error), { status: 400 })
    }

    const { translations, ...competitionData } = validationResult.data

    // Check if tournament exists and verify authorization
    const tournament = await prisma.tournament.findUnique({
      where: { id: competitionData.tournamentId },
      select: { organizationId: true, status: true }
    })

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    // Check authorization
    if (!AuthValidators.canCreateCompetition(session.user.role as UserRole, session.user.organizationId, tournament.organizationId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check business rules
    if (tournament.status === 'COMPLETED' || tournament.status === 'CANCELLED') {
      return NextResponse.json({ 
        error: 'Cannot add competitions to completed or cancelled tournaments' 
      }, { status: 400 })
    }

    // Check for duplicate weapon+category combination in the same tournament
    const existingCompetition = await prisma.competition.findFirst({
      where: {
        tournamentId: competitionData.tournamentId,
        weapon: competitionData.weapon,
        category: competitionData.category
      }
    })

    if (existingCompetition) {
      return NextResponse.json({ 
        error: `A competition for ${competitionData.weapon} ${competitionData.category} already exists in this tournament` 
      }, { status: 400 })
    }

    // Create competition with translations in a transaction
    const competition = await prisma.$transaction(async (tx: any) => {
      // Create the main competition
      const newCompetition = await tx.competition.create({
        data: competitionData
      })

      // Create translations if provided
      if (translations) {
        const translationData = Object.entries(translations).map(([locale, translation]: [string, any]) => ({
          competitionId: newCompetition.id,
          locale,
          name: translation.name
        }))

        await tx.competitionTranslation.createMany({
          data: translationData
        })
      }

      // Return competition with translations and tournament
      return tx.competition.findUnique({
        where: { id: newCompetition.id },
        include: {
          translations: true,
          tournament: {
            select: { 
              id: true, 
              name: true, 
              organizationId: true,
              organization: {
                select: { id: true, name: true }
              }
            }
          }
        }
      })
    })

    return NextResponse.json(competition, { status: 201 })

  } catch (error) {
    console.error('Competition creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 