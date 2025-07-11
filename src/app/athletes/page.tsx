import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import AthleteManagement from '@/components/athletes/AthleteManagement';

export default async function AthletePage() {
  const session = await getServerSession(authOptions);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Athletes</h1>
      <AthleteManagement session={session} />
    </div>
  );
} 