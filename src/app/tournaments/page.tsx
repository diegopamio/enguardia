import { requirePageAuth } from "@/lib/auth-utils"
import TournamentManagement from "@/components/tournaments/TournamentManagement"

export default async function TournamentsPage() {
  // Require authentication for this page
  await requirePageAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Tournament Management</h1>
            <p className="mt-2 text-gray-600">
              Manage fencing tournaments, competitions, and events in your organization.
            </p>
          </div>
          <div className="p-6">
            <TournamentManagement />
          </div>
        </div>
      </div>
    </div>
  )
} 