/**
 * Padel Club Scraper for Portugal
 * 
 * Uses Google Places API to find padel clubs across all Portuguese districts.
 * Outputs JSON files for review before importing to database.
 * 
 * Prerequisites:
 * 1. Set GOOGLE_PLACES_API_KEY environment variable
 * 2. Install dependencies: npm install node-fetch@2
 * 
 * Usage:
 *   npx ts-node scripts/scrape-clubs.ts
 *   # or
 *   GOOGLE_PLACES_API_KEY=your_key npx ts-node scripts/scrape-clubs.ts
 * 
 * Output:
 *   - scripts/output/clubs-raw.json (raw API responses)
 *   - scripts/output/clubs-processed.json (processed for import)
 */

import * as fs from 'fs'
import * as path from 'path'

// Use native fetch (Node 18+) or provide a type
declare const fetch: typeof globalThis.fetch

// Types for Google Places API
interface PlaceSearchResult {
  place_id: string
  name: string
  formatted_address: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  types: string[]
  business_status?: string
  rating?: number
  user_ratings_total?: number
}

interface PlaceDetails {
  place_id: string
  name: string
  formatted_address: string
  formatted_phone_number?: string
  international_phone_number?: string
  website?: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  address_components?: {
    long_name: string
    short_name: string
    types: string[]
  }[]
  opening_hours?: {
    open_now?: boolean
    weekday_text?: string[]
  }
  photos?: {
    photo_reference: string
    height: number
    width: number
  }[]
  rating?: number
  user_ratings_total?: number
  types: string[]
}

interface ScrapedClub {
  name: string
  slug: string
  website: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  district_id: string | null
  postal_code: string | null
  country: string
  latitude: number | null
  longitude: number | null
  google_place_id: string
  num_courts: number | null
  court_type: string | null
  has_lighting: boolean
  amenities: string[]
  description: string | null
  image_url: string | null
  source: string
  verified: boolean
}

// Portuguese districts with search locations
const PORTUGUESE_DISTRICTS = [
  { id: 'porto', name: 'Porto', searchArea: 'Porto, Portugal' },
  { id: 'braga', name: 'Braga', searchArea: 'Braga, Portugal' },
  { id: 'viana_do_castelo', name: 'Viana do Castelo', searchArea: 'Viana do Castelo, Portugal' },
  { id: 'vila_real', name: 'Vila Real', searchArea: 'Vila Real, Portugal' },
  { id: 'braganca', name: 'Bragança', searchArea: 'Bragança, Portugal' },
  { id: 'aveiro', name: 'Aveiro', searchArea: 'Aveiro, Portugal' },
  { id: 'viseu', name: 'Viseu', searchArea: 'Viseu, Portugal' },
  { id: 'guarda', name: 'Guarda', searchArea: 'Guarda, Portugal' },
  { id: 'coimbra', name: 'Coimbra', searchArea: 'Coimbra, Portugal' },
  { id: 'castelo_branco', name: 'Castelo Branco', searchArea: 'Castelo Branco, Portugal' },
  { id: 'leiria', name: 'Leiria', searchArea: 'Leiria, Portugal' },
  { id: 'santarem', name: 'Santarém', searchArea: 'Santarém, Portugal' },
  { id: 'lisboa', name: 'Lisboa', searchArea: 'Lisbon, Portugal' },
  { id: 'setubal', name: 'Setúbal', searchArea: 'Setúbal, Portugal' },
  { id: 'portalegre', name: 'Portalegre', searchArea: 'Portalegre, Portugal' },
  { id: 'evora', name: 'Évora', searchArea: 'Évora, Portugal' },
  { id: 'beja', name: 'Beja', searchArea: 'Beja, Portugal' },
  { id: 'faro', name: 'Faro (Algarve)', searchArea: 'Algarve, Portugal' },
  { id: 'madeira', name: 'Madeira', searchArea: 'Madeira, Portugal' },
  { id: 'acores', name: 'Açores', searchArea: 'Azores, Portugal' },
]

// API configuration
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || ''
const GOOGLE_PLACES_BASE_URL = 'https://maps.googleapis.com/maps/api/place'

// Rate limiting
const DELAY_BETWEEN_REQUESTS = 200 // ms
const DELAY_BETWEEN_DISTRICTS = 1000 // ms

// Helper to slugify names
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// Helper to extract city from address components
function extractCity(addressComponents?: PlaceDetails['address_components']): string | null {
  if (!addressComponents) return null
  
  // Try locality first, then administrative_area_level_2
  const locality = addressComponents.find(c => c.types.includes('locality'))
  if (locality) return locality.long_name
  
  const adminArea = addressComponents.find(c => c.types.includes('administrative_area_level_2'))
  if (adminArea) return adminArea.long_name
  
  return null
}

// Helper to extract postal code
function extractPostalCode(addressComponents?: PlaceDetails['address_components']): string | null {
  if (!addressComponents) return null
  
  const postalCode = addressComponents.find(c => c.types.includes('postal_code'))
  return postalCode?.long_name || null
}

// Helper to determine district from coordinates or address
function determineDistrict(lat: number, lng: number, address: string): string | null {
  // Simple heuristic based on latitude/longitude ranges for Portugal
  // Algarve (southernmost)
  if (lat < 37.5) return 'faro'
  
  // Lisbon area
  if (lat >= 38.5 && lat <= 39.2 && lng >= -9.5 && lng <= -8.8) return 'lisboa'
  
  // Porto area
  if (lat >= 41.0 && lat <= 41.4 && lng >= -8.8 && lng <= -8.4) return 'porto'
  
  // Check address for district names
  const addressLower = address.toLowerCase()
  for (const district of PORTUGUESE_DISTRICTS) {
    if (addressLower.includes(district.name.toLowerCase())) {
      return district.id
    }
  }
  
  // Default based on latitude bands
  if (lat < 38.0) return 'faro'
  if (lat < 39.5) return 'lisboa'
  if (lat < 40.5) return 'coimbra'
  return 'porto'
}

// Sleep helper
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Text Search for padel clubs in an area
async function searchPlaces(query: string, location: string): Promise<PlaceSearchResult[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    console.log(`  ⚠️  No API key - would search for: "${query}" in ${location}`)
    return []
  }
  
  const url = new URL(`${GOOGLE_PLACES_BASE_URL}/textsearch/json`)
  url.searchParams.set('query', `${query} ${location}`)
  url.searchParams.set('key', GOOGLE_PLACES_API_KEY)
  url.searchParams.set('language', 'pt')
  url.searchParams.set('type', 'sports_club')
  
  try {
    const response = await fetch(url.toString())
    const data = await response.json()
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error(`  ❌ API Error: ${data.status} - ${data.error_message || 'Unknown error'}`)
      return []
    }
    
    return data.results || []
  } catch (error) {
    console.error(`  ❌ Request failed:`, error)
    return []
  }
}

// Get detailed place information
async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  if (!GOOGLE_PLACES_API_KEY) {
    return null
  }
  
  const url = new URL(`${GOOGLE_PLACES_BASE_URL}/details/json`)
  url.searchParams.set('place_id', placeId)
  url.searchParams.set('key', GOOGLE_PLACES_API_KEY)
  url.searchParams.set('language', 'pt')
  url.searchParams.set('fields', 'place_id,name,formatted_address,formatted_phone_number,international_phone_number,website,geometry,address_components,opening_hours,photos,rating,user_ratings_total,types')
  
  try {
    const response = await fetch(url.toString())
    const data = await response.json()
    
    if (data.status !== 'OK') {
      console.error(`    ❌ Details API Error: ${data.status}`)
      return null
    }
    
    return data.result
  } catch (error) {
    console.error(`    ❌ Details request failed:`, error)
    return null
  }
}

// Process a place into our club format
function processPlace(details: PlaceDetails, districtId: string): ScrapedClub {
  const lat = details.geometry?.location?.lat || null
  const lng = details.geometry?.location?.lng || null
  
  return {
    name: details.name,
    slug: slugify(details.name),
    website: details.website || null,
    phone: details.international_phone_number || details.formatted_phone_number || null,
    email: null, // Not available from Places API
    address: details.formatted_address || null,
    city: extractCity(details.address_components),
    district_id: lat && lng ? determineDistrict(lat, lng, details.formatted_address || '') : districtId,
    postal_code: extractPostalCode(details.address_components),
    country: 'Portugal',
    latitude: lat,
    longitude: lng,
    google_place_id: details.place_id,
    num_courts: null, // Not available from Places API
    court_type: null, // Not available from Places API
    has_lighting: true, // Assume true by default
    amenities: [], // Would need manual verification
    description: null,
    image_url: details.photos?.[0]?.photo_reference 
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${details.photos[0].photo_reference}&key=${GOOGLE_PLACES_API_KEY}`
      : null,
    source: 'google_places',
    verified: false,
  }
}

// Main scraping function
async function scrapeClubs(): Promise<void> {
  console.log('🎾 Starting Portugal Padel Club Scraper')
  console.log('=' .repeat(50))
  
  if (!GOOGLE_PLACES_API_KEY) {
    console.log('\n⚠️  GOOGLE_PLACES_API_KEY not set!')
    console.log('Running in dry-run mode - no actual API calls will be made.')
    console.log('Set the environment variable to enable real scraping:\n')
    console.log('  export GOOGLE_PLACES_API_KEY=your_api_key')
    console.log('  npx ts-node scripts/scrape-clubs.ts\n')
  }
  
  const allResults: PlaceSearchResult[] = []
  const allClubs: ScrapedClub[] = []
  const seenPlaceIds = new Set<string>()
  
  // Search queries to use
  const searchQueries = ['padel', 'padel club', 'padel court']
  
  for (const district of PORTUGUESE_DISTRICTS) {
    console.log(`\n📍 Searching in ${district.name}...`)
    
    for (const query of searchQueries) {
      console.log(`  🔍 Query: "${query}"`)
      
      const results = await searchPlaces(query, district.searchArea)
      
      // Filter for padel-related results and deduplicate
      for (const result of results) {
        if (seenPlaceIds.has(result.place_id)) {
          continue
        }
        
        // Check if it's padel-related
        const nameLower = result.name.toLowerCase()
        if (!nameLower.includes('padel') && !nameLower.includes('paddle')) {
          continue
        }
        
        seenPlaceIds.add(result.place_id)
        allResults.push(result)
        
        console.log(`    ✓ Found: ${result.name}`)
        
        // Get detailed information
        await sleep(DELAY_BETWEEN_REQUESTS)
        const details = await getPlaceDetails(result.place_id)
        
        if (details) {
          const club = processPlace(details, district.id)
          allClubs.push(club)
        }
      }
      
      await sleep(DELAY_BETWEEN_REQUESTS)
    }
    
    await sleep(DELAY_BETWEEN_DISTRICTS)
  }
  
  // Create output directory
  const outputDir = path.join(__dirname, 'output')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  // Write raw results
  const rawOutputPath = path.join(outputDir, 'clubs-raw.json')
  fs.writeFileSync(rawOutputPath, JSON.stringify(allResults, null, 2))
  console.log(`\n📄 Raw results saved to: ${rawOutputPath}`)
  
  // Write processed clubs
  const processedOutputPath = path.join(outputDir, 'clubs-processed.json')
  fs.writeFileSync(processedOutputPath, JSON.stringify(allClubs, null, 2))
  console.log(`📄 Processed clubs saved to: ${processedOutputPath}`)
  
  // Summary
  console.log('\n' + '=' .repeat(50))
  console.log('📊 Scraping Summary')
  console.log('=' .repeat(50))
  console.log(`Total places found: ${allResults.length}`)
  console.log(`Unique clubs processed: ${allClubs.length}`)
  
  // Group by district
  const byDistrict: Record<string, number> = {}
  for (const club of allClubs) {
    const districtId = club.district_id || 'unknown'
    byDistrict[districtId] = (byDistrict[districtId] || 0) + 1
  }
  
  console.log('\nClubs by district:')
  for (const [district, count] of Object.entries(byDistrict).sort((a, b) => b[1] - a[1])) {
    const districtName = PORTUGUESE_DISTRICTS.find(d => d.id === district)?.name || district
    console.log(`  ${districtName}: ${count}`)
  }
  
  console.log('\n✅ Scraping complete!')
  console.log('\nNext steps:')
  console.log('1. Review the output files in scripts/output/')
  console.log('2. Make any manual corrections needed')
  console.log('3. Run the import script: npx ts-node scripts/import-clubs.ts')
}

// Run the scraper
scrapeClubs().catch(console.error)
