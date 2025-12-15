'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, MapPin, Globe, Lock } from 'lucide-react'
import { updateMatchSchema, type UpdateMatchInput } from '@padel-parrot/shared'
import { getMatch, updateMatch, getCurrentUser, getClubs, type Club, type Match } from '@padel-parrot/api-client'
import DatePicker from '@/components/DatePicker'
import TimePicker from '@/components/TimePicker'
import ClubSelector from '@/components/ClubSelector'
import toast from 'react-hot-toast'

const DURATION_OPTIONS = [
  { value: 60, label: '1h' },
  { value: 90, label: '1.5h' },
  { value: 120, label: '2h' },
]

export default function EditMatchPage({ params }: { params: { id: string } }) {
  const [match, setMatch] = useState<Match | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [clubs, setClubs] = useState<Club[]>([])
  const [locationInput, setLocationInput] = useState('')
  const [selectedClubId, setSelectedClubId] = useState<string | undefined>(undefined)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [selectedDuration, setSelectedDuration] = useState(90)
  const [selectedPlayers, setSelectedPlayers] = useState(4)
  const [isPublic, setIsPublic] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<UpdateMatchInput>({
    resolver: zodResolver(updateMatchSchema)
  })

  useEffect(() => {
    loadCurrentUser()
    loadClubs()
  }, [])

  useEffect(() => {
    if (currentUserId) {
      loadMatch()
    }
  }, [currentUserId, params.id])

  const loadCurrentUser = async () => {
    try {
      const { data: user, error } = await getCurrentUser()
      if (user && !error) {
        setCurrentUserId(user.id)
      } else {
        toast.error('Please sign in')
        window.location.href = '/'
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
        window.location.href = '/'
        return
      }
      
      if (data) {
        setMatch(data)
        
        if (currentUserId && data.creator_id !== currentUserId) {
          toast.error('Only the creator can edit')
          window.location.href = `/match/${params.id}`
          return
        }
        
        if (data.status !== 'upcoming') {
          toast.error('Can only edit upcoming matches')
          window.location.href = `/match/${params.id}`
          return
        }
        
        setValue('description', data.description || '')
        
        // Parse date and time separately
        const date = new Date(data.date_time)
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        setSelectedDate(localDate.toISOString().slice(0, 10))
        setSelectedTime(localDate.toISOString().slice(11, 16))
        
        setLocationInput(data.location)
        setSelectedClubId(data.club_id || undefined)
        setSelectedDuration(data.duration_minutes)
        setSelectedPlayers(data.max_players)
        setIsPublic(data.is_public)
      }
    } catch (error) {
      toast.error('Failed to load match')
      window.location.href = '/'
    } finally {
      setIsLoading(false)
    }
  }

  const loadClubs = async () => {
    try {
      const { data, error } = await getClubs()
      if (!error && data) {
        setClubs(data)
      }
    } catch (error) {
      console.error('Failed to load clubs:', error)
    }
  }

  const onSubmit = async (data: UpdateMatchInput) => {
    if (!match) return
    
    setIsUpdating(true)
    
    try {
      const updateData: UpdateMatchInput = {}
      
      if (data.description !== match.description) updateData.description = data.description
      
      if (selectedDate && selectedTime) {
        const newDateTime = new Date(combineDateAndTime(selectedDate, selectedTime)).toISOString()
        if (newDateTime !== match.date_time) updateData.date_time = newDateTime
      }
      
      if (locationInput !== match.location) updateData.location = locationInput
      // Update club_id if it changed (could be a new club, different club, or null)
      if (selectedClubId !== (match.club_id || undefined)) {
        updateData.club_id = selectedClubId || null
      }
      if (selectedPlayers !== match.max_players) updateData.max_players = selectedPlayers
      if (selectedDuration !== match.duration_minutes) updateData.duration_minutes = selectedDuration
      if (isPublic !== match.is_public) updateData.is_public = isPublic
      
      if (Object.keys(updateData).length === 0) {
        toast.success('No changes')
        window.location.href = `/match/${match.id}`
        return
      }
      
      const { data: updatedMatch, error } = await updateMatch(match.id, updateData)
      
      if (error) {
        toast.error(error)
        return
      }
      
      if (updatedMatch) {
        toast.success('Saved!')
        setTimeout(() => {
          window.location.href = `/match/${match.id}`
        }, 500)
      }
      
    } catch (error) {
      toast.error('Failed to update')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleBack = () => {
    window.location.href = `/match/${params.id}`
  }

  const handleClubChange = (value: string, clubId?: string) => {
    setLocationInput(value)
    setSelectedClubId(clubId)
  }

  const getMinDate = () => {
    const now = new Date()
    return now.toISOString().slice(0, 10)
  }

  const getMaxDate = () => {
    const future = new Date()
    future.setFullYear(future.getFullYear() + 1)
    return future.toISOString().slice(0, 10)
  }

  const combineDateAndTime = (date: string, time: string) => {
    if (!date || !time) return ''
    return `${date}T${time}`
  }

  // Get valid player options (can't go below current players)
  const getPlayerOptions = () => {
    const minPlayers = match ? match.current_players : 2
    return [2, 4, 6, 8].filter(n => n >= minPlayers)
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
          <button onClick={handleBack} className="btn btn-primary">
            Back
          </button>
        </div>
      </div>
    )
  }

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
              Edit Match
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-app py-6 pb-32">
        <form id="edit-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Card 1: Match Details */}
          <div className="card">
            <h2 className="section-header">Match Details</h2>
            
            {/* Description */}
            <div className="form-field">
              <label htmlFor="description" className="form-label">
                What's the match for? <span style={{ color: 'rgb(var(--color-text-subtle))', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                type="text"
                id="description"
                {...register('description')}
                placeholder="e.g. Training with the lads"
                maxLength={50}
                className="input"
              />
            </div>

            {/* Players */}
            <div className="form-field">
              <label className="form-label">
                Players
                {match && match.current_players > 0 && (
                  <span style={{ color: 'rgb(var(--color-text-subtle))', fontWeight: 400 }}>
                    {' '}({match.current_players} joined)
                  </span>
                )}
              </label>
              <div className="option-buttons">
                {getPlayerOptions().map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setSelectedPlayers(count)}
                    className={`option-btn ${selectedPlayers === count ? 'active' : ''}`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {/* Public Toggle */}
            <div className="form-field">
              <div className="toggle-container">
                <div className="flex items-center gap-3">
                  {isPublic ? (
                    <Globe className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
                  ) : (
                    <Lock className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
                  )}
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                      {isPublic ? 'Public match' : 'Private match'}
                    </p>
                    <p className="text-xs" style={{ color: 'rgb(var(--color-text-subtle))' }}>
                      {isPublic ? 'Anyone can discover and join' : 'Only people with the link can join'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPublic(!isPublic)}
                  className={`toggle-switch ${isPublic ? 'active' : ''}`}
                  aria-pressed={isPublic}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Schedule & Location */}
          <div className="card">
            <h2 className="section-header">Schedule & Location</h2>
            
            {/* Date & Time - Side by side */}
            <div className="form-field">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Date</label>
                  <DatePicker
                    value={selectedDate}
                    onChange={setSelectedDate}
                    minDate={getMinDate()}
                    maxDate={getMaxDate()}
                    placeholder="Select date"
                  />
                </div>
                <div>
                  <label className="form-label">Time</label>
                  <TimePicker
                    value={selectedTime}
                    onChange={setSelectedTime}
                    placeholder="Select time"
                  />
                </div>
              </div>
            </div>

            {/* Duration - Segmented Control */}
            <div className="form-field">
              <label className="form-label">Duration</label>
              <div className="segmented-control">
                {DURATION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedDuration(option.value)}
                    className={selectedDuration === option.value ? 'active' : ''}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="form-field">
              <label className="form-label">
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location
                </span>
              </label>
              <ClubSelector
                value={locationInput}
                onChange={handleClubChange}
                clubs={clubs}
                placeholder="Search clubs or enter location"
                error={errors.location?.message}
                allowCustom={true}
              />
            </div>
          </div>
        </form>
      </main>

      {/* Sticky Submit Buttons */}
      <div 
        className="fixed bottom-0 left-0 right-0 p-4 backdrop-blur-sm"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface) / 0.9)',
          borderTop: '1px solid rgb(var(--color-border-light))'
        }}
      >
        <div className="container-app space-y-2">
          <button
            type="submit"
            onClick={handleSubmit(onSubmit)}
            disabled={isUpdating}
            className="btn btn-primary w-full"
            style={{ padding: 'var(--space-4)' }}
          >
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={handleBack}
            className="btn btn-secondary w-full"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
