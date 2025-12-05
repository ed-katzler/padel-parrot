import { getSubscriptionStatus, type Subscription } from '@padel-parrot/api-client'

/**
 * Client-side hook to check if the current user has an active premium subscription
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
      data.status === 'active' &&
      (!data.current_period_end || new Date(data.current_period_end) > new Date())
    
    return { isPremium, subscription: data }
  } catch (error) {
    console.error('Error checking premium status:', error)
    return { isPremium: false, subscription: null }
  }
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
