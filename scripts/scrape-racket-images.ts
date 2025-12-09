/**
 * Script to scrape and upload racket images to Supabase storage
 * 
 * This script uses DuckDuckGo image search to find product images
 * 
 * Usage: SUPABASE_SERVICE_KEY="your-key" npx tsx scripts/scrape-racket-images.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as https from 'https'
import * as http from 'http'

// Supabase configuration
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

// Delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Download image from URL with better error handling
async function downloadImage(url: string, attempt = 1): Promise<Buffer | null> {
  const maxAttempts = 3
  
  return new Promise((resolve) => {
    try {
      const protocol = url.startsWith('https') ? https : http
      
      const request = protocol.get(url, { 
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.google.com/',
        },
        timeout: 15000
      }, (response) => {
        // Follow redirects
        if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307) {
          const redirectUrl = response.headers.location
          if (redirectUrl) {
            downloadImage(redirectUrl, attempt).then(resolve)
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
          // Minimum 10KB for a valid product image
          if (buffer.length > 10000) {
            resolve(buffer)
          } else {
            resolve(null)
          }
        })
        response.on('error', () => resolve(null))
      })
      
      request.on('error', () => {
        if (attempt < maxAttempts) {
          setTimeout(() => {
            downloadImage(url, attempt + 1).then(resolve)
          }, 1000)
        } else {
          resolve(null)
        }
      })
      request.on('timeout', () => {
        request.destroy()
        resolve(null)
      })
    } catch {
      resolve(null)
    }
  })
}

// Search for product image using Bing Image Search
async function searchBingImages(brand: string, model: string): Promise<string[]> {
  // Very specific search for padel rackets
  const searchQuery = encodeURIComponent(`"${brand}" "${model}" padel racket -shovel -garden`)
  const searchUrl = `https://www.bing.com/images/search?q=${searchQuery}&first=1&tsc=ImageBasicHover`
  
  try {
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    })
    
    const html = await response.text()
    
    // Extract image URLs from murl parameter in Bing results
    const murlRegex = /murl&quot;:&quot;(https?:\/\/[^&]+?)&quot;/gi
    const matches = [...html.matchAll(murlRegex)]
    
    const imageUrls: string[] = []
    for (const match of matches.slice(0, 10)) {
      let imageUrl = match[1]
      // Decode HTML entities
      imageUrl = imageUrl.replace(/&amp;/g, '&')
      
      // Skip known bad sources
      if (imageUrl.includes('aliexpress') || 
          imageUrl.includes('alibaba') ||
          imageUrl.includes('temu') ||
          imageUrl.includes('wish.com') ||
          imageUrl.includes('facebook') ||
          imageUrl.includes('instagram')) {
        continue
      }
      
      imageUrls.push(imageUrl)
    }
    
    return imageUrls
  } catch (error) {
    console.log(`    Could not search Bing: ${error}`)
    return []
  }
}

// Search using DuckDuckGo (alternative)
async function searchDuckDuckGo(brand: string, model: string): Promise<string[]> {
  const searchQuery = encodeURIComponent(`"${brand}" "${model}" padel racket`)
  const searchUrl = `https://duckduckgo.com/?q=${searchQuery}&iax=images&ia=images`
  
  try {
    // First get the vqd token
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      }
    })
    
    const html = await response.text()
    
    // Extract vqd token
    const vqdMatch = html.match(/vqd=['"]([^'"]+)['"]/)
    if (!vqdMatch) return []
    
    const vqd = vqdMatch[1]
    
    // Now fetch images
    const imageApiUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${searchQuery}&vqd=${vqd}&f=,,,,,&p=1`
    
    const imageResponse = await fetch(imageApiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    })
    
    const data = await imageResponse.json()
    
    if (data.results) {
      return data.results
        .slice(0, 10)
        .map((r: { image: string }) => r.image)
        .filter((url: string) => !url.includes('aliexpress') && !url.includes('alibaba'))
    }
    
    return []
  } catch (error) {
    return []
  }
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
async function processRacket(racket: Racket): Promise<boolean> {
  console.log(`\n🎾 Processing: ${racket.brand} ${racket.model}`)
  
  if (racket.image_url) {
    console.log(`    ⏭️  Already has image, skipping`)
    return true
  }
  
  // Try Bing first, then DuckDuckGo
  console.log(`    🔍 Searching Bing Images...`)
  let imageUrls = await searchBingImages(racket.brand, racket.model)
  
  if (imageUrls.length === 0) {
    console.log(`    🔍 Trying DuckDuckGo...`)
    imageUrls = await searchDuckDuckGo(racket.brand, racket.model)
  }
  
  if (imageUrls.length === 0) {
    console.log(`    ❌ No images found`)
    return false
  }
  
  console.log(`    📷 Found ${imageUrls.length} potential images`)
  
  // Try each URL until we get a valid image
  for (const imageUrl of imageUrls) {
    console.log(`    ⬇️  Trying: ${imageUrl.substring(0, 60)}...`)
    
    const imageBuffer = await downloadImage(imageUrl)
    
    if (imageBuffer) {
      console.log(`    ✅ Downloaded (${Math.round(imageBuffer.length / 1024)}KB)`)
      
      // Upload to Supabase
      console.log(`    📤 Uploading to Supabase...`)
      const publicUrl = await uploadToSupabase(imageBuffer, racket.brand, racket.model)
      
      if (!publicUrl) {
        continue
      }
      
      console.log(`    ✅ Uploaded: ${publicUrl}`)
      
      // Update database
      console.log(`    💾 Updating database...`)
      const updated = await updateRacketImageUrl(racket.id, publicUrl)
      
      if (updated) {
        console.log(`    ✅ Success!`)
        return true
      }
    }
    
    await delay(500)
  }
  
  console.log(`    ❌ Could not find a valid image`)
  return false
}

// Main function
async function main() {
  console.log('🚀 Starting racket image scraper (Bing/DDG version)...\n')
  
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
  
  console.log(`📋 Found ${rackets.length} rackets total`)
  
  const racketsWithoutImages = rackets.filter(r => !r.image_url)
  console.log(`📷 ${racketsWithoutImages.length} rackets need images\n`)
  
  if (racketsWithoutImages.length === 0) {
    console.log('✅ All rackets already have images!')
    return
  }
  
  let successCount = 0
  let failCount = 0
  
  for (const racket of racketsWithoutImages) {
    const success = await processRacket(racket)
    if (success) {
      successCount++
    } else {
      failCount++
    }
    
    // Rate limiting - longer delay to avoid being blocked
    await delay(2000)
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('📊 Summary:')
  console.log(`  ✅ Success: ${successCount}`)
  console.log(`  ❌ Failed: ${failCount}`)
  console.log(`  📷 Total with images: ${rackets.length - racketsWithoutImages.length + successCount}`)
}

main().catch(console.error)
