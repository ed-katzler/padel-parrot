'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Calendar, MapPin, Users, Share2, UserPlus, UserMinus, Copy, ExternalLink, User, Edit3, Trash2 } from 'lucide-react'
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
        <div className="text-center">
          <h2 className="text-lg font-medium text-stone-900 mb-2">Match not found</h2>
          <p className="text-sm text-stone-500 mb-4">This match may have been deleted.</p>
          <button onClick={handleBack} className="btn-primary">
            Back to home
          </button>
        </div>
      </div>
    )
  }

  const availableSpots = getAvailableSpots(match.max_players, participants.length)
  const isFull = isMatchFull(match.max_players, participants.length)

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-stone-200 sticky top-0 z-10">
        <div className="container-app py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={handleBack}
                className="mr-3 p-1.5 -ml-1.5 rounded-md hover:bg-stone-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-stone-600" />
              </button>
              <h1 className="font-medium text-stone-900">
                Match Details
              </h1>
            </div>
            <div className="flex items-center gap-1.5">
              {match && currentUserId && match.creator_id === currentUserId && match.status === 'upcoming' && (
                <>
                  <button
                    onClick={handleEdit}
                    className="p-2 rounded-md hover:bg-stone-100 transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="w-4 h-4 text-stone-600" />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="p-2 rounded-md hover:bg-error-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-error-500" />
                  </button>
                </>
              )}
              <button
                onClick={handleShare}
                className="p-2 rounded-md hover:bg-stone-100 transition-colors"
                title="Share"
              >
                <Share2 className="w-4 h-4 text-stone-600" />
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
            <h2 className="text-xl font-semibold text-stone-900 pr-3">
              {match.title}
            </h2>
            <span className={`flex-shrink-0 ${isFull ? 'badge-error' : 'badge-success'}`}>
              {isFull ? 'Full' : `${availableSpots} left`}
            </span>
          </div>
          
          {match.description && (
            <p className="text-stone-600 text-sm mb-5">
              {match.description}
            </p>
          )}
          
          <div className="space-y-3">
            <div className="flex items-start">
              <Calendar className="w-4 h-4 text-stone-400 mr-3 mt-0.5" />
              <div>
                <p className="font-medium text-stone-900 text-sm">
                  {formatMatchDate(match.date_time)}
                </p>
                <p className="text-xs text-stone-500">
                  {formatMatchDateTime(match.date_time, match.duration_minutes)}
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <MapPin className="w-4 h-4 text-stone-400 mr-3 mt-0.5" />
              <p className="font-medium text-stone-900 text-sm">
                {match.location}
              </p>
            </div>
            
            {creator && (
              <div className="flex items-start">
                <User className="w-4 h-4 text-stone-400 mr-3 mt-0.5" />
                <p className="text-sm text-stone-600">
                  Created by {currentUserId === creator.id ? 'you' : (creator.name || creator.phone)}
                </p>
              </div>
            )}
            
            <div className="flex items-start">
              <Users className="w-4 h-4 text-stone-400 mr-3 mt-0.5" />
              <div>
                <p className="font-medium text-stone-900 text-sm">
                  {participants.length}/{match.max_players} players
                </p>
                <div className="flex mt-1.5 gap-0.5">
                  {Array.from({ length: match.max_players }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        i < participants.length ? 'bg-primary-500' : 'bg-stone-200'
                      }`}
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
            <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wide mb-3">
              Players ({participants.length})
            </h3>
            
            {isLoadingParticipants ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-stone-300 border-t-primary-600 mx-auto"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center py-1.5">
                    <div className="w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center mr-3">
                      <User className="w-4 h-4 text-stone-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-stone-900 text-sm truncate">
                        {currentUserId === participant.id ? 'You' : (participant.name || 'Player')}
                      </p>
                      <p className="text-xs text-stone-500 truncate">
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
              <div className="w-10 h-10 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-2">
                <Users className="w-5 h-5 text-success-600" />
              </div>
              <p className="font-medium text-stone-900 mb-1">You're in!</p>
              <p className="text-sm text-stone-500 mb-4">See you at the match</p>
              
              <button
                onClick={handleLeaveMatch}
                disabled={isLeaving}
                className="btn-danger w-full"
              >
                <UserMinus className="w-4 h-4 mr-2" />
                {isLeaving ? 'Leaving...' : 'Leave match'}
              </button>
            </div>
          ) : (
            <div className="text-center">
              {isFull ? (
                <>
                  <div className="w-10 h-10 bg-error-50 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Users className="w-5 h-5 text-error-500" />
                  </div>
                  <p className="font-medium text-stone-900 mb-1">Match is full</p>
                  <p className="text-sm text-stone-500">No spots available</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-stone-500 mb-3">
                    {availableSpots} {availableSpots === 1 ? 'spot' : 'spots'} remaining
                  </p>
                  <button
                    onClick={handleJoinMatch}
                    disabled={isJoining}
                    className="btn-primary w-full"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {isJoining ? 'Joining...' : 'Join match'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Share hint */}
        <div className="card bg-stone-100 border-stone-200">
          <div className="flex items-start">
            <Share2 className="w-4 h-4 text-stone-500 mr-3 mt-0.5" />
            <div>
              <p className="font-medium text-stone-700 text-sm">Share this match</p>
              <p className="text-xs text-stone-500">Send the link to friends</p>
            </div>
          </div>
        </div>
      </main>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-stone-900/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-lg max-w-sm w-full p-5 animate-scale-in">
            <h3 className="font-medium text-stone-900 mb-4">
              Share Match
            </h3>
            
            <div className="space-y-2">
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center py-2.5 px-4 border border-stone-200 rounded-md hover:bg-stone-50 transition-colors text-sm"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy link
              </button>
              
              <button
                onClick={handleShareWhatsApp}
                className="w-full flex items-center justify-center py-2.5 px-4 bg-[#25D366] text-white rounded-md hover:bg-[#20BD5A] transition-colors text-sm"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                WhatsApp
              </button>
            </div>
            
            <button
              onClick={() => setShowShareModal(false)}
              className="w-full mt-3 py-2 text-sm text-stone-500 hover:text-stone-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-stone-900/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-lg max-w-sm w-full p-5 animate-scale-in">
            <div className="flex items-start mb-4">
              <div className="w-10 h-10 bg-error-50 rounded-full flex items-center justify-center mr-3">
                <Trash2 className="w-5 h-5 text-error-500" />
              </div>
              <div>
                <h3 className="font-medium text-stone-900">Delete match?</h3>
                <p className="text-sm text-stone-500">This can't be undone</p>
              </div>
            </div>
            
            <p className="text-sm text-stone-600 mb-4">
              "{match?.title}" will be permanently deleted.
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 btn-secondary"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 btn-danger"
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
