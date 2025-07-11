'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Session } from 'next-auth';
import ReactFlagsSelect from 'react-flags-select';
import { clubSchema } from '@/lib/validation';
import ImageUploader from '../shared/ImageUploader';
import { getInitials } from '@/lib/utils';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useCreateClub, useUpdateClub, useUploadClubLogo, type Club } from '@/hooks/useClubs';

interface ClubFormProps {
  club?: Club | null;
  onSuccess: () => void;
  onCancel: () => void;
  session: Session | null;
}

const ClubForm: React.FC<ClubFormProps> = ({ club, onSuccess, onCancel, session }) => {
  const [croppedImage, setCroppedImage] = useState<File | null>(null);
  const [isLogoRemoved, setIsLogoRemoved] = useState(false);

  // TanStack Query hooks
  const { data: organizationsData } = useOrganizations();
  const createClubMutation = useCreateClub();
  const updateClubMutation = useUpdateClub();
  const uploadLogoMutation = useUploadClubLogo();

  const organizations = organizationsData?.organizations || [];
  const isLoading = createClubMutation.isPending || updateClubMutation.isPending || uploadLogoMutation.isPending;

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
        organizationId: club.organizations?.[0]?.organization?.id || '',
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
    try {
      let finalImageUrl = data.imageUrl;

      // Handle image upload if there's a cropped image
      if (croppedImage) {
        const uploadResult = await uploadLogoMutation.mutateAsync(croppedImage);
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

      if (club) {
        // Update existing club
        await updateClubMutation.mutateAsync({
          id: club.id,
          ...finalData,
        });
      } else {
        // Create new club
        await createClubMutation.mutateAsync(finalData);
      }

      // Reset states
      setCroppedImage(null);
      setIsLogoRemoved(false);
      
      onSuccess();
    } catch (error) {
      // Error handling is done in the mutation hooks
      console.error('Form submission error:', error);
    }
  };

  const totalLoading = isSubmitting || isLoading;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {club ? 'Edit Club' : 'Add New Club'}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

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
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <Controller
                    name="country"
                    control={control}
                    render={({ field }) => (
                      <ReactFlagsSelect
                        selected={field.value}
                        onSelect={field.onChange}
                        searchable
                        placeholder="Select country"
                        className="w-full"
                        selectButtonClassName="w-full border border-gray-300 rounded-lg px-3 !py-0 h-10 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left"
                        disabled={totalLoading}
                      />
                    )}
                  />
                  {errors.country && <p className="text-red-500 text-sm mt-1">{errors.country.message}</p>}
                </div>

                <div>
                  <label htmlFor="organizationId" className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                  <select
                    id="organizationId"
                    {...register('organizationId')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={totalLoading}
                  >
                    <option value="">Select an organization (optional)</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                  {errors.organizationId && <p className="text-red-500 text-sm mt-1">{errors.organizationId.message}</p>}
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <button
                type="button"
                onClick={onCancel}
                disabled={totalLoading}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={totalLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {totalLoading ? 'Saving...' : (club ? 'Update Club' : 'Create Club')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ClubForm; 