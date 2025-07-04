"use client"

import { useState, useEffect } from "react"
import { useRoleCheck } from "@/lib/auth-client"
import { Tournament } from "./TournamentManagement"

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
  registrationOpenDate: string
  registrationCloseDate: string
  venue: string
  isActive: boolean
  status: string
  maxParticipants: string
  organizationId: string
  translations: {
    [locale: string]: {
      name: string
      description: string
    }
  }
}

const initialFormData: FormData = {
  name: "",
  description: "",
  startDate: "",
  endDate: "",
  registrationOpenDate: "",
  registrationCloseDate: "",
  venue: "",
  isActive: false,
  status: "DRAFT",
  maxParticipants: "",
  organizationId: "",
  translations: {
    es: { name: "", description: "" },
    fr: { name: "", description: "" }
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
  const { isSystemAdmin, isOrgAdmin, session } = useRoleCheck()
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
        registrationOpenDate: tournament.registrationOpenDate ? new Date(tournament.registrationOpenDate).toISOString().slice(0, 16) : "",
        registrationCloseDate: tournament.registrationCloseDate ? new Date(tournament.registrationCloseDate).toISOString().slice(0, 16) : "",
        venue: tournament.venue || "",
        isActive: tournament.isActive || false,
        status: tournament.status || "DRAFT",
        maxParticipants: tournament.maxParticipants?.toString() || "",
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

    if (!formData.registrationOpenDate) {
      newErrors.registrationOpenDate = "Registration open date is required"
    }

    if (!formData.registrationCloseDate) {
      newErrors.registrationCloseDate = "Registration close date is required"
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

    if (formData.registrationOpenDate && formData.registrationCloseDate) {
      if (new Date(formData.registrationOpenDate) >= new Date(formData.registrationCloseDate)) {
        newErrors.registrationCloseDate = "Registration close date must be after registration open date"
      }
    }

    if (formData.registrationCloseDate && formData.startDate) {
      if (new Date(formData.registrationCloseDate) > new Date(formData.startDate)) {
        newErrors.registrationCloseDate = "Registration must close before tournament starts"
      }
    }

    // Max participants validation
    if (formData.maxParticipants && (parseInt(formData.maxParticipants) < 2 || parseInt(formData.maxParticipants) > 1000)) {
      newErrors.maxParticipants = "Max participants must be between 2 and 1000"
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
      description: formData.description.trim() || undefined,
      startDate: new Date(formData.startDate).toISOString(),
      endDate: new Date(formData.endDate).toISOString(),
      registrationOpenDate: new Date(formData.registrationOpenDate).toISOString(),
      registrationCloseDate: new Date(formData.registrationCloseDate).toISOString(),
      venue: formData.venue.trim() || undefined,
      isActive: formData.isActive,
      status: formData.status,
      maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : undefined,
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
                placeholder="Describe the tournament, special rules, or other relevant information..."
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
                Start Date & Time *
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
                End Date & Time *
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

            <div>
              <label htmlFor="registrationOpenDate" className="block text-sm font-medium text-gray-700 mb-1">
                Registration Opens *
              </label>
              <input
                type="datetime-local"
                id="registrationOpenDate"
                value={formData.registrationOpenDate}
                onChange={(e) => handleInputChange("registrationOpenDate", e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.registrationOpenDate ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.registrationOpenDate && <p className="mt-1 text-sm text-red-600">{errors.registrationOpenDate}</p>}
            </div>

            <div>
              <label htmlFor="registrationCloseDate" className="block text-sm font-medium text-gray-700 mb-1">
                Registration Closes *
              </label>
              <input
                type="datetime-local"
                id="registrationCloseDate"
                value={formData.registrationCloseDate}
                onChange={(e) => handleInputChange("registrationCloseDate", e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.registrationCloseDate ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.registrationCloseDate && <p className="mt-1 text-sm text-red-600">{errors.registrationCloseDate}</p>}
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

            <div>
              <label htmlFor="maxParticipants" className="block text-sm font-medium text-gray-700 mb-1">
                Max Participants
              </label>
              <input
                type="number"
                id="maxParticipants"
                min="2"
                max="1000"
                value={formData.maxParticipants}
                onChange={(e) => handleInputChange("maxParticipants", e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.maxParticipants ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="Leave empty for unlimited"
              />
              {errors.maxParticipants && <p className="mt-1 text-sm text-red-600">{errors.maxParticipants}</p>}
            </div>

            {(isSystemAdmin || isOrgAdmin) && (
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