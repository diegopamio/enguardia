"use client"

import { useState, useCallback } from "react"
import { useRoleCheck } from "@/lib/auth-client"
import { UserRole } from "@prisma/client"
import { notify, apiFetch, NotificationError, confirmDelete, getMessage } from "@/lib/notifications"
import EventList from "./EventList"
import EventForm from "./EventForm"

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
  status: "DRAFT" | "REGISTRATION_OPEN" | "REGISTRATION_CLOSED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  organizationId: string
  participantCount: number
  organization: {
    id: string
    name: string
  }
}

interface EventManagementProps {
  organizationId?: string
}

type ViewMode = "list" | "create" | "edit" | "view"

export default function EventManagement({ organizationId }: EventManagementProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const { session, hasRole, isSystemAdmin, belongsToOrganization } = useRoleCheck()

  // Check if user can create events
  const canCreateEvents = () => {
    if (!session?.user?.organizationId && !isSystemAdmin()) return false
    return hasRole(UserRole.ORGANIZATION_ADMIN) || isSystemAdmin()
  }

  // Handle event selection for viewing
  const handleEventSelect = useCallback((event: Event) => {
    setSelectedEvent(event)
    setViewMode("view")
  }, [])

  // Handle event editing
  const handleEventEdit = useCallback((event: Event) => {
    setSelectedEvent(event)
    setViewMode("edit")
  }, [])

  // Handle event deletion
  const handleEventDelete = useCallback(async (eventId: string) => {
    if (!confirmDelete()) {
      return
    }

    const loadingToast = notify.loading(getMessage('info.deleting')) as string

    try {
      setLoading(true)
      
      await apiFetch(`/api/events/${eventId}`, {
        method: "DELETE"
      })

      notify.dismiss(loadingToast)
      notify.success(getMessage('success.event.deleted'))
      
      // Refresh the event list
      setRefreshKey(prev => prev + 1)
      
    } catch (error) {
      notify.dismiss(loadingToast)
      console.error("Error deleting event:", error)
      
      if (error instanceof NotificationError) {
        notify.error(error.message)
      } else {
        notify.error(getMessage('error.event.deleteFailed'))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Handle form submission (create/edit)
  const handleFormSubmit = useCallback(async (formData: any) => {
    const isEdit = !!selectedEvent
    const loadingToast = notify.loading(getMessage(isEdit ? 'info.saving' : 'info.processing')) as string
    
    try {
      setLoading(true)
      
      const url = selectedEvent ? `/api/events/${selectedEvent.id}` : "/api/events"
      const method = selectedEvent ? "PUT" : "POST"
      
      const response = await apiFetch(url, {
        method,
        body: JSON.stringify(formData)
      })

      const result = await response.json()
      
      notify.dismiss(loadingToast)
      
      if (isEdit) {
        notify.success(getMessage('success.event.updated'))
      } else {
        notify.success(getMessage('success.event.created'))
      }
      
      // Reset form and refresh list
      setSelectedEvent(null)
      setViewMode("list")
      setRefreshKey(prev => prev + 1)
      
    } catch (error) {
      notify.dismiss(loadingToast)
      console.error("Error submitting form:", error)
      
      if (error instanceof NotificationError) {
        // Handle validation errors specifically
        if (error.errors && error.errors.length > 0) {
          const validationMessage = error.errors
            .map(e => `${e.field}: ${e.message}`)
            .join('\n')
          notify.error(validationMessage)
        } else {
          notify.error(error.message)
        }
      } else {
        const errorKey = isEdit ? 'error.event.updateFailed' : 'error.event.createFailed'
        notify.error(getMessage(errorKey))
      }
      throw error // Re-throw to let form handle loading state
    } finally {
      setLoading(false)
    }
  }, [selectedEvent])

  // Handle form cancellation
  const handleFormCancel = useCallback(() => {
    setSelectedEvent(null)
    setViewMode("list")
  }, [])

  // Handle back to list
  const handleBackToList = useCallback(() => {
    setSelectedEvent(null)
    setViewMode("list")
  }, [])

  // Render event details view
  const renderEventView = () => {
    if (!selectedEvent) return null

    const canEdit = isSystemAdmin() || 
                   (hasRole(UserRole.ORGANIZATION_ADMIN) && belongsToOrganization(selectedEvent.organizationId))

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBackToList}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Events
          </button>
          
          {canEdit && (
            <div className="flex space-x-2">
              <button
                onClick={() => handleEventEdit(selectedEvent)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Edit Event
              </button>
              {selectedEvent.status === "DRAFT" && (
                <button
                  onClick={() => handleEventDelete(selectedEvent.id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  disabled={loading}
                >
                  Delete Event
                </button>
              )}
            </div>
          )}
        </div>

        {/* Event Details */}
        <div className="bg-white rounded-lg shadow border p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Information */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <span className="text-3xl">
                    {selectedEvent.weapon === "EPEE" ? "⚔️" : selectedEvent.weapon === "FOIL" ? "🗡️" : "⚔️"}
                  </span>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{selectedEvent.name}</h1>
                    <p className="text-gray-600">{selectedEvent.category} • {selectedEvent.weapon}</p>
                  </div>
                </div>
                
                {selectedEvent.description && (
                  <p className="text-gray-700 leading-relaxed">{selectedEvent.description}</p>
                )}
              </div>

              {/* Event Schedule */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Schedule</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Start Date</p>
                    <p className="text-gray-900">{new Date(selectedEvent.startDate).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">End Date</p>
                    <p className="text-gray-900">{new Date(selectedEvent.endDate).toLocaleString()}</p>
                  </div>
                  {selectedEvent.registrationDeadline && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Registration Deadline</p>
                      <p className="text-gray-900">{new Date(selectedEvent.registrationDeadline).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Venue */}
              {selectedEvent.venue && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Venue</h3>
                  <p className="text-gray-700">{selectedEvent.venue}</p>
                </div>
              )}
            </div>

            {/* Sidebar Information */}
            <div className="space-y-6">
              {/* Status */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Status</h3>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  selectedEvent.status === "DRAFT" ? "bg-gray-100 text-gray-800" :
                  selectedEvent.status === "REGISTRATION_OPEN" ? "bg-green-100 text-green-800" :
                  selectedEvent.status === "REGISTRATION_CLOSED" ? "bg-yellow-100 text-yellow-800" :
                  selectedEvent.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-800" :
                  selectedEvent.status === "COMPLETED" ? "bg-purple-100 text-purple-800" :
                  "bg-red-100 text-red-800"
                }`}>
                  {selectedEvent.status.replace("_", " ")}
                </span>
              </div>

              {/* Participants */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Participants</h3>
                <div className="text-2xl font-bold text-blue-600">
                  {selectedEvent.participantCount}
                  {selectedEvent.maxParticipants && (
                    <span className="text-lg text-gray-500">/{selectedEvent.maxParticipants}</span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {selectedEvent.maxParticipants ? "registered participants" : "participants registered"}
                </p>
              </div>

              {/* Organization */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Organization</h3>
                <p className="text-gray-700">{selectedEvent.organization.name}</p>
              </div>

              {/* Visibility */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Visibility</h3>
                <p className="text-gray-700">{selectedEvent.isPublic ? "Public Event" : "Private Event"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {viewMode === "list" && (
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Event Management</h1>
          {canCreateEvents() && (
            <button
              onClick={() => setViewMode("create")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Event
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {viewMode === "list" && (
        <EventList
          key={refreshKey}
          organizationId={organizationId}
          onEventSelect={handleEventSelect}
          onEventEdit={handleEventEdit}
          onEventDelete={handleEventDelete}
        />
      )}

      {(viewMode === "create" || viewMode === "edit") && (
        <EventForm
          event={selectedEvent}
          organizationId={organizationId || session?.user?.organizationId}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          loading={loading}
        />
      )}

      {viewMode === "view" && renderEventView()}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-700">Processing...</span>
          </div>
        </div>
      )}
    </div>
  )
} 