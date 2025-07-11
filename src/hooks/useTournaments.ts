import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, notify } from '@/lib/notifications'

// Types
export interface Tournament {
  id: string
  name: string
  description?: string | null
  startDate: string
  endDate: string
  location: string
  isActive: boolean
  organizationId: string
  organization: { id: string; name: string }
  competitions?: Array<{
    id: string
    name: string
    weapon: 'EPEE' | 'FOIL' | 'SABRE'
    category: string
  }>
  _count?: {
    competitions: number
  }
}

export interface TournamentFilters {
  search?: string
  organizationId?: string
  isActive?: boolean
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

export interface CreateTournamentData {
  name: string
  description?: string | null
  startDate: string
  endDate: string
  location: string
  isActive?: boolean
  organizationId?: string
}

export interface UpdateTournamentData extends CreateTournamentData {
  id: string
}

// Query keys factory
export const tournamentKeys = {
  all: ['tournaments'] as const,
  lists: () => [...tournamentKeys.all, 'list'] as const,
  list: (filters: TournamentFilters) => [...tournamentKeys.lists(), filters] as const,
  details: () => [...tournamentKeys.all, 'detail'] as const,
  detail: (id: string) => [...tournamentKeys.details(), id] as const,
  competitions: (tournamentId: string) => [...tournamentKeys.all, 'competitions', tournamentId] as const,
}

// Hooks

/**
 * Hook to fetch tournaments with optional filtering
 */
export function useTournaments(filters: TournamentFilters = {}) {
  return useQuery({
    queryKey: tournamentKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.search) params.append('search', filters.search)
      if (filters.organizationId) params.append('organizationId', filters.organizationId)
      if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString())
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.limit) params.append('limit', filters.limit.toString())
      if (filters.offset) params.append('offset', filters.offset.toString())

      const response = await apiFetch(`/api/tournaments?${params.toString()}`)
      return response.json()
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
  })
}

/**
 * Hook to fetch a single tournament by ID
 */
export function useTournament(id: string) {
  return useQuery({
    queryKey: tournamentKeys.detail(id),
    queryFn: async () => {
      const response = await apiFetch(`/api/tournaments/${id}`)
      return response.json()
    },
    enabled: !!id,
  })
}

/**
 * Hook to create a new tournament
 */
export function useCreateTournament() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateTournamentData) => {
      const response = await apiFetch('/api/tournaments', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      return response.json()
    },
    onSuccess: () => {
      // Invalidate tournaments lists to refetch
      queryClient.invalidateQueries({ queryKey: tournamentKeys.lists() })
      notify.success('Tournament created successfully')
    },
    onError: (error: any) => {
      notify.error(error?.message || 'Failed to create tournament')
    },
  })
}

/**
 * Hook to update a tournament
 */
export function useUpdateTournament() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateTournamentData) => {
      const { id, ...updateData } = data
      const response = await apiFetch(`/api/tournaments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })
      return response.json()
    },
    onMutate: async (data) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: tournamentKeys.detail(data.id) })

      // Snapshot the previous value
      const previousTournament = queryClient.getQueryData(tournamentKeys.detail(data.id))

      // Optimistically update to the new value
      queryClient.setQueryData(tournamentKeys.detail(data.id), (old: any) => ({
        ...old,
        ...data,
      }))

      return { previousTournament }
    },
    onError: (error: any, data, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousTournament) {
        queryClient.setQueryData(tournamentKeys.detail(data.id), context.previousTournament)
      }
      notify.error(error?.message || 'Failed to update tournament')
    },
    onSuccess: (updatedTournament, data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: tournamentKeys.lists() })
      queryClient.setQueryData(tournamentKeys.detail(data.id), updatedTournament)
      notify.success('Tournament updated successfully')
    },
  })
}

/**
 * Hook to delete a tournament
 */
export function useDeleteTournament() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiFetch(`/api/tournaments/${id}`, {
        method: 'DELETE',
      })
      return response.json()
    },
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: tournamentKeys.detail(id) })
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: tournamentKeys.lists() })
      notify.success('Tournament deleted successfully')
    },
    onError: (error: any) => {
      notify.error(error?.message || 'Failed to delete tournament')
    },
  })
}

/**
 * Hook to fetch competitions for a tournament
 */
export function useTournamentCompetitions(tournamentId: string) {
  return useQuery({
    queryKey: tournamentKeys.competitions(tournamentId),
    queryFn: async () => {
      const response = await apiFetch(`/api/competitions?tournamentId=${tournamentId}`)
      return response.json()
    },
    enabled: !!tournamentId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
} 