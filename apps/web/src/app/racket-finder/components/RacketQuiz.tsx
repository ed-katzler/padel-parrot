'use client'

import { useState } from 'react'
import { ChevronRight, ChevronLeft, Zap, Feather, Shield, Target, Wind, Anchor, Heart, Crosshair } from 'lucide-react'
import type { AxisValue } from '@padel-parrot/api-client'

interface QuizResult {
  power: AxisValue
  weight: AxisValue
  feel: AxisValue
}

interface RacketQuizProps {
  onComplete: (result: QuizResult) => void
  initialValues?: Partial<QuizResult>
}

interface QuestionOption {
  value: AxisValue
  label: string
  description: string
  icon: React.ReactNode
}

interface Question {
  id: keyof QuizResult
  title: string
  subtitle: string
  options: QuestionOption[]
}

const QUESTIONS: Question[] = [
  {
    id: 'power',
    title: 'Control or Power?',
    subtitle: 'What matters more in your game?',
    options: [
      {
        value: 1,
        label: 'Control',
        description: 'Precise placement, larger sweet spot, forgiving',
        icon: <Target className="w-6 h-6" />
      },
      {
        value: 2,
        label: 'Balanced',
        description: 'Best of both worlds, versatile play',
        icon: <Shield className="w-6 h-6" />
      },
      {
        value: 3,
        label: 'Power',
        description: 'Explosive shots, aggressive play',
        icon: <Zap className="w-6 h-6" />
      }
    ]
  },
  {
    id: 'weight',
    title: 'Light or Heavy?',
    subtitle: 'How do you like your racket to feel?',
    options: [
      {
        value: 1,
        label: 'Light',
        description: 'Easy to swing, fast reactions, arm-friendly',
        icon: <Feather className="w-6 h-6" />
      },
      {
        value: 2,
        label: 'Medium',
        description: 'Standard weight, good for most players',
        icon: <Wind className="w-6 h-6" />
      },
      {
        value: 3,
        label: 'Heavy',
        description: 'More stability, power on contact',
        icon: <Anchor className="w-6 h-6" />
      }
    ]
  },
  {
    id: 'feel',
    title: 'Soft or Firm?',
    subtitle: 'What feel do you prefer on impact?',
    options: [
      {
        value: 1,
        label: 'Soft',
        description: 'Comfortable, forgiving, good for touch',
        icon: <Heart className="w-6 h-6" />
      },
      {
        value: 2,
        label: 'Medium',
        description: 'Balanced feedback, versatile feel',
        icon: <Shield className="w-6 h-6" />
      },
      {
        value: 3,
        label: 'Firm',
        description: 'Crisp, precise, direct feedback',
        icon: <Crosshair className="w-6 h-6" />
      }
    ]
  }
]

export default function RacketQuiz({ onComplete, initialValues }: RacketQuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Partial<QuizResult>>(initialValues || {})
  const [isAnimating, setIsAnimating] = useState(false)

  const question = QUESTIONS[currentQuestion]
  const progress = ((currentQuestion + 1) / QUESTIONS.length) * 100
  const canGoBack = currentQuestion > 0
  const isLastQuestion = currentQuestion === QUESTIONS.length - 1

  const handleSelect = (value: AxisValue) => {
    setIsAnimating(true)
    const newAnswers = { ...answers, [question.id]: value }
    setAnswers(newAnswers)

    setTimeout(() => {
      if (isLastQuestion) {
        // All questions answered, complete the quiz
        onComplete(newAnswers as QuizResult)
      } else {
        // Move to next question
        setCurrentQuestion(prev => prev + 1)
      }
      setIsAnimating(false)
    }, 300)
  }

  const handleBack = () => {
    if (canGoBack) {
      setCurrentQuestion(prev => prev - 1)
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm mb-2">
          <span style={{ color: 'rgb(var(--color-text-muted))' }}>
            Question {currentQuestion + 1} of {QUESTIONS.length}
          </span>
          <span style={{ color: 'rgb(var(--color-text-muted))' }}>
            {Math.round(progress)}%
          </span>
        </div>
        <div 
          className="h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: 'rgb(var(--color-border-light))' }}
        >
          <div 
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ 
              width: `${progress}%`,
              backgroundColor: 'rgb(var(--color-interactive))'
            }}
          />
        </div>
      </div>

      {/* Question */}
      <div 
        className={`transition-opacity duration-300 ${isAnimating ? 'opacity-50' : 'opacity-100'}`}
      >
        <div className="text-center mb-8">
          <h2 
            className="text-2xl font-bold mb-2"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {question.title}
          </h2>
          <p style={{ color: 'rgb(var(--color-text-muted))' }}>
            {question.subtitle}
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {question.options.map((option) => {
            const isSelected = answers[question.id] === option.value
            
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`
                  w-full p-4 rounded-xl text-left transition-all duration-200
                  flex items-center gap-4
                  ${isSelected ? 'ring-2 scale-[1.02]' : 'hover:scale-[1.01]'}
                `}
                style={{
                  backgroundColor: isSelected 
                    ? 'rgb(var(--color-interactive-muted))'
                    : 'rgb(var(--color-surface))',
                  border: `1px solid ${isSelected 
                    ? 'rgb(var(--color-interactive))' 
                    : 'rgb(var(--color-border-light))'}`,
                  '--tw-ring-color': 'rgb(var(--color-interactive))'
                } as React.CSSProperties}
              >
                <div 
                  className="p-3 rounded-lg flex-shrink-0"
                  style={{ 
                    backgroundColor: isSelected 
                      ? 'rgb(var(--color-interactive))' 
                      : 'rgb(var(--color-interactive-muted))',
                    color: isSelected 
                      ? 'white' 
                      : 'rgb(var(--color-interactive))'
                  }}
                >
                  {option.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div 
                    className="font-semibold mb-0.5"
                    style={{ color: 'rgb(var(--color-text))' }}
                  >
                    {option.label}
                  </div>
                  <div 
                    className="text-sm"
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                  >
                    {option.description}
                  </div>
                </div>
                <ChevronRight 
                  className={`w-5 h-5 flex-shrink-0 transition-transform ${isSelected ? 'translate-x-1' : ''}`}
                  style={{ color: 'rgb(var(--color-text-subtle))' }}
                />
              </button>
            )
          })}
        </div>
      </div>

      {/* Navigation */}
      {canGoBack && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      )}
    </div>
  )
}
