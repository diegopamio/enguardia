'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import ReactFlagsSelect from 'react-flags-select';
import { clubSchema } from '@/lib/validation';
import ImageUploader from '../shared/ImageUploader';
import { getInitials } from '@/lib/utils';
import { notify } from '@/lib/notifications';

interface Organization {
  id: string;
  name: string;
}

interface Club {
  id: string;
  name: string;
  city: string | null;
  country: string;
  imageUrl: string | null;
  organizations: { organization: Organization }[];
}

interface ClubFormProps {
  club?: Club | null; // Make club optional for creation
  organizations: Organization[];
  onCancel: () => void;
  onRefresh: () => void;
}

const ClubForm: React.FC<ClubFormProps> = ({ club, organizations, onCancel, onRefresh }) => {
  const [croppedImage, setCroppedImage] = useState<File | null>(null);
  const [isLogoRemoved, setIsLogoRemoved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    getValues,
    watch,
    control,
  } = useForm<z.infer<typeof clubSchema>>({
    resolver: zodResolver(clubSchema),
    defaultValues: {
      name: '',
      city: '',
      country: '',
      organizationId: '',
      imageUrl: '',
    },
  });

  // Watch the imageUrl field for reactive updates
  const currentImageUrl = watch('imageUrl');

  useEffect(() => {
    if (club) {
      reset({
        name: club.name,
        city: club.city || '',
        country: club.country,
        organizationId: club.organizations?.[0]?.organizationId || '',
        imageUrl: club.imageUrl || '',
      });
    }
  }, [club, reset]);

  useEffect(() => {
    const subscription = watch(() => {
      // Form validation will run automatically
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const handleImageCropped = useCallback((file: File | null, removed?: boolean) => {
    setCroppedImage(file);
    if (removed) {
      setIsLogoRemoved(true);
      // Also clear the form field immediately
      setValue('imageUrl', '');
    } else if (file) {
      // If a new image is selected, we are no longer in a "removed" state
      setIsLogoRemoved(false);
    }
  }, [setValue]);

  const handleFormSubmit = async (data: z.infer<typeof clubSchema>) => {
    setIsLoading(true);

    try {
      let finalImageUrl = data.imageUrl;

      // Handle image upload if there's a cropped image
      if (croppedImage) {
        const formData = new FormData();
        formData.append('file', croppedImage);

        const uploadResponse = await fetch('/api/clubs/upload-logo', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image');
        }

        const uploadResult = await uploadResponse.json();
        finalImageUrl = uploadResult.url;
      }

      // Handle logo removal
      if (isLogoRemoved) {
        finalImageUrl = null;
      }

      const finalData = {
        ...data,
        imageUrl: finalImageUrl,
      };

      const isCreating = !club;
      const method = isCreating ? 'POST' : 'PUT';
      const url = isCreating ? '/api/clubs' : `/api/clubs/${club.id}`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalData),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isCreating ? 'create' : 'update'} club`);
      }

      const result = await response.json();

      notify.success(`Club ${isCreating ? 'created' : 'updated'} successfully!`);

      // Reset states
      setCroppedImage(null);
      setIsLogoRemoved(false);
      
      onRefresh();
    } catch (error) {
      console.error('Error submitting form:', error);
      notify.error(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const totalLoading = isSubmitting || isLoading;

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/3 flex-shrink-0">
          <label className="block text-sm font-medium text-gray-700 mb-1">Club Logo</label>
          <ImageUploader
            onImageCropped={handleImageCropped}
            aspect={1}
            currentImageUrl={currentImageUrl}
            placeholder={
              <div className="w-full h-40 bg-gray-200 flex items-center justify-center rounded-lg">
                <span className="text-4xl font-bold text-gray-500">
                  {getInitials(getValues('name'))}
                </span>
              </div>
            }
          />
        </div>
        
        <div className="w-full md:flex-1 min-w-0 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Club Name</label>
            <input
              id="name"
              {...register('name')}
              placeholder="E.g., Paris Fencing Club"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={totalLoading}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              id="city"
              {...register('city')}
              placeholder="E.g., Paris"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={totalLoading}
            />
            {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <Controller
              control={control}
              name="country"
              render={({ field }) => (
                <ReactFlagsSelect
                  selected={field.value || ''}
                  onSelect={field.onChange}
                  searchable
                  placeholder="Select Country"
                  className="w-full"
                  disabled={totalLoading}
                  selectButtonClassName="!py-0 border border-gray-300 rounded-lg"
                />
              )}
            />
            {errors.country && <p className="text-red-500 text-sm mt-1">{errors.country.message}</p>}
          </div>

          <div>
            <label htmlFor="organizationId" className="block text-sm font-medium text-gray-700 mb-1">Affiliation</label>
            <Controller
              control={control}
              name="organizationId"
              render={({ field }) => (
                <select id="organizationId" {...field} disabled={totalLoading} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">No immediate affiliation</option>
                  {(organizations || []).map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.organizationId && <p className="text-red-500 text-sm mt-1">{errors.organizationId.message}</p>}
          </div>
        </div>
      </div>
      <div className="flex justify-end space-x-3 pt-5 mt-5 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={totalLoading}
          className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={totalLoading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-gray-400"
        >
          {totalLoading ? 'Saving...' : (club ? 'Update Club' : 'Create Club')}
        </button>
      </div>
    </form>
  );
};

export default ClubForm; 