'use client'

import React, { useState, useEffect } from "react"
import { useCreateCompetition, useUpdateCompetition, type Competition } from "@/hooks/useCompetitions"

interface Tournament {
  id: string
  name: string
  organizationId: string
}

interface CompetitionFormData {
  name: string
  weapon: 'EPEE' | 'FOIL' | 'SABRE'
  category: string
  status: 'DRAFT' | 'REGISTRATION_OPEN' | 'REGISTRATION_CLOSED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  registrationDeadline?: string
  tournamentId: string
}

interface CompetitionFormProps {
  mode: 'create' | 'edit'
  competition?: Competition | null
  onSuccess: () => void
  onCancel: () => void
  tournaments: Tournament[]
  defaultTournamentId?: string
}

const initialFormData: CompetitionFormData = {
  name: '',
  weapon: 'EPEE',
  category: '',
  status: 'DRAFT',
  registrationDeadline: '',
  tournamentId: ''
}

export default function CompetitionForm({
  mode,
  competition,
  onSuccess,
  onCancel,
  tournaments,
  defaultTournamentId
}: CompetitionFormProps) {
  const [formData, setFormData] = useState<CompetitionFormData>(initialFormData)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // TanStack Query hooks
  const createCompetitionMutation = useCreateCompetition()
  const updateCompetitionMutation = useUpdateCompetition()
  
  const isLoading = createCompetitionMutation.isPending || updateCompetitionMutation.isPending

  // Populate form when editing or when defaultTournamentId changes
  useEffect(() => {
    if (competition) {
      setFormData({
        name: competition.name,
        weapon: competition.weapon,
        category: competition.category,
        status: competition.status,
        registrationDeadline: competition.registrationDeadline 
          ? new Date(competition.registrationDeadline).toISOString().split('T')[0]
          : '',
        tournamentId: competition.tournamentId
      })
    } else {
      setFormData({
        ...initialFormData,
        tournamentId: defaultTournamentId || ''
      })
    }
    setErrors({})
  }, [competition, defaultTournamentId])

  const handleInputChange = (field: keyof CompetitionFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Competition name is required'
    } else if (formData.name.length < 3) {
      newErrors.name = 'Competition name must be at least 3 characters'
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Category is required'
    }

    if (!formData.tournamentId) {
      newErrors.tournamentId = 'Tournament selection is required'
    }

    if (formData.registrationDeadline) {
      const deadline = new Date(formData.registrationDeadline)
      const now = new Date()
      if (deadline < now) {
        newErrors.registrationDeadline = 'Registration deadline cannot be in the past'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      const payload = {
        ...formData,
        registrationDeadline: formData.registrationDeadline || null
      }

      if (mode === 'edit' && competition) {
        await updateCompetitionMutation.mutateAsync({
          id: competition.id,
          ...payload
        })
      } else {
        await createCompetitionMutation.mutateAsync(payload)
      }
      
      onSuccess()
    } catch (error) {
      // Error handling is done in the mutation hooks
      console.error('Form submission error:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          {mode === "create" ? "Create Competition" : "Edit Competition"}
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
        {/* Competition Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Competition Name *
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.name ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Enter competition name"
            disabled={isLoading}
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        {/* Tournament Selection */}
        <div>
          <label htmlFor="tournamentId" className="block text-sm font-medium text-gray-700 mb-2">
            Tournament *
          </label>
          <select
            id="tournamentId"
            value={formData.tournamentId}
            onChange={(e) => handleInputChange("tournamentId", e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.tournamentId ? "border-red-500" : "border-gray-300"
            }`}
            disabled={isLoading}
          >
            <option value="">Select a tournament</option>
            {tournaments?.map((tournament) => (
              <option key={tournament.id} value={tournament.id}>
                {tournament.name}
              </option>
            ))}
          </select>
          {errors.tournamentId && <p className="text-red-500 text-sm mt-1">{errors.tournamentId}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Weapon */}
          <div>
            <label htmlFor="weapon" className="block text-sm font-medium text-gray-700 mb-2">
              Weapon *
            </label>
            <select
              id="weapon"
              value={formData.weapon}
              onChange={(e) => handleInputChange("weapon", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              <option value="EPEE">Épée</option>
              <option value="FOIL">Foil</option>
              <option value="SABRE">Sabre</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <input
              type="text"
              id="category"
              value={formData.category}
              onChange={(e) => handleInputChange("category", e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.category ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="e.g., Senior Men, U20 Women"
              disabled={isLoading}
            />
            {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status */}
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
              <option value="REGISTRATION_OPEN">Registration Open</option>
              <option value="REGISTRATION_CLOSED">Registration Closed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Registration Deadline */}
          <div>
            <label htmlFor="registrationDeadline" className="block text-sm font-medium text-gray-700 mb-2">
              Registration Deadline
            </label>
            <input
              type="date"
              id="registrationDeadline"
              value={formData.registrationDeadline}
              onChange={(e) => handleInputChange("registrationDeadline", e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.registrationDeadline ? "border-red-500" : "border-gray-300"
              }`}
              disabled={isLoading}
            />
            {errors.registrationDeadline && (
              <p className="text-red-500 text-sm mt-1">{errors.registrationDeadline}</p>
            )}
          </div>
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
            {isLoading ? 'Saving...' : (mode === "create" ? "Create Competition" : "Update Competition")}
          </button>
        </div>
      </form>
    </div>
  )
} 