import { Metadata } from 'next'
import { getMatch } from '@padel-parrot/api-client'
import { formatMatchDate, formatMatchDateTime } from '@padel-parrot/shared'
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

    const matchDate = formatMatchDate(match.date_time)
    const matchDateTime = formatMatchDateTime(match.date_time, match.duration_minutes)
    const title = `${match.title} - PadelParrot`
    const description = `Join this padel match on ${matchDate} at ${matchDateTime} in ${match.location}. ${match.current_players}/${match.max_players} players joined.`

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.padelparrot.com'}/join/${params.id}`,
        siteName: 'PadelParrot',
        images: [
          {
            url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.padelparrot.com'}/api/og/match/${params.id}`,
            width: 1200,
            height: 630,
            alt: `${match.title} - Padel Match`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [`${process.env.NEXT_PUBLIC_APP_URL || 'https://app.padelparrot.com'}/api/og/match/${params.id}`],
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