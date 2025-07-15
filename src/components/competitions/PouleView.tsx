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

  // Simple function to get the raw score for display
  const getMatchScore = (poule: Poule, athleteAId: string, athleteBId: string) => {
    const match = poule.matches.find(m => 
      (m.athleteAId === athleteAId && m.athleteBId === athleteBId) ||
      (m.athleteAId === athleteBId && m.athleteBId === athleteAId)
    )
    
    if (!match) {
      return null
    }
    
    // Return the score for the specific athlete
    const isAthleteA = match.athleteAId === athleteAId
    return isAthleteA ? match.scoreA : match.scoreB
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

  const handleCellClick = (pouleId: string, athleteAId: string, athleteBId: string) => {
    if (athleteAId === athleteBId) return // Can't edit diagonal
    setEditingCell({ pouleId, athleteAId, athleteBId })
  }

  const findAdjacentCell = (pouleId: string, currentAthleteId: string, currentOpponentId: string, direction: 'up' | 'down' | 'left' | 'right') => {
    const currentPhase = phases.find(p => p.poules.find(po => po.id === pouleId))
    const currentPoule = currentPhase?.poules.find(po => po.id === pouleId)
    
    if (!currentPoule) return null
    
    const sortedAssignments = [...currentPoule.assignments].sort((a, b) => a.position - b.position)
    const currentRowIndex = sortedAssignments.findIndex(a => a.athleteId === currentAthleteId)
    const currentColIndex = sortedAssignments.findIndex(a => a.athleteId === currentOpponentId)
    
    // Check if we're at boundaries and should stay in place
    const isTopLeftCorner = (currentRowIndex === 0 && currentColIndex === 1)
    const isLeftTopCorner = (currentRowIndex === 1 && currentColIndex === 0)
    const isLastEditableCell = (currentRowIndex === sortedAssignments.length - 1 && currentColIndex === sortedAssignments.length - 2)
    
    // Stay in place at specific boundaries for specific directions
    if (isTopLeftCorner && (direction === 'up' || direction === 'left')) {
      return null
    }
    if (isLeftTopCorner && direction === 'up') {
      return null
      // Note: left arrow from (1,0) should wrap to previous row, so we don't block it
    }
    if (isLastEditableCell && (direction === 'down' || direction === 'right')) {
      return null
    }
    
    let newRowIndex = currentRowIndex
    let newColIndex = currentColIndex
    
    switch (direction) {
      case 'up':
        newRowIndex = currentRowIndex - 1
        break
      case 'down':
        newRowIndex = currentRowIndex + 1
        break
      case 'left':
        // Special case: if at first column, jump to last column of previous row
        if (currentColIndex === 0) {
          newRowIndex = currentRowIndex - 1
          newColIndex = sortedAssignments.length - 1
        } else {
          newColIndex = currentColIndex - 1
        }
        break
      case 'right':
        // Special case: if at end of row, jump to first column of next row
        if (currentColIndex === sortedAssignments.length - 1) {
          newRowIndex = currentRowIndex + 1
          newColIndex = 0
        } else {
          newColIndex = currentColIndex + 1
        }
        break
    }
    
    // Check bounds
    if (newRowIndex < 0 || newRowIndex >= sortedAssignments.length || 
        newColIndex < 0 || newColIndex >= sortedAssignments.length) {
      return null
    }
    
    // Skip diagonal cells
    if (newRowIndex === newColIndex) {
      // Try to move one more step in the same direction
      switch (direction) {
        case 'up':
          newRowIndex = newRowIndex - 1
          break
        case 'down':
          newRowIndex = newRowIndex + 1
          break
        case 'left':
          // For left arrow, if we hit diagonal after jumping to previous row, move to previous column
          if (currentColIndex === 0) {
            // We just jumped to previous row and hit diagonal, move to column length-2
            newColIndex = sortedAssignments.length - 2
          } else {
            newColIndex = newColIndex - 1
          }
          break
        case 'right':
          // For right arrow, if we hit diagonal after jumping to next row, move to next column
          if (currentColIndex === sortedAssignments.length - 1) {
            // We just jumped to next row and hit diagonal, move to column 1
            newColIndex = 1
          } else {
            newColIndex = newColIndex + 1
          }
          break
      }
    }
    
    // Final bounds check after diagonal skip
    if (newRowIndex < 0 || newRowIndex >= sortedAssignments.length || 
        newColIndex < 0 || newColIndex >= sortedAssignments.length) {
      return null
    }
    
    // Final diagonal check
    if (newRowIndex === newColIndex) {
      return null
    }
    
    return {
      pouleId,
      athleteAId: sortedAssignments[newRowIndex].athleteId,
      athleteBId: sortedAssignments[newColIndex].athleteId
    }
  }

  const handleArrowNavigation = (pouleId: string, athleteAId: string, athleteBId: string, direction: 'up' | 'down' | 'left' | 'right') => {
    const nextCell = findAdjacentCell(pouleId, athleteAId, athleteBId, direction)
    if (nextCell) {
      setEditingCell(nextCell)
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
                              defaultValue={getMatchScore(poule, assignment.athleteId, opponentAssignment.athleteId)?.toString() || ''}
                              onFocus={(e) => e.target.select()}
                              onBlur={() => setEditingCell(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  setEditingCell(null)
                                } else if (e.key === 'Escape') {
                                  setEditingCell(null)
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault()
                                  handleArrowNavigation(poule.id, assignment.athleteId, opponentAssignment.athleteId, 'up')
                                } else if (e.key === 'ArrowDown') {
                                  e.preventDefault()
                                  handleArrowNavigation(poule.id, assignment.athleteId, opponentAssignment.athleteId, 'down')
                                } else if (e.key === 'ArrowLeft') {
                                  e.preventDefault()
                                  handleArrowNavigation(poule.id, assignment.athleteId, opponentAssignment.athleteId, 'left')
                                } else if (e.key === 'ArrowRight') {
                                  e.preventDefault()
                                  handleArrowNavigation(poule.id, assignment.athleteId, opponentAssignment.athleteId, 'right')
                                }
                              }}
                              className="w-full h-6 text-center border-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-yellow-100"
                              autoFocus
                            />
                          ) : (
                            // View mode - clickable score cell
                            <div 
                              className="min-h-[24px] flex items-center justify-center cursor-pointer hover:bg-gray-100"
                              onClick={() => handleCellClick(poule.id, assignment.athleteId, opponentAssignment.athleteId)}
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