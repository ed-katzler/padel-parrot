import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Verify this is a legitimate cron request (from Vercel)
function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return true
  }
  
  // Also allow requests with Vercel cron signature
  const cronSignature = request.headers.get('x-vercel-cron-signature')
  if (cronSignature) {
    return true
  }
  
  return false
}

// Calculate next occurrence date based on recurrence type
function getNextOccurrence(currentDateTime: Date, recurrenceType: string): Date {
  const next = new Date(currentDateTime)
  
  if (recurrenceType === 'weekly') {
    next.setDate(next.getDate() + 7)
  } else if (recurrenceType === 'biweekly') {
    next.setDate(next.getDate() + 14)
  }
  
  return next
}

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel cron
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const results = {
      processed: 0,
      created: 0,
      skipped: 0,
      errors: 0,
    }

    // Find all unique series_ids that have recurring matches
    // where the latest match in the series has passed
    const { data: recurringMatches, error: fetchError } = await supabaseAdmin
      .from('matches')
      .select('*')
      .neq('recurrence_type', 'none')
      .not('series_id', 'is', null)
      .lt('date_time', now.toISOString())
      .order('date_time', { ascending: false })

    if (fetchError) {
      console.error('Error fetching recurring matches:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch recurring matches' },
        { status: 500 }
      )
    }

    if (!recurringMatches || recurringMatches.length === 0) {
      return NextResponse.json({
        success: true,
        timestamp: now.toISOString(),
        message: 'No recurring matches to process',
        results,
      })
    }

    // Group by series_id to process each series once
    const seriesMap = new Map<string, typeof recurringMatches[0]>()
    for (const match of recurringMatches) {
      if (match.series_id && !seriesMap.has(match.series_id)) {
        seriesMap.set(match.series_id, match)
      }
    }

    results.processed = seriesMap.size

    // Process each series
    for (const [seriesId, latestMatch] of seriesMap) {
      try {
        // Check if recurrence should continue
        if (latestMatch.recurrence_end_date) {
          const endDate = new Date(latestMatch.recurrence_end_date)
          if (endDate < now) {
            results.skipped++
            continue
          }
        }

        // Check if a future match already exists in this series
        const { data: futureMatch } = await supabaseAdmin
          .from('matches')
          .select('id')
          .eq('series_id', seriesId)
          .gt('date_time', now.toISOString())
          .limit(1)
          .single()

        if (futureMatch) {
          results.skipped++
          continue
        }

        // Calculate next occurrence
        const nextDateTime = getNextOccurrence(
          new Date(latestMatch.date_time),
          latestMatch.recurrence_type
        )

        // Check if next occurrence is past the end date
        if (latestMatch.recurrence_end_date) {
          const endDate = new Date(latestMatch.recurrence_end_date)
          if (nextDateTime > endDate) {
            results.skipped++
            continue
          }
        }

        // Create new match instance
        const { data: newMatch, error: createError } = await supabaseAdmin
          .from('matches')
          .insert({
            creator_id: latestMatch.creator_id,
            description: latestMatch.description,
            date_time: nextDateTime.toISOString(),
            duration_minutes: latestMatch.duration_minutes,
            location: latestMatch.location,
            max_players: latestMatch.max_players,
            current_players: 1, // Creator automatically joins
            status: 'upcoming',
            is_public: latestMatch.is_public,
            recurrence_type: latestMatch.recurrence_type,
            recurrence_end_date: latestMatch.recurrence_end_date,
            series_id: seriesId,
          })
          .select()
          .single()

        if (createError) {
          console.error(`Error creating recurring match for series ${seriesId}:`, createError)
          results.errors++
          continue
        }

        // Add creator as participant
        if (newMatch) {
          const { error: participantError } = await supabaseAdmin
            .from('participants')
            .insert({
              match_id: newMatch.id,
              user_id: latestMatch.creator_id,
              status: 'joined',
            })

          if (participantError) {
            console.error(`Error adding creator to new match ${newMatch.id}:`, participantError)
            // Don't count as error since match was created
          }
        }

        results.created++
        console.log(`Created recurring match ${newMatch?.id} for series ${seriesId}`)
      } catch (err) {
        console.error(`Error processing series ${seriesId}:`, err)
        results.errors++
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    })
  } catch (error) {
    console.error('Recurring matches cron error:', error)
    return NextResponse.json(
      { error: 'Failed to process recurring matches' },
      { status: 500 }
    )
  }
}
