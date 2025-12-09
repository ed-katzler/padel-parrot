/**
 * Utility functions for generating persona names and descriptions for Racket Cube cells
 * 
 * Each cell in the 3x3x3 cube has a unique persona based on its coordinates.
 * Personas are generated dynamically using a formula-based approach.
 */

import { AxisValue } from './cell-utils'

export interface CellPersona {
  name: string
  shortDescription: string
  detailedDescription: string
  idealFor: string[]
}

// Axis descriptors for building persona names
const POWER_DESCRIPTORS: Record<AxisValue, { name: string; adj: string }> = {
  1: { name: 'Control', adj: 'Control-oriented' },
  2: { name: 'Balanced', adj: 'Balanced' },
  3: { name: 'Power', adj: 'Power-focused' }
}

const WEIGHT_DESCRIPTORS: Record<AxisValue, { name: string; adj: string }> = {
  1: { name: 'Light', adj: 'Lightweight' },
  2: { name: 'Medium', adj: 'Medium-weight' },
  3: { name: 'Heavy', adj: 'Heavy' }
}

const FEEL_DESCRIPTORS: Record<AxisValue, { name: string; adj: string }> = {
  1: { name: 'Soft', adj: 'Soft-feeling' },
  2: { name: 'Medium', adj: 'Medium-feel' },
  3: { name: 'Firm', adj: 'Firm' }
}

// Persona name templates based on dominant characteristics
const PERSONA_NAMES: Record<string, string> = {
  // Corner personas (extreme combinations)
  '1-1-1': 'Comfort Control',
  '1-1-3': 'Precision Controller',
  '1-3-1': 'Stable Defender',
  '1-3-3': 'Solid Wall',
  '3-1-1': 'Quick Striker',
  '3-1-3': 'Agile Attacker',
  '3-3-1': 'Power Comfort',
  '3-3-3': 'Power Cannon',
  
  // Edge personas (two extremes, one middle)
  '1-2-1': 'Soft Touch Artist',
  '1-2-3': 'Tactical Precision',
  '2-1-1': 'Easy Cruiser',
  '2-1-3': 'Swift Precision',
  '2-3-1': 'Comfort Tank',
  '2-3-3': 'Stable Hammer',
  '1-1-2': 'Light Control',
  '1-3-2': 'Defensive Anchor',
  '3-1-2': 'Fast Power',
  '3-3-2': 'Heavy Hitter',
  
  // Face center personas (one extreme, two middles)
  '1-2-2': 'Control Specialist',
  '3-2-2': 'Power Player',
  '2-1-2': 'Light Allrounder',
  '2-3-2': 'Solid Allrounder',
  '2-2-1': 'Soft Allrounder',
  '2-2-3': 'Firm Allrounder',
  
  // True center
  '2-2-2': 'Perfect Balance'
}

/**
 * Get the persona for a specific cell
 */
export function getCellPersona(
  power_bias: AxisValue,
  maneuverability: AxisValue,
  feel: AxisValue
): CellPersona {
  const key = `${power_bias}-${maneuverability}-${feel}`
  
  // Get persona name (with fallback)
  const name = PERSONA_NAMES[key] || generateFallbackName(power_bias, maneuverability, feel)
  
  // Generate descriptions
  const shortDescription = generateShortDescription(power_bias, maneuverability, feel)
  const detailedDescription = generateDetailedDescription(power_bias, maneuverability, feel)
  const idealFor = generateIdealFor(power_bias, maneuverability, feel)
  
  return {
    name,
    shortDescription,
    detailedDescription,
    idealFor
  }
}

/**
 * Generate a fallback name when no specific name is defined
 */
function generateFallbackName(
  power_bias: AxisValue,
  maneuverability: AxisValue,
  feel: AxisValue
): string {
  // Find the most distinctive characteristic
  const extremes = [
    power_bias !== 2 ? POWER_DESCRIPTORS[power_bias].name : null,
    maneuverability !== 2 ? WEIGHT_DESCRIPTORS[maneuverability].name : null,
    feel !== 2 ? FEEL_DESCRIPTORS[feel].name : null
  ].filter(Boolean)
  
  if (extremes.length === 0) {
    return 'Balanced Allrounder'
  }
  
  return extremes.slice(0, 2).join(' ') + ' Style'
}

/**
 * Generate a short (1-line) description
 */
function generateShortDescription(
  power_bias: AxisValue,
  maneuverability: AxisValue,
  feel: AxisValue
): string {
  const power = POWER_DESCRIPTORS[power_bias]
  const weight = WEIGHT_DESCRIPTORS[maneuverability]
  const feeling = FEEL_DESCRIPTORS[feel]
  
  // Create a concise description based on characteristics
  if (power_bias === 2 && maneuverability === 2 && feel === 2) {
    return 'The ultimate versatile racket for players who want it all.'
  }
  
  const parts: string[] = []
  
  if (power_bias === 1) parts.push('excellent control and touch')
  else if (power_bias === 3) parts.push('explosive power potential')
  else parts.push('balanced power-control ratio')
  
  if (maneuverability === 1) parts.push('easy to swing')
  else if (maneuverability === 3) parts.push('stable through contact')
  
  if (feel === 1) parts.push('forgiving and comfortable')
  else if (feel === 3) parts.push('crisp and precise')
  
  return parts.length > 0 
    ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) + (parts.length > 1 ? ', ' + parts.slice(1).join(', ') : '') + '.'
    : 'A well-rounded racket option.'
}

/**
 * Generate a detailed (2-3 sentence) description
 */
function generateDetailedDescription(
  power_bias: AxisValue,
  maneuverability: AxisValue,
  feel: AxisValue
): string {
  const sentences: string[] = []
  
  // Power sentence
  if (power_bias === 1) {
    sentences.push('This racket prioritizes control and placement over raw power, featuring a larger sweet spot for consistent shots.')
  } else if (power_bias === 3) {
    sentences.push('Built for players who want to dominate with power, this racket delivers explosive shots but requires good technique.')
  } else {
    sentences.push('A versatile design that balances power generation with control, suitable for varied playing styles.')
  }
  
  // Weight sentence
  if (maneuverability === 1) {
    sentences.push('The lightweight construction makes it easy to maneuver and reduces arm strain during long sessions.')
  } else if (maneuverability === 3) {
    sentences.push('The heavier build provides stability and plow-through on contact, ideal for players with solid fundamentals.')
  } else {
    sentences.push('Standard weight offers a good balance of maneuverability and stability.')
  }
  
  // Feel sentence
  if (feel === 1) {
    sentences.push('Soft materials absorb vibrations and add comfort, making it arm-friendly and forgiving on off-center hits.')
  } else if (feel === 3) {
    sentences.push('A firm frame delivers crisp, direct feedback and precise shot-making for technically proficient players.')
  }
  
  return sentences.join(' ')
}

/**
 * Generate "ideal for" player types
 */
function generateIdealFor(
  power_bias: AxisValue,
  maneuverability: AxisValue,
  feel: AxisValue
): string[] {
  const idealFor: string[] = []
  
  // Based on power
  if (power_bias === 1) {
    idealFor.push('Defensive players')
    idealFor.push('Touch players')
  } else if (power_bias === 3) {
    idealFor.push('Aggressive players')
    idealFor.push('Power hitters')
  } else {
    idealFor.push('All-court players')
  }
  
  // Based on weight
  if (maneuverability === 1) {
    idealFor.push('Beginners')
    idealFor.push('Players with arm concerns')
  } else if (maneuverability === 3) {
    idealFor.push('Advanced players')
    idealFor.push('Strong athletes')
  }
  
  // Based on feel
  if (feel === 1) {
    idealFor.push('Comfort seekers')
  } else if (feel === 3) {
    idealFor.push('Precision players')
  }
  
  // Deduplicate and limit
  return [...new Set(idealFor)].slice(0, 4)
}

/**
 * Get axis label for display
 */
export function getAxisLabel(axis: 'power' | 'weight' | 'feel', value: AxisValue): string {
  switch (axis) {
    case 'power':
      return POWER_DESCRIPTORS[value].name
    case 'weight':
      return WEIGHT_DESCRIPTORS[value].name
    case 'feel':
      return FEEL_DESCRIPTORS[value].name
  }
}

/**
 * Get all axis labels for the cube visualization
 */
export const AXIS_LABELS = {
  power: {
    name: 'Power Bias',
    labels: ['Control', 'Balanced', 'Power'] as const,
    leftLabel: 'Control',
    rightLabel: 'Power'
  },
  weight: {
    name: 'Weight',
    labels: ['Light', 'Medium', 'Heavy'] as const,
    topLabel: 'Light',
    bottomLabel: 'Heavy'
  },
  feel: {
    name: 'Feel',
    labels: ['Soft', 'Medium', 'Firm'] as const,
    tabs: ['Soft Feel', 'Medium Feel', 'Firm Feel'] as const
  }
} as const
