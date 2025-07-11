import { requirePageAuth } from "@/lib/auth-utils"
import TournamentCompetitions from "@/components/tournaments/TournamentCompetitions"

type Props = {
  params: Promise<{ id: string }>
}

export default async function TournamentViewPage({ params }: Props) {
  // Require authentication for this page
  await requirePageAuth()
  
  // Await params before accessing properties (Next.js 15 requirement)
  const { id } = await params

  return (
    <div className="min-h-screen bg-gray-50">
      <TournamentCompetitions 
        tournamentId={id}
        tournamentName="" // Will be fetched by the component
      />
    </div>
  )
} 