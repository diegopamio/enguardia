'use client'

import React, { useState, useCallback } from 'react'
import { useUpdateRegistration, useBulkUpdatePresence, type CompetitionRegistration } from '@/hooks/useCompetitionRegistrations'
import { getCountryName } from '@/lib/countries'

interface PresenceTrackerProps {
  competitionId: string
  selectedAthletes: CompetitionRegistration[]
  onClose: () => void
  onSuccess: () => void
}

export default function PresenceTracker({ 
  competitionId, 
  selectedAthletes, 
  onClose, 
  onSuccess 
}: PresenceTrackerProps) {
  // State management
  const [athleteStates, setAthleteStates] = useState<Record<string, {
    isPresent: boolean
    status: 'REGISTERED' | 'CHECKED_IN' | 'WITHDRAWN' | 'DISQUALIFIED'
  }>>(() => {
    const initialStates: Record<string, any> = {}
    selectedAthletes.forEach(athlete => {
      initialStates[athlete.athleteId] = {
        isPresent: athlete.isPresent,
        status: athlete.status
      }
    })
    return initialStates
  })

  // TanStack Query hooks
  const updateRegistrationMutation = useUpdateRegistration()
  const bulkUpdatePresenceMutation = useBulkUpdatePresence()

  // Individual athlete state handlers
  const handlePresenceChange = useCallback((athleteId: string, isPresent: boolean) => {
    setAthleteStates(prev => ({
      ...prev,
      [athleteId]: {
        ...prev[athleteId],
        isPresent,
        // Auto check-in if marking present
        status: isPresent ? 'CHECKED_IN' : prev[athleteId].status
      }
    }))
  }, [])

  const handleStatusChange = useCallback((athleteId: string, status: typeof athleteStates[string]['status']) => {
    setAthleteStates(prev => ({
      ...prev,
      [athleteId]: {
        ...prev[athleteId],
        status,
        // Auto mark present if checking in
        isPresent: status === 'CHECKED_IN' ? true : prev[athleteId].isPresent
      }
    }))
  }, [])

  // Bulk operations
  const handleBulkPresenceUpdate = useCallback((isPresent: boolean) => {
    const updates: Record<string, any> = {}
    selectedAthletes.forEach(athlete => {
      updates[athlete.athleteId] = {
        ...athleteStates[athlete.athleteId],
        isPresent,
        // Auto check-in if marking all present
        status: isPresent ? 'CHECKED_IN' : athleteStates[athlete.athleteId].status
      }
    })
    setAthleteStates(prev => ({ ...prev, ...updates }))
  }, [selectedAthletes, athleteStates])

  const handleBulkStatusUpdate = useCallback((status: typeof athleteStates[string]['status']) => {
    const updates: Record<string, any> = {}
    selectedAthletes.forEach(athlete => {
      updates[athlete.athleteId] = {
        ...athleteStates[athlete.athleteId],
        status,
        // Auto mark present if checking in
        isPresent: status === 'CHECKED_IN' ? true : athleteStates[athlete.athleteId].isPresent
      }
    })
    setAthleteStates(prev => ({ ...prev, ...updates }))
  }, [selectedAthletes, athleteStates])

  // Save changes
  const handleSaveChanges = useCallback(async () => {
    try {
      const updatePromises = selectedAthletes.map(async (athlete) => {
        const newState = athleteStates[athlete.athleteId]
        const hasChanges = 
          newState.isPresent !== athlete.isPresent || 
          newState.status !== athlete.status

        if (hasChanges) {
          return updateRegistrationMutation.mutateAsync({
            competitionId,
            athleteId: athlete.athleteId,
            isPresent: newState.isPresent,
            status: newState.status
          })
        }
        return Promise.resolve()
      })

      await Promise.all(updatePromises)
      onSuccess()
    } catch (error) {
      console.error('Failed to save changes:', error)
    }
  }, [selectedAthletes, athleteStates, competitionId, updateRegistrationMutation, onSuccess])

  // Check if there are unsaved changes
  const hasUnsavedChanges = selectedAthletes.some(athlete => {
    const newState = athleteStates[athlete.athleteId]
    return newState.isPresent !== athlete.isPresent || newState.status !== athlete.status
  })

  const isLoading = updateRegistrationMutation.isPending || bulkUpdatePresenceMutation.isPending

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Manage Athlete Presence
              </h2>
              <p className="text-gray-600 mt-1">
                Update presence and status for {selectedAthletes.length} selected athlete{selectedAthletes.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              disabled={isLoading}
            >
              ×
            </button>
          </div>

          {/* Bulk Actions */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Bulk Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Presence Status
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkPresenceUpdate(true)}
                    className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors text-sm"
                    disabled={isLoading}
                  >
                    Mark All Present
                  </button>
                  <button
                    onClick={() => handleBulkPresenceUpdate(false)}
                    className="bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 transition-colors text-sm"
                    disabled={isLoading}
                  >
                    Mark All Absent
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Status
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkStatusUpdate('CHECKED_IN')}
                    className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
                    disabled={isLoading}
                  >
                    Check In All
                  </button>
                  <button
                    onClick={() => handleBulkStatusUpdate('WITHDRAWN')}
                    className="bg-yellow-600 text-white px-3 py-2 rounded-md hover:bg-yellow-700 transition-colors text-sm"
                    disabled={isLoading}
                  >
                    Withdraw All
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Individual Athletes */}
          <div className="space-y-4 mb-6">
            <h3 className="text-lg font-medium text-gray-900">Individual Athletes</h3>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Athlete
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Country
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Presence
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        New Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedAthletes.map((registration) => {
                      const currentState = athleteStates[registration.athleteId]
                      const hasChanges = 
                        currentState.isPresent !== registration.isPresent || 
                        currentState.status !== registration.status

                      return (
                        <tr 
                          key={registration.athleteId}
                          className={hasChanges ? 'bg-yellow-50' : 'hover:bg-gray-50'}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {registration.athlete.firstName} {registration.athlete.lastName}
                            </div>
                            {registration.athlete.fieId && (
                              <div className="text-sm text-gray-500">
                                FIE ID: {registration.athlete.fieId}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {registration.athlete.nationality ? getCountryName(registration.athlete.nationality) : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <StatusBadge status={registration.status} />
                              <span className={`w-3 h-3 rounded-full ${registration.isPresent ? 'bg-green-500' : 'bg-red-500'}`} />
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handlePresenceChange(registration.athleteId, true)}
                                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                                  currentState.isPresent 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                                disabled={isLoading}
                              >
                                Present
                              </button>
                              <button
                                onClick={() => handlePresenceChange(registration.athleteId, false)}
                                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                                  !currentState.isPresent 
                                    ? 'bg-red-600 text-white' 
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                                disabled={isLoading}
                              >
                                Absent
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={currentState.status}
                              onChange={(e) => handleStatusChange(registration.athleteId, e.target.value as any)}
                              className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              disabled={isLoading}
                            >
                              <option value="REGISTERED">Registered</option>
                              <option value="CHECKED_IN">Checked In</option>
                              <option value="WITHDRAWN">Withdrawn</option>
                              <option value="DISQUALIFIED">Disqualified</option>
                            </select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Changes Summary */}
          {hasUnsavedChanges && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 bg-yellow-400 rounded-full"></div>
                <h3 className="text-sm font-medium text-yellow-800">Unsaved Changes</h3>
              </div>
              <p className="text-sm text-yellow-700">
                You have unsaved changes to athlete presence and status. Click "Save Changes" to apply them.
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveChanges}
              disabled={isLoading || !hasUnsavedChanges}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 