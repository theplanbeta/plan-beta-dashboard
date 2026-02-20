import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: 'EUR' | 'INR' = 'EUR'): string {
  const locale = currency === 'EUR' ? 'en-DE' : 'en-IN'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'INR' ? 0 : 2,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-DE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Europe/Berlin',
  }).format(d)
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-DE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Berlin',
  }).format(d)
}

export function generateStudentId(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `${year}-${month}-${random}`
}

export function calculateAttendanceRate(attended: number, total: number): number {
  if (total === 0) return 0
  return Math.round((attended / total) * 100)
}

export function getChurnRisk(attendanceRate: number, lastClassDate: Date | null): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (!lastClassDate) return 'MEDIUM'

  const daysSinceLastClass = Math.floor((new Date().getTime() - new Date(lastClassDate).getTime()) / (1000 * 60 * 60 * 24))

  if (attendanceRate < 50 || daysSinceLastClass > 14) return 'HIGH'
  if (attendanceRate < 70 || daysSinceLastClass > 7) return 'MEDIUM'
  return 'LOW'
}
