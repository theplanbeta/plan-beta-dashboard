import { NextResponse } from 'next/server'

// Cache rate for 5 minutes to avoid hammering the API
let cachedRate: { value: number; time: number } | null = null
const CACHE_TTL = 5 * 60 * 1000

export async function GET() {
  try {
    const now = Date.now()

    if (cachedRate && now - cachedRate.time < CACHE_TTL) {
      return NextResponse.json({
        rate: cachedRate.value,
        cachedAt: new Date(cachedRate.time).toISOString(),
        source: 'wise',
      })
    }

    const res = await fetch('https://wise.com/rates/live?source=EUR&target=INR', {
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      throw new Error(`Wise API returned ${res.status}`)
    }

    const data = await res.json()
    const rate = data.value

    if (!rate || typeof rate !== 'number') {
      throw new Error('Invalid rate from Wise')
    }

    cachedRate = { value: rate, time: now }

    return NextResponse.json({
      rate,
      cachedAt: new Date(now).toISOString(),
      source: 'wise',
    })
  } catch (error) {
    console.error('Exchange rate fetch error:', error)

    // Fall back to cached rate if available
    if (cachedRate) {
      return NextResponse.json({
        rate: cachedRate.value,
        cachedAt: new Date(cachedRate.time).toISOString(),
        source: 'wise',
        stale: true,
      })
    }

    return NextResponse.json(
      { error: 'Failed to fetch exchange rate' },
      { status: 502 }
    )
  }
}
