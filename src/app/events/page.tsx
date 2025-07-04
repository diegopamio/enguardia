import { requirePageAuth } from "@/lib/auth-utils"
import { UserRole } from "@prisma/client"
import EventManagement from "@/components/events/EventManagement"

export default async function EventsPage() {
  // Require authentication, allow all authenticated users to view events
  const session = await requirePageAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EventManagement organizationId={session?.user?.organizationId} />
      </div>
    </div>
  )
} 