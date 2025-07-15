import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string, pouleId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: competitionId, pouleId } = await context.params

    const body = await request.json()
    const { athleteAId, athleteBId, scoreA, scoreB, editingAthleteId, clearScore } = body

    // Validate input
    if (!athleteAId || !athleteBId) {
      return NextResponse.json({ error: 'Missing athlete IDs' }, { status: 400 })
    }

    // Validate scores if provided
    if (scoreA !== null && scoreA !== undefined && (scoreA < 0 || scoreA > 15)) {
      return NextResponse.json({ error: 'Invalid scoreA' }, { status: 400 })
    }
    if (scoreB !== null && scoreB !== undefined && (scoreB < 0 || scoreB > 15)) {
      return NextResponse.json({ error: 'Invalid scoreB' }, { status: 400 })
    }

    // Find the competition and verify access
    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
      include: {
        tournament: {
          include: {
            organization: true
          }
        }
      }
    })

    if (!competition) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 })
    }

    // Check if user has access to this competition
    if (competition.tournament.organization.id !== session.user.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Find the poule
    const poule = await prisma.poule.findUnique({
      where: { id: pouleId },
      include: {
        phase: {
          include: {
            competition: true
          }
        }
      }
    })

    if (!poule) {
      return NextResponse.json({ error: 'Poule not found' }, { status: 404 })
    }

    // Verify poule belongs to the competition
    if (poule.phase.competition.id !== competitionId) {
      return NextResponse.json({ error: 'Poule does not belong to this competition' }, { status: 400 })
    }

    // Find or create the match
    let match = await prisma.pouleMatch.findFirst({
      where: {
        pouleId: pouleId,
        OR: [
          { athleteAId, athleteBId },
          { athleteAId: athleteBId, athleteBId: athleteAId }
        ]
      }
    })

    // Handle clearing scores
    if (clearScore && editingAthleteId && match) {
      // Clear only the specific athlete's score
      let newScoreA: number | null = match.scoreA
      let newScoreB: number | null = match.scoreB
      
      // Clear only the score being edited
      if (match.athleteAId === editingAthleteId) {
        newScoreA = null
      } else if (match.athleteBId === editingAthleteId) {
        newScoreB = null
      } else if (match.athleteAId === athleteBId && match.athleteBId === athleteAId) {
        // Match is stored in reverse order
        if (athleteAId === editingAthleteId) {
          newScoreB = null
        } else {
          newScoreA = null
        }
      }
      
      // Determine winner
      let winnerId: string | null = null
      if (newScoreA !== null && newScoreB !== null) {
        if (newScoreA > newScoreB) {
          winnerId = match.athleteAId
        } else if (newScoreB > newScoreA) {
          winnerId = match.athleteBId
        }
      }
      
      // Determine status - if both scores are null or 0, set to SCHEDULED
      const status = (newScoreA === null && newScoreB === null) || (newScoreA === 0 && newScoreB === 0) ? 'SCHEDULED' : 'COMPLETED'
      
      // Update the match
      const updateData: any = {
        winnerId,
        status
      }
      
      // Only set score values if they're not undefined
      if (newScoreA !== undefined) {
        updateData.scoreA = newScoreA
      }
      if (newScoreB !== undefined) {
        updateData.scoreB = newScoreB
      }
      
      match = await prisma.pouleMatch.update({
        where: { id: match.id },
        data: updateData
      })
      
      return NextResponse.json({ match }, { status: 200 })
    }
    
    // Handle clearing all scores (backward compatibility)
    if (scoreA === null && scoreB === null) {
      if (match) {
        // Update existing match to clear scores
        match = await prisma.pouleMatch.update({
          where: { id: match.id },
          data: {
            scoreA: 0,
            scoreB: 0,
            winnerId: null,
            status: 'SCHEDULED'
          }
        })
        return NextResponse.json({ match }, { status: 200 })
      } else {
        // No match exists and no scores provided - nothing to do
        return NextResponse.json({ message: 'No match to clear' }, { status: 200 })
      }
    }

    // If we have an editingAthleteId, only update that athlete's score
    if (editingAthleteId && match) {
      // Get current scores from the match
      let newScoreA: number | null = match.scoreA
      let newScoreB: number | null = match.scoreB
      
      // Update only the score being edited
      if (match.athleteAId === editingAthleteId) {
        newScoreA = scoreA
      } else if (match.athleteBId === editingAthleteId) {
        newScoreB = scoreA
      } else if (match.athleteAId === athleteBId && match.athleteBId === athleteAId) {
        // Match is stored in reverse order
        if (athleteAId === editingAthleteId) {
          newScoreB = scoreA
        } else {
          newScoreA = scoreA
        }
      }
      
      // Determine winner
      let winnerId: string | null = null
      if (newScoreA !== null && newScoreB !== null) {
        if (newScoreA > newScoreB) {
          winnerId = match.athleteAId
        } else if (newScoreB > newScoreA) {
          winnerId = match.athleteBId
        }
      }
      
      // Update the match
      const updateData: any = {
        winnerId,
        status: 'COMPLETED'
      }
      
      if (newScoreA !== undefined) {
        updateData.scoreA = newScoreA
      }
      if (newScoreB !== undefined) {
        updateData.scoreB = newScoreB
      }
      
      match = await prisma.pouleMatch.update({
        where: { id: match.id },
        data: updateData
      })
      
      return NextResponse.json({ match }, { status: 200 })
    }

    // Original logic for V notation or creating new matches
    // Determine winner
    let winnerId: string | null = null
    if (scoreA > scoreB) {
      winnerId = athleteAId
    } else if (scoreB > scoreA) {
      winnerId = athleteBId
    }

    if (match) {
      // Update existing match
      // Ensure scores are assigned to the correct athletes
      const updateData = match.athleteAId === athleteAId 
        ? { scoreA, scoreB, winnerId, status: 'COMPLETED' as const }
        : { scoreA: scoreB, scoreB: scoreA, winnerId, status: 'COMPLETED' as const }

      match = await prisma.pouleMatch.update({
        where: { id: match.id },
        data: updateData
      })
    } else {
      // Create new match
      match = await prisma.pouleMatch.create({
        data: {
          pouleId: pouleId,
          athleteAId,
          athleteBId,
          scoreA,
          scoreB,
          winnerId,
          status: 'COMPLETED'
        }
      })
    }

    return NextResponse.json({ match }, { status: 200 })
    
  } catch (error) {
    console.error('Error saving match score:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 