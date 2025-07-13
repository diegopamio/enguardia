'use client'

import React, { useState, useEffect } from 'react'
import { z } from 'zod'

// Validation schema for poule configuration
const pouleConfigurationSchema = z.object({
  numberOfPoules: z.number().min(1, 'At least 1 poule is required').max(50, 'Maximum 50 poules allowed'),
  athletesPerPoule: z.number().min(3, 'Minimum 3 athletes per poule').max(12, 'Maximum 12 athletes per poule'),
  enableClubSeparation: z.boolean().default(true),
  enableCountrySeparation: z.boolean().default(true),
  maxSameClubPerPoule: z.number().min(1, 'At least 1 athlete per club').max(6, 'Maximum 6 athletes from same club'),
  maxSameCountryPerPoule: z.number().min(1, 'At least 1 athlete per country').max(8, 'Maximum 8 athletes from same country'),
  seedingMethod: z.enum(['RANDOM', 'RANKING', 'SNAKE']).default('RANKING'),
  allowIncompletePoules: z.boolean().default(false),
  minPouleSizeForIncomplete: z.number().min(3, 'Minimum 3 athletes in incomplete poule').max(6, 'Maximum 6 athletes in incomplete poule'),
  // Optional preset data
  _presetPhases: z.any().optional(),
  _selectedPreset: z.any().optional(),
})

export type PouleConfigurationData = z.infer<typeof pouleConfigurationSchema>

interface PouleConfigurationProps {
  totalAthletes: number
  initialConfig?: Partial<PouleConfigurationData>
  onConfigChange: (config: PouleConfigurationData) => void
  onSave: (config: PouleConfigurationData) => Promise<void>
  isLoading?: boolean
}

export default function PouleConfiguration({
  totalAthletes,
  initialConfig = {},
  onConfigChange,
  onSave,
  isLoading = false
}: PouleConfigurationProps) {
  const [config, setConfig] = useState<PouleConfigurationData>({
    numberOfPoules: 0,
    athletesPerPoule: 6,
    enableClubSeparation: true,
    enableCountrySeparation: true,
    maxSameClubPerPoule: 2,
    maxSameCountryPerPoule: 4,
    seedingMethod: 'RANKING',
    allowIncompletePoules: false,
    minPouleSizeForIncomplete: 4,
    ...initialConfig
  })

  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [recommendations, setRecommendations] = useState<string[]>([])

  // Calculate optimal configuration based on total athletes
  const calculateOptimalConfig = (athletes: number) => {
    if (athletes === 0) return { numberOfPoules: 0, athletesPerPoule: 6 }
    
    // FIE standard: 6-7 athletes per poule is optimal
    const optimalPerPoule = 6
    const optimalPoules = Math.ceil(athletes / optimalPerPoule)
    
    // Adjust if we get very uneven poules
    let adjustedPerPoule = optimalPerPoule
    let adjustedPoules = optimalPoules
    
    if (athletes % optimalPoules < 3 && athletes % optimalPoules !== 0) {
      // Try 7 per poule to avoid very small last poule
      adjustedPerPoule = 7
      adjustedPoules = Math.ceil(athletes / 7)
    }
    
    return { numberOfPoules: adjustedPoules, athletesPerPoule: adjustedPerPoule }
  }

  // Update configuration when total athletes changes
  useEffect(() => {
    if (totalAthletes > 0) {
      const optimal = calculateOptimalConfig(totalAthletes)
      setConfig(prev => ({
        ...prev,
        numberOfPoules: optimal.numberOfPoules,
        athletesPerPoule: optimal.athletesPerPoule
      }))
    }
  }, [totalAthletes])

  // Generate recommendations based on current config
  useEffect(() => {
    const newRecommendations: string[] = []
    
    if (totalAthletes > 0) {
      const totalSlots = config.numberOfPoules * config.athletesPerPoule
      const remainingSlots = totalSlots - totalAthletes
      
      if (remainingSlots < 0) {
        newRecommendations.push(`⚠️ Not enough slots: ${totalSlots} slots for ${totalAthletes} athletes`)
      } else if (remainingSlots > config.numberOfPoules) {
        newRecommendations.push(`💡 Consider reducing poules or athletes per poule (${remainingSlots} empty slots)`)
      }
      
      if (config.athletesPerPoule < 5) {
        newRecommendations.push('⚠️ FIE recommends at least 5 athletes per poule for meaningful results')
      }
      
      if (config.athletesPerPoule > 8) {
        newRecommendations.push('⚠️ More than 8 athletes per poule may cause scheduling issues')
      }
      
      if (config.numberOfPoules > 20) {
        newRecommendations.push('⚠️ Large number of poules may require many pistes and referees')
      }
    }
    
    setRecommendations(newRecommendations)
  }, [config, totalAthletes])

  // Handle input changes
  const handleInputChange = (field: keyof PouleConfigurationData, value: any) => {
    const newConfig = { ...config, [field]: value }
    setConfig(newConfig)
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
    
    // Notify parent of changes
    onConfigChange(newConfig)
  }

  // Validate configuration
  const validateConfig = (): boolean => {
    try {
      pouleConfigurationSchema.parse(config)
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: { [key: string]: string } = {}
        error.errors.forEach(err => {
          if (err.path.length > 0) {
            newErrors[err.path[0]] = err.message
          }
        })
        setErrors(newErrors)
      }
      return false
    }
  }

  // Handle save
  const handleSave = async () => {
    if (validateConfig()) {
      try {
        await onSave(config)
      } catch (error) {
        console.error('Error saving poule configuration:', error)
      }
    }
  }

  // Calculate statistics
  const totalSlots = config.numberOfPoules * config.athletesPerPoule
  const emptySlots = Math.max(0, totalSlots - totalAthletes)
  const utilizationRate = totalAthletes > 0 ? ((totalAthletes / totalSlots) * 100).toFixed(1) : '0'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Poule Round Configuration</h3>
          <p className="text-sm text-gray-600">
            Configure how athletes will be distributed across poules for the preliminary round
          </p>
        </div>
        <div className="text-sm text-gray-500">
          Total Athletes: <span className="font-medium">{totalAthletes}</span>
        </div>
      </div>

      {/* Preset Information */}
      {config._selectedPreset && config._presetPhases && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">
            📋 Using Preset: {config._selectedPreset.name}
          </h4>
          <p className="text-sm text-green-800 mb-3">
            {config._selectedPreset.description}
          </p>
          
          {config._presetPhases.length > 1 && (
            <div>
              <h5 className="font-medium text-green-900 mb-2">Multiple Poule Rounds:</h5>
              <div className="space-y-2">
                {config._presetPhases.map((phase: any, index: number) => {
                  const pouleSizes = phase.pouleSizeVariations?.sizes || [7]
                  const qualificationRate = (phase.qualificationPercentage * 100).toFixed(0)
                  
                  return (
                    <div key={index} className="flex items-center justify-between bg-white rounded p-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="bg-green-600 text-white px-2 py-1 rounded text-xs">
                          Round {index + 1}
                        </span>
                        <span className="font-medium">{phase.name}</span>
                      </div>
                      <div className="flex gap-4 text-xs text-gray-600">
                        <span>Poule sizes: {pouleSizes.join(', ')}</span>
                        <span>Qualification: {qualificationRate}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-green-700 mt-2">
                💡 Currently configuring Round 1. Additional rounds will be set up automatically based on the preset.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Configuration Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Configuration Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-blue-700">Total Poules:</span>
            <span className="font-medium ml-2">{config.numberOfPoules}</span>
          </div>
          <div>
            <span className="text-blue-700">Athletes per Poule:</span>
            <span className="font-medium ml-2">{config.athletesPerPoule}</span>
          </div>
          <div>
            <span className="text-blue-700">Total Slots:</span>
            <span className="font-medium ml-2">{totalSlots}</span>
          </div>
          <div>
            <span className="text-blue-700">Utilization:</span>
            <span className="font-medium ml-2">{utilizationRate}%</span>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-900 mb-2">Recommendations</h4>
          <ul className="space-y-1 text-sm text-yellow-800">
            {recommendations.map((rec, index) => (
              <li key={index}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Configuration Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Configuration */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Basic Configuration</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Poules *
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={config.numberOfPoules}
              onChange={(e) => handleInputChange('numberOfPoules', parseInt(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.numberOfPoules ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.numberOfPoules && (
              <p className="text-red-500 text-sm mt-1">{errors.numberOfPoules}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              FIE standard: Distribute athletes evenly across poules
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Athletes per Poule *
            </label>
            <input
              type="number"
              min="3"
              max="12"
              value={config.athletesPerPoule}
              onChange={(e) => handleInputChange('athletesPerPoule', parseInt(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.athletesPerPoule ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.athletesPerPoule && (
              <p className="text-red-500 text-sm mt-1">{errors.athletesPerPoule}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              FIE recommendation: 6-7 athletes per poule for optimal competition
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seeding Method
            </label>
            <select
              value={config.seedingMethod}
              onChange={(e) => handleInputChange('seedingMethod', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              <option value="RANKING">By Ranking (Recommended)</option>
              <option value="SNAKE">Snake Seeding</option>
              <option value="RANDOM">Random Distribution</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Ranking-based seeding distributes strong fencers evenly across poules
            </p>
          </div>
        </div>

        {/* Separation Rules */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Separation Rules</h4>
          
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="enableClubSeparation"
                checked={config.enableClubSeparation}
                onChange={(e) => handleInputChange('enableClubSeparation', e.target.checked)}
                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isLoading}
              />
              <label htmlFor="enableClubSeparation" className="text-sm font-medium text-gray-700">
                Enable Club Separation
              </label>
            </div>
            
            {config.enableClubSeparation && (
              <div className="ml-7">
                <label className="block text-sm text-gray-600 mb-1">
                  Max athletes from same club per poule
                </label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={config.maxSameClubPerPoule}
                  onChange={(e) => handleInputChange('maxSameClubPerPoule', parseInt(e.target.value) || 1)}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  disabled={isLoading}
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="enableCountrySeparation"
                checked={config.enableCountrySeparation}
                onChange={(e) => handleInputChange('enableCountrySeparation', e.target.checked)}
                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isLoading}
              />
              <label htmlFor="enableCountrySeparation" className="text-sm font-medium text-gray-700">
                Enable Country Separation
              </label>
            </div>
            
            {config.enableCountrySeparation && (
              <div className="ml-7">
                <label className="block text-sm text-gray-600 mb-1">
                  Max athletes from same country per poule
                </label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={config.maxSameCountryPerPoule}
                  onChange={(e) => handleInputChange('maxSameCountryPerPoule', parseInt(e.target.value) || 1)}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  disabled={isLoading}
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="allowIncompletePoules"
                checked={config.allowIncompletePoules}
                onChange={(e) => handleInputChange('allowIncompletePoules', e.target.checked)}
                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isLoading}
              />
              <label htmlFor="allowIncompletePoules" className="text-sm font-medium text-gray-700">
                Allow Incomplete Poules
              </label>
            </div>
            
            {config.allowIncompletePoules && (
              <div className="ml-7">
                <label className="block text-sm text-gray-600 mb-1">
                  Minimum size for incomplete poule
                </label>
                <input
                  type="number"
                  min="3"
                  max="6"
                  value={config.minPouleSizeForIncomplete}
                  onChange={(e) => handleInputChange('minPouleSizeForIncomplete', parseInt(e.target.value) || 3)}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Poules smaller than this will be merged with others
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FIE Guidelines */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">📋 FIE Guidelines</h4>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Optimal poule size: 6-7 athletes for meaningful ranking</li>
          <li>• Minimum poule size: 5 athletes (4 acceptable for small competitions)</li>
          <li>• Maximum poule size: 8 athletes (to avoid excessive bout time)</li>
          <li>• Separate athletes from same club/country when possible</li>
          <li>• Use ranking-based seeding to ensure competitive balance</li>
          <li>• Consider venue capacity when determining number of poules</li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={() => onConfigChange(config)}
          disabled={isLoading}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isLoading || Object.keys(errors).length > 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  )
} 