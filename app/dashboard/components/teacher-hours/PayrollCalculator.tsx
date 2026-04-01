'use client'

import { useState, useCallback, useEffect } from 'react'
import { CalculatorIcon, XMarkIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline'

type Mode = 'calc' | 'currency'

export default function PayrollCalculator() {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('calc')

  // Calculator state
  const [display, setDisplay] = useState('0')
  const [previousValue, setPreviousValue] = useState<number | null>(null)
  const [operator, setOperator] = useState<string | null>(null)
  const [waitingForOperand, setWaitingForOperand] = useState(false)
  const [history, setHistory] = useState('')

  // Currency state
  const [eurAmount, setEurAmount] = useState('')
  const [inrAmount, setInrAmount] = useState('')
  const [activeField, setActiveField] = useState<'eur' | 'inr'>('eur')
  const [rate, setRate] = useState<number | null>(null)
  const [rateLoading, setRateLoading] = useState(false)
  const [rateError, setRateError] = useState(false)
  const [rateTime, setRateTime] = useState<string | null>(null)

  // Fetch rate when currency mode is opened
  useEffect(() => {
    if (isOpen && mode === 'currency' && !rate) {
      fetchRate()
    }
  }, [isOpen, mode])

  const fetchRate = async () => {
    setRateLoading(true)
    setRateError(false)
    try {
      const res = await fetch('/api/exchange-rate')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setRate(data.rate)
      setRateTime(data.cachedAt)
    } catch {
      setRateError(true)
    } finally {
      setRateLoading(false)
    }
  }

  const handleEurChange = (value: string) => {
    if (value && !/^\d*\.?\d*$/.test(value)) return
    setEurAmount(value)
    setActiveField('eur')
    if (rate && value) {
      const inr = parseFloat(value) * rate
      setInrAmount(isNaN(inr) ? '' : inr.toFixed(2))
    } else {
      setInrAmount('')
    }
  }

  const handleInrChange = (value: string) => {
    if (value && !/^\d*\.?\d*$/.test(value)) return
    setInrAmount(value)
    setActiveField('inr')
    if (rate && value) {
      const eur = parseFloat(value) / rate
      setEurAmount(isNaN(eur) ? '' : eur.toFixed(2))
    } else {
      setEurAmount('')
    }
  }

  const swapAmounts = () => {
    if (activeField === 'eur') {
      setActiveField('inr')
      if (inrAmount) handleInrChange(inrAmount)
    } else {
      setActiveField('eur')
      if (eurAmount) handleEurChange(eurAmount)
    }
  }

  // Calculator logic
  const inputDigit = useCallback((digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit)
      setWaitingForOperand(false)
    } else {
      setDisplay(display === '0' ? digit : display + digit)
    }
  }, [display, waitingForOperand])

  const inputDecimal = useCallback(() => {
    if (waitingForOperand) {
      setDisplay('0.')
      setWaitingForOperand(false)
      return
    }
    if (!display.includes('.')) {
      setDisplay(display + '.')
    }
  }, [display, waitingForOperand])

  const calculate = useCallback((left: number, right: number, op: string): number => {
    switch (op) {
      case '+': return left + right
      case '-': return left - right
      case '×': return left * right
      case '÷': return right !== 0 ? left / right : 0
      default: return right
    }
  }, [])

  const handleOperator = useCallback((nextOperator: string) => {
    const current = parseFloat(display)

    if (previousValue !== null && operator && !waitingForOperand) {
      const result = calculate(previousValue, current, operator)
      const rounded = Math.round(result * 100000000) / 100000000
      setDisplay(String(rounded))
      setPreviousValue(rounded)
      setHistory(`${rounded} ${nextOperator}`)
    } else {
      setPreviousValue(current)
      setHistory(`${current} ${nextOperator}`)
    }

    setOperator(nextOperator)
    setWaitingForOperand(true)
  }, [display, previousValue, operator, waitingForOperand, calculate])

  const handleEquals = useCallback(() => {
    if (previousValue === null || !operator) return

    const current = parseFloat(display)
    const result = calculate(previousValue, current, operator)
    const rounded = Math.round(result * 100000000) / 100000000

    setDisplay(String(rounded))
    setHistory('')
    setPreviousValue(null)
    setOperator(null)
    setWaitingForOperand(true)
  }, [display, previousValue, operator, calculate])

  const handleClear = useCallback(() => {
    setDisplay('0')
    setPreviousValue(null)
    setOperator(null)
    setWaitingForOperand(false)
    setHistory('')
  }, [])

  const handleBackspace = useCallback(() => {
    if (waitingForOperand) return
    setDisplay(display.length > 1 ? display.slice(0, -1) : '0')
  }, [display, waitingForOperand])

  const handlePercent = useCallback(() => {
    const current = parseFloat(display)
    if (previousValue !== null && operator) {
      const percent = previousValue * (current / 100)
      setDisplay(String(Math.round(percent * 100) / 100))
    } else {
      setDisplay(String(Math.round(current) / 100))
    }
    setWaitingForOperand(false)
  }, [display, previousValue, operator])

  const handleToggleSign = useCallback(() => {
    const current = parseFloat(display)
    setDisplay(String(-current))
  }, [display])

  const formatDisplay = (value: string): string => {
    const num = parseFloat(value)
    if (isNaN(num)) return '0'
    if (value.endsWith('.') || value.endsWith('.0') || (value.includes('.') && value.endsWith('0'))) {
      return value
    }
    if (Math.abs(num) >= 1000) {
      const parts = value.split('.')
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      return parts.join('.')
    }
    return value
  }

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (mode !== 'calc') return
    if (e.key >= '0' && e.key <= '9') inputDigit(e.key)
    else if (e.key === '.') inputDecimal()
    else if (e.key === '+') handleOperator('+')
    else if (e.key === '-') handleOperator('-')
    else if (e.key === '*') handleOperator('×')
    else if (e.key === '/') { e.preventDefault(); handleOperator('÷') }
    else if (e.key === 'Enter' || e.key === '=') handleEquals()
    else if (e.key === 'Escape') handleClear()
    else if (e.key === 'Backspace') handleBackspace()
    else if (e.key === '%') handlePercent()
  }, [mode, inputDigit, inputDecimal, handleOperator, handleEquals, handleClear, handleBackspace, handlePercent])

  const btnBase = 'flex items-center justify-center rounded-lg font-medium text-sm transition-all duration-150 active:scale-95 select-none'
  const btnDigit = `${btnBase} bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 h-11`
  const btnOperator = `${btnBase} bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 h-11 font-semibold text-base`
  const btnEquals = `${btnBase} bg-blue-600 text-white hover:bg-blue-700 h-11 font-semibold text-base`
  const btnFunction = `${btnBase} bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 h-11 text-xs`

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        title="Open calculator"
      >
        <CalculatorIcon className="h-4 w-4" />
        Calculator
      </button>
    )
  }

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 w-72 overflow-hidden"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
          <CalculatorIcon className="h-4 w-4" />
          Calculator
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Mode tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setMode('calc')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            mode === 'calc'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Calculator
        </button>
        <button
          onClick={() => setMode('currency')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            mode === 'currency'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          EUR ⇄ INR
        </button>
      </div>

      {mode === 'calc' ? (
        <>
          {/* Display */}
          <div className="px-4 py-3 bg-gray-50/50 dark:bg-gray-900/30">
            <div className="text-right">
              <div className="text-xs text-gray-400 dark:text-gray-500 h-4 font-mono">
                {history}
              </div>
              <div className="text-2xl font-semibold text-gray-900 dark:text-white font-mono tracking-tight truncate">
                {formatDisplay(display)}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="p-3 grid grid-cols-4 gap-2">
            <button className={btnFunction} onClick={handleClear}>AC</button>
            <button className={btnFunction} onClick={handleToggleSign}>+/−</button>
            <button className={btnFunction} onClick={handlePercent}>%</button>
            <button className={btnOperator} onClick={() => handleOperator('÷')}>÷</button>

            <button className={btnDigit} onClick={() => inputDigit('7')}>7</button>
            <button className={btnDigit} onClick={() => inputDigit('8')}>8</button>
            <button className={btnDigit} onClick={() => inputDigit('9')}>9</button>
            <button className={btnOperator} onClick={() => handleOperator('×')}>×</button>

            <button className={btnDigit} onClick={() => inputDigit('4')}>4</button>
            <button className={btnDigit} onClick={() => inputDigit('5')}>5</button>
            <button className={btnDigit} onClick={() => inputDigit('6')}>6</button>
            <button className={btnOperator} onClick={() => handleOperator('-')}>−</button>

            <button className={btnDigit} onClick={() => inputDigit('1')}>1</button>
            <button className={btnDigit} onClick={() => inputDigit('2')}>2</button>
            <button className={btnDigit} onClick={() => inputDigit('3')}>3</button>
            <button className={btnOperator} onClick={() => handleOperator('+')}>+</button>

            <button className={`${btnDigit} col-span-2`} onClick={() => inputDigit('0')}>0</button>
            <button className={btnDigit} onClick={inputDecimal}>.</button>
            <button className={btnEquals} onClick={handleEquals}>=</button>

            <button
              className={`${btnFunction} col-span-4 h-8 text-xs`}
              onClick={handleBackspace}
            >
              ← Backspace
            </button>
          </div>
        </>
      ) : (
        /* Currency conversion mode */
        <div className="p-4 space-y-4">
          {/* Live rate display */}
          <div className="text-center">
            {rateLoading ? (
              <div className="text-xs text-gray-400 dark:text-gray-500">Fetching live rate...</div>
            ) : rateError ? (
              <div className="text-xs text-red-500">
                Failed to fetch rate.{' '}
                <button onClick={fetchRate} className="underline hover:no-underline">Retry</button>
              </div>
            ) : rate ? (
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Wise mid-market rate
                </div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white font-mono">
                  1 EUR = {rate.toFixed(4)} INR
                </div>
                {rateTime && (
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                    Updated {new Date(rateTime).toLocaleTimeString()}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* EUR input */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              EUR (€)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={eurAmount}
              onChange={(e) => handleEurChange(e.target.value)}
              onFocus={() => setActiveField('eur')}
              placeholder="0.00"
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-right text-lg font-mono text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Swap button */}
          <div className="flex justify-center">
            <button
              onClick={swapAmounts}
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Swap direction"
            >
              <ArrowsRightLeftIcon className="h-4 w-4 rotate-90" />
            </button>
          </div>

          {/* INR input */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              INR (₹)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={inrAmount}
              onChange={(e) => handleInrChange(e.target.value)}
              onFocus={() => setActiveField('inr')}
              placeholder="0.00"
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-right text-lg font-mono text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Refresh button */}
          <button
            onClick={fetchRate}
            disabled={rateLoading}
            className="w-full py-2 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50"
          >
            {rateLoading ? 'Refreshing...' : 'Refresh Rate'}
          </button>
        </div>
      )}
    </div>
  )
}
