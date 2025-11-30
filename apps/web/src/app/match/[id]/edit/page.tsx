'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { updateMatchSchema, type UpdateMatchInput } from '@padel-parrot/shared'
import { getMatch, updateMatch, getCurrentUser, getLocations } from '@padel-parrot/api-client'
import DatePicker from '@/components/DatePicker'
import TimePicker from '@/components/TimePicker'
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
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')

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
        
        setValue('title', data.title)
        setValue('description', data.description || '')
        
        // Parse date and time separately
        const date = new Date(data.date_time)
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        setSelectedDate(localDate.toISOString().slice(0, 10))
        setSelectedTime(localDate.toISOString().slice(11, 16))
        
        setValue('location', data.location)
        setValue('max_players', data.max_players)
        setValue('duration_minutes', data.duration_minutes)
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
      const updateData: UpdateMatchInput = {}
      
      if (data.title !== match.title) updateData.title = data.title
      if (data.description !== match.description) updateData.description = data.description
      
      if (selectedDate && selectedTime) {
        const newDateTime = new Date(combineDateAndTime(selectedDate, selectedTime)).toISOString()
        if (newDateTime !== match.date_time) updateData.date_time = newDateTime
      }
      
      if (data.location !== match.location) updateData.location = locationInput || data.location
      if (data.max_players !== match.max_players) updateData.max_players = data.max_players
      if (data.duration_minutes !== match.duration_minutes) updateData.duration_minutes = data.duration_minutes
      if (data.is_public !== match.is_public) updateData.is_public = data.is_public
      
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

  const handleLocationSelect = (location: Location) => {
    setLocationInput(location.name)
    setValue('location', location.name)
    setShowLocationDropdown(false)
  }

  const handleLocationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setLocationInput(value)
    setValue('location', value)
    
    if (value && locations.some(loc => loc.name.toLowerCase().includes(value.toLowerCase()))) {
      setShowLocationDropdown(true)
    } else {
      setShowLocationDropdown(false)
    }
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

  const filteredLocations = locations.filter(location =>
    location.name.toLowerCase().includes(locationInput.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-stone-300 border-t-stone-600 mx-auto mb-3"></div>
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
          <button onClick={handleBack} className="btn-primary">
            Back
          </button>
        </div>
      </div>
    )
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
              Edit Match
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
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Date
              </label>
              <DatePicker
                value={selectedDate}
                onChange={setSelectedDate}
                minDate={getMinDate()}
                maxDate={getMaxDate()}
                placeholder="Select date"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Time
              </label>
              <TimePicker
                value={selectedTime}
                onChange={setSelectedTime}
                placeholder="Select time"
              />
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
                  onFocus={() => filteredLocations.length > 0 && setShowLocationDropdown(true)}
                  className="input pr-10"
                  autoComplete="off"
                />
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-400" />
              </div>
              {errors.location && (
                <p className="text-error-600 text-xs mt-1">{errors.location.message}</p>
              )}
              
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
                {Array.from({ length: 19 }, (_, i) => i + 2).map((num) => (
                  <option 
                    key={num} 
                    value={num}
                    disabled={match && num < match.current_players}
                  >
                    {num} players {match && num < match.current_players ? '(below current)' : ''}
                  </option>
                ))}
              </select>
              {match && (
                <p className="text-xs text-stone-500 mt-1.5">
                  {match.current_players} players have joined
                </p>
              )}
            </div>
          </div>

          {/* Privacy */}
          <div className="card">
            <label className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                {...register('is_public')}
                className="mt-0.5 w-4 h-4 text-stone-900 bg-white border-stone-300 rounded focus:ring-stone-500 focus:ring-2"
              />
              <div className="ml-3">
                <span className="font-medium text-stone-900 text-sm">Public match</span>
                <p className="text-xs text-stone-500 mt-0.5">
                  Anyone can discover and join
                </p>
              </div>
            </label>
          </div>

          {/* Submit */}
          <div className="space-y-2">
            <button
              type="submit"
              disabled={isUpdating}
              className="btn-primary w-full py-3"
            >
              {isUpdating ? 'Saving...' : 'Save changes'}
            </button>
            
            <button
              type="button"
              onClick={handleBack}
              className="btn-secondary w-full"
            >
              Cancel
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
