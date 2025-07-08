import { Suspense } from 'react';
import AthleteManagement from '@/components/athletes/AthleteManagement';

export default function AthletesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Global Athlete Registry</h1>
        <p className="text-gray-600">
          Manage athletes across all organizations. Athletes can be affiliated with multiple organizations 
          and participate in tournaments regardless of their home organization.
        </p>
      </div>

      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading athletes...</div>
        </div>
      }>
        <AthleteManagement />
      </Suspense>
    </div>
  );
} 