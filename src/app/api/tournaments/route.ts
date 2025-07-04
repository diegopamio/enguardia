import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CreateTournamentSchema, formatValidationErrors, AuthValidators, TournamentQuerySchema } from '@/lib/validation'
import { UserRole } from '@prisma/client'

// GET /api/tournaments - List tournaments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const queryResult = TournamentQuerySchema.safeParse(Object.fromEntries(searchParams))
    
    if (!queryResult.success) {
      return NextResponse.json(formatValidationErrors(queryResult.error), { status: 400 })
    }

    const { organizationId, status, limit = 20, offset = 0 } = queryResult.data

    // Build where clause based on user permissions and filters
    const whereClause: any = {}

    // Apply organization filter based on user role
    if (session.user.role === UserRole.SYSTEM_ADMIN) {
      // System admin can see all tournaments, optionally filtered by organizationId
      if (organizationId) {
        whereClause.organizationId = organizationId
      }
    } else {
      // Other users can only see tournaments from their organization or public ones
      whereClause.OR = [
        { organizationId: session.user.organizationId },
        { isPublic: true }
      ]
      
      // If specific organizationId requested, ensure it's allowed
      if (organizationId && organizationId !== session.user.organizationId) {
        whereClause.AND = [
          whereClause.OR,
          { organizationId, isPublic: true }
        ]
        delete whereClause.OR
      }
    }

    // Apply status filter
    if (status) {
      whereClause.status = status
    }

    const tournaments = await prisma.tournament.findMany({
      where: whereClause,
      include: {
        organization: {
          select: { id: true, name: true }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        translations: true,
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
        },
        _count: {
          select: { competitions: true }
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { startDate: 'desc' }
      ],
      take: limit,
      skip: offset
    })

    // Transform data to include competition counts and participant totals
    const transformedTournaments = tournaments.map(tournament => ({
      ...tournament,
      competitionCount: tournament._count.competitions,
      totalParticipants: tournament.competitions.reduce((total, comp) => total + comp._count.registrations, 0)
    }))

    return NextResponse.json({ 
      tournaments: transformedTournaments,
      pagination: {
        limit,
        offset,
        hasMore: tournaments.length === limit
      }
    })

  } catch (error) {
    console.error('Tournament listing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/tournaments - Create tournament
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validationResult = CreateTournamentSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(formatValidationErrors(validationResult.error), { status: 400 })
    }

    const { translations, ...tournamentData } = validationResult.data

    // Check authorization
    if (!AuthValidators.canCreateTournament(session.user.role as UserRole, session.user.organizationId, tournamentData.organizationId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Create tournament with translations in a transaction
    const tournament = await prisma.$transaction(async (tx: any) => {
      // If setting as active, deactivate other tournaments in the organization
      if (tournamentData.isActive) {
        await tx.tournament.updateMany({
          where: { 
            organizationId: tournamentData.organizationId,
            isActive: true 
          },
          data: { isActive: false }
        })
      }

      // Create the main tournament
      const newTournament = await tx.tournament.create({
        data: tournamentData
      })

      // Create translations if provided
      if (translations) {
        const translationData = Object.entries(translations).map(([locale, translation]: [string, any]) => ({
          tournamentId: newTournament.id,
          locale,
          name: translation.name,
          description: translation.description
        }))

        await tx.tournamentTranslation.createMany({
          data: translationData
        })
      }

      // Return tournament with translations and organization
      return tx.tournament.findUnique({
        where: { id: newTournament.id },
        include: {
          translations: true,
          organization: {
            select: { id: true, name: true }
          },
          createdBy: {
            select: { id: true, name: true, email: true }
          }
        }
      })
    })

    return NextResponse.json(tournament, { status: 201 })

  } catch (error) {
    console.error('Tournament creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 