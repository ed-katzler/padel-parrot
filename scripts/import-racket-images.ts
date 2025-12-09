/**
 * Import racket images from JSON file to database
 * 
 * Usage:
 * 1. Add image URLs to scripts/racket-images.json
 * 2. Run: SUPABASE_SERVICE_KEY="your-key" npx tsx scripts/import-racket-images.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rrplznheygdwxkpysevj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY environment variable is required')
  console.log('Set it with: export SUPABASE_SERVICE_KEY="your-service-key"')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface ImageData {
  description: string
  usage: string
  images: Record<string, string>
}

async function main() {
  console.log('🚀 Importing racket images...\n')
  
  // Read JSON file
  const jsonPath = path.join(__dirname, 'racket-images.json')
  const jsonContent = fs.readFileSync(jsonPath, 'utf-8')
  const data: ImageData = JSON.parse(jsonContent)
  
  // Get images with URLs (non-empty)
  const imagesToImport = Object.entries(data.images)
    .filter(([_, url]) => url && url.trim() !== '')
  
  if (imagesToImport.length === 0) {
    console.log('⚠️  No images to import. Add URLs to scripts/racket-images.json')
    return
  }
  
  console.log(`📷 Found ${imagesToImport.length} images to import\n`)
  
  let successCount = 0
  let failCount = 0
  
  for (const [key, imageUrl] of imagesToImport) {
    // Parse brand and model from key
    const firstSpace = key.indexOf(' ')
    const brand = key.substring(0, firstSpace)
    const model = key.substring(firstSpace + 1)
    
    console.log(`  Updating: ${brand} ${model}`)
    
    const { error } = await supabase
      .from('rackets')
      .update({ image_url: imageUrl })
      .eq('brand', brand)
      .eq('model', model)
    
    if (error) {
      console.log(`    ❌ Failed: ${error.message}`)
      failCount++
    } else {
      console.log(`    ✅ Updated`)
      successCount++
    }
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('📊 Summary:')
  console.log(`  ✅ Success: ${successCount}`)
  console.log(`  ❌ Failed: ${failCount}`)
}

main().catch(console.error)
