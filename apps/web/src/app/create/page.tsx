'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createMatchSchema, type CreateMatchInput } from '@padel-parrot/shared'
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
  } = useForm<CreateMatchInput>({
    resolver: zodResolver(createMatchSchema),
    defaultValues: {
      max_players: 4,
    },
  })

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
      const { data: user, error: authError } = await getCurrentUser()
      if (authError || !user) {
        toast.error('Please sign in to create a match')
        window.location.href = '/'
        return
      }

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
        toast.success('Match created!')
        setTimeout(() => {
          window.location.href = `/match/${match.id}`
        }, 500)
      }
      
    } catch (error) {
      toast.error('Failed to create match')
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

  const getMinDateTime = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 30)
    return now.toISOString().slice(0, 16)
  }

  const getMaxDateTime = () => {
    const future = new Date()
    future.setDate(future.getDate() + 30)
    return future.toISOString().slice(0, 16)
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-stone-200 sticky top-0 z-10">
        <div className="container-app py-3">
          <div className="flex items-center">
            <button
              onClick={handleBack}
              className="mr-3 p-1.5 -ml-1.5 rounded-md hover:bg-stone-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-stone-600" />
            </button>
            <h1 className="font-medium text-stone-900">
              Create Match
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-app py-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Title & Description */}
          <div className="card space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-stone-700 mb-1.5">
                Match title
              </label>
              <input
                id="title"
                type="text"
                {...register('title')}
                placeholder="e.g., Evening Padel Session"
                className="input"
              />
              {errors.title && (
                <p className="text-error-600 text-xs mt-1">{errors.title.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-stone-700 mb-1.5">
                Description <span className="text-stone-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="description"
                {...register('description')}
                placeholder="Any additional details..."
                rows={2}
                className="input resize-none"
              />
            </div>
          </div>

          {/* Date & Time */}
          <div className="card space-y-4">
            <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide">
              When
            </h2>
            
            <div>
              <label htmlFor="date_time" className="block text-sm font-medium text-stone-700 mb-1.5">
                Date & time
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
                <p className="text-error-600 text-xs mt-1">{errors.date_time.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="duration_minutes" className="block text-sm font-medium text-stone-700 mb-1.5">
                Duration
              </label>
              <select
                id="duration_minutes"
                {...register('duration_minutes', { valueAsNumber: true })}
                className="input"
              >
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
          </div>

          {/* Location */}
          <div className="card">
            <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide mb-4">
              Where
            </h2>
            
            <div className="relative">
              <label htmlFor="location" className="block text-sm font-medium text-stone-700 mb-1.5">
                Location
              </label>
              <div className="relative">
                <input
                  id="location"
                  type="text"
                  value={locationInput}
                  onChange={handleLocationInputChange}
                  onFocus={() => setShowLocationDropdown(true)}
                  placeholder="Search or enter location"
                  className="input pr-10"
                  autoComplete="off"
                />
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-400" />
              </div>
              
              {showLocationDropdown && filteredLocations.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-stone-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredLocations.map((location) => (
                    <button
                      key={location.id}
                      type="button"
                      onClick={() => handleLocationSelect(location)}
                      className="w-full px-3 py-2.5 text-left hover:bg-stone-50 border-b border-stone-100 last:border-b-0 transition-colors"
                    >
                      <div className="font-medium text-stone-900 text-sm">{location.name}</div>
                      {location.address && (
                        <div className="text-xs text-stone-500">{location.address}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
              
              {isCustomLocation && locationInput && (
                <p className="text-xs text-stone-500 mt-1.5">
                  Custom location: "{locationInput}"
                </p>
              )}
              
              {errors.location && (
                <p className="text-error-600 text-xs mt-1">{errors.location.message}</p>
              )}
            </div>
          </div>

          {/* Players */}
          <div className="card">
            <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide mb-4">
              Players
            </h2>
            
            <div>
              <label htmlFor="max_players" className="block text-sm font-medium text-stone-700 mb-1.5">
                Maximum players
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
            </div>
          </div>

          {/* Privacy */}
          <div className="card">
            <label className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                {...register('is_public')}
                className="mt-0.5 w-4 h-4 text-primary-600 bg-white border-stone-300 rounded focus:ring-primary-500 focus:ring-2"
              />
              <div className="ml-3">
                <span className="font-medium text-stone-900 text-sm">Public match</span>
                <p className="text-xs text-stone-500 mt-0.5">
                  Anyone can discover and join this match
                </p>
              </div>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full py-3"
          >
            {isLoading ? 'Creating...' : 'Create match'}
          </button>
        </form>
      </main>
    </div>
  )
}
