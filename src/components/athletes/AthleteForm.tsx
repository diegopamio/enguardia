'use client';

import React, { useState } from 'react';
import { Session } from 'next-auth';
import { getCountryName } from '@/lib/countries';
import ReactFlagsSelect from 'react-flags-select';
import ClubSelect from '../shared/ClubSelect';
import { useClubs } from '@/hooks/useClubs';
import { useCreateAthlete, useUpdateAthlete, type Athlete } from '@/hooks/useAthletes';
import { notify } from '@/lib/notifications';

interface AthleteFormProps {
  athlete?: Athlete | null;
  onSuccess: () => void;
  onCancel: () => void;
  session: Session | null;
}

export default function AthleteForm({ athlete, onSuccess, onCancel, session }: AthleteFormProps) {
  const [formData, setFormData] = useState({
    firstName: athlete?.firstName || '',
    lastName: athlete?.lastName || '',
    nationality: athlete?.nationality || '',
    fieId: athlete?.fieId || '',
    dateOfBirth: athlete?.dateOfBirth || '',
    isActive: athlete?.isActive ?? true,
    weapons: athlete?.weapons?.map(w => w.weapon) || [] as ('EPEE' | 'FOIL' | 'SABRE')[],
    organizationId: session?.user?.organizationId || '',
    clubId: athlete?.clubs?.find(c => c.isPrimary)?.club.id || '', // Primary club
  });

  // TanStack Query hooks
  const { data: clubsData, isLoading: loadingClubs } = useClubs();
  const createAthleteMutation = useCreateAthlete();
  const updateAthleteMutation = useUpdateAthlete();

  const clubs = clubsData?.clubs || [];
  const isLoading = createAthleteMutation.isPending || updateAthleteMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

      if (athlete?.id) {
        // Update existing athlete
        await updateAthleteMutation.mutateAsync({
          id: athlete.id,
          ...athleteData,
        });
      } else {
        // Create new athlete
        await createAthleteMutation.mutateAsync(athleteData);
      }

      onSuccess();
    } catch (error) {
      // Error handling is done in the mutation hooks
      console.error('Form submission error:', error);
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

  const getClubDisplayName = (club: any) => {
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
      return club.organizations.some((org: any) => org.organization.id === session.user.organizationId);
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

            {/* Nationality and FIE ID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nationality
                </label>
                <ReactFlagsSelect
                  selected={formData.nationality}
                  onSelect={(code) => setFormData({ ...formData, nationality: code })}
                  searchable
                  searchPlaceholder="Search for a country..."
                  placeholder="Select nationality"
                  className="w-full"
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
                  placeholder="FIE ID (if any)"
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

            {/* Weapons */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weapon Specializations
              </label>
              <div className="flex gap-4">
                {(['EPEE', 'FOIL', 'SABRE'] as const).map((weapon) => (
                  <label key={weapon} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.weapons.includes(weapon)}
                      onChange={() => handleWeaponChange(weapon)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {weapon === 'EPEE' ? 'Épée' : weapon.charAt(0) + weapon.slice(1).toLowerCase()}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Club Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Club
              </label>
              <ClubSelect
                clubs={filteredClubs}
                value={formData.clubId}
                onChange={(clubId) => setFormData({ ...formData, clubId: clubId || '' })}
                placeholder="Select a club..."
                isDisabled={loadingClubs}
                isClearable={true}
              />
              {loadingClubs && (
                <p className="text-sm text-gray-500 mt-1">Loading clubs...</p>
              )}
            </div>

            {/* Active Status */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Active Athlete
                </span>
              </label>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : (athlete?.id ? 'Update Athlete' : 'Create Athlete')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 