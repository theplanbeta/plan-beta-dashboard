import { EXCHANGE_RATE } from "./pricing"

export type SupportedCurrency = "EUR" | "INR"

export function normalizeCurrency(value?: string | null): SupportedCurrency {
  return value === "INR" ? "INR" : "EUR"
}

export function convertAmount(
  amount: number,
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency
): number {
  if (!Number.isFinite(amount) || amount === 0) return 0
  if (fromCurrency === toCurrency) return amount

  if (fromCurrency === "EUR" && toCurrency === "INR") {
    return amount * EXCHANGE_RATE
  }

  if (fromCurrency === "INR" && toCurrency === "EUR") {
    return amount / EXCHANGE_RATE
  }

  return amount
}
