'use client'

import { useMemo } from 'react'
import { Package, ArrowRight, Sparkles } from 'lucide-react'
import type { Racket, AxisValue, CellCount } from '@padel-parrot/api-client'
import { getCellPersona, findNearestCells, type CellCoordinates } from '@padel-parrot/shared'
import RacketCard from './RacketCard'

interface RacketListProps {
  rackets: Racket[]
  selectedCell: {
    power: AxisValue
    weight: AxisValue
    feel: AxisValue
  }
  cellCounts: CellCount[]
  onCellSelect: (cell: { power: AxisValue; weight: AxisValue; feel: AxisValue }) => void
  isLoading?: boolean
}

export default function RacketList({ 
  rackets, 
  selectedCell, 
  cellCounts,
  onCellSelect,
  isLoading = false
}: RacketListProps) {
  const persona = getCellPersona(selectedCell.power, selectedCell.weight, selectedCell.feel)
  
  // Find nearest populated cells if current cell is empty
  const nearestCells = useMemo(() => {
    if (rackets.length > 0) return []
    
    // Convert cellCounts to CellCoordinates format
    const populatedCells: CellCoordinates[] = cellCounts
      .filter(c => c.count > 0)
      .map(c => ({
        power_bias: c.power_bias,
        maneuverability: c.maneuverability,
        feel: c.feel
      }))
    
    const target: CellCoordinates = {
      power_bias: selectedCell.power,
      maneuverability: selectedCell.weight,
      feel: selectedCell.feel
    }
    
    return findNearestCells(target, populatedCells, 3)
  }, [rackets.length, cellCounts, selectedCell])

  if (isLoading) {
    return (
      <div className="w-full">
        {/* Loading skeleton */}
        <div className="animate-pulse space-y-4">
          <div 
            className="h-24 rounded-xl"
            style={{ backgroundColor: 'rgb(var(--color-border-light))' }}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map(i => (
              <div 
                key={i}
                className="h-64 rounded-xl"
                style={{ backgroundColor: 'rgb(var(--color-border-light))' }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Cell info header */}
      <div 
        className="rounded-xl p-4 mb-6"
        style={{ 
          backgroundColor: 'rgb(var(--color-interactive-muted))',
          border: '1px solid rgb(var(--color-interactive))'
        }}
      >
        <div className="flex items-start gap-3">
          <div 
            className="p-2 rounded-lg"
            style={{ backgroundColor: 'rgb(var(--color-interactive))' }}
          >
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 
              className="font-semibold text-lg mb-1"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {persona.name}
            </h3>
            <p 
              className="text-sm"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {persona.shortDescription}
            </p>
            {persona.idealFor.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {persona.idealFor.map((item, i) => (
                  <span 
                    key={i}
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-surface))',
                      color: 'rgb(var(--color-text-muted))'
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="text-right">
            <div 
              className="text-2xl font-bold"
              style={{ color: 'rgb(var(--color-interactive))' }}
            >
              {rackets.length}
            </div>
            <div 
              className="text-xs"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {rackets.length === 1 ? 'racket' : 'rackets'}
            </div>
          </div>
        </div>
      </div>

      {/* Racket list or empty state */}
      {rackets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rackets.map(racket => (
            <RacketCard key={racket.id} racket={racket} />
          ))}
        </div>
      ) : (
        <div 
          className="text-center py-12 rounded-xl"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            border: '1px solid rgb(var(--color-border-light))'
          }}
        >
          <div 
            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: 'rgb(var(--color-interactive-muted))' }}
          >
            <Package 
              className="w-8 h-8"
              style={{ color: 'rgb(var(--color-interactive))' }}
            />
          </div>
          <h3 
            className="font-semibold text-lg mb-2"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            No rackets in this category yet
          </h3>
          <p 
            className="text-sm mb-6 max-w-sm mx-auto"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            We're still adding rackets to our database. Try one of these similar categories:
          </p>

          {/* Suggested nearby cells */}
          {nearestCells.length > 0 && (
            <div className="flex flex-col gap-2 max-w-sm mx-auto">
              {nearestCells.map((cell, i) => {
                const nearPersona = getCellPersona(cell.power_bias, cell.maneuverability, cell.feel)
                const count = cellCounts.find(
                  c => c.power_bias === cell.power_bias && 
                       c.maneuverability === cell.maneuverability && 
                       c.feel === cell.feel
                )?.count || 0
                
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onCellSelect({
                      power: cell.power_bias,
                      weight: cell.maneuverability,
                      feel: cell.feel
                    })}
                    className="flex items-center gap-3 p-3 rounded-lg text-left transition-colors"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-interactive-muted))',
                      border: '1px solid rgb(var(--color-border-light))'
                    }}
                  >
                    <div className="flex-1">
                      <div 
                        className="font-medium text-sm"
                        style={{ color: 'rgb(var(--color-text))' }}
                      >
                        {nearPersona.name}
                      </div>
                      <div 
                        className="text-xs"
                        style={{ color: 'rgb(var(--color-text-muted))' }}
                      >
                        {count} {count === 1 ? 'racket' : 'rackets'} available
                      </div>
                    </div>
                    <ArrowRight 
                      className="w-4 h-4"
                      style={{ color: 'rgb(var(--color-interactive))' }}
                    />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
