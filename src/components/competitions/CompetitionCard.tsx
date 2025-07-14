'use client'

import React from 'react'

export interface Competition {
  id: string
  name: string
  weapon: 'EPEE' | 'FOIL' | 'SABRE'
  category: string
  status: 'DRAFT' | 'REGISTRATION_OPEN' | 'REGISTRATION_CLOSED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  registrationDeadline?: string | Date | null
  tournamentId?: string
  createdAt: string | Date
  updatedAt: string | Date
  tournament?: {
    id: string
    name: string
    organizationId?: string
  }
  _count?: {
    registrations: number
    phases: number
  }
}

interface CompetitionCardProps {
  competition: Competition
  onView?: (id: string) => void
  onStartCompetition?: (competition: Competition) => void
  onViewRoster?: (id: string) => void
  onConfigureFormula?: (competition: Competition) => void
  canConfigureFormula?: boolean
}

export default function CompetitionCard({
  competition,
  onView,
  onStartCompetition,
  onViewRoster,
  onConfigureFormula,
  canConfigureFormula = false
}: CompetitionCardProps) {

  const getWeaponIcon = (weapon: 'EPEE' | 'FOIL' | 'SABRE') => {
    switch (weapon) {
      case 'EPEE': return '⚔️'
      case 'FOIL': return '🗡️'
      case 'SABRE': return '⚔️'
      default: return '🤺'
    }
  }

  const getStatusColor = (status: 'DRAFT' | 'REGISTRATION_OPEN' | 'REGISTRATION_CLOSED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED') => {
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

  const canStart = canConfigureFormula && competition._count && competition._count.phases > 0 && onStartCompetition
  const showActions = onViewRoster || canConfigureFormula || canStart

  const handleViewClick = () => {
    if (onView) {
      onView(competition.id)
    } else {
      // Default navigation
      window.location.href = `/competitions/${competition.id}`
    }
  }

  const handleStartClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onStartCompetition) {
      onStartCompetition(competition)
    }
  }

  return (
    <div
      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleViewClick}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-lg font-medium text-gray-900 truncate">
          {getWeaponIcon(competition.weapon)} {competition.name}
        </h4>
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(competition.status)}`}>
          {competition.status === 'IN_PROGRESS' ? '🏆 Live' : competition.status.replace('_', ' ')}
        </span>
      </div>
      
      <div className="space-y-1 text-sm text-gray-600">
        <div>Category: {competition.category}</div>
        <div>Weapon: {competition.weapon}</div>
        {competition.tournament && (
          <div>Tournament: {competition.tournament.name}</div>
        )}
        {competition.registrationDeadline && (
          <div>Deadline: {new Date(competition.registrationDeadline).toLocaleDateString()}</div>
        )}
        {competition._count && (
          <div>
            Registrations: {competition._count.registrations} | 
            Phases: {competition._count.phases}
          </div>
        )}
      </div>

      {showActions && (
        <div className="flex justify-end space-x-2 mt-4" onClick={(e) => e.stopPropagation()}>
          {onViewRoster && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onViewRoster(competition.id)
              }}
              className="text-green-600 hover:text-green-800 text-sm font-medium"
            >
              View Roster
            </button>
          )}
          {canConfigureFormula && onConfigureFormula && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onConfigureFormula(competition)
              }}
              className="text-purple-600 hover:text-purple-800 text-sm font-medium"
            >
              Configure Formula
            </button>
          )}
          {canStart && (
            <button
              onClick={handleStartClick}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {competition.status === 'IN_PROGRESS' ? 'Manage Live Competition' : 'Start Competition'}
            </button>
          )}
        </div>
      )}
    </div>
  )
} 