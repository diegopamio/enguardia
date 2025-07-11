import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/notifications'

// Types
export interface Organization {
  id: string
  name: string
  description?: string | null
  website?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  _count?: {
    clubs: number
    athletes: number
  }
}

// Query keys factory
export const organizationKeys = {
  all: ['organizations'] as const,
  lists: () => [...organizationKeys.all, 'list'] as const,
  list: () => [...organizationKeys.lists()] as const,
  details: () => [...organizationKeys.all, 'detail'] as const,
  detail: (id: string) => [...organizationKeys.details(), id] as const,
}

// Hooks

/**
 * Hook to fetch all organizations
 */
export function useOrganizations() {
  return useQuery({
    queryKey: organizationKeys.list(),
    queryFn: async () => {
      const response = await apiFetch('/api/organizations')
      return response.json()
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - organizations change rarely
  })
}

/**
 * Hook to fetch a single organization by ID
 */
export function useOrganization(id: string) {
  return useQuery({
    queryKey: organizationKeys.detail(id),
    queryFn: async () => {
      const response = await apiFetch(`/api/organizations/${id}`)
      return response.json()
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
} 