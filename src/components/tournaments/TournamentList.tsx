"use client"

import { useState, useEffect, useCallback } from "react"
import { notify, apiFetch, NotificationError, getMessage } from "@/lib/notifications"
import { Tournament } from "./TournamentManagement"

interface TournamentListProps {
  onTournamentCreate: () => void
  onTournamentEdit: (tournament: Tournament) => void
  onTournamentView: (tournament: Tournament) => void
  onTournamentDelete: (tournamentId: string) => void
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  refreshKey: number
  organizationId?: string
}

export default function TournamentList({
  onTournamentCreate,
  onTournamentEdit,
  onTournamentView,
  onTournamentDelete,
  canCreate,
  canEdit,
  canDelete,
  refreshKey,
  organizationId
}: TournamentListProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 20

  // Fetch tournaments
  const fetchTournaments = useCallback(async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: ((currentPage - 1) * itemsPerPage).toString()
      })
      
      if (organizationId) {
        params.append('organizationId', organizationId)
      }
      
      if (statusFilter) {
        params.append('status', statusFilter)
      }
      
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim())
      }
      
      const response = await apiFetch(`/api/tournaments?${params.toString()}`)
      const data = await response.json()
      
      if (data.tournaments) {
        setTournaments(data.tournaments)
        setTotalCount(data.tournaments.length)
      } else {
        setTournaments([])
        setTotalCount(0)
      }
      
    } catch (error) {
      console.error("Error fetching tournaments:", error)
      
      if (error instanceof NotificationError) {
        notify.error(error.message)
      } else {
        notify.error(getMessage('error.tournament.fetchFailed'))
      }
      
      setTournaments([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [currentPage, organizationId, statusFilter, searchTerm, refreshKey])

  // Effect to fetch tournaments
  useEffect(() => {
    fetchTournaments()
  }, [fetchTournaments])

  // Handle search
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchTournaments()
  }, [fetchTournaments])

  // Handle filter change
  const handleFilterChange = useCallback((status: string) => {
    setStatusFilter(status)
    setCurrentPage(1)
  }, [])

  // Calculate pagination
  const totalPages = Math.ceil(totalCount / itemsPerPage)
  const hasNextPage = currentPage < totalPages
  const hasPrevPage = currentPage > 1

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Tournaments</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage fencing tournaments and competitions
          </p>
        </div>
        {canCreate && (
          <button
            onClick={onTournamentCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Create Tournament
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search tournaments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
          <button
            type="submit"
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Search
          </button>
        </form>
      </div>

      {/* Tournament Cards */}
      <div className="space-y-4">
        {tournaments.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tournaments found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || statusFilter 
                ? "Try adjusting your search criteria or filters."
                : "Get started by creating your first tournament."
              }
            </p>
            {canCreate && !searchTerm && !statusFilter && (
              <button
                onClick={onTournamentCreate}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Create Tournament
              </button>
            )}
          </div>
        ) : (
          tournaments.map((tournament) => (
            <div key={tournament.id} className="bg-white shadow rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">
                      {tournament.name}
                    </h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      tournament.status === 'COMPLETED' ? 'bg-gray-100 text-gray-800' :
                      tournament.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                      tournament.status === 'REGISTRATION_OPEN' ? 'bg-green-100 text-green-800' :
                      tournament.status === 'REGISTRATION_CLOSED' ? 'bg-yellow-100 text-yellow-800' :
                      tournament.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {tournament.status.replace('_', ' ')}
                    </span>
                    {tournament.isActive && (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        ✓ ACTIVE
                      </span>
                    )}
                  </div>
                  
                  {tournament.description && (
                    <p className="text-gray-600 mb-3 text-sm">
                      {tournament.description}
                    </p>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-500">
                    <div>
                      <span className="font-medium">Tournament Dates:</span>
                      <br />
                      {new Date(tournament.startDate).toLocaleDateString()} - {new Date(tournament.endDate).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>
                      <br />
                      {tournament.status.replace('_', ' ')}
                    </div>
                    <div>
                      <span className="font-medium">Venue:</span>
                      <br />
                      {tournament.venue || "TBD"}
                    </div>
                    <div>
                      <span className="font-medium">Competitions:</span>
                      <br />
                      {tournament._count?.competitions || 0}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 ml-4">
                  <button
                    onClick={() => onTournamentView(tournament)}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    View
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => onTournamentEdit(tournament)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Edit
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => onTournamentDelete(tournament.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 border-t border-gray-200 sm:px-6 rounded-lg shadow">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(prev => prev - 1)}
              disabled={!hasPrevPage}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={!hasNextPage}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span>
                {' '}to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, totalCount)}
                </span>
                {' '}of{' '}
                <span className="font-medium">{totalCount}</span>
                {' '}results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  disabled={!hasPrevPage}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={!hasNextPage}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 