'use client'

import { useState, useEffect } from 'react'
import { Calendar, MapPin, Users, UserPlus, Phone } from 'lucide-react'
import { formatMatchDate, formatMatchTime, getAvailableSpots, isMatchFull } from '@padel-parrot/shared'
import { getMatch, sendOtp, verifyOtp, getCurrentUser } from '@padel-parrot/api-client'
import toast from 'react-hot-toast'

interface Match {
  id: string
  title: string
  description?: string
  date_time: string
  location: string
  max_players: number
  current_players: number
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled'
  creator_id: string
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
      // User not authenticated, which is fine for join page
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
      toast.error('Failed to load match details')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneNumber.trim()) {
      toast.error('Please enter a phone number')
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await sendOtp(phoneNumber)
      if (error) {
        toast.error(error)
      } else {
        setShowOtpInput(true)
        toast.success('Verification code sent!')
      }
    } catch (error) {
      toast.error('Failed to send verification code')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otpCode.trim()) {
      toast.error('Please enter the verification code')
      return
    }

    setIsSubmitting(true)
    try {
      const { data: user, error } = await verifyOtp(phoneNumber, otpCode)
      if (error) {
        toast.error(error)
      } else if (user) {
        setIsAuthenticated(true)
        toast.success('Successfully signed in!')
      }
    } catch (error) {
      toast.error('Failed to verify code')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleJoinMatch = () => {
    // Redirect to match details page where they can complete the join
    window.location.href = `/match/${params.id}`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading match details...</p>
        </div>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Match not found</h2>
          <p className="text-gray-600 mb-4">This match may have been deleted or the link is invalid.</p>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container-app py-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              🦜 PadelParrot
            </h1>
            <p className="text-gray-600 mt-1">
              You've been invited to join a match
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-app py-6">
        <div className="space-y-6">
          {/* Match Preview */}
          <div className="card">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {match.title}
              </h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                isFull
                  ? 'bg-error-100 text-error-800'
                  : 'bg-success-100 text-success-800'
              }`}>
                {isFull ? 'Full' : `${availableSpots} spots left`}
              </span>
            </div>
            
            {match.description && (
              <p className="text-gray-600 mb-4">
                {match.description}
              </p>
            )}
            
            <div className="space-y-3">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">
                    {formatMatchDate(match.date_time)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatMatchTime(match.date_time)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center">
                <MapPin className="w-4 h-4 text-gray-400 mr-3" />
                <p className="font-medium text-gray-900">
                  {match.location}
                </p>
              </div>
              
              <div className="flex items-center">
                <Users className="w-4 h-4 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">
                    {match.current_players}/{match.max_players} players
                  </p>
                  <div className="flex mt-1">
                    {Array.from({ length: match.max_players }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2.5 h-2.5 rounded-full mr-1 ${
                          i < match.current_players
                            ? 'bg-primary-500'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Authentication / Join Section */}
          {!isAuthenticated ? (
            <div className="card">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Sign in to join this match
                </h3>
                <p className="text-gray-600">
                  Quick verification with your phone number
                </p>
              </div>

              {!showOtpInput ? (
                <form onSubmit={handleSendOtp}>
                  <div className="mb-4">
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
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
                    {isSubmitting ? 'Sending...' : 'Send Verification Code'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp}>
                  <div className="mb-4">
                    <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                      Verification Code
                    </label>
                    <input
                      id="otp"
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      className="input text-center text-lg tracking-widest"
                      maxLength={6}
                      required
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      Enter the 6-digit code sent to {phoneNumber}
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary w-full mb-3"
                  >
                    {isSubmitting ? 'Verifying...' : 'Verify & Join'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOtpInput(false)}
                    className="btn-secondary w-full"
                  >
                    Change Number
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="card">
              {isFull ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-error-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-error-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    This match is full
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Unfortunately, this match has reached its maximum capacity.
                  </p>
                  <button 
                    onClick={() => window.location.href = '/'}
                    className="btn-secondary"
                  >
                    Find Other Matches
                  </button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UserPlus className="w-8 h-8 text-primary-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Ready to join!
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {availableSpots} {availableSpots === 1 ? 'spot' : 'spots'} available in this match
                  </p>
                  <button
                    onClick={handleJoinMatch}
                    className="btn-primary btn-lg"
                  >
                    <UserPlus className="w-5 h-5 mr-2" />
                    Join This Match
                  </button>
                </div>
              )}
            </div>
          )}

          {/* App Info */}
          <div className="card bg-gray-50 border-gray-200">
            <div className="text-center">
              <h4 className="font-semibold text-gray-900 mb-2">
                🦜 PadelParrot
              </h4>
              <p className="text-sm text-gray-600">
                The easiest way to organize padel matches
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 