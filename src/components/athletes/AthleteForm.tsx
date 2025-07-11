'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { apiFetch, notify } from '@/lib/notifications';
import { getCountryName } from '@/lib/countries';
import ReactFlagsSelect from 'react-flags-select';
import ClubSelect from '../shared/ClubSelect';

interface Club {
  id: string;
  name: string;
  city?: string;
  country: string;
  imageUrl?: string;
  organizations: Array<{
    organization: {
      id: string;
      name: string;
    };
  }>;
}

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
  clubs?: Array<{
    club: { id: string; name: string; city?: string };
    membershipType: string;
    status: string;
    isPrimary: boolean;
  }>;
}

interface AthleteFormProps {
  athlete?: Athlete;
  onSave: (athlete: Athlete) => void;
  onCancel: () => void;
}

export default function AthleteForm({ athlete, onSave, onCancel }: AthleteFormProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  
  const [formData, setFormData] = useState({
    firstName: athlete?.firstName || '',
    lastName: athlete?.lastName || '',
    nationality: athlete?.nationality || '',
    fieId: athlete?.fieId || '',
    dateOfBirth: athlete?.dateOfBirth || '',
    isActive: athlete?.isActive ?? true,
    weapons: athlete?.weapons?.map(w => w.weapon) || [],
    organizationId: session?.user?.organizationId || '',
    clubId: athlete?.clubs?.find(c => c.isPrimary)?.club.id || '', // Primary club
  });

  // Fetch available clubs
  const fetchClubs = async () => {
    try {
      setLoadingClubs(true);
      const response = await apiFetch('/api/clubs');
      const data = await response.json();
      setClubs(data?.clubs || []);
    } catch (error) {
      console.error('Failed to fetch clubs:', error);
      setClubs([]);
    } finally {
      setLoadingClubs(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchClubs();
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        notify.error('First name and last name are required');
        return;
      }

      const athleteData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        nationality: formData.nationality || null,
        fieId: formData.fieId || null,
        dateOfBirth: formData.dateOfBirth || null,
        isActive: formData.isActive,
        weapons: formData.weapons,
        organizationId: formData.organizationId || null,
        clubId: formData.clubId || null,
      };

      let response;
      if (athlete?.id) {
        // Update existing athlete
        response = await apiFetch(`/api/athletes/${athlete.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(athleteData),
        });
      } else {
        // Create new athlete
        response = await apiFetch('/api/athletes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(athleteData),
        });
      }

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save athlete');
      }

      notify.success(athlete?.id ? 'Athlete updated successfully' : 'Athlete created successfully');
      onSave(result.athlete);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Failed to save athlete');
    } finally {
      setLoading(false);
    }
  };

  const handleWeaponChange = (weapon: 'EPEE' | 'FOIL' | 'SABRE') => {
    setFormData(prev => ({
      ...prev,
      weapons: prev.weapons.includes(weapon)
        ? prev.weapons.filter(w => w !== weapon)
        : [...prev.weapons, weapon]
    }));
  };

  const getClubDisplayName = (club: Club) => {
    const location = club.city ? `${club.city}, ${getCountryName(club.country)}` : getCountryName(club.country);
    return `${club.name} (${location})`;
  };

  // Filter clubs based on organization (show all clubs for system admins, organization clubs for org admins)
  const filteredClubs = clubs.filter(club => {
    if (session?.user?.role === 'SYSTEM_ADMIN') {
      return true; // System admins can see all clubs
    }
    if (session?.user?.role === 'ORGANIZATION_ADMIN' && session.user.organizationId) {
      // Organization admins can see clubs affiliated with their organization
      return club.organizations.some(org => org.organization.id === session.user.organizationId);
    }
    return true; // Default to showing all clubs
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {athlete?.id ? 'Edit Athlete' : 'Add New Athlete'}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="First name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Last name"
                />
              </div>
            </div>

            {/* Additional Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nationality
                </label>
                <ReactFlagsSelect
                  selected={formData.nationality}
                  onSelect={(code) => setFormData({ ...formData, nationality: code })}
                  searchable
                  placeholder="Select Nationality"
                  className="w-full"
                  selectButtonClassName="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  FIE ID
                </label>
                <input
                  type="text"
                  value={formData.fieId}
                  onChange={(e) => setFormData({ ...formData, fieId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="FIE identification number"
                />
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth
              </label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Club Selection */}
            <div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Club
                </label>
                <ClubSelect
                  clubs={filteredClubs}
                  value={formData.clubId}
                  onChange={(clubId) => setFormData({ ...formData, clubId: clubId || '' })}
                  placeholder="Search and select a club..."
                />
              </div>
            </div>

            {/* Weapons */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weapons
              </label>
              <div className="space-y-2">
                {(['EPEE', 'FOIL', 'SABRE'] as const).map((weapon) => (
                  <label key={weapon} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.weapons.includes(weapon)}
                      onChange={() => handleWeaponChange(weapon)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{weapon}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Active athlete</span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg transition-colors"
                disabled={loading}
              >
                {loading ? 'Saving...' : (athlete?.id ? 'Update Athlete' : 'Create Athlete')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 