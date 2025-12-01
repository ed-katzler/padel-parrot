import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple in-memory rate limiting for edge runtime
// For production at scale, consider Vercel KV or Upstash Redis
const rateLimit = new Map<string, { count: number; resetTime: number }>()

// Configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 100 // 100 requests per minute
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000 // Clean up old entries every 5 minutes

// Paths that should be rate limited
const RATE_LIMITED_PATHS = [
  '/api/',
]

// Paths that should have stricter limits
const STRICT_RATE_LIMITED_PATHS = [
  '/api/weather/',
]
const STRICT_MAX_REQUESTS = 30 // 30 requests per minute for weather API

let lastCleanup = Date.now()

function getClientId(request: NextRequest): string {
  // Try to get real IP from headers (Vercel sets these)
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  
  if (realIp) {
    return realIp
  }
  
  // Fallback - should rarely happen on Vercel
  return 'unknown'
}

function isRateLimited(path: string): boolean {
  return RATE_LIMITED_PATHS.some(p => path.startsWith(p))
}

function isStrictRateLimited(path: string): boolean {
  return STRICT_RATE_LIMITED_PATHS.some(p => path.startsWith(p))
}

function cleanupOldEntries() {
  const now = Date.now()
  
  // Only run cleanup periodically
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) {
    return
  }
  
  lastCleanup = now
  
  // Remove expired entries
  const entries = Array.from(rateLimit.entries())
  for (let i = 0; i < entries.length; i++) {
    const [key, value] = entries[i]
    if (now >= value.resetTime) {
      rateLimit.delete(key)
    }
  }
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  
  // Only rate limit API routes
  if (!isRateLimited(path)) {
    return NextResponse.next()
  }
  
  // Periodic cleanup of old entries
  cleanupOldEntries()
  
  const clientId = getClientId(request)
  const now = Date.now()
  
  // Determine rate limit for this path
  const maxRequests = isStrictRateLimited(path) 
    ? STRICT_MAX_REQUESTS 
    : MAX_REQUESTS_PER_WINDOW
  
  // Create unique key per client + path type
  const key = isStrictRateLimited(path) 
    ? `strict:${clientId}` 
    : `general:${clientId}`
  
  // Get or create rate limit entry
  let entry = rateLimit.get(key)
  
  if (!entry || now >= entry.resetTime) {
    // Create new window
    entry = {
      count: 0,
      resetTime: now + RATE_LIMIT_WINDOW_MS
    }
    rateLimit.set(key, entry)
  }
  
  entry.count++
  
  // Check if rate limit exceeded
  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
    
    return new NextResponse(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Please slow down and try again later',
        retryAfter
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(entry.resetTime)
        }
      }
    )
  }
  
  // Add rate limit headers to successful responses
  const response = NextResponse.next()
  response.headers.set('X-RateLimit-Limit', String(maxRequests))
  response.headers.set('X-RateLimit-Remaining', String(maxRequests - entry.count))
  response.headers.set('X-RateLimit-Reset', String(entry.resetTime))
  
  return response
}

export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
  ],
}

