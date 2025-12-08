/**
 * Currency Validation System
 *
 * Elegant solution to prevent currency mismatch errors by validating
 * payment amounts against expected ranges for each currency.
 */

import { Currency } from './pricing'

export interface CurrencyValidationResult {
  isValid: boolean
  warnings: string[]
  errors: string[]
  suggestedCurrency?: Currency
}

/**
 * Expected payment ranges based on course pricing
 * EUR: €32 - €300 (with buffer for combos)
 * INR: ₹5,000 - ₹35,000 (with buffer for combos)
 */
const CURRENCY_RANGES = {
  EUR: {
    min: 30,
    max: 500, // Buffer for future courses/combos
    typical: { min: 40, max: 250 },
  },
  INR: {
    min: 5000,
    max: 35000,
    typical: { min: 10000, max: 25000 },
  },
} as const

/**
 * Validates if an amount makes sense for the specified currency
 *
 * @param amount - The payment amount
 * @param currency - The currency (EUR or INR)
 * @returns Validation result with warnings and errors
 */
export function validateCurrencyAmount(
  amount: number,
  currency: Currency
): CurrencyValidationResult {
  const result: CurrencyValidationResult = {
    isValid: true,
    warnings: [],
    errors: [],
  }

  const ranges = CURRENCY_RANGES[currency]

  // Check if amount is within absolute bounds
  if (amount < ranges.min) {
    result.isValid = false
    result.errors.push(
      `Amount ${currency} ${amount} is suspiciously low (min: ${currency} ${ranges.min})`
    )

    // Suggest alternate currency
    const otherCurrency = currency === 'EUR' ? 'INR' : 'EUR'
    const otherRanges = CURRENCY_RANGES[otherCurrency]

    if (amount >= otherRanges.min && amount <= otherRanges.max) {
      result.suggestedCurrency = otherCurrency
      result.errors.push(
        `This amount makes more sense as ${otherCurrency} ${amount}`
      )
    }
  }

  if (amount > ranges.max) {
    result.isValid = false
    result.errors.push(
      `Amount ${currency} ${amount} is suspiciously high (max: ${currency} ${ranges.max})`
    )

    // Suggest alternate currency
    const otherCurrency = currency === 'EUR' ? 'INR' : 'EUR'
    const otherRanges = CURRENCY_RANGES[otherCurrency]

    if (amount >= otherRanges.min && amount <= otherRanges.max) {
      result.suggestedCurrency = otherCurrency
      result.errors.push(
        `This amount makes more sense as ${otherCurrency} ${amount}`
      )
    }
  }

  // Check if amount is outside typical ranges (warning, not error)
  if (
    result.isValid &&
    (amount < ranges.typical.min || amount > ranges.typical.max)
  ) {
    result.warnings.push(
      `Amount ${currency} ${amount} is outside typical range (${currency} ${ranges.typical.min} - ${currency} ${ranges.typical.max}). Please verify this is correct.`
    )
  }

  return result
}

/**
 * Validates currency consistency between student and payment
 *
 * @param studentCurrency - Student's currency setting
 * @param paymentCurrency - Payment currency
 * @param paymentAmount - Payment amount
 * @returns Validation result
 */
export function validateCurrencyConsistency(
  studentCurrency: Currency,
  paymentCurrency: Currency,
  paymentAmount: number
): CurrencyValidationResult {
  const result: CurrencyValidationResult = {
    isValid: true,
    warnings: [],
    errors: [],
  }

  // First validate the amount for the payment currency
  const amountValidation = validateCurrencyAmount(paymentAmount, paymentCurrency)
  result.warnings.push(...amountValidation.warnings)
  result.errors.push(...amountValidation.errors)
  result.isValid = amountValidation.isValid

  // Check if currencies match
  if (studentCurrency !== paymentCurrency) {
    result.warnings.push(
      `Student currency (${studentCurrency}) differs from payment currency (${paymentCurrency}). This is allowed but unusual.`
    )
  }

  return result
}

/**
 * Detects likely currency errors in existing payment data
 *
 * @param payments - Array of payments to check
 * @returns Array of suspicious payments
 */
export function detectCurrencyErrors(
  payments: Array<{
    id: string
    amount: number
    currency: Currency
    studentName?: string
  }>
): Array<{
  payment: typeof payments[0]
  validation: CurrencyValidationResult
}> {
  return payments
    .map((payment) => ({
      payment,
      validation: validateCurrencyAmount(
        Number(payment.amount),
        payment.currency
      ),
    }))
    .filter((item) => !item.validation.isValid || item.validation.warnings.length > 0)
}

/**
 * Format validation result for display
 */
export function formatValidationResult(result: CurrencyValidationResult): string {
  const lines: string[] = []

  if (!result.isValid) {
    lines.push('❌ VALIDATION FAILED')
    result.errors.forEach((error) => lines.push(`  ERROR: ${error}`))
  }

  if (result.warnings.length > 0) {
    lines.push('⚠️  WARNINGS')
    result.warnings.forEach((warning) => lines.push(`  ${warning}`))
  }

  if (result.suggestedCurrency) {
    lines.push(`💡 SUGGESTION: Change currency to ${result.suggestedCurrency}`)
  }

  if (result.isValid && result.warnings.length === 0) {
    lines.push('✅ Validation passed')
  }

  return lines.join('\n')
}
