/**
 * Racket Image Import Script v2
 * Uses explicit mapping with fallbacks for related models
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const SUPABASE_URL = 'https://rrplznheygdwxkpysevj.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const IMAGE_FOLDER = '/Users/edkatzler/Downloads/racket-images'
const BUCKET_NAME = 'racket-images'

// Explicit mapping: racket model patterns -> image file patterns
// This ensures related models use appropriate fallback images
const IMAGE_MAPPINGS: Record<string, Record<string, string>> = {
  'Adidas': {
    'Adipower Multiweight 3.3': '110130_padel_webs_padel_y_grupo_pala_adidas_adipower_multiweight',
    'Adipower Multiweight CTRL 3.4': '110130_padel_webs_padel_y_grupo_pala_adidas_adipower_multiweight',
    'Metalbone 3.4': '113683-pala-adidas-metalbone-3-4',
    'Metalbone Carbon 3.4': '113683-pala-adidas-metalbone-3-4',  // Use base Metalbone
    'Metalbone Carbon CTRL 3.4': '113683-pala-adidas-metalbone-3-4',
    'Metalbone CTRL 3.4': '113683-pala-adidas-metalbone-3-4',
    'Metalbone HRD+ 3.4 (Ale Galán)': '113687-pala-adidas-metalbone-hrd-mas-3-4',
    // Cross IT and Match series - no images available
  },
  'Babolat': {
    // Viper series (has images)
    'Air Viper 25': '115743-pala-babolat-air-viper',
    'Counter Viper 25': '115748-pala-babolat-counter-viper',
    'Technical Viper 25 (J. Lebrón)': '115755-pala-babolat-technical-viper-juan-lebron',
    // Veron series - use Viper images as fallback (similar design)
    'Air Veron 25': '115743-pala-babolat-air-viper',
    'Counter Veron 25': '115748-pala-babolat-counter-viper',
    'Technical Veron 25': '115754-pala-babolat-technical-viper-150159',
    // Vertuo series - use Viper images as fallback
    'Air Vertuo 25': '115743-pala-babolat-air-viper',
    'Counter Vertuo 25': '115748-pala-babolat-counter-viper',
    'Technical Vertuo 25': '115754-pala-babolat-technical-viper-150159',
  },
  'Bullpadel': {
    // Elite series
    'Elite W 25': 'bullpadel_elite_light_23',
    'Elite W 26': 'bullpadel_elite_light_23',
    // Hack series
    'Hack 04 25': '113754_pala_bullpadel_hack_04_25',
    'Hack 04 26': '113754_pala_bullpadel_hack_04_25',
    'Hack 04 Comfort 26': '113754_pala_bullpadel_hack_04_25',
    'Hack 04 Hybrid 25': '113754_pala_bullpadel_hack_04_25',
    'Hack 04 Hybrid 26': '113754_pala_bullpadel_hack_04_25',
    // Neuron series
    'Neuron 02 26': '113768_pala_bullpadel_neuron_25',
    'Neuron 02 Edge 26': '120909-pala-bullpadel-neuron-02-edge',
    // Vertex series
    'Vertex 04 25': '113772-pala-bullpadel-vertex-04-25',
    'Vertex 04 Comfort 25': '113772-pala-bullpadel-vertex-04-25',
    'Vertex 04 Hybrid 25': '113772-pala-bullpadel-vertex-04-25',
    'Vertex 04 W 25': '113772-pala-bullpadel-vertex-04-25',
    'Vertex 05 26': '113772-pala-bullpadel-vertex-04-25',  // Use 04 as fallback
    'Vertex 05 Comfort 26': '113772-pala-bullpadel-vertex-04-25',
    'Vertex 05 Geo 26': '113772-pala-bullpadel-vertex-04-25',
    'Vertex 05 Hybrid 26': '113772-pala-bullpadel-vertex-04-25',
    'Vertex 05 W 26': '113772-pala-bullpadel-vertex-04-25',
    // Xplo series
    'Xplo 25': '113777-pala-bullpadel-xplo-25',
    'Xplo 26': '113777-pala-bullpadel-xplo-25',
    'Xplo Cmf 26': '113778-pala-bullpadel-xplo-comfort-25',
    'Xplo Comfort 25': '113778-pala-bullpadel-xplo-comfort-25',
    // No images: BP10, Flow, Icon, Indiga, Ionic, K2, Pearl, Wonder
  },
  'Head': {
    // Coello series
    'Coello Motion 2025': '115656-pala-head-coello-motion-2025',
    'Coello Pro 2025': '115657-pala-head-coello-pro-2025',
    'Coello Team 2025': '115656-pala-head-coello-motion-2025',  // Use Motion as fallback
    // No images for: Evo, Extreme, Gravity, Radical, Speed, Vibe
  },
  'Nox': {
    // AT10 Genius series
    'AT Genius Limited Ed. 2025': '120968-pala-nox-at10-genius-12k-alum-xtreme',
    'AT10 Genius 12K 2024': '120968-pala-nox-at10-genius-12k-alum-xtreme',
    'AT10 Genius 12K 2025': '117959-pala-nox-at10-genius-ultralight',
    'AT10 Genius 18K Alum 2024': '120968-pala-nox-at10-genius-12k-alum-xtreme',
    'AT10 Genius 18K Alum 2025': '120968-pala-nox-at10-genius-12k-alum-xtreme',
    'AT10 Genius Attack 12K 2024': '120968-pala-nox-at10-genius-12k-alum-xtreme',
    'AT10 Genius Attack 12K 2025': '120968-pala-nox-at10-genius-12k-alum-xtreme',
    'AT10 Genius Attack 18K 2024': '120968-pala-nox-at10-genius-12k-alum-xtreme',
    'AT10 Genius Attack 18K 2025': '120968-pala-nox-at10-genius-12k-alum-xtreme',
    // ML10 series
    'ML10 Pro Cup 2024': '120489-pala-nox-ml10-pro-cup-luxury',
    'ML10 Pro Cup Light Silver 2025': '120489-pala-nox-ml10-pro-cup-luxury',
    'ML10 Pro Cup Rough 2025': '120489-pala-nox-ml10-pro-cup-luxury',
    'ML10 Quantum 3K 2025': '120489-pala-nox-ml10-pro-cup-luxury',
  },
}

interface Racket {
  id: string
  brand: string
  model: string
  image_url: string | null
}

async function main() {
  if (!SUPABASE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable required')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  
  console.log('🎾 Starting racket image import v2...\n')

  // 1. Get all rackets from database
  const { data: rackets, error: fetchError } = await supabase
    .from('rackets')
    .select('id, brand, model, image_url')
    .order('brand')
    .order('model')

  if (fetchError || !rackets) {
    console.error('❌ Failed to fetch rackets:', fetchError)
    process.exit(1)
  }

  console.log(`Found ${rackets.length} rackets in database\n`)

  // 2. Get all image files
  const imageFiles = fs.readdirSync(IMAGE_FOLDER)
    .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .filter(f => !f.includes(' (1)') && !f.includes(' (2)'))  // Skip duplicates
    .filter(f => {
      const stats = fs.statSync(path.join(IMAGE_FOLDER, f))
      return stats.size > 50000  // Skip small thumbnails
    })

  console.log(`Found ${imageFiles.length} valid image files\n`)

  // 3. Process each racket
  let matched = 0
  let notMatched = 0
  let uploadErrors = 0

  const results: { racket: string; status: string; image?: string }[] = []

  for (const racket of rackets) {
    const mapping = IMAGE_MAPPINGS[racket.brand]?.[racket.model]
    
    if (!mapping) {
      // No mapping defined - clear image
      const { error } = await supabase
        .from('rackets')
        .update({ image_url: null })
        .eq('id', racket.id)
      
      if (!error) {
        results.push({ racket: `${racket.brand} ${racket.model}`, status: 'no_image' })
        notMatched++
      }
      continue
    }

    // Find matching image file
    const imageFile = imageFiles.find(f => 
      f.toLowerCase().includes(mapping.toLowerCase().replace(/-/g, '').replace(/_/g, ''))
      || f.toLowerCase().replace(/[-_]/g, '').includes(mapping.toLowerCase().replace(/[-_]/g, ''))
      || f.startsWith(mapping.split('-')[0]) || f.startsWith(mapping.split('_')[0])
    )

    // Fallback: more flexible matching
    const flexMatch = imageFiles.find(f => {
      const normalizedFile = f.toLowerCase().replace(/[-_]/g, '')
      const normalizedMapping = mapping.toLowerCase().replace(/[-_]/g, '')
      // Check if file contains the key parts of the mapping
      const keyParts = normalizedMapping.split(/[^a-z0-9]+/).filter(p => p.length > 2)
      return keyParts.filter(part => normalizedFile.includes(part)).length >= Math.min(3, keyParts.length)
    })

    const matchedFile = imageFile || flexMatch

    if (!matchedFile) {
      console.log(`⚠️  No file found for mapping: ${mapping}`)
      results.push({ racket: `${racket.brand} ${racket.model}`, status: 'mapping_not_found', image: mapping })
      notMatched++
      continue
    }

    // Upload image to Supabase
    const filePath = path.join(IMAGE_FOLDER, matchedFile)
    const fileBuffer = fs.readFileSync(filePath)
    const fileName = `${racket.brand.toLowerCase()}-${racket.model.toLowerCase()}`
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') + '.jpg'

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      })

    if (uploadError) {
      console.error(`❌ Upload failed for ${racket.brand} ${racket.model}:`, uploadError.message)
      uploadErrors++
      continue
    }

    // Get public URL and update racket
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName)

    const { error: updateError } = await supabase
      .from('rackets')
      .update({ image_url: urlData.publicUrl })
      .eq('id', racket.id)

    if (updateError) {
      console.error(`❌ Update failed for ${racket.brand} ${racket.model}:`, updateError.message)
      uploadErrors++
      continue
    }

    results.push({ 
      racket: `${racket.brand} ${racket.model}`, 
      status: 'success', 
      image: matchedFile.substring(0, 50) + '...'
    })
    matched++
  }

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total rackets: ${rackets.length}`)
  console.log(`✅ Images matched & uploaded: ${matched}`)
  console.log(`⚠️  No image available: ${notMatched}`)
  console.log(`❌ Upload errors: ${uploadErrors}`)

  console.log('\n✅ Successfully matched:')
  results.filter(r => r.status === 'success').forEach(r => {
    console.log(`  ✓ ${r.racket}`)
  })

  console.log('\n❌ No image available:')
  results.filter(r => r.status === 'no_image').forEach(r => {
    console.log(`  ✗ ${r.racket}`)
  })

  if (results.some(r => r.status === 'mapping_not_found')) {
    console.log('\n⚠️  Mapping defined but file not found:')
    results.filter(r => r.status === 'mapping_not_found').forEach(r => {
      console.log(`  ? ${r.racket} -> ${r.image}`)
    })
  }
}

main().catch(console.error)
