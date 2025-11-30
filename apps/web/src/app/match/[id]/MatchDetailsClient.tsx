'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Calendar, MapPin, Users, Share2, UserPlus, UserMinus, Copy, ExternalLink, User, Edit3, Trash2, ChevronRight } from 'lucide-react'
import { formatMatchDate, formatMatchTime, formatMatchDateTime, getAvailableSpots, isMatchFull } from '@padel-parrot/shared'
import { getMatch, joinMatch, leaveMatch, deleteMatch, getCurrentUser, hasUserJoinedMatch, getMatchParticipants, getUserById } from '@padel-parrot/api-client'
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

interface UserInfo {
  id: string
  phone: string
  name: string | null
}

export default function MatchDetailsClient({ params }: { params: { id: string } }) {
  const [match, setMatch] = useState<Match | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [hasJoined, setHasJoined] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [creator, setCreator] = useState<UserInfo | null>(null)
  const [participants, setParticipants] = useState<UserInfo[]>([])
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false)

  useEffect(() => {
    loadCurrentUser()
  }, [params.id])

  useEffect(() => {
    if (currentUserId) {
      loadMatch()
    } else {
      loadMatch()
    }
  }, [currentUserId, params.id])

  const loadCurrentUser = async () => {
    try {
      const { data: user, error } = await getCurrentUser()
      if (user && !error) {
        setCurrentUserId(user.id)
      }
    } catch (error) {
      window.location.href = '/'
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
        
        const { data: creatorData, error: creatorError } = await getUserById(data.creator_id)
        if (!creatorError && creatorData) {
          setCreator(creatorData)
        }
        
        loadParticipants(data.id)
        
        if (currentUserId) {
          const { data: hasJoined, error: joinError } = await hasUserJoinedMatch(data.id, currentUserId)
          if (!joinError && hasJoined !== null) {
            setHasJoined(hasJoined)
          }
        }
      }
    } catch (error) {
      toast.error('Failed to load match')
    } finally {
      setIsLoading(false)
    }
  }

  const loadParticipants = async (matchId: string) => {
    setIsLoadingParticipants(true)
    try {
      const { data, error } = await getMatchParticipants(matchId)
      if (!error && data) {
        setParticipants(data)
      }
    } catch (error) {
      console.error('Failed to load participants:', error)
    } finally {
      setIsLoadingParticipants(false)
    }
  }

  const handleJoinMatch = async () => {
    if (!match || !currentUserId) return
    
    setIsJoining(true)
    try {
      const { error } = await joinMatch(match.id, currentUserId)
      if (error) {
        toast.error(error)
        return
      }
      
      toast.success('Joined!')
      setHasJoined(true)
      localStorage.setItem('shouldRefreshMatches', 'true')
      loadMatch()
    } catch (error) {
      toast.error('Failed to join')
    } finally {
      setIsJoining(false)
    }
  }

  const handleLeaveMatch = async () => {
    if (!match || !currentUserId) return
    
    setIsLeaving(true)
    try {
      const { error } = await leaveMatch(match.id, currentUserId)
      if (error) {
        toast.error(error)
        return
      }
      
      toast.success('Left match')
      setHasJoined(false)
      localStorage.setItem('shouldRefreshMatches', 'true')
      loadMatch()
    } catch (error) {
      toast.error('Failed to leave')
    } finally {
      setIsLeaving(false)
    }
  }

  const handleShare = () => {
    setShowShareModal(true)
  }

  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}/join/${match?.id}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Link copied!')
      setShowShareModal(false)
    } catch (error) {
      toast.error('Failed to copy')
    }
  }

  const handleShareWhatsApp = () => {
    if (!match) return
    
    const shareUrl = `${window.location.origin}/join/${match.id}`
    const message = `Join my padel match: ${match.title}\n📅 ${formatMatchDate(match.date_time)} at ${formatMatchTime(match.date_time)}\n📍 ${match.location}\n\n${shareUrl}`
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
    setShowShareModal(false)
  }

  const handleBack = () => {
    window.location.href = '/'
  }

  const handleEdit = () => {
    window.location.href = `/match/${params.id}/edit`
  }

  const handleDelete = () => {
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    if (!match || !currentUserId) return
    
    setIsDeleting(true)
    try {
      const { error } = await deleteMatch(match.id)
      if (error) {
        toast.error(error)
        return
      }
      
      toast.success('Match deleted')
      setShowDeleteModal(false)
      localStorage.setItem('shouldRefreshMatches', 'true')
      setTimeout(() => {
        window.location.href = '/'
      }, 500)
    } catch (error) {
      toast.error('Failed to delete')
    } finally {
      setIsDeleting(false)
    }
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
        <div className="text-center">
          <h2 className="text-lg font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>Match not found</h2>
          <p className="text-sm mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>This match may have been deleted.</p>
          <button onClick={handleBack} className="btn btn-primary">
            Back to home
          </button>
        </div>
      </div>
    )
  }

  const availableSpots = getAvailableSpots(match.max_players, participants.length)
  const isFull = isMatchFull(match.max_players, participants.length)

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
            <div className="flex items-center">
              <button
                onClick={handleBack}
                className="mr-3 p-2 -ml-2 rounded-lg transition-colors"
                style={{ backgroundColor: 'transparent' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--color-interactive-muted))'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <ArrowLeft className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
              </button>
              <h1 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                Match Details
              </h1>
            </div>
            <div className="flex items-center gap-1">
              {match && currentUserId && match.creator_id === currentUserId && match.status === 'upcoming' && (
                <>
                  <button
                    onClick={handleEdit}
                    className="p-2 rounded-lg transition-colors"
                    style={{ backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--color-interactive-muted))'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    title="Edit"
                  >
                    <Edit3 className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="p-2 rounded-lg transition-colors"
                    style={{ backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--color-interactive-muted))'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" style={{ color: 'rgb(var(--color-text-subtle))' }} />
                  </button>
                </>
              )}
              <button
                onClick={handleShare}
                className="p-2 rounded-lg transition-colors"
                style={{ backgroundColor: 'transparent' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--color-interactive-muted))'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title="Share"
              >
                <Share2 className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-app py-6 space-y-4">
        {/* Match Info */}
        <div className="card">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-xl font-semibold pr-3" style={{ color: 'rgb(var(--color-text))' }}>
              {match.title}
            </h2>
            <span className={`flex-shrink-0 badge ${isFull ? 'badge-full' : 'badge-available'}`}>
              {isFull ? 'Full' : `${availableSpots} left`}
            </span>
          </div>
          
          {match.description && (
            <p className="text-sm mb-5" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {match.description}
            </p>
          )}
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgb(var(--color-interactive-muted))' }}
              >
                <Calendar className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
              </div>
              <div>
                <p className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                  {formatMatchDate(match.date_time)}
                </p>
                <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {formatMatchDateTime(match.date_time, match.duration_minutes)}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgb(var(--color-interactive-muted))' }}
              >
                <MapPin className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate" style={{ color: 'rgb(var(--color-text))' }}>
                  {match.location}
                </p>
              </div>
            </div>
            
            {creator && (
              <div className="flex items-start gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgb(var(--color-interactive-muted))' }}
                >
                  <User className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
                </div>
                <div>
                  <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    Created by {currentUserId === creator.id ? 'you' : (creator.name || creator.phone)}
                  </p>
                </div>
              </div>
            )}
            
            <div className="flex items-start gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgb(var(--color-interactive-muted))' }}
              >
                <Users className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
              </div>
              <div>
                <p className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                  {participants.length}/{match.max_players} players
                </p>
                <div className="flex mt-2 gap-1">
                  {Array.from({ length: match.max_players }).map((_, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full"
                      style={{ 
                        backgroundColor: i < participants.length 
                          ? 'rgb(var(--color-text-muted))' 
                          : 'rgb(var(--color-border-light))'
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Participants */}
        {participants.length > 0 && (
          <div className="card">
            <h3 className="section-header" style={{ marginBottom: 'var(--space-4)' }}>
              Players ({participants.length})
            </h3>
            
            {isLoadingParticipants ? (
              <div className="text-center py-4">
                <div 
                  className="animate-spin rounded-full h-5 w-5 mx-auto"
                  style={{ 
                    border: '2px solid rgb(var(--color-border-light))',
                    borderTopColor: 'rgb(var(--color-text-muted))'
                  }}
                />
              </div>
            ) : (
              <div className="space-y-3">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'rgb(var(--color-interactive-muted))' }}
                    >
                      <User className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate" style={{ color: 'rgb(var(--color-text))' }}>
                        {currentUserId === participant.id ? 'You' : (participant.name || 'Player')}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        {participant.phone}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action */}
        <div className="card">
          {hasJoined ? (
            <div className="text-center">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: 'rgb(var(--color-interactive-muted))' }}
              >
                <Users className="w-6 h-6" style={{ color: 'rgb(var(--color-text-muted))' }} />
              </div>
              <p className="font-medium mb-1" style={{ color: 'rgb(var(--color-text))' }}>You're in!</p>
              <p className="text-sm mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>See you at the match</p>
              
              <button
                onClick={handleLeaveMatch}
                disabled={isLeaving}
                className="btn btn-danger w-full"
              >
                <UserMinus className="w-4 h-4 mr-2" />
                {isLeaving ? 'Leaving...' : 'Leave match'}
              </button>
            </div>
          ) : (
            <div className="text-center">
              {isFull ? (
                <>
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                    style={{ backgroundColor: 'rgb(var(--color-interactive-muted))' }}
                  >
                    <Users className="w-6 h-6" style={{ color: 'rgb(var(--color-text-subtle))' }} />
                  </div>
                  <p className="font-medium mb-1" style={{ color: 'rgb(var(--color-text))' }}>Match is full</p>
                  <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>No spots available</p>
                </>
              ) : (
                <>
                  <p className="text-sm mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {availableSpots} {availableSpots === 1 ? 'spot' : 'spots'} remaining
                  </p>
                  <button
                    onClick={handleJoinMatch}
                    disabled={isJoining}
                    className="btn btn-primary w-full"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {isJoining ? 'Joining...' : 'Join match'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Share Card - Clickable */}
        <button
          onClick={handleShare}
          className="card w-full text-left transition-colors"
          style={{ backgroundColor: 'rgb(var(--color-interactive-muted))' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--color-border-light))'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--color-interactive-muted))'}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Share2 className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
              <div>
                <p className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>Share this match</p>
                <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>Send the link to friends</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: 'rgb(var(--color-text-subtle))' }} />
          </div>
        </button>
      </main>

      {/* Share Modal */}
      {showShareModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 z-50 animate-fade-in"
          style={{ backgroundColor: 'rgb(var(--color-text) / 0.5)' }}
        >
          <div 
            className="rounded-xl max-w-sm w-full animate-scale-in"
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              padding: 'var(--space-5)'
            }}
          >
            <h3 className="font-semibold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
              Share Match
            </h3>
            
            <div className="space-y-2">
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center py-3 px-4 rounded-lg transition-colors text-sm"
                style={{ 
                  border: '1px solid rgb(var(--color-border-light))',
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--color-interactive-muted))'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy link
              </button>
              
              <button
                onClick={handleShareWhatsApp}
                className="w-full flex items-center justify-center py-3 px-4 bg-[#25D366] text-white rounded-lg hover:bg-[#20BD5A] transition-colors text-sm"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                WhatsApp
              </button>
            </div>
            
            <button
              onClick={() => setShowShareModal(false)}
              className="w-full mt-4 py-2 text-sm transition-colors"
              style={{ color: 'rgb(var(--color-text-muted))' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'rgb(var(--color-text))'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(var(--color-text-muted))'}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 z-50 animate-fade-in"
          style={{ backgroundColor: 'rgb(var(--color-text) / 0.5)' }}
        >
          <div 
            className="rounded-xl max-w-sm w-full animate-scale-in"
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              padding: 'var(--space-5)'
            }}
          >
            <div className="flex items-start gap-3 mb-4">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgb(var(--color-interactive-muted))' }}
              >
                <Trash2 className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
              </div>
              <div>
                <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Delete match?</h3>
                <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>This can't be undone</p>
              </div>
            </div>
            
            <p className="text-sm mb-4" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              "{match?.title}" will be permanently deleted.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn btn-secondary flex-1"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="btn btn-danger flex-1"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
