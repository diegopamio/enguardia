import { requirePageAuth } from "@/lib/auth-utils"
import TournamentDetails from "@/components/tournaments/TournamentDetails"

type Props = {
  params: Promise<{ id: string }>
}

export default async function TournamentViewPage({ params }: Props) {
  // Require authentication for this page
  await requirePageAuth()
  
  // Await params before accessing properties (Next.js 15 requirement)
  const { id } = await params

  return (
    <TournamentDetails tournamentId={id} />
  )
} 