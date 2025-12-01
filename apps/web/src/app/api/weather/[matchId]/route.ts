import { NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy initialization of Supabase client to avoid build-time errors
let supabase: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing')
    }
    
    supabase = createClient(supabaseUrl, supabaseServiceKey)
  }
  return supabase
}

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

// Disable Next.js caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: Request,
  { params }: { params: { matchId: string } }
) {
  try {
    const { matchId } = params
    
    if (!matchId) {
      return NextResponse.json(
        { error: 'Match ID is required' },
        { status: 400, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      )
    }

    const db = getSupabaseClient()
    const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY

    // Get match details - always fetch fresh from database
    const { data: match, error: matchError } = await db
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
    const { data: location, error: locationError } = await db
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
    const hoursUntilMatch = (matchTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    console.log('Weather API debug:', {
      matchId,
      matchDateTime: match.date_time,
      matchTimeParsed: matchTime.toISOString(),
      nowTime: now.toISOString(),
      hoursUntilMatch: hoursUntilMatch.toFixed(2),
      location: location.name,
      lat: location.latitude,
      lon: location.longitude
    })
    
    // Round forecast time to nearest 3 hours (OpenWeatherMap forecast resolution)
    const forecastHour = Math.round(matchTime.getHours() / 3) * 3
    const forecastTime = new Date(matchTime)
    forecastTime.setHours(forecastHour, 0, 0, 0)

    // Check cache first (skip cache for now to debug)
    // const { data: cached } = await db
    //   .from('weather_cache')
    //   .select('*')
    //   .eq('location_id', location.id)
    //   .eq('forecast_time', forecastTime.toISOString())
    //   .gte('fetched_at', new Date(now.getTime() - CACHE_DURATION_MS).toISOString())
    //   .single()
    // 
    // if (cached) {
    //   const response: WeatherResponse = {
    //     temperature: parseFloat(cached.temperature),
    //     humidity: cached.humidity,
    //     windSpeed: parseFloat(cached.wind_speed),
    //     cloudCover: cached.cloud_cover,
    //     condition: cached.weather_condition,
    //     icon: cached.weather_icon,
    //     condensationRisk: cached.condensation_risk,
    //     riskLevel: cached.condensation_risk < 30 ? 'low' : cached.condensation_risk < 60 ? 'medium' : 'high'
    //   }
    //   return NextResponse.json(response)
    // }

    // Check if we have an API key
    if (!OPENWEATHERMAP_API_KEY) {
      console.error('Weather API: No API key configured')
      return NextResponse.json(
        { error: 'Weather API not configured', message: 'Weather service not available' },
        { status: 503 }
      )
    }

    // Determine if we need current weather or forecast
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
        const errorData = await response.json().catch(() => ({}))
        console.error('OpenWeatherMap current weather error:', response.status, errorData)
        return NextResponse.json(
          { error: 'Failed to fetch weather data', message: errorData.message || 'Weather service unavailable' },
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
    } else if (hoursUntilMatch <= 120) {
      // Within 5 days (120 hours) - use 5-day forecast (OpenWeatherMap free tier)
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${location.latitude}&lon=${location.longitude}&units=metric&appid=${OPENWEATHERMAP_API_KEY}`
      
      const response = await fetch(forecastUrl)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('OpenWeatherMap forecast error:', response.status, errorData)
        return NextResponse.json(
          { error: 'Failed to fetch forecast data', message: errorData.message || 'Forecast service unavailable' },
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
      // More than 5 days - forecast not available
      console.log('Weather API: Match too far in future', { hoursUntilMatch })
      return NextResponse.json(
        { error: 'Forecast not available yet', message: `Match is ${Math.round(hoursUntilMatch / 24)} days away. Weather available within 5 days.` },
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
    await db.from('weather_cache').upsert({
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

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    })
  } catch (error) {
    console.error('Weather API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

