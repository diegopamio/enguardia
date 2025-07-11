"use client"

import React, { useState, useEffect } from "react"
import { useRoleCheck } from "@/lib/auth-client"
import { useCreateTournament, useUpdateTournament, type Tournament } from "@/hooks/useTournaments"

interface TournamentFormProps {
  mode: "create" | "edit"
  tournament: Tournament | null
  onSuccess: () => void
  onCancel: () => void
  organizationId?: string
}

interface FormData {
  name: string
  description: string
  startDate: string
  endDate: string
  venue: string
  isActive: boolean
  status: string
  isPublic: boolean
  organizationId: string
  translations: {
    [locale: string]: {
      name: string
      description: string
    }
  }
}

export default function TournamentForm({
  mode,
  tournament,
  onSuccess,
  onCancel,
  organizationId
}: TournamentFormProps) {
  const { isSystemAdmin, session } = useRoleCheck()
  
  // TanStack Query hooks
  const createTournamentMutation = useCreateTournament()
  const updateTournamentMutation = useUpdateTournament()
  
  const isLoading = createTournamentMutation.isPending || updateTournamentMutation.isPending
  
  const initialFormData: FormData = {
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    venue: "",
    isActive: false,
    status: "DRAFT",
    isPublic: false,
    organizationId: organizationId || "",
    translations: {
      es: { name: "", description: "" },
      fr: { name: "", description: "" }
    }
  }

  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const [showTranslations, setShowTranslations] = useState(false)

  // Initialize form data
  useEffect(() => {
    if (mode === "edit" && tournament) {
      setFormData({
        name: tournament.name || "",
        description: tournament.description || "",
        startDate: tournament.startDate ? new Date(tournament.startDate).toISOString().slice(0, 16) : "",
        endDate: tournament.endDate ? new Date(tournament.endDate).toISOString().slice(0, 16) : "",
        venue: tournament.venue || "",
        isActive: tournament.isActive || false,
        status: tournament.status || "DRAFT",
        isPublic: tournament.isPublic || false,
        organizationId: tournament.organizationId || organizationId || "",
        translations: {
          es: { name: "", description: "" },
          fr: { name: "", description: "" }
        }
      })
    } else if (mode === "create") {
      setFormData({
        ...initialFormData,
        organizationId: organizationId || session?.user?.organizationId || ""
      })
    }
  }, [mode, tournament, organizationId, session])

  // Handle input changes
  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ""
      }))
    }
  }

  // Handle translation changes
  const handleTranslationChange = (locale: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      translations: {
        ...prev.translations,
        [locale]: {
          ...prev.translations[locale],
          [field]: value
        }
      }
    }))
  }

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {}

    if (!formData.name.trim()) {
      newErrors.name = "Tournament name is required"
    }

    if (!formData.startDate) {
      newErrors.startDate = "Start date is required"
    }

    if (!formData.endDate) {
      newErrors.endDate = "End date is required"
    }

    if (!formData.organizationId) {
      newErrors.organizationId = "Organization is required"
    }

    // Date validation
    if (formData.startDate && formData.endDate) {
      if (new Date(formData.startDate) >= new Date(formData.endDate)) {
        newErrors.endDate = "End date must be after start date"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    // Prepare submission data
    const submissionData = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      startDate: new Date(formData.startDate).toISOString(),
      endDate: new Date(formData.endDate).toISOString(),
      venue: formData.venue.trim() || null,
      isActive: formData.isActive,
      status: formData.status,
      isPublic: formData.isPublic,
      organizationId: formData.organizationId,
      createdById: session?.user?.id,
      translations: showTranslations ? formData.translations : undefined
    }

    try {
      if (mode === "edit" && tournament) {
        await updateTournamentMutation.mutateAsync({
          id: tournament.id,
          ...submissionData
        })
      } else {
        await createTournamentMutation.mutateAsync(submissionData)
      }
      
      onSuccess()
    } catch (error) {
      // Error handling is done in the mutation hooks
      console.error("Form submission error:", error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          {mode === "create" ? "Create Tournament" : "Edit Tournament"}
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          disabled={isLoading}
        >
          ×
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Tournament Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Enter tournament name"
              disabled={isLoading}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter tournament description"
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <input
                type="datetime-local"
                id="startDate"
                value={formData.startDate}
                onChange={(e) => handleInputChange("startDate", e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.startDate ? "border-red-500" : "border-gray-300"
                }`}
                disabled={isLoading}
              />
              {errors.startDate && <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>}
            </div>

            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                End Date *
              </label>
              <input
                type="datetime-local"
                id="endDate"
                value={formData.endDate}
                onChange={(e) => handleInputChange("endDate", e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.endDate ? "border-red-500" : "border-gray-300"
                }`}
                disabled={isLoading}
              />
              {errors.endDate && <p className="text-red-500 text-sm mt-1">{errors.endDate}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="venue" className="block text-sm font-medium text-gray-700 mb-2">
              Venue
            </label>
            <input
              type="text"
              id="venue"
              value={formData.venue}
              onChange={(e) => handleInputChange("venue", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter venue location"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => handleInputChange("status", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="REGISTRATION_OPEN">Registration Open</option>
              <option value="REGISTRATION_CLOSED">Registration Closed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Checkboxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => handleInputChange("isActive", e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isLoading}
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Active Tournament
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPublic"
                checked={formData.isPublic}
                onChange={(e) => handleInputChange("isPublic", e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isLoading}
              />
              <label htmlFor="isPublic" className="text-sm font-medium text-gray-700">
                Public Tournament
              </label>
            </div>
          </div>

          {/* Translations Toggle */}
          <div className="border-t pt-4">
            <button
              type="button"
              onClick={() => setShowTranslations(!showTranslations)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              disabled={isLoading}
            >
              {showTranslations ? "Hide" : "Show"} Translations
            </button>
          </div>

          {/* Translations Section */}
          {showTranslations && (
            <div className="space-y-4 bg-gray-50 p-4 rounded-md">
              <h3 className="text-sm font-medium text-gray-700">Translations</h3>
              
              {/* Spanish */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-600">Spanish (ES)</h4>
                <input
                  type="text"
                  value={formData.translations.es.name}
                  onChange={(e) => handleTranslationChange("es", "name", e.target.value)}
                  placeholder="Tournament name in Spanish"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <textarea
                  value={formData.translations.es.description}
                  onChange={(e) => handleTranslationChange("es", "description", e.target.value)}
                  placeholder="Description in Spanish"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>

              {/* French */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-600">French (FR)</h4>
                <input
                  type="text"
                  value={formData.translations.fr.name}
                  onChange={(e) => handleTranslationChange("fr", "name", e.target.value)}
                  placeholder="Tournament name in French"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <textarea
                  value={formData.translations.fr.description}
                  onChange={(e) => handleTranslationChange("fr", "description", e.target.value)}
                  placeholder="Description in French"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : (mode === "create" ? "Create Tournament" : "Update Tournament")}
          </button>
        </div>
      </form>
    </div>
  )
} 