'use client'

import { useState, useMemo } from 'react'
import type { AxisValue, CellCount } from '@padel-parrot/api-client'
import { getCellPersona, AXIS_LABELS } from '@padel-parrot/shared'

interface CellCoordinates {
  power: AxisValue
  weight: AxisValue
  feel: AxisValue
}

interface RacketCubeProps {
  selectedCell: CellCoordinates
  onCellSelect: (cell: CellCoordinates) => void
  cellCounts: CellCount[]
  adjacentCells?: string[]
}

const FEEL_TABS = [
  { value: 1 as AxisValue, label: 'Soft Feel', shortLabel: 'Soft' },
  { value: 2 as AxisValue, label: 'Medium Feel', shortLabel: 'Medium' },
  { value: 3 as AxisValue, label: 'Firm Feel', shortLabel: 'Firm' }
]

export default function RacketCube({ 
  selectedCell, 
  onCellSelect, 
  cellCounts,
  adjacentCells = []
}: RacketCubeProps) {
  const [activeFeelTab, setActiveFeelTab] = useState<AxisValue>(selectedCell.feel)

  // Build a map of cell counts for quick lookup
  const countMap = useMemo(() => {
    const map = new Map<string, number>()
    cellCounts.forEach(({ power_bias, maneuverability, feel, count }) => {
      map.set(`${power_bias}-${maneuverability}-${feel}`, count)
    })
    return map
  }, [cellCounts])

  // Check if a cell is adjacent to the selected cell
  const isAdjacent = (power: AxisValue, weight: AxisValue, feel: AxisValue): boolean => {
    const cellCode = `X${power}Y${weight}Z${feel}`
    return adjacentCells.includes(cellCode)
  }

  // Check if a cell is the selected cell
  const isSelected = (power: AxisValue, weight: AxisValue, feel: AxisValue): boolean => {
    return power === selectedCell.power && 
           weight === selectedCell.weight && 
           feel === selectedCell.feel
  }

  // Get count for a cell
  const getCount = (power: AxisValue, weight: AxisValue, feel: AxisValue): number => {
    return countMap.get(`${power}-${weight}-${feel}`) || 0
  }

  // Handle tab change - also update selected cell to match the new feel value
  const handleTabChange = (feel: AxisValue) => {
    setActiveFeelTab(feel)
    // Keep the same power/weight but change feel
    onCellSelect({ ...selectedCell, feel })
  }

  // Render a single cell in the grid
  const renderCell = (power: AxisValue, weight: AxisValue) => {
    const feel = activeFeelTab
    const selected = isSelected(power, weight, feel)
    const adjacent = !selected && isAdjacent(power, weight, feel)
    const count = getCount(power, weight, feel)
    const persona = getCellPersona(power, weight, feel)
    const isEmpty = count === 0

    return (
      <button
        key={`${power}-${weight}-${feel}`}
        type="button"
        onClick={() => onCellSelect({ power, weight, feel })}
        className={`
          relative aspect-square rounded-lg p-2 transition-all duration-200
          flex flex-col items-center justify-center text-center
          ${selected ? 'ring-2 scale-105 z-10' : 'hover:scale-102'}
          ${adjacent ? 'ring-1' : ''}
          ${isEmpty ? 'opacity-60' : ''}
        `}
        style={{
          backgroundColor: selected 
            ? 'rgb(var(--color-interactive))'
            : adjacent
              ? 'rgb(var(--color-interactive-muted))'
              : 'rgb(var(--color-surface))',
          border: `1px solid ${selected || adjacent
            ? 'rgb(var(--color-interactive))'
            : 'rgb(var(--color-border-light))'}`,
          // Use CSS variable for Tailwind ring color
          '--tw-ring-color': 'rgb(var(--color-interactive))',
          color: selected ? 'white' : 'rgb(var(--color-text))'
        } as React.CSSProperties}
      >
        {/* Persona name */}
        <span 
          className="text-xs font-medium leading-tight mb-1 line-clamp-2"
          style={{ 
            color: selected ? 'white' : 'rgb(var(--color-text))',
            fontSize: '0.65rem'
          }}
        >
          {persona.name}
        </span>
        
        {/* Count badge */}
        <span 
          className="text-lg font-bold"
          style={{ color: selected ? 'white' : 'rgb(var(--color-text))' }}
        >
          {count}
        </span>
        <span 
          className="text-xs"
          style={{ 
            color: selected ? 'rgba(255,255,255,0.8)' : 'rgb(var(--color-text-muted))',
            fontSize: '0.6rem'
          }}
        >
          {count === 1 ? 'racket' : 'rackets'}
        </span>

        {/* Adjacent indicator */}
        {adjacent && (
          <div 
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs"
            style={{ 
              backgroundColor: 'rgb(var(--color-interactive))',
              color: 'white',
              fontSize: '0.5rem'
            }}
          >
            ★
          </div>
        )}
      </button>
    )
  }

  return (
    <div className="w-full max-w-lg mx-auto px-4">
      {/* Feel Tabs (Z-axis) */}
      <div className="mb-6">
        <div 
          className="text-xs font-medium mb-2 text-center"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          {AXIS_LABELS.feel.name}
        </div>
        <div 
          className="flex rounded-lg p-1"
          style={{ backgroundColor: 'rgb(var(--color-border-light))' }}
        >
          {FEEL_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleTabChange(tab.value)}
              className="flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all"
              style={{
                backgroundColor: activeFeelTab === tab.value 
                  ? 'rgb(var(--color-surface))'
                  : 'transparent',
                color: activeFeelTab === tab.value 
                  ? 'rgb(var(--color-text))'
                  : 'rgb(var(--color-text-muted))',
                boxShadow: activeFeelTab === tab.value 
                  ? '0 1px 3px rgba(0,0,0,0.1)'
                  : 'none'
              }}
            >
              {tab.shortLabel}
            </button>
          ))}
        </div>
      </div>

      {/* X-axis label (Power) - Top */}
      <div 
        className="text-center mb-3 text-xs font-medium"
        style={{ color: 'rgb(var(--color-text-muted))' }}
      >
        {AXIS_LABELS.power.leftLabel} ← <span className="font-semibold">{AXIS_LABELS.power.name}</span> → {AXIS_LABELS.power.rightLabel}
      </div>

      {/* Main Grid Layout with Row Labels */}
      <div className="flex gap-3">
        {/* Y-axis label - Left side (vertical) */}
        <div className="flex flex-col justify-center items-center w-6 shrink-0">
          <div 
            className="-rotate-90 whitespace-nowrap text-xs font-medium"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {AXIS_LABELS.weight.topLabel} ← <span className="font-semibold">Weight</span> → {AXIS_LABELS.weight.bottomLabel}
          </div>
        </div>

        {/* Grid with column/row labels */}
        <div className="flex-1">
          {/* 3x3 Grid with integrated row labels */}
          <div 
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: 'rgb(var(--color-bg))' }}
          >
            {/* Grid rows */}
            {[1, 2, 3].map((row) => (
              <div key={row} className="flex items-center">
                {/* Grid cells for this row */}
                <div className="flex-1 grid grid-cols-3 gap-2 p-2">
                  {[1, 2, 3].map((col) => renderCell(col as AxisValue, row as AxisValue))}
                </div>
                {/* Row label on the right */}
                <div 
                  className="w-16 text-right pr-2 text-xs font-medium shrink-0"
                  style={{ color: 'rgb(var(--color-text-subtle))' }}
                >
                  {row === 1 ? 'Light' : row === 2 ? 'Medium' : 'Heavy'}
                </div>
              </div>
            ))}
          </div>

          {/* Column labels at bottom */}
          <div className="flex mt-2 pr-16">
            <div className="flex-1 grid grid-cols-3 gap-2 px-2">
              <div className="text-center text-xs font-medium" style={{ color: 'rgb(var(--color-text-subtle))' }}>Control</div>
              <div className="text-center text-xs font-medium" style={{ color: 'rgb(var(--color-text-subtle))' }}>Balanced</div>
              <div className="text-center text-xs font-medium" style={{ color: 'rgb(var(--color-text-subtle))' }}>Power</div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex justify-center gap-6 text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded"
            style={{ backgroundColor: 'rgb(var(--color-interactive))' }}
          />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded"
            style={{ 
              backgroundColor: 'rgb(var(--color-interactive-muted))',
              border: '1px solid rgb(var(--color-interactive))'
            }}
          />
          <span>Similar</span>
        </div>
      </div>
    </div>
  )
}
