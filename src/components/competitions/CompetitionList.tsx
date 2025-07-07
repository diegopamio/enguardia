'use client'

import React, { useState, useEffect } from "react"
import { useRoleCheck } from "@/lib/auth-client"
import { notify, apiFetch, confirmAction } from "@/lib/notifications"

// Competition interface
export interface Competition {
  id: string
  name: string
  weapon: 'EPEE' | 'FOIL' | 'SABRE'
  category: string
  status: 'DRAFT' | 'REGISTRATION_OPEN' | 'REGISTRATION_CLOSED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  registrationDeadline?: string | Date | null
  tournamentId: string
  createdAt: string | Date
  updatedAt: string | Date
  tournament?: {
    id: string
    name: string
    organizationId: string
  }
  _count?: {
    registrations: number
    phases: number
  }
}

interface CompetitionListProps {
  competitions: Competition[]
  onEdit: (competition: Competition) => void
  onDelete: (id: string) => void
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
}

export default function CompetitionList({
  competitions,
  onEdit,
  onDelete,
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
  availableTournaments
}: CompetitionListProps) {
  const { isSystemAdmin, isOrganizationAdmin } = useRoleCheck()
  
  const canEdit = isSystemAdmin() || isOrganizationAdmin()
  const canDelete = isSystemAdmin() || isOrganizationAdmin()

  const handleDelete = (competition: Competition) => {
    const confirmed = confirmAction(
      `Are you sure you want to delete competition "${competition.name}"? This action cannot be undone.`
    )
    
    if (confirmed) {
      onDelete(competition.id)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800'
      case 'REGISTRATION_OPEN':
        return 'bg-yellow-100 text-yellow-800'
      case 'REGISTRATION_CLOSED':
        return 'bg-orange-100 text-orange-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getWeaponIcon = (weapon: string) => {
    switch (weapon) {
      case 'EPEE':
        return '🗡️'
      case 'FOIL':
        return '⚔️'
      case 'SABRE':
        return '🔪'
      default:
        return '⚔️'
    }
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  return (
    <div className="space-y-6">
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
          <p className="text-gray-600">
            {searchTerm || weaponFilter || statusFilter || tournamentFilter
              ? "Try adjusting your search criteria or filters."
              : "No competitions have been created yet."
            }
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {competitions.map((competition) => (
            <div key={competition.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{competition.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>{getWeaponIcon(competition.weapon)}</span>
                    <span>{competition.weapon}</span>
                    <span>•</span>
                    <span>{competition.category}</span>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(competition.status)}`}>
                  {competition.status.replace('_', ' ')}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                {competition.tournament && (
                  <div className="flex justify-between">
                    <span className="font-medium">Tournament:</span>
                    <button
                      onClick={() => competition.tournament && (window.location.href = `/events?view=${competition.tournament.id}`)}
                      className="truncate ml-2 text-blue-600 hover:text-blue-800 underline text-left"
                      title="View tournament details"
                    >
                      🏆 {competition.tournament.name}
                    </button>
                  </div>
                )}
                {competition.registrationDeadline && (
                  <div className="flex justify-between">
                    <span className="font-medium">Deadline:</span>
                    <span>{new Date(competition.registrationDeadline).toLocaleDateString()}</span>
                  </div>
                )}
                {competition._count && (
                  <>
                    <div className="flex justify-between">
                      <span className="font-medium">Registrations:</span>
                      <span>{competition._count.registrations}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Phases:</span>
                      <span>{competition._count.phases}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="font-medium">Created:</span>
                  <span>{new Date(competition.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => window.location.href = `/competitions/${competition.id}`}
                  className="flex-1 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                >
                  View Details
                </button>
                {canEdit && (
                  <button
                    onClick={() => onEdit(competition)}
                    className="flex-1 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => handleDelete(competition)}
                    className="px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
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