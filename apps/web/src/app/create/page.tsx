'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Calendar, MapPin, Users, Clock, ChevronDown } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createMatchSchema, type CreateMatchInput, formatDuration } from '@padel-parrot/shared'
import { createMatch, getCurrentUser, getLocations, type Location } from '@padel-parrot/api-client'
import toast from 'react-hot-toast'

export default function CreateMatchPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([])
  const [showLocationDropdown, setShowLocationDropdown] = useState(false)
  const [locationInput, setLocationInput] = useState('')
  const [isCustomLocation, setIsCustomLocation] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateMatchInput>({
    resolver: zodResolver(createMatchSchema),
    defaultValues: {
      max_players: 4,
    },
  })

  // Load locations on component mount
  useEffect(() => {
    const loadLocations = async () => {
      const { data, error } = await getLocations()
      if (data && !error) {
        setLocations(data)
        setFilteredLocations(data)
      }
    }
    loadLocations()
  }, [])

  // Filter locations based on input
  useEffect(() => {
    if (locationInput) {
      const filtered = locations.filter(location =>
        location.name.toLowerCase().includes(locationInput.toLowerCase()) ||
        (location.address && location.address.toLowerCase().includes(locationInput.toLowerCase()))
      )
      setFilteredLocations(filtered)
      setShowLocationDropdown(true)
      setIsCustomLocation(filtered.length === 0)
    } else {
      setFilteredLocations(locations)
      setShowLocationDropdown(false)
      setIsCustomLocation(false)
    }
  }, [locationInput, locations])

  const onSubmit = async (data: CreateMatchInput) => {
    setIsLoading(true)
    
    try {
      // Check if user is authenticated
      const { data: user, error: authError } = await getCurrentUser()
      if (authError || !user) {
        toast.error('Please sign in to create a match')
        window.location.href = '/'
        return
      }

      // Create the match
      // Convert datetime-local format to ISO string
      const dateTime = new Date(data.date_time).toISOString()
      
      const { data: match, error } = await createMatch({
        title: data.title,
        description: data.description,
        date_time: dateTime,
        duration_minutes: data.duration_minutes,
        location: locationInput || data.location,
        max_players: data.max_players,
        is_public: data.is_public || false,
      })
      
      if (error) {
        toast.error(error)
        return
      }
      
      if (match) {
        toast.success('Match created successfully!')
        
        // Navigate to the new match details page
        setTimeout(() => {
          window.location.href = `/match/${match.id}`
        }, 1000)
      }
      
    } catch (error) {
      toast.error('Failed to create match. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    window.location.href = '/'
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
              Create Match
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
                <Clock className="w-4 h-4 text-primary-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                When
              </h2>
            </div>
            
            <div className="space-y-4">
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
                <p className="text-xs text-gray-500 mt-1">
                  Select date and time (must be at least 30 minutes from now)
                </p>
              </div>

              <div>
                <label htmlFor="duration_minutes" className="block text-sm font-medium text-gray-700 mb-2">
                  Duration
                </label>
                <select
                  id="duration_minutes"
                  {...register('duration_minutes', { valueAsNumber: true })}
                  className="input"
                >
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours (recommended)</option>
                  <option value={120}>2 hours</option>
                </select>
                {errors.duration_minutes && (
                  <p className="text-error-600 text-sm mt-1">{errors.duration_minutes.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  How long will the match last?
                </p>
              </div>
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
              <div className="relative">
                <input
                  id="location"
                  type="text"
                  value={locationInput}
                  onChange={handleLocationInputChange}
                  onFocus={() => setShowLocationDropdown(true)}
                  placeholder="Start typing to search locations or enter custom location"
                  className="input pr-10"
                  autoComplete="off"
                />
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
              
              {/* Location Dropdown */}
              {showLocationDropdown && filteredLocations.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredLocations.map((location) => (
                    <button
                      key={location.id}
                      type="button"
                      onClick={() => handleLocationSelect(location)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">{location.name}</div>
                      {location.address && (
                        <div className="text-sm text-gray-500">{location.address}</div>
                      )}
                      {location.description && (
                        <div className="text-xs text-gray-400 mt-1">{location.description}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
              
              {/* Custom Location Indicator */}
              {isCustomLocation && locationInput && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    📍 Custom location: "{locationInput}" will be used
                  </p>
                </div>
              )}
              
              {errors.location && (
                <p className="text-error-600 text-sm mt-1">{errors.location.message}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Search from our venues or enter a custom location
              </p>
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
                Maximum Players *
              </label>
              <select
                id="max_players"
                {...register('max_players', { valueAsNumber: true })}
                className="input"
              >
                <option value={2}>2 players</option>
                <option value={4}>4 players</option>
                <option value={6}>6 players</option>
                <option value={8}>8 players</option>
              </select>
              {errors.max_players && (
                <p className="text-error-600 text-sm mt-1">{errors.max_players.message}</p>
              )}
            </div>
          </div>

          {/* Privacy Settings */}
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
              
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Privacy explained:</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• <strong>Private (default):</strong> Only you and participants can see this match</li>
                  <li>• <strong>Public:</strong> Anyone can discover and join this match</li>
                  <li>• <strong>Share links:</strong> Work for both public and private matches</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="card">
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 text-base"
            >
              {isLoading ? 'Creating Match...' : 'Create Match'}
            </button>
            
            <p className="text-sm text-gray-500 text-center mt-3">
              You'll be able to share the match link once it's created
            </p>
          </div>
        </form>
      </main>
    </div>
  )
} 