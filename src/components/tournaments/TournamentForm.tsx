"use client"

import React, { useState, useEffect } from "react"
import { useRoleCheck } from "@/lib/auth-client"

// Tournament type based on current schema
interface Tournament {
  id: string
  name: string
  description?: string | null
  startDate: Date
  endDate: Date
  venue?: string | null
  status: string
  isPublic: boolean
  isActive: boolean
  organizationId: string
  createdAt: Date
  updatedAt: Date
  createdById: string
}

interface TournamentFormProps {
  mode: "create" | "edit"
  tournament: Tournament | null
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
  loading: boolean
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
  onSubmit,
  onCancel,
  loading,
  organizationId
}: TournamentFormProps) {
  const { isSystemAdmin, session } = useRoleCheck()
  
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

    await onSubmit(submissionData)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          {mode === "create" ? "Create Tournament" : "Edit Tournament"}
        </h2>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Tournament Name *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.name ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="e.g., Copa de Navidad 2024"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="venue" className="block text-sm font-medium text-gray-700 mb-1">
                Venue
              </label>
              <input
                type="text"
                id="venue"
                value={formData.venue}
                onChange={(e) => handleInputChange("venue", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., City Sports Complex"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Brief description of the tournament..."
              />
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Tournament Dates</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                type="datetime-local"
                id="startDate"
                value={formData.startDate}
                onChange={(e) => handleInputChange("startDate", e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.startDate ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>}
            </div>

            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                End Date *
              </label>
              <input
                type="datetime-local"
                id="endDate"
                value={formData.endDate}
                onChange={(e) => handleInputChange("endDate", e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.endDate ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>}
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Tournament Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleInputChange("status", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="DRAFT">Draft</option>
                <option value="REGISTRATION_OPEN">Registration Open</option>
                <option value="REGISTRATION_CLOSED">Registration Closed</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPublic"
                checked={formData.isPublic}
                onChange={(e) => handleInputChange("isPublic", e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
                Public tournament
              </label>
            </div>

            {isSystemAdmin() && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange("isActive", e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                  Set as active tournament
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Multilingual Translations (Optional) */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Translations (Optional)</h3>
            <button
              type="button"
              onClick={() => setShowTranslations(!showTranslations)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {showTranslations ? "Hide" : "Show"} Translations
            </button>
          </div>
          
          {showTranslations && (
            <div className="space-y-6">
              {/* Spanish Translation */}
              <div>
                <h4 className="text-md font-medium text-gray-800 mb-3">Spanish (Español)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tournament Name (Spanish)
                    </label>
                    <input
                      type="text"
                      value={formData.translations.es.name}
                      onChange={(e) => handleTranslationChange("es", "name", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Copa de Navidad 2024"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (Spanish)
                    </label>
                    <textarea
                      rows={2}
                      value={formData.translations.es.description}
                      onChange={(e) => handleTranslationChange("es", "description", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Descripción del torneo en español..."
                    />
                  </div>
                </div>
              </div>

              {/* French Translation */}
              <div>
                <h4 className="text-md font-medium text-gray-800 mb-3">French (Français)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tournament Name (French)
                    </label>
                    <input
                      type="text"
                      value={formData.translations.fr.name}
                      onChange={(e) => handleTranslationChange("fr", "name", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Coupe de Noël 2024"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (French)
                    </label>
                    <textarea
                      rows={2}
                      value={formData.translations.fr.description}
                      onChange={(e) => handleTranslationChange("fr", "description", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Description du tournoi en français..."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Saving..." : mode === "create" ? "Create Tournament" : "Update Tournament"}
          </button>
        </div>
      </form>
    </div>
  )
} 