import { ImageResponse } from 'next/og'
import { getMatch } from '@padel-parrot/api-client'

export const runtime = 'edge'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { data: match, error } = await getMatch(params.id)

    if (error || !match) {
      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#fafaf9',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            <div style={{ fontSize: 48, fontWeight: 700, color: '#1c1917' }}>
              🎾 Match Not Found
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      )
    }

    // Format date
    const matchDate = new Date(match.date_time)
    const formattedDate = matchDate.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    const formattedTime = matchDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    })

    // Calculate duration
    const hours = Math.floor(match.duration_minutes / 60)
    const mins = match.duration_minutes % 60
    const durationStr = hours > 0 && mins > 0 
      ? `${hours}h ${mins}m`
      : hours > 0 
        ? `${hours}h` 
        : `${mins}m`

    // Player status
    const spotsLeft = match.max_players - match.current_players
    const isFull = spotsLeft === 0
    const statusText = isFull 
      ? '🔴 FULL' 
      : spotsLeft === 1 
        ? '🟡 1 spot left!' 
        : `🟢 ${spotsLeft} spots left`

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#fafaf9',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: 60,
          }}
        >
          {/* Header with Logo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: 40,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              {/* Parrot Icon */}
              <svg width="60" height="60" viewBox="0 0 140 140" fill="none">
                <circle cx="70" cy="70" r="60" fill="#1895ef" />
                <circle cx="70" cy="70" r="45" fill="#fbc201" />
                <circle cx="70" cy="70" r="30" fill="#ef6b00" />
                <circle cx="55" cy="55" r="8" fill="#1c1917" />
              </svg>
              <span style={{ fontSize: 32, fontWeight: 700, color: '#1c1917' }}>
                PadelParrot
              </span>
            </div>
          </div>

          {/* Main Content Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#ffffff',
              borderRadius: 24,
              padding: 48,
              flex: 1,
              border: '2px solid #e7e5e4',
            }}
          >
            {/* Match Title & Status */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 32,
              }}
            >
              <div
                style={{
                  fontSize: 52,
                  fontWeight: 700,
                  color: '#1c1917',
                  lineHeight: 1.2,
                  maxWidth: '70%',
                }}
              >
                🎾 {match.title}
              </div>
              <div
                style={{
                  display: 'flex',
                  backgroundColor: isFull ? '#fef2f2' : spotsLeft === 1 ? '#fefce8' : '#f0fdf4',
                  color: isFull ? '#991b1b' : spotsLeft === 1 ? '#854d0e' : '#166534',
                  fontSize: 24,
                  fontWeight: 600,
                  padding: '12px 24px',
                  borderRadius: 12,
                }}
              >
                {statusText}
              </div>
            </div>

            {/* Match Details Grid */}
            <div
              style={{
                display: 'flex',
                gap: 60,
                marginBottom: 32,
              }}
            >
              {/* Date & Time */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 20, color: '#78716c', fontWeight: 500 }}>
                  📅 DATE & TIME
                </div>
                <div style={{ fontSize: 32, color: '#1c1917', fontWeight: 600 }}>
                  {formattedDate}
                </div>
                <div style={{ fontSize: 28, color: '#57534e' }}>
                  {formattedTime} ({durationStr})
                </div>
              </div>

              {/* Location */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 20, color: '#78716c', fontWeight: 500 }}>
                  📍 LOCATION
                </div>
                <div style={{ fontSize: 32, color: '#1c1917', fontWeight: 600 }}>
                  {match.location}
                </div>
              </div>
            </div>

            {/* Players */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                marginTop: 'auto',
              }}
            >
              <div style={{ fontSize: 20, color: '#78716c', fontWeight: 500 }}>
                👥 PLAYERS
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                }}
              >
                {Array.from({ length: match.max_players }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      backgroundColor: i < match.current_players ? '#1895ef' : '#e7e5e4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: i < match.current_players ? '#ffffff' : '#a8a29e',
                      fontSize: 20,
                    }}
                  >
                    {i < match.current_players ? '✓' : '?'}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 28, color: '#1c1917', fontWeight: 600, marginLeft: 8 }}>
                {match.current_players}/{match.max_players}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: 24,
              fontSize: 22,
              color: '#78716c',
            }}
          >
            Tap to join • app.padelparrot.com
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (e) {
    console.error('OG Image generation error:', e)
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fafaf9',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div style={{ fontSize: 48, fontWeight: 700, color: '#1c1917' }}>
            🎾 PadelParrot
          </div>
          <div style={{ fontSize: 24, color: '#78716c', marginTop: 16 }}>
            Join padel matches easily
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  }
}

