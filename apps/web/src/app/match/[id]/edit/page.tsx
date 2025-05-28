'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Calendar, MapPin, Users, User as UserIcon } from 'lucide-react'
import { updateMatchSchema, type UpdateMatchInput } from '@padel-parrot/shared'
import { getMatch, updateMatch, getCurrentUser, getLocations } from '@padel-parrot/api-client'
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
  is_public: boolean
  created_at: string
  updated_at: string
}

interface Location {
  id: string
  name: string
  address?: string
  description?: string
  created_at: string
  updated_at: string
}

export default function EditMatchPage({ params }: { params: { id: string } }) {
  const [match, setMatch] = useState<Match | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [locationInput, setLocationInput] = useState('')
  const [showLocationDropdown, setShowLocationDropdown] = useState(false)
  const [isCustomLocation, setIsCustomLocation] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<UpdateMatchInput>({
    resolver: zodResolver(updateMatchSchema)
  })

  useEffect(() => {
    loadCurrentUser()
    loadLocations()
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
        toast.error('Please sign in to edit matches')
        window.location.href = '/'
      }
    } catch (error) {
      toast.error('Authentication failed')
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
        
        // Check if current user is the creator
        if (currentUserId && data.creator_id !== currentUserId) {
          toast.error('Only the match creator can edit this match')
          window.location.href = `/match/${params.id}`
          return
        }
        
        // Check if match is editable (upcoming status)
        if (data.status !== 'upcoming') {
          toast.error('Can only edit upcoming matches')
          window.location.href = `/match/${params.id}`
          return
        }
        
        // Pre-fill the form with current match data
        setValue('title', data.title)
        setValue('description', data.description || '')
        
        // Convert ISO string to datetime-local format
        const date = new Date(data.date_time)
        const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16)
        setValue('date_time', localDateTime)
        
        setValue('location', data.location)
        setValue('max_players', data.max_players)
        setValue('is_public', data.is_public)
        
        setLocationInput(data.location)
      }
    } catch (error) {
      toast.error('Failed to load match')
      window.location.href = '/'
    } finally {
      setIsLoading(false)
    }
  }

  const loadLocations = async () => {
    try {
      const { data, error } = await getLocations()
      if (!error && data) {
        setLocations(data)
      }
    } catch (error) {
      console.error('Failed to load locations:', error)
    }
  }

  const onSubmit = async (data: UpdateMatchInput) => {
    if (!match) return
    
    setIsUpdating(true)
    
    try {
      // Only include fields that have actually changed
      const updateData: UpdateMatchInput = {}
      
      if (data.title !== match.title) {
        updateData.title = data.title
      }
      
      if (data.description !== match.description) {
        updateData.description = data.description
      }
      
      if (data.date_time) {
        const newDateTime = new Date(data.date_time).toISOString()
        if (newDateTime !== match.date_time) {
          updateData.date_time = newDateTime
        }
      }
      
      if (data.location !== match.location) {
        updateData.location = locationInput || data.location
      }
      
      if (data.max_players !== match.max_players) {
        updateData.max_players = data.max_players
      }
      
      if (data.is_public !== match.is_public) {
        updateData.is_public = data.is_public
      }
      
      // If no fields changed, show message and return
      if (Object.keys(updateData).length === 0) {
        toast.success('No changes to save')
        window.location.href = `/match/${match.id}`
        return
      }
      
      const { data: updatedMatch, error } = await updateMatch(match.id, updateData)
      
      if (error) {
        toast.error(error)
        return
      }
      
      if (updatedMatch) {
        toast.success('Match updated successfully!')
        
        // Navigate back to the match details page
        setTimeout(() => {
          window.location.href = `/match/${match.id}`
        }, 1000)
      }
      
    } catch (error) {
      toast.error('Failed to update match. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleBack = () => {
    window.location.href = `/match/${params.id}`
  }

  const handleLocationSelect = (location: Location) => {
    setLocationInput(location.name)
    setValue('location', location.name)
    setShowLocationDropdown(false)
    setIsCustomLocation(false)
  }

  const handleLocationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setLocationInput(value)
    setValue('location', value)
    
    // Show dropdown when typing and there are matching locations
    if (value && locations.some(loc => loc.name.toLowerCase().includes(value.toLowerCase()))) {
      setShowLocationDropdown(true)
    } else {
      setShowLocationDropdown(false)
    }
  }

  // Get current date/time for min attribute (30 minutes from now)
  const getMinDateTime = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 30) // At least 30 minutes in the future
    return now.toISOString().slice(0, 16) // Format for datetime-local input
  }

  // Get max date (30 days from now)
  const getMaxDateTime = () => {
    const future = new Date()
    future.setDate(future.getDate() + 30)
    return future.toISOString().slice(0, 16)
  }

  const filteredLocations = locations.filter(location =>
    location.name.toLowerCase().includes(locationInput.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading match...</p>
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
            Back to Match
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container-app py-4">
          <div className="flex items-center">
            <button
              onClick={handleBack}
              className="mr-4 p-2 -ml-2 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              Edit Match
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-app py-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Match Title */}
          <div className="card">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                <Calendar className="w-4 h-4 text-primary-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                Match Details
              </h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Match Title *
                </label>
                <input
                  id="title"
                  type="text"
                  {...register('title')}
                  placeholder="e.g., Evening Padel Session"
                  className="input"
                />
                {errors.title && (
                  <p className="text-error-600 text-sm mt-1">{errors.title.message}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  {...register('description')}
                  placeholder="Add any additional details about the match..."
                  rows={3}
                  className="input resize-none"
                />
                {errors.description && (
                  <p className="text-error-600 text-sm mt-1">{errors.description.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="card">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                <Calendar className="w-4 h-4 text-primary-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                When
              </h2>
            </div>
            
            <div>
              <label htmlFor="date_time" className="block text-sm font-medium text-gray-700 mb-2">
                Date & Time *
              </label>
              <input
                id="date_time"
                type="datetime-local"
                {...register('date_time')}
                min={getMinDateTime()}
                max={getMaxDateTime()}
                className="input"
              />
              {errors.date_time && (
                <p className="text-error-600 text-sm mt-1">{errors.date_time.message}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                Must be at least 30 minutes in the future
              </p>
            </div>
          </div>

          {/* Location */}
          <div className="card">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                <MapPin className="w-4 h-4 text-primary-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                Where
              </h2>
            </div>
            
            <div className="relative">
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <input
                id="location"
                type="text"
                value={locationInput}
                onChange={handleLocationInputChange}
                onFocus={() => filteredLocations.length > 0 && setShowLocationDropdown(true)}
                placeholder="Enter or select a location"
                className="input"
                autoComplete="off"
              />
              {errors.location && (
                <p className="text-error-600 text-sm mt-1">{errors.location.message}</p>
              )}
              
              {/* Location Dropdown */}
              {showLocationDropdown && filteredLocations.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredLocations.map((location) => (
                    <button
                      key={location.id}
                      type="button"
                      onClick={() => handleLocationSelect(location)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                    >
                      <div className="font-medium text-gray-900">{location.name}</div>
                      {location.address && (
                        <div className="text-sm text-gray-600">{location.address}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Players */}
          <div className="card">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                <Users className="w-4 h-4 text-primary-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                Players
              </h2>
            </div>
            
            <div>
              <label htmlFor="max_players" className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Players
              </label>
              <select
                id="max_players"
                {...register('max_players', { valueAsNumber: true })}
                className="input"
              >
                {Array.from({ length: 19 }, (_, i) => i + 2).map((num) => (
                  <option 
                    key={num} 
                    value={num}
                    disabled={match && num < match.current_players}
                  >
                    {num} players {match && num < match.current_players ? '(below current players)' : ''}
                  </option>
                ))}
              </select>
              {errors.max_players && (
                <p className="text-error-600 text-sm mt-1">{errors.max_players.message}</p>
              )}
              {match && (
                <p className="text-sm text-gray-500 mt-1">
                  Currently {match.current_players} players have joined
                </p>
              )}
            </div>
          </div>

          {/* Privacy */}
          <div className="card">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                <Users className="w-4 h-4 text-primary-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                Privacy
              </h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="is_public"
                    type="checkbox"
                    {...register('is_public')}
                    className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                  />
                </div>
                <div className="ml-3">
                  <label htmlFor="is_public" className="font-medium text-gray-900">
                    Make this match public
                  </label>
                  <p className="text-sm text-gray-600 mt-1">
                    Public matches are visible to all users. Private matches are only visible to you and participants.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="card">
            <button
              type="submit"
              disabled={isUpdating}
              className="btn-primary w-full py-3 text-base"
            >
              {isUpdating ? 'Updating Match...' : 'Update Match'}
            </button>
            
            <button
              type="button"
              onClick={handleBack}
              className="w-full mt-3 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </form>
      </main>
    </div>
  )
} 