'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, ChevronRight, MapPin, X, Check, Search, Globe, ExternalLink } from 'lucide-react'
import type { Club, ClubsByDistrict, District } from '@padel-parrot/api-client'

interface ClubSelectorProps {
  value: string
  onChange: (value: string, clubId?: string) => void
  clubs: Club[]
  clubsByDistrict?: ClubsByDistrict[]
  placeholder?: string
  error?: string
  allowCustom?: boolean
}

export default function ClubSelector({
  value,
  onChange,
  clubs,
  clubsByDistrict,
  placeholder = 'Search clubs or enter location',
  error,
  allowCustom = true,
}: ClubSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeDistrict, setActiveDistrict] = useState<string | null>(null)
  const [isCustomLocation, setIsCustomLocation] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [viewMode, setViewMode] = useState<'search' | 'browse'>('search')
  
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

  // Filter clubs based on search query
  const filteredClubs = useMemo(() => {
    if (!searchQuery.trim()) {
      return clubs
    }
    
    const query = searchQuery.toLowerCase().trim()
    return clubs.filter(club =>
      club.name.toLowerCase().includes(query) ||
      club.city?.toLowerCase().includes(query) ||
      club.address?.toLowerCase().includes(query) ||
      club.district_name?.toLowerCase().includes(query)
    )
  }, [clubs, searchQuery])

  // Check if it's a custom location
  useEffect(() => {
    if (inputValue && clubs.length > 0) {
      const matchingClub = clubs.find(c => c.name === inputValue)
      setIsCustomLocation(!matchingClub && inputValue.trim().length > 0)
    } else {
      setIsCustomLocation(false)
    }
  }, [inputValue, clubs])

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Sync external value changes
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Calculate dropdown position for desktop
  const calculatePosition = useCallback(() => {
    if (!containerRef.current || isMobile) return

    const rect = containerRef.current.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const spaceBelow = viewportHeight - rect.bottom
    const spaceAbove = rect.top
    const dropdownHeight = 400

    const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow

    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      width: Math.max(rect.width, 360),
      ...(openUpward
        ? { bottom: viewportHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
      maxHeight: Math.min(openUpward ? spaceAbove - 20 : spaceBelow - 20, 400),
    })
  }, [isMobile])

  // Recalculate on open and scroll (but not when scrolling inside dropdown)
  useEffect(() => {
    if (isOpen && !isMobile) {
      calculatePosition()
      
      const handleScroll = (e: Event) => {
        // Don't recalculate if scrolling inside the dropdown
        if (dropdownRef.current?.contains(e.target as Node)) {
          return
        }
        calculatePosition()
      }
      const handleResize = () => calculatePosition()
      
      window.addEventListener('scroll', handleScroll, true)
      window.addEventListener('resize', handleResize)
      
      return () => {
        window.removeEventListener('scroll', handleScroll, true)
        window.removeEventListener('resize', handleResize)
      }
    }
  }, [isOpen, isMobile, calculatePosition])

  // Click outside handler
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        handleClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Prevent body scroll when mobile modal is open
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen, isMobile])

  // Focus search input when opening
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleOpen = () => {
    setIsOpen(true)
    setSearchQuery('')
    setViewMode('search')
    setActiveDistrict(null)
    calculatePosition()
  }

  const handleClose = () => {
    setIsOpen(false)
    setSearchQuery('')
    if (inputValue !== value) {
      onChange(inputValue)
    }
  }

  const handleSelectClub = (club: Club) => {
    setInputValue(club.name)
    onChange(club.name, club.id)
    setIsOpen(false)
    setIsCustomLocation(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    if (!isOpen) {
      handleOpen()
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setViewMode('search')
    setActiveDistrict(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose()
    } else if (e.key === 'Enter' && inputValue) {
      e.preventDefault()
      onChange(inputValue)
      setIsOpen(false)
    }
  }

  const handleUseCustomLocation = () => {
    if (inputValue || searchQuery) {
      const locationName = searchQuery || inputValue
      setInputValue(locationName)
      onChange(locationName)
      setIsOpen(false)
    }
  }

  // Club item renderer
  const ClubItem = ({ club, showDistrict = false }: { club: Club; showDistrict?: boolean }) => (
    <button
      type="button"
      onClick={() => handleSelectClub(club)}
      className="w-full px-4 py-3 text-left transition-colors flex items-start gap-3 hover:bg-gray-50"
      style={{ borderBottom: '1px solid rgb(var(--color-border-light))' }}
    >
      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }} />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate" style={{ color: 'rgb(var(--color-text))' }}>
          {club.name}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {club.city && (
            <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {club.city}
            </span>
          )}
          {showDistrict && club.district_name && (
            <>
              <span className="text-xs" style={{ color: 'rgb(var(--color-text-subtle))' }}>•</span>
              <span className="text-xs" style={{ color: 'rgb(var(--color-text-subtle))' }}>
                {club.district_name}
              </span>
            </>
          )}
          {club.num_courts && (
            <>
              <span className="text-xs" style={{ color: 'rgb(var(--color-text-subtle))' }}>•</span>
              <span className="text-xs" style={{ color: 'rgb(var(--color-text-subtle))' }}>
                {club.num_courts} courts
              </span>
            </>
          )}
        </div>
      </div>
      {value === club.name && (
        <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-interactive))' }} />
      )}
    </button>
  )

  // District header renderer
  const DistrictHeader = ({ district, count, isExpanded, onClick }: { 
    district: District; 
    count: number; 
    isExpanded: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full px-4 py-3 text-left flex items-center justify-between transition-colors hover:bg-gray-50"
      style={{ 
        backgroundColor: 'rgb(var(--color-interactive-muted))',
        borderBottom: '1px solid rgb(var(--color-border-light))'
      }}
    >
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>
          {district.name}
        </span>
        <span 
          className="text-xs px-1.5 py-0.5 rounded-full"
          style={{ 
            backgroundColor: 'rgb(var(--color-border-light))',
            color: 'rgb(var(--color-text-muted))'
          }}
        >
          {count}
        </span>
      </div>
      <ChevronRight 
        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
        style={{ color: 'rgb(var(--color-text-muted))' }}
      />
    </button>
  )

  // Desktop dropdown content
  const DropdownContent = () => (
    <div
      ref={dropdownRef}
      className="rounded-xl overflow-hidden flex flex-col"
      style={{
        ...dropdownStyle,
        backgroundColor: 'rgb(var(--color-surface))',
        border: '1px solid rgb(var(--color-border-light))',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        zIndex: 9999,
      }}
    >
      {/* Search header */}
      <div className="p-3" style={{ borderBottom: '1px solid rgb(var(--color-border-light))' }}>
        <div className="relative">
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            placeholder="Search clubs..."
            className="input pl-9 text-sm"
            autoComplete="off"
          />
        </div>
        
        {/* View mode toggle */}
        {clubsByDistrict && clubsByDistrict.length > 0 && !searchQuery && (
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => setViewMode('search')}
              className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'search' 
                  ? 'bg-gray-900 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Clubs
            </button>
            <button
              type="button"
              onClick={() => setViewMode('browse')}
              className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'browse' 
                  ? 'bg-gray-900 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              By Region
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div 
        className="overflow-y-auto flex-1" 
        style={{ maxHeight: '320px', overscrollBehavior: 'contain' }}
        onWheel={(e) => e.stopPropagation()}
      >
        {searchQuery ? (
          // Search results
          filteredClubs.length > 0 ? (
            filteredClubs.map(club => (
              <ClubItem key={club.id} club={club} showDistrict />
            ))
          ) : allowCustom ? (
            <button
              type="button"
              onClick={handleUseCustomLocation}
              className="w-full px-4 py-3 text-left transition-colors flex items-center gap-3 hover:bg-gray-50"
            >
              <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: 'rgb(var(--color-interactive))' }} />
              <div className="flex-1">
                <div className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                  Use "{searchQuery}"
                </div>
                <div className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  Custom location
                </div>
              </div>
            </button>
          ) : (
            <div className="px-4 py-6 text-center text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
              No clubs found matching "{searchQuery}"
            </div>
          )
        ) : viewMode === 'browse' && clubsByDistrict ? (
          // Browse by region
          clubsByDistrict.map(({ district, clubs: districtClubs }) => (
            <div key={district.id}>
              <DistrictHeader 
                district={district}
                count={districtClubs.length}
                isExpanded={activeDistrict === district.id}
                onClick={() => setActiveDistrict(activeDistrict === district.id ? null : district.id)}
              />
              {activeDistrict === district.id && (
                <div style={{ backgroundColor: 'rgb(var(--color-surface))' }}>
                  {districtClubs.map(club => (
                    <ClubItem key={club.id} club={club} />
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          // All clubs list
          filteredClubs.length > 0 ? (
            filteredClubs.slice(0, 20).map(club => (
              <ClubItem key={club.id} club={club} showDistrict />
            ))
          ) : (
            <div className="px-4 py-6 text-center text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
              Start typing to search clubs
            </div>
          )
        )}
      </div>
      
      {/* Custom location option at bottom */}
      {allowCustom && !searchQuery && (
        <div 
          className="px-4 py-3 flex items-center gap-2"
          style={{ 
            borderTop: '1px solid rgb(var(--color-border-light))',
            backgroundColor: 'rgb(var(--color-interactive-muted))'
          }}
        >
          <Globe className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
          <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
            Can't find your club? Type the name to use a custom location
          </span>
        </div>
      )}
    </div>
  )

  // Mobile bottom sheet content
  const MobileSheet = () => (
    <div
      className="fixed inset-0 z-50 animate-fade-in-overlay"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={handleClose}
    >
      <div
        ref={dropdownRef}
        className="fixed bottom-0 left-0 right-0 rounded-t-2xl animate-slide-up flex flex-col"
        style={{
          backgroundColor: 'rgb(var(--color-surface))',
          maxHeight: '85vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div
            className="w-10 h-1 rounded-full"
            style={{ backgroundColor: 'rgb(var(--color-border))' }}
          />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-4 pb-3"
          style={{ borderBottom: '1px solid rgb(var(--color-border-light))' }}
        >
          <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            Select Club
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 -mr-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
          </button>
        </div>

        {/* Search input */}
        <div className="p-4" style={{ borderBottom: '1px solid rgb(var(--color-border-light))' }}>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              placeholder="Search clubs..."
              className="input pl-10"
              autoFocus
              autoComplete="off"
            />
          </div>
          
          {/* View mode toggle */}
          {clubsByDistrict && clubsByDistrict.length > 0 && !searchQuery && (
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => setViewMode('search')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'search' 
                    ? 'bg-gray-900 text-white' 
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                All Clubs
              </button>
              <button
                type="button"
                onClick={() => setViewMode('browse')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'browse' 
                    ? 'bg-gray-900 text-white' 
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                By Region
              </button>
            </div>
          )}
        </div>

        {/* Options list */}
        <div 
          className="overflow-y-auto flex-1" 
          style={{ maxHeight: 'calc(85vh - 200px)', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
        >
          {searchQuery ? (
            // Search results
            filteredClubs.length > 0 ? (
              filteredClubs.map(club => (
                <ClubItem key={club.id} club={club} showDistrict />
              ))
            ) : allowCustom ? (
              <button
                type="button"
                onClick={handleUseCustomLocation}
                className="w-full px-4 py-4 text-left transition-colors flex items-center gap-3 active:bg-gray-100"
              >
                <MapPin className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(var(--color-interactive))' }} />
                <div className="flex-1">
                  <div className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                    Use "{searchQuery}"
                  </div>
                  <div className="text-sm mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    Custom location
                  </div>
                </div>
              </button>
            ) : (
              <div className="px-4 py-8 text-center" style={{ color: 'rgb(var(--color-text-muted))' }}>
                No clubs found
              </div>
            )
          ) : viewMode === 'browse' && clubsByDistrict ? (
            // Browse by region
            clubsByDistrict.map(({ district, clubs: districtClubs }) => (
              <div key={district.id}>
                <DistrictHeader 
                  district={district}
                  count={districtClubs.length}
                  isExpanded={activeDistrict === district.id}
                  onClick={() => setActiveDistrict(activeDistrict === district.id ? null : district.id)}
                />
                {activeDistrict === district.id && (
                  <div style={{ backgroundColor: 'rgb(var(--color-surface))' }}>
                    {districtClubs.map(club => (
                      <ClubItem key={club.id} club={club} />
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            // All clubs list
            filteredClubs.length > 0 ? (
              filteredClubs.slice(0, 30).map(club => (
                <ClubItem key={club.id} club={club} showDistrict />
              ))
            ) : (
              <div className="px-4 py-8 text-center" style={{ color: 'rgb(var(--color-text-muted))' }}>
                Start typing to search clubs
              </div>
            )
          )}
        </div>

        {/* Footer hint */}
        {allowCustom && !searchQuery && (
          <div 
            className="px-4 py-3 flex items-center gap-2"
            style={{ 
              borderTop: '1px solid rgb(var(--color-border-light))',
              backgroundColor: 'rgb(var(--color-interactive-muted))'
            }}
          >
            <Globe className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
            <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              Type any location name if your club isn't listed
            </span>
          </div>
        )}

        {/* Safe area padding for iOS */}
        <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }} />
      </div>
    </div>
  )

  return (
    <div ref={containerRef}>
      {/* Input field */}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleOpen}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`input ${error ? 'border-red-500' : ''}`}
          style={{ paddingRight: '2.5rem' }}
          autoComplete="off"
        />
        <ChevronDown
          className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-transform pointer-events-none ${
            isOpen ? 'rotate-180' : ''
          }`}
          style={{ color: 'rgb(var(--color-text-subtle))' }}
        />
      </div>

      {/* Custom location hint */}
      {isCustomLocation && inputValue && !isOpen && (
        <p className="form-hint mt-1">
          Using custom location: "{inputValue}"
        </p>
      )}

      {/* Error message */}
      {error && <p className="form-error mt-1">{error}</p>}

      {/* Dropdown portal */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          isMobile ? <MobileSheet /> : <DropdownContent />,
          document.body
        )}
    </div>
  )
}
