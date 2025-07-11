import { requirePageAuth } from "@/lib/auth-utils"
import CompetitionRoster from "@/components/tournaments/CompetitionRoster"

type Props = {
  params: Promise<{ id: string; competitionId: string }>
}

export default async function TournamentCompetitionPage({ params }: Props) {
  // Require authentication for this page
  await requirePageAuth()
  
  // Await params before accessing properties (Next.js 15 requirement)
  const { id: tournamentId, competitionId } = await params

  return (
    <div className="min-h-screen bg-gray-50">
      <CompetitionRoster 
        competitionId={competitionId}
        competition={undefined} // Will be fetched by the component
      />
    </div>
  )
} 