'use client'

import { useState, useEffect } from 'react'
import { Phone, Plus, Calendar, MapPin, Users, LogOut, Lock, Globe, User, ChevronDown, ChevronUp } from 'lucide-react'
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
        className="card card-hover cursor-pointer"
        onClick={() => handleJoinMatch(match.id)}
        style={{ opacity: isPast ? 0.7 : 1 }}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 
                className="font-medium truncate"
                style={{ color: isPast ? 'rgb(var(--color-text-muted))' : 'rgb(var(--color-text))' }}
              >
                {match.title}
              </h3>
              {match.is_public ? (
                <Globe className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgb(var(--color-text-subtle))' }} />
              ) : (
                <Lock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgb(var(--color-text-subtle))' }} />
              )}
            </div>
          </div>
          {!isPast && (
            <span className={`ml-3 flex-shrink-0 badge ${isFull ? 'badge-full' : 'badge-available'}`}>
              {isFull ? 'Full' : `${availableSpots} left`}
            </span>
          )}
          {isPast && (
            <span className="ml-3 flex-shrink-0 badge badge-neutral">
              Past
            </span>
          )}
        </div>
        
        <div className="space-y-2">
          <div 
            className="flex items-center text-sm"
            style={{ color: isPast ? 'rgb(var(--color-text-subtle))' : 'rgb(var(--color-text-muted))' }}
          >
            <Calendar className="w-4 h-4 mr-2.5 flex-shrink-0" />
            <span className="truncate">
              {formatMatchDate(match.date_time)} · {formatMatchTime(match.date_time)}
            </span>
          </div>
          
          <div 
            className="flex items-center text-sm"
            style={{ color: isPast ? 'rgb(var(--color-text-subtle))' : 'rgb(var(--color-text-muted))' }}
          >
            <MapPin className="w-4 h-4 mr-2.5 flex-shrink-0" />
            <span className="truncate">{match.location}</span>
          </div>
          
          <div 
            className="flex items-center text-sm"
            style={{ color: isPast ? 'rgb(var(--color-text-subtle))' : 'rgb(var(--color-text-muted))' }}
          >
            <Users className="w-4 h-4 mr-2.5 flex-shrink-0" />
            <span>{match.current_players}/{match.max_players}</span>
            <div className="flex ml-2.5 gap-1">
              {Array.from({ length: match.max_players }).map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{ 
                    backgroundColor: i < match.current_players
                      ? 'rgb(var(--color-text-muted))'
                      : 'rgb(var(--color-border-light))'
                  }}
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
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgb(var(--color-bg))' }}
      >
        <div className="w-full max-w-sm animate-fade-in">
          <div className="text-center mb-8">
            <img src="/padelparrot-light.svg" alt="PadelParrot" className="mx-auto h-10 mb-4" />
            <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
              Organise padel matches with ease
            </p>
          </div>

          <div className="card">
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
                  disabled={isLoading}
                  className="btn btn-primary w-full"
                >
                  {isLoading ? 'Sending...' : 'Continue'}
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
                  disabled={isLoading}
                  className="btn btn-primary w-full"
                >
                  {isLoading ? 'Verifying...' : 'Sign in'}
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
        </div>
      </div>
    )
  }

  // Main app
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
      {/* Header */}
      <header 
        className="sticky top-0 z-10 backdrop-blur-sm"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface) / 0.8)',
          borderBottom: '1px solid rgb(var(--color-border-light))'
        }}
      >
        <div className="container-app py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/padelparrot-light.svg" alt="PadelParrot" className="h-7" />
              {currentUser?.name && (
                <span 
                  className="text-sm hidden sm:inline"
                  style={{ color: 'rgb(var(--color-text-muted))' }}
                >
                  {currentUser.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateMatch}
                className="btn btn-primary"
              >
                <Plus className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline">New match</span>
              </button>
              <button
                onClick={handleProfile}
                className="btn btn-secondary"
                style={{ padding: 'var(--space-2)' }}
                title="Profile"
              >
                <User className="w-4 h-4" />
              </button>
              <button
                onClick={handleSignOut}
                className="btn btn-secondary"
                style={{ padding: 'var(--space-2)' }}
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
          <h2 className="section-header" style={{ marginBottom: 'var(--space-4)' }}>
            My Matches
          </h2>
          
          {isLoadingMatches ? (
            <div className="card text-center" style={{ padding: 'var(--space-8)' }}>
              <div 
                className="animate-spin rounded-full h-6 w-6 mx-auto mb-3"
                style={{ 
                  border: '2px solid rgb(var(--color-border-light))',
                  borderTopColor: 'rgb(var(--color-text-muted))'
                }}
              />
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>Loading...</p>
            </div>
          ) : upcomingMatches.length === 0 ? (
            <div className="card text-center" style={{ padding: 'var(--space-8)' }}>
              <Calendar className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgb(var(--color-border))' }} />
              <p className="mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>No upcoming matches</p>
              <button
                onClick={handleCreateMatch}
                className="btn btn-primary"
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
          <h2 className="section-header" style={{ marginBottom: 'var(--space-4)' }}>
            Public Matches
          </h2>
          
          {isLoadingMatches ? (
            <div className="card text-center" style={{ padding: 'var(--space-8)' }}>
              <div 
                className="animate-spin rounded-full h-6 w-6 mx-auto mb-3"
                style={{ 
                  border: '2px solid rgb(var(--color-border-light))',
                  borderTopColor: 'rgb(var(--color-text-muted))'
                }}
              />
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>Loading...</p>
            </div>
          ) : publicMatches.length === 0 ? (
            <div className="card text-center" style={{ padding: 'var(--space-8)' }}>
              <Globe className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgb(var(--color-border))' }} />
              <p style={{ color: 'rgb(var(--color-text-muted))' }}>No public matches available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {publicMatches.map((match) => renderMatchCard(match))}
            </div>
          )}
        </section>

        {/* Past Matches */}
        {sortedPastMatches.length > 0 && (
          <section>
            <button
              onClick={handleTogglePastMatches}
              className="flex items-center gap-2 w-full text-left transition-colors"
              style={{ marginBottom: 'var(--space-4)' }}
            >
              <h2 className="section-header" style={{ marginBottom: 0 }}>
                Past Matches
              </h2>
              <span 
                className="badge badge-neutral"
                style={{ marginLeft: 'var(--space-2)' }}
              >
                {sortedPastMatches.length}
              </span>
              {showPastMatches ? (
                <ChevronUp className="w-4 h-4 ml-auto" style={{ color: 'rgb(var(--color-text-muted))' }} />
              ) : (
                <ChevronDown className="w-4 h-4 ml-auto" style={{ color: 'rgb(var(--color-text-muted))' }} />
              )}
            </button>
            
            {showPastMatches && (
              <div className="space-y-3 animate-fade-in">
                {displayedPastMatches.map((match) => renderMatchCard(match, true))}
                {hasMorePastMatches && (
                  <button
                    onClick={handleLoadMorePastMatches}
                    className="btn btn-secondary w-full"
                    disabled={isLoadingMorePastMatches}
                  >
                    {isLoadingMorePastMatches ? 'Loading...' : 'Load more'}
                  </button>
                )}
              </div>
            )}
          </section>
        )}
      </main>
      
      {/* Name Setup Modal */}
      {showNameModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 z-50 animate-fade-in"
          style={{ backgroundColor: 'rgb(var(--color-text) / 0.5)' }}
        >
          <div 
            className="rounded-xl max-w-sm w-full animate-scale-in"
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              padding: 'var(--space-6)'
            }}
          >
            <div className="text-center mb-6">
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: 'rgb(var(--color-interactive-muted))' }}
              >
                <User className="w-7 h-7" style={{ color: 'rgb(var(--color-text-muted))' }} />
              </div>
              <h3 className="text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                Welcome!
              </h3>
              <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
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
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSkipName}
                  className="btn btn-secondary flex-1"
                  disabled={isUpdatingName}
                >
                  Skip
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
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
