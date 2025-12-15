import { ImageResponse } from 'next/og'
import { getMatch } from '@padel-parrot/api-client'

export const runtime = 'edge'

// PadelParrot logo path data (parrot icon)
const LOGO_PATHS = {
  main: "M240.04,785.77c-20.16,11.22-37.66,20.56-57.89,29.17-44.55,15.91-90.52,25.03-139.5,25.72l-.09-465.08c-.02-91.83,21.84-164.46,78.71-236.58-49.17-7.67-90.98-41.7-110.66-85.94C3.16,36.3,1.42,18.98,0,0l425.78.76c66.72.12,130.96,25.57,184.5,62.94,50.05,34.92,89.43,79.08,117.38,132.8,6.97,13.39,11.03,26.36,17.37,41.1l-72.87,205.61c-19.76,51-51.65,93.48-92.83,129.03-58.56,50.56-131.01,79.05-208.25,79.91-33.71,54.72-77.26,99.13-131.06,133.62ZM609.09,365.86c12.99-39.69,13.18-77.9,2.85-117.48-29.7-113.83-148.31-183.94-263.36-151.24-75.42,21.44-132.21,80.08-151.17,155.9-27.53,110.06,41.84,222.79,148.15,253.04,115.06,32.74,228.19-32.23,263.53-140.22Z",
  tail: "M332.1,839.42c-47.47,1.86-91.71,1.14-139.24.41,40.67-18.86,77.4-39.38,110.64-68.48,31.51-27.58,58.85-56.95,81.79-92.48,98.66-7.38,172.4-44.71,242.3-116.39-3.36,14.23-8.54,27.13-13.31,41.1-35.48,103.88-103.95,187.69-210.96,221.95-22.79,7.29-46.23,12.9-71.23,13.88Z",
  beak1: "M839.3,533.19l-138.63-90.4,65.49-183.32c74.25,51.94,107.44,141.61,88.7,228.56-3.11,16.17-6.54,30.43-15.57,45.16Z",
  beak2: "M709.5,569.26c-18.65,5.07-36.05,7.73-55.66,4.83l37.41-106.14,87.84,58c-18.13,20.82-43.18,33.32-69.59,43.31Z",
  eye: "M520.36,285.7c-8.19,38.66-46.26,61.1-82.72,54.33-37.51-6.96-63.72-41.16-59.48-79.17,4.15-37.18,36.61-67.02,76.04-64.59,45.22,2.79,75.78,43.97,66.15,89.43Z"
}

// Helper component for rendering the logo in OG images
const LogoSvg = ({ size, fill }: { size: number; fill: string }) => (
  <svg width={size} height={size} viewBox="0 0 860 840.65" fill={fill}>
    <path d={LOGO_PATHS.main} />
    <path d={LOGO_PATHS.tail} />
    <path d={LOGO_PATHS.beak1} />
    <path d={LOGO_PATHS.beak2} />
    <path d={LOGO_PATHS.eye} />
  </svg>
)

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
              <LogoSvg size={60} fill="#1c1917" />
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
              <LogoSvg size={56} fill="#1c1917" />
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
            {/* Primary: Title (description + date or just date) */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 24,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: 24 }}>
                <div
                  style={{
                    fontSize: match.description ? 44 : 56,
                    fontWeight: 700,
                    color: '#1c1917',
                    lineHeight: 1.2,
                  }}
                >
                  🎾 {match.description 
                    ? `${formattedDate} - ${match.description.length > 35 ? match.description.slice(0, 35) + '...' : match.description}`
                    : formattedDate}
                </div>
                <div
                  style={{
                    fontSize: 32,
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
                  flexShrink: 0,
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
            <LogoSvg size={60} fill="#1c1917" />
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
