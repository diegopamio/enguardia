'use client'

import { usePoules, type Poule } from '@/hooks/usePoules'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface PouleViewProps {
  competitionId: string
  competitionName: string
  weapon: string
  tournamentId?: string
}

export default function PouleView({ competitionId, competitionName, weapon, tournamentId }: PouleViewProps) {
  const { poules, loading, error } = usePoules(competitionId)

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading poules...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">{error}</div>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    )
  }

  const safePoules = Array.isArray(poules) ? poules : []
  
  if (safePoules.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-600 mb-4">No poules have been generated yet.</div>
        <p className="text-sm text-gray-500 mb-6">
          Generate poules to start the competition based on your configured formula.
        </p>
        <Button 
          onClick={() => {
            if (tournamentId) {
              window.location.href = `/tournaments/${tournamentId}/competitions/${competitionId}`
            } else {
              // Fallback - try to parse from current URL
              const pathParts = window.location.pathname.split('/')
              const tournamentIndex = pathParts.indexOf('tournaments')
              if (tournamentIndex !== -1 && pathParts[tournamentIndex + 1]) {
                window.location.href = `/tournaments/${pathParts[tournamentIndex + 1]}/competitions/${competitionId}`
              } else {
                alert('Please go back to the tournament management page to generate poules.')
              }
            }
          }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Configure & Generate Poules
        </Button>
      </div>
    )
  }

  const handlePrint = () => {
    window.print()
  }

  // Group poules by phase
  const poulesByPhase = safePoules.reduce((acc, poule) => {
    const phaseId = poule.phaseId
    if (!acc[phaseId]) {
      acc[phaseId] = {
        phase: poule.phase,
        poules: []
      }
    }
    acc[phaseId].poules.push(poule)
    return acc
  }, {} as Record<string, { phase: any, poules: Poule[] }>)

  return (
    <div className="space-y-6">
      {/* Print Controls */}
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h2 className="text-lg font-semibold">Competition Poules</h2>
          <p className="text-sm text-gray-600">
            {Object.keys(poulesByPhase).length} phase(s), {safePoules.length} total poules
          </p>
        </div>
        <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
          🖨️ Print Poules
        </Button>
      </div>

      {/* Printable Content */}
      <div className="print:shadow-none">
        {/* Print Header */}
        <div className="hidden print:block mb-6 text-center border-b-2 border-gray-300 pb-4">
          <h1 className="text-2xl font-bold">{competitionName}</h1>
          <h2 className="text-xl text-gray-700">{weapon} - Competition Poules</h2>
          <p className="text-sm text-gray-600 mt-2">
            Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
          </p>
        </div>

        {/* Phases and Poules */}
        {Object.entries(poulesByPhase).map(([phaseId, { phase, poules: phasePoules }]) => (
          <div key={phaseId} className="mb-8 print:break-before-page">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900">{phase.name}</h3>
              <p className="text-sm text-gray-600">{phase.phaseType} • {phasePoules.length} poule(s)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-2">
              {phasePoules.map((poule) => (
                <Card key={poule.id} className="p-4 border-2 border-gray-300 print:border-black print:shadow-none">
                  <div className="mb-3">
                    <h4 className="font-bold text-lg">{poule.name}</h4>
                    <p className="text-sm text-gray-600">{poule.assignments.length} fencers</p>
                  </div>
                  
                  <div className="space-y-2">
                    {poule.assignments
                      .sort((a, b) => a.position - b.position)
                      .map((assignment) => {
                        const primaryClub = assignment.athlete.clubs.find(c => c.status === 'ACTIVE')
                        return (
                          <div key={assignment.id} className="flex items-center justify-between text-sm border-b border-gray-200 pb-1">
                            <div className="flex-1">
                              <div className="font-medium">
                                {assignment.athlete.lastName}, {assignment.athlete.firstName}
                              </div>
                              {primaryClub && (
                                <div className="text-xs text-gray-600">
                                  {primaryClub.club.name} ({primaryClub.club.country})
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 ml-2">
                              #{assignment.position}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                  
                  {/* Match Results Grid */}
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <div className="text-xs font-medium text-gray-700 mb-2">Results Grid:</div>
                    <div className="text-xs text-gray-500">
                      {/* Simple grid placeholder for manual results */}
                      <div className="grid grid-cols-4 gap-1 text-center">
                        {[...Array(Math.min(4, poule.assignments.length))].map((_, i) => (
                          <div key={i} className="border border-gray-300 h-6 flex items-center justify-center">
                            {i + 1}
                          </div>
                        ))}
                      </div>
                      <div className="mt-1 text-center">
                        Wins: ___ | Rank: ___
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Print CSS */}
      <style jsx>{`
        @media print {
          body * {
            visibility: hidden;
          }
          
          .print\\:block,
          .print\\:block * {
            visibility: visible;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:break-before-page {
            break-before: page;
          }
          
          .print\\:grid-cols-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          
          .print\\:border-black {
            border-color: black !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  )
} 