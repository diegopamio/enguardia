import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, notify } from '@/lib/notifications'

// Types
export interface CompetitionRegistration {
  id: string
  competitionId: string
  athleteId: string
  seedNumber?: number
  isPresent: boolean
  status: 'REGISTERED' | 'CHECKED_IN' | 'WITHDRAWN' | 'DISQUALIFIED'
  registeredAt: string
  athlete: {
    id: string
    firstName: string
    lastName: string
    dateOfBirth?: string
    nationality?: string
    fieId?: string
    weapons: Array<{ weapon: string }>
    clubs: Array<{
      club: {
        id: string
        name: string
        city: string
        country: string
      }
    }>
    organizations: Array<{
      organization: {
        id: string
        name: string
      }
    }>
  }
}

export interface RegistrationFilters {
  status?: string
  limit?: number
  offset?: number
}

export interface BulkRegistrationData {
  athleteIds: string[]
  isPresent?: boolean
  status?: 'REGISTERED' | 'CHECKED_IN' | 'WITHDRAWN' | 'DISQUALIFIED'
}

export interface UpdateRegistrationData {
  seedNumber?: number
  isPresent?: boolean
  status?: 'REGISTERED' | 'CHECKED_IN' | 'WITHDRAWN' | 'DISQUALIFIED'
}

// Query key factory
const competitionRegistrationKeys = {
  all: ['competitionRegistrations'] as const,
  byCompetition: (competitionId: string) => [...competitionRegistrationKeys.all, competitionId] as const,
  filtered: (competitionId: string, filters: RegistrationFilters) => [...competitionRegistrationKeys.byCompetition(competitionId), filters] as const,
  individual: (competitionId: string, athleteId: string) => [...competitionRegistrationKeys.byCompetition(competitionId), athleteId] as const,
}

// Hook to fetch competition registrations
export function useCompetitionRegistrations(competitionId: string, filters: RegistrationFilters = {}) {
  return useQuery({
    queryKey: competitionRegistrationKeys.filtered(competitionId, filters),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.limit) params.append('limit', filters.limit.toString())
      if (filters.offset) params.append('offset', filters.offset.toString())

      const response = await apiFetch<{
        registrations: CompetitionRegistration[]
        competition: {
          id: string
          name: string
          weapon: string
          category: string
        }
        pagination: {
          total: number
          limit: number
          offset: number
          hasMore: boolean
        }
      }>(`/api/competitions/${competitionId}/registrations?${params}`)
      return response
    },
    enabled: !!competitionId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Hook to fetch individual registration
export function useCompetitionRegistration(competitionId: string, athleteId: string) {
  return useQuery({
    queryKey: competitionRegistrationKeys.individual(competitionId, athleteId),
    queryFn: async () => {
      const response = await apiFetch<CompetitionRegistration>(`/api/competitions/${competitionId}/registrations/${athleteId}`)
      return response
    },
    enabled: !!competitionId && !!athleteId,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 3 * 60 * 1000, // 3 minutes
  })
}

// Hook to register athlete(s) for competition
export function useRegisterAthlete() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ competitionId, athleteId, seedNumber, isPresent = true, status = 'REGISTERED' }: {
      competitionId: string
      athleteId: string
      seedNumber?: number
      isPresent?: boolean
      status?: 'REGISTERED' | 'CHECKED_IN' | 'WITHDRAWN' | 'DISQUALIFIED'
    }) => {
      const response = await apiFetch<CompetitionRegistration>(`/api/competitions/${competitionId}/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteId, seedNumber, isPresent, status }),
      })
      return response
    },
    onSuccess: (data, variables) => {
      notify.success('Athlete registered successfully')
      // Invalidate and refetch competition registrations
      queryClient.invalidateQueries({
        queryKey: competitionRegistrationKeys.byCompetition(variables.competitionId)
      })
      // Also invalidate competitions query to update participant counts
      queryClient.invalidateQueries({ queryKey: ['competitions'] })
    },
    onError: (error) => {
      console.error('Failed to register athlete:', error)
      notify.error(error instanceof Error ? error.message : 'Failed to register athlete')
    },
  })
}

// Hook to register multiple athletes for competition
export function useBulkRegisterAthletes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ competitionId, ...data }: { competitionId: string } & BulkRegistrationData) => {
      const response = await apiFetch<{
        message: string
        registered: number
        skipped: number
      }>(`/api/competitions/${competitionId}/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return response
    },
    onSuccess: (data, variables) => {
      notify.success(data.message)
      // Invalidate and refetch competition registrations
      queryClient.invalidateQueries({
        queryKey: competitionRegistrationKeys.byCompetition(variables.competitionId)
      })
      // Also invalidate competitions query to update participant counts
      queryClient.invalidateQueries({ queryKey: ['competitions'] })
    },
    onError: (error) => {
      console.error('Failed to register athletes:', error)
      notify.error(error instanceof Error ? error.message : 'Failed to register athletes')
    },
  })
}

// Hook to update registration
export function useUpdateRegistration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ competitionId, athleteId, ...data }: {
      competitionId: string
      athleteId: string
    } & UpdateRegistrationData) => {
      const response = await apiFetch<CompetitionRegistration>(`/api/competitions/${competitionId}/registrations/${athleteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return response
    },
    onMutate: async ({ competitionId, athleteId, ...updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: competitionRegistrationKeys.byCompetition(competitionId)
      })

      // Snapshot previous value
      const previousRegistrations = queryClient.getQueryData(
        competitionRegistrationKeys.filtered(competitionId, {})
      )

      // Optimistically update cache
      queryClient.setQueryData(
        competitionRegistrationKeys.filtered(competitionId, {}),
        (old: any) => {
          if (!old?.registrations) return old
          return {
            ...old,
            registrations: old.registrations.map((reg: CompetitionRegistration) =>
              reg.athleteId === athleteId ? { ...reg, ...updates } : reg
            )
          }
        }
      )

      return { previousRegistrations, competitionId, athleteId }
    },
    onSuccess: (data, variables) => {
      notify.success('Registration updated successfully')
      // Invalidate individual registration query
      queryClient.invalidateQueries({
        queryKey: competitionRegistrationKeys.individual(variables.competitionId, variables.athleteId)
      })
    },
    onError: (error, variables, context) => {
      console.error('Failed to update registration:', error)
      notify.error(error instanceof Error ? error.message : 'Failed to update registration')
      
      // Rollback optimistic update
      if (context?.previousRegistrations) {
        queryClient.setQueryData(
          competitionRegistrationKeys.filtered(context.competitionId, {}),
          context.previousRegistrations
        )
      }
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({
        queryKey: competitionRegistrationKeys.byCompetition(variables.competitionId)
      })
    },
  })
}

// Hook to unregister athlete from competition
export function useUnregisterAthlete() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ competitionId, athleteId }: {
      competitionId: string
      athleteId: string
    }) => {
      const response = await apiFetch<{ message: string }>(`/api/competitions/${competitionId}/registrations/${athleteId}`, {
        method: 'DELETE',
      })
      return response
    },
    onMutate: async ({ competitionId, athleteId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: competitionRegistrationKeys.byCompetition(competitionId)
      })

      // Snapshot previous value
      const previousRegistrations = queryClient.getQueryData(
        competitionRegistrationKeys.filtered(competitionId, {})
      )

      // Optimistically remove from cache
      queryClient.setQueryData(
        competitionRegistrationKeys.filtered(competitionId, {}),
        (old: any) => {
          if (!old?.registrations) return old
          return {
            ...old,
            registrations: old.registrations.filter((reg: CompetitionRegistration) => reg.athleteId !== athleteId),
            pagination: {
              ...old.pagination,
              total: old.pagination.total - 1
            }
          }
        }
      )

      return { previousRegistrations, competitionId, athleteId }
    },
    onSuccess: (data, variables) => {
      notify.success(data.message)
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: competitionRegistrationKeys.byCompetition(variables.competitionId)
      })
      // Also invalidate competitions query to update participant counts
      queryClient.invalidateQueries({ queryKey: ['competitions'] })
    },
    onError: (error, variables, context) => {
      console.error('Failed to unregister athlete:', error)
      notify.error(error instanceof Error ? error.message : 'Failed to unregister athlete')
      
      // Rollback optimistic update
      if (context?.previousRegistrations) {
        queryClient.setQueryData(
          competitionRegistrationKeys.filtered(context.competitionId, {}),
          context.previousRegistrations
        )
      }
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({
        queryKey: competitionRegistrationKeys.byCompetition(variables.competitionId)
      })
    },
  })
}

// Hook to bulk update presence status
export function useBulkUpdatePresence() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ competitionId, athleteIds, isPresent }: {
      competitionId: string
      athleteIds: string[]
      isPresent: boolean
    }) => {
      // Update each registration individually
      const promises = athleteIds.map(athleteId =>
        apiFetch(`/api/competitions/${competitionId}/registrations/${athleteId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isPresent }),
        })
      )
      
      const results = await Promise.allSettled(promises)
      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length
      
      return { successful, failed, total: athleteIds.length }
    },
    onSuccess: (data, variables) => {
      const message = data.failed > 0 
        ? `Updated ${data.successful} athletes, ${data.failed} failed`
        : `Successfully updated presence for ${data.successful} athletes`
      
      if (data.failed === 0) {
        notify.success(message)
      } else {
        notify.warning(message)
      }
      
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: competitionRegistrationKeys.byCompetition(variables.competitionId)
      })
    },
    onError: (error) => {
      console.error('Failed to update presence:', error)
      notify.error(error instanceof Error ? error.message : 'Failed to update presence')
    },
  })
} 