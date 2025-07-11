'use client'

import React, { useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { useRoleCheck } from "@/lib/auth-client"
import { 
  useCompetitionRegistrations, 
  useUnregisterAthlete, 
  useBulkUpdatePresence,
  useUpdateRegistration,
  type CompetitionRegistration
} from "@/hooks/useCompetitionRegistrations"
import { NotificationError } from "@/lib/notifications"
import CompetitionRosterTable from "./CompetitionRosterTable"
import RegistrationManager from "./RegistrationManager"
import PresenceTracker from "./PresenceTracker"
import ConfirmationModal from "../shared/ConfirmationModal"

interface CompetitionRosterProps {
  competitionId: string
  competition?: {
    id: string
    name: string
    weapon: string
    category: string
    status?: string
  }
  onBack?: () => void
}

export default function CompetitionRoster({ competitionId, competition, onBack }: CompetitionRosterProps) {
  const router = useRouter()
  const params = useParams()
  
  // Access control
  const { isSystemAdmin, isOrganizationAdmin } = useRoleCheck()
  const canManageRegistrations = isSystemAdmin() || isOrganizationAdmin()

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (onBack) {
      onBack()
    } else if (params?.id) {
      // Navigate back to tournament competitions view
      router.push(`/tournaments/${params.id}`)
    } else {
      // Fallback to tournaments list
      router.push('/tournaments')
    }
  }, [onBack, router, params])

  // State management
  const [showRegistrationManager, setShowRegistrationManager] = useState(false)
  const [showPresenceTracker, setShowPresenceTracker] = useState(false)
  const [selectedAthletes, setSelectedAthletes] = useState<CompetitionRegistration[]>([])
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [athleteToDelete, setAthleteToDelete] = useState<CompetitionRegistration | null>(null)

  // TanStack Query hooks
  const registrationFilters = {
    limit: 1000, // Load all registrations for client-side filtering/sorting
    offset: 0,
  }

  const { data: registrationsData, isLoading, error } = useCompetitionRegistrations(competitionId, registrationFilters)
  const unregisterAthleteMutation = useUnregisterAthlete()
  const bulkUpdatePresenceMutation = useBulkUpdatePresence()
  const updateRegistrationMutation = useUpdateRegistration()

  const registrations = registrationsData?.registrations || []
  const competitionInfo = registrationsData?.competition || competition

  // Selection handlers
  const handleSelectAthlete = useCallback((registration: CompetitionRegistration, selected: boolean) => {
    setSelectedAthletes(prev => {
      if (selected) {
        return [...prev, registration]
      } else {
        return prev.filter(r => r.athleteId !== registration.athleteId)
      }
    })
  }, [])

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

  const handlePresenceSuccess = useCallback(() => {
    setSelectedAthletes([])
    setShowPresenceTracker(false)
    // TanStack Query will automatically refetch
  }, [])

  // Individual presence update handlers
  const handleMarkPresent = useCallback(async (athleteId: string) => {
    try {
      await updateRegistrationMutation.mutateAsync({
        competitionId,
        athleteId,
        isPresent: true
      })
    } catch (err) {
      console.error('Failed to mark athlete as present:', err)
    }
  }, [updateRegistrationMutation, competitionId])

  const handleMarkAbsent = useCallback(async (athleteId: string) => {
    try {
      await updateRegistrationMutation.mutateAsync({
        competitionId,
        athleteId,
        isPresent: false
      })
    } catch (err) {
      console.error('Failed to mark athlete as absent:', err)
    }
  }, [updateRegistrationMutation, competitionId])

  // Delete handlers
  const handleUnregister = useCallback((athleteId: string) => {
    const registration = registrations.find(r => r.athleteId === athleteId)
    if (registration) {
      setAthleteToDelete(registration)
      setShowDeleteConfirmation(true)
    }
  }, [registrations])

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

  if (error) {
    return <NotificationError message="Failed to load competition roster" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={handleBack}
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {competitionInfo?.name || 'Competition Roster'}
          </h1>
          {competitionInfo && (
            <p className="text-gray-600">
              {competitionInfo.weapon} - {competitionInfo.category}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      {canManageRegistrations && (
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={handleShowRegistrationManager}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add Athletes
          </button>

          {selectedAthletes.length > 0 && (
            <>
              <button
                onClick={() => handleBulkPresenceUpdate(true)}
                disabled={bulkUpdatePresenceMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
              >
                Mark {selectedAthletes.length} Present
              </button>
              <button
                onClick={() => handleBulkPresenceUpdate(false)}
                disabled={bulkUpdatePresenceMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
              >
                Mark {selectedAthletes.length} Absent
              </button>
              <button
                onClick={handleClearSelection}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Clear Selection
              </button>
            </>
          )}
        </div>
      )}

      {/* Competition Roster Table */}
      <CompetitionRosterTable
        registrations={registrations}
        isLoading={isLoading}
        error={error?.message || null}
        canManageRegistrations={canManageRegistrations}
        onMarkPresent={handleMarkPresent}
        onMarkAbsent={handleMarkAbsent}
        onUnregister={handleUnregister}
        selectedAthletes={selectedAthletes}
        onAthleteSelect={handleSelectAthlete}
      />

      {/* Registration Manager Modal */}
      {showRegistrationManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Add Athletes to Competition</h2>
                <button
                  onClick={() => setShowRegistrationManager(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <RegistrationManager
                competitionId={competitionId}
                onSuccess={handleRegistrationSuccess}
                onCancel={() => setShowRegistrationManager(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Presence Tracker Modal */}
      {showPresenceTracker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Manage Presence</h2>
                <button
                  onClick={() => setShowPresenceTracker(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <PresenceTracker
                competitionId={competitionId}
                selectedAthletes={selectedAthletes}
                onSuccess={handlePresenceSuccess}
                onCancel={() => setShowPresenceTracker(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirmation}
        title="Confirm Unregistration"
        message={
          athleteToDelete
            ? `Are you sure you want to unregister ${athleteToDelete.athlete.firstName} ${athleteToDelete.athlete.lastName} from this competition?`
            : ''
        }
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        confirmText="Unregister"
        cancelText="Cancel"
        isLoading={unregisterAthleteMutation.isPending}
      />
    </div>
  )
} 