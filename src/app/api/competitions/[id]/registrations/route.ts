import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { UserRole } from '@prisma/client'

// Validation schema for registration
const registrationSchema = z.object({
  athleteId: z.string().min(1, "Athlete ID is required"),
  seedNumber: z.number().int().positive().optional(),
  isPresent: z.boolean().default(true),
  status: z.enum(['REGISTERED', 'CHECKED_IN', 'WITHDRAWN', 'DISQUALIFIED']).default('REGISTERED'),
})

const bulkRegistrationSchema = z.object({
  athleteIds: z.array(z.string()).min(1, "At least one athlete ID is required"),
  isPresent: z.boolean().default(true),
  status: z.enum(['REGISTERED', 'CHECKED_IN', 'WITHDRAWN', 'DISQUALIFIED']).default('REGISTERED'),
})

// GET /api/competitions/{id}/registrations - List competition registrations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const competitionId = (await params).id
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Verify competition exists (global access for athlete management)
    const competition = await prisma.competition.findFirst({
      where: {
        id: competitionId
      },
      select: { id: true, name: true, weapon: true, category: true }
    })

    if (!competition) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 })
    }

    // Build where clause for registrations
    const whereClause: any = { competitionId }
    if (status) {
      whereClause.status = status
    }

    const registrations = await prisma.competitionRegistration.findMany({
      where: whereClause,
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
            },
            clubs: {
              where: { status: 'ACTIVE' },
              include: {
                club: {
                  select: { id: true, name: true, city: true, country: true }
                }
              }
            },
            organizations: {
              where: { status: 'ACTIVE' },
              include: {
                organization: {
                  select: { id: true, name: true }
                }
              }
            }
          }
        }
      },
      orderBy: [
        { seedNumber: 'asc' },
        { registeredAt: 'asc' }
      ],
      take: limit,
      skip: offset
    })

    // Get total count
    const total = await prisma.competitionRegistration.count({
      where: whereClause
    })

    return NextResponse.json({
      registrations,
      competition,
      pagination: {
        total,
        limit,
        offset,
        hasMore: total > offset + limit
      }
    })

  } catch (error) {
    console.error('Error fetching competition registrations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/competitions/{id}/registrations - Register athlete(s) for competition
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id: competitionId } = await params

    // Verify competition exists (removed organization restriction for global athlete access)
    const competition = await prisma.competition.findFirst({
      where: {
        id: competitionId
      },
      include: {
        tournament: {
          select: { status: true }
        },
        _count: {
          select: { registrations: true }
        }
      }
    })

    if (!competition) {
      return NextResponse.json(
        { error: 'Competition not found' },
        { status: 404 }
      )
    }

    // Check permissions
    if (!['SYSTEM_ADMIN', 'ORGANIZATION_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const isBulk = Array.isArray(body.athleteIds)

    // Validate input
    const validationResult = isBulk 
      ? bulkRegistrationSchema.safeParse(body)
      : registrationSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    // Check business rules
    if (competition.tournament.status === 'COMPLETED' || competition.tournament.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Cannot register athletes to completed or cancelled tournaments' },
        { status: 400 }
      )
    }

    if (competition.maxParticipants) {
      const athleteCount = isBulk ? validationResult.data.athleteIds.length : 1
      if (competition._count.registrations + athleteCount > competition.maxParticipants) {
        return NextResponse.json(
          { error: `Registration would exceed maximum participants (${competition.maxParticipants})` },
          { status: 400 }
        )
      }
    }

    let result

    if (isBulk) {
      // Bulk registration
      const { athleteIds, isPresent, status } = validationResult.data

      // Check if athletes exist and are not already registered
      const existingRegistrations = await prisma.competitionRegistration.findMany({
        where: {
          competitionId,
          athleteId: { in: athleteIds }
        },
        select: { athleteId: true }
      })

      const alreadyRegistered = existingRegistrations.map(r => r.athleteId)
      const newAthleteIds = athleteIds.filter(id => !alreadyRegistered.includes(id))

      if (newAthleteIds.length === 0) {
        return NextResponse.json(
          { error: 'All athletes are already registered for this competition' },
          { status: 400 }
        )
      }

      // Create bulk registrations
      await prisma.competitionRegistration.createMany({
        data: newAthleteIds.map(athleteId => ({
          competitionId,
          athleteId,
          isPresent: isPresent ?? true,
          status: status ?? 'REGISTERED'
        }))
      })

      result = {
        message: `Successfully registered ${newAthleteIds.length} athlete${newAthleteIds.length !== 1 ? 's' : ''}`,
        registered: newAthleteIds.length,
        skipped: alreadyRegistered.length
      }

      if (alreadyRegistered.length > 0) {
        result.message += `. ${alreadyRegistered.length} already registered.`
      }
    } else {
      // Single registration
      const { athleteId, seedNumber, isPresent, status } = validationResult.data

      // Check if athlete is already registered
      const existingRegistration = await prisma.competitionRegistration.findUnique({
        where: {
          competitionId_athleteId: {
            competitionId,
            athleteId
          }
        }
      })

      if (existingRegistration) {
        return NextResponse.json(
          { error: 'Athlete is already registered for this competition' },
          { status: 400 }
        )
      }

      // Create registration
      const registration = await prisma.competitionRegistration.create({
        data: {
          competitionId,
          athleteId,
          seedNumber,
          isPresent: isPresent ?? true,
          status: status ?? 'REGISTERED'
        }
      })

      result = {
        message: 'Athlete registered successfully',
        registration
      }
    }

    return NextResponse.json(result, { status: 201 })

  } catch (error) {
    console.error('Error registering athlete(s):', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 