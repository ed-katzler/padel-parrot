'use client'

import { useState, useEffect } from 'react'
import { Calendar, MapPin, Users, UserPlus, Phone } from 'lucide-react'
import { formatMatchDate, formatMatchTime, formatMatchDateTime, formatMatchTitle, getAvailableSpots, isMatchFull } from '@padel-parrot/shared'
import { getMatch, sendOtp, verifyOtp, getCurrentUser, getMatchParticipants } from '@padel-parrot/api-client'
import Logo from '@/components/Logo'
import toast from 'react-hot-toast'

interface Match {
  id: string
  title?: string
  description?: string
  date_time: string
  duration_minutes: number
  location: string
  max_players: number
  current_players: number
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled'
  creator_id: string
  is_public: boolean
  created_at: string
  updated_at: string
}

export default function JoinMatchClient({ params }: { params: { id: string } }) {
  const [match, setMatch] = useState<Match | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [participantCount, setParticipantCount] = useState<number>(0)

  useEffect(() => {
    loadMatch()
    checkAuthStatus().finally(() => setIsCheckingAuth(false))
  }, [params.id])

  const checkAuthStatus = async () => {
    try {
      const { data: user, error } = await getCurrentUser()
      if (user && !error) {
        setIsAuthenticated(true)
      }
    } catch (error) {
      setIsAuthenticated(false)
    }
  }

  const loadMatch = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await getMatch(params.id)
      if (error) {
        toast.error(error)
        return
      }
      if (data) {
        setMatch(data)
        // Fetch fresh participant count
        const { data: participants } = await getMatchParticipants(data.id)
        if (participants) {
          setParticipantCount(participants.length)
        } else {
          setParticipantCount(data.current_players)
        }
      }
    } catch (error) {
      toast.error('Failed to load match')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneNumber.trim()) {
      toast.error('Enter phone number')
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await sendOtp(phoneNumber)
      if (error) {
        toast.error(error)
      } else {
        setShowOtpInput(true)
        toast.success('Code sent!')
      }
    } catch (error) {
      toast.error('Failed to send code')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otpCode.trim()) {
      toast.error('Enter verification code')
      return
    }

    setIsSubmitting(true)
    try {
      const { data: user, error } = await verifyOtp(phoneNumber, otpCode)
      if (error) {
        toast.error(error)
      } else if (user) {
        setIsAuthenticated(true)
        toast.success('Signed in!')
      }
    } catch (error) {
      toast.error('Failed to verify')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleJoinMatch = () => {
    window.location.href = `/match/${params.id}`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
        <div className="text-center">
          <div 
            className="animate-spin rounded-full h-6 w-6 mx-auto mb-3"
            style={{ 
              border: '2px solid rgb(var(--color-border-light))',
              borderTopColor: 'rgb(var(--color-text-muted))'
            }}
          />
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>Loading...</p>
        </div>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
        <div className="text-center max-w-sm">
          <h2 className="text-lg font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>Match not found</h2>
          <p className="text-sm mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>This link may be invalid.</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="btn btn-primary"
          >
            Go to PadelParrot
          </button>
        </div>
      </div>
    )
  }

  const availableSpots = getAvailableSpots(match.max_players, participantCount)
  const isFull = isMatchFull(match.max_players, participantCount)

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
      {/* Header */}
      <header style={{ backgroundColor: 'rgb(var(--color-surface))', borderBottom: '1px solid rgb(var(--color-border-light))' }}>
        <div className="container-app py-5 text-center">
          <Logo size="md" className="justify-center mb-2" />
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            You've been invited to join a match
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-app py-6 space-y-4">
        {/* Match Preview */}
        <div className="card">
          {/* Primary: Title (description + date or just date) */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0 pr-3">
              <h2 className="text-xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                {formatMatchTitle(match.date_time, match.description)}
              </h2>
              <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {formatMatchTime(match.date_time)} · {formatMatchDateTime(match.date_time, match.duration_minutes).split('(')[1]?.replace(')', '') || ''}
              </p>
            </div>
            <span className={`flex-shrink-0 badge ${isFull ? 'badge-full' : 'badge-available'}`}>
              {isFull ? 'Full' : `${availableSpots} left`}
            </span>
          </div>
          
          {/* Secondary: Location */}
          <div className="flex items-center gap-3 pb-4 mb-4" style={{ borderBottom: '1px solid rgb(var(--color-border-light))' }}>
            <MapPin className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }} />
            <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
              {match.location}
            </p>
          </div>
          
          {/* Meta: Player count */}
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }} />
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                {participantCount}/{match.max_players} players
              </span>
              <div className="flex gap-1">
                {Array.from({ length: match.max_players }).map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full"
                    style={{ 
                      backgroundColor: i < participantCount 
                        ? 'rgb(var(--color-text-muted))' 
                        : 'rgb(var(--color-border-light))'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Auth / Join */}
        {isCheckingAuth ? (
          <div className="card flex items-center justify-center py-8">
            <div 
              className="animate-spin rounded-full h-6 w-6"
              style={{ 
                border: '2px solid rgb(var(--color-border-light))',
                borderTopColor: 'rgb(var(--color-text-muted))'
              }}
            />
          </div>
        ) : !isAuthenticated ? (
          <div className="card">
            <div className="text-center mb-6">
              <h3 className="font-semibold mb-1" style={{ color: 'rgb(var(--color-text))' }}>
                Sign in to join
              </h3>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                Quick phone verification
              </p>
            </div>

            {!showOtpInput ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="form-field">
                  <label htmlFor="phone" className="form-label">
                    Phone number
                  </label>
                  <div className="relative">
                    <Phone 
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                      style={{ color: 'rgb(var(--color-text-subtle))' }}
                    />
                    <input
                      id="phone"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1234567890"
                      className="input"
                      style={{ paddingLeft: '2.5rem' }}
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary w-full"
                >
                  {isSubmitting ? 'Sending...' : 'Continue'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="form-field">
                  <label htmlFor="otp" className="form-label">
                    Verification code
                  </label>
                  <input
                    id="otp"
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    className="input"
                    style={{ textAlign: 'center', letterSpacing: '0.25em' }}
                    maxLength={6}
                    required
                    autoFocus
                  />
                  <p className="form-hint">
                    Sent to {phoneNumber}
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary w-full"
                >
                  {isSubmitting ? 'Verifying...' : 'Sign in'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowOtpInput(false)}
                  className="btn btn-secondary w-full"
                >
                  Change number
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="card text-center">
            {isFull ? (
              <>
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{ backgroundColor: 'rgb(var(--color-interactive-muted))' }}
                >
                  <Users className="w-6 h-6" style={{ color: 'rgb(var(--color-text-subtle))' }} />
                </div>
                <h3 className="font-semibold mb-1" style={{ color: 'rgb(var(--color-text))' }}>Match is full</h3>
                <p className="text-sm mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>No spots available</p>
                <button 
                  onClick={() => window.location.href = '/'}
                  className="btn btn-secondary"
                >
                  Find other matches
                </button>
              </>
            ) : (
              <>
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{ backgroundColor: 'rgb(var(--color-interactive-muted))' }}
                >
                  <UserPlus className="w-6 h-6" style={{ color: 'rgb(var(--color-text-muted))' }} />
                </div>
                <h3 className="font-semibold mb-1" style={{ color: 'rgb(var(--color-text))' }}>Ready to join!</h3>
                <p className="text-sm mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {availableSpots} {availableSpots === 1 ? 'spot' : 'spots'} available
                </p>
                <button
                  onClick={handleJoinMatch}
                  className="btn btn-primary"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Join match
                </button>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div 
          className="card text-center"
          style={{ backgroundColor: 'rgb(var(--color-interactive-muted))' }}
        >
          <Logo size="sm" className="justify-center mb-1" />
          <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
            The easiest way to organize padel matches
          </p>
        </div>
      </main>
    </div>
  )
}

