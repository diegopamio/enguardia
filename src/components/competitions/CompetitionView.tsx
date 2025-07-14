'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch, notify } from '@/lib/notifications'
import { useRoleCheck } from '@/lib/auth-client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PouleView from './PouleView'
import MatchResults from './MatchResults'

interface Competition {
  id: string
  name: string
  weapon: 'EPEE' | 'FOIL' | 'SABRE'
  category: string
  status: string
  maxParticipants?: number
  registrationDeadline?: string
  createdAt: string
  updatedAt: string
  tournament: {
    id: string
    name: string
    startDate: string
    venue?: string
    organization: {
      name: string
    }
  }
  _count: {
    registrations: number
    phases: number
  }
  registrations?: Array<{
    id: string
    athlete: {
      id: string
      firstName: string
      lastName: string
      nationality?: string
      fieId?: string
    }
    seedNumber?: number
    status: string
    registeredAt: string
  }>
  phases?: Array<{
    id: string
    name: string
    phaseType: string
    status: string
    sequenceOrder: number
    startTime?: string
    endTime?: string
    qualificationQuota?: number
    qualificationPercentage?: number
    qualificationRules?: any
    pouleSizeVariations?: any
    separationRules?: any
    configuration?: any
    poules?: Array<{
      id: string
      number: number
      assignments: Array<{
        id: string
        athleteId: string
        position: number
      }>
    }>
  }>
}

interface CompetitionViewProps {
  competitionId: string
}

const weaponIcons = {
  EPEE: '🗡️',
  FOIL: '⚔️', 
  SABRE: '🔪'
}

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800',
  REGISTRATION_OPEN: 'bg-yellow-100 text-yellow-800',
  REGISTRATION_CLOSED: 'bg-orange-100 text-orange-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800'
}

const formatPhaseType = (phaseType: string) => {
  switch (phaseType) {
    case 'POULE': return 'Round Robin Poules'
    case 'DIRECT_ELIMINATION': return 'Direct Elimination'
    case 'CLASSIFICATION': return 'Classification'
    case 'REPECHAGE': return 'Repechage'
    default: return phaseType.replace('_', ' ')
  }
}

const calculatePouleStats = (phase: any) => {
  if (!phase.poules || phase.poules.length === 0) {
    return null
  }

  const totalPoules = phase.poules.length
  const pouleSizes = phase.poules.map((poule: any) => poule.assignments?.length || 0)
  const totalAthletes = pouleSizes.reduce((sum: number, size: number) => sum + size, 0)
  const avgPouleSize = totalAthletes / totalPoules
  const minPouleSize = Math.min(...pouleSizes)
  const maxPouleSize = Math.max(...pouleSizes)

  return {
    totalPoules,
    totalAthletes,
    avgPouleSize: Math.round(avgPouleSize * 10) / 10,
    minPouleSize,
    maxPouleSize,
    pouleSizes,
    isUniformSize: minPouleSize === maxPouleSize
  }
}

export default function CompetitionView({ competitionId }: CompetitionViewProps) {
  const [competition, setCompetition] = useState<Competition | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('')
  const router = useRouter()
  const { isSystemAdmin, isOrganizationAdmin } = useRoleCheck()

  // Detect if we came from a tournament context by checking the referrer or current path
  const getBackNavigationUrl = () => {
    if (typeof window !== 'undefined') {
      // Check if we came from a tournament URL
      const referrer = document.referrer
      const currentPath = window.location.pathname
      
      // If we're on a nested tournament route like /tournaments/[id]/competitions/[competitionId]
      const tournamentMatch = currentPath.match(/\/tournaments\/([^\/]+)\/competitions\//)
      if (tournamentMatch) {
        return `/tournaments/${tournamentMatch[1]}`
      }
      
      // Check if referrer contains a tournament context
      if (referrer && referrer.includes('/tournaments/')) {
        const tournamentReferrerMatch = referrer.match(/\/tournaments\/([^\/]+)/)
        if (tournamentReferrerMatch) {
          return `/tournaments/${tournamentReferrerMatch[1]}`
        }
      }
    }
    
    // Default fallback to competitions list
    return '/competitions'
  }

  useEffect(() => {
    fetchCompetition()
  }, [competitionId])

  const fetchCompetition = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Fetching competition with ID:', competitionId)
      const response = await apiFetch(`/api/competitions/${competitionId}`)
      console.log('Response status:', response.status)
      console.log('Response headers:', response.headers)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error Response:', errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }
      
      const data = await response.json()
      console.log('Received competition data:', data)
      setCompetition(data)
      
      // Set default tab based on competition status
      if (!activeTab) {
        setActiveTab(data.status === 'IN_PROGRESS' ? 'poules' : 'overview')
      }
    } catch (err: any) {
      console.error('Error fetching competition:', err)
      setError(err.message || 'Failed to load competition')
      notify.error(`Failed to load competition details: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !competition) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center">
            <div className="text-red-500 text-lg mb-4">
              {error || 'Competition not found'}
            </div>
            <button
              onClick={() => router.push('/competitions')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              Back to Competitions
            </button>
          </div>
        </div>
      </div>
    )
  }

  const canEdit = isSystemAdmin() || isOrganizationAdmin()

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push(getBackNavigationUrl())}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                  <span>{weaponIcons[competition.weapon]}</span>
                  <span>{competition.name}</span>
                </h1>
                <p className="text-gray-600">{competition.category}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[competition.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
                {competition.status.replace('_', ' ')}
              </span>
              {canEdit && (
                <button
                  onClick={() => router.push(`/competitions?edit=${competition.id}`)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
                >
                  Edit Competition
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tournament Link */}
        <div className="px-6 py-4 bg-blue-50 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">Part of tournament:</span>
            <button
              onClick={() => router.push(`/events?view=${competition.tournament.id}`)}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              🏆 {competition.tournament.name}
            </button>
            <span className="text-gray-500">•</span>
            <span className="text-gray-600">{competition.tournament.organization.name}</span>
            {competition.tournament.venue && (
              <>
                <span className="text-gray-500">•</span>
                <span className="text-gray-600">{competition.tournament.venue}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">📊 Overview</TabsTrigger>
          <TabsTrigger value="poules">🎯 Poules</TabsTrigger>
          <TabsTrigger value="matches">⚔️ Match Results</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Competition Details */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Competition Details</h2>
                </div>
                <div className="px-6 py-4">
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Weapon</dt>
                      <dd className="mt-1 text-sm text-gray-900 flex items-center space-x-1">
                        <span>{weaponIcons[competition.weapon]}</span>
                        <span>{competition.weapon}</span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Category</dt>
                      <dd className="mt-1 text-sm text-gray-900">{competition.category}</dd>
                    </div>
                    {competition.maxParticipants && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Max Participants</dt>
                        <dd className="mt-1 text-sm text-gray-900">{competition.maxParticipants}</dd>
                      </div>
                    )}
                    {competition.registrationDeadline && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Registration Deadline</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {new Date(competition.registrationDeadline).toLocaleDateString()}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Created</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {new Date(competition.createdAt).toLocaleDateString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {new Date(competition.updatedAt).toLocaleDateString()}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Formula Configuration */}
              {competition.phases && competition.phases.length > 0 && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Tournament Formula</h2>
                  </div>
                  <div className="px-6 py-4">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <dt className="font-medium text-gray-500">Total Phases</dt>
                          <dd className="mt-1 text-gray-900">{competition.phases.length}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-gray-500">Format</dt>
                          <dd className="mt-1 text-gray-900">
                            {competition.phases.map(p => formatPhaseType(p.phaseType)).join(' → ')}
                          </dd>
                        </div>
                      </div>
                      
                      {/* Formula Summary */}
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Formula Summary</h4>
                        <div className="space-y-2 text-sm text-gray-600">
                          {competition.phases.map((phase, index) => {
                            const pouleStats = calculatePouleStats(phase)
                            return (
                              <div key={phase.id} className="flex items-center space-x-2 flex-wrap">
                                <span className="font-medium text-gray-900">{index + 1}.</span>
                                <span>{phase.name}</span>
                                <span className="text-gray-400">({formatPhaseType(phase.phaseType)})</span>
                                
                                {/* Poule Statistics */}
                                {pouleStats && (
                                  <div className="flex items-center space-x-1">
                                    <span className="text-blue-600 text-xs bg-blue-50 px-2 py-1 rounded">
                                      {pouleStats.totalPoules} poule{pouleStats.totalPoules !== 1 ? 's' : ''}
                                    </span>
                                    <span className="text-purple-600 text-xs bg-purple-50 px-2 py-1 rounded">
                                      {pouleStats.isUniformSize ? 
                                        `${pouleStats.minPouleSize} fencers each` :
                                        `${pouleStats.minPouleSize}-${pouleStats.maxPouleSize} fencers`
                                      }
                                    </span>
                                    <span className="text-gray-600 text-xs bg-gray-50 px-2 py-1 rounded">
                                      {pouleStats.totalAthletes} total
                                    </span>
                                  </div>
                                )}
                                
                                {/* Qualification Info */}
                                {phase.qualificationQuota && (
                                  <span className="text-green-600 text-xs bg-green-50 px-2 py-1 rounded">
                                    Top {phase.qualificationQuota} advance
                                  </span>
                                )}
                                {phase.qualificationPercentage && (
                                  <span className="text-green-600 text-xs bg-green-50 px-2 py-1 rounded">
                                    Top {Math.round(phase.qualificationPercentage * 100)}% advance
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Detailed Phases Information */}
              {competition.phases && competition.phases.length > 0 && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Phase Configuration</h2>
                  </div>
                  <div className="px-6 py-4">
                    <div className="space-y-4">
                      {competition.phases
                        .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
                        .map((phase, index) => (
                          <div key={phase.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                            {/* Phase Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <span className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                  {index + 1}
                                </span>
                                <div>
                                  <h4 className="font-medium text-gray-900">{phase.name}</h4>
                                  <p className="text-sm text-gray-600">{formatPhaseType(phase.phaseType)}</p>
                                </div>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                phase.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                phase.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                phase.status === 'SCHEDULED' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {phase.status.replace('_', ' ')}
                              </span>
                            </div>

                            {/* Phase Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              {/* Poule Statistics */}
                              {(() => {
                                const pouleStats = calculatePouleStats(phase)
                                return pouleStats && (
                                  <div className="md:col-span-2">
                                    <dt className="font-medium text-gray-500 mb-2">Poule Configuration</dt>
                                    <dd className="mt-1 text-gray-900">
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                          <span className="font-medium text-blue-600">Total Poules:</span>
                                          <div className="text-lg font-bold text-blue-700">{pouleStats.totalPoules}</div>
                                        </div>
                                        <div>
                                          <span className="font-medium text-purple-600">Poule Size:</span>
                                          <div className="text-lg font-bold text-purple-700">
                                            {pouleStats.isUniformSize ? 
                                              pouleStats.minPouleSize :
                                              `${pouleStats.minPouleSize}-${pouleStats.maxPouleSize}`
                                            }
                                          </div>
                                        </div>
                                        <div>
                                          <span className="font-medium text-green-600">Total Athletes:</span>
                                          <div className="text-lg font-bold text-green-700">{pouleStats.totalAthletes}</div>
                                        </div>
                                        <div>
                                          <span className="font-medium text-gray-600">Avg Size:</span>
                                          <div className="text-lg font-bold text-gray-700">{pouleStats.avgPouleSize}</div>
                                        </div>
                                      </div>
                                      
                                      {/* Detailed poule breakdown */}
                                      {!pouleStats.isUniformSize && (
                                        <div className="mt-3 p-3 bg-gray-50 rounded">
                                          <span className="text-xs font-medium text-gray-500 block mb-2">Poule Size Distribution:</span>
                                          <div className="flex flex-wrap gap-1">
                                            {pouleStats.pouleSizes.map((size: number, idx: number) => (
                                              <span key={idx} className="inline-block px-2 py-1 bg-white border rounded text-xs">
                                                P{idx + 1}: {size}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </dd>
                                  </div>
                                )
                              })()}

                              {/* Qualification Rules */}
                              {(phase.qualificationQuota || phase.qualificationPercentage) && (
                                <div>
                                  <dt className="font-medium text-gray-500">Qualification</dt>
                                  <dd className="mt-1 text-gray-900">
                                    {phase.qualificationQuota && `Top ${phase.qualificationQuota} fencers advance`}
                                    {phase.qualificationPercentage && `Top ${Math.round(phase.qualificationPercentage * 100)}% advance`}
                                  </dd>
                                </div>
                              )}

                              {/* Timing */}
                              {(phase.startTime || phase.endTime) && (
                                <div>
                                  <dt className="font-medium text-gray-500">Schedule</dt>
                                  <dd className="mt-1 text-gray-900">
                                    {phase.startTime && `Start: ${new Date(phase.startTime).toLocaleString()}`}
                                    {phase.startTime && phase.endTime && <br />}
                                    {phase.endTime && `End: ${new Date(phase.endTime).toLocaleString()}`}
                                  </dd>
                                </div>
                              )}

                              {/* Poule Configuration */}
                              {phase.pouleSizeVariations && (
                                <div>
                                  <dt className="font-medium text-gray-500">Poule Variations</dt>
                                  <dd className="mt-1 text-gray-900">
                                    {typeof phase.pouleSizeVariations === 'object' && phase.pouleSizeVariations.sizes ? 
                                      `Configured sizes: ${phase.pouleSizeVariations.sizes.join(', ')}` :
                                      'Custom configuration'
                                    }
                                  </dd>
                                </div>
                              )}

                              {/* Separation Rules */}
                              {phase.separationRules && (
                                <div>
                                  <dt className="font-medium text-gray-500">Separation Rules</dt>
                                  <dd className="mt-1 text-gray-900">
                                    {typeof phase.separationRules === 'object' ? (
                                      <div className="space-y-1">
                                        {phase.separationRules.club && <span className="inline-block bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs mr-1">Club separation</span>}
                                        {phase.separationRules.country && <span className="inline-block bg-green-50 text-green-700 px-2 py-1 rounded text-xs mr-1">Country separation</span>}
                                        {phase.separationRules.maxSameClub && <span className="inline-block bg-yellow-50 text-yellow-700 px-2 py-1 rounded text-xs">Max {phase.separationRules.maxSameClub} per club</span>}
                                      </div>
                                    ) : (
                                      'Custom rules applied'
                                    )}
                                  </dd>
                                </div>
                              )}
                            </div>

                            {/* Additional Configuration */}
                            {phase.configuration && phase.configuration.rounds && Array.isArray(phase.configuration.rounds) && phase.configuration.rounds.length > 0 && (
                              <div className="border-t pt-3">
                                <dt className="text-sm font-medium text-gray-500 mb-2">Rounds Configuration</dt>
                                <dd className="text-sm text-gray-900">
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full text-xs border">
                                      <thead>
                                        <tr className="bg-gray-100">
                                          <th className="px-2 py-1 border">Round</th>
                                          <th className="px-2 py-1 border">Poules</th>
                                          <th className="px-2 py-1 border">Athletes/Poule</th>
                                          <th className="px-2 py-1 border">Qualify</th>
                                          <th className="px-2 py-1 border">Club Sep.</th>
                                          <th className="px-2 py-1 border">Country Sep.</th>
                                          <th className="px-2 py-1 border">Match Format</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {phase.configuration.rounds.map((round: any, idx: number) => (
                                          <tr key={idx} className="even:bg-gray-50">
                                            <td className="px-2 py-1 border">{round.name || `Round ${round.roundNumber}`}</td>
                                            <td className="px-2 py-1 border text-center">{round.numberOfPoules}</td>
                                            <td className="px-2 py-1 border text-center">{round.athletesPerPoule}</td>
                                            <td className="px-2 py-1 border text-center">
                                              {round.qualificationQuota ? `Top ${round.qualificationQuota}` :
                                               round.qualificationPercentage ? `Top ${round.qualificationPercentage}%` :
                                               '-'}
                                            </td>
                                            <td className="px-2 py-1 border text-center">{round.enableClubSeparation ? '✔️' : ''}</td>
                                            <td className="px-2 py-1 border text-center">{round.enableCountrySeparation ? '✔️' : ''}</td>
                                            <td className="px-2 py-1 border text-center">{round.matchFormat === 'hits_custom' ? `${round.customHitCount} hits` : (round.matchFormat || '-')}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </dd>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Quick Stats</h2>
                </div>
                <div className="px-6 py-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500">Registrations</span>
                      <span className="text-lg font-semibold text-gray-900">{competition._count.registrations}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500">Phases</span>
                      <span className="text-lg font-semibold text-gray-900">{competition._count.phases}</span>
                    </div>
                    {competition.maxParticipants && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">Capacity</span>
                        <span className="text-lg font-semibold text-gray-900">
                          {Math.round((competition._count.registrations / competition.maxParticipants) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Actions</h2>
                </div>
                <div className="px-6 py-4 space-y-3">
                  <button
                    onClick={() => router.push(getBackNavigationUrl())}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
                  >
                    {getBackNavigationUrl().includes('/tournaments/') ? 'Back to Tournament' : 'View Tournament'}
                  </button>
                  <button
                    onClick={() => router.push(`/events?view=${competition.tournament.id}&tab=competitions`)}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm"
                  >
                    View All Tournament Competitions
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => router.push(`/competitions?edit=${competition.id}`)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm"
                    >
                      Edit Competition
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="poules">
          <PouleView 
            competitionId={competition.id} 
            competitionName={competition.name}
            weapon={competition.weapon}
            tournamentId={competition.tournament.id}
          />
        </TabsContent>

        <TabsContent value="matches">
          <MatchResults 
            competitionId={competition.id} 
            competitionName={competition.name}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
} 