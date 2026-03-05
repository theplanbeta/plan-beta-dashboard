// Marketing prices — decoupled from billing (lib/pricing.ts)
// B1 marketing price is €176, billing price is €172

export type MarketingLevel = 'A1' | 'A2' | 'B1' | 'B2'

export const MARKETING_PRICES: Record<MarketingLevel, { EUR: number; INR: number }> = {
  A1: { EUR: 134, INR: 14000 },
  A2: { EUR: 156, INR: 16000 },
  B1: { EUR: 176, INR: 18000 },
  B2: { EUR: 220, INR: 22000 },
}

export function getCurrencyFromCountry(country: string | null): 'EUR' | 'INR' {
  return country === 'IN' ? 'INR' : 'EUR'
}

export function getMarketingPrice(level: MarketingLevel, currency: 'EUR' | 'INR'): string {
  const price = MARKETING_PRICES[level]
  if (!price) return ''
  if (currency === 'INR') {
    return `\u20B9${price.INR.toLocaleString('en-IN')}`
  }
  return `\u20AC${price.EUR}`
}
