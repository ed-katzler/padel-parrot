import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromNumber = process.env.TWILIO_PHONE_NUMBER

// Initialize Twilio client (only on server side)
const twilioClient = accountSid && authToken 
  ? twilio(accountSid, authToken)
  : null

export interface SMSResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send an SMS notification
 */
export async function sendSMS(
  to: string,
  message: string
): Promise<SMSResult> {
  if (!twilioClient || !fromNumber) {
    console.error('Twilio is not configured')
    return {
      success: false,
      error: 'SMS service not configured',
    }
  }

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: fromNumber,
      to: to,
    })

    console.log(`SMS sent to ${to}: ${result.sid}`)
    return {
      success: true,
      messageId: result.sid,
    }
  } catch (error: any) {
    console.error('Failed to send SMS:', error)
    return {
      success: false,
      error: error.message || 'Failed to send SMS',
    }
  }
}

/**
 * Format match reminder message for day before notification
 */
export function formatDayBeforeMessage(
  matchDescription: string | undefined,
  matchTime: string,
  location: string
): string {
  const title = matchDescription || 'Padel Match'
  return `Reminder: You have a padel match tomorrow!\n\n${title}\nTime: ${matchTime}\nLocation: ${location}\n\nSee you there!`
}

/**
 * Format match reminder message for 90 minutes before notification
 */
export function format90MinMessage(
  matchDescription: string | undefined,
  matchTime: string,
  location: string
): string {
  const title = matchDescription || 'Padel Match'
  return `Your padel match starts in 90 minutes!\n\n${title}\nTime: ${matchTime}\nLocation: ${location}\n\nTime to warm up!`
}
