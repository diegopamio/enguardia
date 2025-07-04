import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UpdateCompetitionSchema, formatValidationErrors, AuthValidators } from '@/lib/validation'
import { UserRole } from '@prisma/client'

// GET /api/competitions/[id] - Get competition by ID
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

    const competition = await prisma.competition.findUnique({
      where: { id },
      include: {
        tournament: {
          include: {
            organization: { select: { id: true, name: true } }
          }
        },
        translations: true,
        registrations: {
          include: {
            athlete: { select: { id: true, firstName: true, lastName: true } }
          }
        },
        phases: {
          include: { translations: true },
          orderBy: { sequenceOrder: 'asc' }
        }
      }
    })

    if (!competition) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 })
    }

    // Check authorization
    if (session.user.role !== UserRole.SYSTEM_ADMIN) {
      const hasAccess = competition.tournament.organizationId === session.user.organizationId || 
                       competition.tournament.isPublic
      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json({
      ...competition,
      participantCount: competition.registrations.length,
      phaseCount: competition.phases.length
    })

  } catch (error) {
    console.error('Competition fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/competitions/[id] - Update competition
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
    
    const validationResult = UpdateCompetitionSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(formatValidationErrors(validationResult.error), { status: 400 })
    }

    const existingCompetition = await prisma.competition.findUnique({
      where: { id },
      select: { 
        tournamentId: true,
        weapon: true,
        category: true,
        tournament: { select: { organizationId: true } }
      }
    })

    if (!existingCompetition) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 })
    }

    if (!AuthValidators.canUpdateCompetition(session.user.role as UserRole, session.user.organizationId, existingCompetition.tournament.organizationId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { translations, ...competitionData } = validationResult.data

    const competition = await prisma.$transaction(async (tx: any) => {
      const updated = await tx.competition.update({
        where: { id },
        data: competitionData
      })

      if (translations) {
        await tx.competitionTranslation.deleteMany({ where: { competitionId: id } })
        const translationData = Object.entries(translations).map(([locale, translation]: [string, any]) => ({
          competitionId: id,
          locale,
          name: translation.name
        }))
        await tx.competitionTranslation.createMany({ data: translationData })
      }

      return tx.competition.findUnique({
        where: { id },
        include: {
          translations: true,
          tournament: { select: { id: true, name: true } }
        }
      })
    })

    return NextResponse.json(competition)

  } catch (error) {
    console.error('Competition update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/competitions/[id] - Delete competition
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

    const existingCompetition = await prisma.competition.findUnique({
      where: { id },
      select: { 
        status: true,
        tournament: { select: { organizationId: true } },
        _count: { select: { registrations: true, phases: true } }
      }
    })

    if (!existingCompetition) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 })
    }

    if (!AuthValidators.canDeleteCompetition(session.user.role as UserRole, session.user.organizationId, existingCompetition.tournament.organizationId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (existingCompetition.status === 'IN_PROGRESS') {
      return NextResponse.json({ error: 'Cannot delete competition that is in progress' }, { status: 400 })
    }

    if (existingCompetition._count.registrations > 0 || existingCompetition._count.phases > 0) {
      return NextResponse.json({ error: 'Cannot delete competition with existing data' }, { status: 400 })
    }

    await prisma.competition.delete({ where: { id } })
    return NextResponse.json({ message: 'Competition deleted successfully' })

  } catch (error) {
    console.error('Competition deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 