import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, notify } from '@/lib/notifications'

// Types
export interface Club {
  id: string
  name: string
  city: string
  country: string
  imageUrl?: string | null
  organizations: Array<{
    organization: { id: string; name: string }
    status: string
  }>
  _count?: {
    athletes: number
  }
}

export interface ClubFilters {
  search?: string
  organizationId?: string
  limit?: number
  offset?: number
}

export interface CreateClubData {
  name: string
  city: string
  country: string
  imageUrl?: string | null
  organizationId?: string
}

export interface UpdateClubData extends CreateClubData {
  id: string
}

// Query keys factory
export const clubKeys = {
  all: ['clubs'] as const,
  lists: () => [...clubKeys.all, 'list'] as const,
  list: (filters: ClubFilters) => [...clubKeys.lists(), filters] as const,
  details: () => [...clubKeys.all, 'detail'] as const,
  detail: (id: string) => [...clubKeys.details(), id] as const,
}

// Hooks

/**
 * Hook to fetch clubs with optional filtering
 */
export function useClubs(filters: ClubFilters = {}) {
  return useQuery({
    queryKey: clubKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.search) params.append('search', filters.search)
      if (filters.organizationId) params.append('organizationId', filters.organizationId)
      if (filters.limit) params.append('limit', filters.limit.toString())
      if (filters.offset) params.append('offset', filters.offset.toString())

      const response = await apiFetch(`/api/clubs?${params.toString()}`)
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - clubs change less frequently
  })
}

/**
 * Hook to fetch a single club by ID
 */
export function useClub(id: string) {
  return useQuery({
    queryKey: clubKeys.detail(id),
    queryFn: async () => {
      const response = await apiFetch(`/api/clubs/${id}`)
      return response.json()
    },
    enabled: !!id,
  })
}

/**
 * Hook to create a new club
 */
export function useCreateClub() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateClubData) => {
      const response = await apiFetch('/api/clubs', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      return response.json()
    },
    onSuccess: () => {
      // Invalidate clubs lists to refetch
      queryClient.invalidateQueries({ queryKey: clubKeys.lists() })
      notify.success('Club created successfully')
    },
    onError: (error: any) => {
      notify.error(error?.message || 'Failed to create club')
    },
  })
}

/**
 * Hook to update a club
 */
export function useUpdateClub() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateClubData) => {
      const { id, ...updateData } = data
      const response = await apiFetch(`/api/clubs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })
      return response.json()
    },
    onMutate: async (data) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: clubKeys.detail(data.id) })

      // Snapshot the previous value
      const previousClub = queryClient.getQueryData(clubKeys.detail(data.id))

      // Optimistically update to the new value
      queryClient.setQueryData(clubKeys.detail(data.id), (old: any) => ({
        ...old,
        ...data,
      }))

      return { previousClub }
    },
    onError: (error: any, data, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousClub) {
        queryClient.setQueryData(clubKeys.detail(data.id), context.previousClub)
      }
      notify.error(error?.message || 'Failed to update club')
    },
    onSuccess: (updatedClub, data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: clubKeys.lists() })
      queryClient.setQueryData(clubKeys.detail(data.id), updatedClub)
      notify.success('Club updated successfully')
    },
  })
}

/**
 * Hook to delete a club
 */
export function useDeleteClub() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiFetch(`/api/clubs/${id}`, {
        method: 'DELETE',
      })
      return response.json()
    },
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: clubKeys.detail(id) })
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: clubKeys.lists() })
      notify.success('Club deleted successfully')
    },
    onError: (error: any) => {
      notify.error(error?.message || 'Failed to delete club')
    },
  })
}

/**
 * Hook to upload a club logo
 */
export function useUploadClubLogo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ file, clubId }: { file: File; clubId?: string }) => {
      const formData = new FormData()
      formData.append('file', file)
      if (clubId) formData.append('clubId', clubId)

      const response = await fetch('/api/clubs/upload-logo', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload logo')
      }

      return response.json()
    },
    onSuccess: (result, { clubId }) => {
      if (clubId) {
        // Invalidate specific club to refetch with new logo
        queryClient.invalidateQueries({ queryKey: clubKeys.detail(clubId) })
      }
      // Invalidate lists to show updated logos
      queryClient.invalidateQueries({ queryKey: clubKeys.lists() })
      notify.success('Logo uploaded successfully')
    },
    onError: (error: any) => {
      notify.error(error?.message || 'Failed to upload logo')
    },
  })
} 