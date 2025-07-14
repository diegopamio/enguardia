'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch, notify } from '@/lib/notifications'
import TournamentCompetitions from './TournamentCompetitions'

interface Tournament {
  id: string
  name: string
  description?: string | null
  startDate: string
  endDate: string
  venue?: string | null
  status: string
  isActive: boolean
  isPublic: boolean
  organizationId: string
  createdAt: string
  updatedAt: string
  organization?: { id: string; name: string }
  _count?: {
    competitions: number
  }
}

interface TournamentDetailsProps {
  tournamentId: string
}

export default function TournamentDetails({ tournamentId }: TournamentDetailsProps) {
  const router = useRouter()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTournament = async () => {
      try {
        setLoading(true)
        const response = await apiFetch(`/api/tournaments/${tournamentId}`)
        const data = await response.json()
        setTournament(data)
      } catch (err) {
        console.error('Error fetching tournament:', err)
        setError('Failed to load tournament details')
        notify.error('Failed to load tournament details')
      } finally {
        setLoading(false)
      }
    }

    fetchTournament()
  }, [tournamentId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading tournament details...</p>
        </div>
      </div>
    )
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Tournament not found'}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-gray-100 text-gray-800'
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800'
      case 'REGISTRATION_OPEN': return 'bg-green-100 text-green-800'
      case 'REGISTRATION_CLOSED': return 'bg-yellow-100 text-yellow-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 text-blue-600 hover:text-blue-800 flex items-center"
          >
            ← Back
          </button>
          
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <h1 className="text-2xl font-bold text-gray-900">{tournament.name}</h1>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(tournament.status)}`}>
                    {tournament.status.replace('_', ' ')}
                  </span>
                  {tournament.isActive && (
                    <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                      ✓ ACTIVE
                    </span>
                  )}
                </div>
                
                {tournament.description && (
                  <p className="text-gray-600 mb-4">{tournament.description}</p>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                  <div>
                    <span className="font-medium text-gray-900">Tournament Dates:</span>
                    <p className="text-gray-600 mt-1">
                      {new Date(tournament.startDate).toLocaleDateString()} - {new Date(tournament.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Venue:</span>
                    <p className="text-gray-600 mt-1">{tournament.venue || "TBD"}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Competitions:</span>
                    <p className="text-gray-600 mt-1">{tournament._count?.competitions || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Competitions Section */}
        <div>
          <TournamentCompetitions 
            tournamentId={tournamentId}
            tournamentName={tournament.name}
          />
        </div>
      </div>
    </div>
  )
} 