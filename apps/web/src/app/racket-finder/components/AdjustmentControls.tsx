'use client'

import { Zap, Target, Feather, Anchor, Heart, Crosshair } from 'lucide-react'
import type { AxisValue } from '@padel-parrot/api-client'

interface CellCoordinates {
  power: AxisValue
  weight: AxisValue
  feel: AxisValue
}

interface AdjustmentControlsProps {
  currentCell: CellCoordinates
  onAdjust: (newCell: CellCoordinates) => void
}

interface AdjustButton {
  label: string
  icon: React.ReactNode
  axis: keyof CellCoordinates
  direction: 1 | -1
  disabledAt: AxisValue
}

const ADJUSTMENT_BUTTONS: AdjustButton[] = [
  {
    label: 'More Control',
    icon: <Target className="w-4 h-4" />,
    axis: 'power',
    direction: -1,
    disabledAt: 1
  },
  {
    label: 'More Power',
    icon: <Zap className="w-4 h-4" />,
    axis: 'power',
    direction: 1,
    disabledAt: 3
  },
  {
    label: 'Lighter',
    icon: <Feather className="w-4 h-4" />,
    axis: 'weight',
    direction: -1,
    disabledAt: 1
  },
  {
    label: 'Heavier',
    icon: <Anchor className="w-4 h-4" />,
    axis: 'weight',
    direction: 1,
    disabledAt: 3
  },
  {
    label: 'Softer',
    icon: <Heart className="w-4 h-4" />,
    axis: 'feel',
    direction: -1,
    disabledAt: 1
  },
  {
    label: 'Firmer',
    icon: <Crosshair className="w-4 h-4" />,
    axis: 'feel',
    direction: 1,
    disabledAt: 3
  }
]

export default function AdjustmentControls({ currentCell, onAdjust }: AdjustmentControlsProps) {
  const handleAdjust = (axis: keyof CellCoordinates, direction: 1 | -1) => {
    const newValue = (currentCell[axis] + direction) as AxisValue
    
    // Ensure we stay within bounds
    if (newValue < 1 || newValue > 3) return
    
    onAdjust({
      ...currentCell,
      [axis]: newValue
    })
  }

  return (
    <div className="w-full">
      <div 
        className="text-sm font-medium mb-3 text-center"
        style={{ color: 'rgb(var(--color-text-muted))' }}
      >
        Fine-tune your preferences
      </div>
      
      <div className="flex flex-wrap justify-center gap-2">
        {ADJUSTMENT_BUTTONS.map((button) => {
          const isDisabled = currentCell[button.axis] === button.disabledAt
          
          return (
            <button
              key={button.label}
              type="button"
              onClick={() => handleAdjust(button.axis, button.direction)}
              disabled={isDisabled}
              className={`
                inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium
                transition-all duration-200
                ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
              `}
              style={{
                backgroundColor: isDisabled 
                  ? 'rgb(var(--color-border-light))' 
                  : 'rgb(var(--color-surface))',
                border: `1px solid ${isDisabled 
                  ? 'rgb(var(--color-border-light))' 
                  : 'rgb(var(--color-border))'}`,
                color: isDisabled 
                  ? 'rgb(var(--color-text-subtle))' 
                  : 'rgb(var(--color-text))'
              }}
            >
              {button.icon}
              {button.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
