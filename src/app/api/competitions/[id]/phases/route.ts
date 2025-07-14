import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for phase configuration
const phaseConfigurationSchema = z.object({
  phases: z.array(z.object({
    name: z.string(),
    phaseType: z.enum(['POULE', 'DIRECT_ELIMINATION', 'CLASSIFICATION', 'REPECHAGE']),
    sequenceOrder: z.number(),
    configuration: z.record(z.any()).optional(),
    brackets: z.array(z.object({
      bracketType: z.enum(['MAIN', 'REPECHAGE', 'CLASSIFICATION', 'CONSOLATION']),
      size: z.number(),
      seedingMethod: z.enum(['RANKING', 'SNAKE', 'MANUAL', 'RANDOM']),
      configuration: z.record(z.any()).optional()
    })).optional()
  }))
})

// POST /api/competitions/[id]/phases - Save tournament formula configuration
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: competitionId } = await params
    const body = await request.json()

    // Validate input
    const validationResult = phaseConfigurationSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    // Verify competition exists and user has permission
    const competition = await prisma.competition.findFirst({
      where: {
        id: competitionId
      },
      include: {
        tournament: {
          select: { organizationId: true, status: true, isPublic: true }
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

    // Check permissions for modification
    if (!['SYSTEM_ADMIN', 'ORGANIZATION_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check if tournament allows modifications
    if (competition.tournament.status === 'COMPLETED' || competition.tournament.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Cannot modify phases for completed or cancelled tournaments' },
        { status: 400 }
      )
    }

    const { phases } = validationResult.data

    // Save phases in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete existing phases for this competition
      await tx.phase.deleteMany({
        where: { competitionId }
      })

      // Create new phases
      const createdPhases = []
      for (const phaseData of phases) {
        const phase = await tx.phase.create({
          data: {
            competitionId,
            name: phaseData.name,
            phaseType: phaseData.phaseType,
            sequenceOrder: phaseData.sequenceOrder,
            configuration: phaseData.configuration || {}
          }
        })

        createdPhases.push(phase)

        // Create bracket configurations if provided
        if (phaseData.brackets && phaseData.brackets.length > 0) {
          for (const bracketData of phaseData.brackets) {
            await tx.bracketConfiguration.create({
              data: {
                phaseId: phase.id,
                bracketType: bracketData.bracketType,
                size: bracketData.size,
                seedingMethod: bracketData.seedingMethod,
                configuration: bracketData.configuration || {}
              }
            })
          }
        }
      }

      return createdPhases
    })

    return NextResponse.json({ 
      success: true,
      phases: result,
      message: 'Tournament formula saved successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error saving tournament formula:', error)
    return NextResponse.json(
      { error: 'Failed to save tournament formula' },
      { status: 500 }
    )
  }
}

// GET /api/competitions/[id]/phases - Get existing phase configuration
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

    // Get phases with bracket configurations
    const phases = await prisma.phase.findMany({
      where: { competitionId },
      include: {
        bracketConfigs: true
      },
      orderBy: { sequenceOrder: 'asc' }
    })

    return NextResponse.json({ phases })

  } catch (error) {
    console.error('Error fetching tournament formula:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tournament formula' },
      { status: 500 }
    )
  }
} 