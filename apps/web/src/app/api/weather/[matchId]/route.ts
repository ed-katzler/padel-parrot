import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role for cache management
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY

// Cache duration: 1 hour
const CACHE_DURATION_MS = 60 * 60 * 1000

interface WeatherResponse {
  temperature: number
  humidity: number
  windSpeed: number
  cloudCover: number
  condition: string
  icon: string
  condensationRisk: number
  riskLevel: 'low' | 'medium' | 'high'
}

/**
 * Calculate condensation risk based on weather data
 * Condensation forms when the glass surface temperature ≤ dew point
 * 
 * T = air temperature (°C)
 * RH = relative humidity (%)
 * W = wind speed (m/s)
 * C = cloud cover (%)
 * CF = cooling factor = 0.5 + (0.5 * (1 - C/100))  # clear sky → more cooling
 * DP = T - ((100 - RH)/5)  # Dew point
 * TG = T - CF  # Estimated glass surface temp
 * Risk = clamp((DP - TG + 1) * 20 - (W * 5), 0, 100)
 */
function calculateCondensationRisk(
  temperature: number,
  humidity: number,
  windSpeed: number,
  cloudCover: number
): { risk: number; level: 'low' | 'medium' | 'high' } {
  // Cooling factor: clear sky = more cooling
  const CF = 0.5 + (0.5 * (1 - cloudCover / 100))
  
  // Dew point approximation
  const DP = temperature - ((100 - humidity) / 5)
  
  // Estimated glass surface temperature
  const TG = temperature - CF
  
  // Condensation risk score (0-100)
  const risk = Math.max(0, Math.min(100, (DP - TG + 1) * 20 - (windSpeed * 5)))
  
  // Determine risk level
  let level: 'low' | 'medium' | 'high'
  if (risk < 30) {
    level = 'low'
  } else if (risk < 60) {
    level = 'medium'
  } else {
    level = 'high'
  }
  
  return { risk: Math.round(risk), level }
}

export async function GET(
  request: Request,
  { params }: { params: { matchId: string } }
) {
  try {
    const { matchId } = params
    
    if (!matchId) {
      return NextResponse.json(
        { error: 'Match ID is required' },
        { status: 400 }
      )
    }

    // Get match details
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('location, date_time')
      .eq('id', matchId)
      .single()

    if (matchError || !match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      )
    }

    // Get location with coordinates
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('id, name, latitude, longitude')
      .eq('name', match.location)
      .single()

    if (locationError || !location) {
      return NextResponse.json(
        { error: 'Location not found', message: 'Weather data unavailable for this location' },
        { status: 404 }
      )
    }

    if (!location.latitude || !location.longitude) {
      return NextResponse.json(
        { error: 'Location coordinates not available' },
        { status: 404 }
      )
    }

    const matchTime = new Date(match.date_time)
    const now = new Date()
    
    // Round forecast time to nearest 3 hours (OpenWeatherMap forecast resolution)
    const forecastHour = Math.round(matchTime.getHours() / 3) * 3
    const forecastTime = new Date(matchTime)
    forecastTime.setHours(forecastHour, 0, 0, 0)

    // Check cache first
    const { data: cached } = await supabase
      .from('weather_cache')
      .select('*')
      .eq('location_id', location.id)
      .eq('forecast_time', forecastTime.toISOString())
      .gte('fetched_at', new Date(now.getTime() - CACHE_DURATION_MS).toISOString())
      .single()

    if (cached) {
      const response: WeatherResponse = {
        temperature: parseFloat(cached.temperature),
        humidity: cached.humidity,
        windSpeed: parseFloat(cached.wind_speed),
        cloudCover: cached.cloud_cover,
        condition: cached.weather_condition,
        icon: cached.weather_icon,
        condensationRisk: cached.condensation_risk,
        riskLevel: cached.condensation_risk < 30 ? 'low' : cached.condensation_risk < 60 ? 'medium' : 'high'
      }
      return NextResponse.json(response)
    }

    // Check if we have an API key
    if (!OPENWEATHERMAP_API_KEY) {
      return NextResponse.json(
        { error: 'Weather API not configured' },
        { status: 503 }
      )
    }

    // Determine if we need current weather or forecast
    const hoursUntilMatch = (matchTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    let weatherData: {
      temp: number
      humidity: number
      wind_speed: number
      clouds: number
      weather: Array<{ main: string; icon: string }>
    }

    if (hoursUntilMatch <= 0) {
      // Match is in the past or now - use current weather
      const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${location.latitude}&lon=${location.longitude}&units=metric&appid=${OPENWEATHERMAP_API_KEY}`
      
      const response = await fetch(currentUrl)
      if (!response.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch weather data' },
          { status: 503 }
        )
      }
      
      const data = await response.json()
      weatherData = {
        temp: data.main.temp,
        humidity: data.main.humidity,
        wind_speed: data.wind.speed,
        clouds: data.clouds.all,
        weather: data.weather
      }
    } else if (hoursUntilMatch <= 48) {
      // Within 48 hours - use hourly forecast
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${location.latitude}&lon=${location.longitude}&units=metric&appid=${OPENWEATHERMAP_API_KEY}`
      
      const response = await fetch(forecastUrl)
      if (!response.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch forecast data' },
          { status: 503 }
        )
      }
      
      const data = await response.json()
      
      // Find closest forecast entry to match time
      let closestEntry = data.list[0]
      let closestDiff = Math.abs(new Date(data.list[0].dt * 1000).getTime() - matchTime.getTime())
      
      for (const entry of data.list) {
        const entryTime = new Date(entry.dt * 1000)
        const diff = Math.abs(entryTime.getTime() - matchTime.getTime())
        if (diff < closestDiff) {
          closestDiff = diff
          closestEntry = entry
        }
      }
      
      weatherData = {
        temp: closestEntry.main.temp,
        humidity: closestEntry.main.humidity,
        wind_speed: closestEntry.wind.speed,
        clouds: closestEntry.clouds.all,
        weather: closestEntry.weather
      }
    } else {
      // More than 48 hours - forecast not available
      return NextResponse.json(
        { error: 'Forecast not available yet', message: 'Weather forecast is only available for matches within 5 days' },
        { status: 404 }
      )
    }

    // Calculate condensation risk
    const { risk, level } = calculateCondensationRisk(
      weatherData.temp,
      weatherData.humidity,
      weatherData.wind_speed,
      weatherData.clouds
    )

    // Cache the result
    await supabase.from('weather_cache').upsert({
      location_id: location.id,
      forecast_time: forecastTime.toISOString(),
      temperature: weatherData.temp,
      humidity: weatherData.humidity,
      wind_speed: weatherData.wind_speed,
      cloud_cover: weatherData.clouds,
      weather_condition: weatherData.weather[0]?.main || 'Unknown',
      weather_icon: weatherData.weather[0]?.icon || '01d',
      condensation_risk: risk,
      fetched_at: new Date().toISOString()
    }, {
      onConflict: 'location_id,forecast_time'
    })

    const response: WeatherResponse = {
      temperature: Math.round(weatherData.temp),
      humidity: weatherData.humidity,
      windSpeed: Math.round(weatherData.wind_speed * 10) / 10,
      cloudCover: weatherData.clouds,
      condition: weatherData.weather[0]?.main || 'Unknown',
      icon: weatherData.weather[0]?.icon || '01d',
      condensationRisk: risk,
      riskLevel: level
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Weather API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

