import { requirePageAuth } from "@/lib/auth-utils"
import CompetitionView from "@/components/competitions/CompetitionView"

type Props = {
  params: Promise<{ id: string }>
}

export default async function CompetitionViewPage({ params }: Props) {
  // Require authentication for this page
  await requirePageAuth()
  
  // Await params before accessing properties (Next.js 15 requirement)
  const { id } = await params

  return (
    <div className="min-h-screen bg-gray-50">
      <CompetitionView competitionId={id} />
    </div>
  )
} 