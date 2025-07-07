import { requirePageAuth } from "@/lib/auth-utils"
import CompetitionView from "@/components/competitions/CompetitionView"

type Props = {
  params: { id: string }
}

export default async function CompetitionViewPage({ params }: Props) {
  // Require authentication for this page
  await requirePageAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <CompetitionView competitionId={params.id} />
    </div>
  )
} 