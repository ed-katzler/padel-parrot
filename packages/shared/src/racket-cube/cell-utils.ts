/**
 * Utility functions for working with Racket Cube cells
 * 
 * The Racket Cube is a 3x3x3 grid where:
 * - X-axis (power_bias): 1=Control, 2=Balanced, 3=Power
 * - Y-axis (maneuverability): 1=Light, 2=Medium, 3=Heavy
 * - Z-axis (feel): 1=Soft, 2=Medium, 3=Firm
 */

export type AxisValue = 1 | 2 | 3

export interface CellCoordinates {
  power_bias: AxisValue
  maneuverability: AxisValue
  feel: AxisValue
}

/**
 * Generate a cell code string from coordinates
 * Example: { power_bias: 1, maneuverability: 2, feel: 3 } => "X1Y2Z3"
 */
export function getCellCode(
  power_bias: AxisValue,
  maneuverability: AxisValue,
  feel: AxisValue
): string {
  return `X${power_bias}Y${maneuverability}Z${feel}`
}

/**
 * Parse a cell code string into coordinates
 * Example: "X1Y2Z3" => { power_bias: 1, maneuverability: 2, feel: 3 }
 */
export function parseCellCode(cellCode: string): CellCoordinates | null {
  const match = cellCode.match(/^X([123])Y([123])Z([123])$/)
  if (!match) return null
  
  return {
    power_bias: parseInt(match[1]) as AxisValue,
    maneuverability: parseInt(match[2]) as AxisValue,
    feel: parseInt(match[3]) as AxisValue
  }
}

/**
 * Get all adjacent cells (cells that differ by 1 on exactly one axis)
 * Returns cell codes for up to 6 adjacent cells
 */
export function getAdjacentCells(coordinates: CellCoordinates): string[] {
  const { power_bias, maneuverability, feel } = coordinates
  const adjacent: string[] = []
  
  // X-axis neighbors
  if (power_bias > 1) {
    adjacent.push(getCellCode((power_bias - 1) as AxisValue, maneuverability, feel))
  }
  if (power_bias < 3) {
    adjacent.push(getCellCode((power_bias + 1) as AxisValue, maneuverability, feel))
  }
  
  // Y-axis neighbors
  if (maneuverability > 1) {
    adjacent.push(getCellCode(power_bias, (maneuverability - 1) as AxisValue, feel))
  }
  if (maneuverability < 3) {
    adjacent.push(getCellCode(power_bias, (maneuverability + 1) as AxisValue, feel))
  }
  
  // Z-axis neighbors
  if (feel > 1) {
    adjacent.push(getCellCode(power_bias, maneuverability, (feel - 1) as AxisValue))
  }
  if (feel < 3) {
    adjacent.push(getCellCode(power_bias, maneuverability, (feel + 1) as AxisValue))
  }
  
  return adjacent
}

/**
 * Calculate Manhattan distance between two cells
 * Used for finding nearest populated cells when current cell is empty
 */
export function getCellDistance(a: CellCoordinates, b: CellCoordinates): number {
  return (
    Math.abs(a.power_bias - b.power_bias) +
    Math.abs(a.maneuverability - b.maneuverability) +
    Math.abs(a.feel - b.feel)
  )
}

/**
 * Find nearest cells from a list of populated cells
 * Returns cells sorted by distance
 */
export function findNearestCells(
  target: CellCoordinates,
  populatedCells: CellCoordinates[],
  limit: number = 3
): CellCoordinates[] {
  return [...populatedCells]
    .filter(cell => getCellDistance(target, cell) > 0) // Exclude the target itself
    .sort((a, b) => getCellDistance(target, a) - getCellDistance(target, b))
    .slice(0, limit)
}

/**
 * Generate all 27 cell coordinates
 */
export function getAllCells(): CellCoordinates[] {
  const cells: CellCoordinates[] = []
  for (let x = 1; x <= 3; x++) {
    for (let y = 1; y <= 3; y++) {
      for (let z = 1; z <= 3; z++) {
        cells.push({
          power_bias: x as AxisValue,
          maneuverability: y as AxisValue,
          feel: z as AxisValue
        })
      }
    }
  }
  return cells
}

/**
 * Adjust coordinates by moving one step in a direction
 * Returns new coordinates clamped to valid range [1, 3]
 */
export function adjustCoordinates(
  coordinates: CellCoordinates,
  adjustment: Partial<{ power_bias: 1 | -1; maneuverability: 1 | -1; feel: 1 | -1 }>
): CellCoordinates {
  const clamp = (val: number): AxisValue => Math.max(1, Math.min(3, val)) as AxisValue
  
  return {
    power_bias: clamp(coordinates.power_bias + (adjustment.power_bias || 0)),
    maneuverability: clamp(coordinates.maneuverability + (adjustment.maneuverability || 0)),
    feel: clamp(coordinates.feel + (adjustment.feel || 0))
  }
}
