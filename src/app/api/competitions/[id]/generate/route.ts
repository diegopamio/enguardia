import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for tournament generation data
const generateTournamentSchema = z.object({
  poules: z.array(z.object({
    phaseId: z.string(),
    phaseName: z.string(),
    poules: z.array(z.object({
      id: z.string(),
      number: z.number(),
      size: z.number(),
      athletes: z.array(z.object({
        athleteId: z.string(),
        position: z.number(),
        seedNumber: z.number(),
        club: z.string().optional(),
        country: z.string().optional()
      }))
    })),
    statistics: z.record(z.any()).optional()
  })),
  brackets: z.array(z.object({
    phaseId: z.string(),
    phaseName: z.string(),
    bracketType: z.string(),
    bracket: z.object({
      id: z.string(),
      size: z.number(),
      type: z.string(),
      seedingMethod: z.string(),
      athletes: z.array(z.any())
    }),
    matches: z.array(z.any())
  })),
  phases: z.array(z.object({
    id: z.string(),
    status: z.string()
  }))
})

// POST /api/competitions/[id]/generate - Save generated tournament structure
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
    const validationResult = generateTournamentSchema.safeParse(body)
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

    // Check permissions for generation
    if (!['SYSTEM_ADMIN', 'ORGANIZATION_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check if tournament allows modifications
    if (competition.tournament.status === 'COMPLETED' || competition.tournament.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Cannot generate tournament for completed or cancelled tournaments' },
        { status: 400 }
      )
    }

    const { poules, brackets, phases } = validationResult.data

    // Save generated tournament in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete existing generated data for this competition
      await tx.poule.deleteMany({
        where: { 
          phase: { competitionId }
        }
      })

      await tx.directEliminationBracket.deleteMany({
        where: { 
          phase: { competitionId }
        }
      })

      const createdPoules = []
      const createdBrackets = []

      // Create poules
      for (const pouleData of poules) {
        for (const poule of pouleData.poules) {
          const createdPoule = await tx.poule.create({
            data: {
              phaseId: pouleData.phaseId,
              number: poule.number,
              status: 'SCHEDULED'
            }
          })

          // Create poule assignments
          for (const athlete of poule.athletes) {
            await tx.pouleAssignment.create({
              data: {
                pouleId: createdPoule.id,
                athleteId: athlete.athleteId,
                position: athlete.position
              }
            })
          }

          createdPoules.push(createdPoule)
        }
      }

      // Create brackets
      for (const bracketData of brackets) {
        const createdBracket = await tx.directEliminationBracket.create({
          data: {
            phaseId: bracketData.phaseId,
            name: `${bracketData.phaseName} - ${bracketData.bracketType}`,
            round: bracketData.bracket?.size || 64 // Use bracket size as round indicator
          }
        })

        createdBrackets.push(createdBracket)
      }

      // Update phase statuses
      for (const phaseUpdate of phases) {
        await tx.phase.update({
          where: { id: phaseUpdate.id },
          data: { status: phaseUpdate.status as any }
        })
      }

      // Update competition status to IN_PROGRESS
      await tx.competition.update({
        where: { id: competitionId },
        data: { status: 'IN_PROGRESS' }
      })

      return {
        poules: createdPoules,
        brackets: createdBrackets,
        phasesUpdated: phases.length
      }
    })

    return NextResponse.json({ 
      success: true,
      generated: result,
      message: 'Tournament generated successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error generating tournament:', error)
    return NextResponse.json(
      { error: 'Failed to generate tournament' },
      { status: 500 }
    )
  }
} 