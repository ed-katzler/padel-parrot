'use client'

import { useState, useEffect } from 'react'
import { Phone, Plus, Calendar, MapPin, Users, LogOut } from 'lucide-react'
import { formatMatchDate, formatMatchTime } from '@padel-parrot/shared'
import { sendOtp, verifyOtp, getCurrentUser, signOut, getMatches } from '@padel-parrot/api-client'
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

interface User {
  id: string
  phone: string
  name: string | null
  created_at: string
  updated_at: string
}

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [matches, setMatches] = useState<Match[]>([])
  const [isLoadingMatches, setIsLoadingMatches] = useState(false)

  // Check if user is already authenticated on page load
  useEffect(() => {
    checkAuthStatus()
  }, [])

  // Load matches when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadMatches()
    }
  }, [isAuthenticated])

  // Refresh matches when page becomes visible (user returns from another tab/page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated) {
        // Check if we should refresh matches due to actions taken elsewhere
        const shouldRefresh = localStorage.getItem('shouldRefreshMatches')
        if (shouldRefresh) {
          localStorage.removeItem('shouldRefreshMatches')
          loadMatches()
        } else {
          loadMatches()
        }
      }
    }

    const handleFocus = () => {
      if (isAuthenticated) {
        // Check if we should refresh matches due to actions taken elsewhere
        const shouldRefresh = localStorage.getItem('shouldRefreshMatches')
        if (shouldRefresh) {
          localStorage.removeItem('shouldRefreshMatches')
        }
        loadMatches()
      }
    }

    // Listen for page visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [isAuthenticated])

  // Check for refresh signal when component mounts
  useEffect(() => {
    if (isAuthenticated) {
      const shouldRefresh = localStorage.getItem('shouldRefreshMatches')
      if (shouldRefresh) {
        localStorage.removeItem('shouldRefreshMatches')
        loadMatches()
      }
    }
  }, [isAuthenticated])

  // Listen for storage events (when localStorage is updated from other tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'shouldRefreshMatches' && e.newValue === 'true' && isAuthenticated) {
        localStorage.removeItem('shouldRefreshMatches')
        loadMatches()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [isAuthenticated])

  const checkAuthStatus = async () => {
    try {
      const { data: user, error } = await getCurrentUser()
      if (user && !error) {
        setCurrentUser(user)
        setIsAuthenticated(true)
      }
    } catch (error) {
      // User not authenticated, which is fine
    }
  }

  const loadMatches = async () => {
    setIsLoadingMatches(true)
    try {
      const { data, error } = await getMatches()
      if (error) {
        toast.error(error)
        setMatches([])
      } else {
        setMatches(data || [])
      }
    } catch (error) {
      toast.error('Failed to load matches')
      setMatches([])
    } finally {
      setIsLoadingMatches(false)
    }
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneNumber.trim()) {
      toast.error('Please enter a phone number')
      return
    }

    setIsLoading(true)
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
      setIsLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otpCode.trim()) {
      toast.error('Please enter the verification code')
      return
    }

    setIsLoading(true)
    try {
      const { data: user, error } = await verifyOtp(phoneNumber, otpCode)
      if (error) {
        toast.error(error)
      } else if (user) {
        setCurrentUser(user)
        setIsAuthenticated(true)
        toast.success('Successfully signed in!')
      }
    } catch (error) {
      toast.error('Failed to verify code')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      const { error } = await signOut()
      if (error) {
        toast.error(error)
      } else {
        setIsAuthenticated(false)
        setCurrentUser(null)
        setMatches([])
        setPhoneNumber('')
        setOtpCode('')
        setShowOtpInput(false)
        toast.success('Signed out successfully')
      }
    } catch (error) {
      toast.error('Failed to sign out')
    }
  }

  const handleCreateMatch = () => {
    window.location.href = '/create'
  }

  const handleJoinMatch = (matchId: string) => {
    window.location.href = `/match/${matchId}`
  }

  const handleRefreshMatches = () => {
    loadMatches()
    toast.success('Refreshed matches')
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src="/padelparrot-light.svg" alt="PadelParrot Logo" className="mx-auto h-12 mb-2" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2 sr-only">
              PadelParrot
            </h1>
            <p className="text-gray-600">
              Organize padel matches with ease
            </p>
          </div>

          <div className="card">
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
                  disabled={isLoading}
                  className="btn-primary w-full"
                >
                  {isLoading ? 'Sending...' : 'Send Code'}
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
                  disabled={isLoading}
                  className="btn-primary w-full mb-3"
                >
                  {isLoading ? 'Verifying...' : 'Verify Code'}
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
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container-app py-4">
          <div className="flex items-center justify-between">
            <div>
              <img src="/padelparrot-light.svg" alt="PadelParrot Logo" className="h-6" />
              {currentUser && (
                <p className="text-sm text-gray-600">
                  {currentUser.name || currentUser.phone}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCreateMatch}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Match
              </button>
              <button
                onClick={handleSignOut}
                className="btn-secondary"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-app py-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Upcoming Matches
            </h2>
            <button
              onClick={handleRefreshMatches}
              className="btn-secondary"
              disabled={isLoadingMatches}
            >
              {isLoadingMatches ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          
          {isLoadingMatches ? (
            <div className="card text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading matches...</p>
            </div>
          ) : matches.length === 0 ? (
            <div className="card text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No matches yet
              </h3>
              <p className="text-gray-600 mb-4">
                Create your first match to get started
              </p>
              <button
                onClick={handleCreateMatch}
                className="btn-primary"
              >
                Create Match
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {matches.map((match) => {
                const availableSpots = match.max_players - match.current_players
                const isFull = availableSpots === 0
                
                return (
                  <div
                    key={match.id}
                    className="card hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleJoinMatch(match.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {match.title}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          isFull
                            ? 'bg-error-100 text-error-800'
                            : 'bg-success-100 text-success-800'
                        }`}
                      >
                        {isFull ? 'Full' : `${availableSpots} spots left`}
                      </span>
                    </div>
                    
                    {match.description && (
                      <p className="text-gray-600 mb-3 text-sm">
                        {match.description}
                      </p>
                    )}
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>
                          {formatMatchDate(match.date_time)} at {formatMatchTime(match.date_time)}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-gray-600">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span>{match.location}</span>
                      </div>
                      
                      <div className="flex items-center text-gray-600">
                        <Users className="w-4 h-4 mr-2" />
                        <span>{match.current_players}/{match.max_players} players</span>
                        <div className="flex ml-2">
                          {Array.from({ length: match.max_players }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-2 h-2 rounded-full mr-1 ${
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
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
} 