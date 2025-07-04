"use client"

import { useState, useCallback } from "react"
import { useRoleCheck } from "@/lib/auth-client"
import { UserRole } from "@prisma/client"
import { notify, apiFetch, NotificationError, confirmDelete, getMessage } from "@/lib/notifications"
import TournamentList from "./TournamentList"
import TournamentForm from "./TournamentForm"

export interface Tournament {
  id: string
  name: string
  description?: string
  startDate: string
  endDate: string
  registrationOpenDate: string
  registrationCloseDate: string
  venue?: string
  isActive: boolean
  status: string
  organizationId: string
  createdById: string
  maxParticipants?: number
  createdAt: string
  updatedAt: string
  organization?: {
    id: string
    name: string
  }
  competitions?: any[]
  _count?: {
    competitions: number
  }
}

type ViewMode = "list" | "create" | "edit" | "view"

interface TournamentManagementProps {
  organizationId?: string
}

export default function TournamentManagement({ organizationId }: TournamentManagementProps) {
  // Role-based access control
  const { isSystemAdmin, isOrgAdmin } = useRoleCheck()
  const canCreate = isSystemAdmin || isOrgAdmin
  const canEdit = isSystemAdmin || isOrgAdmin
  const canDelete = isSystemAdmin || isOrgAdmin

  // State management
  const [currentView, setCurrentView] = useState<ViewMode>("list")
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Handle tournament creation
  const handleTournamentCreate = useCallback(() => {
    if (!canCreate) {
      notify.error(getMessage('error.insufficientPermissions'))
      return
    }
    setSelectedTournament(null)
    setCurrentView("create")
  }, [canCreate])

  // Handle tournament editing
  const handleTournamentEdit = useCallback((tournament: Tournament) => {
    if (!canEdit) {
      notify.error(getMessage('error.insufficientPermissions'))
      return
    }
    setSelectedTournament(tournament)
    setCurrentView("edit")
  }, [canEdit])

  // Handle tournament viewing
  const handleTournamentView = useCallback((tournament: Tournament) => {
    setSelectedTournament(tournament)
    setCurrentView("view")
  }, [])

  // Handle tournament deletion
  const handleTournamentDelete = useCallback(async (tournamentId: string) => {
    if (!canDelete) {
      notify.error(getMessage('error.insufficientPermissions'))
      return
    }

    if (!confirmDelete()) {
      return
    }

    const loadingToast = notify.loading(getMessage('info.deleting'))

    try {
      setLoading(true)
      
      await apiFetch(`/api/tournaments/${tournamentId}`, {
        method: "DELETE"
      })

      notify.dismiss(loadingToast as string)
      notify.success(getMessage('success.tournament.deleted'))
      
      // Refresh the tournament list
      setRefreshKey(prev => prev + 1)
      
    } catch (error) {
      notify.dismiss(loadingToast as string)
      console.error("Error deleting tournament:", error)
      
      if (error instanceof NotificationError) {
        notify.error(error.message)
      } else {
        notify.error(getMessage('error.tournament.deleteFailed'))
      }
    } finally {
      setLoading(false)
    }
  }, [canDelete])

  // Handle form submission
  const handleFormSubmit = useCallback(async (formData: any) => {
    const loadingToast = notify.loading(
      currentView === "create" 
        ? getMessage('info.creating')
        : getMessage('info.updating')
    )

    try {
      setLoading(true)
      
      if (currentView === "create") {
        await apiFetch("/api/tournaments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(formData)
        })
        
        notify.dismiss(loadingToast as string)
        notify.success(getMessage('success.tournament.created'))
      } else if (currentView === "edit" && selectedTournament) {
        await apiFetch(`/api/tournaments/${selectedTournament.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(formData)
        })
        
        notify.dismiss(loadingToast as string)
        notify.success(getMessage('success.tournament.updated'))
      }
      
      // Return to list view and refresh
      setCurrentView("list")
      setSelectedTournament(null)
      setRefreshKey(prev => prev + 1)
      
    } catch (error) {
      notify.dismiss(loadingToast as string)
      console.error("Error submitting tournament form:", error)
      
      if (error instanceof NotificationError) {
        notify.error(error.message)
      } else {
        notify.error(
          currentView === "create" 
            ? getMessage('error.tournament.createFailed')
            : getMessage('error.tournament.updateFailed')
        )
      }
    } finally {
      setLoading(false)
    }
  }, [currentView, selectedTournament])

  // Handle form cancellation
  const handleFormCancel = useCallback(() => {
    setCurrentView("list")
    setSelectedTournament(null)
  }, [])

  // Render current view
  const renderCurrentView = () => {
    switch (currentView) {
      case "create":
        return (
          <TournamentForm
            mode="create"
            tournament={null}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            loading={loading}
            organizationId={organizationId}
          />
        )
      
      case "edit":
        return (
          <TournamentForm
            mode="edit"
            tournament={selectedTournament}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            loading={loading}
            organizationId={organizationId}
          />
        )
      
      case "view":
        return (
          <div className="space-y-6">
            {/* Tournament Details View */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedTournament?.name}
                </h2>
                <div className="flex space-x-3">
                  {canEdit && (
                    <button
                      onClick={() => handleTournamentEdit(selectedTournament!)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Edit Tournament
                    </button>
                  )}
                  <button
                    onClick={() => setCurrentView("list")}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Back to List
                  </button>
                </div>
              </div>
              
              {selectedTournament && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Tournament Information</h3>
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Description</dt>
                        <dd className="text-sm text-gray-900">{selectedTournament.description || "No description"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Status</dt>
                        <dd className="text-sm text-gray-900">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            selectedTournament.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                            selectedTournament.status === 'COMPLETED' ? 'bg-gray-100 text-gray-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {selectedTournament.status}
                          </span>
                          {selectedTournament.isActive && (
                            <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              ✓ ACTIVE
                            </span>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Venue</dt>
                        <dd className="text-sm text-gray-900">{selectedTournament.venue || "TBD"}</dd>
                      </div>
                    </dl>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Dates & Registration</h3>
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Tournament Dates</dt>
                        <dd className="text-sm text-gray-900">
                          {new Date(selectedTournament.startDate).toLocaleDateString()} - {new Date(selectedTournament.endDate).toLocaleDateString()}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Registration Period</dt>
                        <dd className="text-sm text-gray-900">
                          {new Date(selectedTournament.registrationOpenDate).toLocaleDateString()} - {new Date(selectedTournament.registrationCloseDate).toLocaleDateString()}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Max Participants</dt>
                        <dd className="text-sm text-gray-900">{selectedTournament.maxParticipants || "Unlimited"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Competitions</dt>
                        <dd className="text-sm text-gray-900">{selectedTournament._count?.competitions || 0}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      
      case "list":
      default:
        return (
          <TournamentList
            onTournamentCreate={handleTournamentCreate}
            onTournamentEdit={handleTournamentEdit}
            onTournamentView={handleTournamentView}
            onTournamentDelete={handleTournamentDelete}
            canCreate={canCreate}
            canEdit={canEdit}
            canDelete={canDelete}
            refreshKey={refreshKey}
            organizationId={organizationId}
          />
        )
    }
  }

  return (
    <div className="space-y-6">
      {renderCurrentView()}
    </div>
  )
} 