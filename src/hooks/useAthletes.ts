import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, notify } from '@/lib/notifications'

// Types
export interface Athlete {
  id: string
  firstName: string
  lastName: string
  dateOfBirth?: string | null
  nationality?: string | null
  fieId?: string | null
  isActive: boolean
  weapons: Array<{ weapon: 'EPEE' | 'FOIL' | 'SABRE' }>
  organizations: Array<{
    organization: { id: string; name: string }
    membershipType: string
    status: string
  }>
  clubs: Array<{
    club: { id: string; name: string; city: string; country: string; imageUrl?: string | null }
    membershipType: string
    status: string
    isPrimary: boolean
  }>
  globalRankings?: Array<{ rank: number; season: string }>
  _count?: { competitionRegistrations: number }
}

export interface AthleteFilters {
  search?: string
  organizationId?: string
  clubId?: string
  weapon?: string
  limit?: number
  offset?: number
}

export interface CreateAthleteData {
  firstName: string
  lastName: string
  dateOfBirth?: string | null
  nationality?: string | null
  fieId?: string | null
  isActive?: boolean
  weapons?: Array<'EPEE' | 'FOIL' | 'SABRE'>
  organizationId?: string | null
  clubId?: string | null
}

export interface UpdateAthleteData extends CreateAthleteData {
  id: string
}

export interface AffiliationOperation {
  athleteIds: string[]
  operation: 'add' | 'remove' | 'update'
  type: 'organization' | 'club'
  targetId: string
  membershipType?: string
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  isPrimary?: boolean
}

export interface TransferAthleteData {
  athleteId: string
  fromOrganizationId: string
  toOrganizationId: string
  membershipType?: 'MEMBER' | 'GUEST' | 'VISITING_ATHLETE'
  transferClubs?: boolean
}

// Query keys factory
export const athleteKeys = {
  all: ['athletes'] as const,
  lists: () => [...athleteKeys.all, 'list'] as const,
  list: (filters: AthleteFilters) => [...athleteKeys.lists(), filters] as const,
  details: () => [...athleteKeys.all, 'detail'] as const,
  detail: (id: string) => [...athleteKeys.details(), id] as const,
  affiliations: (athleteId: string) => [...athleteKeys.all, 'affiliations', athleteId] as const,
}

// Hooks

/**
 * Hook to fetch athletes with optional filtering
 */
export function useAthletes(filters: AthleteFilters = {}) {
  return useQuery({
    queryKey: athleteKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.search) params.append('search', filters.search)
      if (filters.organizationId) params.append('organizationId', filters.organizationId)
      if (filters.clubId) params.append('clubId', filters.clubId)
      if (filters.weapon) params.append('weapon', filters.weapon)
      if (filters.limit) params.append('limit', filters.limit.toString())
      if (filters.offset) params.append('offset', filters.offset.toString())

      const response = await apiFetch(`/api/athletes?${params.toString()}`)
      return response.json()
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Hook to fetch a single athlete by ID
 */
export function useAthlete(id: string) {
  return useQuery({
    queryKey: athleteKeys.detail(id),
    queryFn: async () => {
      const response = await apiFetch(`/api/athletes/${id}`)
      return response.json()
    },
    enabled: !!id,
  })
}

/**
 * Hook to fetch athlete affiliations history
 */
export function useAthleteAffiliations(athleteId: string) {
  return useQuery({
    queryKey: athleteKeys.affiliations(athleteId),
    queryFn: async () => {
      const response = await apiFetch(`/api/athletes/affiliations?athleteId=${athleteId}`)
      return response.json()
    },
    enabled: !!athleteId,
  })
}

/**
 * Hook to create a new athlete
 */
export function useCreateAthlete() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateAthleteData) => {
      const response = await apiFetch('/api/athletes', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      return response.json()
    },
    onSuccess: (newAthlete) => {
      // Invalidate athletes lists to refetch
      queryClient.invalidateQueries({ queryKey: athleteKeys.lists() })
      notify.success('Athlete created successfully')
    },
    onError: (error: any) => {
      notify.error(error?.message || 'Failed to create athlete')
    },
  })
}

/**
 * Hook to update an athlete
 */
export function useUpdateAthlete() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateAthleteData) => {
      const { id, ...updateData } = data
      const response = await apiFetch(`/api/athletes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })
      return response.json()
    },
    onMutate: async (data) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: athleteKeys.detail(data.id) })

      // Snapshot the previous value
      const previousAthlete = queryClient.getQueryData(athleteKeys.detail(data.id))

      // Optimistically update to the new value
      queryClient.setQueryData(athleteKeys.detail(data.id), (old: any) => ({
        ...old,
        ...data,
      }))

      return { previousAthlete }
    },
    onError: (error: any, data, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousAthlete) {
        queryClient.setQueryData(athleteKeys.detail(data.id), context.previousAthlete)
      }
      notify.error(error?.message || 'Failed to update athlete')
    },
    onSuccess: (updatedAthlete, data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: athleteKeys.lists() })
      queryClient.setQueryData(athleteKeys.detail(data.id), updatedAthlete)
      notify.success('Athlete updated successfully')
    },
  })
}

/**
 * Hook to delete an athlete
 */
export function useDeleteAthlete() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiFetch(`/api/athletes/${id}`, {
        method: 'DELETE',
      })
      return response.json()
    },
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: athleteKeys.detail(id) })
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: athleteKeys.lists() })
      notify.success('Athlete deleted successfully')
    },
    onError: (error: any) => {
      notify.error(error?.message || 'Failed to delete athlete')
    },
  })
}

/**
 * Hook for bulk affiliation operations
 */
export function useManageAffiliations() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: AffiliationOperation) => {
      const response = await apiFetch('/api/athletes/affiliations', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      return response.json()
    },
    onSuccess: (result, data) => {
      // Invalidate lists and affected athlete details
      queryClient.invalidateQueries({ queryKey: athleteKeys.lists() })
      data.athleteIds.forEach(id => {
        queryClient.invalidateQueries({ queryKey: athleteKeys.detail(id) })
        queryClient.invalidateQueries({ queryKey: athleteKeys.affiliations(id) })
      })
      notify.success(`Affiliation operation completed. ${result.results?.success || 0} successful, ${result.results?.failed || 0} failed.`)
    },
    onError: (error: any) => {
      notify.error(error?.message || 'Failed to manage affiliations')
    },
  })
}

/**
 * Hook for athlete transfers between organizations
 */
export function useTransferAthlete() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: TransferAthleteData) => {
      const response = await apiFetch('/api/athletes/affiliations?action=transfer', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      return response.json()
    },
    onSuccess: (_, data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: athleteKeys.lists() })
      queryClient.invalidateQueries({ queryKey: athleteKeys.detail(data.athleteId) })
      queryClient.invalidateQueries({ queryKey: athleteKeys.affiliations(data.athleteId) })
      notify.success('Athlete transferred successfully')
    },
    onError: (error: any) => {
      notify.error(error?.message || 'Failed to transfer athlete')
    },
  })
} 