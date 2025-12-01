'use client'

import { useState, useEffect } from 'react'
import { Cloud, Droplets, Wind, Thermometer, AlertTriangle, Sun, CloudRain, CloudSnow, CloudFog } from 'lucide-react'

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

// Get risk color and label
const getRiskInfo = (level: 'low' | 'medium' | 'high', risk: number) => {
  switch (level) {
    case 'low':
      return {
        color: 'bg-green-50 text-green-700 border-green-200',
        barColor: 'bg-green-500',
        label: 'Low Risk',
        description: 'Court conditions should be good'
      }
    case 'medium':
      return {
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        barColor: 'bg-amber-500',
        label: 'Medium Risk',
        description: 'Some moisture possible on glass'
      }
    case 'high':
      return {
        color: 'bg-red-50 text-red-700 border-red-200',
        barColor: 'bg-red-500',
        label: 'High Risk',
        description: 'Slippery glass walls likely'
      }
  }
}

export default function WeatherCard({ matchId, className = '' }: WeatherCardProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const response = await fetch(`/api/weather/${matchId}`)
        const data = await response.json()
        
        if (!response.ok) {
          setError(data.message || data.error || 'Weather unavailable')
          return
        }
        
        setWeather(data)
      } catch (err) {
        setError('Failed to load weather')
      } finally {
        setIsLoading(false)
      }
    }

    fetchWeather()
  }, [matchId])

  if (isLoading) {
    return (
      <div className={`card animate-pulse ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-stone-200" />
          <div className="h-5 w-32 bg-stone-200 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-16 bg-stone-100 rounded-lg" />
          <div className="h-16 bg-stone-100 rounded-lg" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`card bg-stone-50 border-dashed ${className}`}>
        <div className="flex items-center gap-3 text-stone-500">
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
            <div className="text-2xl font-semibold text-stone-900">
              {weather.temperature}°C
            </div>
            <div className="text-sm text-stone-500 capitalize">
              {weather.condition}
            </div>
          </div>
        </div>
      </div>

      {/* Weather Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="flex items-center gap-2 p-2 bg-stone-50 rounded-lg">
          <Droplets className="w-4 h-4 text-blue-500" />
          <div>
            <div className="text-xs text-stone-500">Humidity</div>
            <div className="text-sm font-medium">{weather.humidity}%</div>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 bg-stone-50 rounded-lg">
          <Wind className="w-4 h-4 text-stone-500" />
          <div>
            <div className="text-xs text-stone-500">Wind</div>
            <div className="text-sm font-medium">{weather.windSpeed} m/s</div>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 bg-stone-50 rounded-lg">
          <Cloud className="w-4 h-4 text-stone-400" />
          <div>
            <div className="text-xs text-stone-500">Clouds</div>
            <div className="text-sm font-medium">{weather.cloudCover}%</div>
          </div>
        </div>
      </div>

      {/* Condensation Risk */}
      <div 
        className={`p-3 rounded-lg border ${riskInfo.color} relative`}
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
        <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
          <div 
            className={`h-full ${riskInfo.barColor} transition-all duration-500`}
            style={{ width: `${weather.condensationRisk}%` }}
          />
        </div>
        
        <div className="text-xs mt-2 opacity-80">
          {riskInfo.description}
        </div>

        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute bottom-full left-0 right-0 mb-2 p-3 bg-stone-900 text-white text-xs rounded-lg shadow-lg z-10">
            <div className="font-medium mb-1">What is Condensation Risk?</div>
            <p>
              When glass court walls get colder than the dew point, moisture condenses on them, 
              making the walls slippery. Clear, calm nights increase this risk.
            </p>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-stone-900" />
          </div>
        )}
      </div>
    </div>
  )
}

