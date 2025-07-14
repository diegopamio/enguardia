'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { z } from 'zod'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PhaseConfig } from '@/lib/tournament/types'

// Separation criteria types
const separationCriteriaTypes = ['club', 'region', 'country'] as const
type SeparationCriteriaType = typeof separationCriteriaTypes[number]

// Separation criteria schema
const separationCriteriaSchema = z.object({
  first: z.enum(separationCriteriaTypes).default('club'),
  second: z.enum(separationCriteriaTypes).default('region'),
  third: z.enum(separationCriteriaTypes).default('country'),
  placeInPouleBy: z.enum(separationCriteriaTypes).default('club'),
})

// Validation schema for individual poule round configuration
const pouleRoundConfigSchema = z.object({
  roundNumber: z.number().min(1),
  name: z.string().min(1, 'Round name is required'),
  numberOfPoules: z.number().min(1, 'At least 1 poule is required').max(50, 'Maximum 50 poules allowed'),
  athletesPerPoule: z.number().min(3, 'Minimum 3 athletes per poule').max(12, 'Maximum 12 athletes per poule'),
  enableClubSeparation: z.boolean().default(true),
  enableCountrySeparation: z.boolean().default(true),
  maxSameClubPerPoule: z.number().min(1, 'At least 1 athlete per club').max(6, 'Maximum 6 athletes from same club'),
  maxSameCountryPerPoule: z.number().min(1, 'At least 1 athlete per country').max(8, 'Maximum 8 athletes from same country'),
  seedingMethod: z.enum(['RANDOM', 'RANKING', 'SNAKE']).default('RANKING'),
  allowIncompletePoules: z.boolean().default(false),
  minPouleSizeForIncomplete: z.number().min(3, 'Minimum 3 athletes in incomplete poule').max(6, 'Maximum 6 athletes in incomplete poule'),
  qualificationPercentage: z.number().min(10, 'Minimum 10% qualification').max(100, 'Maximum 100% qualification'),
  qualificationQuota: z.number().min(1, 'At least 1 athlete must qualify'),
  // Match configuration features
  matchFormat: z.enum(['hits_custom', 'time_3min', 'time_6min']).default('hits_custom'),
  customHitCount: z.number().min(1).max(50).default(5),
  roundPurpose: z.enum(['qualification', 'ranking', 'mixed']).default('qualification'),
  enableProgressiveEntry: z.boolean().default(false),
  lastRoundByLevel: z.boolean().default(false),
  // Separation criteria
  separationCriteria: separationCriteriaSchema.default({
    first: 'club',
    second: 'region',
    third: 'country',
    placeInPouleBy: 'club'
  }),
})

// Overall configuration schema
const pouleConfigurationSchema = z.object({
  rounds: z.array(pouleRoundConfigSchema).min(1, 'At least one poule round is required'),
  _presetPhases: z.any().optional(),
  _selectedPreset: z.any().optional(),
})

export type PouleRoundConfig = z.infer<typeof pouleRoundConfigSchema>
export type PouleConfigurationData = z.infer<typeof pouleConfigurationSchema>
export type SeparationCriteria = z.infer<typeof separationCriteriaSchema>

interface PouleConfigurationProps {
  totalAthletes: number
  initialConfig?: Partial<PouleConfigurationData>
  onConfigChange: (config: PouleConfigurationData) => void
  onSave: (config: PouleConfigurationData) => Promise<void>
  isLoading?: boolean
}

// Separation Criteria Component
interface SeparationCriteriaConfigProps {
  criteria: SeparationCriteria
  onChange: (criteria: SeparationCriteria) => void
  disabled?: boolean
}

function SeparationCriteriaConfig({ criteria, onChange, disabled = false }: SeparationCriteriaConfigProps) {
  const [criteriaOrder, setCriteriaOrder] = useState<SeparationCriteriaType[]>([
    criteria.first,
    criteria.second,
    criteria.third
  ])

  // Memoize the criteria array to prevent unnecessary updates
  const memoizedCriteriaOrder = useMemo(() => [
    criteria.first,
    criteria.second,
    criteria.third
  ], [criteria.first, criteria.second, criteria.third])

  useEffect(() => {
    // Only update if the order has actually changed
    const currentOrder = [criteria.first, criteria.second, criteria.third]
    const hasChanged = currentOrder.some((item, index) => item !== criteriaOrder[index])
    
    if (hasChanged) {
      setCriteriaOrder(currentOrder)
    }
  }, [criteria.first, criteria.second, criteria.third, criteriaOrder])

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || disabled) return

    const newOrder = Array.from(criteriaOrder)
    const [reorderedItem] = newOrder.splice(result.source.index, 1)
    newOrder.splice(result.destination.index, 0, reorderedItem)

    setCriteriaOrder(newOrder)
    onChange({
      ...criteria,
      first: newOrder[0],
      second: newOrder[1],
      third: newOrder[2],
    })
  }

  const getCriteriaLabel = (type: SeparationCriteriaType): string => {
    switch (type) {
      case 'club': return 'Club'
      case 'region': return 'Region'
      case 'country': return 'Country'
      default: return type
    }
  }

  const getCriteriaIcon = (type: SeparationCriteriaType): string => {
    switch (type) {
      case 'club': return '🏛️'
      case 'region': return '🌍'
      case 'country': return '🇺🇳'
      default: return '📍'
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h5 className="text-sm font-medium text-gray-700 mb-3">Separation Priority Order</h5>
        <p className="text-xs text-gray-500 mb-4">
          Drag to reorder the separation criteria by priority. First criterion has highest priority.
        </p>
        
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="separation-criteria">
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={`space-y-2 p-3 rounded-lg border-2 border-dashed transition-colors ${
                  snapshot.isDraggingOver
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-300 bg-gray-50'
                }`}
              >
                {criteriaOrder.map((criteriaType, index) => (
                  <Draggable
                    key={criteriaType}
                    draggableId={criteriaType}
                    index={index}
                    isDragDisabled={disabled}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`flex items-center gap-3 p-3 rounded-md border transition-all ${
                          snapshot.isDragging
                            ? 'shadow-lg bg-white border-blue-400 transform rotate-1'
                            : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-move'}`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {index + 1}
                            </span>
                            <span className="text-lg">{getCriteriaIcon(criteriaType)}</span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {getCriteriaLabel(criteriaType)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {index === 0 && 'Primary separation criterion'}
                              {index === 1 && 'Secondary separation criterion'}
                              {index === 2 && 'Tertiary separation criterion'}
                            </div>
                          </div>
                        </div>
                        <div className="text-gray-400">
                          <svg width="16" height="16" viewBox="0 0 16 16" className="fill-current">
                            <path d="M10 13a1 1 0 100-2 1 1 0 000 2zM10 8a1 1 0 100-2 1 1 0 000 2zM10 5a1 1 0 100-2 1 1 0 000 2zM6 13a1 1 0 100-2 1 1 0 000 2zM6 8a1 1 0 100-2 1 1 0 000 2zM6 5a1 1 0 100-2 1 1 0 000 2z" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Place in Poule By
        </label>
        <select
          value={criteria.placeInPouleBy}
          onChange={(e) => onChange({ ...criteria, placeInPouleBy: e.target.value as SeparationCriteriaType })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={disabled}
        >
          <option value="club">Club</option>
          <option value="region">Region</option>
          <option value="country">Country</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Determines how athletes are positioned within each poule
        </p>
      </div>
    </div>
  )
}

export default function PouleConfiguration({
  totalAthletes,
  initialConfig = {},
  onConfigChange,
  onSave,
  isLoading = false
}: PouleConfigurationProps) {
  const [activeRoundTab, setActiveRoundTab] = useState<string>('round-1')

  const calculateOptimalConfig = useCallback((athletes: number, targetPouleSize: number = 7) => {
    const numberOfPoules = Math.max(1, Math.ceil(athletes / targetPouleSize))
    const athletesPerPoule = Math.ceil(athletes / numberOfPoules)
    
    return {
      numberOfPoules,
      athletesPerPoule: Math.min(athletesPerPoule, 12)
    }
  }, [])

  // Create initial configuration with default values - memoized to prevent recreation
  const createInitialConfig = useCallback((initialConfig: Partial<PouleConfigurationData> = {}, totalAthletes: number): PouleConfigurationData => {
    let defaultRounds: PouleRoundConfig[] = initialConfig.rounds || []
    
    // If no existing rounds, check if we have preset phases to create rounds from
    if (defaultRounds.length === 0) {
      // Check if we have preset phases and create rounds from poule phases
      if (initialConfig._presetPhases && initialConfig._presetPhases.length > 0) {
        const poulePhases = initialConfig._presetPhases.filter((phase: PhaseConfig) => phase.phaseType === 'POULE')
        
        if (poulePhases.length > 0) {
          defaultRounds = poulePhases.map((phase: PhaseConfig, index: number) => {
            const optimalConfig = calculateOptimalConfig(totalAthletes)
            const roundNumber = index + 1
            
            return {
              roundNumber,
              name: phase.name || `Poule Round ${roundNumber}`,
              numberOfPoules: optimalConfig.numberOfPoules,
              athletesPerPoule: optimalConfig.athletesPerPoule,
              enableClubSeparation: true,
              enableCountrySeparation: true,
              maxSameClubPerPoule: 2,
              maxSameCountryPerPoule: 4,
              seedingMethod: 'RANKING',
              allowIncompletePoules: false,
              minPouleSizeForIncomplete: 3,
              qualificationPercentage: roundNumber === poulePhases.length ? 100 : 65, // Last round qualifies everyone
              qualificationQuota: roundNumber === poulePhases.length ? totalAthletes : Math.floor(totalAthletes * 0.65),
              matchFormat: 'hits_custom',
              customHitCount: 5,
              roundPurpose: roundNumber === poulePhases.length ? 'ranking' : 'qualification',
              enableProgressiveEntry: false,
              lastRoundByLevel: false,
              separationCriteria: {
                first: 'club',
                second: 'region',
                third: 'country',
                placeInPouleBy: 'club'
              }
            }
          })
        }
      }
      
      // Fall back to single default round if no preset phases
      if (defaultRounds.length === 0) {
        const optimalConfig = calculateOptimalConfig(totalAthletes)
        defaultRounds.push({
          roundNumber: 1,
          name: 'Poule Round 1',
          numberOfPoules: optimalConfig.numberOfPoules,
          athletesPerPoule: optimalConfig.athletesPerPoule,
          enableClubSeparation: true,
          enableCountrySeparation: true,
          maxSameClubPerPoule: 2,
          maxSameCountryPerPoule: 4,
          seedingMethod: 'RANKING',
          allowIncompletePoules: false,
          minPouleSizeForIncomplete: 3,
          qualificationPercentage: 65,
          qualificationQuota: Math.floor(totalAthletes * 0.65),
          matchFormat: 'hits_custom',
          customHitCount: 5,
          roundPurpose: 'qualification',
          enableProgressiveEntry: false,
          lastRoundByLevel: false,
          separationCriteria: {
            first: 'club',
            second: 'region',
            third: 'country',
            placeInPouleBy: 'club'
          }
        })
      }
    }

    return {
      rounds: defaultRounds,
      _presetPhases: initialConfig._presetPhases,
      _selectedPreset: initialConfig._selectedPreset,
    }
  }, [calculateOptimalConfig])

  // Memoize the initial config to prevent unnecessary recreations
  const memoizedInitialConfig = useMemo(() => 
    createInitialConfig(initialConfig, totalAthletes),
    [createInitialConfig, initialConfig, totalAthletes]
  )

  const [config, setConfig] = useState<PouleConfigurationData>(memoizedInitialConfig)

  // Track if we've initialized to prevent loops
  const [isInitialized, setIsInitialized] = useState(false)

  // Update config when initialConfig changes (e.g., when preset is selected)
  useEffect(() => {
    if (!isInitialized && Object.keys(initialConfig).length > 0) {
      const newConfig = createInitialConfig(initialConfig, totalAthletes)
      setConfig(newConfig)
      if (newConfig.rounds.length > 0) {
        setActiveRoundTab('round-1')
      }
      setIsInitialized(true)
    }
  }, [initialConfig, totalAthletes, createInitialConfig, isInitialized])

  // Debounced notification to parent to prevent rapid calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onConfigChange(config)
    }, 150) // Small delay to batch updates

    return () => clearTimeout(timeoutId)
  }, [config, onConfigChange])

  const handleRoundChange = (roundIndex: number, field: keyof PouleRoundConfig, value: any) => {
    setConfig(prev => {
      const newRounds = [...prev.rounds]
      newRounds[roundIndex] = { ...newRounds[roundIndex], [field]: value }

      // Auto-calculate qualification quota when percentage changes
      if (field === 'qualificationPercentage') {
        const athletesInRound = getAthletesForRound(roundIndex)
        newRounds[roundIndex].qualificationQuota = Math.max(1, Math.floor(athletesInRound * value / 100))
      }

      // Auto-calculate qualification percentage when quota changes
      if (field === 'qualificationQuota') {
        const athletesInRound = getAthletesForRound(roundIndex)
        newRounds[roundIndex].qualificationPercentage = Math.round((value / athletesInRound) * 100)
      }

      // Recalculate poule structure when athletes per poule changes
      if (field === 'athletesPerPoule') {
        const athletesInRound = getAthletesForRound(roundIndex)
        newRounds[roundIndex].numberOfPoules = Math.max(1, Math.ceil(athletesInRound / value))
      }

      return { ...prev, rounds: newRounds }
    })
  }

  const addNewRound = () => {
    const currentRounds = config.rounds.length
    const previousRoundQuota = currentRounds > 0 ? config.rounds[currentRounds - 1].qualificationQuota : totalAthletes
    const optimalConfig = calculateOptimalConfig(previousRoundQuota, 6) // Smaller poules for elimination rounds

    const newRound: PouleRoundConfig = {
      roundNumber: currentRounds + 1,
      name: `Poule Round ${currentRounds + 1}`,
      numberOfPoules: optimalConfig.numberOfPoules,
      athletesPerPoule: optimalConfig.athletesPerPoule,
      enableClubSeparation: true,
      enableCountrySeparation: true,
      maxSameClubPerPoule: 2,
      maxSameCountryPerPoule: 3,
      seedingMethod: 'RANKING',
      allowIncompletePoules: false,
      minPouleSizeForIncomplete: 3,
      qualificationPercentage: 50,
      qualificationQuota: Math.max(1, Math.floor(previousRoundQuota * 0.5)),
      matchFormat: 'hits_custom',
      customHitCount: 5,
      roundPurpose: 'qualification',
      enableProgressiveEntry: false,
      lastRoundByLevel: false,
      separationCriteria: {
        first: 'club',
        second: 'region',
        third: 'country',
        placeInPouleBy: 'club'
      }
    }

    setConfig(prev => ({
      ...prev,
      rounds: [...prev.rounds, newRound]
    }))

    // Switch to the new round tab
    setActiveRoundTab(`round-${currentRounds + 1}`)
  }

  const removeRound = (roundIndex: number) => {
    if (config.rounds.length === 1) return // Don't allow removing the last round

    setConfig(prev => ({
      ...prev,
      rounds: prev.rounds.filter((_, index) => index !== roundIndex)
    }))

    // Switch to round 1 if we're removing the current tab
    if (activeRoundTab === `round-${roundIndex + 1}`) {
      setActiveRoundTab('round-1')
    }
  }

  const validateConfig = (): boolean => {
    return config.rounds.every(round => 
      round.name.trim() !== '' && 
      round.numberOfPoules > 0 && 
      round.athletesPerPoule >= 3 &&
      round.qualificationQuota > 0
    )
  }

  const handleSave = async () => {
    if (!validateConfig()) return
    await onSave(config)
  }

  const getAthletesForRound = (roundIndex: number): number => {
    if (roundIndex === 0) return totalAthletes
    return config.rounds[roundIndex - 1].qualificationQuota
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Poule Configuration</h3>
          <p className="text-sm text-gray-600">Configure the structure and rules for your poule rounds</p>
        </div>
        <div className="text-sm text-gray-500">
          Total Athletes: <span className="font-medium">{totalAthletes}</span>
        </div>
      </div>

      {/* Preset Information */}
      {config._selectedPreset && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-green-900 flex items-center gap-2">
              📋 Using Preset: {config._selectedPreset.name}
            </CardTitle>
            <CardDescription className="text-green-800">
              {config._selectedPreset.description}
            </CardDescription>
          </CardHeader>
                     {config.rounds.length > 1 && (
             <CardContent className="pt-0">
               <p className="text-sm text-green-700">
                 Currently configured with {config.rounds.length} poule rounds. You can customize each round using the tabs below.
               </p>
             </CardContent>
           )}
        </Card>
      )}

      {/* Rounds Configuration Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Poule Rounds</CardTitle>
            <Button 
              onClick={addNewRound} 
              variant="outline" 
              size="sm"
              disabled={isLoading}
            >
              + Add Round
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeRoundTab} onValueChange={setActiveRoundTab}>
                         <TabsList className={`grid w-full ${config.rounds.length === 1 ? 'grid-cols-1' : config.rounds.length === 2 ? 'grid-cols-2' : config.rounds.length === 3 ? 'grid-cols-3' : config.rounds.length === 4 ? 'grid-cols-4' : 'grid-cols-5'}`}>
               {config.rounds.map((round, index) => (
                <TabsTrigger key={index} value={`round-${index + 1}`} className="relative">
                  Round {index + 1}
                  {config.rounds.length > 1 && (
                    <span
                      className="absolute -top-1 -right-1 h-5 w-5 text-xs bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center cursor-pointer transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeRound(index)
                      }}
                      title={`Remove Round ${index + 1}`}
                    >
                      ×
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {config.rounds.map((round, roundIndex) => (
              <TabsContent key={roundIndex} value={`round-${roundIndex + 1}`} className="space-y-6 mt-6">
                {/* Round Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-medium">Round {roundIndex + 1}</h4>
                    <p className="text-sm text-gray-600">
                      Athletes in this round: <span className="font-medium">{getAthletesForRound(roundIndex)}</span>
                      {roundIndex > 0 && (
                        <span className="text-xs text-gray-500 ml-2">
                          (qualified from Round {roundIndex})
                        </span>
                      )}
                    </p>
                  </div>
                  <Badge variant={roundIndex === 0 ? "default" : "secondary"}>
                    {roundIndex === 0 ? "Initial Round" : "Elimination Round"}
                  </Badge>
                </div>

                {/* Round Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Round Name
                  </label>
                  <input
                    type="text"
                    value={round.name}
                    onChange={(e) => handleRoundChange(roundIndex, 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                </div>

                {/* Poule Structure */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Poules
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={round.numberOfPoules}
                      onChange={(e) => handleRoundChange(roundIndex, 'numberOfPoules', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Athletes per Poule
                    </label>
                    <input
                      type="number"
                      min={3}
                      max={12}
                      value={round.athletesPerPoule}
                      onChange={(e) => handleRoundChange(roundIndex, 'athletesPerPoule', parseInt(e.target.value) || 3)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Separation and Placement Configuration */}
                <Card className="border-indigo-200 bg-indigo-50">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-indigo-900 text-lg">Separation & Placement</CardTitle>
                    <CardDescription className="text-indigo-800">
                      Configure how athletes are separated and placed within poules
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SeparationCriteriaConfig
                      criteria={round.separationCriteria}
                      onChange={(criteria) => handleRoundChange(roundIndex, 'separationCriteria', criteria)}
                      disabled={isLoading}
                    />
                  </CardContent>
                </Card>

                {/* Legacy Separation Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`clubSeparation-${roundIndex}`}
                        checked={round.enableClubSeparation || false}
                        onChange={(e) => handleRoundChange(roundIndex, 'enableClubSeparation', e.target.checked)}
                        disabled={isLoading}
                      />
                      <label htmlFor={`clubSeparation-${roundIndex}`} className="text-sm font-medium text-gray-700">
                        Limit same club per poule
                      </label>
                    </div>
                    
                    {round.enableClubSeparation && (
                      <div className="ml-6">
                        <label className="block text-sm text-gray-600 mb-1">
                          Max athletes from same club
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={6}
                          value={round.maxSameClubPerPoule}
                          onChange={(e) => handleRoundChange(roundIndex, 'maxSameClubPerPoule', parseInt(e.target.value) || 1)}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          disabled={isLoading}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`countrySeparation-${roundIndex}`}
                        checked={round.enableCountrySeparation || false}
                        onChange={(e) => handleRoundChange(roundIndex, 'enableCountrySeparation', e.target.checked)}
                        disabled={isLoading}
                      />
                      <label htmlFor={`countrySeparation-${roundIndex}`} className="text-sm font-medium text-gray-700">
                        Limit same country per poule
                      </label>
                    </div>
                    
                    {round.enableCountrySeparation && (
                      <div className="ml-6">
                        <label className="block text-sm text-gray-600 mb-1">
                          Max athletes from same country
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={8}
                          value={round.maxSameCountryPerPoule}
                          onChange={(e) => handleRoundChange(roundIndex, 'maxSameCountryPerPoule', parseInt(e.target.value) || 1)}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          disabled={isLoading}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Seeding and Qualification */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seeding Method
                    </label>
                    <select
                      value={round.seedingMethod}
                      onChange={(e) => handleRoundChange(roundIndex, 'seedingMethod', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isLoading}
                    >
                      <option value="RANKING">By Ranking</option>
                      <option value="SNAKE">Snake Draft</option>
                      <option value="RANDOM">Random</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Qualification %
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={100}
                      value={round.qualificationPercentage}
                      onChange={(e) => handleRoundChange(roundIndex, 'qualificationPercentage', parseInt(e.target.value) || 10)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Qualified Fencers
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={getAthletesForRound(roundIndex)}
                      value={round.qualificationQuota}
                      onChange={(e) => handleRoundChange(roundIndex, 'qualificationQuota', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Incomplete Poules */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`incompletePoules-${roundIndex}`}
                      checked={round.allowIncompletePoules || false}
                      onChange={(e) => handleRoundChange(roundIndex, 'allowIncompletePoules', e.target.checked)}
                      disabled={isLoading}
                    />
                    <label htmlFor={`incompletePoules-${roundIndex}`} className="text-sm font-medium text-gray-700">
                      Allow incomplete poules
                    </label>
                  </div>
                  
                  {round.allowIncompletePoules && (
                    <div className="ml-6">
                      <label className="block text-sm text-gray-600 mb-2">
                        Minimum size for incomplete poule
                      </label>
                      <input
                        type="number"
                        min={3}
                        max={6}
                        value={round.minPouleSizeForIncomplete}
                        onChange={(e) => handleRoundChange(roundIndex, 'minPouleSizeForIncomplete', parseInt(e.target.value) || 3)}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        disabled={isLoading}
                      />
                    </div>
                  )}
                </div>

                {/* Match Configuration */}
                <Card className="border-purple-200 bg-purple-50">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-purple-900 text-lg">Match Configuration</CardTitle>
                    <CardDescription className="text-purple-800">
                      Configure match format, scoring, and advanced options
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Match Format */}
                      <div>
                        <label className="block text-sm font-medium text-purple-800 mb-2">
                          Match Format
                        </label>
                        <select
                          value={round.matchFormat}
                          onChange={(e) => handleRoundChange(roundIndex, 'matchFormat', e.target.value as any)}
                          className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          disabled={isLoading}
                        >
                          <option value="hits_custom">Custom Hit Count</option>
                          <option value="time_3min">3 Minutes</option>
                          <option value="time_6min">6 Minutes</option>
                        </select>
                      </div>

                      {round.matchFormat === 'hits_custom' && (
                        <div>
                          <label className="block text-sm font-medium text-purple-800 mb-2">
                            Number of Hits
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={round.customHitCount}
                            onChange={(e) => handleRoundChange(roundIndex, 'customHitCount', parseInt(e.target.value) || 5)}
                            className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            disabled={isLoading}
                            placeholder="5"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-purple-800 mb-2">
                          Round Purpose
                        </label>
                        <select
                          value={round.roundPurpose}
                          onChange={(e) => handleRoundChange(roundIndex, 'roundPurpose', e.target.value as any)}
                          className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          disabled={isLoading}
                        >
                          <option value="qualification">Qualification Round</option>
                          <option value="ranking">Ranking Round</option>
                          <option value="mixed">Mixed (Qual + Ranking)</option>
                        </select>
                      </div>
                    </div>

                    {/* Advanced Options */}
                    <div className="mt-6 space-y-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`progressiveEntry-${roundIndex}`}
                          checked={round.enableProgressiveEntry || false}
                          onChange={(e) => handleRoundChange(roundIndex, 'enableProgressiveEntry', e.target.checked)}
                          disabled={isLoading}
                        />
                        <label htmlFor={`progressiveEntry-${roundIndex}`} className="text-sm text-purple-800">
                          Enable progressive entry (late registrations)
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`lastRoundByLevel-${roundIndex}`}
                          checked={round.lastRoundByLevel || false}
                          onChange={(e) => handleRoundChange(roundIndex, 'lastRoundByLevel', e.target.checked)}
                          disabled={isLoading}
                        />
                        <label htmlFor={`lastRoundByLevel-${roundIndex}`} className="text-sm text-purple-800">
                          Last round of poules by current level/ranking
                        </label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Configuration Summary */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-3">Round {roundIndex + 1} Summary</h5>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Athletes:</span>
                        <span className="font-medium ml-2">{getAthletesForRound(roundIndex)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Poules:</span>
                        <span className="font-medium ml-2">{round.numberOfPoules}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Per Poule:</span>
                        <span className="font-medium ml-2">{round.athletesPerPoule}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Qualifying:</span>
                        <span className="font-medium ml-2">{round.qualificationQuota}</span>
                      </div>
                    </div>
                    
                    {/* Match Configuration Summary */}
                    <div className="border-t border-gray-300 pt-3">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-purple-600">Match Format:</span>
                          <span className="font-medium ml-2">
                            {round.matchFormat === 'hits_custom' ? `${round.customHitCount} hits` :
                             round.matchFormat === 'time_3min' ? '3 min' : '6 min'}
                          </span>
                        </div>
                        <div>
                          <span className="text-purple-600">Purpose:</span>
                          <span className="font-medium ml-2 capitalize">{round.roundPurpose}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          {round.enableProgressiveEntry && (
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Progressive Entry</span>
                          )}
                          {round.lastRoundByLevel && (
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">By Level</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Separation Criteria Summary */}
                    <div className="border-t border-gray-300 pt-3">
                      <div className="text-sm">
                        <span className="text-indigo-600">Separation Priority:</span>
                        <span className="font-medium ml-2">
                          1st: {round.separationCriteria.first} → 2nd: {round.separationCriteria.second} → 3rd: {round.separationCriteria.third}
                        </span>
                        <br />
                        <span className="text-indigo-600">Place in Poule By:</span>
                        <span className="font-medium ml-2 capitalize">{round.separationCriteria.placeInPouleBy}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>


    </div>
  )
} 