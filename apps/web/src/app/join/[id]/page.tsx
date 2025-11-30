'use client'

import { useState, useEffect } from 'react'
import { Calendar, MapPin, Users, UserPlus, Phone } from 'lucide-react'
import { formatMatchDate, formatMatchTime, formatMatchDateTime, getAvailableSpots, isMatchFull } from '@padel-parrot/shared'
import { getMatch, sendOtp, verifyOtp, getCurrentUser } from '@padel-parrot/api-client'
import toast from 'react-hot-toast'

interface Match {
  id: string
  title: string
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

export default function JoinMatchPage({ params }: { params: { id: string } }) {
  const [match, setMatch] = useState<Match | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadMatch()
    checkAuthStatus()
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
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-stone-300 border-t-primary-600 mx-auto mb-3"></div>
          <p className="text-sm text-stone-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <h2 className="text-lg font-medium text-stone-900 mb-2">Match not found</h2>
          <p className="text-sm text-stone-500 mb-4">This link may be invalid.</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="btn-primary"
          >
            Go to PadelParrot
          </button>
        </div>
      </div>
    )
  }

  const availableSpots = getAvailableSpots(match.max_players, match.current_players)
  const isFull = isMatchFull(match.max_players, match.current_players)

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200">
        <div className="container-app py-4 text-center">
          <img src="/padelparrot-light.svg" alt="PadelParrot" className="h-7 mx-auto mb-1" />
          <p className="text-sm text-stone-500">
            You've been invited to join a match
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-app py-6 space-y-4">
        {/* Match Preview */}
        <div className="card">
          <div className="flex items-start justify-between mb-3">
            <h2 className="text-lg font-semibold text-stone-900 pr-3">
              {match.title}
            </h2>
            <span className={`flex-shrink-0 ${isFull ? 'badge-error' : 'badge-success'}`}>
              {isFull ? 'Full' : `${availableSpots} left`}
            </span>
          </div>
          
          {match.description && (
            <p className="text-stone-600 text-sm mb-4">
              {match.description}
            </p>
          )}
          
          <div className="space-y-2.5 text-sm">
            <div className="flex items-start">
              <Calendar className="w-4 h-4 text-stone-400 mr-3 mt-0.5" />
              <div>
                <p className="font-medium text-stone-900">
                  {formatMatchDate(match.date_time)}
                </p>
                <p className="text-xs text-stone-500">
                  {formatMatchDateTime(match.date_time, match.duration_minutes)}
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <MapPin className="w-4 h-4 text-stone-400 mr-3 mt-0.5" />
              <p className="font-medium text-stone-900">
                {match.location}
              </p>
            </div>
            
            <div className="flex items-start">
              <Users className="w-4 h-4 text-stone-400 mr-3 mt-0.5" />
              <div>
                <p className="font-medium text-stone-900">
                  {match.current_players}/{match.max_players} players
                </p>
                <div className="flex mt-1.5 gap-0.5">
                  {Array.from({ length: match.max_players }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        i < match.current_players ? 'bg-primary-500' : 'bg-stone-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Auth / Join */}
        {!isAuthenticated ? (
          <div className="card">
            <div className="text-center mb-5">
              <h3 className="font-medium text-stone-900 mb-1">
                Sign in to join
              </h3>
              <p className="text-sm text-stone-500">
                Quick phone verification
              </p>
            </div>

            {!showOtpInput ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-stone-700 mb-1.5">
                    Phone number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 w-4 h-4" />
                    <input
                      id="phone"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1234567890"
                      className="input pl-10"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full"
                >
                  {isSubmitting ? 'Sending...' : 'Continue'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-stone-700 mb-1.5">
                    Verification code
                  </label>
                  <input
                    id="otp"
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    className="input text-center tracking-widest"
                    maxLength={6}
                    required
                    autoFocus
                  />
                  <p className="text-xs text-stone-500 mt-1.5">
                    Sent to {phoneNumber}
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full"
                >
                  {isSubmitting ? 'Verifying...' : 'Sign in'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowOtpInput(false)}
                  className="btn-secondary w-full"
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
                <div className="w-10 h-10 bg-error-50 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Users className="w-5 h-5 text-error-500" />
                </div>
                <h3 className="font-medium text-stone-900 mb-1">Match is full</h3>
                <p className="text-sm text-stone-500 mb-4">No spots available</p>
                <button 
                  onClick={() => window.location.href = '/'}
                  className="btn-secondary"
                >
                  Find other matches
                </button>
              </>
            ) : (
              <>
                <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-2">
                  <UserPlus className="w-5 h-5 text-primary-600" />
                </div>
                <h3 className="font-medium text-stone-900 mb-1">Ready to join!</h3>
                <p className="text-sm text-stone-500 mb-4">
                  {availableSpots} {availableSpots === 1 ? 'spot' : 'spots'} available
                </p>
                <button
                  onClick={handleJoinMatch}
                  className="btn-primary"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Join match
                </button>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="card bg-stone-100 border-stone-200 text-center">
          <img src="/padelparrot-light.svg" alt="PadelParrot" className="h-5 mx-auto mb-1" />
          <p className="text-xs text-stone-500">
            The easiest way to organize padel matches
          </p>
        </div>
      </main>
    </div>
  )
}
