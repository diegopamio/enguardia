'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Session } from 'next-auth';
import { getCountryName } from '@/lib/countries';
import AthleteForm from './AthleteForm';
import { UserRole } from '@prisma/client';
import AthleteList from './AthleteList';
import AthleteImport from './AthleteImport';
import AffiliationManager from './AffiliationManager';
import ClubSelect from '@/components/shared/ClubSelect';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import { useAthletes, useDeleteAthlete, type Athlete } from '@/hooks/useAthletes';
import { useClubs } from '@/hooks/useClubs';

interface AthleteManagementProps {
  session: Session | null;
}

// Stable empty array reference to prevent infinite renders
const EMPTY_ATHLETES: Athlete[] = [];

export default function AthleteManagement({ session }: AthleteManagementProps) {
  // Form and modal states
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  
  // Confirmation modal state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [athleteToDelete, setAthleteToDelete] = useState<Athlete | null>(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWeapon, setFilterWeapon] = useState<string>('');
  const [filterOrganization, setFilterOrganization] = useState<string>('');
  const [filterClub, setFilterClub] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(0);
  const [allAthletes, setAllAthletes] = useState<Athlete[]>([]);
  const limit = 50;

  // Bulk selection state
  const [selectedAthletes, setSelectedAthletes] = useState<Athlete[]>([]);
  const [showAffiliationManager, setShowAffiliationManager] = useState(false);

  // TanStack Query hooks
  const athleteFilters = {
    search: searchTerm.trim() || undefined,
    weapon: filterWeapon || undefined,
    organizationId: filterOrganization || undefined,
    clubId: filterClub || undefined,
    limit,
    offset: currentPage * limit,
  };

  const { data: athletesData, isLoading: loading, error, refetch } = useAthletes(athleteFilters);
  const { data: clubsData, isLoading: loadingClubs } = useClubs();
  const deleteAthleteMutation = useDeleteAthlete();

  // Use memoized values to prevent reference changes
  const currentPageAthletes = useMemo(() => athletesData?.athletes || EMPTY_ATHLETES, [athletesData?.athletes]);
  const pagination = useMemo(() => athletesData?.pagination || { total: 0, limit, offset: 0, hasMore: false }, [athletesData?.pagination, limit]);
  const clubs = useMemo(() => clubsData?.clubs || [], [clubsData?.clubs]);

  // Update accumulated athletes when new page data arrives
  useEffect(() => {
    // Only update if we actually have new data
    if (!athletesData || loading) return;
    
    if (currentPage === 0) {
      // First page or filter change - replace all athletes
      setAllAthletes(currentPageAthletes);
      setSelectedAthletes([]); // Clear selections on filter change
    } else if (currentPageAthletes.length > 0) {
      // Additional pages - append to existing athletes, but check for duplicates
      setAllAthletes(prev => {
        const existingIds = new Set(prev.map(a => a.id));
        const newAthletes = currentPageAthletes.filter(a => !existingIds.has(a.id));
        return [...prev, ...newAthletes];
      });
    }
  }, [currentPageAthletes, currentPage, athletesData, loading]);

  const canManageAthletes =
    session?.user?.role === UserRole.SYSTEM_ADMIN ||
    session?.user?.role === UserRole.ORGANIZATION_ADMIN;

  const handleSearch = (newSearchTerm: string) => {
    setSearchTerm(newSearchTerm);
    setCurrentPage(0);
  };

  const handleFilterChange = (weapon: string, organization: string) => {
    setFilterWeapon(weapon);
    setFilterOrganization(organization);
    setCurrentPage(0);
  };

  const handleClubFilterChange = (clubId: string | null) => {
    setFilterClub(clubId || '');
    setCurrentPage(0);
  };

  const handleLoadMore = () => {
    setCurrentPage(prev => prev + 1);
  };

  const handleRefresh = useCallback(() => {
    setCurrentPage(0);
    refetch();
  }, [refetch]);

  const handleEdit = useCallback((athlete: Athlete) => {
    setSelectedAthlete(athlete);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback((athlete: Athlete) => {
    setAthleteToDelete(athlete);
    setShowDeleteConfirmation(true);
  }, []);

  // Bulk selection handlers
  const handleSelectAthlete = useCallback((athlete: Athlete) => {
    setSelectedAthletes(prev => {
      const isSelected = prev.some(a => a.id === athlete.id);
      if (isSelected) {
        return prev.filter(a => a.id !== athlete.id);
      } else {
        return [...prev, athlete];
      }
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedAthletes.length === allAthletes.length) {
      setSelectedAthletes([]);
    } else {
      setSelectedAthletes([...allAthletes]);
    }
  }, [allAthletes, selectedAthletes]);

  const handleClearSelection = useCallback(() => {
    setSelectedAthletes([]);
  }, []);

  const handleShowAffiliationManager = useCallback(() => {
    if (selectedAthletes.length === 0) {
      console.warn('Please select at least one athlete to manage affiliations.');
      return;
    }
    setShowAffiliationManager(true);
  }, [selectedAthletes]);

  const handleAffiliationSuccess = useCallback(() => {
    setSelectedAthletes([]);
    setShowAffiliationManager(false);
    // TanStack Query will automatically invalidate and refetch
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!athleteToDelete) return;

    try {
      await deleteAthleteMutation.mutateAsync(athleteToDelete.id);
      // Close modal and reset state
      setShowDeleteConfirmation(false);
      setAthleteToDelete(null);
      // Reset selections if deleted athlete was selected
      setSelectedAthletes(prev => prev.filter(a => a.id !== athleteToDelete.id));
      // Remove from local state immediately for better UX
      setAllAthletes(prev => prev.filter(a => a.id !== athleteToDelete.id));
    } catch (err) {
      // Error handling is done in the mutation hook
      console.error('Failed to delete athlete:', err);
    }
  }, [athleteToDelete, deleteAthleteMutation]);

  const cancelDelete = useCallback(() => {
    setShowDeleteConfirmation(false);
    setAthleteToDelete(null);
  }, []);

  const handleCreateSuccess = useCallback(() => {
    setShowForm(false);
    setSelectedAthlete(null);
    // Reset to first page to see the new athlete
    setCurrentPage(0);
  }, []);

  const handleImportSuccess = useCallback(() => {
    setShowImport(false);
    // Reset to first page to see imported athletes
    setCurrentPage(0);
  }, []);

  if (!session) {
    return <div className="p-4 text-center">Please sign in to view athletes.</div>;
  }

  // Handle error state
  if (error) {
    return (
      <div className="p-4 text-center">
        <div className="text-red-600 mb-4">
          {error instanceof Error ? error.message : 'Failed to fetch athletes'}
        </div>
        <button
          onClick={handleRefresh}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Total: {pagination.total} athletes
          </div>
          <button
            onClick={handleRefresh}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {canManageAthletes && (
          <div className="flex gap-3">
            <button
              onClick={() => setShowImport(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              Import FIE Roster
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Athlete
            </button>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search Athletes
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Name, FIE ID, or nationality..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 h-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="weapon" className="block text-sm font-medium text-gray-700 mb-2">
              Weapon
            </label>
            <select
              id="weapon"
              value={filterWeapon}
              onChange={(e) => handleFilterChange(e.target.value, filterOrganization)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 h-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Weapons</option>
              <option value="EPEE">Épée</option>
              <option value="FOIL">Foil</option>
              <option value="SABRE">Sabre</option>
            </select>
          </div>

          <div>
            <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-2">
              Organization
            </label>
            <select
              id="organization"
              value={filterOrganization}
              onChange={(e) => handleFilterChange(filterWeapon, e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 h-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Organizations</option>
              <option value={session.user.organizationId || ''}>My Organization</option>
            </select>
          </div>

          <div>
            <label htmlFor="club" className="block text-sm font-medium text-gray-700 mb-2">
              Club
            </label>
            <ClubSelect
              clubs={clubs}
              value={filterClub}
              onChange={handleClubFilterChange}
              placeholder="Select a club..."
              isDisabled={loadingClubs}
              isClearable={true}
            />
          </div>
        </div>
        
        <div className="mt-4">
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterWeapon('');
              setFilterOrganization('');
              setFilterClub('');
              setCurrentPage(0);
            }}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors text-sm"
          >
            Clear All Filters
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {canManageAthletes && allAthletes.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                {selectedAthletes.length} of {allAthletes.length} selected
              </div>
              <button
                onClick={handleSelectAll}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {selectedAthletes.length === allAthletes.length ? 'Clear All' : 'Select All'}
              </button>
              {selectedAthletes.length > 0 && (
                <button
                  onClick={handleClearSelection}
                  className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                >
                  Clear Selection
                </button>
              )}
            </div>
            
            {selectedAthletes.length > 0 && (
              <button
                onClick={handleShowAffiliationManager}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors text-sm"
              >
                Manage Affiliations ({selectedAthletes.length})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Athletes List */}
      <AthleteList
        athletes={allAthletes}
        loading={loading && currentPage === 0}
        onEdit={canManageAthletes ? handleEdit : undefined}
        onDelete={canManageAthletes ? handleDelete : undefined}
        onSelect={canManageAthletes ? handleSelectAthlete : undefined}
        selectedAthletes={selectedAthletes}
        showSelection={canManageAthletes}
      />

      {/* Load More Button */}
      {pagination.hasMore && (
        <div className="text-center">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load More Athletes'}
          </button>
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <AthleteForm
          athlete={selectedAthlete}
          onSuccess={handleCreateSuccess}
          onCancel={() => {
            setShowForm(false);
            setSelectedAthlete(null);
          }}
          session={session}
        />
      )}

      {showImport && (
        <AthleteImport
          onSuccess={handleImportSuccess}
          onCancel={() => setShowImport(false)}
          session={session}
        />
      )}

      {showAffiliationManager && (
        <AffiliationManager
          athletes={selectedAthletes}
          onSuccess={handleAffiliationSuccess}
          onCancel={() => setShowAffiliationManager(false)}
          session={session}
        />
      )}

      {showDeleteConfirmation && athleteToDelete && (
        <ConfirmationModal
          isOpen={showDeleteConfirmation}
          title="Delete Athlete"
          message={`Are you sure you want to delete ${athleteToDelete.firstName} ${athleteToDelete.lastName}? This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
          isLoading={deleteAthleteMutation.isPending}
          variant="danger"
        />
      )}
    </div>
  );
} 