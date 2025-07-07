'use client'

import React, { useState, useEffect, useCallback } from "react"
import { useRoleCheck } from "@/lib/auth-client"
import { notify, apiFetch, NotificationError, confirmDelete, getMessage } from "@/lib/notifications"
import CompetitionList from "./CompetitionList"
import CompetitionForm from "./CompetitionForm"

// Competition type based on current schema
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

interface Tournament {
  id: string
  name: string
  organizationId: string
}

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
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [availableTournaments, setAvailableTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("")
  const [weaponFilter, setWeaponFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [tournamentFilter, setTournamentFilter] = useState(tournamentId || "")
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 20

  // Role-based access control
  const canCreate = isSystemAdmin() || isOrganizationAdmin()
  const canEdit = isSystemAdmin() || isOrganizationAdmin()
  const canDelete = isSystemAdmin() || isOrganizationAdmin()
  const canView = true // Everyone can view competitions

  // Fetch available tournaments
  const fetchTournaments = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '100', offset: '0' })
      if (organizationId) {
        params.append('organizationId', organizationId)
      }
      
      const response = await apiFetch(`/api/tournaments?${params.toString()}`)
      const data = await response.json()
      
      if (data.tournaments) {
        setAvailableTournaments(data.tournaments.map((t: any) => ({
          id: t.id,
          name: t.name,
          organizationId: t.organizationId
        })))
      }
    } catch (err) {
      console.error('Error fetching tournaments:', err)
    }
  }, [organizationId])

  // Fetch competitions
  const fetchCompetitions = useCallback(async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: ((currentPage - 1) * itemsPerPage).toString()
      })
      
      if (tournamentFilter) {
        params.append('tournamentId', tournamentFilter)
      }
      
      if (organizationId) {
        params.append('organizationId', organizationId)
      }
      
      if (weaponFilter) {
        params.append('weapon', weaponFilter)
      }
      
      if (statusFilter) {
        params.append('status', statusFilter)
      }
      
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim())
      }
      
      const response = await apiFetch(`/api/competitions?${params.toString()}`)
      const data = await response.json()
      
      if (data.competitions) {
        setCompetitions(data.competitions)
        setTotalCount(data.total || data.competitions.length)
      } else {
        setCompetitions([])
        setTotalCount(0)
      }
    } catch (err) {
      console.error('Error fetching competitions:', err)
      if (err instanceof NotificationError) {
        notify.error(err.message)
      } else {
        notify.error('Failed to load competitions')
      }
      setCompetitions([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [currentPage, tournamentFilter, organizationId, weaponFilter, statusFilter, searchTerm, refreshKey])

  // Load data on component mount and dependencies change
  useEffect(() => {
    fetchTournaments()
  }, [fetchTournaments])

  useEffect(() => {
    fetchCompetitions()
  }, [fetchCompetitions])

  // Handle competition creation
  const handleCompetitionCreate = useCallback(() => {
    if (!canCreate) {
      notify.error('You do not have permission to create competitions')
      return
    }
    setSelectedCompetition(null)
    setCurrentView("create")
  }, [canCreate])

  // Handle competition editing
  const handleCompetitionEdit = useCallback((competition: Competition) => {
    if (!canEdit) {
      notify.error('You do not have permission to edit competitions')
      return
    }
    setSelectedCompetition(competition)
    setCurrentView("edit")
  }, [canEdit])

  // Handle competition deletion
  const handleCompetitionDelete = useCallback(async (competitionId: string) => {
    if (!canDelete) {
      notify.error('You do not have permission to delete competitions')
      return
    }

    if (!confirmDelete()) {
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

  // Handle form submission
  const handleFormSuccess = useCallback(() => {
    setCurrentView("list")
    setSelectedCompetition(null)
    setRefreshKey(prev => prev + 1)
  }, [])

  // Handle form cancellation
  const handleFormCancel = useCallback(() => {
    setCurrentView("list")
    setSelectedCompetition(null)
  }, [])

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  if (!canView) {
    return (
      <div className="text-center p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">You do not have permission to view competitions.</p>
      </div>
    )
  }

  // Render current view
  if (currentView === "create" || currentView === "edit") {
    return (
      <CompetitionForm
        competition={selectedCompetition}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
        availableTournaments={availableTournaments}
      />
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {tournamentId ? 'Tournament Competitions' : 'Competition Management'}
          </h1>
          <p className="mt-2 text-gray-600">
            Manage fencing competitions and their participants
          </p>
        </div>
        {canCreate && (
          <button
            onClick={handleCompetitionCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Create Competition
          </button>
        )}
      </div>
      
      <CompetitionList
        competitions={competitions}
        onEdit={handleCompetitionEdit}
        onDelete={handleCompetitionDelete}
        loading={loading}
        totalCount={totalCount}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        onPageChange={handlePageChange}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        weaponFilter={weaponFilter}
        onWeaponFilterChange={setWeaponFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        tournamentFilter={tournamentFilter}
        onTournamentFilterChange={setTournamentFilter}
        availableTournaments={availableTournaments}
      />
    </div>
  )
} 