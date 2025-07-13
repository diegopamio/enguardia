/**
 * Formula Presets Management Page
 * 
 * Allows organization administrators to manage their custom formula presets
 */

'use client'

import React, { useState } from 'react'
import { useFormulaPresetsByCategory, useDeleteFormulaPreset, useDuplicateFormulaPreset } from '@/hooks/useFormulaPresets'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Copy, 
  Star, 
  Users, 
  Trophy, 
  Zap,
  MoreHorizontal
} from 'lucide-react'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { FormulaTemplate } from '@/lib/tournament/types'
import { notify } from '@/lib/notifications'

export default function FormulaPresetsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPreset, setSelectedPreset] = useState<FormulaTemplate | null>(null)
  
  const { data: presetData, isLoading, refetch } = useFormulaPresetsByCategory()
  const deletePreset = useDeleteFormulaPreset()
  const duplicatePreset = useDuplicateFormulaPreset()

  const handleDeletePreset = async (preset: FormulaTemplate) => {
    if (!preset.organizationId) {
      notify.error('Cannot delete built-in presets')
      return
    }

    if (confirm(`Are you sure you want to delete "${preset.name}"?`)) {
      try {
        await deletePreset.mutateAsync(preset.id)
        refetch()
      } catch (error) {
        // Error handled by hook
      }
    }
  }

  const handleDuplicatePreset = async (preset: FormulaTemplate) => {
    try {
      const newName = `${preset.name} (Copy)`
      await duplicatePreset.mutateAsync({
        id: preset.id,
        name: newName
      })
      refetch()
    } catch (error) {
      // Error handled by hook
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
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getPresetIcon(preset)}
            <CardTitle className="text-sm font-medium">{preset.name}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleDuplicatePreset(preset)}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              {preset.organizationId && (
                <>
                  <DropdownMenuItem>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleDeletePreset(preset)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {getPresetBadges(preset)}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <CardDescription className="text-xs mb-2">
          {preset.description || 'No description'}
        </CardDescription>
        <div className="text-xs text-gray-500">
          {getPhasesSummary(preset)}
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
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            No Custom Presets Yet
          </h3>
          <p className="text-gray-500 mb-6">
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
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Your Organization's Presets</h3>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create New Preset
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {presetData.organization.map((preset) => (
            <PresetCard key={preset.id} preset={preset} />
          ))}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Formula Presets
        </h1>
        <p className="text-gray-600">
          Manage tournament formula presets for your organization
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search presets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Content */}
      <Tabs defaultValue="built-in" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="built-in">Built-in Formulas</TabsTrigger>
          <TabsTrigger value="organization">My Organization</TabsTrigger>
        </TabsList>
        
        <TabsContent value="built-in">
          {renderBuiltInPresets()}
        </TabsContent>
        
        <TabsContent value="organization">
          {renderOrganizationPresets()}
        </TabsContent>
      </Tabs>
    </div>
  )
} 