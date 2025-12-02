import { Metadata } from 'next'
import { getMatch } from '@padel-parrot/api-client'
import { formatMatchTitle, formatMatchTime, formatDuration } from '@padel-parrot/shared'
import MatchDetailsClient from './MatchDetailsClient'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { data: match, error } = await getMatch(params.id)
    
    if (error || !match) {
      return {
        title: 'Match Not Found - PadelParrot',
        description: 'This padel match could not be found.',
      }
    }

    const matchTitle = formatMatchTitle(match.date_time, match.description)
    const title = `${matchTitle} - PadelParrot`
    const description = `${formatMatchTime(match.date_time)} (${formatDuration(match.duration_minutes)}) at ${match.location}. ${match.current_players}/${match.max_players} players joined.`

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.padelparrot.com'

    return {
      title,
      description,
      openGraph: {
        title: matchTitle,
        description,
        type: 'website',
        url: `${appUrl}/join/${params.id}`,
        siteName: 'PadelParrot',
        images: [
          {
            url: `${appUrl}/api/og/match/${params.id}`,
            width: 1200,
            height: 630,
            alt: `${matchTitle} - Padel Match`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: matchTitle,
        description,
        images: [`${appUrl}/api/og/match/${params.id}`],
      },
    }
  } catch (error) {
    return {
      title: 'PadelParrot',
      description: 'Organise and join padel matches easily.',
    }
  }
}

export default function MatchDetailsPage({ params }: Props) {
  return <MatchDetailsClient params={params} />
} 