'use client'

import { useState, useEffect } from 'react'
import { Phone, Plus, Calendar, MapPin, Users, LogOut, Lock, Globe, ChevronDown, ChevronUp, User } from 'lucide-react'
import { formatMatchDate, formatMatchTime, formatMatchDateTime, isMatchInPast } from '@padel-parrot/shared'
import { sendOtp, verifyOtp, getCurrentUser, signOut, getMyMatches, getPublicMatches, updateUser } from '@padel-parrot/api-client'
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
  const [myMatches, setMyMatches] = useState<Match[]>([])
  const [publicMatches, setPublicMatches] = useState<Match[]>([])
  const [isLoadingMatches, setIsLoadingMatches] = useState(false)
  const [showPastMatches, setShowPastMatches] = useState(false)
  const [pastMatchesPage, setPastMatchesPage] = useState(1)
  const [isLoadingMorePastMatches, setIsLoadingMorePastMatches] = useState(false)
  const [showNameModal, setShowNameModal] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [isUpdatingName, setIsUpdatingName] = useState(false)

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
        
        // Show name modal if user doesn't have a name
        if (!user.name) {
          setShowNameModal(true)
        }
      }
    } catch (error) {
      // User not authenticated, which is fine
    }
  }

  const loadMatches = async () => {
    if (!isAuthenticated) return
    
    setIsLoadingMatches(true)
    try {
      // Load both private/participant matches and public matches
      const [myMatchesResult, publicMatchesResult] = await Promise.all([
        getMyMatches(),
        getPublicMatches()
      ])
      
      if (myMatchesResult.error) {
        toast.error(`Failed to load your matches: ${myMatchesResult.error}`)
        setMyMatches([])
      } else {
        setMyMatches(myMatchesResult.data || [])
      }
      
      if (publicMatchesResult.error) {
        toast.error(`Failed to load public matches: ${publicMatchesResult.error}`)
        setPublicMatches([])
      } else {
        setPublicMatches(publicMatchesResult.data || [])
      }
    } catch (error) {
      toast.error('Failed to load matches')
      setMyMatches([])
      setPublicMatches([])
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
        
        // Show name modal if user doesn't have a name
        if (!user.name) {
          setShowNameModal(true)
        }
      }
    } catch (error) {
      toast.error('Failed to verify code')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nameInput.trim()) {
      toast.error('Please enter your name')
      return
    }

    setIsUpdatingName(true)
    try {
      const { data: updatedUser, error } = await updateUser({ name: nameInput.trim() })
      if (error) {
        toast.error(error)
        return
      }
      
      if (updatedUser) {
        setCurrentUser(updatedUser)
        setShowNameModal(false)
        setNameInput('')
        toast.success('Welcome to PadelParrot!')
      }
    } catch (error) {
      toast.error('Failed to save name. Please try again.')
    } finally {
      setIsUpdatingName(false)
    }
  }

  const handleSkipName = () => {
    setShowNameModal(false)
    setNameInput('')
  }

  const handleProfile = () => {
    window.location.href = '/profile'
  }

  const handleSignOut = async () => {
    try {
      const { error } = await signOut()
      if (error) {
        toast.error(error)
      } else {
        setIsAuthenticated(false)
        setCurrentUser(null)
        setMyMatches([])
        setPublicMatches([])
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

  // Separate matches into upcoming and past
  const upcomingMatches = myMatches.filter(match => !isMatchInPast(match.date_time))
  const pastMatches = myMatches.filter(match => isMatchInPast(match.date_time))
  
  // Sort past matches by date (most recent first)
  const sortedPastMatches = pastMatches.sort((a, b) => 
    new Date(b.date_time).getTime() - new Date(a.date_time).getTime()
  )
  
  const PAST_MATCHES_PER_PAGE = 10
  const displayedPastMatches = sortedPastMatches.slice(0, pastMatchesPage * PAST_MATCHES_PER_PAGE)
  const hasMorePastMatches = sortedPastMatches.length > displayedPastMatches.length

  const handleTogglePastMatches = () => {
    setShowPastMatches(!showPastMatches)
  }

  const handleLoadMorePastMatches = () => {
    setIsLoadingMorePastMatches(true)
    // Simulate loading delay for better UX
    setTimeout(() => {
      setPastMatchesPage(prev => prev + 1)
      setIsLoadingMorePastMatches(false)
    }, 500)
  }

  const renderMatchCard = (match: Match, isPast: boolean = false) => {
    // NOTE: match.current_players may be stale due to database sync issues
    // The Match Details page shows accurate counts by loading actual participants
    // This will be fixed when database triggers/migrations are properly applied
    const availableSpots = match.max_players - match.current_players
    const isFull = availableSpots === 0
    
    return (
      <div
        key={match.id}
        className={`card hover:shadow-md transition-shadow cursor-pointer ${
          isPast ? 'bg-gray-50' : ''
        }`}
        onClick={() => handleJoinMatch(match.id)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`text-lg font-semibold ${
                isPast ? 'text-gray-600' : 'text-gray-900'
              }`}>
                {match.title}
              </h3>
              {/* Privacy indicator */}
              {match.is_public ? (
                <span title="Public match">
                  <Globe className={`w-4 h-4 ${
                    isPast ? 'text-gray-400' : 'text-green-600'
                  }`} />
                </span>
              ) : (
                <span title="Private match">
                  <Lock className="w-4 h-4 text-gray-400" />
                </span>
              )}
            </div>
          </div>
          {!isPast && (
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                isFull
                  ? 'bg-error-100 text-error-800'
                  : 'bg-success-100 text-success-800'
              }`}
            >
              {isFull ? 'Full' : `${availableSpots} spots left`}
            </span>
          )}
          {isPast && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
              Completed
            </span>
          )}
        </div>
        
        {match.description && (
          <p className={`mb-3 text-sm ${
            isPast ? 'text-gray-500' : 'text-gray-600'
          }`}>
            {match.description}
          </p>
        )}
        
        <div className="space-y-2 text-sm">
          <div className={`flex items-center ${
            isPast ? 'text-gray-500' : 'text-gray-600'
          }`}>
            <Calendar className="w-4 h-4 mr-2" />
            <span>
              {formatMatchDate(match.date_time)} at {formatMatchDateTime(match.date_time, match.duration_minutes)}
            </span>
          </div>
          
          <div className={`flex items-center ${
            isPast ? 'text-gray-500' : 'text-gray-600'
          }`}>
            <MapPin className="w-4 h-4 mr-2" />
            <span>{match.location}</span>
          </div>
          
          <div className={`flex items-center ${
            isPast ? 'text-gray-500' : 'text-gray-600'
          }`}>
            <Users className="w-4 h-4 mr-2" />
            <span>{match.current_players}/{match.max_players} players</span>
            <div className="flex ml-2">
              {Array.from({ length: match.max_players }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full mr-1 ${
                    i < match.current_players
                      ? isPast ? 'bg-gray-400' : 'bg-primary-500'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
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
                onClick={handleProfile}
                className="btn-secondary"
                title="Profile"
              >
                <User className="w-4 h-4" />
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
              My Upcoming Matches
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
          ) : upcomingMatches.length === 0 ? (
            <div className="card text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No matches yet
              </h3>
              <p className="text-gray-600 mb-4">
                Create your first match or join a public match below
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
              {upcomingMatches.map((match) => renderMatchCard(match))}
            </div>
          )}
        </div>

        {/* Public Matches Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">
                Public Matches
              </h2>
              <Globe className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">
              Discover matches to join
            </span>
          </div>
          
          {isLoadingMatches ? (
            <div className="card text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading public matches...</p>
            </div>
          ) : publicMatches.length === 0 ? (
            <div className="card text-center py-8">
              <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No public matches available
              </h3>
              <p className="text-gray-600 mb-4">
                Be the first to create a public match for others to join
              </p>
              {/* <button
                onClick={handleCreateMatch}
                className="btn-primary"
              >
                Create Public Match
              </button> */}
            </div>
          ) : (
            <div className="space-y-4">
              {publicMatches.map((match) => renderMatchCard(match))}
            </div>
          )}
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              My Past Matches
            </h2>
            <button
              onClick={handleTogglePastMatches}
              className="btn-secondary"
            >
              {showPastMatches ? 'Hide Past Matches' : 'Show Past Matches'}
            </button>
          </div>
          
          {showPastMatches ? (
            <div className="space-y-4">
              {displayedPastMatches.length === 0 ? (
                <div className="card text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No past matches yet
                  </h3>
                  <p className="text-gray-600">
                    Past matches will appear here after they're completed
                  </p>
                </div>
              ) : (
                <>
                  {displayedPastMatches.map((match) => renderMatchCard(match, true))}
                  {hasMorePastMatches && (
                    <button
                      onClick={handleLoadMorePastMatches}
                      className="btn-secondary w-full"
                      disabled={isLoadingMorePastMatches}
                    >
                      {isLoadingMorePastMatches ? 'Loading...' : 'Load More'}
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="card text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Past Matches ({sortedPastMatches.length})
              </h3>
              <p className="text-gray-600 mb-4">
                {sortedPastMatches.length === 0 
                  ? 'No past matches yet' 
                  : `${sortedPastMatches.length} past matches available`}
              </p>
            </div>
          )}
        </div>
      </main>
      
      {/* Name Setup Modal */}
      {showNameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Welcome to PadelParrot!
              </h3>
              <p className="text-gray-600">
                Let's set up your profile. What should other players call you?
              </p>
            </div>
            
            <form onSubmit={handleSaveName} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Enter your name"
                  className="input"
                  autoFocus
                  maxLength={50}
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleSkipName}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  disabled={isUpdatingName}
                >
                  Skip for now
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                  disabled={isUpdatingName || !nameInput.trim()}
                >
                  {isUpdatingName ? 'Saving...' : 'Save Name'}
                </button>
              </div>
            </form>
            
            <p className="text-xs text-gray-500 text-center mt-4">
              You can always change this later in your profile
            </p>
          </div>
        </div>
      )}
    </div>
  )
} 