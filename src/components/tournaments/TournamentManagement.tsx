"use client"

import { useState, useCallback } from "react"
import { useRoleCheck } from "@/lib/auth-client"
import { UserRole } from "@prisma/client"
import { getMessage } from "@/lib/notifications"
import { useTournaments, useDeleteTournament, type Tournament } from "@/hooks/useTournaments"
import TournamentList from "./TournamentList"
import TournamentForm from "./TournamentForm"
import TournamentCompetitions from "./TournamentCompetitions"

type ViewMode = "list" | "create" | "edit" | "view"

interface TournamentManagementProps {
  organizationId?: string
}

export default function TournamentManagement({ organizationId }: TournamentManagementProps) {
  // Role-based access control
  const { isSystemAdmin, isOrganizationAdmin } = useRoleCheck()
  const canCreate = isSystemAdmin() || isOrganizationAdmin()
  const canEdit = isSystemAdmin() || isOrganizationAdmin()
  const canDelete = isSystemAdmin() || isOrganizationAdmin()

  // State management
  const [currentView, setCurrentView] = useState<ViewMode>("list")
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null)

  // TanStack Query hooks
  const { data: tournamentsData, isLoading, error, refetch } = useTournaments(organizationId ? { organizationId } : {})
  const deleteTournamentMutation = useDeleteTournament()

  // Handle tournament creation
  const handleTournamentCreate = useCallback(() => {
    if (!canCreate) {
      return
    }
    setSelectedTournament(null)
    setCurrentView("create")
  }, [canCreate])

  // Handle tournament editing
  const handleTournamentEdit = useCallback((tournament: Tournament) => {
    if (!canEdit) {
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
      return
    }

    if (!window.confirm('Are you sure you want to delete this tournament? This action cannot be undone.')) {
      return
    }

    try {
      await deleteTournamentMutation.mutateAsync(tournamentId)
    } catch (error) {
      // Error handling is done in the mutation hook
      console.error("Error deleting tournament:", error)
    }
  }, [canDelete, deleteTournamentMutation])

  // Handle form success
  const handleFormSuccess = useCallback(() => {
    setCurrentView("list")
    setSelectedTournament(null)
    // TanStack Query will automatically invalidate and refetch
  }, [])

  // Handle form cancellation
  const handleFormCancel = useCallback(() => {
    setCurrentView("list")
    setSelectedTournament(null)
  }, [])

  // Handle errors
  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">
          {error instanceof Error ? error.message : 'Failed to fetch tournaments'}
        </div>
        <button
          onClick={() => refetch()}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  // Render current view
  const renderCurrentView = () => {
    switch (currentView) {
      case "create":
        return (
          <TournamentForm
            mode="create"
            tournament={null}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
            organizationId={organizationId}
          />
        )
      
      case "edit":
        return (
          <TournamentForm
            mode="edit"
            tournament={selectedTournament}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
            organizationId={organizationId}
          />
        )
      
      case "view":
        return (
          <TournamentCompetitions
            tournament={selectedTournament}
            onBack={() => setCurrentView("list")}
            onEdit={canEdit ? () => handleTournamentEdit(selectedTournament!) : undefined}
            onDelete={canDelete ? () => handleTournamentDelete(selectedTournament!.id) : undefined}
            organizationId={organizationId}
          />
        )
      
      default:
        return (
          <TournamentList
            tournaments={tournamentsData?.tournaments || []}
            loading={isLoading}
            onView={handleTournamentView}
            onEdit={canEdit ? handleTournamentEdit : undefined}
            onDelete={canDelete ? handleTournamentDelete : undefined}
            onCreate={canCreate ? handleTournamentCreate : undefined}
            organizationId={organizationId}
          />
        )
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm">
        {renderCurrentView()}
      </div>
    </div>
  )
} 