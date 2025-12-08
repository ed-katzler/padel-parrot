'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, ChevronDown, MapPin, Globe, Lock, Repeat } from 'lucide-react'
import { createMatch, getCurrentUser, getLocations, type Location, type RecurrenceType } from '@padel-parrot/api-client'
import DatePicker from '@/components/DatePicker'
import TimePicker from '@/components/TimePicker'
import toast from 'react-hot-toast'

const DURATION_OPTIONS = [
  { value: 60, label: '1h' },
  { value: 90, label: '1.5h' },
  { value: 120, label: '2h' },
]

const PLAYER_OPTIONS = [2, 4, 6, 8]

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: 'none', label: 'One-time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
]

export default function CreateMatchPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([])
  const [showLocationDropdown, setShowLocationDropdown] = useState(false)
  
  // Form state
  const [description, setDescription] = useState('')
  const [locationInput, setLocationInput] = useState('')
  const [isCustomLocation, setIsCustomLocation] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [selectedDuration, setSelectedDuration] = useState(90)
  const [selectedPlayers, setSelectedPlayers] = useState(4)
  const [isPublic, setIsPublic] = useState(false)
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('none')
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')
  
  // Validation errors
  const [errors, setErrors] = useState<{ location?: string; datetime?: string }>({})

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

  const validateForm = (): boolean => {
    const newErrors: { location?: string; datetime?: string } = {}
    
    if (!locationInput.trim()) {
      newErrors.location = 'Location is required'
    }
    
    if (!selectedDate || !selectedTime) {
      newErrors.datetime = 'Please select date and time'
    } else {
      const dateTime = new Date(`${selectedDate}T${selectedTime}`)
      const now = new Date()
      const minTime = new Date(now.getTime() + 30 * 60 * 1000)
      if (dateTime < minTime) {
        newErrors.datetime = 'Match must be at least 30 minutes in the future'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    
    try {
      const { data: user, error: authError } = await getCurrentUser()
      if (authError || !user) {
        toast.error('Please sign in to create a match')
        window.location.href = '/'
        return
      }

      const dateTime = new Date(`${selectedDate}T${selectedTime}`).toISOString()
      
      console.log('Creating match with:', {
        description,
        date_time: dateTime,
        duration_minutes: selectedDuration,
        location: locationInput,
        max_players: selectedPlayers,
        is_public: isPublic,
        recurrence_type: recurrenceType,
        recurrence_end_date: recurrenceEndDate || undefined,
      })
      
      const { data: match, error } = await createMatch({
        description: description.trim() || undefined,
        date_time: dateTime,
        duration_minutes: selectedDuration,
        location: locationInput.trim(),
        max_players: selectedPlayers,
        is_public: isPublic,
        recurrence_type: recurrenceType,
        recurrence_end_date: recurrenceEndDate ? new Date(recurrenceEndDate).toISOString() : undefined,
      })
      
      if (error) {
        console.error('Create match error:', error)
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
      console.error('Create match exception:', error)
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
    setShowLocationDropdown(false)
    setIsCustomLocation(false)
    setErrors(prev => ({ ...prev, location: undefined }))
  }

  const handleLocationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocationInput(e.target.value)
    setErrors(prev => ({ ...prev, location: undefined }))
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
              Create Match
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-app py-6 pb-32">
        <form id="create-form" onSubmit={handleSubmit} className="space-y-6">
          
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
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Training with the lads"
                maxLength={50}
                className="input"
              />
              <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-subtle))' }}>
                {description ? `Will show as "${selectedDate ? 'Date' : 'Tomorrow'} - ${description}"` : 'Leave empty to just show the date'}
              </p>
            </div>

            {/* Players */}
            <div className="form-field">
              <label className="form-label">Players</label>
              <div className="option-buttons">
                {PLAYER_OPTIONS.map((count) => (
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

            {/* Recurrence */}
            <div className="form-field">
              <label className="form-label">
                <span className="flex items-center gap-2">
                  <Repeat className="w-4 h-4" />
                  Repeat
                </span>
              </label>
              <div className="segmented-control">
                {RECURRENCE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRecurrenceType(option.value)}
                    className={recurrenceType === option.value ? 'active' : ''}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {recurrenceType !== 'none' && (
                <div className="mt-3">
                  <label className="form-label text-xs">
                    End repeat <span style={{ color: 'rgb(var(--color-text-subtle))', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <DatePicker
                    value={recurrenceEndDate}
                    onChange={setRecurrenceEndDate}
                    minDate={selectedDate || getMinDate()}
                    maxDate={getMaxDate()}
                    placeholder="Repeats indefinitely"
                  />
                  <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-subtle))' }}>
                    {recurrenceType === 'weekly' ? 'A new match will be created every week' : 'A new match will be created every 2 weeks'}
                  </p>
                </div>
              )}
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
                    onChange={(date) => {
                      setSelectedDate(date)
                      setErrors(prev => ({ ...prev, datetime: undefined }))
                    }}
                    minDate={getMinDate()}
                    maxDate={getMaxDate()}
                    placeholder="Select date"
                  />
                </div>
                <div>
                  <label className="form-label">Time</label>
                  <TimePicker
                    value={selectedTime}
                    onChange={(time) => {
                      setSelectedTime(time)
                      setErrors(prev => ({ ...prev, datetime: undefined }))
                    }}
                    placeholder="Select time"
                  />
                </div>
              </div>
              {errors.datetime && (
                <p className="form-error">{errors.datetime}</p>
              )}
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
              <label htmlFor="location" className="form-label">
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location
                </span>
              </label>
              <div className="relative">
                <input
                  id="location"
                  type="text"
                  value={locationInput}
                  onChange={handleLocationInputChange}
                  onFocus={() => setShowLocationDropdown(true)}
                  placeholder="Search or enter location"
                  className="input"
                  style={{ paddingRight: '2.5rem' }}
                  autoComplete="off"
                />
                <ChevronDown 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: 'rgb(var(--color-text-subtle))' }}
                />
                
                {showLocationDropdown && filteredLocations.length > 0 && (
                  <div 
                    className="absolute z-20 w-full mt-1 rounded-lg overflow-hidden"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-surface))',
                      border: '1px solid rgb(var(--color-border-light))',
                      boxShadow: 'var(--shadow-md)',
                      maxHeight: '12rem',
                      overflowY: 'auto'
                    }}
                  >
                    {filteredLocations.map((location) => (
                      <button
                        key={location.id}
                        type="button"
                        onClick={() => handleLocationSelect(location)}
                        className="w-full px-4 py-3 text-left transition-colors"
                        style={{ 
                          borderBottom: '1px solid rgb(var(--color-border-light))'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--color-interactive-muted))'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                          {location.name}
                        </div>
                        {location.address && (
                          <div className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                            {location.address}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {isCustomLocation && locationInput && (
                <p className="form-hint">
                  Using custom location: "{locationInput}"
                </p>
              )}
              
              {errors.location && (
                <p className="form-error">{errors.location}</p>
              )}
            </div>
          </div>
        </form>
      </main>

      {/* Sticky Submit Button */}
      <div 
        className="fixed bottom-0 left-0 right-0 p-4 backdrop-blur-sm"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface) / 0.9)',
          borderTop: '1px solid rgb(var(--color-border-light))'
        }}
      >
        <div className="container-app">
          <button
            type="submit"
            form="create-form"
            disabled={isLoading}
            className="btn btn-primary w-full"
            style={{ padding: 'var(--space-4)' }}
          >
            {isLoading ? 'Creating...' : 'Create Match'}
          </button>
        </div>
      </div>
    </div>
  )
}
