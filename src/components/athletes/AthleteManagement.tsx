'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Session } from 'next-auth';
import { apiFetch } from '@/lib/notifications';
import { getCountryName } from '@/lib/countries';
import AthleteForm from './AthleteForm';
import { UserRole } from '@prisma/client'; // Use the prisma-generated type
import AthleteList from './AthleteList';
import AthleteImport from './AthleteImport';
import ClubSelect from '@/components/shared/ClubSelect';
import ConfirmationModal from '@/components/shared/ConfirmationModal';

interface Athlete {
  id: string;
  firstName: string;
  lastName: string;
  nationality?: string;
  fieId?: string;
  dateOfBirth?: string;
  isActive: boolean;
  weapons: Array<{ weapon: 'EPEE' | 'FOIL' | 'SABRE' }>;
  organizations: Array<{
    organization: { id: string; name: string };
    membershipType: string;
    status: string;
  }>;
  globalRankings: Array<{
    weapon: string;
    rank: number;
    season: string;
  }>;
  _count: {
    competitionRegistrations: number;
  };
}

interface AthletesResponse {
  athletes: Athlete[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

const defaultPagination = {
  total: 0,
  limit: 50,
  offset: 0,
  hasMore: false,
};

interface AthleteManagementProps {
  session: Session | null;
}

export default function AthleteManagement({ session }: AthleteManagementProps) {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Confirmation modal state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [athleteToDelete, setAthleteToDelete] = useState<Athlete | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWeapon, setFilterWeapon] = useState<string>('');
  const [filterOrganization, setFilterOrganization] = useState<string>('');
  const [pagination, setPagination] = useState(defaultPagination);
  const [clubs, setClubs] = useState<any[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [filterClub, setFilterClub] = useState<string>('');

  const canManageAthletes =
    session?.user?.role === UserRole.SYSTEM_ADMIN ||
    session?.user?.role === UserRole.ORGANIZATION_ADMIN;

  const fetchClubsForFilter = async () => {
    setLoadingClubs(true);
    try {
      const response = await apiFetch('/api/clubs');
      const data = await response.json();
      setClubs(data.clubs || []);
    } catch (error) {
      console.error('Failed to fetch clubs for filter:', error);
      setClubs([]);
    } finally {
      setLoadingClubs(false);
    }
  };

  useEffect(() => {
    fetchClubsForFilter();
  }, []);

  const fetchAthletes = useCallback(async (customOffset?: number) => {
    if (!session?.user) return;
    
    setLoading(true);
    setError(null);

    try {
      // Use safe defaults if pagination is not initialized
      const currentLimit = pagination?.limit || 50;
      const currentOffset = customOffset !== undefined ? customOffset : (pagination?.offset || 0);
      
      const params = new URLSearchParams({
        limit: currentLimit.toString(),
        offset: currentOffset.toString(),
      });

      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      if (filterWeapon) {
        params.append('weapon', filterWeapon);
      }
      if (filterOrganization) {
        params.append('organizationId', filterOrganization);
      }
      if (filterClub) {
        params.append('clubId', filterClub);
      }

      const response = await apiFetch(`/api/athletes?${params}`);
      const data = await response.json() as AthletesResponse;
      
      if (currentOffset === 0) {
        setAthletes(data.athletes);
      } else {
        setAthletes(prev => [...prev, ...data.athletes]);
      }
      
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch athletes');
    } finally {
      setLoading(false);
    }
  }, [session, searchTerm, filterWeapon, filterOrganization, filterClub]);

  useEffect(() => {
    if (session) { // Check for session before fetching
      fetchAthletes(0);
    } else {
      setLoading(false); // Stop loading if no session
    }
  }, [session, searchTerm, filterWeapon, filterOrganization, filterClub, refreshKey]);

  const handleSearch = (newSearchTerm: string) => {
    setSearchTerm(newSearchTerm);
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const handleFilterChange = (weapon: string, organization: string) => {
    setFilterWeapon(weapon);
    setFilterOrganization(organization);
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const handleClubFilterChange = (clubId: string | null) => {
    setFilterClub(clubId || '');
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const handleLoadMore = () => {
    const newOffset = (pagination?.offset || 0) + (pagination?.limit || 50);
    setPagination(prev => ({ ...prev, offset: newOffset }));
    fetchAthletes(newOffset);
  };

  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const handleEdit = useCallback((athlete: Athlete) => {
    setSelectedAthlete(athlete);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback((athlete: Athlete) => {
    setAthleteToDelete(athlete);
    setShowDeleteConfirmation(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!athleteToDelete) return;

    setIsDeleting(true);
    try {
      const response = await apiFetch(`/api/athletes/${athleteToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete athlete');
      }

      // Refresh the list after successful deletion
      handleRefresh();
      
      // Close modal and reset state
      setShowDeleteConfirmation(false);
      setAthleteToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete athlete');
    } finally {
      setIsDeleting(false);
    }
  }, [athleteToDelete, handleRefresh]);

  const cancelDelete = useCallback(() => {
    setShowDeleteConfirmation(false);
    setAthleteToDelete(null);
  }, []);

  const handleCreateSuccess = useCallback(() => {
    setShowForm(false);
    setSelectedAthlete(null);
    handleRefresh();
  }, [handleRefresh]);

  const handleImportSuccess = useCallback(() => {
    handleRefresh();
    setShowImport(false);
  }, [handleRefresh]);

  if (!session) {
    return <div className="p-4 text-center">Please sign in to view athletes.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Total: {pagination?.total || 0} athletes
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
              setPagination(prev => ({ ...prev, offset: 0 }));
            }}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors text-sm"
          >
            Clear All Filters
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {/* Athletes List */}
      <AthleteList
        athletes={athletes}
        loading={loading}
        onEdit={canManageAthletes ? handleEdit : undefined}
        onLoadMore={pagination?.hasMore ? handleLoadMore : undefined}
        loadingMore={loading && (pagination?.offset || 0) > 0}
        onDelete={canManageAthletes ? handleDelete : undefined}
      />

      {/* Create/Edit Modal */}
      {showForm && (
        <AthleteForm
          athlete={selectedAthlete || undefined}
          onCancel={() => {
            setShowForm(false);
            setSelectedAthlete(null);
          }}
          onSave={handleCreateSuccess}
        />
      )}

      {/* Import Modal */}
      {showImport && (
        <AthleteImport
          onClose={() => setShowImport(false)}
          onSuccess={handleImportSuccess}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Delete Athlete"
        message={athleteToDelete ? `Are you sure you want to delete ${athleteToDelete.firstName} ${athleteToDelete.lastName}? This action cannot be undone.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={isDeleting}
      />
    </div>
  );
} 