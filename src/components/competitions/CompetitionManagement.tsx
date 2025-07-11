'use client'

import React, { useState, useCallback } from "react"
import { useRoleCheck } from "@/lib/auth-client"
import { useCompetitions, useDeleteCompetition, type Competition } from "@/hooks/useCompetitions"
import { useTournaments } from "@/hooks/useTournaments"
import CompetitionList from "./CompetitionList"
import CompetitionForm from "./CompetitionForm"

type ViewMode = "list" | "create" | "edit"

interface CompetitionManagementProps {
  tournamentId?: string // If provided, show competitions for a specific tournament
  organizationId?: string
}

export default function CompetitionManagement({ 
  tournamentId, 
  organizationId 
}: CompetitionManagementProps) {
  const { isSystemAdmin, isOrganizationAdmin } = useRoleCheck()
  
  // State management
  const [currentView, setCurrentView] = useState<ViewMode>("list")
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null)
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("")
  const [weaponFilter, setWeaponFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [tournamentFilter, setTournamentFilter] = useState(tournamentId || "")
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // Role-based access control
  const canCreate = isSystemAdmin() || isOrganizationAdmin()
  const canEdit = isSystemAdmin() || isOrganizationAdmin()
  const canDelete = isSystemAdmin() || isOrganizationAdmin()

  // TanStack Query hooks
  const competitionFilters = {
    limit: itemsPerPage,
    offset: (currentPage - 1) * itemsPerPage,
    tournamentId: tournamentFilter || undefined,
    organizationId: organizationId || undefined,
    weapon: weaponFilter || undefined,
    status: statusFilter || undefined,
    search: searchTerm.trim() || undefined,
  }

  const { data: competitionsData, isLoading: competitionsLoading, error: competitionsError, refetch } = useCompetitions(competitionFilters)
  const { data: tournamentsData } = useTournaments(organizationId ? { organizationId } : {})
  const deleteCompetitionMutation = useDeleteCompetition()

  const competitions = competitionsData?.competitions || []
  const totalCount = competitionsData?.total || 0
  const availableTournaments = tournamentsData?.tournaments || []

  // Handle competition creation
  const handleCompetitionCreate = useCallback(() => {
    if (!canCreate) {
      return
    }
    setSelectedCompetition(null)
    setCurrentView("create")
  }, [canCreate])

  // Handle competition editing
  const handleCompetitionEdit = useCallback((competition: Competition) => {
    if (!canEdit) {
      return
    }
    setSelectedCompetition(competition)
    setCurrentView("edit")
  }, [canEdit])

  // Handle competition deletion
  const handleCompetitionDelete = useCallback(async (competitionId: string) => {
    if (!canDelete) {
      return
    }

    if (!window.confirm('Are you sure you want to delete this competition? This action cannot be undone.')) {
      return
    }

    try {
      await deleteCompetitionMutation.mutateAsync(competitionId)
    } catch (error) {
      // Error handling is done in the mutation hook
      console.error("Error deleting competition:", error)
    }
  }, [canDelete, deleteCompetitionMutation])

  // Handle form success
  const handleFormSuccess = useCallback(() => {
    setCurrentView("list")
    setSelectedCompetition(null)
    // TanStack Query will automatically invalidate and refetch
  }, [])

  // Handle form cancellation
  const handleFormCancel = useCallback(() => {
    setCurrentView("list")
    setSelectedCompetition(null)
  }, [])

  // Filter change handlers
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value)
    setCurrentPage(1) // Reset to first page when searching
  }, [])

  const handleWeaponFilterChange = useCallback((value: string) => {
    setWeaponFilter(value)
    setCurrentPage(1)
  }, [])

  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value)
    setCurrentPage(1)
  }, [])

  const handleTournamentFilterChange = useCallback((value: string) => {
    setTournamentFilter(value)
    setCurrentPage(1)
  }, [])

  // Handle error state
  if (competitionsError) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">
          {competitionsError instanceof Error ? competitionsError.message : 'Failed to fetch competitions'}
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
          <CompetitionForm
            mode="create"
            competition={null}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
            tournaments={availableTournaments}
            defaultTournamentId={tournamentId}
          />
        )
      
      case "edit":
        return (
          <CompetitionForm
            mode="edit"
            competition={selectedCompetition}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
            tournaments={availableTournaments}
          />
        )
      
      default:
        return (
          <CompetitionList
            competitions={competitions}
            availableTournaments={availableTournaments}
            loading={competitionsLoading}
            searchTerm={searchTerm}
            weaponFilter={weaponFilter}
            statusFilter={statusFilter}
            tournamentFilter={tournamentFilter}
            currentPage={currentPage}
            totalCount={totalCount}
            itemsPerPage={itemsPerPage}
            onSearchChange={handleSearchChange}
            onWeaponFilterChange={handleWeaponFilterChange}
            onStatusFilterChange={handleStatusFilterChange}
            onTournamentFilterChange={handleTournamentFilterChange}
            onPageChange={setCurrentPage}
            onEdit={canEdit ? handleCompetitionEdit : undefined}
            onDelete={canDelete ? handleCompetitionDelete : undefined}
            onCreate={canCreate ? handleCompetitionCreate : undefined}
            deletingId={deleteCompetitionMutation.variables}
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