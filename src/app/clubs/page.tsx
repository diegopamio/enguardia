'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { apiFetch, notify } from '@/lib/notifications';
import ReactFlagsSelect from 'react-flags-select';
import ClubCard from '@/components/clubs/ClubCard';
import ClubForm from '@/components/clubs/ClubForm';
import { Club } from '@/types/club.d';

interface Organization {
  id: string;
  name: string;
}

export default function ClubsPage() {
  const { data: session } = useSession();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');

  // State for managing modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [deletingClub, setDeletingClub] = useState<Club | null>(null);

  const fetchClubs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedOrg) params.append('organizationId', selectedOrg);
      if (selectedCountry) params.append('country', selectedCountry);
      
      const response = await apiFetch(`/api/clubs?${params.toString()}`);
      const data = await response.json();
      setClubs(data?.clubs || []);
    } catch (error) {
      console.error('Failed to fetch clubs:', error);
      setClubs([]);
      notify.error('Failed to fetch clubs');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const response = await apiFetch('/api/organizations');
      const data = await response.json();
      setOrganizations(data?.organizations || []);
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
      setOrganizations([]);
    }
  };

  useEffect(() => {
    if (session) {
      fetchOrganizations();
    }
  }, [session]);

  useEffect(() => {
    if(session) {
      fetchClubs();
    }
  }, [session, searchTerm, selectedOrg, selectedCountry]);

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

  const confirmDelete = (club: Club) => {
    setDeletingClub(club);
  };

  const handleDeleteClub = async () => {
    if (!deletingClub) return;

    try {
      await apiFetch(`/api/clubs/${deletingClub.id}`, {
        method: 'DELETE',
      });

      notify.success('Club deleted successfully');
      setDeletingClub(null);
      fetchClubs();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Failed to delete club');
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
              {(organizations || []).map((org: Organization) => (
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

      {/* Clubs List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading clubs...</p>
        </div>
      ) : clubs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
          <p className="text-gray-500 text-lg">No clubs found</p>
          <p className="text-gray-400 mt-2">Try adjusting your filters or create a new club</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clubs.map((club) => (
            <ClubCard
              key={club.id}
              club={club}
              onEdit={startEdit}
              onDelete={confirmDelete}
              canManage={canManageClub(club)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{editingClub ? 'Edit Club' : 'Create New Club'}</h2>
                <button
                  onClick={closeForm}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              <ClubForm
                club={editingClub}
                organizations={organizations}
                onCancel={closeForm}
                onRefresh={fetchClubs}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingClub && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4 text-red-600">Delete Club</h2>
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete <strong>{deletingClub.name}</strong>?
              </p>
              {deletingClub._count.athletes > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ This club has {deletingClub._count.athletes} active athletes. 
                    You cannot delete a club with active athletes.
                  </p>
                </div>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeletingClub(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteClub}
                  disabled={deletingClub._count.athletes > 0}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  Delete Club
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 