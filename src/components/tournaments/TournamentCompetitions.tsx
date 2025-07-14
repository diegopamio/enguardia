'use client'

import React, { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { useRoleCheck } from "@/lib/auth-client"
import { notify, apiFetch, NotificationError, confirmDelete } from "@/lib/notifications"
import CompetitionForm from "../competitions/CompetitionForm"
import CompetitionRoster from "./CompetitionRoster"
import TournamentFormulaSetup from "./TournamentFormulaSetup"
import TournamentGeneration from "./TournamentGeneration"

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
  const canEdit = isSystemAdmin() || isOrganizationAdmin()
  const canDelete = isSystemAdmin() || isOrganizationAdmin()
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

  // Handle competition editing
  const handleCompetitionEdit = useCallback((competition: Competition) => {
    if (!canEdit) {
      notify.error('You do not have permission to edit competitions')
      return
    }
    setEditingCompetition(competition)
  }, [canEdit])

  // Handle competition deletion
  const handleCompetitionDelete = useCallback(async (competitionId: string) => {
    if (!canDelete) {
      notify.error('You do not have permission to delete competitions')
      return
    }

    if (!confirm('Are you sure you want to delete this competition? This action cannot be undone.')) {
      return
    }

    const loadingToast = notify.loading('Deleting competition...')

    try {
      await apiFetch(`/api/competitions/${competitionId}`, {
        method: "DELETE"
      })

      notify.dismiss(loadingToast as string)
      notify.success('Competition deleted successfully')
      
      // Refresh the competition list
      setRefreshKey(prev => prev + 1)
      
    } catch (error) {
      notify.dismiss(loadingToast as string)
      console.error("Error deleting competition:", error)
      
      if (error instanceof NotificationError) {
        notify.error(error.message)
      } else {
        notify.error('Failed to delete competition')
      }
    }
  }, [canDelete])

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

  // Weapon icons
  const getWeaponIcon = (weapon: string) => {
    switch (weapon) {
      case 'EPEE': return '🗡️'
      case 'FOIL': return '⚔️'
      case 'SABRE': return '🔪'
      default: return '⚔️'
    }
  }

  // Status styling
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800'
      case 'REGISTRATION_OPEN': return 'bg-yellow-100 text-yellow-800'
      case 'REGISTRATION_CLOSED': return 'bg-orange-100 text-orange-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
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
          competition={editingCompetition}
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
            <div
              key={competition.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleViewCompetition(competition.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-lg font-medium text-gray-900 truncate">
                  {getWeaponIcon(competition.weapon)} {competition.name}
                </h4>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(competition.status)}`}>
                  {competition.status === 'IN_PROGRESS' ? '🏆 Live' : competition.status.replace('_', ' ')}
                </span>
              </div>
              
              <div className="space-y-1 text-sm text-gray-600">
                <div>Category: {competition.category}</div>
                <div>Weapon: {competition.weapon}</div>
                {competition.registrationDeadline && (
                  <div>Deadline: {new Date(competition.registrationDeadline).toLocaleDateString()}</div>
                )}
                {competition._count && (
                  <div>
                    Registrations: {competition._count.registrations} | 
                    Phases: {competition._count.phases}
                  </div>
                )}
              </div>

              {(canEdit || canDelete) && (
                <div className="flex justify-end space-x-2 mt-4" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewCompetition(competition.id)
                    }}
                    className="text-green-600 hover:text-green-800 text-sm font-medium"
                  >
                    View Roster
                  </button>
                  {canEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCompetitionEdit(competition)
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCompetitionDelete(competition.id)
                      }}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Delete
                    </button>
                  )}
                  {canConfigureFormula && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleConfigureFormula(competition)
                      }}
                      className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                    >
                      Configure Formula
                    </button>
                  )}
                  {canConfigureFormula && competition._count && competition._count.phases > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStartCompetition(competition)
                      }}
                      className="text-green-600 hover:text-green-800 text-sm font-medium"
                    >
                                              {competition.status === 'IN_PROGRESS' ? 'View Competition' : 'Start Competition'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 