"use client"

import { useState, useEffect } from "react"
import { useRoleCheck } from "@/lib/auth-client"
import { UserRole } from "@prisma/client"

interface EventFormData {
  name: string
  description: string
  weapon: "EPEE" | "FOIL" | "SABRE"
  category: string
  startDate: string
  endDate: string
  venue: string
  maxParticipants: number | ""
  registrationDeadline: string
  isPublic: boolean
  isActive: boolean
  status: "DRAFT" | "REGISTRATION_OPEN" | "REGISTRATION_CLOSED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  organizationId: string
  translations?: Record<string, {
    name: string
    description: string
  }>
}

interface EventFormProps {
  event?: any // Event to edit (null for create)
  organizationId?: string
  onSubmit: (data: EventFormData) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export default function EventForm({ 
  event, 
  organizationId, 
  onSubmit, 
  onCancel, 
  loading = false 
}: EventFormProps) {
  const [formData, setFormData] = useState<EventFormData>({
    name: "",
    description: "",
    weapon: "EPEE",
    category: "",
    startDate: "",
    endDate: "",
    venue: "",
    maxParticipants: "",
    registrationDeadline: "",
    isPublic: false,
    isActive: false,
    status: "DRAFT",
    organizationId: organizationId || "",
    translations: {}
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showTranslations, setShowTranslations] = useState(false)
  const [selectedLocale, setSelectedLocale] = useState("en")

  const { session, isSystemAdmin, hasRole } = useRoleCheck()

  // Common locales for multilingual support
  const supportedLocales = [
    { code: "en", name: "English" },
    { code: "es", name: "Español" },
    { code: "fr", name: "Français" },
    { code: "de", name: "Deutsch" },
    { code: "it", name: "Italiano" }
  ]

  // Initialize form data when editing
  useEffect(() => {
    if (event) {
      setFormData({
        name: event.name || "",
        description: event.description || "",
        weapon: event.weapon || "EPEE",
        category: event.category || "",
        startDate: event.startDate ? new Date(event.startDate).toISOString().slice(0, 16) : "",
        endDate: event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : "",
        venue: event.venue || "",
        maxParticipants: event.maxParticipants || "",
        registrationDeadline: event.registrationDeadline ? new Date(event.registrationDeadline).toISOString().slice(0, 16) : "",
        isPublic: event.isPublic || false,
        isActive: event.isActive || false,
        status: event.status || "DRAFT",
        organizationId: event.organizationId || organizationId || "",
        translations: event.translations?.reduce((acc: any, t: any) => {
          acc[t.locale] = { name: t.name, description: t.description || "" }
          return acc
        }, {}) || {}
      })
    }
  }, [event, organizationId])

  // Handle form field changes
  const handleChange = (field: keyof EventFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  // Handle translation changes
  const handleTranslationChange = (locale: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      translations: {
        ...prev.translations,
        [locale]: {
          ...prev.translations?.[locale],
          [field]: value
        }
      }
    }))
  }

  // Add translation locale
  const addTranslationLocale = (locale: string) => {
    if (!formData.translations?.[locale]) {
      setFormData(prev => ({
        ...prev,
        translations: {
          ...prev.translations,
          [locale]: { name: "", description: "" }
        }
      }))
    }
    setSelectedLocale(locale)
  }

  // Remove translation locale
  const removeTranslationLocale = (locale: string) => {
    if (formData.translations?.[locale]) {
      const newTranslations = { ...formData.translations }
      delete newTranslations[locale]
      setFormData(prev => ({ ...prev, translations: newTranslations }))
    }
  }

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) newErrors.name = "Event name is required"
    if (!formData.category.trim()) newErrors.category = "Category is required"
    if (!formData.startDate) newErrors.startDate = "Start date is required"
    if (!formData.endDate) newErrors.endDate = "End date is required"
    if (!formData.organizationId) newErrors.organizationId = "Organization is required"

    // Date validation
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate)
      const end = new Date(formData.endDate)
      const now = new Date()
      
      if (start >= end) {
        newErrors.endDate = "End date must be after start date"
      }
      
      if (start < new Date(now.getTime() - 24 * 60 * 60 * 1000)) {
        newErrors.startDate = "Event cannot start more than 1 day in the past"
      }
    }

    // Registration deadline validation
    if (formData.registrationDeadline && formData.startDate) {
      const deadline = new Date(formData.registrationDeadline)
      const start = new Date(formData.startDate)
      
      if (deadline > start) {
        newErrors.registrationDeadline = "Registration deadline must be before event start"
      }
    }

    // Max participants validation
    if (formData.maxParticipants !== "" && (formData.maxParticipants < 2 || formData.maxParticipants > 1000)) {
      newErrors.maxParticipants = "Max participants must be between 2 and 1000"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    const submitData = {
      ...formData,
      maxParticipants: formData.maxParticipants === "" ? undefined : formData.maxParticipants,
      registrationDeadline: formData.registrationDeadline || undefined,
      venue: formData.venue || undefined,
      createdById: session?.user?.id || ""
    }

    try {
      await onSubmit(submitData)
    } catch (error) {
      console.error("Form submission error:", error)
    }
  }

  // Check if user can edit status
  const canEditStatus = () => {
    return isSystemAdmin() || hasRole(UserRole.ORGANIZATION_ADMIN)
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">
          {event ? "Edit Event" : "Create New Event"}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Enter event name"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => handleChange("category", e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.category ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="e.g., Junior, Senior, Veteran"
            />
            {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Event description (optional)"
          />
        </div>

        {/* Event Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Weapon *
            </label>
            <select
              value={formData.weapon}
              onChange={(e) => handleChange("weapon", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="EPEE">Épée</option>
              <option value="FOIL">Foil</option>
              <option value="SABRE">Sabre</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Participants
            </label>
            <input
              type="number"
              min="2"
              max="1000"
              value={formData.maxParticipants}
              onChange={(e) => handleChange("maxParticipants", e.target.value ? parseInt(e.target.value) : "")}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.maxParticipants ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Optional"
            />
            {errors.maxParticipants && <p className="mt-1 text-sm text-red-600">{errors.maxParticipants}</p>}
          </div>

          {canEditStatus() && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange("status", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="DRAFT">Draft</option>
                <option value="REGISTRATION_OPEN">Registration Open</option>
                <option value="REGISTRATION_CLOSED">Registration Closed</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date & Time *
            </label>
            <input
              type="datetime-local"
              value={formData.startDate}
              onChange={(e) => handleChange("startDate", e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.startDate ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date & Time *
            </label>
            <input
              type="datetime-local"
              value={formData.endDate}
              onChange={(e) => handleChange("endDate", e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.endDate ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Registration Deadline
            </label>
            <input
              type="datetime-local"
              value={formData.registrationDeadline}
              onChange={(e) => handleChange("registrationDeadline", e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.registrationDeadline ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.registrationDeadline && <p className="mt-1 text-sm text-red-600">{errors.registrationDeadline}</p>}
          </div>
        </div>

        {/* Venue */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Venue
          </label>
          <input
            type="text"
            value={formData.venue}
            onChange={(e) => handleChange("venue", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Event venue (optional)"
          />
        </div>

        {/* Settings */}
        <div className="flex items-center space-x-6 flex-wrap">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isPublic}
              onChange={(e) => handleChange("isPublic", e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Make event public</span>
          </label>

          {canEditStatus() && (
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleChange("isActive", e.target.checked)}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Set as active event</span>
            </label>
          )}

          <button
            type="button"
            onClick={() => setShowTranslations(!showTranslations)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showTranslations ? "Hide" : "Add"} Translations
          </button>
        </div>

        {/* Translations */}
        {showTranslations && (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Translations</h3>
              <select
                value={selectedLocale}
                onChange={(e) => {
                  const locale = e.target.value
                  if (locale && !formData.translations?.[locale]) {
                    addTranslationLocale(locale)
                  } else {
                    setSelectedLocale(locale)
                  }
                }}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Select language to add...</option>
                {supportedLocales.map(locale => (
                  <option key={locale.code} value={locale.code}>
                    {locale.name}
                  </option>
                ))}
              </select>
            </div>

            {formData.translations && Object.keys(formData.translations).map(locale => (
              <div key={locale} className="mb-4 p-3 bg-gray-50 rounded">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-700">
                    {supportedLocales.find(l => l.code === locale)?.name || locale}
                  </h4>
                  <button
                    type="button"
                    onClick={() => removeTranslationLocale(locale)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={formData.translations[locale]?.name || ""}
                      onChange={(e) => handleTranslationChange(locale, "name", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder={`Event name in ${supportedLocales.find(l => l.code === locale)?.name || locale}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={formData.translations[locale]?.description || ""}
                      onChange={(e) => handleTranslationChange(locale, "description", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder={`Description in ${supportedLocales.find(l => l.code === locale)?.name || locale}`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Saving..." : (event ? "Update Event" : "Create Event")}
          </button>
        </div>
      </form>
    </div>
  )
} 