'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { z } from 'zod'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// Bracket types and enums
const bracketTypes = ['MAIN', 'REPECHAGE', 'CLASSIFICATION', 'CONSOLATION'] as const
const seedingMethods = ['RANKING', 'SNAKE', 'MANUAL', 'RANDOM'] as const
const byeDistributions = ['top', 'bottom', 'spread'] as const
const bracketSizes = [4, 8, 16, 32, 64, 128, 256] as const

type BracketType = typeof bracketTypes[number]
type SeedingMethod = typeof seedingMethods[number]
type ByeDistribution = typeof byeDistributions[number]

// Individual bracket configuration schema
const bracketConfigSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Bracket name is required'),
  bracketType: z.enum(bracketTypes),
  size: z.number().refine(val => bracketSizes.includes(val as any), 'Invalid bracket size'),
  seedingMethod: z.enum(seedingMethods),
  byeDistribution: z.enum(byeDistributions).default('top'),
  
  // Match format
  matchFormat: z.enum(['hits_custom', 'time_9min', 'time_6min']).default('hits_custom'),
  customHitCount: z.number().min(1).max(50).default(15),
  
  // Advanced bracket options
  enableThirdPlaceMatch: z.boolean().default(true),
  enableClassificationBouts: z.boolean().default(false),
  
  // Repechage-specific options
  repechageSource: z.enum(['first_round', 'quarter_finals', 'semi_finals']).optional(),
  repechageRounds: z.number().min(1).max(4).optional(),
  
  // Classification-specific options
  classificationPositions: z.array(z.number()).optional(),
  classificationMethod: z.enum(['bracket', 'ranking']).optional(),
  
  // Tournament progression
  advancesToNext: z.boolean().default(false),
  eliminatedDropTo: z.string().optional(), // ID of repechage/classification bracket
})

// Main elimination configuration schema
const eliminationConfigSchema = z.object({
  brackets: z.array(bracketConfigSchema).min(1, 'At least one bracket is required'),
  sequenceOrder: z.number().default(1),
  totalAthletes: z.number().min(4),
})

type BracketConfig = z.infer<typeof bracketConfigSchema>
type EliminationConfigurationData = z.infer<typeof eliminationConfigSchema>

interface EliminationConfigurationProps {
  totalAthletes: number
  initialConfig?: Partial<EliminationConfigurationData>
  onConfigChange?: (config: EliminationConfigurationData) => void
  onSave?: (config: EliminationConfigurationData) => void
  isLoading?: boolean
}

// Helper functions
const getBracketTypeInfo = (type: BracketType) => {
  const info = {
    MAIN: { 
      icon: '🏆', 
      label: 'Main Bracket', 
      color: 'bg-blue-500', 
      description: 'Primary elimination bracket for determining winners' 
    },
    REPECHAGE: { 
      icon: '🔄', 
      label: 'Repechage', 
      color: 'bg-green-500', 
      description: 'Second chance bracket for eliminated fencers' 
    },
    CLASSIFICATION: { 
      icon: '📊', 
      label: 'Classification', 
      color: 'bg-purple-500', 
      description: 'Ranking bracket for final positions' 
    },
    CONSOLATION: { 
      icon: '🥉', 
      label: 'Consolation', 
      color: 'bg-orange-500', 
      description: 'Bracket for eliminated early-round fencers' 
    },
  }
  return info[type]
}

const calculateOptimalBracketSize = (athletes: number): number => {
  // Find the smallest power of 2 that can accommodate all athletes
  const sizes = [4, 8, 16, 32, 64, 128, 256]
  return sizes.find(size => size >= athletes) || 256
}

export default function EliminationConfiguration({
  totalAthletes,
  initialConfig = {},
  onConfigChange,
  onSave,
  isLoading = false
}: EliminationConfigurationProps) {
  const [activeTab, setActiveTab] = useState<string>('main')

  // Memoized initial configuration creator
  const createInitialConfig = useCallback((initialConfig: Partial<EliminationConfigurationData>, athletes: number): EliminationConfigurationData => {
    const optimalSize = calculateOptimalBracketSize(athletes)
    
    if (initialConfig.brackets && initialConfig.brackets.length > 0) {
      return {
        brackets: initialConfig.brackets,
        sequenceOrder: initialConfig.sequenceOrder || 1,
        totalAthletes: athletes,
      }
    }

         // Create default main bracket
     const defaultBracket: BracketConfig = {
       id: 'main-bracket',
       name: 'Direct Elimination',
       bracketType: 'MAIN',
       size: optimalSize,
       seedingMethod: 'RANKING',
      byeDistribution: 'top',
      matchFormat: 'hits_custom',
      customHitCount: 15,
      enableThirdPlaceMatch: true,
      enableClassificationBouts: false,
      advancesToNext: false,
    }

    return {
      brackets: [defaultBracket],
      sequenceOrder: 1,
      totalAthletes: athletes,
    }
  }, [])

  // Memoized initial config
  const memoizedInitialConfig = useMemo(() => 
    createInitialConfig(initialConfig, totalAthletes), 
    [createInitialConfig, initialConfig, totalAthletes]
  )

  const [config, setConfig] = useState<EliminationConfigurationData>(memoizedInitialConfig)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Effect to handle external config changes
  useEffect(() => {
    if (!hasInitialized) {
      setHasInitialized(true)
      return
    }

    const newConfig = createInitialConfig(initialConfig, totalAthletes)
    setConfig(newConfig)
  }, [initialConfig, totalAthletes, createInitialConfig, hasInitialized])

  // Debounced onChange notification
  useEffect(() => {
    if (!hasInitialized) return

    const timer = setTimeout(() => {
      onConfigChange?.(config)
    }, 150)

    return () => clearTimeout(timer)
  }, [config, onConfigChange, hasInitialized])

  // Update bracket function
  const updateBracket = (bracketId: string, updates: Partial<BracketConfig>) => {
    setConfig(prev => ({
      ...prev,
      brackets: prev.brackets.map(bracket => 
        bracket.id === bracketId 
          ? { ...bracket, ...updates }
          : bracket
      )
    }))
  }

  // Validate bracket type dependencies
  const validateBracketType = (type: BracketType): string | null => {
    const existingTypes = config.brackets.map(b => b.bracketType)
    
    // MAIN bracket is always valid
    if (type === 'MAIN') return null
    
    // REPECHAGE requires MAIN bracket
    if (type === 'REPECHAGE' && !existingTypes.includes('MAIN')) {
      return 'Repechage bracket requires a Main bracket first'
    }
    
    // CLASSIFICATION/CONSOLATION should have at least MAIN bracket
    if ((type === 'CLASSIFICATION' || type === 'CONSOLATION') && !existingTypes.includes('MAIN')) {
      return `${type.toLowerCase()} bracket requires a Main bracket first`
    }
    
    return null
  }

  // Add new bracket
  const addBracket = (type: BracketType) => {
    // Validate dependencies
    const validationError = validateBracketType(type)
    if (validationError) {
      setErrorMessage(validationError)
      setTimeout(() => setErrorMessage(null), 5000) // Auto-dismiss after 5 seconds
      return
    }

    const newId = `${type.toLowerCase()}-${Date.now()}`
    const typeInfo = getBracketTypeInfo(type)
    
    // Calculate sequence order based on bracket type
    const getSequenceOrder = (bracketType: BracketType): number => {
      switch (bracketType) {
        case 'MAIN': return 1
        case 'REPECHAGE': return 2
        case 'CLASSIFICATION': return 3
        case 'CONSOLATION': return 4
        default: return 999
      }
    }

    const newBracket: BracketConfig = {
      id: newId,
      name: typeInfo.label,
      bracketType: type,
             size: type === 'MAIN' ? calculateOptimalBracketSize(totalAthletes) : 8,
      seedingMethod: 'RANKING',
      byeDistribution: 'top',
      matchFormat: 'hits_custom',
      customHitCount: 15,
      enableThirdPlaceMatch: type === 'MAIN',
      enableClassificationBouts: false,
      advancesToNext: false,
      ...(type === 'REPECHAGE' && {
        repechageSource: 'first_round',
        repechageRounds: 2,
      }),
      ...(type === 'CLASSIFICATION' && {
        classificationPositions: [9, 10, 11, 12, 13, 14, 15, 16],
        classificationMethod: 'bracket',
      }),
    }

    setConfig(prev => {
      const newBrackets = [...prev.brackets, newBracket]
      // Sort brackets by logical sequence order
      newBrackets.sort((a, b) => getSequenceOrder(a.bracketType) - getSequenceOrder(b.bracketType))
      
      return {
        ...prev,
        brackets: newBrackets
      }
    })

    setActiveTab(newId)
  }

  // Validate bracket removal dependencies
  const validateBracketRemoval = (bracketId: string): string | null => {
    const bracket = config.brackets.find(b => b.id === bracketId)
    if (!bracket) return null
    
    // Check if removing MAIN bracket when others depend on it
    if (bracket.bracketType === 'MAIN') {
      const dependentTypes = config.brackets
        .filter(b => b.id !== bracketId && ['REPECHAGE', 'CLASSIFICATION', 'CONSOLATION'].includes(b.bracketType))
        .map(b => b.bracketType)
      
      if (dependentTypes.length > 0) {
        return `Cannot remove Main bracket: ${dependentTypes.join(', ')} bracket(s) depend on it`
      }
    }
    
    return null
  }

  // Remove bracket
  const removeBracket = (bracketId: string) => {
    // Validate dependencies
    const validationError = validateBracketRemoval(bracketId)
    if (validationError) {
      setErrorMessage(validationError)
      setTimeout(() => setErrorMessage(null), 5000) // Auto-dismiss after 5 seconds
      return
    }

    setConfig(prev => {
      const remainingBrackets = prev.brackets.filter(bracket => bracket.id !== bracketId)
      return {
        ...prev,
        brackets: remainingBrackets
      }
    })

    // Switch to first remaining bracket if removing current active tab
    if (activeTab === bracketId && config.brackets.length > 1) {
      const remainingBrackets = config.brackets.filter(bracket => bracket.id !== bracketId)
      if (remainingBrackets.length > 0) {
        setActiveTab(remainingBrackets[0].id)
      }
    }
  }

  const handleSave = () => {
    onSave?.(config)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Direct Elimination Configuration
          </h3>
          <p className="text-xs text-gray-600">
            Configure knockout brackets, seeding, and tournament progression
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {totalAthletes} Athletes
          </Badge>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            {config.brackets.length} Bracket{config.brackets.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-red-600">⚠️</span>
            <span className="text-red-700 text-sm">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-600 hover:text-red-800 text-lg leading-none"
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Bracket Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Tournament Brackets</CardTitle>
              <CardDescription>
                Manage elimination brackets for this competition
              </CardDescription>
            </div>
            <div className="relative">
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    addBracket(e.target.value as BracketType)
                    e.target.value = "" // Reset selection
                  }
                }}
                className="px-4 py-2 pr-8 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="" disabled>+ Add Bracket</option>
                {bracketTypes.map(type => {
                  const typeInfo = getBracketTypeInfo(type)
                  const exists = config.brackets.some(b => b.bracketType === type)
                  const validationError = validateBracketType(type)
                  const isDisabled = exists || validationError !== null
                  
                  return (
                    <option 
                      key={type} 
                      value={type} 
                      disabled={isDisabled}
                      className={isDisabled ? "text-gray-400" : ""}
                      title={validationError || (exists ? "Already added" : "")}
                    >
                      {typeInfo.icon} {typeInfo.label}
                      {exists ? " (Added)" : validationError ? " (Requires Main)" : ""}
                    </option>
                  )
                })}
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          {config.brackets.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🏆</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Brackets Configured
              </h3>
              <p className="text-gray-600 text-sm">
                Add a bracket type using the dropdown above to get started
              </p>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className={`grid w-full ${config.brackets.length === 1 ? 'grid-cols-1' : config.brackets.length === 2 ? 'grid-cols-2' : config.brackets.length === 3 ? 'grid-cols-3' : 'grid-cols-4'} mb-4`}>
                {config.brackets.map(bracket => {
                  const typeInfo = getBracketTypeInfo(bracket.bracketType)
                  return (
                    <TabsTrigger 
                      key={bracket.id} 
                      value={bracket.id} 
                      className="relative flex items-center gap-2 px-2 py-1 text-xs h-auto min-h-0"
                    >
                      <span className="text-sm">{typeInfo.icon}</span>
                      <div className="flex flex-col items-start leading-tight">
                        <span className="text-xs font-medium leading-tight">{typeInfo.label}</span>
                        <span className="text-xs text-gray-500 hidden sm:block leading-tight">{bracket.size} athletes</span>
                      </div>
                      {config.brackets.length > 1 && (
                        <span
                          className="absolute -top-1 -right-1 h-5 w-5 text-xs bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center cursor-pointer transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeBracket(bracket.id)
                          }}
                          title={`Remove ${typeInfo.label} Bracket`}
                        >
                          ×
                        </span>
                      )}
                    </TabsTrigger>
                  )
                })}
              </TabsList>

              {config.brackets.map(bracket => (
                <TabsContent key={bracket.id} value={bracket.id} className="space-y-4">
                  <BracketConfigurationSection
                    bracket={bracket}
                    totalAthletes={totalAthletes}
                    onUpdate={(updates) => updateBracket(bracket.id, updates)}
                    onRemove={() => removeBracket(bracket.id)}
                    canRemove={config.brackets.length > 1}
                  />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Tournament Structure Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-blue-900">
            ℹ️ Tournament Structure Logic
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xs text-blue-800 space-y-2">
            <div><strong>Main Bracket:</strong> Primary elimination - required for all tournaments</div>
            <div><strong>Repechage:</strong> Second chance for early losers - requires Main bracket</div>
            <div><strong>Classification:</strong> Ranking matches for eliminated athletes - requires Main bracket</div>
            <div><strong>Execution Order:</strong> Main → Repechage → Classification → Consolation</div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Summary */}
      <Card className="bg-gray-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            📋 Configuration Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {config.brackets.map(bracket => {
              const typeInfo = getBracketTypeInfo(bracket.bracketType)
              return (
                <div key={bracket.id} className="bg-white p-3 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">{typeInfo.icon}</span>
                    <h4 className="font-medium text-sm">{bracket.name}</h4>
                    <Badge 
                      variant="secondary" 
                      className={`${typeInfo.color} text-white text-xs`}
                    >
                      {bracket.bracketType}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>Size: {bracket.size} positions</div>
                    <div>Seeding: {bracket.seedingMethod.toLowerCase()}</div>
                    <div>
                      Match: {bracket.matchFormat === 'hits_custom' 
                        ? `${bracket.customHitCount} hits` 
                        : bracket.matchFormat
                      }
                    </div>
                    {bracket.enableThirdPlaceMatch && (
                      <div className="text-blue-600">✓ 3rd place match</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}

    </div>
  )
}

// Individual Bracket Configuration Component
interface BracketConfigurationSectionProps {
  bracket: BracketConfig
  totalAthletes: number
  onUpdate: (updates: Partial<BracketConfig>) => void
  onRemove: () => void
  canRemove: boolean
}

function BracketConfigurationSection({
  bracket,
  totalAthletes,
  onUpdate,
  onRemove,
  canRemove
}: BracketConfigurationSectionProps) {
  const typeInfo = getBracketTypeInfo(bracket.bracketType)
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full ${typeInfo.color} flex items-center justify-center text-white text-sm`}>
            {typeInfo.icon}
          </div>
          <div>
            <h4 className="font-medium text-gray-900 text-sm">{bracket.name}</h4>
            <p className="text-xs text-gray-600">{typeInfo.description}</p>
          </div>
        </div>
        {canRemove && (
          <Button variant="outline" size="sm" onClick={onRemove} className="text-red-600 hover:text-red-700 h-8 px-3 text-xs">
            Remove
          </Button>
        )}
      </div>

      {/* Basic Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Basic Configuration</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-0">
          {/* Bracket Name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Bracket Name
            </label>
            <input
              type="text"
              value={bracket.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Bracket Size */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Bracket Size
            </label>
            <select
              value={bracket.size}
              onChange={(e) => onUpdate({ size: parseInt(e.target.value) })}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {bracketSizes.map(size => (
                <option key={size} value={size}>
                  {size} positions
                </option>
              ))}
            </select>
          </div>

          {/* Seeding Method */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Seeding Method
            </label>
            <select
              value={bracket.seedingMethod}
              onChange={(e) => onUpdate({ seedingMethod: e.target.value as SeedingMethod })}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="RANKING">By Ranking</option>
              <option value="SNAKE">Snake Seeding</option>
              <option value="MANUAL">Manual Assignment</option>
              <option value="RANDOM">Random</option>
            </select>
          </div>

          {/* Bye Distribution */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Bye Distribution
            </label>
            <select
              value={bracket.byeDistribution}
              onChange={(e) => onUpdate({ byeDistribution: e.target.value as ByeDistribution })}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="top">Top Seeds</option>
              <option value="bottom">Bottom Seeds</option>
              <option value="spread">Spread Evenly</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Match Configuration */}
      <Card className="bg-indigo-50 border-indigo-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-indigo-900">Match Configuration</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-0">
          {/* Match Format */}
          <div>
            <label className="block text-xs font-medium text-indigo-700 mb-1">
              Match Format
            </label>
            <select
              value={bracket.matchFormat}
              onChange={(e) => onUpdate({ matchFormat: e.target.value as any })}
              className="w-full px-2 py-1.5 text-sm border border-indigo-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="hits_custom">Custom Hit Count</option>
              <option value="time_9min">9 minutes</option>
              <option value="time_6min">6 minutes</option>
            </select>
          </div>

          {/* Custom Hit Count */}
          {bracket.matchFormat === 'hits_custom' && (
            <div>
              <label className="block text-xs font-medium text-indigo-700 mb-1">
                Hit Count (1-50)
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={bracket.customHitCount}
                onChange={(e) => onUpdate({ customHitCount: parseInt(e.target.value) || 15 })}
                className="w-full px-2 py-1.5 text-sm border border-indigo-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced Options */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Advanced Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {/* General Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={bracket.enableThirdPlaceMatch || false}
                onChange={(e) => onUpdate({ enableThirdPlaceMatch: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-700">Enable 3rd place match</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={bracket.enableClassificationBouts || false}
                onChange={(e) => onUpdate({ enableClassificationBouts: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-700">Classification bouts</span>
            </label>
          </div>

          {/* Repechage-specific options */}
          {bracket.bracketType === 'REPECHAGE' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-green-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-green-700 mb-1">
                  Repechage Source
                </label>
                <select
                  value={bracket.repechageSource || 'first_round'}
                  onChange={(e) => onUpdate({ repechageSource: e.target.value as any })}
                  className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="first_round">First Round Eliminations</option>
                  <option value="quarter_finals">Quarter Finals</option>
                  <option value="semi_finals">Semi Finals</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-green-700 mb-1">
                  Repechage Rounds
                </label>
                <input
                  type="number"
                  min="1"
                  max="4"
                  value={bracket.repechageRounds || 2}
                  onChange={(e) => onUpdate({ repechageRounds: parseInt(e.target.value) || 2 })}
                  className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          )}

          {/* Classification-specific options */}
          {bracket.bracketType === 'CLASSIFICATION' && (
            <div className="p-4 bg-purple-50 rounded-lg space-y-3">
              <div>
                <label className="block text-sm font-medium text-purple-700 mb-1">
                  Classification Method
                </label>
                <select
                  value={bracket.classificationMethod || 'bracket'}
                  onChange={(e) => onUpdate({ classificationMethod: e.target.value as any })}
                  className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="bracket">Bracket System</option>
                  <option value="ranking">Ranking System</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-purple-700 mb-1">
                  Classification Positions
                </label>
                <input
                  type="text"
                  placeholder="e.g., 9,10,11,12,13,14,15,16"
                  value={bracket.classificationPositions?.join(',') || ''}
                  onChange={(e) => {
                    const positions = e.target.value.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p))
                    onUpdate({ classificationPositions: positions })
                  }}
                  className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-purple-600 mt-1">
                  Enter positions separated by commas (e.g., 9,10,11,12)
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 