'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { apiFetch, notify } from '@/lib/notifications';

interface Club {
  id: string;
  name: string;
  city?: string;
  country?: string;
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
  athlete?: Athlete | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AthleteForm({ athlete, onClose, onSuccess }: AthleteFormProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [clubsLoading, setClubsLoading] = useState(true);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    nationality: '',
    fieId: '',
    dateOfBirth: '',
    isActive: true,
    weapons: [] as ('EPEE' | 'FOIL' | 'SABRE')[],
    organizationId: session?.user?.organizationId || '',
    clubId: '',
  });

  useEffect(() => {
    if (athlete) {
      setFormData({
        firstName: athlete.firstName,
        lastName: athlete.lastName,
        nationality: athlete.nationality || '',
        fieId: athlete.fieId || '',
        dateOfBirth: athlete.dateOfBirth ? athlete.dateOfBirth.split('T')[0] : '',
        isActive: athlete.isActive,
        weapons: athlete.weapons.map(w => w.weapon),
        organizationId: athlete.organizations.length > 0 ? athlete.organizations[0].organization.id : session?.user?.organizationId || '',
        clubId: athlete.clubs && athlete.clubs.length > 0 ? athlete.clubs[0].club.id : '',
      });
    }
  }, [athlete, session?.user?.organizationId]);

  useEffect(() => {
    if (session?.user?.organizationId) {
      fetchClubs();
    }
  }, [session?.user?.organizationId]);

  const fetchClubs = async () => {
    try {
      setClubsLoading(true);
      const params = new URLSearchParams();
      if (session?.user?.organizationId) {
        params.append('organizationId', session.user.organizationId);
      }
      
      const response = await apiFetch(`/api/clubs?${params}`);
      setClubs(response.clubs || []);
    } catch (error) {
      console.error('Failed to fetch clubs:', error);
      setClubs([]);
    } finally {
      setClubsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        dateOfBirth: formData.dateOfBirth || undefined,
        nationality: formData.nationality || undefined,
        fieId: formData.fieId || undefined,
        clubId: formData.clubId || undefined,
      };

      if (athlete) {
        // Update athlete (not yet implemented in API)
        notify.error('Athlete updates not yet implemented');
        return;
      } else {
        await apiFetch('/api/athletes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        notify.success('Athlete created successfully');
      }

      onSuccess();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Failed to save athlete');
    } finally {
      setLoading(false);
    }
  };

  const handleWeaponToggle = (weapon: 'EPEE' | 'FOIL' | 'SABRE') => {
    setFormData(prev => ({
      ...prev,
      weapons: prev.weapons.includes(weapon)
        ? prev.weapons.filter(w => w !== weapon)
        : [...prev.weapons, weapon]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {athlete ? 'Edit Athlete' : 'Add New Athlete'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="nationality" className="block text-sm font-medium text-gray-700 mb-1">
                  Nationality
                </label>
                <input
                  type="text"
                  id="nationality"
                  value={formData.nationality}
                  onChange={(e) => setFormData(prev => ({ ...prev, nationality: e.target.value }))}
                  placeholder="e.g. USA, FRA, GBR"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="fieId" className="block text-sm font-medium text-gray-700 mb-1">
                  FIE ID
                </label>
                <input
                  type="text"
                  id="fieId"
                  value={formData.fieId}
                  onChange={(e) => setFormData(prev => ({ ...prev, fieId: e.target.value }))}
                  placeholder="FIE License Number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                id="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Club Selection */}
            <div>
              <label htmlFor="clubId" className="block text-sm font-medium text-gray-700 mb-1">
                Training Club
              </label>
              {clubsLoading ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-500">
                  Loading clubs...
                </div>
              ) : (
                <select
                  id="clubId"
                  value={formData.clubId}
                  onChange={(e) => setFormData(prev => ({ ...prev, clubId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a club (optional)</option>
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.name} {club.city && `(${club.city})`}
                    </option>
                  ))}
                </select>
              )}
              {clubs.length === 0 && !clubsLoading && (
                <p className="text-sm text-gray-500 mt-1">
                  No clubs available. <a href="/clubs" className="text-blue-600 hover:underline">Create one first</a>.
                </p>
              )}
            </div>

            {/* Weapons */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Weapons
              </label>
              <div className="space-y-2">
                {(['EPEE', 'FOIL', 'SABRE'] as const).map((weapon) => (
                  <label key={weapon} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.weapons.includes(weapon)}
                      onChange={() => handleWeaponToggle(weapon)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {weapon === 'EPEE' ? 'Épée' : weapon.charAt(0) + weapon.slice(1).toLowerCase()}
                    </span>
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
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Active</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : (athlete ? 'Update Athlete' : 'Create Athlete')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 