'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Calendar, MapPin, Users, Share2, Clock, UserPlus, UserMinus, Copy, ExternalLink } from 'lucide-react'
import { formatMatchDate, formatMatchTime, getAvailableSpots, isMatchFull } from '@padel-parrot/shared'
import { getMatch, joinMatch, leaveMatch, getCurrentUser } from '@padel-parrot/api-client'
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

export default function MatchDetailsClient({ params }: { params: { id: string } }) {
  const [match, setMatch] = useState<Match | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [hasJoined, setHasJoined] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    loadMatch()
    loadCurrentUser()
  }, [params.id])

  const loadCurrentUser = async () => {
    try {
      const { data: user, error } = await getCurrentUser()
      if (user && !error) {
        setCurrentUserId(user.id)
      }
    } catch (error) {
      // User not authenticated, redirect to home
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
        // In a real app, check if current user is in participants
        setHasJoined(Math.random() > 0.5) // Mock for now
      }
    } catch (error) {
      toast.error('Failed to load match details')
    } finally {
      setIsLoading(false)
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
      
      toast.success('Successfully joined the match!')
      setHasJoined(true)
      // Refresh match data
      loadMatch()
    } catch (error) {
      toast.error('Failed to join match')
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
      
      toast.success('Successfully left the match')
      setHasJoined(false)
      // Refresh match data
      loadMatch()
    } catch (error) {
      toast.error('Failed to leave match')
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
      toast.success('Link copied to clipboard!')
      setShowShareModal(false)
    } catch (error) {
      toast.error('Failed to copy link')
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
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Match not found</h2>
          <p className="text-gray-600 mb-4">This match may have been deleted or the link is invalid.</p>
          <button onClick={handleBack} className="btn-primary">
            Back to Home
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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container-app py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={handleBack}
                className="mr-4 p-2 -ml-2 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">
                Match Details
              </h1>
            </div>
            <button
              onClick={handleShare}
              className="btn-secondary"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-app py-6">
        <div className="space-y-6">
          {/* Match Info */}
          <div className="card">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
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
              <p className="text-gray-600 mb-6">
                {match.description}
              </p>
            )}
            
            <div className="space-y-4">
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-gray-400 mr-3" />
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
                <MapPin className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">
                    {match.location}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center">
                <Users className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">
                    {match.current_players}/{match.max_players} players
                  </p>
                  <div className="flex mt-1">
                    {Array.from({ length: match.max_players }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-3 h-3 rounded-full mr-1 ${
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

          {/* Action Buttons */}
          <div className="card">
            {hasJoined ? (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6 text-success-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    You're in!
                  </h3>
                  <p className="text-gray-600">
                    See you at the match
                  </p>
                </div>
                
                <button
                  onClick={handleLeaveMatch}
                  disabled={isLeaving}
                  className="btn-danger w-full"
                >
                  <UserMinus className="w-4 h-4 mr-2" />
                  {isLeaving ? 'Leaving...' : 'Leave Match'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {isFull ? (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 bg-error-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6 text-error-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      Match is Full
                    </h3>
                    <p className="text-gray-600">
                      This match has reached maximum capacity
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="text-center py-2">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        Join this match
                      </h3>
                      <p className="text-gray-600">
                        {availableSpots} {availableSpots === 1 ? 'spot' : 'spots'} remaining
                      </p>
                    </div>
                    
                    <button
                      onClick={handleJoinMatch}
                      disabled={isJoining}
                      className="btn-primary w-full py-3 text-base"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      {isJoining ? 'Joining...' : 'Join Match'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Share Link Info */}
          <div className="card bg-primary-50 border-primary-200">
            <div className="flex items-start">
              <Share2 className="w-5 h-5 text-primary-600 mr-3 mt-0.5" />
              <div>
                <h3 className="font-semibold text-primary-900 mb-1">
                  Share this match
                </h3>
                <p className="text-sm text-primary-700">
                  Send the link to friends so they can join directly
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Share Match
            </h3>
            
            <div className="space-y-3">
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </button>
              
              <button
                onClick={handleShareWhatsApp}
                className="w-full flex items-center justify-center py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Share on WhatsApp
              </button>
            </div>
            
            <button
              onClick={() => setShowShareModal(false)}
              className="w-full mt-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
} 