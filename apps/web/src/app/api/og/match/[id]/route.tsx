import { ImageResponse } from 'next/og'
import { getMatch } from '@padel-parrot/api-client'

export const runtime = 'edge'

// PadelParrot logo path data (parrot icon)
const PARROT_LOGO_PATH = "M11.53,6.65c-.73.09-1.4.75-1.6,1.44-.48,1.71,1.26,3.2,2.86,2.41,2.1-1.02,1.18-4.16-1.26-3.85ZM12.12,9.6c-1.34.29-1.58-1.68-.42-1.86,1.35-.21,1.58,1.61.42,1.86ZM11.63,0C2.44.11-3.06,10.53,1.83,18.26c5.26,8.32,18,7.04,21.28-2.3C25.91,8.01,20.04-.1,11.63,0ZM4.67,19.95c-.02-.73.04-1.48,0-2.21,0-.04-.09-.1.04-.09.04.21.16.42.27.6.66,1.2,1.56,2.25,2.61,3.12l1.49.99c-1.64-.4-3.18-1.27-4.41-2.41ZM17.29,21.34c-3.39,1.86-6.94,1.26-9.68-1.39-3.4-3.29-3.99-9.16-1.02-12.92,2.28-2.88,6.5-3.34,9.45-1.19.22.16.78.61.92.82.02.02.05.03.04.08-1.37.89-2.59,2.39-3.08,3.96-1.13,3.6.79,7.03,3.66,9.11.3.22.65.4.93.61.03.02.07.03.06.08-.02.07-1.12.75-1.28.84ZM16.13,11.52c-.36-.28-.74-.47-1.14-.67.43-1.07,1.15-2.03,2.01-2.8.06-.06.55-.46.61-.46.41.65.82,1.29,1.09,2.01.72,1.96.41,4.11-1.05,5.63.07-1.46-.36-2.8-1.52-3.71ZM19.4,19.73c-1.34-.78-2.58-1.81-3.47-3.08-.11-.16-.81-1.24-.73-1.35.36-.13.71-.25,1.04-.44.05-.03.33-.24.38-.24-.01.25-.01.52-.03.76-.03.35-.16.79-.17,1.1-.02.42.33.6.7.46,1.12-.4,2.33-2.11,2.71-3.19,1.34-3.76-1.61-8.69-5.27-9.91-5.62-1.86-10.49,2.32-10.91,7.86l-.05,7.21c-1.07-1.34-1.86-2.91-2.23-4.59C-.34,6.53,6.42-.38,14.27,1.34c4.06.89,7.24,4.13,8.17,8.16.86,3.68-.28,7.65-3.04,10.23Z"

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
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <svg width="60" height="60" viewBox="0 0 23.81 23.8" fill="#1c1917">
                <path d={PARROT_LOGO_PATH} />
              </svg>
              <span style={{ fontSize: 48, fontWeight: 700, color: '#1c1917' }}>
                PadelParrot
              </span>
            </div>
            <div style={{ fontSize: 24, color: '#78716c', marginTop: 16 }}>
              Match Not Found
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      )
    }

    // Format date with relative dates
    const matchDate = new Date(match.date_time)
    const now = new Date()
    
    // Helper for ordinal suffix
    const getOrdinalSuffix = (day: number): string => {
      if (day > 3 && day < 21) return 'th'
      switch (day % 10) {
        case 1: return 'st'
        case 2: return 'nd'
        case 3: return 'rd'
        default: return 'th'
      }
    }
    
    // Calculate days until match
    const isToday = matchDate.toDateString() === now.toDateString()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const isTomorrow = matchDate.toDateString() === tomorrow.toDateString()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfMatchDay = new Date(matchDate.getFullYear(), matchDate.getMonth(), matchDate.getDate())
    const daysUntil = Math.floor((startOfMatchDay.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24))
    
    let formattedDate: string
    if (isToday) {
      formattedDate = 'Today'
    } else if (isTomorrow) {
      formattedDate = 'Tomorrow'
    } else if (daysUntil > 0 && daysUntil <= 6) {
      formattedDate = matchDate.toLocaleDateString('en-GB', { weekday: 'long' })
    } else {
      const day = matchDate.getDate()
      const monthYear = matchDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
      formattedDate = `${day}${getOrdinalSuffix(day)} ${monthYear}`
    }
    
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
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
                gap: 16,
              }}
            >
              {/* Parrot Logo */}
              <svg width="56" height="56" viewBox="0 0 23.81 23.8" fill="#1c1917">
                <path d={PARROT_LOGO_PATH} />
              </svg>
              <span style={{ fontSize: 36, fontWeight: 700, color: '#1c1917', letterSpacing: '-0.02em' }}>
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
            {/* Primary: Date & Time with Status */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 24,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    fontSize: 56,
                    fontWeight: 700,
                    color: '#1c1917',
                    lineHeight: 1.1,
                  }}
                >
                  🎾 {formattedDate}
                </div>
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 600,
                    color: '#57534e',
                    marginTop: 8,
                  }}
                >
                  {formattedTime} ({durationStr})
                </div>
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

            {/* Secondary: Location */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 24,
                paddingBottom: 24,
                borderBottom: '2px solid #e7e5e4',
              }}
            >
              <div style={{ fontSize: 28, color: '#78716c' }}>📍</div>
              <div style={{ fontSize: 32, color: '#1c1917', fontWeight: 600 }}>
                {match.location}
              </div>
            </div>

            {/* Tertiary: Description (if provided) */}
            {match.description && (
              <div
                style={{
                  fontSize: 26,
                  color: '#78716c',
                  marginBottom: 24,
                  lineHeight: 1.4,
                }}
              >
                {match.description}
              </div>
            )}

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
                      backgroundColor: i < match.current_players ? '#1c1917' : '#e7e5e4',
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
              alignItems: 'center',
              marginTop: 24,
              gap: 8,
            }}
          >
            <span style={{ fontSize: 22, color: '#78716c' }}>
              Tap to join
            </span>
            <span style={{ fontSize: 22, color: '#a8a29e' }}>•</span>
            <span style={{ fontSize: 22, color: '#78716c' }}>
              app.padelparrot.com
            </span>
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
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <svg width="60" height="60" viewBox="0 0 23.81 23.8" fill="#1c1917">
              <path d={PARROT_LOGO_PATH} />
            </svg>
            <span style={{ fontSize: 48, fontWeight: 700, color: '#1c1917' }}>
              PadelParrot
            </span>
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
