'use client';

import React, { useState } from 'react';
import { Club } from '@/types/club'; // Asegúrate que la ruta del tipo es correcta
import { getInitials } from '@/lib/utils';

interface ClubCardProps {
  club: Club;
  onEdit: (club: Club) => void;
  onDelete: (club: Club) => void;
  canManage: boolean;
}

const ClubCard: React.FC<ClubCardProps> = ({ club, onEdit, onDelete, canManage }) => {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-md p-4 flex flex-col justify-between h-full">
      <div className="flex items-start">
        <div className="w-16 h-16 mr-4 flex-shrink-0">
          {club.imageUrl && !imageError ? (
            <img
              src={club.imageUrl}
              alt={`${club.name} logo`}
              className="w-16 h-16 rounded-full object-cover border border-gray-200"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-xl font-bold text-gray-600">
                {getInitials(club.name)}
              </span>
            </div>
          )}
        </div>
        <div className="flex-grow">
          <h3 className="text-lg font-bold">{club.name}</h3>
          <p className="text-sm text-gray-500">
            {club.city}, {club.country}
          </p>
        </div>
        {canManage && (
          <div className="flex space-x-2">
            <button onClick={() => onEdit(club)} className="text-gray-500 hover:text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
              </svg>
            </button>
            <button onClick={() => onDelete(club)} className="text-gray-500 hover:text-red-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm font-semibold">Athletes: <span className="text-sm font-normal bg-blue-100 text-blue-800 rounded-full px-2 py-0.5">{club._count?.athletes ?? 0}</span></p>
        <p className="text-sm font-semibold mt-2">Organizations:</p>
        <ul className="text-sm list-none pl-0 mt-1">
          {club.organizations && club.organizations.length > 0 ? (
            club.organizations.map(org => (
              <li key={org.organization.id} className="bg-gray-100 rounded-md p-1.5 mt-1 text-gray-700">
                {org.organization.name} ({org.affiliationType})
              </li>
            ))
          ) : (
            <li className="text-gray-500">No affiliations</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default ClubCard;