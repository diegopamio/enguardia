'use client'

import { usePoules } from '@/hooks/usePoules'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface MatchResultsProps {
  competitionId: string
  competitionName: string
}

export default function MatchResults({ competitionId, competitionName }: MatchResultsProps) {
  const { poules, loading, error, refetch } = usePoules(competitionId)

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading match data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">{error}</div>
        <Button onClick={refetch}>
          Try Again
        </Button>
      </div>
    )
  }

  if (poules.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-600 mb-4">No matches available yet.</div>
        <p className="text-sm text-gray-500">
          Matches will appear here once poules have been generated.
        </p>
      </div>
    )
  }

  // Calculate total matches for all poules
  const totalMatches = poules.reduce((total, poule) => {
    const n = poule.assignments.length
    return total + (n * (n - 1)) / 2 // Round-robin formula
  }, 0)

  // Group poules by phase
  const poulesByPhase = poules.reduce((acc, poule) => {
    const phaseId = poule.phaseId
    if (!acc[phaseId]) {
      acc[phaseId] = {
        phase: poule.phase,
        poules: []
      }
    }
    acc[phaseId].poules.push(poule)
    return acc
  }, {} as Record<string, { phase: any, poules: any[] }>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Match Results</h2>
          <p className="text-sm text-gray-600">
            {poules.length} poule(s) • {totalMatches} total matches
          </p>
        </div>
        <Button onClick={refetch} variant="outline">
          🔄 Refresh
        </Button>
      </div>

      {/* Phases and Match Lists */}
      {Object.entries(poulesByPhase).map(([phaseId, { phase, poules: phasePoules }]) => (
        <div key={phaseId} className="space-y-4">
          <div className="border-b border-gray-200 pb-2">
            <h3 className="text-lg font-semibold text-gray-900">{phase.name}</h3>
            <p className="text-sm text-gray-600">{phase.phaseType}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {phasePoules.map((poule) => {
              const assignments = poule.assignments.sort((a: any, b: any) => a.position - b.position)
              const matches = []
              
              // Generate all possible matches for this poule (round-robin)
              for (let i = 0; i < assignments.length; i++) {
                for (let j = i + 1; j < assignments.length; j++) {
                  matches.push({
                    id: `${poule.id}-${i}-${j}`,
                    athlete1: assignments[i].athlete,
                    athlete2: assignments[j].athlete,
                    position1: assignments[i].position,
                    position2: assignments[j].position
                  })
                }
              }

              return (
                <Card key={poule.id} className="p-4">
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900">{poule.name}</h4>
                    <p className="text-sm text-gray-600">{matches.length} matches</p>
                  </div>

                  <div className="space-y-3">
                    {matches.map((match) => (
                      <div key={match.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4">
                              <div className="text-sm">
                                <div className="font-medium">
                                  {match.athlete1.lastName}, {match.athlete1.firstName}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Position #{match.position1}
                                </div>
                              </div>
                              
                              <div className="text-gray-400 font-bold">vs</div>
                              
                              <div className="text-sm">
                                <div className="font-medium">
                                  {match.athlete2.lastName}, {match.athlete2.firstName}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Position #{match.position2}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 ml-4">
                            {/* Score inputs - placeholder for future implementation */}
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                min="0"
                                max="15"
                                className="w-12 h-8 text-center border border-gray-300 rounded text-sm"
                                placeholder="0"
                                disabled
                              />
                              <span className="text-gray-400">-</span>
                              <input
                                type="number"
                                min="0"
                                max="15"
                                className="w-12 h-8 text-center border border-gray-300 rounded text-sm"
                                placeholder="0"
                                disabled
                              />
                            </div>
                            <Button size="sm" variant="outline" disabled>
                              Save
                            </Button>
                          </div>
                        </div>

                        <div className="mt-2 text-xs text-gray-500">
                          Status: <span className="text-orange-600">Pending</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      ))}

      {/* Note about future functionality */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <div className="text-blue-600">ℹ️</div>
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-1">Match Results Entry - Coming Soon</div>
            <p>
              This interface will allow referees and tournament organizers to enter match results in real-time. 
              Features will include score validation, automatic rankings, and live leaderboards.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 