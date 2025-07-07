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
  competition?: Competition | null
  onSuccess: () => void
  onCancel: () => void
  availableTournaments: Tournament[]
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
  competition,
  onSuccess,
  onCancel,
  availableTournaments
}: CompetitionFormProps) {
  const [formData, setFormData] = useState<CompetitionFormData>(initialFormData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const isEditing = !!competition

  // Populate form when editing
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
      setFormData(initialFormData)
    }
    setErrors({})
  }, [competition])

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

    setLoading(true)

    try {
      const payload = {
        ...formData,
        registrationDeadline: formData.registrationDeadline || null
      }

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
      
      onSuccess()
    } catch (err: any) {
      console.error('Error saving competition:', err)
      
      // Handle specific API errors
      if (err.message?.includes('weapon and category combination already exists')) {
        setErrors({ 
          category: 'This weapon and category combination already exists in the tournament'
        })
        notify.error('This weapon and category combination already exists in the tournament')
      } else {
        notify.error(isEditing ? 'Failed to update competition' : 'Failed to create competition')
      }
    } finally {
      setLoading(false)
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
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
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
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                }`}
                placeholder="e.g., Senior Men Épée"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            {/* Tournament Selection */}
            <div>
              <label htmlFor="tournamentId" className="block text-sm font-medium text-gray-700 mb-2">
                Tournament *
              </label>
              <select
                id="tournamentId"
                value={formData.tournamentId}
                onChange={(e) => handleInputChange('tournamentId', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.tournamentId ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                }`}
              >
                <option value="">Select Tournament</option>
                {availableTournaments.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.name}
                  </option>
                ))}
              </select>
              {errors.tournamentId && <p className="mt-1 text-sm text-red-600">{errors.tournamentId}</p>}
            </div>

            {/* Weapon and Category Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Weapon */}
              <div>
                <label htmlFor="weapon" className="block text-sm font-medium text-gray-700 mb-2">
                  Weapon *
                </label>
                <select
                  id="weapon"
                  value={formData.weapon}
                  onChange={(e) => handleInputChange('weapon', e.target.value as 'EPEE' | 'FOIL' | 'SABRE')}
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
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.category ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                  }`}
                >
                  <option value="">Select Category</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
              </div>
            </div>

            {/* Status and Registration Deadline Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                  Status *
                </label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value as CompetitionFormData['status'])}
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
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.registrationDeadline ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                  }`}
                />
                {errors.registrationDeadline && <p className="mt-1 text-sm text-red-600">{errors.registrationDeadline}</p>}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isEditing ? 'Updating...' : 'Creating...'}
                  </div>
                ) : (
                  isEditing ? 'Update Competition' : 'Create Competition'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 