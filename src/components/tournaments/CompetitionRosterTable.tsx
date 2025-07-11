'use client'

import React, { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import DataTable from '@/components/shared/DataTable'
import { CompetitionRegistration } from '@/hooks/useCompetitionRegistrations'
import { getCountryName } from '@/lib/countries'

interface CompetitionRosterTableProps {
  registrations: CompetitionRegistration[]
  isLoading?: boolean
  error?: string | null
  canManageRegistrations?: boolean
  onMarkPresent?: (athleteId: string) => void
  onMarkAbsent?: (athleteId: string) => void
  onUnregister?: (athleteId: string) => void
  selectedAthletes?: CompetitionRegistration[]
  onAthleteSelect?: (registration: CompetitionRegistration, selected: boolean) => void
}

const PresenceIndicator = ({ isPresent }: { isPresent: boolean | null }) => {
  if (isPresent === null || isPresent === undefined) {
    return <span className="text-gray-400">—</span>
  }
  return (
    <span 
      className={`inline-block w-3 h-3 rounded-full ${isPresent ? 'bg-green-500' : 'bg-red-500'}`} 
      title={isPresent ? 'Present' : 'Absent'} 
    />
  )
}

export default function CompetitionRosterTable({
  registrations,
  isLoading = false,
  error = null,
  canManageRegistrations = false,
  onMarkPresent,
  onMarkAbsent,
  onUnregister,
  selectedAthletes = [],
  onAthleteSelect,
}: CompetitionRosterTableProps) {
  
  const columns = useMemo<ColumnDef<CompetitionRegistration>[]>(() => {
    const baseColumns: ColumnDef<CompetitionRegistration>[] = [
      {
        id: 'select',
        header: ({ table }) => (
          canManageRegistrations ? (
            <input
              type="checkbox"
              checked={table.getIsAllRowsSelected()}
              onChange={table.getToggleAllRowsSelectedHandler()}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          ) : null
        ),
        cell: ({ row }) => (
          canManageRegistrations ? (
            <input
              type="checkbox"
              checked={selectedAthletes.some(a => a.athleteId === row.original.athleteId)}
              onChange={(e) => onAthleteSelect?.(row.original, e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          ) : null
        ),
        enableSorting: false,
        enableColumnFilter: false,
      },
      {
        accessorKey: 'athlete.lastName',
        header: 'Last Name',
        cell: ({ row }) => (
          <div className="font-medium text-gray-900">
            {row.original.athlete.lastName}
          </div>
        ),
      },
      {
        accessorKey: 'athlete.firstName',
        header: 'First Name',
        cell: ({ row }) => (
          <div className="text-gray-900">
            {row.original.athlete.firstName}
          </div>
        ),
      },
      {
        accessorKey: 'athlete.nationality',
        header: 'Country',
        cell: ({ row }) => (
          <div className="text-gray-900">
            {getCountryName(row.original.athlete.nationality)}
          </div>
        ),
      },
      {
        accessorKey: 'athlete.dateOfBirth',
        header: 'Birth Date',
        cell: ({ row }) => (
          <div className="text-gray-900">
            {new Date(row.original.athlete.dateOfBirth).toLocaleDateString()}
          </div>
        ),
      },
      {
        id: 'club',
        header: 'Club',
        cell: ({ row }) => {
          const primaryClub = row.original.athlete.athleteClubs?.find(ac => ac.isPrimary)?.club
          return (
            <div className="text-gray-900">
              {primaryClub ? `${primaryClub.name} (${primaryClub.city}, ${getCountryName(primaryClub.country)})` : '—'}
            </div>
          )
        },
      },
      {
        id: 'ranking',
        header: 'Ranking',
        cell: ({ row }) => {
          const ranking = row.original.athlete.globalRankings?.[0]
          return (
            <div className="text-gray-900">
              {ranking ? `#${ranking.rank}` : '—'}
            </div>
          )
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            row.original.status === 'REGISTERED' 
              ? 'bg-blue-100 text-blue-800'
              : row.original.status === 'CHECKED_IN'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {row.original.status}
          </span>
        ),
      },
      {
        accessorKey: 'isPresent',
        header: 'Presence',
        cell: ({ row }) => (
          <PresenceIndicator isPresent={row.original.isPresent} />
        ),
        enableColumnFilter: false,
      },
    ]

    return baseColumns
  }, [canManageRegistrations, selectedAthletes, onAthleteSelect])

  const renderActions = (registration: CompetitionRegistration) => {
    if (!canManageRegistrations) return null

    return (
      <div className="flex items-center space-x-2">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onMarkPresent?.(registration.athleteId)
          }}
          className="text-green-600 hover:text-green-900 text-sm font-medium"
          title="Mark Present"
        >
          Present
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onMarkAbsent?.(registration.athleteId)
          }}
          className="text-red-600 hover:text-red-900 text-sm font-medium"
          title="Mark Absent"
        >
          Absent
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onUnregister?.(registration.athleteId)
          }}
          className="text-gray-600 hover:text-gray-900 text-sm font-medium"
          title="Unregister"
        >
          Remove
        </button>
      </div>
    )
  }

  return (
    <DataTable
      data={registrations}
      columns={columns}
      isLoading={isLoading}
      error={error}
      searchPlaceholder="Search athletes by name, country, club..."
      enableGlobalFilter={true}
      enableColumnFilters={true}
      enableSorting={true}
      enablePagination={true}
      pageSize={25}
      renderActions={canManageRegistrations ? renderActions : undefined}
      className="mt-6"
    />
  )
} 