import { getSubscriptionStatus, type Subscription } from '@padel-parrot/api-client'

/**
 * Client-side hook to check if the current user has an active premium subscription
 * Includes 'trialing' status for 14-day trial users
 */
export async function checkPremiumStatus(): Promise<{
  isPremium: boolean
  subscription: Subscription | null
}> {
  try {
    const { data, error } = await getSubscriptionStatus()
    
    if (error || !data) {
      return { isPremium: false, subscription: null }
    }
    
    const isPremium = 
      (data.status === 'active' || data.status === 'trialing') &&
      (!data.current_period_end || new Date(data.current_period_end) > new Date())
    
    return { isPremium, subscription: data }
  } catch (error) {
    console.error('Error checking premium status:', error)
    return { isPremium: false, subscription: null }
  }
}

/**
 * Check if a trial subscription has expired
 */
export function isTrialExpired(subscription: Subscription | null): boolean {
  if (!subscription) return false
  if (subscription.status !== 'trialing') return false
  if (!subscription.current_period_end) return false
  
  return new Date(subscription.current_period_end) < new Date()
}

/**
 * Check if user is currently on an active trial (not expired)
 */
export function isOnActiveTrial(subscription: Subscription | null): boolean {
  if (!subscription) return false
  if (subscription.status !== 'trialing') return false
  if (!subscription.current_period_end) return true
  
  return new Date(subscription.current_period_end) > new Date()
}

/**
 * Get the number of days remaining in a trial
 * Returns null if not on trial or trial has expired
 */
export function getTrialDaysRemaining(subscription: Subscription | null): number | null {
  if (!subscription) return null
  if (subscription.status !== 'trialing') return null
  if (!subscription.current_period_end) return null
  
  const endDate = new Date(subscription.current_period_end)
  const now = new Date()
  
  if (endDate < now) return null
  
  const diffTime = endDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays
}

/**
 * Get a human-readable message about trial expiration status
 */
export function getTrialExpirationMessage(subscription: Subscription | null): string | null {
  if (!subscription) return null
  
  if (isTrialExpired(subscription)) {
    return 'Your 14-day premium trial has expired. Upgrade to continue enjoying SMS notifications and other premium features.'
  }
  
  const daysRemaining = getTrialDaysRemaining(subscription)
  if (daysRemaining !== null) {
    if (daysRemaining === 0) {
      return 'Your trial expires today!'
    } else if (daysRemaining === 1) {
      return 'Your trial expires tomorrow!'
    } else if (daysRemaining <= 3) {
      return `Your trial expires in ${daysRemaining} days!`
    }
    return `${daysRemaining} days remaining in your trial`
  }
  
  return null
}

/**
 * Helper to format subscription period end date
 */
export function formatSubscriptionEnd(endDate: string | null): string {
  if (!endDate) return 'Active'
  
  const date = new Date(endDate)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Get subscription status label for display
 */
export function getSubscriptionStatusLabel(status: string): string {
  switch (status) {
    case 'active':
      return 'Active'
    case 'cancelled':
      return 'Cancelled'
    case 'past_due':
      return 'Payment Due'
    case 'trialing':
      return 'Trial'
    default:
      return status
  }
}

/**
 * Get subscription status color for display
 */
export function getSubscriptionStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'rgb(34, 197, 94)' // green
    case 'cancelled':
      return 'rgb(156, 163, 175)' // gray
    case 'past_due':
      return 'rgb(239, 68, 68)' // red
    case 'trialing':
      return 'rgb(59, 130, 246)' // blue
    default:
      return 'rgb(156, 163, 175)' // gray
  }
}
