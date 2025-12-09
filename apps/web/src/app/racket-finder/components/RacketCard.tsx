'use client'

import { ExternalLink, Zap, Feather, Heart, Target, Award, DollarSign } from 'lucide-react'
import type { Racket, AxisValue } from '@padel-parrot/api-client'

interface RacketCardProps {
  racket: Racket
  compact?: boolean
}

// Skill level colors and labels
const SKILL_LEVELS = {
  beginner: { label: 'Beginner', color: 'rgb(34, 197, 94)' },
  intermediate: { label: 'Intermediate', color: 'rgb(59, 130, 246)' },
  advanced: { label: 'Advanced', color: 'rgb(168, 85, 247)' }
}

// Price tier labels
const PRICE_TIERS = {
  budget: { label: 'Budget', icon: '$' },
  mid: { label: 'Mid-Range', icon: '$$' },
  premium: { label: 'Premium', icon: '$$$' }
}

// Get axis label
const getAxisLabel = (axis: 'power' | 'weight' | 'feel', value: AxisValue): string => {
  const labels = {
    power: ['Control', 'Balanced', 'Power'],
    weight: ['Light', 'Medium', 'Heavy'],
    feel: ['Soft', 'Medium', 'Firm']
  }
  return labels[axis][value - 1]
}

export default function RacketCard({ racket, compact = false }: RacketCardProps) {
  const skillLevel = racket.skill_level ? SKILL_LEVELS[racket.skill_level] : null
  const priceTier = racket.price_tier ? PRICE_TIERS[racket.price_tier] : null

  if (compact) {
    return (
      <div
        className="flex items-center gap-3 p-3 rounded-lg transition-colors"
        style={{
          backgroundColor: 'rgb(var(--color-surface))',
          border: '1px solid rgb(var(--color-border-light))'
        }}
      >
        {/* Image placeholder */}
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgb(var(--color-interactive-muted))' }}
        >
          {racket.image_url ? (
            <img 
              src={racket.image_url} 
              alt={`${racket.brand} ${racket.model}`}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <Target className="w-6 h-6" style={{ color: 'rgb(var(--color-interactive))' }} />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div 
            className="font-medium text-sm truncate"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {racket.brand} {racket.model}
          </div>
          <div 
            className="text-xs truncate"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {racket.headline || `${getAxisLabel('power', racket.power_bias)} • ${getAxisLabel('weight', racket.maneuverability)} • ${getAxisLabel('feel', racket.feel)}`}
          </div>
        </div>

        {/* Action */}
        {racket.buy_url && (
          <a
            href={racket.buy_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg transition-colors flex-shrink-0"
            style={{ 
              backgroundColor: 'rgb(var(--color-interactive))',
              color: 'white'
            }}
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    )
  }

  return (
    <div
      className="rounded-xl overflow-hidden transition-shadow hover:shadow-lg"
      style={{
        backgroundColor: 'rgb(var(--color-surface))',
        border: '1px solid rgb(var(--color-border-light))'
      }}
    >
      {/* Image area */}
      <div
        className="aspect-[4/3] flex items-center justify-center relative"
        style={{ backgroundColor: 'rgb(var(--color-interactive-muted))' }}
      >
        {racket.image_url ? (
          <img 
            src={racket.image_url} 
            alt={`${racket.brand} ${racket.model}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <Target className="w-16 h-16" style={{ color: 'rgb(var(--color-interactive))' }} />
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-2">
          {skillLevel && (
            <span 
              className="px-2 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: skillLevel.color }}
            >
              {skillLevel.label}
            </span>
          )}
          {priceTier && (
            <span 
              className="px-2 py-1 rounded-full text-xs font-medium"
              style={{ 
                backgroundColor: 'rgb(var(--color-surface))',
                color: 'rgb(var(--color-text))'
              }}
            >
              {priceTier.icon}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Brand & Model */}
        <div className="mb-2">
          <div 
            className="text-xs font-medium uppercase tracking-wide mb-0.5"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {racket.brand}
          </div>
          <h3 
            className="font-semibold text-lg"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {racket.model}
          </h3>
        </div>

        {/* Headline */}
        {racket.headline && (
          <p 
            className="text-sm mb-3"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {racket.headline}
          </p>
        )}

        {/* Attributes */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
            style={{
              backgroundColor: 'rgb(var(--color-interactive-muted))',
              color: 'rgb(var(--color-text))'
            }}
          >
            <Zap className="w-3 h-3" />
            {getAxisLabel('power', racket.power_bias)}
          </span>
          <span
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
            style={{
              backgroundColor: 'rgb(var(--color-interactive-muted))',
              color: 'rgb(var(--color-text))'
            }}
          >
            <Feather className="w-3 h-3" />
            {getAxisLabel('weight', racket.maneuverability)}
          </span>
          <span
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
            style={{
              backgroundColor: 'rgb(var(--color-interactive-muted))',
              color: 'rgb(var(--color-text))'
            }}
          >
            <Heart className="w-3 h-3" />
            {getAxisLabel('feel', racket.feel)}
          </span>
        </div>

        {/* Technical specs (if available) */}
        {(racket.weight_grams || racket.shape) && (
          <div 
            className="text-xs mb-4 flex gap-3"
            style={{ color: 'rgb(var(--color-text-subtle))' }}
          >
            {racket.weight_grams && (
              <span>{racket.weight_grams}g</span>
            )}
            {racket.shape && (
              <span className="capitalize">{racket.shape}</span>
            )}
          </div>
        )}

        {/* Description */}
        {racket.description && (
          <p 
            className="text-sm mb-4 line-clamp-2"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {racket.description}
          </p>
        )}

        {/* CTA */}
        {racket.buy_url && (
          <a
            href={racket.buy_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            View Deal
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  )
}
