'use client'

import { useState, useEffect } from 'react'
import { Phone, Plus, Calendar, MapPin, Users, LogOut, Lock, Globe, User } from 'lucide-react'
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

  useEffect(() => {
    checkAuthStatus()
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      loadMatches()
    }
  }, [isAuthenticated])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated) {
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
        const shouldRefresh = localStorage.getItem('shouldRefreshMatches')
        if (shouldRefresh) {
          localStorage.removeItem('shouldRefreshMatches')
        }
        loadMatches()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (isAuthenticated) {
      const shouldRefresh = localStorage.getItem('shouldRefreshMatches')
      if (shouldRefresh) {
        localStorage.removeItem('shouldRefreshMatches')
        loadMatches()
      }
    }
  }, [isAuthenticated])

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
        
        if (!user.name) {
          setShowNameModal(true)
        }
      }
    } catch (error) {
      // User not authenticated
    }
  }

  const loadMatches = async () => {
    if (!isAuthenticated) return
    
    setIsLoadingMatches(true)
    try {
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
        toast.success('Welcome!')
        
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
      toast.error('Failed to save name')
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
        toast.success('Signed out')
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

  const upcomingMatches = myMatches.filter(match => !isMatchInPast(match.date_time))
  const pastMatches = myMatches.filter(match => isMatchInPast(match.date_time))
  
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
    setTimeout(() => {
      setPastMatchesPage(prev => prev + 1)
      setIsLoadingMorePastMatches(false)
    }, 300)
  }

  const renderMatchCard = (match: Match, isPast: boolean = false) => {
    const availableSpots = match.max_players - match.current_players
    const isFull = availableSpots === 0
    
    return (
      <div
        key={match.id}
        className={`card-hover cursor-pointer ${isPast ? 'opacity-75' : ''}`}
        onClick={() => handleJoinMatch(match.id)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={`font-medium truncate ${isPast ? 'text-stone-500' : 'text-stone-900'}`}>
                {match.title}
              </h3>
              {match.is_public ? (
                <Globe className="w-3.5 h-3.5 flex-shrink-0 text-stone-400" />
              ) : (
                <Lock className="w-3.5 h-3.5 flex-shrink-0 text-stone-400" />
              )}
            </div>
          </div>
          {!isPast && (
            <span className={`ml-3 flex-shrink-0 ${isFull ? 'badge-full' : 'badge-available'}`}>
              {isFull ? 'Full' : `${availableSpots} left`}
            </span>
          )}
          {isPast && (
            <span className="ml-3 flex-shrink-0 badge-neutral">
              Past
            </span>
          )}
        </div>
        
        <div className="space-y-1.5 text-sm">
          <div className={`flex items-center ${isPast ? 'text-stone-400' : 'text-stone-600'}`}>
            <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">
              {formatMatchDate(match.date_time)} · {formatMatchTime(match.date_time)}
            </span>
          </div>
          
          <div className={`flex items-center ${isPast ? 'text-stone-400' : 'text-stone-600'}`}>
            <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">{match.location}</span>
          </div>
          
          <div className={`flex items-center ${isPast ? 'text-stone-400' : 'text-stone-600'}`}>
            <Users className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>{match.current_players}/{match.max_players}</span>
            <div className="flex ml-2 gap-0.5">
              {Array.from({ length: match.max_players }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${
                    i < match.current_players
                      ? 'bg-stone-500'
                      : 'bg-stone-200'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="text-center mb-8">
            <img src="/padelparrot-light.svg" alt="PadelParrot" className="mx-auto h-10 mb-4" />
            <p className="text-stone-500 text-sm">
              Organise padel matches with ease
            </p>
          </div>

          <div className="card">
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
                  disabled={isLoading}
                  className="btn-primary w-full"
                >
                  {isLoading ? 'Sending...' : 'Continue'}
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
                  disabled={isLoading}
                  className="btn-primary w-full"
                >
                  {isLoading ? 'Verifying...' : 'Sign in'}
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
        </div>
      </div>
    )
  }

  // Main app
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-stone-200 sticky top-0 z-10">
        <div className="container-app py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/padelparrot-light.svg" alt="PadelParrot" className="h-6" />
              {currentUser?.name && (
                <span className="text-sm text-stone-500 hidden sm:inline">
                  {currentUser.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateMatch}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline">New match</span>
              </button>
              <button
                onClick={handleProfile}
                className="btn-secondary p-2"
                title="Profile"
              >
                <User className="w-4 h-4" />
              </button>
              <button
                onClick={handleSignOut}
                className="btn-secondary p-2"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-app py-6 space-y-8">
        {/* My Upcoming Matches */}
        <section>
          <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide mb-3">
            My Matches
          </h2>
          
          {isLoadingMatches ? (
            <div className="card text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-stone-300 border-t-stone-600 mx-auto mb-3"></div>
              <p className="text-sm text-stone-500">Loading...</p>
            </div>
          ) : upcomingMatches.length === 0 ? (
            <div className="card text-center py-8">
              <Calendar className="w-8 h-8 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-600 mb-4">No upcoming matches</p>
              <button
                onClick={handleCreateMatch}
                className="btn-primary"
              >
                Create your first match
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingMatches.map((match) => renderMatchCard(match))}
            </div>
          )}
        </section>

        {/* Public Matches */}
        <section>
          <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide mb-3">
            Public Matches
          </h2>
          
          {isLoadingMatches ? (
            <div className="card text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-stone-300 border-t-stone-600 mx-auto mb-3"></div>
              <p className="text-sm text-stone-500">Loading...</p>
            </div>
          ) : publicMatches.length === 0 ? (
            <div className="card text-center py-8">
              <Globe className="w-8 h-8 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-600">No public matches available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {publicMatches.map((match) => renderMatchCard(match))}
            </div>
          )}
        </section>

        {/* Past Matches */}
        <section>
          <button
            onClick={handleTogglePastMatches}
            className="flex items-center gap-2 text-sm font-medium text-stone-500 uppercase tracking-wide mb-3 hover:text-stone-700 transition-colors"
          >
            Past Matches ({sortedPastMatches.length})
            <span className="text-xs normal-case font-normal">
              {showPastMatches ? '− Hide' : '+ Show'}
            </span>
          </button>
          
          {showPastMatches && (
            <div className="space-y-3 animate-fade-in">
              {displayedPastMatches.length === 0 ? (
                <div className="card text-center py-8">
                  <p className="text-stone-500">No past matches</p>
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
                      {isLoadingMorePastMatches ? 'Loading...' : 'Load more'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </section>
      </main>
      
      {/* Name Setup Modal */}
      {showNameModal && (
        <div className="fixed inset-0 bg-stone-900/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-lg max-w-sm w-full p-6 animate-scale-in">
            <div className="text-center mb-5">
              <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <User className="w-6 h-6 text-stone-600" />
              </div>
              <h3 className="text-lg font-semibold text-stone-900">
                Welcome!
              </h3>
              <p className="text-sm text-stone-500 mt-1">
                What should we call you?
              </p>
            </div>
            
            <form onSubmit={handleSaveName} className="space-y-4">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Your name"
                className="input"
                autoFocus
                maxLength={50}
              />
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSkipName}
                  className="flex-1 btn-secondary"
                  disabled={isUpdatingName}
                >
                  Skip
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                  disabled={isUpdatingName || !nameInput.trim()}
                >
                  {isUpdatingName ? 'Saving...' : 'Continue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
