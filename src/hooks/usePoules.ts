import { useState, useEffect } from 'react'
import { apiFetch, notify } from '@/lib/notifications'

export interface PouleAthlete {
  id: string
  firstName: string
  lastName: string
  nationality?: string
  clubs: Array<{
    club: {
      name: string
      city: string
      country: string
    }
    status: string
  }>
}

export interface Poule {
  id: string
  name: string
  size: number
  phaseId: string
  phase: {
    name: string
    phaseType: string
    status: string
  }
  assignments: Array<{
    id: string
    position: number
    athlete: PouleAthlete
  }>
}

export interface UsePoules {
  poules: Poule[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function usePoules(competitionId: string): UsePoules {
  const [poules, setPoules] = useState<Poule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPoules = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiFetch(`/api/competitions/${competitionId}/poules`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch poules: ${response.statusText}`)
      }
      
      const data = await response.json()
      setPoules(data)
    } catch (err: any) {
      console.error('Error fetching poules:', err)
      setError(err.message || 'Failed to load poules')
      notify.error(`Failed to load poules: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (competitionId) {
      fetchPoules()
    }
  }, [competitionId])

  return {
    poules,
    loading,
    error,
    refetch: fetchPoules
  }
} 