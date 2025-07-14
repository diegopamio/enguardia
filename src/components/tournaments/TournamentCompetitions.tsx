'use client'

import React, { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { useRoleCheck } from "@/lib/auth-client"
import { notify, apiFetch, NotificationError } from "@/lib/notifications"
import CompetitionForm from "../competitions/CompetitionForm"
import CompetitionRoster from "./CompetitionRoster"
import TournamentFormulaSetup from "./TournamentFormulaSetup"
import TournamentGeneration from "./TournamentGeneration"
import CompetitionCard, { type Competition as CompetitionCardType } from "../competitions/CompetitionCard"

// Local Competition interface for forms - different from the one used in cards
interface Competition {
  id: string
  name: string
  weapon: 'EPEE' | 'FOIL' | 'SABRE'
  category: string
  status: 'DRAFT' | 'REGISTRATION_OPEN' | 'REGISTRATION_CLOSED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  registrationDeadline?: string | Date | null
  tournamentId: string
  createdAt: string | Date
  updatedAt: string | Date
  _count?: {
    registrations: number
    phases: number
  }
}

interface TournamentCompetitionsProps {
  tournamentId: string
  tournamentName?: string
  organizationId?: string
  onBack?: () => void
}

export default function TournamentCompetitions({ 
  tournamentId, 
  tournamentName: propTournamentName,
  organizationId,
  onBack
}: TournamentCompetitionsProps) {
  const router = useRouter()
  const params = useParams()
  const { isSystemAdmin, isOrganizationAdmin } = useRoleCheck()
  
  // State management
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null)
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [viewingRoster, setViewingRoster] = useState<Competition | null>(null)
  const [configuringFormula, setConfiguringFormula] = useState<Competition | null>(null)
  const [generatingTournament, setGeneratingTournament] = useState<Competition | null>(null)
  const [tournamentName, setTournamentName] = useState(propTournamentName || "")

  // Role-based access control
  const canCreate = isSystemAdmin() || isOrganizationAdmin()
  const canConfigureFormula = isSystemAdmin() || isOrganizationAdmin()

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (onBack) {
      onBack()
    } else {
      router.push('/tournaments')
    }
  }, [onBack, router])

  // Handle competition viewing - navigate to nested route
  const handleViewCompetition = useCallback((competitionId: string) => {
    router.push(`/tournaments/${tournamentId}/competitions/${competitionId}`)
  }, [router, tournamentId])

  // Handle roster view back
  const handleRosterBack = useCallback(() => {
    setViewingRoster(null)
  }, [])

  // Handle formula setup
  const handleConfigureFormula = useCallback((competition: Competition) => {
    if (!canConfigureFormula) {
      notify.error('You do not have permission to configure tournament formulas')
      return
    }
    setConfiguringFormula(competition)
  }, [canConfigureFormula])

  // Handle formula setup back
  const handleFormulaSetupBack = useCallback(() => {
    setConfiguringFormula(null)
  }, [])

  // Handle formula setup success
  const handleFormulaSetupSuccess = useCallback(() => {
    setConfiguringFormula(null)
    setRefreshKey(prev => prev + 1)
    notify.success('Tournament formula configured successfully')
  }, [])

  // Handle starting competition
  const handleStartCompetition = useCallback((competition: Competition) => {
    if (!canConfigureFormula) {
      notify.error('You do not have permission to start competitions')
      return
    }
    
    // If competition is already in progress, go to live competition view
    if (competition.status === 'IN_PROGRESS') {
      router.push(`/competitions/${competition.id}`)
      return
    }
    
    // Otherwise, open the tournament generation wizard
    setGeneratingTournament(competition)
  }, [canConfigureFormula, router])

  // Handle tournament generation back
  const handleGenerationBack = useCallback(() => {
    setGeneratingTournament(null)
  }, [])

  // Handle tournament generation success
  const handleGenerationSuccess = useCallback(() => {
    setGeneratingTournament(null)
    setRefreshKey(prev => prev + 1)
    notify.success('Tournament generated successfully')
  }, [])

  // Fetch competitions for this tournament
  const fetchCompetitions = useCallback(async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        limit: '100',
        offset: '0',
        tournamentId: tournamentId
      })
      
      if (organizationId) {
        params.append('organizationId', organizationId)
      }
      
      const response = await apiFetch(`/api/competitions?${params.toString()}`)
      const data = await response.json()
      
      if (data.competitions) {
        setCompetitions(data.competitions)
      } else {
        setCompetitions([])
      }
    } catch (err) {
      console.error('Error fetching competitions:', err)
      if (err instanceof NotificationError) {
        notify.error(err.message)
      } else {
        notify.error('Failed to load competitions')
      }
      setCompetitions([])
    } finally {
      setLoading(false)
    }
  }, [tournamentId, organizationId, refreshKey])

  // Load competitions on component mount and dependencies change
  useEffect(() => {
    fetchCompetitions()
  }, [fetchCompetitions])

  // Handle competition creation
  const handleCompetitionCreate = useCallback(() => {
    if (!canCreate) {
      notify.error('You do not have permission to create competitions')
      return
    }
    setShowCreateForm(true)
  }, [canCreate])

  // Handle form success
  const handleFormSuccess = useCallback(() => {
    setShowCreateForm(false)
    setEditingCompetition(null)
    setRefreshKey(prev => prev + 1)
    notify.success(editingCompetition ? 'Competition updated successfully' : 'Competition created successfully')
  }, [editingCompetition])

  // Handle form cancel
  const handleFormCancel = useCallback(() => {
    setShowCreateForm(false)
    setEditingCompetition(null)
  }, [])

  // Tournament data for form
  const tournamentData = [
    {
      id: tournamentId,
      name: tournamentName,
      organizationId: organizationId || ''
    }
  ]

  // Weapon icon and status styling functions moved to CompetitionCard

  // Wrapper functions to handle Competition interface differences
  const handleConfigureFormulaWrapper = canConfigureFormula ? (comp: import('@/components/competitions/CompetitionCard').Competition) => {
    handleConfigureFormula(comp as Competition)
  } : undefined

  const handleStartCompetitionWrapper = (comp: import('@/components/competitions/CompetitionCard').Competition) => {
    handleStartCompetition(comp as Competition)
  }

  if (showCreateForm || editingCompetition) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            {editingCompetition ? 'Edit Competition' : `Create New Competition for ${tournamentName}`}
          </h3>
        </div>
        
        <CompetitionForm
          mode={editingCompetition ? "edit" : "create"}
          competition={editingCompetition as any} // Type cast to handle interface mismatch
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
          tournaments={tournamentData}
          defaultTournamentId={tournamentId}
        />
      </div>
    )
  }

  // Roster view
  if (viewingRoster) {
    return (
      <CompetitionRoster
        competitionId={viewingRoster.id}
        competition={{
          id: viewingRoster.id,
          name: viewingRoster.name,
          weapon: viewingRoster.weapon,
          category: viewingRoster.category,
          status: viewingRoster.status
        }}
        onBack={handleRosterBack}
      />
    )
  }

  // Formula setup view
  if (configuringFormula) {
    return (
      <TournamentFormulaSetup
        tournamentId={tournamentId}
        tournamentName={tournamentName}
        competition={configuringFormula}
        onBack={handleFormulaSetupBack}
        onSuccess={handleFormulaSetupSuccess}
      />
    )
  }

  // Tournament generation view
  if (generatingTournament) {
    return (
      <TournamentGeneration
        tournamentId={tournamentId}
        tournamentName={tournamentName}
        competition={generatingTournament}
        onBack={handleGenerationBack}
        onSuccess={handleGenerationSuccess}
      />
    )
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            ← Back to Tournaments
          </button>
          <div>
            <h3 className="text-lg font-medium text-gray-900">{tournamentName} - Competitions</h3>
          </div>
        </div>
        {canCreate && (
          <button
            onClick={handleCompetitionCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add Competition
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : competitions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No competitions found for this tournament.</p>
          {canCreate && (
            <button
              onClick={handleCompetitionCreate}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Create First Competition
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {competitions.map((competition) => (
            <CompetitionCard
              key={competition.id}
              competition={competition as import('@/components/competitions/CompetitionCard').Competition}
              onView={(id) => handleViewCompetition(id)}
              onStartCompetition={handleStartCompetitionWrapper}
              onViewRoster={(id) => handleViewCompetition(id)}
              onConfigureFormula={handleConfigureFormulaWrapper}
              canConfigureFormula={canConfigureFormula}
            />
          ))}
        </div>
      )}
    </div>
  )
} 