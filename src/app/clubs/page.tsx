'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import ReactFlagsSelect from 'react-flags-select';
import ClubCard from '@/components/clubs/ClubCard';
import ClubForm from '@/components/clubs/ClubForm';
import { useClubs, useDeleteClub, type Club } from '@/hooks/useClubs';
import { useOrganizations } from '@/hooks/useOrganizations';

export default function ClubsPage() {
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');

  // State for managing modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [deletingClub, setDeletingClub] = useState<Club | null>(null);

  // TanStack Query hooks
  const clubFilters = {
    search: searchTerm || undefined,
    organizationId: selectedOrg || undefined,
    country: selectedCountry || undefined,
  };

  const { data: clubsData, isLoading: loading, error, refetch } = useClubs(clubFilters);
  const { data: organizationsData } = useOrganizations();
  const deleteClubMutation = useDeleteClub();

  const clubs = clubsData?.clubs || [];
  const organizations = organizationsData?.organizations || [];

  // Unified save handler for create and update
  const startEdit = (club: Club) => {
    setEditingClub(club);
    setIsFormOpen(true);
  };

  const startCreate = () => {
    setEditingClub(null);
    setIsFormOpen(true);
  };
  
  const closeForm = () => {
    setEditingClub(null);
    setIsFormOpen(false);
  }

  const handleFormSuccess = () => {
    closeForm();
    // TanStack Query will automatically invalidate and refetch
  };

  const confirmDelete = (club: Club) => {
    setDeletingClub(club);
  };

  const handleDeleteClub = async () => {
    if (!deletingClub) return;

    try {
      await deleteClubMutation.mutateAsync(deletingClub.id);
      setDeletingClub(null);
    } catch (error) {
      // Error handling is done in the mutation hook
      console.error('Failed to delete club:', error);
    }
  };

  const canManageClub = (club: Club): boolean => {
    if (!session?.user) return false;
    
    const user = session.user as any;
    return (
      user.role === 'SYSTEM_ADMIN' ||
      (user.role === 'ORGANIZATION_ADMIN' && 
       club.organizations.some(org => org.organization.id === user.organizationId)) ||
      club.createdBy?.id === user.id
    );
  };

  if (!session) {
    return <div className="p-8 text-center">Please sign in to access clubs.</div>;
  }

  // Handle error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            {error instanceof Error ? error.message : 'Failed to fetch clubs'}
          </div>
          <button
            onClick={() => refetch()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clubs</h1>
          <p className="text-gray-600 mt-2">Global fencing clubs that can be affiliated with organizations</p>
        </div>
        <button
          onClick={startCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Add Club
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search clubs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 h-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Organization</label>
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 h-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Organizations</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
            <div className="flex items-center gap-2">
              <div className="flex-grow">
                <ReactFlagsSelect
                  selected={selectedCountry}
                  onSelect={(code) => setSelectedCountry(code)}
                  searchable
                  placeholder="Filter by country..."
                  className="w-full"
                  selectButtonClassName="w-full border border-gray-300 rounded-lg px-3 !py-0 h-10 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left custom-flags-select"
                />
              </div>
              {selectedCountry && (
                <button
                  onClick={() => setSelectedCountry('')}
                  className="text-sm text-blue-600 hover:text-blue-700 whitespace-nowrap"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedOrg('');
              setSelectedCountry('');
            }}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors text-sm"
          >
            Clear All Filters
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading clubs...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && clubs.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4">No clubs found</div>
          <p className="text-gray-400 mb-6">
            {searchTerm || selectedOrg || selectedCountry
              ? 'Try adjusting your filters or search terms.'
              : 'Get started by adding your first club.'}
          </p>
          <button
            onClick={startCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Add Club
          </button>
        </div>
      )}

      {/* Clubs Grid */}
      {!loading && clubs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clubs.map((club) => (
            <ClubCard
              key={club.id}
              club={club}
              onEdit={canManageClub(club) ? () => startEdit(club) : undefined}
              onDelete={canManageClub(club) ? () => confirmDelete(club) : undefined}
            />
          ))}
        </div>
      )}

      {/* Club Form Modal */}
      {isFormOpen && (
        <ClubForm
          club={editingClub}
          onSuccess={handleFormSuccess}
          onCancel={closeForm}
          session={session}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingClub && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Confirm Delete
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{deletingClub.name}</strong>? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeletingClub(null)}
                disabled={deleteClubMutation.isPending}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteClub}
                disabled={deleteClubMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteClubMutation.isPending ? 'Deleting...' : 'Delete Club'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 