'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

interface DatePickerProps {
  value: string
  onChange: (date: string) => void
  minDate?: string
  maxDate?: string
  placeholder?: string
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function DatePicker({ 
  value, 
  onChange, 
  minDate, 
  maxDate,
  placeholder = 'Select date'
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize current month based on value or today
  useEffect(() => {
    if (value) {
      setCurrentMonth(new Date(value + 'T00:00:00'))
    } else {
      setCurrentMonth(new Date())
    }
  }, [])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()
    
    const days: (number | null)[] = []
    
    // Add empty slots for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null)
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    
    return days
  }

  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const isDateDisabled = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    const dateStr = formatDate(date)
    
    if (minDate && dateStr < minDate) return true
    if (maxDate && dateStr > maxDate) return true
    return false
  }

  const isToday = (day: number) => {
    const today = new Date()
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    )
  }

  const isSelected = (day: number) => {
    if (!value) return false
    const selected = new Date(value + 'T00:00:00')
    return (
      day === selected.getDate() &&
      currentMonth.getMonth() === selected.getMonth() &&
      currentMonth.getFullYear() === selected.getFullYear()
    )
  }

  const handleDayClick = (day: number) => {
    if (isDateDisabled(day)) return
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    onChange(formatDate(date))
    setIsOpen(false)
  }

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-GB', { 
      weekday: 'short',
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    })
  }

  const days = getDaysInMonth(currentMonth)

  return (
    <div className="relative" ref={containerRef}>
      {/* Input */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="input w-full text-left flex items-center justify-between"
      >
        <span className={value ? 'text-stone-900' : 'text-stone-400'}>
          {value ? formatDisplayDate(value) : placeholder}
        </span>
        <Calendar className="w-4 h-4 text-stone-400" />
      </button>

      {/* Calendar Dropdown */}
      {isOpen && (
        <div className="absolute z-30 mt-1 w-72 bg-white border border-stone-200 rounded-lg shadow-lg p-4 animate-fade-in">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="p-1.5 rounded-md hover:bg-stone-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-stone-600" />
            </button>
            <span className="text-sm font-medium text-stone-900">
              {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <button
              type="button"
              onClick={goToNextMonth}
              className="p-1.5 rounded-md hover:bg-stone-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-stone-600" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-stone-500 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => (
              <div key={index} className="aspect-square">
                {day !== null && (
                  <button
                    type="button"
                    onClick={() => handleDayClick(day)}
                    disabled={isDateDisabled(day)}
                    className={`
                      w-full h-full rounded-md text-sm font-medium transition-colors
                      ${isSelected(day) 
                        ? 'bg-stone-900 text-white' 
                        : isToday(day)
                          ? 'bg-stone-100 text-stone-900'
                          : 'text-stone-700 hover:bg-stone-50'
                      }
                      ${isDateDisabled(day) 
                        ? 'text-stone-300 cursor-not-allowed hover:bg-transparent' 
                        : ''
                      }
                    `}
                  >
                    {day}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Today Button */}
          <div className="mt-3 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={() => {
                const today = new Date()
                setCurrentMonth(today)
                if (!isDateDisabled(today.getDate())) {
                  onChange(formatDate(today))
                  setIsOpen(false)
                }
              }}
              className="w-full text-sm text-stone-600 hover:text-stone-900 transition-colors py-1"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

