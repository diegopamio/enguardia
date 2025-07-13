'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRoleCheck } from '@/lib/auth-client'
import { notify } from '@/lib/notifications'
import PouleConfiguration, { type PouleConfigurationData } from './PouleConfiguration'
import { useCompetitionRegistrations } from '@/hooks/useCompetitionRegistrations'
import PresetSelector from './PresetSelector'
import { FormulaTemplate } from '@/lib/tournament/types'
import { createTournamentFromPreset } from '@/lib/tournament/presets'

interface Competition {
  id: string
  name: string
  weapon: string
  category: string
  status: string
  tournamentId: string
  _count?: {
    registrations: number
  }
}

interface TournamentFormulaSetupProps {
  tournamentId: string
  tournamentName: string
  competition: Competition
  onBack: () => void
  onSuccess?: () => void
}

export default function TournamentFormulaSetup({
  tournamentId,
  tournamentName,
  competition,
  onBack,
  onSuccess
}: TournamentFormulaSetupProps) {
  const router = useRouter()
  const { isSystemAdmin, isOrganizationAdmin } = useRoleCheck()
  
  // State management
  const [currentStep, setCurrentStep] = useState<'preset' | 'poule' | 'elimination' | 'review'>('preset')
  const [selectedPreset, setSelectedPreset] = useState<FormulaTemplate | null>(null)
  const [pouleConfig, setPouleConfig] = useState<PouleConfigurationData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showPresetSelector, setShowPresetSelector] = useState(false)

  // Get competition registrations to determine total athletes
  const { data: registrationsData } = useCompetitionRegistrations(competition.id)
  const totalAthletes = registrationsData?.registrations?.length || 0

  // Permission check
  const canConfigureFormula = isSystemAdmin() || isOrganizationAdmin()

  useEffect(() => {
    if (!canConfigureFormula) {
      notify.error('You do not have permission to configure tournament formulas')
      onBack()
    }
  }, [canConfigureFormula, onBack])

  // Handle preset selection
  const handlePresetSelect = (preset: FormulaTemplate) => {
    setSelectedPreset(preset)
    
    // Create tournament configuration from preset
    const tournamentConfig = createTournamentFromPreset(preset, {
      weapon: competition.weapon as any,
      category: competition.category,
      totalAthletes
    })
    
    // Extract poule configuration from all poule phases
    const poulePhases = tournamentConfig.phases.filter(p => p.phaseType === 'POULE')
    if (poulePhases.length > 0) {
      // For now, use the first poule phase but store all phases for later
      const firstPoulePhase = poulePhases[0]
      const pouleConfigData: PouleConfigurationData = {
        numberOfPoules: Math.ceil(totalAthletes / (firstPoulePhase.pouleSizeVariations?.sizes?.[0] || 7)),
        athletesPerPoule: firstPoulePhase.pouleSizeVariations?.sizes?.[0] || 7,
        enableClubSeparation: firstPoulePhase.separationRules?.club || true,
        enableCountrySeparation: firstPoulePhase.separationRules?.country || true,
        maxSameClubPerPoule: firstPoulePhase.separationRules?.maxSameClub || 2,
        maxSameCountryPerPoule: firstPoulePhase.separationRules?.maxSameCountry || 4,
        seedingMethod: 'RANKING',
        allowIncompletePoules: false,
        minPouleSizeForIncomplete: 4,
        // Store additional preset information
        _presetPhases: poulePhases,
        _selectedPreset: preset
      }
      setPouleConfig(pouleConfigData)
    }
    
    // Always go to poule step first when a preset is selected
    setCurrentStep('poule')
    setShowPresetSelector(false)
    
    notify.success(`Applied formula: ${preset.name}`)
  }

  // Handle poule configuration changes
  const handlePouleConfigChange = (config: PouleConfigurationData) => {
    setPouleConfig(config)
  }

  // Save poule configuration
  const handleSavePouleConfig = async (config: PouleConfigurationData) => {
    setIsSaving(true)
    try {
      // TODO: Implement API call to save poule configuration
      // This will need to create a Phase with phaseType: 'POULE' and store configuration
      console.log('Saving poule configuration:', config)
      
      // For now, just store locally and move to next step
      setPouleConfig(config)
      setCurrentStep('elimination')
      
      notify.success('Poule configuration saved successfully')
    } catch (error) {
      console.error('Error saving poule configuration:', error)
      notify.error('Failed to save poule configuration')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle final save
  const handleFinalSave = async () => {
    if (!pouleConfig) {
      notify.error('Please configure poule settings first')
      return
    }

    setIsSaving(true)
    try {
      // TODO: Implement complete formula save
      console.log('Saving complete formula configuration:', { 
        selectedPreset: selectedPreset?.name,
        pouleConfig 
      })
      
      notify.success('Tournament formula configured successfully')
      
      if (onSuccess) {
        onSuccess()
      } else {
        onBack()
      }
    } catch (error) {
      console.error('Error saving tournament formula:', error)
      notify.error('Failed to save tournament formula')
    } finally {
      setIsSaving(false)
    }
  }

  // Step navigation
  const steps = [
    { key: 'preset', label: 'Select Formula', icon: '📋' },
    { key: 'poule', label: 'Poule Configuration', icon: '⚔️' },
    { key: 'elimination', label: 'Direct Elimination', icon: '🏆' },
    { key: 'review', label: 'Review & Save', icon: '✅' }
  ]

  const currentStepIndex = steps.findIndex(step => step.key === currentStep)

  if (!canConfigureFormula) {
    return null
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tournament Formula Setup</h1>
            <p className="text-gray-600 mt-1">
              Configure the tournament format for <span className="font-medium">{competition.name}</span>
            </p>
            <p className="text-sm text-gray-500">
              {tournamentName} • {competition.weapon} {competition.category}
            </p>
            {selectedPreset && (
              <p className="text-sm text-blue-600 mt-1">
                Using formula: <span className="font-medium">{selectedPreset.name}</span>
              </p>
            )}
          </div>
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            disabled={isSaving}
          >
            ×
          </button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.key} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                index <= currentStepIndex 
                  ? 'bg-blue-600 border-blue-600 text-white' 
                  : 'border-gray-300 text-gray-400'
              }`}>
                {index < currentStepIndex ? '✓' : step.icon}
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${
                  index <= currentStepIndex ? 'text-blue-600' : 'text-gray-400'
                }`}>
                  {step.label}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 mx-4 h-0.5 ${
                  index < currentStepIndex ? 'bg-blue-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Competition Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Competition:</span>
            <span className="font-medium ml-2">{competition.name}</span>
          </div>
          <div>
            <span className="text-gray-600">Weapon:</span>
            <span className="font-medium ml-2">{competition.weapon}</span>
          </div>
          <div>
            <span className="text-gray-600">Category:</span>
            <span className="font-medium ml-2">{competition.category}</span>
          </div>
          <div>
            <span className="text-gray-600">Registered Athletes:</span>
            <span className="font-medium ml-2">{totalAthletes}</span>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        {currentStep === 'preset' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Choose Tournament Formula
              </h2>
              <p className="text-gray-600 mb-6">
                Select a preset formula or start with a custom configuration
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
                <button
                  onClick={() => setShowPresetSelector(true)}
                  className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="text-3xl mb-2">📋</div>
                  <h3 className="font-medium text-gray-900 mb-1">Use Preset</h3>
                  <p className="text-sm text-gray-600">
                    Choose from built-in formulas like FIE World Cup, National Championships, etc.
                  </p>
                </button>
                
                <button
                  onClick={() => setCurrentStep('poule')}
                  className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="text-3xl mb-2">⚙️</div>
                  <h3 className="font-medium text-gray-900 mb-1">Custom Setup</h3>
                  <p className="text-sm text-gray-600">
                    Configure your own tournament formula step by step
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'poule' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Poule Configuration
              </h2>
              <button
                onClick={() => setShowPresetSelector(true)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Change Formula
              </button>
            </div>
            
            <PouleConfiguration
              totalAthletes={totalAthletes}
              onConfigChange={handlePouleConfigChange}
              onSave={handleSavePouleConfig}
              isLoading={isSaving}
              initialConfig={pouleConfig}
            />
          </div>
        )}

        {currentStep === 'elimination' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Direct Elimination
              </h2>
              <button
                onClick={() => setCurrentStep('poule')}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Back to Poules
              </button>
            </div>
            
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Direct Elimination Configuration
              </h3>
              <p className="text-gray-600 mb-6">
                Configure knockout bracket settings and seeding rules
              </p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  <strong>Coming Soon:</strong> Advanced bracket configuration is being developed.
                  For now, standard direct elimination will be used.
                </p>
              </div>
              
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setCurrentStep('poule')}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep('review')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Continue to Review
                </button>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'review' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Review & Save Configuration
            </h2>
            
            <div className="space-y-6">
              {/* Formula Summary */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Formula Summary</h3>
                <div className="space-y-2 text-sm">
                  {selectedPreset ? (
                    <div>
                      <span className="text-gray-600">Based on preset:</span>
                      <span className="font-medium ml-2">{selectedPreset.name}</span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-gray-600">Custom formula configuration</span>
                    </div>
                  )}
                  
                  {pouleConfig && (
                    <>
                      <div>
                        <span className="text-gray-600">Number of poules:</span>
                        <span className="font-medium ml-2">{pouleConfig.numberOfPoules}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Athletes per poule:</span>
                        <span className="font-medium ml-2">{pouleConfig.athletesPerPoule}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Seeding method:</span>
                        <span className="font-medium ml-2">{pouleConfig.seedingMethod}</span>
                      </div>
                      {pouleConfig._presetPhases && pouleConfig._presetPhases.length > 1 && (
                        <div>
                          <span className="text-gray-600">Multiple rounds:</span>
                          <span className="font-medium ml-2">{pouleConfig._presetPhases.length} poule rounds</span>
                        </div>
                      )}
                    </>
                  )}
                  
                  <div>
                    <span className="text-gray-600">Total athletes:</span>
                    <span className="font-medium ml-2">{totalAthletes}</span>
                  </div>
                </div>
              </div>
              
              {/* Save Actions */}
              <div className="flex gap-4 justify-end">
                <button
                  onClick={() => setCurrentStep('elimination')}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  disabled={isSaving}
                >
                  Back
                </button>
                <button
                  onClick={handleFinalSave}
                  disabled={isSaving}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Formula'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preset Selector Modal */}
      <PresetSelector
        isOpen={showPresetSelector}
        onClose={() => setShowPresetSelector(false)}
        onSelectPreset={handlePresetSelect}
        currentWeapon={competition.weapon as any}
        currentCategory={competition.category}
        totalAthletes={totalAthletes}
      />
    </div>
  )
} 