/**
 * Import Clubs to Supabase Database
 * 
 * Reads the processed clubs JSON from the scraper output and imports them
 * into the Supabase database. Handles deduplication by google_place_id.
 * 
 * Prerequisites:
 * 1. Run the scraper first: npx ts-node scripts/scrape-clubs.ts
 * 2. Set environment variables:
 *    - SUPABASE_URL
 *    - SUPABASE_SERVICE_ROLE_KEY (use service role for writes)
 * 
 * Usage:
 *   npx ts-node scripts/import-clubs.ts
 *   # or with specific file
 *   npx ts-node scripts/import-clubs.ts path/to/clubs.json
 */

import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

// Types
interface ClubImport {
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
  google_place_id: string | null
  num_courts: number | null
  court_type: string | null
  has_lighting: boolean
  amenities: string[]
  description: string | null
  image_url: string | null
  source: string
  verified: boolean
}

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Default input file
const DEFAULT_INPUT_FILE = path.join(__dirname, 'output', 'clubs-processed.json')

// Helper to make slugs unique
function makeSlugUnique(slug: string, existingSlugs: Set<string>): string {
  if (!existingSlugs.has(slug)) {
    return slug
  }
  
  let counter = 2
  let newSlug = `${slug}-${counter}`
  while (existingSlugs.has(newSlug)) {
    counter++
    newSlug = `${slug}-${counter}`
  }
  return newSlug
}

// Validate club data
function validateClub(club: ClubImport): string[] {
  const errors: string[] = []
  
  if (!club.name || club.name.trim().length === 0) {
    errors.push('Missing name')
  }
  
  if (!club.slug || club.slug.trim().length === 0) {
    errors.push('Missing slug')
  }
  
  if (club.latitude !== null && (club.latitude < -90 || club.latitude > 90)) {
    errors.push('Invalid latitude')
  }
  
  if (club.longitude !== null && (club.longitude < -180 || club.longitude > 180)) {
    errors.push('Invalid longitude')
  }
  
  if (club.court_type && !['indoor', 'outdoor', 'mixed'].includes(club.court_type)) {
    errors.push(`Invalid court_type: ${club.court_type}`)
  }
  
  return errors
}

// Main import function
async function importClubs(): Promise<void> {
  console.log('🎾 Starting Club Import to Supabase')
  console.log('=' .repeat(50))
  
  // Check configuration
  if (!SUPABASE_URL) {
    console.error('❌ SUPABASE_URL not set!')
    console.log('Set the environment variable:')
    console.log('  export SUPABASE_URL=your_supabase_url')
    process.exit(1)
  }
  
  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set!')
    console.log('Set the environment variable:')
    console.log('  export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key')
    process.exit(1)
  }
  
  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  
  // Determine input file
  const inputFile = process.argv[2] || DEFAULT_INPUT_FILE
  
  console.log(`📄 Reading clubs from: ${inputFile}`)
  
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ File not found: ${inputFile}`)
    console.log('\nRun the scraper first:')
    console.log('  npx ts-node scripts/scrape-clubs.ts')
    process.exit(1)
  }
  
  // Read and parse clubs
  const rawData = fs.readFileSync(inputFile, 'utf-8')
  const clubs: ClubImport[] = JSON.parse(rawData)
  
  console.log(`📊 Found ${clubs.length} clubs to import`)
  
  // Fetch existing clubs to check for duplicates
  console.log('\n🔍 Checking for existing clubs...')
  
  const { data: existingClubs, error: fetchError } = await supabase
    .from('clubs')
    .select('id, slug, google_place_id')
  
  if (fetchError) {
    console.error('❌ Failed to fetch existing clubs:', fetchError.message)
    process.exit(1)
  }
  
  const existingPlaceIds = new Set(
    (existingClubs || [])
      .filter(c => c.google_place_id)
      .map(c => c.google_place_id)
  )
  
  const existingSlugs = new Set(
    (existingClubs || []).map(c => c.slug)
  )
  
  console.log(`  Existing clubs in database: ${existingClubs?.length || 0}`)
  
  // Process clubs
  const toInsert: ClubImport[] = []
  const toUpdate: (ClubImport & { existing_id: string })[] = []
  const skipped: { club: ClubImport; reason: string }[] = []
  const validationErrors: { club: ClubImport; errors: string[] }[] = []
  
  for (const club of clubs) {
    // Validate
    const errors = validateClub(club)
    if (errors.length > 0) {
      validationErrors.push({ club, errors })
      continue
    }
    
    // Check for existing by google_place_id
    if (club.google_place_id && existingPlaceIds.has(club.google_place_id)) {
      const existing = existingClubs?.find(c => c.google_place_id === club.google_place_id)
      if (existing) {
        toUpdate.push({ ...club, existing_id: existing.id })
      }
      continue
    }
    
    // Make slug unique
    const uniqueSlug = makeSlugUnique(club.slug, existingSlugs)
    if (uniqueSlug !== club.slug) {
      console.log(`  ⚠️  Slug collision for "${club.name}": ${club.slug} -> ${uniqueSlug}`)
      club.slug = uniqueSlug
    }
    existingSlugs.add(uniqueSlug)
    
    toInsert.push(club)
  }
  
  console.log(`\n📋 Import Plan:`)
  console.log(`  New clubs to insert: ${toInsert.length}`)
  console.log(`  Existing clubs to update: ${toUpdate.length}`)
  console.log(`  Validation errors: ${validationErrors.length}`)
  
  // Show validation errors
  if (validationErrors.length > 0) {
    console.log('\n⚠️  Validation Errors:')
    for (const { club, errors } of validationErrors.slice(0, 5)) {
      console.log(`  ${club.name}: ${errors.join(', ')}`)
    }
    if (validationErrors.length > 5) {
      console.log(`  ... and ${validationErrors.length - 5} more`)
    }
  }
  
  // Insert new clubs
  if (toInsert.length > 0) {
    console.log(`\n📥 Inserting ${toInsert.length} new clubs...`)
    
    // Insert in batches of 50
    const batchSize = 50
    let inserted = 0
    let insertErrors = 0
    
    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize)
      
      const { data, error } = await supabase
        .from('clubs')
        .insert(batch)
        .select('id, name')
      
      if (error) {
        console.error(`  ❌ Batch insert failed:`, error.message)
        insertErrors += batch.length
        
        // Try inserting individually to find problematic records
        for (const club of batch) {
          const { error: singleError } = await supabase
            .from('clubs')
            .insert(club)
          
          if (singleError) {
            console.error(`    ❌ Failed: ${club.name} - ${singleError.message}`)
          } else {
            inserted++
          }
        }
      } else {
        inserted += data?.length || 0
        console.log(`  ✓ Inserted batch ${Math.floor(i / batchSize) + 1}: ${data?.length || 0} clubs`)
      }
    }
    
    console.log(`  Total inserted: ${inserted}`)
    if (insertErrors > 0) {
      console.log(`  Errors: ${insertErrors}`)
    }
  }
  
  // Update existing clubs
  if (toUpdate.length > 0) {
    console.log(`\n📝 Updating ${toUpdate.length} existing clubs...`)
    
    let updated = 0
    let updateErrors = 0
    
    for (const club of toUpdate) {
      const { existing_id, ...clubData } = club
      
      const { error } = await supabase
        .from('clubs')
        .update(clubData)
        .eq('id', existing_id)
      
      if (error) {
        console.error(`  ❌ Update failed for ${club.name}: ${error.message}`)
        updateErrors++
      } else {
        updated++
      }
    }
    
    console.log(`  Total updated: ${updated}`)
    if (updateErrors > 0) {
      console.log(`  Errors: ${updateErrors}`)
    }
  }
  
  // Final summary
  console.log('\n' + '=' .repeat(50))
  console.log('✅ Import Complete!')
  console.log('=' .repeat(50))
  
  // Verify final count
  const { count } = await supabase
    .from('clubs')
    .select('*', { count: 'exact', head: true })
  
  console.log(`\nTotal clubs in database: ${count}`)
  
  // Show clubs by district
  const { data: districtCounts } = await supabase
    .from('clubs')
    .select('district_id')
  
  if (districtCounts) {
    const byDistrict: Record<string, number> = {}
    for (const club of districtCounts) {
      const d = club.district_id || 'unknown'
      byDistrict[d] = (byDistrict[d] || 0) + 1
    }
    
    console.log('\nClubs by district:')
    const sorted = Object.entries(byDistrict).sort((a, b) => b[1] - a[1])
    for (const [district, count] of sorted.slice(0, 10)) {
      console.log(`  ${district}: ${count}`)
    }
  }
}

// Run the import
importClubs().catch(console.error)
