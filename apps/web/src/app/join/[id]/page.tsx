import { Metadata } from 'next'
import { getMatch } from '@padel-parrot/api-client'
import { formatMatchDate, formatMatchDateTime } from '@padel-parrot/shared'
import JoinMatchClient from './JoinMatchClient'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { data: match, error } = await getMatch(params.id)
    
    if (error || !match) {
      return {
        title: 'Join Match - PadelParrot',
        description: 'Join this padel match on PadelParrot.',
      }
    }

    const matchDate = formatMatchDate(match.date_time)
    const matchDateTime = formatMatchDateTime(match.date_time, match.duration_minutes)
    const spotsLeft = match.max_players - match.current_players
    const statusEmoji = spotsLeft === 0 ? '🔴' : spotsLeft <= 2 ? '🟡' : '🟢'
    
    const title = `${match.title} - Join on PadelParrot`
    const description = `${matchDate} at ${match.location} • ${match.current_players}/${match.max_players} players${spotsLeft > 0 ? ` • ${spotsLeft} spots left` : ' • FULL'}`

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.padelparrot.com'

    return {
      title,
      description,
      openGraph: {
        title: match.title,
        description,
        type: 'website',
        url: `${appUrl}/join/${params.id}`,
        siteName: 'PadelParrot',
        images: [
          {
            url: `${appUrl}/api/og/match/${params.id}`,
            width: 1200,
            height: 630,
            alt: `${match.title} - Padel Match`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: match.title,
        description,
        images: [`${appUrl}/api/og/match/${params.id}`],
      },
    }
  } catch (error) {
    return {
      title: 'Join Match - PadelParrot',
      description: 'Organise and join padel matches easily.',
    }
  }
}

export default function JoinMatchPage({ params }: Props) {
  return <JoinMatchClient params={params} />
}
