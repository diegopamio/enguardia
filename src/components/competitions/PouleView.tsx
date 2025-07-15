'use client'

import { useState, useEffect } from 'react'
import { apiFetch, notify } from '@/lib/notifications'

interface Athlete {
  id: string
  firstName: string
  lastName: string
  nationality?: string
  fieId?: string
  club?: {
    name: string
    city?: string
    country?: string
  }
}

interface PouleAssignment {
  id: string
  athleteId: string
  position: number
  athlete: Athlete
}

interface PouleMatch {
  id: string
  athleteAId: string
  athleteBId: string
  scoreA: number | null
  scoreB: number | null
  winnerId: string | null
  status: string
  startTime?: string
  endTime?: string
}

interface Poule {
  id: string
  number: number
  piste?: string
  referee?: string
  startTime?: string
  status: string
  assignments: PouleAssignment[]
  matches: PouleMatch[]
}

interface Phase {
  id: string
  name: string
  phaseType: string
  status: string
  sequenceOrder: number
  poules: Poule[]
}

interface PouleViewProps {
  competitionId: string
  competitionName: string
  weapon: string
  tournamentId: string
}

export default function PouleView({ competitionId, competitionName, weapon, tournamentId }: PouleViewProps) {
  const [phases, setPhases] = useState<Phase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'data-entry' | 'print'>('data-entry')
  const [identificationMode, setIdentificationMode] = useState<'club' | 'nationality' | 'region'>('club')
  const [editingCell, setEditingCell] = useState<{ pouleId: string; athleteAId: string; athleteBId: string } | null>(null)
  const [tempScores, setTempScores] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    fetchPoules()
  }, [competitionId])

  const fetchPoules = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiFetch(`/api/competitions/${competitionId}/poules`)
      const data = await response.json()
      
      if (data.phases) {
        setPhases(data.phases)
      }
    } catch (err: any) {
      console.error('Error fetching poules:', err)
      setError(err.message || 'Failed to load poules')
      notify.error('Failed to load poules')
    } finally {
      setLoading(false)
    }
  }

  const calculateResults = (poule: Poule) => {
    const results = new Map()
    
    // Initialize results for each fencer
    poule.assignments.forEach(assignment => {
      results.set(assignment.athleteId, {
        victories: 0,
        touchesScored: 0,
        touchesReceived: 0,
        indicator: 0,
        place: 0
      })
    })

    // Calculate from matches
    poule.matches.forEach(match => {
      if (match.scoreA !== null && match.scoreB !== null) {
        const resultA = results.get(match.athleteAId)
        const resultB = results.get(match.athleteBId)
        
        if (resultA && resultB) {
          resultA.touchesScored += match.scoreA
          resultA.touchesReceived += match.scoreB
          resultB.touchesScored += match.scoreB
          resultB.touchesReceived += match.scoreA
          
          if (match.winnerId === match.athleteAId) {
            resultA.victories += 1
          } else if (match.winnerId === match.athleteBId) {
            resultB.victories += 1
          }
        }
      }
    })

    // Calculate indicators and places
    results.forEach((result, athleteId) => {
      result.indicator = result.touchesScored - result.touchesReceived
    })

    // Sort by victories (desc), then indicator (desc), then touches scored (desc)
    const sortedResults = Array.from(results.entries()).sort(([, a], [, b]) => {
      if (a.victories !== b.victories) return b.victories - a.victories
      if (a.indicator !== b.indicator) return b.indicator - a.indicator
      return b.touchesScored - a.touchesScored
    })

    // Assign places
    sortedResults.forEach(([athleteId, result], index) => {
      result.place = index + 1
    })

    return results
  }

  const getMatchScore = (poule: Poule, athleteAId: string, athleteBId: string) => {
    // Find the match
    const match = poule.matches.find(m => 
      (m.athleteAId === athleteAId && m.athleteBId === athleteBId) ||
      (m.athleteAId === athleteBId && m.athleteBId === athleteAId)
    )
    
    if (!match) {
      // Check for temporary scores when no match exists yet
      const tempKey = `${poule.id}-${athleteAId}-${athleteBId}`
      const tempScore = tempScores[tempKey]
      return tempScore !== undefined ? tempScore : null
    }
    
    // Check for temporary scores using match ID + athlete position
    const isAthleteA = match.athleteAId === athleteAId
    const tempKey = `${match.id}-${isAthleteA ? 'A' : 'B'}`
    const tempScore = tempScores[tempKey]
    
    if (tempScore !== undefined) {
      return tempScore
    }
    
    // Get the actual stored score
    const myScore = isAthleteA ? match.scoreA : match.scoreB
    const opponentScore = isAthleteA ? match.scoreB : match.scoreA
    
    // If this athlete's score is null, return null
    if (myScore === null) {
      return null
    }
    
    // Check if this is a cleared match (both scores 0 and status is SCHEDULED)
    if (match.scoreA === 0 && match.scoreB === 0 && match.status === 'SCHEDULED') {
      return null
    }
    
    // Render as V notation when both scores are present and one is greater than the other
    if (myScore !== null && opponentScore !== null && myScore > opponentScore) {
      // If this athlete's score is greater than opponent's score, render as V<score>
      return `V${myScore}`
    }
    
    // For all other cases (losses, ties, or incomplete matches), show the numeric score
    return myScore
  }

  const getIdentificationText = (athlete: Athlete) => {
    switch (identificationMode) {
      case 'club':
        return athlete.club?.name || athlete.nationality || ''
      case 'nationality':
        return athlete.nationality || ''
      case 'region':
        return athlete.club?.city || athlete.club?.country || athlete.nationality || ''
      default:
        return athlete.club?.name || athlete.nationality || ''
    }
  }

  const handleScoreClick = (pouleId: string, athleteAId: string, athleteBId: string) => {
    if (athleteAId === athleteBId) return // Can't edit diagonal
    
    const currentPhase = phases.find(p => p.poules.find(po => po.id === pouleId))
    const currentPoule = currentPhase?.poules.find(po => po.id === pouleId)
    const currentScore = currentPoule ? getMatchScore(currentPoule, athleteAId, athleteBId) : null
    
    // Find existing match to get the ID
    const match = currentPoule?.matches.find(m => 
      (m.athleteAId === athleteAId && m.athleteBId === athleteBId) ||
      (m.athleteAId === athleteBId && m.athleteBId === athleteAId)
    )
    
    let cellKey: string
    if (match) {
      // Use match ID + athlete position for existing matches
      const isAthleteA = match.athleteAId === athleteAId
      cellKey = `${match.id}-${isAthleteA ? 'A' : 'B'}`
    } else {
      // Use poule-athlete format for new matches
      cellKey = `${pouleId}-${athleteAId}-${athleteBId}`
    }
    
    setEditingCell({ pouleId, athleteAId, athleteBId })
    setTempScores({ ...tempScores, [cellKey]: currentScore?.toString() || '' })
  }

  const handleScoreChange = (cellKey: string, value: string) => {
    // Handle fencing notation
    const upperValue = value.toUpperCase()
    
    // Handle V, V<number>, or numeric values
    if (upperValue === 'V' || /^V\d*$/.test(upperValue) || /^\d+$/.test(value) || value === '') {
      setTempScores({ ...tempScores, [cellKey]: upperValue })
    } else {
      // Only allow valid fencing notation
      setTempScores({ ...tempScores, [cellKey]: tempScores[cellKey] || '' })
    }
  }

  const findAdjacentCell = (pouleId: string, currentAthleteId: string, currentOpponentId: string, direction: 'up' | 'down' | 'left' | 'right') => {
    const currentPhase = phases.find(p => p.poules.find(po => po.id === pouleId))
    const currentPoule = currentPhase?.poules.find(po => po.id === pouleId)
    
    if (!currentPoule) return null
    
    const sortedAssignments = [...currentPoule.assignments].sort((a, b) => a.position - b.position)
    const currentRowIndex = sortedAssignments.findIndex(a => a.athleteId === currentAthleteId)
    const currentColIndex = sortedAssignments.findIndex(a => a.athleteId === currentOpponentId)
    
    let newRowIndex = currentRowIndex
    let newColIndex = currentColIndex
    
    switch (direction) {
      case 'up':
        newRowIndex = Math.max(0, currentRowIndex - 1)
        break
      case 'down':
        newRowIndex = Math.min(sortedAssignments.length - 1, currentRowIndex + 1)
        break
      case 'left':
        newColIndex = Math.max(0, currentColIndex - 1)
        break
      case 'right':
        newColIndex = Math.min(sortedAssignments.length - 1, currentColIndex + 1)
        break
    }
    
    // Skip diagonal cells
    if (newRowIndex === newColIndex) {
      // Try to move one more step in the same direction
      switch (direction) {
        case 'up':
          newRowIndex = Math.max(0, newRowIndex - 1)
          break
        case 'down':
          newRowIndex = Math.min(sortedAssignments.length - 1, newRowIndex + 1)
          break
        case 'left':
          newColIndex = Math.max(0, newColIndex - 1)
          break
        case 'right':
          newColIndex = Math.min(sortedAssignments.length - 1, newColIndex + 1)
          break
      }
    }
    
    // If still diagonal or out of bounds, return null
    if (newRowIndex === newColIndex || newRowIndex < 0 || newColIndex < 0 || 
        newRowIndex >= sortedAssignments.length || newColIndex >= sortedAssignments.length) {
      return null
    }
    
    return {
      pouleId,
      athleteAId: sortedAssignments[newRowIndex].athleteId,
      athleteBId: sortedAssignments[newColIndex].athleteId
    }
  }

  const handleScoreSubmit = async (pouleId: string, athleteAId: string, athleteBId: string) => {
    // Find the current match and determine the appropriate key
    const currentPhase = phases.find(p => p.poules.find(po => po.id === pouleId))
    const currentPoule = currentPhase?.poules.find(po => po.id === pouleId)
    const match = currentPoule?.matches.find(m => 
      (m.athleteAId === athleteAId && m.athleteBId === athleteBId) ||
      (m.athleteAId === athleteBId && m.athleteBId === athleteAId)
    )
    
    let cellKey: string
    if (match) {
      const isAthleteA = match.athleteAId === athleteAId
      cellKey = `${match.id}-${isAthleteA ? 'A' : 'B'}`
    } else {
      cellKey = `${pouleId}-${athleteAId}-${athleteBId}`
    }
    
    const scoreValue = tempScores[cellKey]
    
    // Handle empty cells (user wants to clear the score)
    if (scoreValue === '' || scoreValue === undefined) {
      // First check if a match exists
      const currentPhase = phases.find(p => p.poules.find(po => po.id === pouleId))
      const currentPoule = currentPhase?.poules.find(po => po.id === pouleId)
      const match = currentPoule?.matches.find(m => 
        (m.athleteAId === athleteAId && m.athleteBId === athleteBId) ||
        (m.athleteAId === athleteBId && m.athleteBId === athleteAId)
      )
      
      if (!match) {
        // No match exists - just clear the temporary score
        setEditingCell(null)
        const newTempScores = { ...tempScores }
        delete newTempScores[cellKey]
        setTempScores(newTempScores)
        return
      }
      
      try {
        // Send request to clear only this athlete's score
        const response = await fetch(`/api/competitions/${competitionId}/poules/${pouleId}/matches`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            athleteAId: athleteAId < athleteBId ? athleteAId : athleteBId,
            athleteBId: athleteAId < athleteBId ? athleteBId : athleteAId,
            scoreA: 0,
            scoreB: 0,
            editingAthleteId: athleteAId, // Indicate which athlete's score to clear
            clearScore: true, // Flag to indicate we're clearing a score
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to clear score')
        }

        const responseData = await response.json()
        
        // Update local state with the cleared match
        if (responseData.match) {
          const clearedMatch = responseData.match
          setPhases(prevPhases => 
            prevPhases.map(phase => ({
              ...phase,
              poules: phase.poules.map(poule => {
                if (poule.id !== pouleId) return poule
                
                // Check if this match already exists
                const existingMatchIndex = poule.matches.findIndex(m => 
                  (m.athleteAId === clearedMatch.athleteAId && m.athleteBId === clearedMatch.athleteBId) ||
                  (m.athleteAId === clearedMatch.athleteBId && m.athleteBId === clearedMatch.athleteAId)
                )
                
                let updatedMatches
                if (existingMatchIndex >= 0) {
                  // Update existing match
                  updatedMatches = [...poule.matches]
                  updatedMatches[existingMatchIndex] = clearedMatch
                } else {
                  // This shouldn't happen for clearing, but handle it anyway
                  updatedMatches = [...poule.matches, clearedMatch]
                }
                
                return {
                  ...poule,
                  matches: updatedMatches
                }
              })
            }))
          )
        }

        setEditingCell(null)
        // Clear temporary scores for this cell
        const newTempScores = { ...tempScores }
        delete newTempScores[cellKey]
        setTempScores(newTempScores)
      } catch (error) {
        console.error('Error clearing score:', error)
        setEditingCell(null)
      }
      return
    }

    try {
      // Find the match in the current data
      const currentPhase = phases.find(p => p.poules.find(po => po.id === pouleId))
      const currentPoule = currentPhase?.poules.find(po => po.id === pouleId)
      let match = currentPoule?.matches.find(m => 
        (m.athleteAId === athleteAId && m.athleteBId === athleteBId) ||
        (m.athleteAId === athleteBId && m.athleteBId === athleteAId)
      )

      // We need to determine the scores based on who we're editing for
      // and ensure we always send athletes in consistent order to the API
      let apiAthleteA, apiAthleteB
      
      // Determine the canonical order for the match (always use lower ID as athleteA)
      if (athleteAId < athleteBId) {
        apiAthleteA = athleteAId
        apiAthleteB = athleteBId
      } else {
        apiAthleteA = athleteBId
        apiAthleteB = athleteAId
      }
      
      // Prepare score values based on input
      let scoreA: number | null = 0
      let scoreB: number | null = 0
      const maxPouleScore = 5 // Max score in fencing poule
      
      // Check if it's a victory notation
      if (scoreValue.toUpperCase().startsWith('V')) {
        // Parse V or V<number> format
        const vValue = scoreValue.substring(1).trim()
        let victoryScore: number
        
        if (vValue === '') {
          // Just "V" - use max poule score
          victoryScore = maxPouleScore
        } else if (!isNaN(Number(vValue))) {
          // "V<number>" - use the specified number
          victoryScore = Number(vValue)
        } else {
          // Invalid format
          setEditingCell(null)
          return
        }
        
        // Set the victory score ONLY for the editing athlete, preserve opponent's score
        if (athleteAId === apiAthleteA) {
          scoreA = victoryScore
          scoreB = match?.scoreB || null
        } else {
          scoreA = match?.scoreA || null
          scoreB = victoryScore
        }
      } else {
        // Regular numeric score
        if (isNaN(Number(scoreValue))) {
          setEditingCell(null)
          return
        }
        
        const numericScore = Number(scoreValue)
        
        // Set the score for the editing athlete, preserve opponent's score
        if (athleteAId === apiAthleteA) {
          scoreA = numericScore
          scoreB = match?.scoreB || null
        } else {
          scoreA = match?.scoreA || null
          scoreB = numericScore
        }
      }
      
      // Always use the canonical athlete order for the API
      const originalEditingAthleteId = athleteAId // Save the original editing athlete ID
      athleteAId = apiAthleteA
      athleteBId = apiAthleteB
      
      // Save to database
      const response = await fetch(`/api/competitions/${competitionId}/poules/${pouleId}/matches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          athleteAId,
          athleteBId,
          scoreA,
          scoreB,
          editingAthleteId: originalEditingAthleteId, // Pass the original editing athlete ID
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save score')
      }

      const responseData = await response.json()
      const updatedMatch = responseData.match

      // Update the local state with the new/updated match
      setPhases(prevPhases => 
        prevPhases.map(phase => ({
          ...phase,
          poules: phase.poules.map(poule => {
            if (poule.id !== pouleId) return poule
            
            // Check if this match already exists
            const existingMatchIndex = poule.matches.findIndex(m => 
              (m.athleteAId === updatedMatch.athleteAId && m.athleteBId === updatedMatch.athleteBId) ||
              (m.athleteAId === updatedMatch.athleteBId && m.athleteBId === updatedMatch.athleteAId)
            )
            
            let updatedMatches
            if (existingMatchIndex >= 0) {
              // Update existing match
              updatedMatches = [...poule.matches]
              updatedMatches[existingMatchIndex] = updatedMatch
            } else {
              // Add new match
              updatedMatches = [...poule.matches, updatedMatch]
            }
            
            return {
              ...poule,
              matches: updatedMatches
            }
          })
        }))
      )

      setEditingCell(null)
      
      // Clear temporary scores ONLY for the specific athlete that was saved
      // Don't clear the opponent's temporary score if they have one
      const savedMatch = currentPoule?.matches.find(m => m.id === updatedMatch.id)
      let clearKey: string
      if (savedMatch) {
        const isAthleteA = savedMatch.athleteAId === athleteAId
        clearKey = `${savedMatch.id}-${isAthleteA ? 'A' : 'B'}`
      } else {
        clearKey = `${pouleId}-${athleteAId}-${athleteBId}`
      }
      
      const newTempScores = { ...tempScores }
      delete newTempScores[clearKey]
      
      // Also clear any old-format temp scores for this cell
      delete newTempScores[`${pouleId}-${athleteAId}-${athleteBId}`]
      
      setTempScores(newTempScores)
    } catch (error) {
      console.error('Error saving score:', error)
      setEditingCell(null)
    }
  }

  const handleScoreCancel = () => {
    setEditingCell(null)
  }

  const handleArrowNavigation = async (pouleId: string, athleteAId: string, athleteBId: string, direction: 'up' | 'down' | 'left' | 'right') => {
    // First, save the current cell (including empty values to clear scores)
    const currentPhase = phases.find(p => p.poules.find(po => po.id === pouleId))
    const currentPoule = currentPhase?.poules.find(po => po.id === pouleId)
    const currentMatch = currentPoule?.matches.find(m => 
      (m.athleteAId === athleteAId && m.athleteBId === athleteBId) ||
      (m.athleteAId === athleteBId && m.athleteBId === athleteAId)
    )
    
    let currentCellKey: string
    if (currentMatch) {
      const isAthleteA = currentMatch.athleteAId === athleteAId
      currentCellKey = `${currentMatch.id}-${isAthleteA ? 'A' : 'B'}`
    } else {
      currentCellKey = `${pouleId}-${athleteAId}-${athleteBId}`
    }
    
    const currentValue = tempScores[currentCellKey]
    
    // Save if we have any value (including empty string which means clear the score)
    if (currentValue !== undefined) {
      await handleScoreSubmit(pouleId, athleteAId, athleteBId)
    }
    
    // Then navigate to the next cell
    const nextCell = findAdjacentCell(pouleId, athleteAId, athleteBId, direction)
    if (nextCell) {
      // Don't try to set any temporary score value - let the cell be clicked naturally
      // This avoids race conditions with state updates from the save operation
      setEditingCell(nextCell)
      
      // Clean up temp scores from the saved cell only
      const newTempScores = { ...tempScores }
      delete newTempScores[currentCellKey] // Remove the saved cell
      
      // Also clean up any old-format temp scores for the saved cell
      delete newTempScores[`${pouleId}-${athleteAId}-${athleteBId}`]
      
      setTempScores(newTempScores)
      
      // Trigger the normal cell click logic to set up the next cell properly
      // This will use the most up-to-date data and handle temporary scores correctly
      handleScoreClick(nextCell.pouleId, nextCell.athleteAId, nextCell.athleteBId)
    }
  }

  const renderPrintPouleSheet = (poule: Poule, phase: Phase, isFirst: boolean = false) => {
    const sortedAssignments = [...poule.assignments].sort((a, b) => a.position - b.position)
    
    return (
      <div key={poule.id} className={`bg-white p-4 mb-8 font-mono text-sm max-w-full poule-sheet ${isFirst ? 'first-poule' : ''}`}>
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="text-lg font-bold">{competitionName}</div>
          <div className="text-sm">page 1/1</div>
        </div>

        {/* Poule Info Header */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* Left: Poule Number */}
          <div className="border-2 border-black">
            <div className="bg-yellow-200 border-b border-black p-2 text-center font-bold">
              Poule No {poule.number}
            </div>
            <div className="p-2 text-center">
              {poule.startTime ? new Date(poule.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '9:00'} Piste No {poule.piste || '1'}
            </div>
            <div className="border-t border-black p-2 text-center">
              Tour No 1
            </div>
          </div>

          {/* Center: Referee */}
          <div className="border-2 border-black">
            <div className="bg-gray-100 border-b border-black p-2 text-center font-bold">
              Arbitre
            </div>
            <div className="p-2 text-center">
              {poule.referee || 'TBA'}
            </div>
          </div>

          {/* Right: Signature */}
          <div className="border-2 border-black">
            <div className="bg-gray-100 border-b border-black p-2 text-center font-bold">
              Signature
            </div>
            <div className="p-2 h-16"></div>
          </div>
        </div>

        {/* Match Format Info */}
        <div className="mb-4 text-xs">
          matches en 5 touches • {sortedAssignments.length} fencers • {weapon} • {phase.name}
        </div>

        {/* Main Score Matrix */}
        <div className="mb-6">
          <table className="w-full border-collapse border-2 border-black text-xs">
            <thead>
              <tr>
                <th className="border border-black p-1 text-left bg-gray-100 w-40">nom prénom</th>
                <th className="border border-black p-1 text-center bg-gray-100 w-12">
                  {identificationMode === 'nationality' ? 'nat.' : 
                   identificationMode === 'club' ? 'club' : 'rég.'}
                </th>
                {sortedAssignments.map((_, index) => (
                  <th key={index} className="border border-black p-1 text-center bg-gray-100 w-8">
                    {index + 1}
                  </th>
                ))}
                <th className="border border-black p-1 text-center bg-gray-100 w-20">signature</th>
              </tr>
            </thead>
            <tbody>
              {sortedAssignments.map((assignment, rowIndex) => (
                <tr key={assignment.id}>
                  {/* Name */}
                  <td className="border border-black p-1 text-left font-bold">
                    {assignment.athlete.lastName} {assignment.athlete.firstName}
                  </td>
                  
                  {/* Nationality/ID */}
                  <td className="border border-black p-1 text-center">
                    {getIdentificationText(assignment.athlete)}
                  </td>
                  
                  {/* Score matrix - one cell for each position */}
                  {sortedAssignments.map((opponentAssignment, colIndex) => {
                    if (colIndex === rowIndex) {
                      // This is the diagonal - fencer vs themselves
                      return (
                        <td key={opponentAssignment.id} className="border border-black p-1">
                          <div className="bg-gray-400 w-full h-6"></div>
                        </td>
                      )
                    } else {
                      // Score cell
                      const score = getMatchScore(poule, assignment.athleteId, opponentAssignment.athleteId)
                      return (
                        <td key={opponentAssignment.id} className="border border-black p-1 text-center">
                          <div className="w-full h-6 flex items-center justify-center">
                            {score ?? ''}
                          </div>
                        </td>
                      )
                    }
                  })}
                  
                  {/* Signature column */}
                  <td className="border border-black p-1">
                    <div className="w-full h-6"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Placement info */}
        <div className="mb-4 text-xs">
          <div className="mb-2">Placement dans les poules par : {identificationMode === 'nationality' ? 'nations' : identificationMode === 'club' ? 'clubs' : 'régions'}</div>
        </div>

        {/* Match Pairings Grid */}
        <div className="grid grid-cols-4 gap-4 text-xs">
          {Array.from({ length: 4 }).map((_, colIndex) => (
            <div key={colIndex} className="space-y-1">
              {sortedAssignments.map((athleteA, indexA) => 
                sortedAssignments.slice(indexA + 1).map((athleteB, indexB) => {
                  const pairIndex = indexA * (sortedAssignments.length - indexA - 1) + indexB
                  if (pairIndex % 4 === colIndex) {
                    return (
                      <div key={`${athleteA.id}-${athleteB.id}`} className="text-xs">
                        <div>{athleteA.position} {athleteA.athlete.lastName}</div>
                        <div>{athleteB.position} {athleteB.athlete.lastName}</div>
                        <div className="border-b border-gray-300 mb-1"></div>
                      </div>
                    )
                  }
                  return null
                })
              ).filter(Boolean)}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderPouleSheet = (poule: Poule, phase: Phase) => {
    const sortedAssignments = [...poule.assignments].sort((a, b) => a.position - b.position)
    const results = calculateResults(poule)
    
    return (
      <div key={poule.id} className="bg-white border-2 border-black p-4 mb-8 font-mono text-sm print:page-break-inside-avoid">
        {/* Header Information */}
        <div className="border-b-2 border-black pb-2 mb-4">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="mb-1"><strong>Tournament:</strong> {competitionName}</div>
              <div className="mb-1"><strong>Competition:</strong> {weapon} {phase.name}</div>
              <div className="mb-1"><strong>Round:</strong> {phase.name}</div>
            </div>
            <div>
              <div className="mb-1"><strong>Pool:</strong> {poule.number}</div>
              <div className="mb-1"><strong>Strip:</strong> {poule.piste || 'TBA'}</div>
              <div className="mb-1"><strong>Referee:</strong> {poule.referee || 'TBA'}</div>
            </div>
          </div>
        </div>

        {/* Main Poule Matrix */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border-2 border-black">
            {/* Header Row */}
            <thead>
              <tr>
                <th className="border border-black p-1 text-center bg-gray-100 w-20">Club</th>
                <th className="border border-black p-1 text-center bg-gray-100 w-40">Name</th>
                <th className="border border-black p-1 text-center bg-gray-100 w-8">#</th>
                {sortedAssignments.map(assignment => (
                  <th key={assignment.id} className="border border-black p-1 text-center bg-gray-100 w-8">
                    {assignment.position}
                  </th>
                ))}
                <th className="border border-black p-1 text-center bg-gray-100 w-8">V</th>
                <th className="border border-black p-1 text-center bg-gray-100 w-8">TS</th>
                <th className="border border-black p-1 text-center bg-gray-100 w-8">TR</th>
                <th className="border border-black p-1 text-center bg-gray-100 w-8">Ind</th>
                <th className="border border-black p-1 text-center bg-gray-100 w-8">Pl</th>
              </tr>
            </thead>
            
            {/* Fencer Rows */}
            <tbody>
              {sortedAssignments.map(assignment => {
                const result = results.get(assignment.athleteId)
                return (
                  <tr key={assignment.id}>
                    {/* Club */}
                    <td className="border border-black p-1 text-center text-xs">
                      {getIdentificationText(assignment.athlete)}
                    </td>
                    
                    {/* Name */}
                    <td className="border border-black p-1 text-left text-xs">
                      {assignment.athlete.lastName}, {assignment.athlete.firstName}
                    </td>
                    
                    {/* Position Number */}
                    <td className="border border-black p-1 text-center font-bold bg-gray-100">
                      {assignment.position}
                    </td>
                    
                    {/* Score Matrix */}
                    {sortedAssignments.map(opponentAssignment => {
                      // Find existing match to determine the key
                      const match = poule.matches.find(m => 
                        (m.athleteAId === assignment.athleteId && m.athleteBId === opponentAssignment.athleteId) ||
                        (m.athleteAId === opponentAssignment.athleteId && m.athleteBId === assignment.athleteId)
                      )
                      
                      let cellKey: string
                      if (match) {
                        const isAthleteA = match.athleteAId === assignment.athleteId
                        cellKey = `${match.id}-${isAthleteA ? 'A' : 'B'}`
                      } else {
                        cellKey = `${poule.id}-${assignment.athleteId}-${opponentAssignment.athleteId}`
                      }
                      
                      const isEditing = editingCell?.pouleId === poule.id && 
                                       editingCell?.athleteAId === assignment.athleteId && 
                                       editingCell?.athleteBId === opponentAssignment.athleteId
                      
                      return (
                        <td key={opponentAssignment.id} className="border border-black p-1 text-center">
                          {assignment.athleteId === opponentAssignment.athleteId ? (
                            // Diagonal - fencer vs themselves
                            <div className="bg-gray-300 w-full h-full flex items-center justify-center">
                              —
                            </div>
                          ) : isEditing ? (
                            // Edit mode - show input field
                            <input
                              type="text"
                              value={tempScores[cellKey] || ''}
                              onChange={(e) => handleScoreChange(cellKey, e.target.value)}
                              onFocus={(e) => e.target.select()}
                              onBlur={() => handleScoreSubmit(poule.id, assignment.athleteId, opponentAssignment.athleteId)}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  await handleScoreSubmit(poule.id, assignment.athleteId, opponentAssignment.athleteId)
                                } else if (e.key === 'Escape') {
                                  handleScoreCancel()
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault()
                                  await handleArrowNavigation(poule.id, assignment.athleteId, opponentAssignment.athleteId, 'up')
                                } else if (e.key === 'ArrowDown') {
                                  e.preventDefault()
                                  await handleArrowNavigation(poule.id, assignment.athleteId, opponentAssignment.athleteId, 'down')
                                } else if (e.key === 'ArrowLeft') {
                                  e.preventDefault()
                                  await handleArrowNavigation(poule.id, assignment.athleteId, opponentAssignment.athleteId, 'left')
                                } else if (e.key === 'ArrowRight') {
                                  e.preventDefault()
                                  await handleArrowNavigation(poule.id, assignment.athleteId, opponentAssignment.athleteId, 'right')
                                }
                              }}
                              className="w-full h-6 text-center border-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-yellow-100"
                              autoFocus
                            />
                          ) : (
                            // View mode - clickable score cell
                            <div 
                              className="min-h-[24px] flex items-center justify-center cursor-pointer hover:bg-gray-100"
                              onClick={() => handleScoreClick(poule.id, assignment.athleteId, opponentAssignment.athleteId)}
                            >
                              {getMatchScore(poule, assignment.athleteId, opponentAssignment.athleteId) ?? ''}
                            </div>
                          )}
                        </td>
                      )
                    })}
                    
                    {/* Results */}
                    <td className="border border-black p-1 text-center font-bold bg-yellow-50">
                      {result?.victories ?? 0}
                    </td>
                    <td className="border border-black p-1 text-center bg-blue-50">
                      {result?.touchesScored ?? 0}
                    </td>
                    <td className="border border-black p-1 text-center bg-red-50">
                      {result?.touchesReceived ?? 0}
                    </td>
                    <td className="border border-black p-1 text-center bg-green-50">
                      {result?.indicator ?? 0}
                    </td>
                    <td className="border border-black p-1 text-center font-bold bg-purple-50">
                      {result?.place ?? 0}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Barrage Section (if needed) */}
        <div className="mt-4 border-t border-black pt-2">
          <div className="text-sm font-bold mb-2">Barrage</div>
          <table className="border-collapse border border-black">
            <thead>
              <tr>
                <th className="border border-black p-1 text-center bg-gray-100">#</th>
                <th className="border border-black p-1 text-center bg-gray-100">1</th>
                <th className="border border-black p-1 text-center bg-gray-100">2</th>
                <th className="border border-black p-1 text-center bg-gray-100">3</th>
                <th className="border border-black p-1 text-center bg-gray-100">4</th>
                <th className="border border-black p-1 text-center bg-gray-100">V</th>
                <th className="border border-black p-1 text-center bg-gray-100">TS</th>
                <th className="border border-black p-1 text-center bg-gray-100">TR</th>
                <th className="border border-black p-1 text-center bg-gray-100">Ind</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4].map(i => (
                <tr key={i}>
                  <td className="border border-black p-1 text-center bg-gray-100">{i}</td>
                  <td className="border border-black p-1 w-8 h-6"></td>
                  <td className="border border-black p-1 w-8 h-6"></td>
                  <td className="border border-black p-1 w-8 h-6"></td>
                  <td className="border border-black p-1 w-8 h-6"></td>
                  <td className="border border-black p-1 w-8 h-6"></td>
                  <td className="border border-black p-1 w-8 h-6"></td>
                  <td className="border border-black p-1 w-8 h-6"></td>
                  <td className="border border-black p-1 w-8 h-6"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Warning Section */}
        <div className="mt-4 border-t border-black pt-2">
          <div className="text-sm font-bold mb-2">Warning</div>
          <div className="grid grid-cols-4 gap-4 text-xs">
            <div className="border border-black p-2 h-16">
              <div className="font-bold">Name/Number</div>
            </div>
            <div className="border border-black p-2 h-16">
              <div className="font-bold">Description</div>
            </div>
            <div className="border border-black p-2 h-16">
              <div className="font-bold">Card Color</div>
            </div>
            <div className="border border-black p-2 h-16">
              <div className="font-bold">Signature</div>
            </div>
          </div>
        </div>

        {/* Status and Timing */}
        <div className="mt-4 text-xs text-gray-600">
          <div>Status: {poule.status}</div>
          {poule.startTime && (
            <div>Start Time: {new Date(poule.startTime).toLocaleString()}</div>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading poules...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={() => fetchPoules()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (phases.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-600">No poules found for this competition.</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center flex-wrap gap-4 print-hidden">
        <h2 className="text-2xl font-bold">Poule Sheets</h2>
        
        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">View:</label>
            <select 
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as 'data-entry' | 'print')}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="data-entry">Data Entry</option>
              <option value="print">Print Layout</option>
            </select>
          </div>

          {/* Identification Mode Toggle */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Show:</label>
            <select 
              value={identificationMode}
              onChange={(e) => setIdentificationMode(e.target.value as 'club' | 'nationality' | 'region')}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="club">Club</option>
              <option value="nationality">Nationality</option>
              <option value="region">Region</option>
            </select>
          </div>

          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Print Poule Sheets
          </button>
        </div>
      </div>

      {phases.map(phase => (
        <div key={phase.id} className="space-y-6">
          <div className="border-b pb-2 print-hidden">
            <h3 className="text-xl font-semibold">{phase.name}</h3>
            <p className="text-gray-600">{phase.phaseType} • {phase.poules.length} poule{phase.poules.length !== 1 ? 's' : ''}</p>
          </div>
          
          <div className="space-y-8">
            {phase.poules.map((poule, index) => {
              const overallIndex = phases.slice(0, phases.indexOf(phase)).reduce((acc, p) => acc + p.poules.length, 0) + index
              const isFirst = overallIndex === 0
              return viewMode === 'print' 
                ? renderPrintPouleSheet(poule, phase, isFirst)
                : renderPouleSheet(poule, phase)
            })}
          </div>
        </div>
      ))}
    </div>
  )
} 