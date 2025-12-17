'use client'

import { useState, useEffect } from 'react'
import { Phone, Plus, Calendar, MapPin, Users, Lock, Globe, ChevronDown, ChevronUp, Repeat, Disc } from 'lucide-react'
import { formatMatchDate, formatMatchTime, formatMatchDateTime, formatMatchTitle, isMatchInPast } from '@padel-parrot/shared'
import { sendOtp, verifyOtp, getCurrentUser, getMyMatches, getPublicMatches, updateUser, getRealtimeClient, getMatchParticipants, getSubscriptionStatus, type Subscription } from '@padel-parrot/api-client'
import Logo from '@/components/Logo'
import Avatar from '@/components/Avatar'
import TrialExpiredBanner from '@/components/TrialExpiredBanner'
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
  recurrence_type?: 'none' | 'weekly' | 'biweekly'
  recurrence_end_date?: string | null
  series_id?: string | null
  created_at: string
  updated_at: string
}

interface User {
  id: string
  phone: string
  name: string | null
  avatar_url?: string | null
  created_at: string
  updated_at: string
}

interface Participant {
  id: string
  phone: string
  name: string | null
  avatar_url: string | null
}

export default function HomePage() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
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
  const [matchParticipants, setMatchParticipants] = useState<Record<string, Participant[]>>({})
  const [subscription, setSubscription] = useState<Subscription | null>(null)

  useEffect(() => {
    checkAuthStatus().finally(() => setIsCheckingAuth(false))
  }, [])

  // Load matches and set up realtime subscription when authenticated
  useEffect(() => {
    if (!isAuthenticated) return

    // Initial load
    loadMatches()

    // Set up Supabase Realtime subscription for live updates
    const supabase = getRealtimeClient()
    if (!supabase) {
      // Mock client - no realtime support, just use initial load
      return
    }

    // Subscribe to changes in matches and match_participants tables
    const channel = supabase
      .channel('home-matches-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        () => {
          // Reload matches when any match changes
          loadMatches()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_participants' },
        () => {
          // Reload matches when participants change (join/leave)
          loadMatches()
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel)
    }
  }, [isAuthenticated])

  // Load subscription status for trial banner
  useEffect(() => {
    if (!isAuthenticated) return
    
    const loadSubscription = async () => {
      try {
        const { data } = await getSubscriptionStatus()
        if (data) {
          setSubscription(data)
        }
      } catch (error) {
        console.error('Failed to load subscription:', error)
      }
    }
    
    loadSubscription()
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

      // Load participants for all matches
      const allMatches = [
        ...(myMatchesResult.data || []),
        ...(publicMatchesResult.data || [])
      ]
      
      if (allMatches.length > 0) {
        const participantsResults = await Promise.all(
          allMatches.map(match => getMatchParticipants(match.id))
        )
        
        const participantsMap: Record<string, Participant[]> = {}
        allMatches.forEach((match, index) => {
          const result = participantsResults[index]
          if (!result.error && result.data) {
            participantsMap[match.id] = result.data
          }
        })
        setMatchParticipants(participantsMap)
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

  const handleCreateMatch = () => {
    window.location.href = '/create'
  }

  const handleRacketFinder = () => {
    window.location.href = '/racket-finder'
  }

  const handleUpgradeToPremium = () => {
    window.location.href = '/profile#premium'
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
    const participants = matchParticipants[match.id] || []
    const emptySlots = match.max_players - participants.length
    
    return (
      <div
        key={match.id}
        className="card card-hover cursor-pointer"
        onClick={() => handleJoinMatch(match.id)}
        style={{ opacity: isPast ? 0.7 : 1 }}
      >
        {/* Header: Title + Status Badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 
              className="text-lg font-semibold truncate"
              style={{ color: isPast ? 'rgb(var(--color-text-muted))' : 'rgb(var(--color-text))' }}
            >
              {formatMatchTitle(match.date_time, match.description)}
            </h3>
            <p 
              className="text-sm mt-0.5"
              style={{ color: isPast ? 'rgb(var(--color-text-subtle))' : 'rgb(var(--color-text-muted))' }}
            >
              {formatMatchTime(match.date_time)} · {formatMatchDateTime(match.date_time, match.duration_minutes).split('(')[1]?.replace(')', '') || ''}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {match.recurrence_type && match.recurrence_type !== 'none' && (
              <span title={match.recurrence_type === 'weekly' ? 'Repeats weekly' : 'Repeats every 2 weeks'}>
                <Repeat className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-text-subtle))' }} />
              </span>
            )}
            {match.is_public ? (
              <Globe className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-text-subtle))' }} />
            ) : (
              <Lock className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-text-subtle))' }} />
            )}
            {!isPast && (
              <span className={`badge ${isFull ? 'badge-full' : 'badge-available'}`}>
                {isFull ? 'Full' : `${availableSpots} left`}
              </span>
            )}
            {isPast && (
              <span className="badge badge-neutral">
                Past
              </span>
            )}
          </div>
        </div>
        
        {/* Location */}
        <div 
          className="flex items-center text-sm mb-3"
          style={{ color: isPast ? 'rgb(var(--color-text-subtle))' : 'rgb(var(--color-text-muted))' }}
        >
          <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
          <span className="truncate">{match.location}</span>
        </div>
        
        {/* Divider */}
        <div 
          className="my-3"
          style={{ borderTop: '1px solid rgb(var(--color-border-light))' }}
        />
        
        {/* Players Section */}
        <div className="flex items-center justify-between">
          {/* Avatar Stack + Names */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Stacked Avatars */}
            <div className="flex -space-x-2 flex-shrink-0">
              {participants.slice(0, 4).map((participant, index) => (
                <div 
                  key={participant.id}
                  className="relative"
                  style={{ zIndex: 4 - index }}
                >
                  <Avatar 
                    src={participant.avatar_url} 
                    name={participant.name}
                    size="xs"
                    className="ring-2 ring-white"
                  />
                </div>
              ))}
              {/* Empty slots shown as dashed circles */}
              {emptySlots > 0 && Array.from({ length: Math.min(emptySlots, 4 - participants.length) }).map((_, i) => (
                <div 
                  key={`empty-${i}`}
                  className="w-6 h-6 rounded-full flex items-center justify-center relative"
                  style={{ 
                    zIndex: 4 - participants.length - i,
                    border: '2px dashed rgb(var(--color-border))',
                    backgroundColor: 'rgb(var(--color-surface))'
                  }}
                />
              ))}
            </div>
            
            {/* Player Names */}
            <div className="flex-1 min-w-0">
              {participants.length > 0 ? (
                <p 
                  className="text-sm truncate"
                  style={{ color: isPast ? 'rgb(var(--color-text-subtle))' : 'rgb(var(--color-text-muted))' }}
                >
                  {participants.map(p => p.name || 'Anonymous').join(', ')}
                </p>
              ) : (
                <p 
                  className="text-sm"
                  style={{ color: 'rgb(var(--color-text-subtle))' }}
                >
                  No players yet
                </p>
              )}
            </div>
          </div>
          
          {/* Player Count */}
          <div 
            className="flex items-center gap-1.5 flex-shrink-0 ml-3"
            style={{ color: isPast ? 'rgb(var(--color-text-subtle))' : 'rgb(var(--color-text-muted))' }}
          >
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">{match.current_players}/{match.max_players}</span>
          </div>
        </div>
      </div>
    )
  }

  // Loading state while checking auth
  if (isCheckingAuth) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'rgb(var(--color-bg))' }}
      >
        <div className="text-center">
          <Logo size="lg" className="justify-center mb-4" />
          <div 
            className="animate-spin rounded-full h-6 w-6 mx-auto"
            style={{ 
              border: '2px solid rgb(var(--color-border-light))',
              borderTopColor: 'rgb(var(--color-text-muted))'
            }}
          />
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
            <Logo size="lg" className="justify-center mb-4" />
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
        <div className="container-app py-3">
          <div className="flex items-center justify-between gap-3">
            <Logo size="md" href="/" />
            <div className="flex items-center gap-2">
              {/* Racket Finder - icon only on mobile, with text on larger screens */}
              <button
                onClick={handleRacketFinder}
                className="btn btn-icon btn-secondary hidden sm:flex sm:btn sm:px-3"
                title="Find your perfect racket"
              >
                <Disc className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Racket Finder</span>
              </button>
              {/* Mobile: icon-only button */}
              <button
                onClick={handleRacketFinder}
                className="btn btn-icon btn-secondary sm:hidden"
                title="Find your perfect racket"
              >
                <Disc className="w-5 h-5" />
              </button>
              
              {/* New Match */}
              <button
                onClick={handleCreateMatch}
                className="btn btn-primary px-3"
              >
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">New match</span>
              </button>
              
              {/* Profile Avatar */}
              <button
                onClick={handleProfile}
                className="rounded-full transition-transform active:scale-95 ml-1"
                title="Profile"
              >
                <Avatar 
                  src={currentUser?.avatar_url} 
                  name={currentUser?.name}
                  size="sm"
                />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Trial Expired Banner */}
      <TrialExpiredBanner 
        subscription={subscription} 
        onUpgrade={handleUpgradeToPremium}
      />

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
              <div className="flex justify-center mb-4">
                <Avatar 
                  src={currentUser?.avatar_url} 
                  name={currentUser?.name}
                  size="lg"
                />
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
