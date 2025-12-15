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
  dewPoint: number
  riskDescription: string
}

interface CondensationResult {
  risk: number
  level: 'low' | 'medium' | 'high'
  dewPoint: number
  glassTemp: number
  description: string
}

/**
 * Calculate condensation risk using physics-based model
 * 
 * Condensation occurs when: Glass Surface Temperature <= Dew Point
 * 
 * The algorithm accounts for:
 * 1. Dew point (Magnus formula) - temperature at which moisture condenses
 * 2. Radiative cooling - glass can cool 8-12°C below air temp on clear nights
 * 3. Cloud cover - clouds block infrared radiation, reducing cooling
 * 4. Wind speed - wind provides convective heating, reducing cooling
 * 5. Time of day - radiative cooling only happens at night/early morning
 */
function calculateCondensationRisk(
  temperature: number,
  humidity: number,
  windSpeed: number,
  cloudCover: number,
  matchHour: number
): CondensationResult {
  // Step 1: Calculate dew point using Magnus formula
  // This is the temperature at which air becomes saturated
  const b = 17.625
  const c = 243.04
  const alpha = Math.log(humidity / 100) + (b * temperature) / (c + temperature)
  const dewPoint = (c * alpha) / (b - alpha)
  
  // Step 2: Estimate radiative cooling potential
  // Glass can cool 8-12°C below air temp on clear, calm nights
  const maxCooling = 10 // °C - typical maximum for glass surfaces
  
  // Cloud factor: clouds block infrared radiation to space
  // 0% clouds = full cooling, 100% clouds = minimal cooling
  // Non-linear: even partial clouds significantly reduce cooling
  const cloudFactor = Math.pow(1 - cloudCover / 100, 1.5)
  
  // Wind factor: wind mixes air and provides convective heating
  // 0 m/s = full cooling potential, 5+ m/s = minimal cooling
  const windFactor = Math.max(0, 1 - windSpeed / 5)
  
  // Time factor: radiative cooling is a night/early morning phenomenon
  // Peak cooling occurs in pre-dawn hours when surfaces have cooled all night
  let timeFactor: number
  let timeContext: string
  
  if (matchHour >= 4 && matchHour <= 7) {
    timeFactor = 1.0  // Peak risk - pre-dawn, coldest surfaces
    timeContext = 'early morning'
  } else if (matchHour >= 20 || matchHour <= 3) {
    timeFactor = 0.85 // High risk - night, active cooling
    timeContext = 'night'
  } else if (matchHour >= 18 && matchHour <= 19) {
    timeFactor = 0.6  // Medium risk - evening, cooling starting
    timeContext = 'evening'
  } else if (matchHour >= 8 && matchHour <= 10) {
    timeFactor = 0.5  // Medium risk - morning, residual dew possible
    timeContext = 'morning'
  } else if (matchHour >= 16 && matchHour <= 17) {
    timeFactor = 0.3  // Low-medium - late afternoon
    timeContext = 'late afternoon'
  } else {
    timeFactor = 0.0  // Low risk - daytime, glass warmed by sun
    timeContext = 'daytime'
  }
  
  // Step 3: Calculate estimated glass surface temperature
  const coolingAmount = maxCooling * cloudFactor * windFactor * timeFactor
  const glassTemp = temperature - coolingAmount
  
  // Step 4: Calculate dew point margin
  // Negative = condensation certain, positive = safety buffer
  const margin = glassTemp - dewPoint
  
  // Step 5: Convert margin to risk score using exponential decay
  // margin <= 0: 100% (condensation certain)
  // margin = 2°C: ~37% 
  // margin = 5°C: ~8%
  // margin >= 8°C: ~0%
  let risk: number
  if (margin <= 0) {
    risk = 100
  } else if (margin >= 8) {
    risk = 0
  } else {
    risk = 100 * Math.exp(-margin / 2)
  }
  
  // Step 6: Apply humidity amplifier for very high humidity
  if (humidity > 90) {
    risk = Math.min(100, risk * 1.15)
  }
  
  risk = Math.round(Math.max(0, Math.min(100, risk)))
  
  // Determine risk level
  let level: 'low' | 'medium' | 'high'
  if (risk < 30) {
    level = 'low'
  } else if (risk < 60) {
    level = 'medium'
  } else {
    level = 'high'
  }
  
  // Generate contextual description
  let description: string
  if (risk >= 80) {
    if (cloudCover < 20 && windSpeed < 2) {
      description = 'Clear, calm conditions - glass walls likely wet'
    } else {
      description = 'High moisture risk - slippery walls expected'
    }
  } else if (risk >= 60) {
    description = `${timeContext.charAt(0).toUpperCase() + timeContext.slice(1)} condensation likely`
  } else if (risk >= 30) {
    if (windSpeed >= 3) {
      description = 'Some moisture possible, wind helping'
    } else {
      description = 'Moderate risk - check glass before play'
    }
  } else {
    if (timeFactor === 0) {
      description = 'Daytime conditions - glass should be dry'
    } else if (windSpeed >= 4) {
      description = 'Windy conditions keeping glass dry'
    } else if (cloudCover > 70) {
      description = 'Cloud cover reducing condensation risk'
    } else {
      description = 'Good conditions expected'
    }
  }
  
  console.log('Condensation calculation:', {
    inputs: { temperature, humidity, windSpeed, cloudCover, matchHour },
    factors: { cloudFactor: cloudFactor.toFixed(2), windFactor: windFactor.toFixed(2), timeFactor, timeContext },
    results: { dewPoint: dewPoint.toFixed(1), coolingAmount: coolingAmount.toFixed(1), glassTemp: glassTemp.toFixed(1), margin: margin.toFixed(1), risk }
  })
  
  return {
    risk,
    level,
    dewPoint: Math.round(dewPoint * 10) / 10,
    glassTemp: Math.round(glassTemp * 10) / 10,
    description
  }
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
      .select('location, date_time, club_id')
      .eq('id', matchId)
      .single()

    if (matchError || !match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      )
    }

    // Get location coordinates - try clubs table first (new system), then locations table (legacy)
    let location: { id: string; name: string; latitude: number | null; longitude: number | null } | null = null

    // If match has a club_id, get coordinates from clubs table
    if (match.club_id) {
      const { data: club } = await db
        .from('clubs')
        .select('id, name, latitude, longitude')
        .eq('id', match.club_id)
        .single()
      
      if (club) {
        location = club
      }
    }

    // If no club found, try to match by location name in clubs table
    if (!location) {
      const { data: clubByName } = await db
        .from('clubs')
        .select('id, name, latitude, longitude')
        .eq('name', match.location)
        .single()
      
      if (clubByName) {
        location = clubByName
      }
    }

    // Fall back to legacy locations table
    if (!location) {
      const { data: legacyLocation } = await db
        .from('locations')
        .select('id, name, latitude, longitude')
        .eq('name', match.location)
        .single()
      
      if (legacyLocation) {
        location = legacyLocation
      }
    }

    if (!location) {
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

    // Calculate condensation risk with time-of-day awareness
    const matchHour = matchTime.getHours()
    const { risk, level, dewPoint, description } = calculateCondensationRisk(
      weatherData.temp,
      weatherData.humidity,
      weatherData.wind_speed,
      weatherData.clouds,
      matchHour
    )

    // Cache the result (only works for legacy locations due to FK constraint)
    // TODO: Update weather_cache schema to support clubs table
    try {
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
    } catch (cacheError) {
      // Caching failed (likely due to FK constraint with clubs), continue without caching
      console.log('Weather cache upsert skipped:', cacheError)
    }

    const response: WeatherResponse = {
      temperature: Math.round(weatherData.temp),
      humidity: weatherData.humidity,
      windSpeed: Math.round(weatherData.wind_speed * 10) / 10,
      cloudCover: weatherData.clouds,
      condition: weatherData.weather[0]?.main || 'Unknown',
      icon: weatherData.weather[0]?.icon || '01d',
      condensationRisk: risk,
      riskLevel: level,
      dewPoint,
      riskDescription: description
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

