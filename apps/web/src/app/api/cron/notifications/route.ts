import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendSMS, formatDayBeforeMessage, format90MinMessage } from '@/utils/sms'
import { formatMatchTime } from '@padel-parrot/shared'

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

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel cron
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const results = {
      dayBefore: { sent: 0, failed: 0, skipped: 0 },
      ninetyMin: { sent: 0, failed: 0, skipped: 0 },
    }

    // Process day-before notifications (23-25 hours from now)
    const dayBeforeStart = new Date(now.getTime() + 23 * 60 * 60 * 1000) // 23 hours from now
    const dayBeforeEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000)   // 25 hours from now
    
    await processNotifications(
      dayBeforeStart,
      dayBeforeEnd,
      'day_before',
      results.dayBefore
    )

    // Process 90-min notifications (75-105 minutes from now)
    const ninetyMinStart = new Date(now.getTime() + 75 * 60 * 1000)   // 75 minutes from now
    const ninetyMinEnd = new Date(now.getTime() + 105 * 60 * 1000)    // 105 minutes from now
    
    await processNotifications(
      ninetyMinStart,
      ninetyMinEnd,
      'ninety_min_before',
      results.ninetyMin
    )

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    })
  } catch (error) {
    console.error('Notification cron error:', error)
    return NextResponse.json(
      { error: 'Failed to process notifications' },
      { status: 500 }
    )
  }
}

async function processNotifications(
  startTime: Date,
  endTime: Date,
  notificationType: 'day_before' | 'ninety_min_before',
  stats: { sent: number; failed: number; skipped: number }
) {
  // Find matches in the time window
  const { data: matches, error: matchError } = await supabaseAdmin
    .from('matches')
    .select(`
      id,
      description,
      date_time,
      location,
      participants (
        user_id,
        users (
          id,
          phone,
          name
        )
      )
    `)
    .gte('date_time', startTime.toISOString())
    .lt('date_time', endTime.toISOString())
    .eq('status', 'upcoming')

  if (matchError) {
    console.error('Error fetching matches:', matchError)
    return
  }

  if (!matches || matches.length === 0) {
    return
  }

  // Get the notification preference field name
  const prefField = notificationType === 'day_before' 
    ? 'day_before_enabled' 
    : 'ninety_min_before_enabled'

  for (const match of matches) {
    const participants = (match.participants as any[]) || []
    
    for (const participant of participants) {
      const user = participant.users
      if (!user || !user.phone) continue

      try {
        // Check if user has premium subscription
        const { data: subscription } = await supabaseAdmin
          .from('subscriptions')
          .select('status, current_period_end')
          .eq('user_id', user.id)
          .single()

        const isPremium = subscription 
          && subscription.status === 'active'
          && (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date())

        if (!isPremium) {
          stats.skipped++
          continue
        }

        // Check notification preference
        const { data: prefs } = await supabaseAdmin
          .from('notification_preferences')
          .select(prefField)
          .eq('user_id', user.id)
          .single()

        // Default to enabled if no preference record exists
        const isEnabled = prefs ? (prefs as any)[prefField] : true

        if (!isEnabled) {
          stats.skipped++
          continue
        }

        // Check if already notified
        const { data: existingLog } = await supabaseAdmin
          .from('notification_logs')
          .select('id')
          .eq('user_id', user.id)
          .eq('match_id', match.id)
          .eq('notification_type', notificationType)
          .single()

        if (existingLog) {
          stats.skipped++
          continue
        }

        // Format and send the message
        const matchTime = formatMatchTime(match.date_time)
        const message = notificationType === 'day_before'
          ? formatDayBeforeMessage(match.description, matchTime, match.location)
          : format90MinMessage(match.description, matchTime, match.location)

        const result = await sendSMS(user.phone, message)

        // Log the notification
        await supabaseAdmin
          .from('notification_logs')
          .insert({
            user_id: user.id,
            match_id: match.id,
            notification_type: notificationType,
            status: result.success ? 'sent' : 'failed',
            error_message: result.error || null,
          })

        if (result.success) {
          stats.sent++
        } else {
          stats.failed++
        }
      } catch (err) {
        console.error(`Error processing notification for user ${user.id}:`, err)
        stats.failed++
      }
    }
  }
}
