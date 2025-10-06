// Centralized Pricing Configuration for Plan Beta School of German
// Single source of truth for all course fees and pricing logic

export type Currency = 'EUR' | 'INR'
export type CourseLevel = 'A1' | 'A1_HYBRID' | 'A2' | 'B1' | 'B2'

export interface PricingInfo {
  EUR: number
  INR: number
}

export interface CoursePricing extends PricingInfo {
  level: CourseLevel
  label: string
  description: string
  color: string
}

// Official course pricing - matches invoice generator
export const COURSE_PRICING: Record<CourseLevel, PricingInfo> = {
  A1: {
    EUR: 134,
    INR: 14000,
  },
  A1_HYBRID: {
    EUR: 100,
    INR: 10000,
  },
  A2: {
    EUR: 156,
    INR: 16000,
  },
  B1: {
    EUR: 172,
    INR: 18000,
  },
  B2: {
    EUR: 220,
    INR: 22000,
  },
}

// Course metadata
export const COURSE_INFO: Record<CourseLevel, Omit<CoursePricing, 'EUR' | 'INR'>> = {
  A1: {
    level: 'A1',
    label: 'A1 - Beginner',
    description: 'German Language Course - A1 Level',
    color: '#10b981', // green
  },
  A1_HYBRID: {
    level: 'A1_HYBRID',
    label: 'A1 Hybrid',
    description: 'German Language Course - A1 Hybrid',
    color: '#06b6d4', // cyan
  },
  A2: {
    level: 'A2',
    label: 'A2 - Elementary',
    description: 'German Language Course - A2 Level',
    color: '#3b82f6', // blue
  },
  B1: {
    level: 'B1',
    label: 'B1 - Intermediate',
    description: 'German Language Course - B1 Level',
    color: '#f59e0b', // amber
  },
  B2: {
    level: 'B2',
    label: 'B2 - Upper Intermediate',
    description: 'German Language Course - B2 Level',
    color: '#8b5cf6', // purple
  },
}

// Currency symbols
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  EUR: '€',
  INR: '₹',
}

// Get price for a specific level and currency
export function getPrice(level: CourseLevel, currency: Currency = 'EUR'): number {
  return COURSE_PRICING[level][currency]
}

// Get currency symbol
export function getCurrencySymbol(currency: Currency): string {
  return CURRENCY_SYMBOLS[currency]
}

// Calculate final price after discount
export function calculateFinalPrice(
  originalPrice: number,
  discount: number = 0
): number {
  return Math.max(0, originalPrice - discount)
}

// Calculate remaining balance
export function calculateBalance(
  finalPrice: number,
  amountPaid: number = 0
): number {
  return Math.max(0, finalPrice - amountPaid)
}

// Format currency amount
export function formatCurrency(
  amount: number,
  currency: Currency = 'EUR',
  includeSymbol: boolean = true
): string {
  const formatted = amount.toFixed(2)
  return includeSymbol ? `${CURRENCY_SYMBOLS[currency]}${formatted}` : formatted
}

// All available course levels for dropdowns
export const COURSE_LEVELS: CourseLevel[] = Object.keys(COURSE_PRICING) as CourseLevel[]

// Batch timing options
export const BATCH_TIMINGS = ['Morning', 'Evening'] as const

// Month options
export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

// Bank details for invoices
export const BANK_DETAILS = {
  accountName: 'PLAN BETA',
  accountNumber: '50200087416170',
  ifscCode: 'HDFC0009459',
  upiId: '7736638706@ybl',
} as const

// School information
export const SCHOOL_INFO = {
  name: 'Plan Beta School of German',
  address: 'KRA A-23, Chattamby Swamy Nagar',
  city: 'Kannammoola, Thiruvananthapuram',
  state: 'Kerala 695011, India',
  gst: '32AJVPS3359N1ZB',
  email: 'info@planbeta.in',
  phone: '+91 8547081550',
} as const

// Refund policy text (for invoices)
export const REFUND_POLICY =
  'Payment due today. By making this payment, you acknowledge and accept our refund policy: Once the first class of the batch has commenced, all fees are non-refundable regardless of attendance. This policy exists because our small group batches begin with committed class sizes and instructor compensation is allocated accordingly from the course fees. This term is binding and non-negotiable upon payment. The remaining balance, if any, must be paid within 7 days from the first class date, irrespective of attendance.'
