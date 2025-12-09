/**
 * Script to scrape and upload racket images to Supabase storage
 * 
 * This script:
 * 1. Fetches all rackets from the database
 * 2. Searches for product images from various sources
 * 3. Downloads and uploads images to Supabase storage
 * 4. Updates the database with image URLs
 * 
 * Usage: npx tsx scripts/scrape-racket-images.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'
import * as http from 'http'

// Supabase configuration - use environment variables or hardcode for local dev
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rrplznheygdwxkpysevj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY environment variable is required')
  console.log('Set it with: export SUPABASE_SERVICE_KEY="your-service-key"')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface Racket {
  id: string
  brand: string
  model: string
  image_url: string | null
}

// Image source configurations
const IMAGE_SOURCES = {
  // Padel Nuestro - largest Spanish retailer
  padelNuestro: (brand: string, model: string) => {
    const slug = `${brand}-${model}`.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[()]/g, '')
      .replace(/[áàä]/g, 'a')
      .replace(/[éèë]/g, 'e')
      .replace(/[íìï]/g, 'i')
      .replace(/[óòö]/g, 'o')
      .replace(/[úùü]/g, 'u')
      .replace(/ñ/g, 'n')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
    return `https://www.padelnuestro.com/media/catalog/product/cache/1/image/9df78eab33525d08d6e5fb8d27136e95/p/a/pala-${slug}.jpg`
  },
  
  // Padelmania - another major retailer
  padelmania: (brand: string, model: string) => {
    const slug = `${brand}-${model}`.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[()]/g, '')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
    return `https://www.padelmania.com/images/products/${slug}.jpg`
  },

  // Brand official sites patterns
  adidas: (model: string) => {
    const slug = model.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    return `https://assets.adidas.com/images/w_600,f_auto,q_auto/padel/${slug}/main.jpg`
  },
  
  bullpadel: (model: string) => {
    const slug = model.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    return `https://www.bullpadel.com/media/catalog/product/${slug}.jpg`
  },
}

// Delay between requests to avoid rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Download image from URL
async function downloadImage(url: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http
    
    const request = protocol.get(url, { 
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
      },
      timeout: 10000
    }, (response) => {
      // Follow redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location
        if (redirectUrl) {
          downloadImage(redirectUrl).then(resolve)
          return
        }
      }
      
      if (response.statusCode !== 200) {
        resolve(null)
        return
      }
      
      const contentType = response.headers['content-type'] || ''
      if (!contentType.includes('image')) {
        resolve(null)
        return
      }
      
      const chunks: Buffer[] = []
      response.on('data', (chunk: Buffer) => chunks.push(chunk))
      response.on('end', () => resolve(Buffer.concat(chunks)))
      response.on('error', () => resolve(null))
    })
    
    request.on('error', () => resolve(null))
    request.on('timeout', () => {
      request.destroy()
      resolve(null)
    })
  })
}

// Try to find image from Google Images search
async function searchGoogleImages(brand: string, model: string): Promise<string | null> {
  const searchQuery = encodeURIComponent(`${brand} ${model} padel racket product image white background`)
  
  // Using Google's image search URL directly
  // Note: This is for educational purposes; production use should use official API
  const searchUrl = `https://www.google.com/search?q=${searchQuery}&tbm=isch&tbs=ic:specific,isc:white`
  
  try {
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      }
    })
    
    const html = await response.text()
    
    // Extract image URLs from the HTML (basic parsing)
    const imgRegex = /\["(https:\/\/[^"]+\.(?:jpg|jpeg|png|webp))"/gi
    const matches = [...html.matchAll(imgRegex)]
    
    // Filter for likely product images (reasonable size, not tiny icons)
    for (const match of matches.slice(0, 5)) {
      const imageUrl = match[1]
      // Skip Google's own images and thumbnails
      if (!imageUrl.includes('google.com') && 
          !imageUrl.includes('gstatic.com') &&
          !imageUrl.includes('encrypted-tbn')) {
        return imageUrl
      }
    }
  } catch (error) {
    console.log(`  Could not search Google for ${brand} ${model}`)
  }
  
  return null
}

// Upload image to Supabase storage
async function uploadToSupabase(imageBuffer: Buffer, brand: string, model: string): Promise<string | null> {
  const fileName = `${brand}-${model}`
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
  
  const filePath = `${fileName}.jpg`
  
  const { data, error } = await supabase.storage
    .from('racket-images')
    .upload(filePath, imageBuffer, {
      contentType: 'image/jpeg',
      upsert: true
    })
  
  if (error) {
    console.error(`  ❌ Upload failed: ${error.message}`)
    return null
  }
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('racket-images')
    .getPublicUrl(filePath)
  
  return publicUrl
}

// Update racket record with image URL
async function updateRacketImageUrl(id: string, imageUrl: string): Promise<boolean> {
  const { error } = await supabase
    .from('rackets')
    .update({ image_url: imageUrl })
    .eq('id', id)
  
  if (error) {
    console.error(`  ❌ Database update failed: ${error.message}`)
    return false
  }
  
  return true
}

// Process a single racket
async function processRacket(racket: Racket): Promise<boolean> {
  console.log(`\n🎾 Processing: ${racket.brand} ${racket.model}`)
  
  if (racket.image_url) {
    console.log(`  ⏭️  Already has image, skipping`)
    return true
  }
  
  let imageBuffer: Buffer | null = null
  let sourceUsed = ''
  
  // Try various sources
  const sources = [
    { name: 'Padel Nuestro', url: IMAGE_SOURCES.padelNuestro(racket.brand, racket.model) },
    { name: 'Padelmania', url: IMAGE_SOURCES.padelmania(racket.brand, racket.model) },
  ]
  
  // Add brand-specific sources
  if (racket.brand.toLowerCase() === 'adidas') {
    sources.push({ name: 'Adidas', url: IMAGE_SOURCES.adidas(racket.model) })
  }
  if (racket.brand.toLowerCase() === 'bullpadel') {
    sources.push({ name: 'Bullpadel', url: IMAGE_SOURCES.bullpadel(racket.model) })
  }
  
  // Try each source
  for (const source of sources) {
    console.log(`  Trying ${source.name}...`)
    imageBuffer = await downloadImage(source.url)
    if (imageBuffer && imageBuffer.length > 5000) { // Minimum 5KB for valid image
      sourceUsed = source.name
      break
    }
    await delay(500) // Be nice to servers
  }
  
  // If no direct source worked, try Google Image search
  if (!imageBuffer) {
    console.log(`  Trying Google Images search...`)
    const googleImageUrl = await searchGoogleImages(racket.brand, racket.model)
    if (googleImageUrl) {
      imageBuffer = await downloadImage(googleImageUrl)
      if (imageBuffer && imageBuffer.length > 5000) {
        sourceUsed = 'Google Images'
      }
    }
  }
  
  if (!imageBuffer) {
    console.log(`  ❌ No image found`)
    return false
  }
  
  console.log(`  ✅ Found image from ${sourceUsed} (${Math.round(imageBuffer.length / 1024)}KB)`)
  
  // Upload to Supabase
  console.log(`  📤 Uploading to Supabase...`)
  const publicUrl = await uploadToSupabase(imageBuffer, racket.brand, racket.model)
  
  if (!publicUrl) {
    return false
  }
  
  console.log(`  ✅ Uploaded: ${publicUrl}`)
  
  // Update database
  console.log(`  💾 Updating database...`)
  const updated = await updateRacketImageUrl(racket.id, publicUrl)
  
  if (updated) {
    console.log(`  ✅ Database updated`)
    return true
  }
  
  return false
}

// Main function
async function main() {
  console.log('🚀 Starting racket image scraper...\n')
  
  // Fetch all rackets
  const { data: rackets, error } = await supabase
    .from('rackets')
    .select('id, brand, model, image_url')
    .order('brand')
    .order('model')
  
  if (error) {
    console.error('❌ Failed to fetch rackets:', error.message)
    process.exit(1)
  }
  
  console.log(`📋 Found ${rackets.length} rackets to process`)
  
  const racketsWithoutImages = rackets.filter(r => !r.image_url)
  console.log(`📷 ${racketsWithoutImages.length} rackets need images\n`)
  
  let successCount = 0
  let failCount = 0
  
  for (const racket of racketsWithoutImages) {
    const success = await processRacket(racket)
    if (success) {
      successCount++
    } else {
      failCount++
    }
    
    // Rate limiting - wait between rackets
    await delay(1000)
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('📊 Summary:')
  console.log(`  ✅ Success: ${successCount}`)
  console.log(`  ❌ Failed: ${failCount}`)
  console.log(`  📷 Total with images: ${rackets.length - racketsWithoutImages.length + successCount}`)
}

main().catch(console.error)
