import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, notify } from '@/lib/notifications'

// Types
export interface Competition {
  id: string
  name: string
  weapon: 'EPEE' | 'FOIL' | 'SABRE'
  category: string
  description?: string | null
  startDate: string
  endDate?: string | null
  maxParticipants?: number | null
  registrationDeadline?: string | null
  isActive: boolean
  tournamentId: string
  tournament: { id: string; name: string; location: string }
  _count?: {
    registrations: number
  }
}

export interface CompetitionFilters {
  search?: string
  tournamentId?: string
  weapon?: 'EPEE' | 'FOIL' | 'SABRE'
  category?: string
  isActive?: boolean
  limit?: number
  offset?: number
}

export interface CreateCompetitionData {
  name: string
  weapon: 'EPEE' | 'FOIL' | 'SABRE'
  category: string
  description?: string | null
  startDate: string
  endDate?: string | null
  maxParticipants?: number | null
  registrationDeadline?: string | null
  isActive?: boolean
  tournamentId: string
}

export interface UpdateCompetitionData extends CreateCompetitionData {
  id: string
}

// Query keys factory
export const competitionKeys = {
  all: ['competitions'] as const,
  lists: () => [...competitionKeys.all, 'list'] as const,
  list: (filters: CompetitionFilters) => [...competitionKeys.lists(), filters] as const,
  details: () => [...competitionKeys.all, 'detail'] as const,
  detail: (id: string) => [...competitionKeys.details(), id] as const,
}

// Hooks

/**
 * Hook to fetch competitions with optional filtering
 */
export function useCompetitions(filters: CompetitionFilters = {}) {
  return useQuery({
    queryKey: competitionKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.search) params.append('search', filters.search)
      if (filters.tournamentId) params.append('tournamentId', filters.tournamentId)
      if (filters.weapon) params.append('weapon', filters.weapon)
      if (filters.category) params.append('category', filters.category)
      if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString())
      if (filters.limit) params.append('limit', filters.limit.toString())
      if (filters.offset) params.append('offset', filters.offset.toString())

      const response = await apiFetch(`/api/competitions?${params.toString()}`)
      return response.json()
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Hook to fetch a single competition by ID
 */
export function useCompetition(id: string) {
  return useQuery({
    queryKey: competitionKeys.detail(id),
    queryFn: async () => {
      const response = await apiFetch(`/api/competitions/${id}`)
      return response.json()
    },
    enabled: !!id,
  })
}

/**
 * Hook to create a new competition
 */
export function useCreateCompetition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateCompetitionData) => {
      const response = await apiFetch('/api/competitions', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      return response.json()
    },
    onSuccess: (newCompetition) => {
      // Invalidate competitions lists to refetch
      queryClient.invalidateQueries({ queryKey: competitionKeys.lists() })
      // Also invalidate tournament competitions if we have the tournamentId
      if (newCompetition.tournamentId) {
        queryClient.invalidateQueries({ 
          queryKey: ['tournaments', 'competitions', newCompetition.tournamentId] 
        })
      }
      notify.success('Competition created successfully')
    },
    onError: (error: any) => {
      notify.error(error?.message || 'Failed to create competition')
    },
  })
}

/**
 * Hook to update a competition
 */
export function useUpdateCompetition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateCompetitionData) => {
      const { id, ...updateData } = data
      const response = await apiFetch(`/api/competitions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })
      return response.json()
    },
    onMutate: async (data) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: competitionKeys.detail(data.id) })

      // Snapshot the previous value
      const previousCompetition = queryClient.getQueryData(competitionKeys.detail(data.id))

      // Optimistically update to the new value
      queryClient.setQueryData(competitionKeys.detail(data.id), (old: any) => ({
        ...old,
        ...data,
      }))

      return { previousCompetition }
    },
    onError: (error: any, data, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousCompetition) {
        queryClient.setQueryData(competitionKeys.detail(data.id), context.previousCompetition)
      }
      notify.error(error?.message || 'Failed to update competition')
    },
    onSuccess: (updatedCompetition, data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: competitionKeys.lists() })
      queryClient.setQueryData(competitionKeys.detail(data.id), updatedCompetition)
      // Also invalidate tournament competitions
      if (updatedCompetition.tournamentId) {
        queryClient.invalidateQueries({ 
          queryKey: ['tournaments', 'competitions', updatedCompetition.tournamentId] 
        })
      }
      notify.success('Competition updated successfully')
    },
  })
}

/**
 * Hook to delete a competition
 */
export function useDeleteCompetition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiFetch(`/api/competitions/${id}`, {
        method: 'DELETE',
      })
      return response.json()
    },
    onSuccess: (result, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: competitionKeys.detail(id) })
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: competitionKeys.lists() })
      // Also invalidate tournament competitions if we know the tournamentId
      if (result?.tournamentId) {
        queryClient.invalidateQueries({ 
          queryKey: ['tournaments', 'competitions', result.tournamentId] 
        })
      }
      notify.success('Competition deleted successfully')
    },
    onError: (error: any) => {
      notify.error(error?.message || 'Failed to delete competition')
    },
  })
} 