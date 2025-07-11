'use client'

import React, { useState, useCallback } from 'react'
import { useRoleCheck } from '@/lib/auth-client'
import { getCountryName } from '@/lib/countries'
import { 
  useCompetitionRegistrations, 
  useUnregisterAthlete, 
  useBulkUpdatePresence,
  type CompetitionRegistration 
} from '@/hooks/useCompetitionRegistrations'
import RegistrationManager from './RegistrationManager'
import PresenceTracker from './PresenceTracker'
import ConfirmationModal from '@/components/shared/ConfirmationModal'

interface CompetitionRosterProps {
  competitionId: string
  competition?: {
    id: string
    name: string
    weapon: string
    category: string
    maxParticipants?: number
    status: string
  }
  onBack?: () => void
}

export default function CompetitionRoster({ competitionId, competition, onBack }: CompetitionRosterProps) {
  // Access control
  const { isSystemAdmin, isOrganizationAdmin } = useRoleCheck()
  const canManageRegistrations = isSystemAdmin() || isOrganizationAdmin()

  // State management
  const [showRegistrationManager, setShowRegistrationManager] = useState(false)
  const [showPresenceTracker, setShowPresenceTracker] = useState(false)
  const [selectedAthletes, setSelectedAthletes] = useState<CompetitionRegistration[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [athleteToDelete, setAthleteToDelete] = useState<CompetitionRegistration | null>(null)

  const limit = 50

  // TanStack Query hooks
  const registrationFilters = {
    status: statusFilter || undefined,
    limit,
    offset: (currentPage - 1) * limit,
  }

  const { data: registrationsData, isLoading, error, refetch } = useCompetitionRegistrations(competitionId, registrationFilters)
  const unregisterAthleteMutation = useUnregisterAthlete()
  const bulkUpdatePresenceMutation = useBulkUpdatePresence()

  const registrations = registrationsData?.registrations || []
  const competitionInfo = registrationsData?.competition || competition
  const pagination = registrationsData?.pagination || { total: 0, limit, offset: 0, hasMore: false }

  // Filter registrations by search term locally
  const filteredRegistrations = searchTerm
    ? registrations.filter(reg => 
        `${reg.athlete.firstName} ${reg.athlete.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.athlete.fieId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.athlete.nationality?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : registrations

  // Selection handlers
  const handleSelectAthlete = useCallback((registration: CompetitionRegistration) => {
    setSelectedAthletes(prev => {
      const isSelected = prev.some(r => r.athleteId === registration.athleteId)
      if (isSelected) {
        return prev.filter(r => r.athleteId !== registration.athleteId)
      } else {
        return [...prev, registration]
      }
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (selectedAthletes.length === filteredRegistrations.length) {
      setSelectedAthletes([])
    } else {
      setSelectedAthletes([...filteredRegistrations])
    }
  }, [filteredRegistrations, selectedAthletes])

  const handleClearSelection = useCallback(() => {
    setSelectedAthletes([])
  }, [])

  // Registration management handlers
  const handleShowRegistrationManager = useCallback(() => {
    setShowRegistrationManager(true)
  }, [])

  const handleRegistrationSuccess = useCallback(() => {
    setShowRegistrationManager(false)
    // TanStack Query will automatically refetch
  }, [])

  const handleShowPresenceTracker = useCallback(() => {
    if (selectedAthletes.length === 0) {
      console.warn('Please select at least one athlete to manage presence.')
      return
    }
    setShowPresenceTracker(true)
  }, [selectedAthletes])

  const handlePresenceSuccess = useCallback(() => {
    setSelectedAthletes([])
    setShowPresenceTracker(false)
    // TanStack Query will automatically refetch
  }, [])

  // Delete handlers
  const handleDeleteRequest = useCallback((registration: CompetitionRegistration) => {
    setAthleteToDelete(registration)
    setShowDeleteConfirmation(true)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!athleteToDelete) return

    try {
      await unregisterAthleteMutation.mutateAsync({
        competitionId,
        athleteId: athleteToDelete.athleteId
      })
      setShowDeleteConfirmation(false)
      setAthleteToDelete(null)
      // Remove from selection if was selected
      setSelectedAthletes(prev => prev.filter(r => r.athleteId !== athleteToDelete.athleteId))
    } catch (err) {
      console.error('Failed to unregister athlete:', err)
    }
  }, [athleteToDelete, unregisterAthleteMutation, competitionId])

  const cancelDelete = useCallback(() => {
    setShowDeleteConfirmation(false)
    setAthleteToDelete(null)
  }, [])

  // Bulk presence update
  const handleBulkPresenceUpdate = useCallback(async (isPresent: boolean) => {
    if (selectedAthletes.length === 0) return

    try {
      await bulkUpdatePresenceMutation.mutateAsync({
        competitionId,
        athleteIds: selectedAthletes.map(r => r.athleteId),
        isPresent
      })
      setSelectedAthletes([])
    } catch (err) {
      console.error('Failed to update presence:', err)
    }
  }, [selectedAthletes, bulkUpdatePresenceMutation, competitionId])

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const colors = {
      REGISTERED: 'bg-blue-100 text-blue-800',
      CHECKED_IN: 'bg-green-100 text-green-800',
      WITHDRAWN: 'bg-yellow-100 text-yellow-800',
      DISQUALIFIED: 'bg-red-100 text-red-800',
    }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    )
  }

  // Presence indicator
  const PresenceIndicator = ({ isPresent }: { isPresent: boolean }) => (
    <span className={`w-3 h-3 rounded-full ${isPresent ? 'bg-green-500' : 'bg-red-500'}`} title={isPresent ? 'Present' : 'Absent'} />
  )

  if (error) {
    return (
      <div className="p-4 text-center">
        <div className="text-red-600 mb-4">
          {error instanceof Error ? error.message : 'Failed to fetch competition roster'}
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
            >
              ← Back
            </button>
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {competitionInfo?.name} Roster
            </h2>
            <p className="text-gray-600">
              {competitionInfo?.weapon} • {competitionInfo?.category}
              {competitionInfo?.maxParticipants && (
                <span className="ml-2">
                  ({pagination.total}/{competitionInfo.maxParticipants} participants)
                </span>
              )}
            </p>
          </div>
        </div>

        {canManageRegistrations && (
          <div className="flex gap-3">
            <button
              onClick={handleShowRegistrationManager}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Athletes
            </button>
            {selectedAthletes.length > 0 && (
              <>
                <button
                  onClick={handleShowPresenceTracker}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                >
                  Manage Presence ({selectedAthletes.length})
                </button>
                <button
                  onClick={() => handleBulkPresenceUpdate(true)}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors"
                >
                  Mark Present
                </button>
                <button
                  onClick={() => handleBulkPresenceUpdate(false)}
                  className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors"
                >
                  Mark Absent
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <input
            type="text"
            placeholder="Search athletes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="REGISTERED">Registered</option>
            <option value="CHECKED_IN">Checked In</option>
            <option value="WITHDRAWN">Withdrawn</option>
            <option value="DISQUALIFIED">Disqualified</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            {filteredRegistrations.length} of {pagination.total} athletes
          </span>
          {selectedAthletes.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={handleClearSelection}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {canManageRegistrations && filteredRegistrations.length > 0 && (
        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedAthletes.length === filteredRegistrations.length && filteredRegistrations.length > 0}
              onChange={handleSelectAll}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <span className="text-sm font-medium">Select All</span>
          </label>
          {selectedAthletes.length > 0 && (
            <span className="text-sm text-gray-600">
              {selectedAthletes.length} selected
            </span>
          )}
        </div>
      )}

      {/* Athletes List */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading roster...</p>
        </div>
      ) : filteredRegistrations.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">
            {searchTerm || statusFilter ? 'No athletes match your search criteria.' : 'No athletes registered for this competition.'}
          </p>
          {canManageRegistrations && !searchTerm && !statusFilter && (
            <button
              onClick={handleShowRegistrationManager}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Add First Athlete
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {canManageRegistrations && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Select
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Athlete
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Country
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    FIE ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Presence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Seed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Club
                  </th>
                  {canManageRegistrations && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRegistrations.map((registration) => {
                  const isSelected = selectedAthletes.some(r => r.athleteId === registration.athleteId)
                  const primaryClub = registration.athlete.clubs.find(c => true)?.club // Simplified for now
                  
                  return (
                    <tr 
                      key={registration.athleteId}
                      className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50 ring-2 ring-blue-200' : ''}`}
                    >
                      {canManageRegistrations && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectAthlete(registration)}
                            className="h-4 w-4 text-blue-600 rounded"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {registration.athlete.firstName} {registration.athlete.lastName}
                        </div>
                        {registration.athlete.dateOfBirth && (
                          <div className="text-sm text-gray-500">
                            Born: {new Date(registration.athlete.dateOfBirth).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {registration.athlete.nationality ? getCountryName(registration.athlete.nationality) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {registration.athlete.fieId || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={registration.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <PresenceIndicator isPresent={registration.isPresent} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {registration.seedNumber || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {primaryClub ? `${primaryClub.name} (${primaryClub.city})` : '—'}
                      </td>
                      {canManageRegistrations && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleDeleteRequest(registration)}
                            className="text-red-600 hover:text-red-900"
                            disabled={unregisterAthleteMutation.isPending}
                          >
                            Remove
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination.hasMore && (
        <div className="flex justify-center">
          <button
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            Load More
          </button>
        </div>
      )}

      {/* Modals */}
      {showRegistrationManager && (
        <RegistrationManager
          competitionId={competitionId}
          competition={competitionInfo}
          onClose={() => setShowRegistrationManager(false)}
          onSuccess={handleRegistrationSuccess}
        />
      )}

      {showPresenceTracker && (
        <PresenceTracker
          competitionId={competitionId}
          selectedAthletes={selectedAthletes}
          onClose={() => setShowPresenceTracker(false)}
          onSuccess={handlePresenceSuccess}
        />
      )}

      {showDeleteConfirmation && athleteToDelete && (
        <ConfirmationModal
          isOpen={showDeleteConfirmation}
          onClose={cancelDelete}
          onConfirm={confirmDelete}
          title="Remove Athlete from Competition"
          message={`Are you sure you want to remove ${athleteToDelete.athlete.firstName} ${athleteToDelete.athlete.lastName} from this competition? This action cannot be undone.`}
          confirmButtonText="Remove"
          confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
          isLoading={unregisterAthleteMutation.isPending}
        />
      )}
    </div>
  )
} 