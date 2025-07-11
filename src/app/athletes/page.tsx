import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import AthleteManagement from '@/components/athletes/AthleteManagement';

export default async function AthletePage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Athletes</h1>
        <p className="text-gray-600 mt-2">Manage fencing athletes and their information</p>
      </div>
      <AthleteManagement session={session} />
    </div>
  );
} 