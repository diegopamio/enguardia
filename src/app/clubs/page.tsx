'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { apiFetch, notify } from '@/lib/notifications';

interface Club {
  id: string;
  name: string;
  city?: string;
  country?: string;
  organization: {
    id: string;
    name: string;
  };
  _count: {
    athletes: number;
  };
  athletes?: Array<{
    athlete: {
      id: string;
      firstName: string;
      lastName: string;
    };
    membershipType: string;
    status: string;
    isPrimary: boolean;
  }>;
}

interface Organization {
  id: string;
  name: string;
}

export default function ClubsPage() {
  const { data: session } = useSession();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    country: '',
    organizationId: '',
  });

  useEffect(() => {
    if (session?.user) {
      fetchClubs();
      if (session.user.role === 'SYSTEM_ADMIN') {
        fetchOrganizations();
      }
    }
  }, [session, searchTerm, selectedOrg]);

  const fetchClubs = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedOrg) params.append('organizationId', selectedOrg);
      
      const response = await apiFetch(`/api/clubs?${params}`);
      setClubs(response.clubs);
    } catch (error) {
      notify.error('Failed to fetch clubs');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const response = await apiFetch('/api/organizations');
      setOrganizations(response.organizations);
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    }
  };

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const orgId = formData.organizationId || session?.user?.organizationId;
      if (!orgId) {
        notify.error('Organization is required');
        return;
      }

      await apiFetch('/api/clubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          organizationId: orgId,
        }),
      });

      notify.success('Club created successfully');
      setShowCreateForm(false);
      setFormData({ name: '', city: '', country: '', organizationId: '' });
      fetchClubs();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Failed to create club');
    }
  };

  if (!session?.user) {
    return <div className="flex justify-center items-center h-64">Please sign in to manage clubs.</div>;
  }

  if (!['ORGANIZATION_ADMIN', 'SYSTEM_ADMIN'].includes(session.user.role)) {
    return <div className="flex justify-center items-center h-64">Access denied. Admin privileges required.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Clubs</h1>
            <p className="text-gray-600 mt-2">Manage training facilities and clubs</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Add Club
          </button>
        </div>

        {/* Filters */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <input
              type="text"
              placeholder="Search clubs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {session.user.role === 'SYSTEM_ADMIN' && (
            <div>
              <select
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Organizations</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Create Club Form */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Add New Club</h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreateClub} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Club Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {session.user.role === 'SYSTEM_ADMIN' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Organization *
                    </label>
                    <select
                      value={formData.organizationId}
                      onChange={(e) => setFormData(prev => ({ ...prev, organizationId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Organization</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Create Club
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Clubs List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : clubs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No clubs found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by creating your first club.'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Add First Club
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clubs.map((club) => (
            <div key={club.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{club.name}</h3>
                  <p className="text-sm text-gray-500">{club.organization.name}</p>
                </div>
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {club._count.athletes} athletes
                </span>
              </div>

              {(club.city || club.country) && (
                <div className="text-sm text-gray-600 mb-3">
                  📍 {[club.city, club.country].filter(Boolean).join(', ')}
                </div>
              )}

              <div className="text-sm text-gray-500">
                <p>Athletes: {club._count.athletes}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 