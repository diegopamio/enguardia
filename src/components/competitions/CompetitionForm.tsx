'use client'

import React, { useState, useEffect } from "react"
import { notify, apiFetch, getMessage } from "@/lib/notifications"
import { Competition } from "./CompetitionList"

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
  mode?: 'create' | 'edit'
  competition?: Competition | null
  onSubmit?: (formData: any) => Promise<void> | void
  onSuccess?: () => void // Legacy callback for backward compatibility
  onCancel: () => void
  loading?: boolean
  availableTournaments?: Tournament[]
  organizationId?: string
  preselectedTournamentId?: string
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
  onSubmit,
  onSuccess,
  onCancel,
  loading: externalLoading = false,
  availableTournaments,
  organizationId,
  preselectedTournamentId
}: CompetitionFormProps) {
  const [formData, setFormData] = useState<CompetitionFormData>(initialFormData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [tournaments, setTournaments] = useState<Tournament[]>(availableTournaments || [])

  const isEditing = mode === 'edit' || !!competition

  // Fetch tournaments if not provided
  useEffect(() => {
    if (!availableTournaments) {
      const fetchTournaments = async () => {
        try {
          const params = new URLSearchParams({ limit: '100', offset: '0' })
          if (organizationId) {
            params.append('organizationId', organizationId)
          }
          
          const response = await apiFetch(`/api/tournaments?${params.toString()}`)
          const data = await response.json()
          
          if (data.tournaments) {
            setTournaments(data.tournaments.map((t: any) => ({
              id: t.id,
              name: t.name,
              organizationId: t.organizationId
            })))
          }
        } catch (err) {
          console.error('Error fetching tournaments:', err)
        }
      }
      
      fetchTournaments()
    } else {
      setTournaments(availableTournaments)
    }
  }, [availableTournaments, organizationId])

  // Populate form when editing or when preselectedTournamentId changes
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
        tournamentId: preselectedTournamentId || ''
      })
    }
    setErrors({})
  }, [competition, preselectedTournamentId])

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
      notify.error('Please fix the errors before submitting')
      return
    }

    const isUsingExternalLoading = !!onSubmit
    if (!isUsingExternalLoading) {
      setLoading(true)
    }

    try {
      const payload = {
        ...formData,
        registrationDeadline: formData.registrationDeadline || null
      }

      if (onSubmit) {
        // Use external submit handler (new pattern)
        await onSubmit(payload)
      } else {
        // Use internal submit logic (legacy pattern)
        if (isEditing && competition) {
          // Update existing competition
          await apiFetch(`/api/competitions/${competition.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
          notify.success('Competition updated successfully')
        } else {
          // Create new competition
          await apiFetch('/api/competitions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
          notify.success('Competition created successfully')
        }
        
        if (onSuccess) {
          onSuccess()
        }
      }
    } catch (err: any) {
      console.error('Error saving competition:', err)
      
      // Handle specific API errors
      if (err.message?.includes('weapon and category combination already exists')) {
        setErrors({ 
          category: 'This weapon and category combination already exists in the tournament'
        })
        notify.error('This weapon and category combination already exists in the tournament')
      } else {
        if (!onSubmit) { // Only show error if not using external handler
          notify.error(isEditing ? 'Failed to update competition' : 'Failed to create competition')
        }
        throw err // Re-throw for external handler
      }
    } finally {
      if (!isUsingExternalLoading) {
        setLoading(false)
      }
    }
  }

  const weaponOptions = [
    { value: 'EPEE', label: 'Épée', icon: '🗡️' },
    { value: 'FOIL', label: 'Foil', icon: '⚔️' },
    { value: 'SABRE', label: 'Sabre', icon: '🔪' }
  ]

  const statusOptions = [
    { value: 'DRAFT', label: 'Draft' },
    { value: 'REGISTRATION_OPEN', label: 'Registration Open' },
    { value: 'REGISTRATION_CLOSED', label: 'Registration Closed' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ]

  const categoryOptions = [
    'Senior Men',
    'Senior Women', 
    'U20 Men',
    'U20 Women',
    'U17 Men',
    'U17 Women',
    'U15 Mixed',
    'U13 Mixed',
    'Veteran Men',
    'Veteran Women',
    'Open Mixed'
  ]

  const isFormLoading = loading || externalLoading

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Edit Competition' : 'Create New Competition'}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isFormLoading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tournament Selection */}
            <div>
              <label htmlFor="tournamentId" className="block text-sm font-medium text-gray-700 mb-2">
                Tournament *
              </label>
              <select
                id="tournamentId"
                value={formData.tournamentId}
                onChange={(e) => handleInputChange('tournamentId', e.target.value)}
                disabled={!!preselectedTournamentId || isFormLoading}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.tournamentId ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                } ${(preselectedTournamentId || isFormLoading) ? 'bg-gray-100' : ''}`}
              >
                <option value="">Select a tournament</option>
                {tournaments.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.name}
                  </option>
                ))}
              </select>
              {errors.tournamentId && (
                <p className="mt-1 text-sm text-red-600">{errors.tournamentId}</p>
              )}
              {preselectedTournamentId && (
                <p className="mt-1 text-sm text-gray-500">Tournament is preselected for this context</p>
              )}
            </div>

            {/* Competition Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Competition Name *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={isFormLoading}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                }`}
                placeholder="e.g., Senior Men Épée"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Weapon Selection */}
            <div>
              <label htmlFor="weapon" className="block text-sm font-medium text-gray-700 mb-2">
                Weapon *
              </label>
              <select
                id="weapon"
                value={formData.weapon}
                onChange={(e) => handleInputChange('weapon', e.target.value as any)}
                disabled={isFormLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {weaponOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.icon} {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                disabled={isFormLoading}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.category ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                }`}
              >
                <option value="">Select a category</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="mt-1 text-sm text-red-600">{errors.category}</p>
              )}
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value as any)}
                disabled={isFormLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
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
                onChange={(e) => handleInputChange('registrationDeadline', e.target.value)}
                disabled={isFormLoading}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.registrationDeadline ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                }`}
              />
              {errors.registrationDeadline && (
                <p className="mt-1 text-sm text-red-600">{errors.registrationDeadline}</p>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={onCancel}
                disabled={isFormLoading}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isFormLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
              >
                {isFormLoading && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isEditing ? 'Update Competition' : 'Create Competition'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 