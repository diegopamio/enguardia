/**
 * Preset Selector Component
 * 
 * Allows users to select from built-in presets or organization-specific presets
 * Provides feature parity with Engarde's preset selection dialog
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Copy, Edit, Trash2, Plus, Star, Users, Trophy, Zap } from 'lucide-react'
import { FormulaTemplate } from '@/lib/tournament/types'
import { Weapon } from '@prisma/client'
import { notify } from '@/lib/notifications'

interface PresetSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelectPreset: (preset: FormulaTemplate) => void
  currentWeapon?: Weapon
  currentCategory?: string
  totalAthletes?: number
}

interface PresetsByCategory {
  builtIn: Record<string, FormulaTemplate[]>
  organization: FormulaTemplate[]
}

export default function PresetSelector({
  isOpen,
  onClose,
  onSelectPreset,
  currentWeapon,
  currentCategory,
  totalAthletes = 0
}: PresetSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPreset, setSelectedPreset] = useState<FormulaTemplate | null>(null)
  const [activeTab, setActiveTab] = useState('built-in')

  // Fetch presets organized by category
  const { data: presetData, isLoading, refetch } = useQuery<PresetsByCategory>({
    queryKey: ['formula-presets', 'by-category'],
    queryFn: async () => {
      const response = await fetch('/api/formula-presets?byCategory=true')
      if (!response.ok) throw new Error('Failed to fetch presets')
      const data = await response.json()
      return data.presets
    }
  })

  // Search presets
  const { data: searchResults } = useQuery<FormulaTemplate[]>({
    queryKey: ['formula-presets', 'search', searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim()) return []
      const response = await fetch(`/api/formula-presets?search=${encodeURIComponent(searchTerm)}`)
      if (!response.ok) throw new Error('Failed to search presets')
      const data = await response.json()
      return data.presets
    },
    enabled: searchTerm.trim().length > 0
  })

  const handleSelectPreset = (preset: FormulaTemplate) => {
    onSelectPreset(preset)
    onClose()
  }

  const handleDuplicatePreset = async (preset: FormulaTemplate) => {
    try {
      const newName = `${preset.name} (Copy)`
      const response = await fetch(`/api/formula-presets/${preset.id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      })

      if (!response.ok) throw new Error('Failed to duplicate preset')
      
      notify.success('Preset duplicated successfully')
      refetch()
    } catch (error) {
      notify.error('Failed to duplicate preset')
    }
  }

  const getPresetIcon = (preset: FormulaTemplate) => {
    if (preset.organizationId) return <Users className="w-4 h-4" />
    
    // Built-in preset icons based on name
    if (preset.name.includes('FIE') || preset.name.includes('World Cup')) {
      return <Trophy className="w-4 h-4 text-yellow-500" />
    }
    if (preset.name.includes('Club')) {
      return <Users className="w-4 h-4 text-blue-500" />
    }
    if (preset.name.includes('Direct Elimination')) {
      return <Zap className="w-4 h-4 text-red-500" />
    }
    return <Star className="w-4 h-4 text-gray-500" />
  }

  const getPresetBadges = (preset: FormulaTemplate) => {
    const badges = []
    
    if (preset.weapon) {
      badges.push(
        <Badge key="weapon" variant="secondary" className="text-xs">
          {preset.weapon}
        </Badge>
      )
    }
    
    if (preset.category) {
      badges.push(
        <Badge key="category" variant="outline" className="text-xs">
          {preset.category}
        </Badge>
      )
    }
    
    if (preset.isPublic) {
      badges.push(
        <Badge key="public" variant="default" className="text-xs">
          Public
        </Badge>
      )
    }
    
    if (!preset.organizationId) {
      badges.push(
        <Badge key="built-in" variant="default" className="text-xs bg-green-100 text-green-800">
          Built-in
        </Badge>
      )
    }
    
    return badges
  }

  const getPhasesSummary = (preset: FormulaTemplate) => {
    const phases = preset.phases || []
    const summary = phases.map(phase => {
      switch (phase.phaseType) {
        case 'POULE':
          return 'Poules'
        case 'DIRECT_ELIMINATION':
          return 'DE'
        case 'CLASSIFICATION':
          return 'Classification'
        case 'REPECHAGE':
          return 'Repechage'
        default:
          return phase.name
      }
    }).join(' → ')
    
    return summary || 'No phases'
  }

  const PresetCard = ({ preset }: { preset: FormulaTemplate }) => (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getPresetIcon(preset)}
            <CardTitle className="text-sm font-medium">{preset.name}</CardTitle>
          </div>
          <div className="flex gap-1">
            {!preset.organizationId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDuplicatePreset(preset)
                }}
                className="h-6 w-6 p-0"
              >
                <Copy className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {getPresetBadges(preset)}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <CardDescription className="text-xs mb-2">
          {preset.description || 'No description'}
        </CardDescription>
        <div className="text-xs text-gray-500 mb-3">
          {getPhasesSummary(preset)}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => handleSelectPreset(preset)}
          >
            Use This Formula
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedPreset(preset)}
          >
            Preview
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const renderBuiltInPresets = () => {
    if (!presetData?.builtIn) return null

    return (
      <div className="space-y-6">
        {Object.entries(presetData.builtIn).map(([category, presets]) => (
          <div key={category}>
            <h3 className="text-lg font-semibold mb-3 capitalize">
              {category.replace('_', ' ').toLowerCase()}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {presets.map((preset) => (
                <PresetCard key={preset.id} preset={preset} />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderOrganizationPresets = () => {
    if (!presetData?.organization?.length) {
      return (
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Custom Presets Yet
          </h3>
          <p className="text-gray-500 mb-4">
            Create your own formula presets to reuse across tournaments
          </p>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create First Preset
          </Button>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {presetData.organization.map((preset) => (
          <PresetCard key={preset.id} preset={preset} />
        ))}
      </div>
    )
  }

  const renderSearchResults = () => {
    if (!searchResults?.length) {
      return (
        <div className="text-center py-8">
          <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No presets found matching your search</p>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {searchResults.map((preset) => (
          <PresetCard key={preset.id} preset={preset} />
        ))}
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Select Tournament Formula</DialogTitle>
          <DialogDescription>
            Choose from built-in formulas or your organization's custom presets
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search presets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 h-[500px]">
            {searchTerm.trim() ? (
              renderSearchResults()
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="built-in">Built-in Formulas</TabsTrigger>
                  <TabsTrigger value="organization">My Organization</TabsTrigger>
                </TabsList>
                
                <TabsContent value="built-in" className="mt-4">
                  {renderBuiltInPresets()}
                </TabsContent>
                
                <TabsContent value="organization" className="mt-4">
                  {renderOrganizationPresets()}
                </TabsContent>
              </Tabs>
            )}
          </ScrollArea>
        </div>

        {/* Preset Preview Modal */}
        {selectedPreset && (
          <Dialog open={!!selectedPreset} onOpenChange={() => setSelectedPreset(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{selectedPreset.name}</DialogTitle>
                <DialogDescription>
                  {selectedPreset.description || 'No description'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {getPresetBadges(selectedPreset)}
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Tournament Phases:</h4>
                  <div className="space-y-2">
                    {selectedPreset.phases.map((phase, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <Badge variant="outline">{index + 1}</Badge>
                        <span className="font-medium">{phase.name}</span>
                        <span className="text-gray-500">({phase.phaseType})</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button 
                    className="flex-1"
                    onClick={() => {
                      handleSelectPreset(selectedPreset)
                      setSelectedPreset(null)
                    }}
                  >
                    Use This Formula
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setSelectedPreset(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  )
} 