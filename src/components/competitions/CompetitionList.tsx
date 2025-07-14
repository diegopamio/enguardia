'use client'

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useRoleCheck } from "@/lib/auth-client"
import { notify, apiFetch } from "@/lib/notifications"
import CompetitionCard, { type Competition } from "./CompetitionCard"
import TournamentGeneration from "@/components/tournaments/TournamentGeneration"

// Competition interface is now imported from CompetitionCard

interface CompetitionListProps {
  competitions: Competition[]
  onEdit?: (competition: Competition) => void
  onDelete?: (id: string) => void
  onCreate?: () => void
  loading: boolean
  totalCount: number
  currentPage: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  searchTerm: string
  onSearchChange: (term: string) => void
  weaponFilter: string
  onWeaponFilterChange: (weapon: string) => void
  statusFilter: string
  onStatusFilterChange: (status: string) => void
  tournamentFilter: string
  onTournamentFilterChange: (tournamentId: string) => void
  availableTournaments: Array<{ id: string; name: string }>
  deletingId?: string
}

export default function CompetitionList({
  competitions,
  onEdit,
  onDelete,
  onCreate,
  loading,
  totalCount,
  currentPage,
  itemsPerPage,
  onPageChange,
  searchTerm,
  onSearchChange,
  weaponFilter,
  onWeaponFilterChange,
  statusFilter,
  onStatusFilterChange,
  tournamentFilter,
  onTournamentFilterChange,
  availableTournaments,
  deletingId
}: CompetitionListProps) {
  const { isSystemAdmin, isOrganizationAdmin } = useRoleCheck()
  const router = useRouter()
  
  // Tournament generation state
  const [generatingTournament, setGeneratingTournament] = useState<Competition | null>(null)
  
  const canConfigureFormula = isSystemAdmin() || isOrganizationAdmin()

  const handleViewCompetition = (competitionId: string) => {
    router.push(`/competitions/${competitionId}`)
  }

  const handleStartCompetition = (competition: Competition) => {
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
  }

  // Handle tournament generation back
  const handleGenerationBack = () => {
    setGeneratingTournament(null)
  }

  // Handle tournament generation success
  const handleGenerationSuccess = () => {
    setGeneratingTournament(null)
    // Could refresh the competitions list here if needed
  }

  const handleConfigureFormula = (competition: Competition) => {
    // Navigate to formula configuration - could be a specific route or modal
    router.push(`/competitions/${competition.id}?tab=formula`)
  }

  // Status and weapon icon functions moved to CompetitionCard

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  // Tournament generation view
  if (generatingTournament) {
    return (
      <TournamentGeneration
        tournamentId={generatingTournament.tournamentId || ''}
        tournamentName="" // Tournament name not available in competition list context
        competition={generatingTournament}
        onBack={handleGenerationBack}
        onSuccess={handleGenerationSuccess}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Competitions</h1>
        {onCreate && (
          <button
            onClick={onCreate}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Create Competition
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search Competitions
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by name or category..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Weapon Filter */}
          <div>
            <label htmlFor="weapon" className="block text-sm font-medium text-gray-700 mb-1">
              Weapon
            </label>
            <select
              id="weapon"
              value={weaponFilter}
              onChange={(e) => onWeaponFilterChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Weapons</option>
              <option value="EPEE">Épée</option>
              <option value="FOIL">Foil</option>
              <option value="SABRE">Sabre</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="REGISTRATION_OPEN">Registration Open</option>
              <option value="REGISTRATION_CLOSED">Registration Closed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Tournament Filter */}
          <div>
            <label htmlFor="tournament" className="block text-sm font-medium text-gray-700 mb-1">
              Tournament
            </label>
            <select
              id="tournament"
              value={tournamentFilter}
              onChange={(e) => onTournamentFilterChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Tournaments</option>
              {availableTournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-700">
          Showing {competitions.length} of {totalCount} competitions
        </p>
      </div>

      {/* Competition Cards */}
      {loading ? (
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading competitions...</p>
        </div>
      ) : competitions.length === 0 ? (
        <div className="text-center p-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No competitions found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || weaponFilter || statusFilter || tournamentFilter
              ? "Try adjusting your search criteria or filters."
              : "No competitions have been created yet."
            }
          </p>
          {onCreate && (
            <button
              onClick={onCreate}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Create First Competition
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {competitions.map((competition) => (
            <CompetitionCard
              key={competition.id}
              competition={competition}
              onView={handleViewCompetition}
              onStartCompetition={handleStartCompetition}
              onViewRoster={handleViewCompetition}
              onConfigureFormula={canConfigureFormula ? handleConfigureFormula : undefined}
              canConfigureFormula={canConfigureFormula}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-6">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <div className="flex space-x-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  currentPage === page
                    ? 'text-white bg-blue-600 border border-blue-600'
                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
} 