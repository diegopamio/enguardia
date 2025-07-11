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
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                strokeWidth={1.5} 
                stroke="currentColor" 
                className="h-5 w-5"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" 
                />
              </svg>
            </button>
            <button onClick={() => onDelete(club)} className="text-gray-500 hover:text-red-600">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                strokeWidth={1.5} 
                stroke="currentColor" 
                className="h-5 w-5"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" 
                />
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