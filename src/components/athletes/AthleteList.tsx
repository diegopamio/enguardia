'use client';

import React from 'react';
import { getCountryName } from '@/lib/countries';

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
    club: { id: string; name: string; city?: string; country?: string };
    membershipType: string;
    status: string;
    isPrimary: boolean;
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

interface AthleteListProps {
  athletes: Athlete[];
  loading: boolean;
  onEdit?: (athlete: Athlete) => void;
  onLoadMore?: () => void;
  loadingMore?: boolean;
}

const weaponEmojis = {
  EPEE: '⚔️',
  FOIL: '🗡️',
  SABRE: '🏴‍☠️',
};

const weaponNames = {
  EPEE: 'Épée',
  FOIL: 'Foil',
  SABRE: 'Sabre',
};

export default function AthleteList({ 
  athletes, 
  loading, 
  onEdit, 
  onLoadMore, 
  loadingMore 
}: AthleteListProps) {
  // Safely handle undefined athletes array
  const athletesArray = athletes || [];
  
  if (loading && athletesArray.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (athletesArray.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg mb-2">No athletes found</div>
        <div className="text-gray-400">Try adjusting your search criteria or import some athletes.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {athletesArray.map((athlete) => (
          <div 
            key={athlete.id} 
            className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {athlete.firstName} {athlete.lastName}
                </h3>
                <div className="text-sm text-gray-600 space-y-1">
                  {athlete.nationality && (
                    <div>🌍 {getCountryName(athlete.nationality)}</div>
                  )}
                  {athlete.fieId && (
                    <div>🆔 FIE: {athlete.fieId}</div>
                  )}
                </div>
              </div>
              
              {onEdit && (
                <button
                  onClick={() => onEdit(athlete)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Edit
                </button>
              )}
            </div>

            {/* Weapons */}
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 mb-2">Weapons</div>
              <div className="flex flex-wrap gap-2">
                {athlete.weapons.length > 0 ? (
                  athlete.weapons.map((w, idx) => (
                    <span 
                      key={idx}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {weaponEmojis[w.weapon]} {weaponNames[w.weapon]}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400 text-sm">No weapons specified</span>
                )}
              </div>
            </div>

            {/* Training Clubs */}
            {athlete.clubs && athlete.clubs.length > 0 && (
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Training Clubs</div>
                <div className="space-y-1">
                  {athlete.clubs.map((clubAffiliation, idx) => (
                    <div key={idx} className="text-sm">
                      <span className="font-medium">🏟️ {clubAffiliation.club.name}</span>
                      {(clubAffiliation.club.city || clubAffiliation.club.country) && (
                        <span className="text-gray-500 ml-1">
                          ({[
                            clubAffiliation.club.city, 
                            clubAffiliation.club.country ? getCountryName(clubAffiliation.club.country) : null
                          ].filter(Boolean).join(', ')})
                        </span>
                      )}
                      {clubAffiliation.isPrimary && (
                        <span className="text-blue-600 ml-2 text-xs">PRIMARY</span>
                      )}
                      {clubAffiliation.status !== 'ACTIVE' && (
                        <span className="text-red-500 ml-1">- {clubAffiliation.status.toLowerCase()}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Organizations */}
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 mb-2">Organizations</div>
              <div className="space-y-1">
                {athlete.organizations.length > 0 ? (
                  athlete.organizations.map((org, idx) => (
                    <div key={idx} className="text-sm">
                      <span className="font-medium">🏛️ {org.organization.name}</span>
                      <span className="text-gray-500 ml-2">
                        ({org.membershipType.toLowerCase()})
                      </span>
                      {org.status !== 'ACTIVE' && (
                        <span className="text-red-500 ml-1">- {org.status.toLowerCase()}</span>
                      )}
                    </div>
                  ))
                ) : (
                  <span className="text-gray-400 text-sm">No organizational affiliations</span>
                )}
              </div>
            </div>

            {/* Rankings */}
            {athlete.globalRankings.length > 0 && (
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Current Rankings</div>
                <div className="space-y-1">
                  {athlete.globalRankings.slice(0, 3).map((ranking, idx) => (
                    <div key={idx} className="text-sm text-gray-600">
                      {weaponEmojis[ranking.weapon as keyof typeof weaponEmojis]} 
                      {weaponNames[ranking.weapon as keyof typeof weaponNames]} - 
                      Rank #{ranking.rank}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Competitions</span>
                <span className="font-medium">{athlete._count.competitionRegistrations}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>Status</span>
                <span className={`font-medium ${athlete.isActive ? 'text-green-600' : 'text-red-600'}`}>
                  {athlete.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {onLoadMore && (
        <div className="text-center pt-6">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loadingMore ? 'Loading...' : 'Load More Athletes'}
          </button>
        </div>
      )}
    </div>
  );
} 