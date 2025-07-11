'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { useAthletes, type Athlete } from '@/hooks/useAthletes'
import { useRegisterAthlete, useBulkRegisterAthletes, useCompetitionRegistrations } from '@/hooks/useCompetitionRegistrations'
import { getCountryName } from '@/lib/countries'

interface RegistrationManagerProps {
  competitionId: string
  competition?: {
    id: string
    name: string
    weapon: string
    category: string
  }
  onClose: () => void
  onSuccess: () => void
}

export default function RegistrationManager({ 
  competitionId, 
  competition, 
  onClose, 
  onSuccess 
}: RegistrationManagerProps) {
  // State management
  const [searchTerm, setSearchTerm] = useState('')
  const [weaponFilter, setWeaponFilter] = useState(competition?.weapon || '')
  const [organizationFilter, setOrganizationFilter] = useState('')
  const [selectedAthletes, setSelectedAthletes] = useState<Athlete[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const limit = 50

  // TanStack Query hooks
  const athleteFilters = {
    search: searchTerm.trim() || undefined,
    weapon: weaponFilter || undefined,
    organizationId: organizationFilter || undefined,
    limit,
    offset: currentPage * limit,
  }

  const { data: athletesData, isLoading, error } = useAthletes(athleteFilters)
  const registerAthleteMutation = useRegisterAthlete()
  const bulkRegisterMutation = useBulkRegisterAthletes()
  
  // Fetch current registrations to know which athletes are already registered
  const { data: registrationsData } = useCompetitionRegistrations(competitionId, { limit: 1000 }) // Get all registrations
  const registeredAthleteIds = useMemo(() => 
    new Set(registrationsData?.registrations?.map(r => r.athleteId) || []),
    [registrationsData?.registrations]
  )

  const currentPageAthletes = athletesData?.athletes || []
  const pagination = athletesData?.pagination || { total: 0, limit, offset: 0, hasMore: false }

  // Use current page athletes directly for first page, accumulate for subsequent pages
  const [accumulatedAthletes, setAccumulatedAthletes] = React.useState<Athlete[]>([])
  
  // Simple data handling: use current page for page 0, accumulate for others
  const allAthletes = React.useMemo(() => {
    if (currentPage === 0) {
      return currentPageAthletes
    } else {
      return accumulatedAthletes
    }
  }, [currentPage, currentPageAthletes, accumulatedAthletes])

  // Accumulate athletes when loading additional pages
  React.useEffect(() => {
    if (currentPage > 0 && currentPageAthletes.length > 0) {
      setAccumulatedAthletes(prev => {
        const existingIds = new Set(prev.map(a => a.id))
        const newAthletes = currentPageAthletes.filter(athlete => !existingIds.has(athlete.id))
        return newAthletes.length > 0 ? [...prev, ...newAthletes] : prev
      })
    }
  }, [currentPage, currentPageAthletes.length])
  
  // Reset accumulated data when filters change
  React.useEffect(() => {
    setAccumulatedAthletes([])
    setCurrentPage(0)
    setSelectedAthletes([])
  }, [searchTerm, weaponFilter, organizationFilter])
  
  // Selection handlers - only allow selection of unregistered athletes
  const handleSelectAthlete = useCallback((athlete: Athlete) => {
    if (registeredAthleteIds.has(athlete.id)) {
      return // Don't allow selection of already registered athletes
    }
    
    setSelectedAthletes(prev => {
      const isSelected = prev.some(a => a.id === athlete.id)
      if (isSelected) {
        return prev.filter(a => a.id !== athlete.id)
      } else {
        return [...prev, athlete]
      }
    })
  }, [registeredAthleteIds])

  const handleSelectAll = useCallback(() => {
    // Only select unregistered athletes
    const unregisteredAthletes = allAthletes.filter(athlete => !registeredAthleteIds.has(athlete.id))
    
    if (selectedAthletes.length === unregisteredAthletes.length) {
      setSelectedAthletes([])
    } else {
      setSelectedAthletes([...unregisteredAthletes])
    }
  }, [allAthletes, selectedAthletes, registeredAthleteIds])

  const handleClearSelection = useCallback(() => {
    setSelectedAthletes([])
  }, [])

  // Search and filter handlers
  const handleSearch = useCallback((newSearchTerm: string) => {
    setSearchTerm(newSearchTerm)
    setCurrentPage(0)
  }, [])

  const handleWeaponFilterChange = useCallback((weapon: string) => {
    setWeaponFilter(weapon)
    setCurrentPage(0)
  }, [])

  const handleOrganizationFilterChange = useCallback((orgId: string) => {
    setOrganizationFilter(orgId)
    setCurrentPage(0)
  }, [])

  const handleLoadMore = useCallback(() => {
    setCurrentPage(prev => prev + 1)
  }, [])

  // Registration handlers
  const handleRegisterSelected = useCallback(async () => {
    if (selectedAthletes.length === 0) return

    try {
      if (selectedAthletes.length === 1) {
        // Single registration
        await registerAthleteMutation.mutateAsync({
          competitionId,
          athleteId: selectedAthletes[0].id
        })
      } else {
        // Bulk registration
        await bulkRegisterMutation.mutateAsync({
          competitionId,
          athleteIds: selectedAthletes.map(a => a.id)
        })
      }
      onSuccess()
    } catch (error) {
      // Error handling is done in the mutation hooks
      console.error('Registration failed:', error)
    }
  }, [selectedAthletes, competitionId, registerAthleteMutation, bulkRegisterMutation, onSuccess])

  const handleRegisterSingle = useCallback(async (athlete: Athlete) => {
    if (registeredAthleteIds.has(athlete.id)) {
      return // Don't allow registration of already registered athletes
    }
    
    try {
      await registerAthleteMutation.mutateAsync({
        competitionId,
        athleteId: athlete.id
      })
      // Remove from selected list only (the list will refresh after successful registration)
      setSelectedAthletes(prev => prev.filter(a => a.id !== athlete.id))
    } catch (error) {
      console.error('Registration failed:', error)
    }
  }, [competitionId, registerAthleteMutation, registeredAthleteIds])

  // Filter athletes to show compatible weapons
  const compatibleAthletes = useMemo(() => {
    if (!competition?.weapon) return allAthletes
    
    return allAthletes.filter(athlete => 
      athlete.weapons.some(w => w.weapon === competition.weapon)
    )
  }, [allAthletes, competition?.weapon])

  // Separate registered and unregistered athletes for better UX
  const { registeredAthletes, unregisteredAthletes } = useMemo(() => {
    const registered = compatibleAthletes.filter(athlete => registeredAthleteIds.has(athlete.id))
    const unregistered = compatibleAthletes.filter(athlete => !registeredAthleteIds.has(athlete.id))
    return { registeredAthletes: registered, unregisteredAthletes: unregistered }
  }, [compatibleAthletes, registeredAthleteIds])

  const isLoading_ = isLoading || registerAthleteMutation.isPending || bulkRegisterMutation.isPending

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Add Athletes to Competition
              </h2>
              {competition && (
                <p className="text-gray-600 mt-1">
                  {competition.name} - {competition.weapon} {competition.category}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              disabled={isLoading_}
            >
              ×
            </button>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Athletes
              </label>
              <input
                type="text"
                placeholder="Name, FIE ID, nationality..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weapon
              </label>
              <select
                value={weaponFilter}
                onChange={(e) => handleWeaponFilterChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Weapons</option>
                <option value="EPEE">Épée</option>
                <option value="FOIL">Foil</option>
                <option value="SABRE">Sabre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organization
              </label>
              <select
                value={organizationFilter}
                onChange={(e) => handleOrganizationFilterChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Organizations</option>
                {/* TODO: Add organization options */}
              </select>
            </div>
          </div>

          {/* Selection Summary */}
          {selectedAthletes.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-blue-900">
                    {selectedAthletes.length} athlete{selectedAthletes.length !== 1 ? 's' : ''} selected
                  </h3>
                  <p className="text-blue-700 text-sm">
                    {selectedAthletes.map(a => `${a.firstName} ${a.lastName}`).join(', ')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleClearSelection}
                    className="text-blue-700 hover:text-blue-900 text-sm font-medium"
                  >
                    Clear Selection
                  </button>
                  <button
                    onClick={handleRegisterSelected}
                    disabled={isLoading_}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isLoading_ ? 'Registering...' : `Register Selected (${selectedAthletes.length})`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bulk Actions */}
          {unregisteredAthletes.length > 0 && (
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedAthletes.length === unregisteredAthletes.length && unregisteredAthletes.length > 0}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-blue-600 rounded"
                  disabled={isLoading_}
                />
                <span className="text-sm font-medium">Select All Available ({unregisteredAthletes.length})</span>
              </label>
              <span className="text-sm text-gray-600">
                {registeredAthletes.length > 0 && `${registeredAthletes.length} already registered • `}
                Showing athletes with {competition?.weapon || 'compatible weapons'}
              </span>
            </div>
          )}

          {/* Athletes List */}
          {isLoading && currentPage === 0 ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading athletes...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-600 mb-4">
                {error instanceof Error ? error.message : 'Failed to fetch athletes'}
              </div>
            </div>
          ) : compatibleAthletes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">
                No athletes found matching your criteria.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Already Registered Athletes (if any) */}
              {registeredAthletes.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                    Already Registered ({registeredAthletes.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {registeredAthletes.map((athlete) => {
                      const primaryClub = athlete.clubs.find(c => true)?.club
                      const weapons = athlete.weapons.map(w => w.weapon).join(', ')
                      
                      return (
                        <div
                          key={athlete.id}
                          className="border border-green-200 bg-green-50 rounded-lg p-4 opacity-75"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <input
                                  type="checkbox"
                                  checked={false}
                                  disabled={true}
                                  className="h-4 w-4 text-green-600 rounded opacity-50"
                                />
                                <h3 className="font-medium text-gray-700">
                                  {athlete.firstName} {athlete.lastName}
                                </h3>
                                <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                                  REGISTERED
                                </span>
                              </div>
                              
                              <div className="space-y-1 text-sm text-gray-600">
                                {athlete.nationality && (
                                  <div>{getCountryName(athlete.nationality)}</div>
                                )}
                                {athlete.fieId && (
                                  <div>FIE ID: {athlete.fieId}</div>
                                )}
                                {weapons && (
                                  <div>Weapons: {weapons}</div>
                                )}
                                {primaryClub && (
                                  <div>Club: {primaryClub.name}</div>
                                )}
                              </div>
                            </div>
                            
                            <button
                              disabled={true}
                              className="ml-2 text-gray-400 text-sm font-medium cursor-not-allowed"
                            >
                              Already Added
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Available Athletes */}
              {unregisteredAthletes.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                    Available to Register ({unregisteredAthletes.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {unregisteredAthletes.map((athlete) => {
                      const isSelected = selectedAthletes.some(a => a.id === athlete.id)
                      const primaryClub = athlete.clubs.find(c => true)?.club
                      const weapons = athlete.weapons.map(w => w.weapon).join(', ')
                      
                      return (
                        <div
                          key={athlete.id}
                          className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                            isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleSelectAthlete(athlete)}
                                  className="h-4 w-4 text-blue-600 rounded"
                                  disabled={isLoading_}
                                />
                                <h3 className="font-medium text-gray-900">
                                  {athlete.firstName} {athlete.lastName}
                                </h3>
                              </div>
                              
                              <div className="space-y-1 text-sm text-gray-600">
                                {athlete.nationality && (
                                  <div>{getCountryName(athlete.nationality)}</div>
                                )}
                                {athlete.fieId && (
                                  <div>FIE ID: {athlete.fieId}</div>
                                )}
                                {weapons && (
                                  <div>Weapons: {weapons}</div>
                                )}
                                {primaryClub && (
                                  <div>Club: {primaryClub.name}</div>
                                )}
                              </div>
                            </div>
                            
                            <button
                              onClick={() => handleRegisterSingle(athlete)}
                              disabled={isLoading_}
                              className="ml-2 text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50"
                            >
                              Register
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* No Available Athletes */}
              {unregisteredAthletes.length === 0 && registeredAthletes.length > 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-600">
                    All compatible athletes are already registered for this competition.
                  </p>
                </div>
              )}

              {/* Load More */}
              {pagination.hasMore && (
                <div className="text-center pt-4">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoading}
                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Loading...' : 'Load More Athletes'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              disabled={isLoading_}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            {selectedAthletes.length > 0 && (
              <button
                onClick={handleRegisterSelected}
                disabled={isLoading_}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoading_ ? 'Registering...' : `Register ${selectedAthletes.length} Athletes`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 