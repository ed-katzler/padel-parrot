'use client'

import { useState, useEffect } from 'react'
import { Cloud, Droplets, Wind, Thermometer, AlertTriangle, Sun, CloudRain, CloudSnow, CloudFog, Lock, Crown } from 'lucide-react'
import { getSubscriptionStatus } from '@padel-parrot/api-client'

interface WeatherData {
  temperature: number
  humidity: number
  windSpeed: number
  cloudCover: number
  condition: string
  icon: string
  condensationRisk: number
  riskLevel: 'low' | 'medium' | 'high'
}

interface WeatherCardProps {
  matchId: string
  matchDateTime?: string // ISO date string - when this changes, refetch weather
  className?: string
}

// Map OpenWeatherMap condition to icon
const getWeatherIcon = (condition: string) => {
  switch (condition.toLowerCase()) {
    case 'clear':
      return <Sun className="w-8 h-8 text-amber-500" />
    case 'clouds':
      return <Cloud className="w-8 h-8 text-stone-400" />
    case 'rain':
    case 'drizzle':
    case 'thunderstorm':
      return <CloudRain className="w-8 h-8 text-blue-500" />
    case 'snow':
      return <CloudSnow className="w-8 h-8 text-blue-200" />
    case 'mist':
    case 'fog':
    case 'haze':
      return <CloudFog className="w-8 h-8 text-stone-400" />
    default:
      return <Sun className="w-8 h-8 text-amber-500" />
  }
}

// Get risk color and label - using CSS custom properties for dark mode support
const getRiskInfo = (level: 'low' | 'medium' | 'high', risk: number) => {
  switch (level) {
    case 'low':
      return {
        bgColor: 'rgb(var(--color-success-bg))',
        textColor: 'rgb(var(--color-success-text))',
        borderColor: 'rgb(var(--color-success-text) / 0.3)',
        barColor: 'rgb(var(--color-success-text))',
        label: 'Low Risk',
        description: 'Court conditions should be good'
      }
    case 'medium':
      return {
        bgColor: 'rgba(245, 158, 11, 0.15)',
        textColor: 'rgb(245, 158, 11)',
        borderColor: 'rgba(245, 158, 11, 0.3)',
        barColor: 'rgb(245, 158, 11)',
        label: 'Medium Risk',
        description: 'Some moisture possible on glass'
      }
    case 'high':
      return {
        bgColor: 'rgb(var(--color-error-bg))',
        textColor: 'rgb(var(--color-error-text))',
        borderColor: 'rgb(var(--color-error-text) / 0.3)',
        barColor: 'rgb(var(--color-error-text))',
        label: 'High Risk',
        description: 'Slippery glass walls likely'
      }
  }
}

export default function WeatherCard({ matchId, matchDateTime, className = '' }: WeatherCardProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showTooltip, setShowTooltip] = useState(false)
  const [isPremium, setIsPremium] = useState<boolean | null>(null)
  const [isCheckingPremium, setIsCheckingPremium] = useState(true)

  // Check premium status first
  useEffect(() => {
    const checkPremium = async () => {
      try {
        const { data } = await getSubscriptionStatus()
        const isActive = data 
          && data.status === 'active'
          && (!data.current_period_end || new Date(data.current_period_end) > new Date())
        setIsPremium(isActive)
      } catch (err) {
        console.error('Failed to check premium status:', err)
        setIsPremium(false)
      } finally {
        setIsCheckingPremium(false)
      }
    }
    
    checkPremium()
  }, [])

  useEffect(() => {
    // Only fetch weather if user is premium
    if (isCheckingPremium || !isPremium) {
      setIsLoading(false)
      return
    }

    const fetchWeather = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Add cache-busting param when date changes to ensure fresh data
        const cacheBuster = matchDateTime ? `?t=${new Date(matchDateTime).getTime()}` : ''
        const response = await fetch(`/api/weather/${matchId}${cacheBuster}`)
        const data = await response.json()
        
        if (!response.ok) {
          // Use specific message if available, otherwise fall back to generic
          const errorMessage = data.message || data.error || 'Weather unavailable'
          console.log('Weather API error:', response.status, data)
          setError(errorMessage)
          return
        }
        
        setWeather(data)
      } catch (err) {
        console.error('Weather fetch error:', err)
        setError('Failed to load weather')
      } finally {
        setIsLoading(false)
      }
    }

    fetchWeather()
  }, [matchId, matchDateTime, isPremium, isCheckingPremium])

  // Show loading while checking premium status
  if (isCheckingPremium || isLoading) {
    return (
      <div className={`card animate-pulse ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full" style={{ backgroundColor: 'rgb(var(--color-border-light))' }} />
          <div className="h-5 w-32 rounded" style={{ backgroundColor: 'rgb(var(--color-border-light))' }} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-16 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-interactive-muted))' }} />
          <div className="h-16 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-interactive-muted))' }} />
        </div>
      </div>
    )
  }

  // Show premium upsell for non-premium users
  if (!isPremium) {
    return (
      <div className={`card relative overflow-hidden ${className}`}>
        {/* Blurred background preview */}
        <div className="absolute inset-0 opacity-30 blur-sm pointer-events-none">
          <div className="flex items-center gap-3 mb-4 p-4">
            <Sun className="w-8 h-8 text-amber-500" />
            <div>
              <div className="text-2xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>22°C</div>
              <div className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>Clear</div>
            </div>
          </div>
        </div>
        
        {/* Locked overlay */}
        <div className="relative z-10 text-center py-6">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ backgroundColor: 'rgb(var(--color-interactive-muted))' }}
          >
            <Lock className="w-6 h-6" style={{ color: 'rgb(var(--color-text-muted))' }} />
          </div>
          <h3 className="font-semibold mb-1" style={{ color: 'rgb(var(--color-text))' }}>
            Weather Forecast
          </h3>
          <p className="text-sm mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
            See weather conditions and condensation risk for your match
          </p>
          <a
            href="/profile"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ 
              backgroundColor: 'rgb(234, 179, 8)',
              color: 'white'
            }}
          >
            <Crown className="w-4 h-4" />
            Unlock with Premium
          </a>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div 
        className={`card border-dashed ${className}`}
        style={{ backgroundColor: 'rgb(var(--color-interactive-muted))' }}
      >
        <div className="flex items-center gap-3" style={{ color: 'rgb(var(--color-text-muted))' }}>
          <Cloud className="w-6 h-6" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    )
  }

  if (!weather) return null

  const riskInfo = getRiskInfo(weather.riskLevel, weather.condensationRisk)

  return (
    <div className={`card ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {getWeatherIcon(weather.condition)}
          <div>
            <div className="text-2xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              {weather.temperature}°C
            </div>
            <div className="text-sm capitalize" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {weather.condition}
            </div>
          </div>
        </div>
      </div>

      {/* Weather Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div 
          className="flex items-center gap-2 p-2 rounded-lg"
          style={{ backgroundColor: 'rgb(var(--color-interactive-muted))' }}
        >
          <Droplets className="w-4 h-4 text-blue-500" />
          <div>
            <div className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>Humidity</div>
            <div className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>{weather.humidity}%</div>
          </div>
        </div>
        <div 
          className="flex items-center gap-2 p-2 rounded-lg"
          style={{ backgroundColor: 'rgb(var(--color-interactive-muted))' }}
        >
          <Wind className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
          <div>
            <div className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>Wind</div>
            <div className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>{weather.windSpeed} m/s</div>
          </div>
        </div>
        <div 
          className="flex items-center gap-2 p-2 rounded-lg"
          style={{ backgroundColor: 'rgb(var(--color-interactive-muted))' }}
        >
          <Cloud className="w-4 h-4" style={{ color: 'rgb(var(--color-text-subtle))' }} />
          <div>
            <div className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>Clouds</div>
            <div className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>{weather.cloudCover}%</div>
          </div>
        </div>
      </div>

      {/* Condensation Risk */}
      <div 
        className="p-3 rounded-lg relative"
        style={{ 
          backgroundColor: riskInfo.bgColor,
          color: riskInfo.textColor,
          border: `1px solid ${riskInfo.borderColor}`
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Condensation Risk</span>
          </div>
          <span className="text-sm font-semibold">{riskInfo.label}</span>
        </div>
        
        {/* Risk Bar */}
        <div 
          className="h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: 'rgb(var(--color-border-light))' }}
        >
          <div 
            className="h-full transition-all duration-500"
            style={{ width: `${weather.condensationRisk}%`, backgroundColor: riskInfo.barColor }}
          />
        </div>
        
        <div className="text-xs mt-2 opacity-80">
          {riskInfo.description}
        </div>

        {/* Tooltip */}
        {showTooltip && (
          <div 
            className="absolute bottom-full left-0 right-0 mb-2 p-3 text-xs rounded-lg shadow-lg z-10"
            style={{ backgroundColor: 'rgb(var(--color-text))', color: 'rgb(var(--color-bg))' }}
          >
            <div className="font-medium mb-1">What is Condensation Risk?</div>
            <p>
              When glass court walls get colder than the dew point, moisture condenses on them, 
              making the walls slippery. Clear, calm nights increase this risk.
            </p>
            <div 
              className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2"
              style={{ backgroundColor: 'rgb(var(--color-text))' }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

