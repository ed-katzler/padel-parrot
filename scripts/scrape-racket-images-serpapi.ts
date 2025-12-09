/**
 * Scrape racket images using SerpAPI Google Images
 * 
 * Usage: npx tsx scripts/scrape-racket-images-serpapi.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as https from 'https'
import * as http from 'http'

// Configuration
const SERPAPI_KEY = process.env.SERPAPI_KEY || '1e3a0f2316960ac7aae27f553b827edfa7fdcab7a82fda5a1873248a8c9ef535'
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rrplznheygdwxkpysevj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY environment variable is required')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface Racket {
  id: string
  brand: string
  model: string
  image_url: string | null
}

interface SerpAPIImageResult {
  position: number
  thumbnail: string
  original: string
  title: string
  source: string
  link: string
}

interface SerpAPIResponse {
  images_results?: SerpAPIImageResult[]
  error?: string
}

// Delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Search for images using SerpAPI
async function searchSerpAPI(brand: string, model: string): Promise<string[]> {
  // Construct a specific search query for padel rackets
  const query = encodeURIComponent(`${brand} ${model} padel racket product photo white background`)
  const url = `https://serpapi.com/search.json?engine=google_images&q=${query}&api_key=${SERPAPI_KEY}&num=10`
  
  try {
    const response = await fetch(url)
    const data: SerpAPIResponse = await response.json()
    
    if (data.error) {
      console.log(`    ⚠️  SerpAPI error: ${data.error}`)
      return []
    }
    
    if (!data.images_results || data.images_results.length === 0) {
      return []
    }
    
    // Filter and prioritize good sources
    const goodSources = ['amazon', 'padelnuestro', 'padelmania', 'bullpadel', 'head', 'adidas', 'babolat', 'nox', 'decathlon']
    const badSources = ['aliexpress', 'alibaba', 'wish', 'temu', 'dhgate', 'facebook', 'instagram', 'pinterest', 'twitter']
    
    const imageUrls: string[] = []
    
    // First pass: prefer good sources
    for (const result of data.images_results) {
      const sourceLower = (result.source || '').toLowerCase()
      const linkLower = (result.link || '').toLowerCase()
      
      // Skip bad sources
      if (badSources.some(bad => sourceLower.includes(bad) || linkLower.includes(bad))) {
        continue
      }
      
      // Prefer good sources first
      if (goodSources.some(good => sourceLower.includes(good) || linkLower.includes(good))) {
        imageUrls.unshift(result.original) // Add to front
      } else {
        imageUrls.push(result.original)
      }
    }
    
    return imageUrls.slice(0, 8) // Return top 8 candidates
  } catch (error) {
    console.log(`    ❌ SerpAPI request failed: ${error}`)
    return []
  }
}

// Download image from URL
async function downloadImage(url: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    try {
      const protocol = url.startsWith('https') ? https : http
      
      const request = protocol.get(url, { 
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        },
        timeout: 15000
      }, (response) => {
        // Follow redirects
        if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307) {
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
        response.on('end', () => {
          const buffer = Buffer.concat(chunks)
          // Minimum 15KB for a valid product image (filters out placeholders)
          if (buffer.length > 15000) {
            resolve(buffer)
          } else {
            resolve(null)
          }
        })
        response.on('error', () => resolve(null))
      })
      
      request.on('error', () => resolve(null))
      request.on('timeout', () => {
        request.destroy()
        resolve(null)
      })
    } catch {
      resolve(null)
    }
  })
}

// Upload image to Supabase storage
async function uploadToSupabase(imageBuffer: Buffer, brand: string, model: string): Promise<string | null> {
  const fileName = `${brand}-${model}`
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
  
  const filePath = `${fileName}.jpg`
  
  const { error } = await supabase.storage
    .from('racket-images')
    .upload(filePath, imageBuffer, {
      contentType: 'image/jpeg',
      upsert: true
    })
  
  if (error) {
    console.error(`    ❌ Upload failed: ${error.message}`)
    return null
  }
  
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
    console.error(`    ❌ Database update failed: ${error.message}`)
    return false
  }
  
  return true
}

// Process a single racket
async function processRacket(racket: Racket, index: number, total: number): Promise<boolean> {
  console.log(`\n[${index + 1}/${total}] 🎾 ${racket.brand} ${racket.model}`)
  
  if (racket.image_url) {
    console.log(`    ⏭️  Already has image, skipping`)
    return true
  }
  
  // Search using SerpAPI
  console.log(`    🔍 Searching SerpAPI...`)
  const imageUrls = await searchSerpAPI(racket.brand, racket.model)
  
  if (imageUrls.length === 0) {
    console.log(`    ❌ No images found`)
    return false
  }
  
  console.log(`    📷 Found ${imageUrls.length} candidates`)
  
  // Try each URL until we get a valid image
  for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i]
    const shortUrl = imageUrl.length > 50 ? imageUrl.substring(0, 50) + '...' : imageUrl
    console.log(`    ⬇️  [${i + 1}/${imageUrls.length}] Trying: ${shortUrl}`)
    
    const imageBuffer = await downloadImage(imageUrl)
    
    if (imageBuffer) {
      const sizeKB = Math.round(imageBuffer.length / 1024)
      console.log(`    ✅ Downloaded (${sizeKB}KB)`)
      
      // Upload to Supabase
      const publicUrl = await uploadToSupabase(imageBuffer, racket.brand, racket.model)
      
      if (!publicUrl) {
        continue
      }
      
      console.log(`    📤 Uploaded to Supabase`)
      
      // Update database
      const updated = await updateRacketImageUrl(racket.id, publicUrl)
      
      if (updated) {
        console.log(`    ✅ Success!`)
        return true
      }
    }
    
    // Small delay between download attempts
    await delay(300)
  }
  
  console.log(`    ❌ Could not find a valid image`)
  return false
}

// Main function
async function main() {
  console.log('🚀 Starting racket image scraper (SerpAPI)...')
  console.log('=' .repeat(50))
  
  // Fetch all rackets without images
  const { data: rackets, error } = await supabase
    .from('rackets')
    .select('id, brand, model, image_url')
    .is('image_url', null)
    .order('brand')
    .order('model')
  
  if (error) {
    console.error('❌ Failed to fetch rackets:', error.message)
    process.exit(1)
  }
  
  console.log(`\n📋 Found ${rackets.length} rackets needing images`)
  console.log(`📊 SerpAPI searches needed: ${rackets.length} (free tier: 250/month)\n`)
  
  if (rackets.length === 0) {
    console.log('✅ All rackets already have images!')
    return
  }
  
  let successCount = 0
  let failCount = 0
  
  for (let i = 0; i < rackets.length; i++) {
    const racket = rackets[i]
    const success = await processRacket(racket, i, rackets.length)
    
    if (success) {
      successCount++
    } else {
      failCount++
    }
    
    // Rate limiting - SerpAPI allows ~100 requests/minute on free tier
    // We'll be conservative with 2 second delay
    if (i < rackets.length - 1) {
      await delay(2000)
    }
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('📊 FINAL SUMMARY:')
  console.log(`  ✅ Success: ${successCount}`)
  console.log(`  ❌ Failed: ${failCount}`)
  console.log(`  📷 Total processed: ${rackets.length}`)
  console.log('='.repeat(50))
}

main().catch(console.error)
