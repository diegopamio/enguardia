'use client';

import React, { useState, useEffect } from 'react';
import Select from 'react-select';

interface Club {
  id: string;
  name: string;
  city?: string | null;
  imageUrl?: string | null;
}

interface ClubOption {
  value: string;
  label: string;
  imageUrl?: string | null;
}

interface ClubSelectProps {
  clubs: Club[];
  value?: string;
  onChange: (clubId: string | null) => void;
  placeholder?: string;
  isDisabled?: boolean;
  isClearable?: boolean;
}

// Custom component to get initials from club name
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 3);
};

export default function ClubSelect({
  clubs,
  value,
  onChange,
  placeholder = "Select a club...",
  isDisabled = false,
  isClearable = true,
}: ClubSelectProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Format club options for react-select
  const clubOptions: ClubOption[] = (clubs || []).map(club => ({
    value: club.id,
    label: club.city ? `${club.name} (${club.city})` : club.name,
    imageUrl: club.imageUrl,
  }));

  const formatOptionLabel = (option: ClubOption) => (
    <div className="flex items-center gap-2">
      {option.imageUrl ? (
        <img
          src={option.imageUrl}
          alt={`${option.label} logo`}
          className="w-6 h-6 rounded-full object-cover"
        />
      ) : (
        <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-semibold">
          {getInitials(option.label)}
        </div>
      )}
      <span>{option.label}</span>
    </div>
  );

  const selectedOption = clubOptions.find(option => option.value === value) || null;

  // Don't render react-select until component has mounted on client
  if (!isMounted) {
    return (
      <div className="min-h-[38px] border border-gray-300 rounded-md px-3 py-2 bg-gray-50 flex items-center text-gray-500">
        {placeholder}
      </div>
    );
  }

  return (
    <Select
      options={clubOptions}
      value={selectedOption}
      onChange={(selected) => onChange(selected?.value || null)}
      formatOptionLabel={formatOptionLabel}
      placeholder={placeholder}
      isClearable={isClearable}
      isDisabled={isDisabled}
      className="react-select-container"
      classNamePrefix="react-select"
      styles={{
        control: (provided, state) => ({
          ...provided,
          minHeight: '38px',
          borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
          boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : 'none',
          '&:hover': {
            borderColor: state.isFocused ? '#3b82f6' : '#9ca3af',
          },
        }),
        option: (provided, state) => ({
          ...provided,
          backgroundColor: state.isSelected
            ? '#3b82f6'
            : state.isFocused
            ? '#eff6ff'
            : 'white',
          color: state.isSelected ? 'white' : '#374151',
          cursor: 'pointer',
        }),
        placeholder: (provided) => ({
          ...provided,
          color: '#9ca3af',
        }),
      }}
    />
  );
} 