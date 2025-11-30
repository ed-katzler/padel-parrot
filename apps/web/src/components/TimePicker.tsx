'use client'

import { ChevronDown } from 'lucide-react'

interface TimePickerProps {
  value: string
  onChange: (time: string) => void
  placeholder?: string
}

// Generate time slots from 06:00 to 23:30 in 30-minute increments
const generateTimeSlots = () => {
  const slots: { value: string; label: string }[] = []
  
  for (let hour = 6; hour <= 23; hour++) {
    for (let minute of [0, 30]) {
      // Skip 23:30
      if (hour === 23 && minute === 30) continue
      
      const hourStr = String(hour).padStart(2, '0')
      const minuteStr = String(minute).padStart(2, '0')
      const value = `${hourStr}:${minuteStr}`
      
      // Format label as 12-hour time
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const label = `${displayHour}:${minuteStr} ${ampm}`
      
      slots.push({ value, label })
    }
  }
  
  return slots
}

const TIME_SLOTS = generateTimeSlots()

export default function TimePicker({ 
  value, 
  onChange,
  placeholder = 'Select time'
}: TimePickerProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input appearance-none"
        style={{ 
          paddingRight: '2.5rem',
          color: value ? 'rgb(var(--color-text))' : 'rgb(var(--color-text-subtle))'
        }}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {TIME_SLOTS.map((slot) => (
          <option key={slot.value} value={slot.value}>
            {slot.label}
          </option>
        ))}
      </select>
      <ChevronDown 
        className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none"
        style={{ color: 'rgb(var(--color-text-subtle))' }}
      />
    </div>
  )
}
