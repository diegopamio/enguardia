/**
 * useFormulaPresets Hook
 * 
 * Provides React Query hooks for managing formula presets
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FormulaTemplate } from '@/lib/tournament/types'
import { Weapon } from '@prisma/client'
import { notify } from '@/lib/notifications'

interface PresetFilters {
  weapon?: Weapon
  category?: string
  isPublic?: boolean
  includeBuiltIn?: boolean
  search?: string
}

interface PresetCreateData {
  name: string
  description?: string
  weapon?: Weapon
  category?: string
  phases: any[]
  isPublic?: boolean
}

interface PresetUpdateData {
  name?: string
  description?: string
  weapon?: Weapon
  category?: string
  phases?: any[]
  isPublic?: boolean
}

export function useFormulaPresets(filters: PresetFilters = {}) {
  const queryClient = useQueryClient()

  // Build query string
  const queryParams = new URLSearchParams()
  if (filters.weapon) queryParams.set('weapon', filters.weapon)
  if (filters.category) queryParams.set('category', filters.category)
  if (filters.isPublic !== undefined) queryParams.set('isPublic', filters.isPublic.toString())
  if (filters.includeBuiltIn !== undefined) queryParams.set('includeBuiltIn', filters.includeBuiltIn.toString())
  if (filters.search) queryParams.set('search', filters.search)

  return useQuery<FormulaTemplate[]>({
    queryKey: ['formula-presets', filters],
    queryFn: async () => {
      const response = await fetch(`/api/formula-presets?${queryParams.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch presets')
      const data = await response.json()
      return data.presets
    }
  })
}

export function useFormulaPresetsByCategory() {
  return useQuery<{
    builtIn: Record<string, FormulaTemplate[]>
    organization: FormulaTemplate[]
  }>({
    queryKey: ['formula-presets', 'by-category'],
    queryFn: async () => {
      const response = await fetch('/api/formula-presets?byCategory=true')
      if (!response.ok) throw new Error('Failed to fetch presets')
      const data = await response.json()
      return data.presets
    }
  })
}

export function useFormulaPreset(id: string) {
  return useQuery<FormulaTemplate>({
    queryKey: ['formula-presets', id],
    queryFn: async () => {
      const response = await fetch(`/api/formula-presets/${id}`)
      if (!response.ok) throw new Error('Failed to fetch preset')
      const data = await response.json()
      return data.preset
    },
    enabled: !!id
  })
}

export function useCreateFormulaPreset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: PresetCreateData) => {
      const response = await fetch('/api/formula-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create preset')
      }

      const result = await response.json()
      return result.preset
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formula-presets'] })
      notify.success('Preset created successfully')
    },
    onError: (error: Error) => {
      notify.error(error.message)
    }
  })
}

export function useUpdateFormulaPreset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PresetUpdateData }) => {
      const response = await fetch(`/api/formula-presets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update preset')
      }

      const result = await response.json()
      return result.preset
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['formula-presets'] })
      queryClient.invalidateQueries({ queryKey: ['formula-presets', id] })
      notify.success('Preset updated successfully')
    },
    onError: (error: Error) => {
      notify.error(error.message)
    }
  })
}

export function useDeleteFormulaPreset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/formula-presets/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete preset')
      }

      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formula-presets'] })
      notify.success('Preset deleted successfully')
    },
    onError: (error: Error) => {
      notify.error(error.message)
    }
  })
}

export function useDuplicateFormulaPreset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      name,
      description,
      isPublic,
      weapon,
      category
    }: {
      id: string
      name: string
      description?: string
      isPublic?: boolean
      weapon?: Weapon
      category?: string
    }) => {
      const response = await fetch(`/api/formula-presets/${id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, isPublic, weapon, category })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to duplicate preset')
      }

      const result = await response.json()
      return result.preset
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formula-presets'] })
      notify.success('Preset duplicated successfully')
    },
    onError: (error: Error) => {
      notify.error(error.message)
    }
  })
}

export function useSearchFormulaPresets(query: string) {
  return useQuery<FormulaTemplate[]>({
    queryKey: ['formula-presets', 'search', query],
    queryFn: async () => {
      if (!query.trim()) return []
      
      const response = await fetch(`/api/formula-presets?search=${encodeURIComponent(query)}`)
      if (!response.ok) throw new Error('Failed to search presets')
      const data = await response.json()
      return data.presets
    },
    enabled: query.trim().length > 0
  })
} 