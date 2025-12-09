'use client'

import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, RefreshCw, Loader2 } from 'lucide-react'
import { 
  getCurrentUser, 
  getRackets, 
  getRacketsByCell, 
  getRacketCellCounts,
  type Racket,
  type AxisValue,
  type CellCount
} from '@padel-parrot/api-client'
import { getAdjacentCells, getCellCode } from '@padel-parrot/shared'
import RacketQuiz from './components/RacketQuiz'
import RacketCube from './components/RacketCube'
import RacketList from './components/RacketList'
import AdjustmentControls from './components/AdjustmentControls'

interface CellCoordinates {
  power: AxisValue
  weight: AxisValue
  feel: AxisValue
}

type ViewState = 'loading' | 'auth' | 'quiz' | 'results'

export default function RacketFinderPage() {
  // Auth state
  const [viewState, setViewState] = useState<ViewState>('loading')
  
  // Quiz results / selected cell
  const [selectedCell, setSelectedCell] = useState<CellCoordinates>({
    power: 2,
    weight: 2,
    feel: 2
  })
  
  // Data state
  const [rackets, setRackets] = useState<Racket[]>([])
  const [cellCounts, setCellCounts] = useState<CellCount[]>([])
  const [isLoadingRackets, setIsLoadingRackets] = useState(false)
  
  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: user, error } = await getCurrentUser()
      if (error || !user) {
        setViewState('auth')
      } else {
        setViewState('quiz')
        // Pre-load cell counts
        loadCellCounts()
      }
    }
    checkAuth()
  }, [])

  // Load cell counts
  const loadCellCounts = async () => {
    const { data, error } = await getRacketCellCounts()
    if (data && !error) {
      setCellCounts(data)
    }
  }

  // Load rackets for selected cell
  const loadRacketsForCell = async (cell: CellCoordinates) => {
    setIsLoadingRackets(true)
    const { data, error } = await getRacketsByCell(cell.power, cell.weight, cell.feel)
    if (data && !error) {
      setRackets(data)
    }
    setIsLoadingRackets(false)
  }

  // Get adjacent cells for the current selection
  const adjacentCells = useMemo(() => {
    return getAdjacentCells({
      power_bias: selectedCell.power,
      maneuverability: selectedCell.weight,
      feel: selectedCell.feel
    })
  }, [selectedCell])

  // Handle quiz completion
  const handleQuizComplete = async (result: { power: AxisValue; weight: AxisValue; feel: AxisValue }) => {
    setSelectedCell(result)
    setViewState('results')
    await loadRacketsForCell(result)
  }

  // Handle cell selection from cube or list
  const handleCellSelect = async (cell: CellCoordinates) => {
    setSelectedCell(cell)
    await loadRacketsForCell(cell)
  }

  // Handle retaking the quiz
  const handleRetakeQuiz = () => {
    setViewState('quiz')
    setRackets([])
  }

  // Handle going back to home
  const handleBack = () => {
    window.location.href = '/'
  }

  // Handle login redirect
  const handleLogin = () => {
    // Store the intended destination
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('redirectAfterLogin', '/racket-finder')
    }
    window.location.href = '/'
  }

  // Loading state
  if (viewState === 'loading') {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'rgb(var(--color-bg))' }}
      >
        <Loader2 
          className="w-8 h-8 animate-spin"
          style={{ color: 'rgb(var(--color-interactive))' }}
        />
      </div>
    )
  }

  // Auth required state
  if (viewState === 'auth') {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgb(var(--color-bg))' }}
      >
        <div 
          className="max-w-md w-full text-center p-8 rounded-2xl"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            border: '1px solid rgb(var(--color-border-light))'
          }}
        >
          <h1 
            className="text-2xl font-bold mb-4"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            Find Your Perfect Racket
          </h1>
          <p 
            className="mb-6"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            Sign in to access our personalised racket finder tool and discover rackets that match your playing style.
          </p>
          <button
            onClick={handleLogin}
            className="btn btn-primary w-full"
          >
            Sign In to Continue
          </button>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor: 'rgb(var(--color-bg))' }}
    >
      {/* Header */}
      <header 
        className="sticky top-0 z-10 backdrop-blur-sm"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface) / 0.8)',
          borderBottom: '1px solid rgb(var(--color-border-light))'
        }}
      >
        <div className="container-app py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={handleBack}
                className="mr-3 p-2 -ml-2 rounded-lg transition-colors"
                style={{ backgroundColor: 'transparent' }}
              >
                <ArrowLeft className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
              </button>
              <h1 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                Racket Finder
              </h1>
            </div>
            
            {viewState === 'results' && (
              <button
                onClick={handleRetakeQuiz}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
                style={{ 
                  backgroundColor: 'rgb(var(--color-interactive-muted))',
                  color: 'rgb(var(--color-interactive))'
                }}
              >
                <RefreshCw className="w-4 h-4" />
                Retake Quiz
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-app py-8">
        {viewState === 'quiz' ? (
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-8">
              <h2 
                className="text-2xl font-bold mb-2"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                Let's Find Your Ideal Racket
              </h2>
              <p style={{ color: 'rgb(var(--color-text-muted))' }}>
                Answer 3 quick questions about your playing preferences
              </p>
            </div>
            <RacketQuiz onComplete={handleQuizComplete} />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Cube Visualization */}
            <section>
              <RacketCube
                selectedCell={selectedCell}
                onCellSelect={handleCellSelect}
                cellCounts={cellCounts}
                adjacentCells={adjacentCells}
              />
            </section>

            {/* Adjustment Controls */}
            <section>
              <AdjustmentControls
                currentCell={selectedCell}
                onAdjust={handleCellSelect}
              />
            </section>

            {/* Racket List */}
            <section>
              <RacketList
                rackets={rackets}
                selectedCell={selectedCell}
                cellCounts={cellCounts}
                onCellSelect={handleCellSelect}
                isLoading={isLoadingRackets}
              />
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
