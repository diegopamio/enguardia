'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useRoleCheck } from '@/lib/auth-client'
import { notify } from '@/lib/notifications'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { FormulaEngine } from '@/lib/tournament/FormulaEngine'
import { useCompetitionRegistrations } from '@/hooks/useCompetitionRegistrations'

interface Competition {
  id: string
  name: string
  weapon: 'EPEE' | 'FOIL' | 'SABRE'
  category: string
  status: 'DRAFT' | 'REGISTRATION_OPEN' | 'REGISTRATION_CLOSED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
}

interface TournamentGenerationProps {
  tournamentId: string
  tournamentName: string
  competition: Competition
  onBack: () => void
  onSuccess?: () => void
}

export default function TournamentGeneration({
  tournamentId,
  tournamentName,
  competition,
  onBack,
  onSuccess
}: TournamentGenerationProps) {
  const router = useRouter()
  const { isSystemAdmin, isOrganizationAdmin } = useRoleCheck()
  
  // State management
  const [phases, setPhases] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedData, setGeneratedData] = useState<any>(null)
  const [currentStep, setCurrentStep] = useState<'review' | 'generate' | 'complete'>('review')
  const [separationError, setSeparationError] = useState<string | null>(null)

  // Load registration data
  const { data: registrationsData, isLoading: loadingRegistrations } = useCompetitionRegistrations(competition.id)
  const totalAthletes = registrationsData?.registrations?.length || 0
  const presentAthletes = registrationsData?.registrations?.filter((r: any) => r.isPresent)?.length || 0

  // Permission check
  const canStartCompetition = isSystemAdmin() || isOrganizationAdmin()

      useEffect(() => {
      if (!canStartCompetition) {
        notify.error('You do not have permission to start competitions')
        onBack()
      }
    }, [canStartCompetition, onBack])

  // Load phase configuration
  useEffect(() => {
    const loadPhases = async () => {
      try {
        const response = await fetch(`/api/competitions/${competition.id}/phases`)
        if (response.ok) {
          const { phases } = await response.json()
          setPhases(phases)
        } else {
          throw new Error('Failed to load phase configuration')
        }
      } catch (error) {
        console.error('Error loading phases:', error)
        notify.error('Failed to load tournament configuration')
      } finally {
        setIsLoading(false)
      }
    }

    if (competition.id) {
      loadPhases()
    }
  }, [competition.id])

      // Start competition and generate structure
  const handleStartCompetition = async () => {
    if (presentAthletes === 0) {
      notify.error('No athletes are marked as present. Please track attendance first.')
      return
    }

    if (phases.length === 0) {
      notify.error('No tournament formula configured. Please configure the formula first.')
      return
    }

    setIsGenerating(true)
    setSeparationError(null) // Clear any previous error
    
    try {
      // Initialize FormulaEngine
      const engine = new FormulaEngine({
        strictSeparation: true,
        allowIncompletePoules: false,
        optimizeForBalance: true
      })

             // Prepare athlete data in FormulaEngine format
       console.log('DEBUG: Registration data structure:', JSON.stringify(registrationsData?.registrations?.[0], null, 2))
       
       const athleteData = registrationsData?.registrations
         ?.filter((r: any) => r.isPresent)
         ?.map((registration: any) => {
           // Handle club data more robustly
           let clubData = undefined
           
           // Try different possible data structures
           if (registration.athlete.affiliations && registration.athlete.affiliations.length > 0) {
             const primaryClub = registration.athlete.affiliations.find((a: any) => a.isPrimary) || registration.athlete.affiliations[0]
             clubData = {
               id: primaryClub.club.id,
               name: primaryClub.club.name,
               country: primaryClub.club.country || 'Unknown'
             }
           } else if (registration.athlete.clubs && registration.athlete.clubs.length > 0) {
             // Fallback to clubs array
             const club = registration.athlete.clubs[0]
             clubData = {
               id: club.id,
               name: club.name,
               country: club.country || 'Unknown'
             }
           }
           
           const athleteInfo = {
             id: registration.athlete.id,
             firstName: registration.athlete.firstName,
             lastName: registration.athlete.lastName,
             nationality: registration.athlete.nationality || 'Unknown',
             club: clubData,
             weapon: competition.weapon
           }
           
           console.log('DEBUG: Mapped athlete:', athleteInfo)
           return athleteInfo
         }) || []

              console.log('Starting competition with data:', { phases, athleteData })

      const generated: any = {
        poules: [],
        brackets: [],
        phases: phases.map(phase => ({ ...phase, status: 'SCHEDULED' }))
      }

      // Generate poules for each POULE phase
      for (const phase of phases) {
        if (phase.phaseType === 'POULE') {
          console.log('Generating poules for phase:', phase.name)
          
          // Convert phase configuration to FormulaEngine format
          const phaseConfig = {
            id: phase.id,
            name: phase.name,
            phaseType: phase.phaseType,
            sequenceOrder: phase.sequenceOrder,
            pouleSizeVariations: {
              method: 'optimal' as const,
              minSize: 5,
              maxSize: 7
            },
            separationRules: {
              club: true,
              country: true,
              maxSameClub: 2,
              maxSameCountry: 4
            }
          }

          try {
            const pouleResult = await engine.generatePoules(phaseConfig, athleteData)
            
            generated.poules.push({
              phaseId: phase.id,
              phaseName: phase.name,
              poules: pouleResult.poules,
              statistics: pouleResult.statistics
            })

            console.log('Generated poules:', pouleResult)
          } catch (pouleError) {
            // Check if this is a separation rule error
            if (pouleError instanceof Error && pouleError.message.includes('Cannot assign athlete') && pouleError.message.includes('separation rules')) {
              setSeparationError(pouleError.message)
              setIsGenerating(false)
              return
            }
            // Re-throw other errors
            throw pouleError
          }
        }
      }

             // Generate brackets for each DIRECT_ELIMINATION phase
       for (const phase of phases) {
         if (phase.phaseType === 'DIRECT_ELIMINATION') {
           console.log('Generating brackets for phase:', phase.name)
           
           // Convert bracket configurations
           const bracketConfigs = phase.bracketConfigs || []
           for (const bracketConfig of bracketConfigs) {
             // Create a simple bracket structure for now
             // TODO: Implement proper bracket generation algorithm
             const bracketSize = bracketConfig.size || 32
             const qualifiedAthletes = athleteData.slice(0, Math.min(bracketSize, athleteData.length))
             
             generated.brackets.push({
               phaseId: phase.id,
               phaseName: phase.name,
               bracketType: bracketConfig.bracketType,
               bracket: {
                 id: `bracket-${phase.id}-${bracketConfig.bracketType}`,
                 size: bracketSize,
                 type: bracketConfig.bracketType,
                 seedingMethod: bracketConfig.seedingMethod,
                 athletes: qualifiedAthletes
               },
               matches: [] // TODO: Generate actual matches
             })

             console.log('Generated bracket placeholder for:', phase.name, bracketConfig.bracketType)
           }
         }
       }

      setGeneratedData(generated)
      setCurrentStep('generate')
      notify.success('Tournament structure generated successfully!')

    } catch (error) {
      console.error('Error starting competition:', error)
      
      // Don't show notification error if separation error was already caught and handled
      if (!separationError) {
        notify.error(error instanceof Error ? error.message : 'Failed to start competition')
      }
    } finally {
      setIsGenerating(false)
    }
  }

  // Save generated tournament to database
  // Handle separation error solutions
  const handleRetryWithoutStrictSeparation = async () => {
    setSeparationError(null)
    setIsGenerating(true)
    
    try {
      // Retry with strict separation disabled
      const engine = new FormulaEngine({ strictSeparation: false })
      
      const athleteData = registrationsData?.registrations
        ?.filter((r: any) => r.isPresent)
        ?.map((registration: any) => {
          // Handle club data more robustly
          let clubData = undefined
          
          // Try different possible data structures
          if (registration.athlete.affiliations && registration.athlete.affiliations.length > 0) {
            const primaryClub = registration.athlete.affiliations.find((a: any) => a.isPrimary) || registration.athlete.affiliations[0]
            clubData = {
              id: primaryClub.club.id,
              name: primaryClub.club.name,
              country: primaryClub.club.country || 'Unknown'
            }
          } else if (registration.athlete.clubs && registration.athlete.clubs.length > 0) {
            // Fallback to clubs array
            const club = registration.athlete.clubs[0]
            clubData = {
              id: club.id,
              name: club.name,
              country: club.country || 'Unknown'
            }
          }
          
          return {
            id: registration.athlete.id,
            firstName: registration.athlete.firstName,
            lastName: registration.athlete.lastName,
            nationality: registration.athlete.nationality || 'Unknown',
            club: clubData,
            weapon: competition.weapon
          }
        }) || []

      const generated: any = {
        poules: [],
        brackets: [],
        phases: phases.map(phase => ({ ...phase, status: 'SCHEDULED' }))
      }

      // Generate structure for each phase
      for (const phase of phases) {
        if (phase.phaseType === 'POULE') {
          console.log('Generating poules for phase:', phase.name)
          const result = await engine.generatePoules(phase, athleteData)
          generated.poules.push({
            phaseId: phase.id,
            phaseName: phase.name,
            poules: result.poules,
            statistics: result.statistics
          })
          console.log(`Generated ${result.poules.length} poules for phase ${phase.name}`)
        } else if (phase.phaseType === 'ELIMINATION') {
          // Generate elimination bracket placeholder
          for (const bracketConfig of phase.bracketConfigs || []) {
            generated.brackets.push({
              phaseId: phase.id,
              phaseName: phase.name,
              bracketType: bracketConfig.bracketType,
              size: bracketConfig.size,
              placeholder: true
            })
            console.log('Generated bracket placeholder for:', phase.name, bracketConfig.bracketType)
          }
        }
      }

      setGeneratedData(generated)
      setCurrentStep('generate')
      notify.success('Tournament structure generated successfully (with relaxed separation rules)!')

    } catch (error) {
      console.error('Error with relaxed separation:', error)
      notify.error(error instanceof Error ? error.message : 'Failed to generate tournament structure')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGoToConfiguration = () => {
    setSeparationError(null)
    onBack()
  }

  const handleSaveTournament = async () => {
    if (!generatedData) return

    setIsGenerating(true)
    try {
      // Save generated poules and brackets to database
      const response = await fetch(`/api/competitions/${competition.id}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          poules: generatedData.poules,
          brackets: generatedData.brackets,
          phases: generatedData.phases
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save tournament')
      }

      setCurrentStep('complete')
      notify.success('Tournament generated and saved successfully!')

    } catch (error) {
      console.error('Error saving tournament:', error)
      notify.error(error instanceof Error ? error.message : 'Failed to save tournament')
    } finally {
      setIsGenerating(false)
    }
  }

  const getPhaseIcon = (phaseType: string) => {
    switch (phaseType) {
      case 'POULE': return '⚔️'
      case 'DIRECT_ELIMINATION': return '🏆'
      case 'CLASSIFICATION': return '🥉'
      case 'REPECHAGE': return '🔄'
      default: return '📋'
    }
  }

  const getPhaseDescription = (phase: any) => {
    if (phase.phaseType === 'POULE') {
      const rounds = phase.configuration?.rounds || []
      return `${rounds.length} round${rounds.length !== 1 ? 's' : ''} of poules`
    }
    if (phase.phaseType === 'DIRECT_ELIMINATION') {
      const brackets = phase.bracketConfigs || []
      return `${brackets.length} elimination bracket${brackets.length !== 1 ? 's' : ''}`
    }
    return 'Tournament phase'
  }

  if (!canStartCompetition) {
    return null
  }

  if (isLoading || loadingRegistrations) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Start Competition: {competition.name}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Create poules and brackets from your configured formula
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {presentAthletes} Present
          </Badge>
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            {totalAthletes} Total
          </Badge>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center space-x-8 py-4">
        {[
          { key: 'review', label: 'Review Configuration', icon: '📋' },
          { key: 'generate', label: 'Generate Structure', icon: '⚙️' },
          { key: 'complete', label: 'Save & Launch', icon: '🚀' }
        ].map((step, index) => (
          <div key={step.key} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              currentStep === step.key 
                ? 'bg-blue-600 text-white' 
                : index < ['review', 'generate', 'complete'].indexOf(currentStep)
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}>
              {step.icon}
            </div>
            <span className={`ml-2 text-sm font-medium ${
              currentStep === step.key ? 'text-blue-600' : 'text-gray-500'
            }`}>
              {step.label}
            </span>
            {index < 2 && (
              <div className={`w-16 h-0.5 ml-4 ${
                index < ['review', 'generate', 'complete'].indexOf(currentStep)
                  ? 'bg-green-600'
                  : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      {currentStep === 'review' && (
        <div className="space-y-6">
          {/* Athletes Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                👥 Athletes Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{totalAthletes}</div>
                  <div className="text-sm text-gray-600">Total Registered</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{presentAthletes}</div>
                  <div className="text-sm text-gray-600">Present</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{totalAthletes - presentAthletes}</div>
                  <div className="text-sm text-gray-600">Absent</div>
                </div>
              </div>
              
              {presentAthletes === 0 && (
                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-800">
                    ⚠️ No athletes are marked as present. Please track attendance before generating the tournament.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Phase Configuration Review */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                📋 Tournament Formula
              </CardTitle>
            </CardHeader>
            <CardContent>
              {phases.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No tournament formula configured</p>
                  <Button
                    onClick={() => router.push(`/tournaments/${tournamentId}/competitions/${competition.id}/configure`)}
                    variant="outline"
                  >
                    Configure Formula
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {phases
                    .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
                    .map((phase, index) => (
                    <div key={phase.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{getPhaseIcon(phase.phaseType)}</span>
                        <div>
                          <div className="font-medium text-gray-900">{phase.name}</div>
                          <div className="text-sm text-gray-600">{getPhaseDescription(phase)}</div>
                        </div>
                      </div>
                      <Badge variant="outline">
                        Step {index + 1}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <Button
              onClick={onBack}
              variant="outline"
            >
              ← Back to Competition
            </Button>
            <Button
                              onClick={handleStartCompetition}
              disabled={presentAthletes === 0 || phases.length === 0 || isGenerating}
              className="bg-blue-600 hover:bg-blue-700"
            >
                              {isGenerating ? 'Launching...' : 'Launch Competition'}
            </Button>
          </div>
        </div>
      )}

      {currentStep === 'generate' && generatedData && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-green-600">
                ✅ Tournament Structure Generated
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Generated Poules */}
                {generatedData.poules && Array.isArray(generatedData.poules) && generatedData.poules.map((pouleData: any) => (
                  <div key={pouleData.phaseId} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">{pouleData.phaseName}</h4>
                    <div className="text-sm text-gray-600">
                      Generated {pouleData.poules.length} poules with {pouleData.statistics?.totalMatches || 0} total matches
                    </div>
                  </div>
                ))}

                {/* Generated Brackets */}
                {generatedData.brackets && Array.isArray(generatedData.brackets) && generatedData.brackets.map((bracketData: any) => (
                  <div key={`${bracketData.phaseId}-${bracketData.bracketType}`} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">
                      {bracketData.phaseName} - {bracketData.bracketType}
                    </h4>
                    <div className="text-sm text-gray-600">
                      Generated {bracketData.bracket?.size || 0} position bracket with {bracketData.matches?.length || 0} matches
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <Button
              onClick={() => setCurrentStep('review')}
              variant="outline"
            >
              ← Back to Review
            </Button>
            <Button
              onClick={handleSaveTournament}
              disabled={isGenerating}
              className="bg-green-600 hover:bg-green-700"
            >
                              {isGenerating ? 'Saving...' : 'Save & Launch Competition'}
            </Button>
          </div>
        </div>
      )}

      {currentStep === 'complete' && (
        <div className="py-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Competition Started Successfully!
            </h3>
            <p className="text-gray-600 mb-2">
              The competition is now <span className="font-medium text-green-600">IN PROGRESS</span> and ready for matches.
            </p>
          </div>

          {/* Success Summary */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h4 className="font-medium text-green-900 mb-4">✅ Competition Structure Generated</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {generatedData?.poules && generatedData.poules.length > 0 && (
                <div>
                  <div className="font-medium text-green-800">Poules Created:</div>
                  {generatedData.poules.map((pouleData: any) => (
                    <div key={pouleData.phaseId} className="text-green-700 ml-2">
                      • {pouleData.phaseName}: {pouleData.poules.length} poules, {pouleData.statistics.totalMatches} matches
                    </div>
                  ))}
                </div>
              )}
              
              {generatedData?.brackets && generatedData.brackets.length > 0 && (
                <div>
                  <div className="font-medium text-green-800">Brackets Created:</div>
                  {generatedData.brackets.map((bracketData: any) => (
                    <div key={`${bracketData.phaseId}-${bracketData.bracketType}`} className="text-green-700 ml-2">
                      • {bracketData.phaseName}: {bracketData.bracketType} ({bracketData.bracket.size} athletes)
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h4 className="font-medium text-blue-900 mb-3">🚀 What's Next?</h4>
            <ul className="text-sm text-blue-800 space-y-2">
              <li>• Athletes have been assigned to their poules</li>
              <li>• Match schedules are ready to be distributed</li>
              <li>• Referees can start conducting matches</li>
              <li>• Results can be entered as matches are completed</li>
            </ul>
          </div>

          <div className="flex justify-center space-x-4">
            <Button
              onClick={() => router.push(`/competitions/${competition.id}`)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Manage Live Competition
            </Button>
            <Button
              onClick={onBack}
              variant="outline"
            >
              Back to Tournament
            </Button>
          </div>
        </div>
      )}

      {/* Separation Error Modal */}
      <Dialog open={!!separationError} onOpenChange={() => setSeparationError(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <span className="text-red-600">⚠️</span>
                Athlete Assignment Problem
              </div>
            </DialogTitle>
            <DialogDescription>
              {separationError}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">What does this mean?</h4>
              <p className="text-blue-800 text-sm">
                The current poule configuration and separation rules (preventing athletes from the same club or country 
                from being in the same poule) conflict with the number of athletes present. This typically happens when:
              </p>
              <ul className="text-blue-800 text-sm mt-2 list-disc list-inside space-y-1">
                <li>Too many athletes from the same club/country for the number of poules</li>
                <li>Poule sizes are too small to accommodate the separation requirements</li>
                <li>The separation rules are too strict for the current athlete distribution</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">How would you like to resolve this?</h4>
              
              <div className="grid gap-3">
                <Button
                  onClick={handleRetryWithoutStrictSeparation}
                  disabled={isGenerating}
                  className="bg-orange-600 hover:bg-orange-700 text-white text-left h-auto p-4"
                >
                  <div>
                    <div className="font-medium">Allow Some Separation Violations</div>
                    <div className="text-sm opacity-90">
                      Relax the separation rules and allow some athletes from the same club/country 
                      to be in the same poule when necessary
                    </div>
                  </div>
                </Button>

                <Button
                  onClick={handleGoToConfiguration}
                  variant="outline"
                  className="text-left h-auto p-4"
                >
                  <div>
                    <div className="font-medium">Adjust Poule Configuration</div>
                    <div className="text-sm text-gray-600">
                      Go back to modify the poule setup (increase poule sizes, add more poules, 
                      or adjust separation rules)
                    </div>
                  </div>
                </Button>

                <Button
                  onClick={() => setSeparationError(null)}
                  variant="outline"
                  className="text-gray-600"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 