'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, MapPin, X, Check } from 'lucide-react'
import type { Location } from '@padel-parrot/api-client'

interface LocationSelectorProps {
  value: string
  onChange: (value: string) => void
  locations: Location[]
  placeholder?: string
  error?: string
}

export default function LocationSelector({
  value,
  onChange,
  locations,
  placeholder = 'Search or enter location',
  error,
}: LocationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const [filteredLocations, setFilteredLocations] = useState<Location[]>(locations)
  const [isCustomLocation, setIsCustomLocation] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

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

  // Filter locations based on input
  useEffect(() => {
    if (inputValue) {
      const filtered = locations.filter(location =>
        location.name.toLowerCase().includes(inputValue.toLowerCase()) ||
        (location.address && location.address.toLowerCase().includes(inputValue.toLowerCase()))
      )
      setFilteredLocations(filtered)
      setIsCustomLocation(filtered.length === 0)
    } else {
      setFilteredLocations(locations)
      setIsCustomLocation(false)
    }
  }, [inputValue, locations])

  // Calculate dropdown position
  const calculatePosition = useCallback(() => {
    if (!containerRef.current || isMobile) return

    const rect = containerRef.current.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const spaceBelow = viewportHeight - rect.bottom
    const spaceAbove = rect.top
    const dropdownHeight = Math.min(filteredLocations.length * 60, 240) + 16 // Estimated height

    // Decide direction based on available space
    const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow

    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      ...(openUpward
        ? { bottom: viewportHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
      maxHeight: Math.min(openUpward ? spaceAbove - 20 : spaceBelow - 20, 280),
    })
  }, [filteredLocations.length, isMobile])

  // Recalculate on open and scroll
  useEffect(() => {
    if (isOpen && !isMobile) {
      calculatePosition()
      
      const handleScroll = () => calculatePosition()
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

  const handleOpen = () => {
    setIsOpen(true)
    calculatePosition()
  }

  const handleClose = () => {
    setIsOpen(false)
    // Commit the current input value when closing
    if (inputValue !== value) {
      onChange(inputValue)
    }
  }

  const handleSelect = (location: Location) => {
    setInputValue(location.name)
    onChange(location.name)
    setIsOpen(false)
    setIsCustomLocation(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    if (!isOpen) {
      handleOpen()
    }
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
    if (inputValue) {
      onChange(inputValue)
      setIsOpen(false)
    }
  }

  // Desktop dropdown content
  const DropdownContent = () => (
    <div
      ref={dropdownRef}
      className="rounded-xl overflow-hidden"
      style={{
        ...dropdownStyle,
        backgroundColor: 'rgb(var(--color-surface))',
        border: '1px solid rgb(var(--color-border-light))',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        zIndex: 9999,
        overflowY: 'auto',
      }}
    >
      {filteredLocations.length > 0 ? (
        filteredLocations.map((location, index) => (
          <button
            key={location.id}
            type="button"
            onClick={() => handleSelect(location)}
            className="w-full px-4 py-3 text-left transition-colors flex items-start gap-3"
            style={{
              borderBottom: index < filteredLocations.length - 1 ? '1px solid rgb(var(--color-border-light))' : 'none',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--color-interactive-muted))'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate" style={{ color: 'rgb(var(--color-text))' }}>
                {location.name}
              </div>
              {location.address && (
                <div className="text-xs truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {location.address}
                </div>
              )}
            </div>
            {inputValue === location.name && (
              <Check className="w-4 h-4 flex-shrink-0" style={{ color: 'rgb(var(--color-primary))' }} />
            )}
          </button>
        ))
      ) : inputValue ? (
        <button
          type="button"
          onClick={handleUseCustomLocation}
          className="w-full px-4 py-3 text-left transition-colors flex items-center gap-3"
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--color-interactive-muted))'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: 'rgb(var(--color-primary))' }} />
          <div className="flex-1">
            <div className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>
              Use "{inputValue}"
            </div>
            <div className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              Custom location
            </div>
          </div>
        </button>
      ) : (
        <div className="px-4 py-3 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
          Type to search locations
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
        className="fixed bottom-0 left-0 right-0 rounded-t-2xl animate-slide-up"
        style={{
          backgroundColor: 'rgb(var(--color-surface))',
          maxHeight: '70vh',
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
            Select Location
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 -mr-2 rounded-full transition-colors"
            style={{ backgroundColor: 'transparent' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--color-interactive-muted))'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
          </button>
        </div>

        {/* Search input */}
        <div className="p-4" style={{ borderBottom: '1px solid rgb(var(--color-border-light))' }}>
          <div className="relative">
            <MapPin
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            />
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="input pl-10"
              autoFocus
              autoComplete="off"
            />
          </div>
        </div>

        {/* Options list */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 140px)' }}>
          {filteredLocations.length > 0 ? (
            filteredLocations.map((location, index) => (
              <button
                key={location.id}
                type="button"
                onClick={() => handleSelect(location)}
                className="w-full px-4 py-4 text-left transition-colors flex items-start gap-3 active:bg-gray-100"
                style={{
                  borderBottom: index < filteredLocations.length - 1 ? '1px solid rgb(var(--color-border-light))' : 'none',
                }}
              >
                <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                    {location.name}
                  </div>
                  {location.address && (
                    <div className="text-sm mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {location.address}
                    </div>
                  )}
                </div>
                {inputValue === location.name && (
                  <Check className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(var(--color-primary))' }} />
                )}
              </button>
            ))
          ) : inputValue ? (
            <button
              type="button"
              onClick={handleUseCustomLocation}
              className="w-full px-4 py-4 text-left transition-colors flex items-center gap-3 active:bg-gray-100"
            >
              <MapPin className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(var(--color-primary))' }} />
              <div className="flex-1">
                <div className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                  Use "{inputValue}"
                </div>
                <div className="text-sm mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  Custom location
                </div>
              </div>
            </button>
          ) : (
            <div className="px-4 py-6 text-center" style={{ color: 'rgb(var(--color-text-muted))' }}>
              Type to search locations
            </div>
          )}
        </div>

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
          ref={inputRef}
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
