'use client'

import { User } from 'lucide-react'

interface AvatarProps {
  src?: string | null
  name?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12'
}

const iconSizes = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6'
}

/**
 * Get initials from a name (max 2 characters)
 */
function getInitials(name: string | null | undefined): string {
  if (!name) return ''
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/**
 * Generate a consistent color based on name/id
 */
function getColorFromString(str: string): string {
  const colors = [
    '120, 113, 108', // stone-500
    '168, 162, 158', // stone-400
    '87, 83, 78',    // stone-600
    '146, 64, 14',   // amber-800
    '22, 78, 99',    // cyan-900
    '30, 58, 138',   // blue-900
  ]
  
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}

export default function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const sizeClass = sizeClasses[size]
  const iconSize = iconSizes[size]
  const initials = getInitials(name)
  const bgColor = name ? getColorFromString(name) : 'var(--color-interactive-muted)'
  
  // If we have a valid image URL, show it
  if (src) {
    return (
      <div 
        className={`${sizeClass} rounded-full overflow-hidden flex-shrink-0 ${className}`}
        style={{ backgroundColor: `rgb(${bgColor})` }}
      >
        <img 
          src={src} 
          alt={name || 'User avatar'}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Hide broken image and show fallback
            e.currentTarget.style.display = 'none'
          }}
        />
      </div>
    )
  }
  
  // If we have initials, show them
  if (initials) {
    const fontSize = {
      xs: 'text-[10px]',
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base'
    }[size]
    
    return (
      <div 
        className={`${sizeClass} rounded-full flex items-center justify-center flex-shrink-0 ${className}`}
        style={{ backgroundColor: `rgb(${bgColor})` }}
      >
        <span className={`font-medium text-white ${fontSize}`}>
          {initials}
        </span>
      </div>
    )
  }
  
  // Fallback: show user icon
  return (
    <div 
      className={`${sizeClass} rounded-full flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ backgroundColor: 'rgb(var(--color-interactive-muted))' }}
    >
      <User className={iconSize} style={{ color: 'rgb(var(--color-text-muted))' }} />
    </div>
  )
}

