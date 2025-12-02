import { Metadata } from 'next'
import { getMatch } from '@padel-parrot/api-client'
import { formatMatchTitle } from '@padel-parrot/shared'
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

    const matchTitle = formatMatchTitle(match.date_time, match.description)
    const spotsLeft = match.max_players - match.current_players
    
    const title = `${matchTitle} - PadelParrot`
    const description = `${match.location} • ${match.current_players}/${match.max_players} players${spotsLeft > 0 ? ` • ${spotsLeft} spots left` : ' • FULL'}`

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
      title: 'Join Match - PadelParrot',
      description: 'Organise and join padel matches easily.',
    }
  }
}

export default function JoinMatchPage({ params }: Props) {
  return <JoinMatchClient params={params} />
}
