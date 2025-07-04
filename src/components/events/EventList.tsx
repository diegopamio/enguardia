"use client"

import { useState, useEffect } from "react"
import { useRoleCheck } from "@/lib/auth-client"
import { UserRole } from "@prisma/client"

interface Event {
  id: string
  name: string
  description?: string
  weapon: "EPEE" | "FOIL" | "SABRE"
  category: string
  startDate: string
  endDate: string
  venue?: string
  maxParticipants?: number
  registrationDeadline?: string
  isPublic: boolean
  isActive: boolean
  status: "DRAFT" | "REGISTRATION_OPEN" | "REGISTRATION_CLOSED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  organizationId: string
  participantCount: number
  organization: {
    id: string
    name: string
  }
}

interface EventListProps {
  organizationId?: string
  onEventSelect?: (event: Event) => void
  onEventEdit?: (event: Event) => void
  onEventDelete?: (eventId: string) => void
}

export default function EventList({ 
  organizationId, 
  onEventSelect, 
  onEventEdit,
  onEventDelete 
}: EventListProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    status: "",
    weapon: "",
    category: "",
    search: ""
  })
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    hasMore: true
  })

  const { hasRole, belongsToOrganization, isSystemAdmin } = useRoleCheck()

  // Fetch events
  const fetchEvents = async (reset: boolean = false) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (organizationId) params.append('organizationId', organizationId)
      if (filters.status) params.append('status', filters.status)
      if (filters.weapon) params.append('weapon', filters.weapon)
      if (filters.category) params.append('category', filters.category)
      
      params.append('limit', pagination.limit.toString())
      params.append('offset', reset ? '0' : pagination.offset.toString())

      const response = await fetch(`/api/events?${params}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.statusText}`)
      }

      const data = await response.json()
      const newEvents = data.data || []
      
      if (reset) {
        setEvents(newEvents)
        setPagination(prev => ({ ...prev, offset: 0 }))
      } else {
        setEvents(prev => [...prev, ...newEvents])
      }
      
      setPagination(prev => ({
        ...prev,
        hasMore: newEvents.length === pagination.limit,
        offset: reset ? newEvents.length : prev.offset + newEvents.length
      }))
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events')
    } finally {
      setLoading(false)
    }
  }

  // Load events on component mount and filter changes
  useEffect(() => {
    fetchEvents(true)
  }, [filters, organizationId])

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  // Handle load more
  const handleLoadMore = () => {
    if (!loading && pagination.hasMore) {
      fetchEvents(false)
    }
  }

  // Check if user can edit/delete event
  const canEditEvent = (event: Event) => {
    return isSystemAdmin() || 
           (hasRole(UserRole.ORGANIZATION_ADMIN) && belongsToOrganization(event.organizationId))
  }

  // Status badge colors
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800'
      case 'REGISTRATION_OPEN': return 'bg-green-100 text-green-800'
      case 'REGISTRATION_CLOSED': return 'bg-yellow-100 text-yellow-800'
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800'
      case 'COMPLETED': return 'bg-purple-100 text-purple-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Weapon icons
  const getWeaponIcon = (weapon: string) => {
    switch (weapon) {
      case 'EPEE': return '⚔️'
      case 'FOIL': return '🗡️'
      case 'SABRE': return '⚔️'
      default: return '🤺'
    }
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading events</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button 
              onClick={() => fetchEvents(true)}
              className="mt-2 bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filter Events</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
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
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Weapon</label>
            <select
              value={filters.weapon}
              onChange={(e) => handleFilterChange('weapon', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">All Weapons</option>
              <option value="EPEE">Épée</option>
              <option value="FOIL">Foil</option>
              <option value="SABRE">Sabre</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input
              type="text"
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              placeholder="Search category..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ status: "", weapon: "", category: "", search: "" })}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {events.length === 0 && !loading ? (
          <div className="text-center py-12 bg-white rounded-lg shadow border">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 8a4 4 0 11-8 0v1h16v-1a4 4 0 11-8 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No events found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {Object.values(filters).some(f => f) ? 'Try adjusting your filters' : 'Get started by creating a new event'}
            </p>
          </div>
        ) : (
          events.map((event) => (
            <div key={event.id} className="bg-white rounded-lg shadow border hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-2xl">{getWeaponIcon(event.weapon)}</span>
                      <h3 className="text-lg font-semibold text-gray-900">{event.name}</h3>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(event.status)}`}>
                          {event.status.replace('_', ' ')}
                        </span>
                        {event.isActive && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ ACTIVE
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {event.description && (
                      <p className="text-gray-600 mb-3 line-clamp-2">{event.description}</p>
                    )}
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Category:</span> {event.category}
                      </div>
                      <div>
                        <span className="font-medium">Weapon:</span> {event.weapon}
                      </div>
                      <div>
                        <span className="font-medium">Start:</span> {new Date(event.startDate).toLocaleDateString()}
                      </div>
                      <div>
                        <span className="font-medium">Participants:</span> {event.participantCount}
                        {event.maxParticipants && ` / ${event.maxParticipants}`}
                      </div>
                    </div>
                    
                    {event.venue && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">Venue:</span> {event.venue}
                      </div>
                    )}
                    
                    <div className="mt-2 text-sm text-gray-500">
                      <span className="font-medium">Organization:</span> {event.organization.name}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {onEventSelect && (
                      <button
                        onClick={() => onEventSelect(event)}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm font-medium"
                      >
                        View
                      </button>
                    )}
                    
                    {canEditEvent(event) && onEventEdit && (
                      <button
                        onClick={() => onEventEdit(event)}
                        className="bg-gray-50 hover:bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm font-medium"
                      >
                        Edit
                      </button>
                    )}
                    
                    {canEditEvent(event) && onEventDelete && event.status === 'DRAFT' && (
                      <button
                        onClick={() => onEventDelete(event.id)}
                        className="bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1 rounded text-sm font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
        
        {pagination.hasMore && !loading && events.length > 0 && (
          <div className="text-center py-4">
            <button
              onClick={handleLoadMore}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium"
            >
              Load More Events
            </button>
          </div>
        )}
      </div>
    </div>
  )
} 