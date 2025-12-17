'use client'

import { useState, useEffect } from 'react'
import { Crown, X, AlertCircle } from 'lucide-react'
import { type Subscription } from '@padel-parrot/api-client'
import { isTrialExpired, getTrialDaysRemaining } from '@/utils/premium'

interface TrialExpiredBannerProps {
  subscription: Subscription | null
  onUpgrade: () => void
  className?: string
}

const DISMISSED_KEY = 'trial_expired_banner_dismissed'

export default function TrialExpiredBanner({ 
  subscription, 
  onUpgrade,
  className = ''
}: TrialExpiredBannerProps) {
  const [isDismissed, setIsDismissed] = useState(true) // Start dismissed to avoid flash
  
  useEffect(() => {
    // Check if banner was dismissed this session
    const dismissed = sessionStorage.getItem(DISMISSED_KEY)
    setIsDismissed(dismissed === 'true')
  }, [])

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, 'true')
    setIsDismissed(true)
  }

  // Don't show if no subscription or not expired trial
  if (!subscription || !isTrialExpired(subscription) || isDismissed) {
    return null
  }

  return (
    <div 
      className={`relative ${className}`}
      style={{
        backgroundColor: 'rgb(var(--color-warning-bg))',
        borderBottom: '1px solid rgb(var(--color-warning-border) / 0.3)'
      }}
    >
      <div className="container-app py-3">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div 
            className="flex-shrink-0 p-2 rounded-full"
            style={{ backgroundColor: 'rgb(var(--color-warning-border) / 0.2)' }}
          >
            <AlertCircle 
              className="w-5 h-5" 
              style={{ color: 'rgb(var(--color-warning-text))' }}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 
              className="text-sm font-semibold mb-1"
              style={{ color: 'rgb(var(--color-warning-text))' }}
            >
              Your Premium Trial Has Expired
            </h3>
            <p 
              className="text-sm mb-3"
              style={{ color: 'rgb(var(--color-warning-text) / 0.8)' }}
            >
              Upgrade now to continue enjoying SMS match reminders and other premium features.
            </p>
            
            {/* CTA Button */}
            <button
              onClick={onUpgrade}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'rgb(var(--color-warning-border))',
                color: 'rgb(var(--color-bg))'
              }}
            >
              <Crown className="w-4 h-4" />
              Upgrade to Premium
            </button>
          </div>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded-full transition-colors hover:bg-black/10"
            aria-label="Dismiss"
          >
            <X 
              className="w-5 h-5" 
              style={{ color: 'rgb(var(--color-warning-text) / 0.6)' }}
            />
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * A smaller inline banner for use within cards/sections
 */
export function TrialExpiredInline({ 
  subscription, 
  onUpgrade 
}: { 
  subscription: Subscription | null
  onUpgrade: () => void 
}) {
  if (!subscription || !isTrialExpired(subscription)) {
    return null
  }

  return (
    <div 
      className="p-4 rounded-lg mb-4"
      style={{
        backgroundColor: 'rgb(var(--color-warning-bg))',
        border: '1px solid rgb(var(--color-warning-border) / 0.3)'
      }}
    >
      <div className="flex items-start gap-3">
        <AlertCircle 
          className="w-5 h-5 flex-shrink-0 mt-0.5" 
          style={{ color: 'rgb(var(--color-warning-text))' }}
        />
        <div className="flex-1">
          <p 
            className="text-sm font-medium mb-2"
            style={{ color: 'rgb(var(--color-warning-text))' }}
          >
            Your 14-day trial has expired
          </p>
          <p 
            className="text-xs mb-3"
            style={{ color: 'rgb(var(--color-warning-text) / 0.8)' }}
          >
            Subscribe to Premium to continue receiving SMS notifications before your matches.
          </p>
          <button
            onClick={onUpgrade}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={{
              backgroundColor: 'rgb(var(--color-warning-border))',
              color: 'rgb(var(--color-bg))'
            }}
          >
            <Crown className="w-3.5 h-3.5" />
            Upgrade Now
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Component to show trial status (days remaining or expired)
 */
export function TrialStatusBadge({ subscription }: { subscription: Subscription | null }) {
  if (!subscription || subscription.status !== 'trialing') {
    return null
  }

  const daysRemaining = getTrialDaysRemaining(subscription)
  const isExpired = isTrialExpired(subscription)

  if (isExpired) {
    return (
      <span 
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
        style={{
          backgroundColor: 'rgb(var(--color-error-bg))',
          color: 'rgb(var(--color-error-text))'
        }}
      >
        Trial Expired
      </span>
    )
  }

  if (daysRemaining !== null) {
    const isUrgent = daysRemaining <= 3
    return (
      <span 
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
        style={{
          backgroundColor: isUrgent ? 'rgb(var(--color-warning-bg))' : 'rgb(var(--color-interactive) / 0.1)',
          color: isUrgent ? 'rgb(var(--color-warning-text))' : 'rgb(var(--color-interactive))'
        }}
      >
        {daysRemaining === 0 ? 'Expires Today' : 
         daysRemaining === 1 ? '1 Day Left' : 
         `${daysRemaining} Days Left`}
      </span>
    )
  }

  return (
    <span 
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: 'rgb(var(--color-interactive) / 0.1)',
        color: 'rgb(var(--color-interactive))'
      }}
    >
      Trial Active
    </span>
  )
}
