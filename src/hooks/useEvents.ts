import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, notify } from '@/lib/notifications'

// Types
export interface Event {
  id: string
  name: string
  description?: string | null
  startDate: string
  endDate: string
  location: string
  isActive: boolean
  organizationId: string
  organization: { id: string; name: string }
  _count?: {
    competitions: number
  }
}

export interface EventFilters {
  search?: string
  organizationId?: string
  isActive?: boolean
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

export interface CreateEventData {
  name: string
  description?: string | null
  startDate: string
  endDate: string
  location: string
  isActive?: boolean
  organizationId?: string
}

export interface UpdateEventData extends CreateEventData {
  id: string
}

// Query keys factory
export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (filters: EventFilters) => [...eventKeys.lists(), filters] as const,
  details: () => [...eventKeys.all, 'detail'] as const,
  detail: (id: string) => [...eventKeys.details(), id] as const,
}

// Hooks

/**
 * Hook to fetch events with optional filtering
 */
export function useEvents(filters: EventFilters = {}) {
  return useQuery({
    queryKey: eventKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.search) params.append('search', filters.search)
      if (filters.organizationId) params.append('organizationId', filters.organizationId)
      if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString())
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.limit) params.append('limit', filters.limit.toString())
      if (filters.offset) params.append('offset', filters.offset.toString())

      const response = await apiFetch(`/api/events?${params.toString()}`)
      return response.json()
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
  })
}

/**
 * Hook to fetch a single event by ID
 */
export function useEvent(id: string) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: async () => {
      const response = await apiFetch(`/api/events/${id}`)
      return response.json()
    },
    enabled: !!id,
  })
}

/**
 * Hook to create a new event
 */
export function useCreateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateEventData) => {
      const response = await apiFetch('/api/events', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      return response.json()
    },
    onSuccess: () => {
      // Invalidate events lists to refetch
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
      notify.success('Event created successfully')
    },
    onError: (error: any) => {
      notify.error(error?.message || 'Failed to create event')
    },
  })
}

/**
 * Hook to update an event
 */
export function useUpdateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateEventData) => {
      const { id, ...updateData } = data
      const response = await apiFetch(`/api/events/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })
      return response.json()
    },
    onMutate: async (data) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: eventKeys.detail(data.id) })

      // Snapshot the previous value
      const previousEvent = queryClient.getQueryData(eventKeys.detail(data.id))

      // Optimistically update to the new value
      queryClient.setQueryData(eventKeys.detail(data.id), (old: any) => ({
        ...old,
        ...data,
      }))

      return { previousEvent }
    },
    onError: (error: any, data, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousEvent) {
        queryClient.setQueryData(eventKeys.detail(data.id), context.previousEvent)
      }
      notify.error(error?.message || 'Failed to update event')
    },
    onSuccess: (updatedEvent, data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
      queryClient.setQueryData(eventKeys.detail(data.id), updatedEvent)
      notify.success('Event updated successfully')
    },
  })
}

/**
 * Hook to delete an event
 */
export function useDeleteEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiFetch(`/api/events/${id}`, {
        method: 'DELETE',
      })
      return response.json()
    },
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: eventKeys.detail(id) })
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
      notify.success('Event deleted successfully')
    },
    onError: (error: any) => {
      notify.error(error?.message || 'Failed to delete event')
    },
  })
} 