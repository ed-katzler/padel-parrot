import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Supabase setup - Production PadelParrot V2
const supabaseUrl = 'https://rrplznheygdwxkpysevj.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Allow dry-run without service key
if (!supabaseServiceKey && !process.argv.includes('--dry-run')) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  console.error('Set it with: export SUPABASE_SERVICE_ROLE_KEY="your-key-here"')
  console.error('\nOr run with --dry-run to preview matches without uploading')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey || 'dummy-key-for-dry-run')

const IMAGE_DIR = '/Users/edkatzler/Downloads/racket-images'
const BUCKET_NAME = 'racket-images'
const MIN_FILE_SIZE = 50000 // Skip thumbnails (< 50KB)
const DRY_RUN = process.argv.includes('--dry-run')

interface Racket {
  id: string
  brand: string
  model: string
  image_url: string | null
}

// Normalize string for matching (lowercase, remove special chars, normalize spaces)
function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Extract brand and model keywords from filename
function extractKeywords(filename: string): string[] {
  const normalized = normalize(filename)
  // Remove common suffixes and prefixes
  const cleaned = normalized
    .replace(/\d{5,}/g, ' ') // Remove long numbers (product codes)
    .replace(/1500x1500|1200x1200|vista1|vista|pala|padel/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  
  return cleaned.split(' ').filter(w => w.length > 1)
}

// Calculate match score between filename and racket
function calculateMatchScore(filename: string, racket: Racket): number {
  const lowerFile = filename.toLowerCase()
  const brandLower = racket.brand.toLowerCase()
  const modelLower = racket.model.toLowerCase()
  
  let score = 0
  
  // Brand match is required
  if (!lowerFile.includes(brandLower)) {
    return 0
  }
  score += 50
  
  // Model-specific matching based on brand
  if (brandLower === 'adidas') {
    if (lowerFile.includes('metalbone') && modelLower.includes('metalbone')) {
      score += 40
      if (lowerFile.includes('hrd') && modelLower.includes('hrd')) score += 30
      if (lowerFile.includes('ctrl') && modelLower.includes('ctrl')) score += 30
      if (lowerFile.includes('carbon') && modelLower.includes('carbon')) score += 30
      // Version: 3_3 or 3-4 patterns
      if ((lowerFile.includes('3_3') || lowerFile.includes('3-3')) && modelLower.includes('3.3')) score += 25
      if ((lowerFile.includes('3_4') || lowerFile.includes('3-4')) && modelLower.includes('3.4')) score += 25
    }
    if (lowerFile.includes('adipower') && modelLower.includes('adipower')) {
      score += 40
      if (lowerFile.includes('multiweight') && modelLower.includes('multiweight')) score += 30
      if (lowerFile.includes('carbon') && modelLower.includes('carbon')) score += 30
      if (lowerFile.includes('ctrl') && modelLower.includes('ctrl')) score += 30
      if (lowerFile.includes('light') && modelLower.includes('light')) score += 25
    }
  }
  
  if (brandLower === 'bullpadel') {
    if (lowerFile.includes('hack') && modelLower.includes('hack')) {
      score += 40
      if (lowerFile.includes('04_25') || lowerFile.includes('04-25')) {
        if (modelLower.includes('04 25')) score += 30
      }
      if (lowerFile.includes('03_24') || lowerFile.includes('03-24')) {
        // Hack 03 24 not in our DB, but could match Hack 04 with penalty
        if (modelLower.includes('04')) score += 10
      }
      if (lowerFile.includes('comfort') && modelLower.includes('comfort')) score += 25
      if (lowerFile.includes('hybrid') && modelLower.includes('hybrid')) score += 25
    }
    if (lowerFile.includes('vertex') && modelLower.includes('vertex')) {
      score += 40
      if (lowerFile.includes('04') && modelLower.includes('04')) score += 25
      if (lowerFile.includes('05') && modelLower.includes('05')) score += 25
      if (lowerFile.includes('comfort') && modelLower.includes('comfort')) score += 20
    }
    if (lowerFile.includes('neuron') && modelLower.includes('neuron')) {
      score += 40
      if (lowerFile.includes('edge') && modelLower.includes('edge')) score += 30
      if (lowerFile.includes('02') && modelLower.includes('02')) score += 20
    }
    if (lowerFile.includes('xplo') && modelLower.includes('xplo')) {
      score += 40
      if (lowerFile.includes('comfort') && modelLower.includes('comfort')) score += 25
    }
    if (lowerFile.includes('elite') && modelLower.includes('elite')) {
      score += 35
    }
  }
  
  if (brandLower === 'head') {
    if (lowerFile.includes('coello') && modelLower.includes('coello')) {
      score += 40
      if (lowerFile.includes('motion') && modelLower.includes('motion')) score += 30
      if (lowerFile.includes('pro') && modelLower.includes('pro')) score += 30
      if (lowerFile.includes('team') && modelLower.includes('team')) score += 30
    }
  }
  
  if (brandLower === 'babolat') {
    if (lowerFile.includes('viper') && modelLower.includes('viper')) {
      score += 40
      if (lowerFile.includes('technical') && modelLower.includes('technical')) score += 30
      if (lowerFile.includes('counter') && modelLower.includes('counter')) score += 30
      if (lowerFile.includes('air') && modelLower.includes('air')) score += 30
      if ((lowerFile.includes('lebron') || lowerFile.includes('juan')) && modelLower.includes('lebrón')) score += 35
    }
  }
  
  if (brandLower === 'nox') {
    if (lowerFile.includes('ml10') && modelLower.includes('ml10')) {
      score += 40
      if (lowerFile.includes('pro') && lowerFile.includes('cup') && modelLower.includes('pro cup')) score += 30
      if (lowerFile.includes('quantum') && modelLower.includes('quantum')) score += 30
      if (lowerFile.includes('rough') && modelLower.includes('rough')) score += 25
      if (lowerFile.includes('light') && modelLower.includes('light')) score += 25
    }
    if (lowerFile.includes('at10') && modelLower.includes('at10')) {
      score += 40
      if (lowerFile.includes('genius') && modelLower.includes('genius')) score += 30
      if (lowerFile.includes('12k') && modelLower.includes('12k')) score += 25
      if (lowerFile.includes('18k') && modelLower.includes('18k')) score += 25
      if (lowerFile.includes('attack') && modelLower.includes('attack')) score += 25
      if (lowerFile.includes('alum') && modelLower.includes('alum')) score += 20
    }
  }
  
  // Year matching
  const years = ['2024', '2025', '24', '25', '26']
  for (const year of years) {
    if (lowerFile.includes(year)) {
      const fullYear = year.length === 2 ? `20${year}` : year
      const shortYear = year.length === 4 ? year.slice(2) : year
      if (modelLower.includes(fullYear) || modelLower.includes(shortYear)) {
        score += 15
      }
    }
  }
  
  return score
}

async function main() {
  console.log('🎾 Starting racket image import from local files...')
  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n')
  } else {
    console.log('')
  }
  
  // Get all rackets
  let rackets: Racket[]
  
  if (DRY_RUN) {
    // Hardcoded racket list for dry-run mode (from production DB)
    rackets = [
      { id: '1', brand: 'Adidas', model: 'Adipower Multiweight 3.3', image_url: null },
      { id: '2', brand: 'Adidas', model: 'Adipower Multiweight CTRL 3.4', image_url: null },
      { id: '3', brand: 'Adidas', model: 'Cross IT CTRL 3.4', image_url: null },
      { id: '4', brand: 'Adidas', model: 'Cross IT Light 3.4 (M. Ortega)', image_url: null },
      { id: '5', brand: 'Adidas', model: 'Cross IT Team 3.4', image_url: null },
      { id: '6', brand: 'Adidas', model: 'Cross IT Team Light 3.4', image_url: null },
      { id: '7', brand: 'Adidas', model: 'Match Black 3.4', image_url: null },
      { id: '8', brand: 'Adidas', model: 'Match Blue 3.4', image_url: null },
      { id: '9', brand: 'Adidas', model: 'Metalbone 3.4', image_url: null },
      { id: '10', brand: 'Adidas', model: 'Metalbone Carbon 3.4', image_url: null },
      { id: '11', brand: 'Adidas', model: 'Metalbone Carbon CTRL 3.4', image_url: null },
      { id: '12', brand: 'Adidas', model: 'Metalbone CTRL 3.4', image_url: null },
      { id: '13', brand: 'Adidas', model: 'Metalbone HRD+ 3.4 (Ale Galán)', image_url: null },
      { id: '14', brand: 'Babolat', model: 'Air Veron 25', image_url: null },
      { id: '15', brand: 'Babolat', model: 'Air Vertuo 25', image_url: null },
      { id: '16', brand: 'Babolat', model: 'Air Viper 25', image_url: null },
      { id: '17', brand: 'Babolat', model: 'Counter Veron 25', image_url: null },
      { id: '18', brand: 'Babolat', model: 'Counter Vertuo 25', image_url: null },
      { id: '19', brand: 'Babolat', model: 'Counter Viper 25', image_url: null },
      { id: '20', brand: 'Babolat', model: 'Technical Veron 25', image_url: null },
      { id: '21', brand: 'Babolat', model: 'Technical Vertuo 25', image_url: null },
      { id: '22', brand: 'Babolat', model: 'Technical Viper 25 (J. Lebrón)', image_url: null },
      { id: '23', brand: 'Bullpadel', model: 'BP10 Evo 25', image_url: null },
      { id: '24', brand: 'Bullpadel', model: 'Elite W 25', image_url: null },
      { id: '25', brand: 'Bullpadel', model: 'Elite W 26', image_url: null },
      { id: '26', brand: 'Bullpadel', model: 'Flow Legend 26', image_url: null },
      { id: '27', brand: 'Bullpadel', model: 'Flow Woman 25', image_url: null },
      { id: '28', brand: 'Bullpadel', model: 'Hack 04 25', image_url: null },
      { id: '29', brand: 'Bullpadel', model: 'Hack 04 26', image_url: null },
      { id: '30', brand: 'Bullpadel', model: 'Hack 04 Comfort 26', image_url: null },
      { id: '31', brand: 'Bullpadel', model: 'Hack 04 Hybrid 25', image_url: null },
      { id: '32', brand: 'Bullpadel', model: 'Hack 04 Hybrid 26', image_url: null },
      { id: '33', brand: 'Bullpadel', model: 'Neuron 02 26', image_url: null },
      { id: '34', brand: 'Bullpadel', model: 'Neuron 02 Edge 26', image_url: null },
      { id: '35', brand: 'Bullpadel', model: 'Vertex 04 25', image_url: null },
      { id: '36', brand: 'Bullpadel', model: 'Vertex 04 Comfort 25', image_url: null },
      { id: '37', brand: 'Bullpadel', model: 'Vertex 04 Hybrid 25', image_url: null },
      { id: '38', brand: 'Bullpadel', model: 'Vertex 04 W 25', image_url: null },
      { id: '39', brand: 'Bullpadel', model: 'Vertex 05 26', image_url: null },
      { id: '40', brand: 'Bullpadel', model: 'Xplo 25', image_url: null },
      { id: '41', brand: 'Bullpadel', model: 'Xplo Comfort 25', image_url: null },
      { id: '42', brand: 'Head', model: 'Coello Motion 2025', image_url: null },
      { id: '43', brand: 'Head', model: 'Coello Pro 2025', image_url: null },
      { id: '44', brand: 'Head', model: 'Coello Team 2025', image_url: null },
      { id: '45', brand: 'Nox', model: 'AT10 Genius 12K 2024', image_url: null },
      { id: '46', brand: 'Nox', model: 'AT10 Genius 12K 2025', image_url: null },
      { id: '47', brand: 'Nox', model: 'AT10 Genius 18K Alum 2024', image_url: null },
      { id: '48', brand: 'Nox', model: 'AT10 Genius 18K Alum 2025', image_url: null },
      { id: '49', brand: 'Nox', model: 'ML10 Pro Cup 2024', image_url: null },
      // More rackets exist but this is a sample for dry-run
    ]
    console.log(`Using hardcoded racket list for dry-run (${rackets.length} sample rackets)\n`)
  } else {
    const { data, error } = await supabase
      .from('rackets')
      .select('id, brand, model, image_url')
      .order('brand, model')
    
    if (error || !data) {
      console.error('Failed to fetch rackets:', error)
      process.exit(1)
    }
    rackets = data
    console.log(`Found ${rackets.length} rackets in database\n`)
  }
  
  // Get all image files (skip thumbnails and duplicates)
  const allFiles = fs.readdirSync(IMAGE_DIR)
  const imageFiles = allFiles.filter(f => {
    if (!f.endsWith('.jpg') && !f.endsWith('.jpeg') && !f.endsWith('.png')) return false
    const stats = fs.statSync(path.join(IMAGE_DIR, f))
    if (stats.size < MIN_FILE_SIZE) return false
    // Skip duplicate files with (1), (2) suffixes if original exists
    if (f.match(/\s\(\d+\)\./)) {
      const original = f.replace(/\s\(\d+\)\./, '.')
      if (allFiles.includes(original)) return false
    }
    return true
  })
  
  console.log(`Found ${imageFiles.length} valid image files (>50KB, no duplicates)\n`)
  
  // Match images to rackets
  const matches: Map<string, { file: string, score: number }> = new Map()
  const unmatchedFiles: string[] = []
  
  for (const file of imageFiles) {
    let bestMatch: { racket: Racket, score: number } | null = null
    
    for (const racket of rackets) {
      const score = calculateMatchScore(file, racket)
      if (score >= 60 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { racket, score }
      }
    }
    
    if (bestMatch) {
      const existing = matches.get(bestMatch.racket.id)
      if (!existing || bestMatch.score > existing.score) {
        matches.set(bestMatch.racket.id, { file, score: bestMatch.score })
      }
    } else {
      unmatchedFiles.push(file)
    }
  }
  
  console.log(`Matched ${matches.size} images to rackets\n`)
  console.log('Matches:')
  
  // Upload matched images and update rackets
  let uploaded = 0
  let failed = 0
  
  for (const [racketId, { file, score }] of matches) {
    const racket = rackets.find(r => r.id === racketId)!
    console.log(`  ✓ ${racket.brand} ${racket.model} <- ${file.substring(0, 60)}... (score: ${score})`)
    
    if (DRY_RUN) {
      uploaded++
      continue
    }
    
    try {
      // Read file
      const filePath = path.join(IMAGE_DIR, file)
      const fileBuffer = fs.readFileSync(filePath)
      
      // Generate clean filename
      const cleanName = `${racket.brand.toLowerCase()}-${racket.model.toLowerCase()}`
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') + '.jpg'
      
      // Upload to Supabase
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(cleanName, fileBuffer, {
          contentType: 'image/jpeg',
          upsert: true
        })
      
      if (uploadError) {
        console.error(`    Failed to upload: ${uploadError.message}`)
        failed++
        continue
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(cleanName)
      
      // Update racket record
      const { error: updateError } = await supabase
        .from('rackets')
        .update({ image_url: urlData.publicUrl })
        .eq('id', racketId)
      
      if (updateError) {
        console.error(`    Failed to update record: ${updateError.message}`)
        failed++
      } else {
        uploaded++
      }
      
    } catch (err) {
      console.error(`    Error processing: ${err}`)
      failed++
    }
  }
  
  // Clear images for unmatched rackets
  const matchedIds = new Set(matches.keys())
  const unmatchedRackets = rackets.filter(r => !matchedIds.has(r.id))
  
  console.log(`\n📭 ${DRY_RUN ? 'Would clear' : 'Clearing'} images for ${unmatchedRackets.length} rackets without matches:`)
  
  let cleared = 0
  for (const racket of unmatchedRackets) {
    console.log(`  ✗ ${racket.brand} ${racket.model}`)
    
    if (DRY_RUN) {
      cleared++
      continue
    }
    
    const { error: clearError } = await supabase
      .from('rackets')
      .update({ image_url: null })
      .eq('id', racket.id)
    
    if (!clearError) cleared++
  }
  
  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total rackets: ${rackets.length}`)
  console.log(`Images matched & uploaded: ${uploaded}`)
  console.log(`Upload failures: ${failed}`)
  console.log(`Rackets with images cleared: ${cleared}`)
  console.log(`Unmatched image files: ${unmatchedFiles.length}`)
  
  if (unmatchedFiles.length > 0) {
    console.log('\nUnmatched files:')
    for (const f of unmatchedFiles.slice(0, 20)) {
      console.log(`  - ${f}`)
    }
    if (unmatchedFiles.length > 20) {
      console.log(`  ... and ${unmatchedFiles.length - 20} more`)
    }
  }
}

main().catch(console.error)
