'use client'

import { ClockIcon, CheckCircleIcon, XCircleIcon, BanknotesIcon } from '@heroicons/react/24/outline'
import { formatCurrency } from '@/lib/utils'

interface HoursSummary {
  pending: { count: number; totalHours: number; totalAmount: number }
  approved: { count: number; totalHours: number; totalAmount: number }
  rejected: { count: number; totalHours: number; totalAmount: number }
  paid: { count: number; totalHours: number; totalAmount: number }
}

interface HoursSummaryCardsProps {
  summary: HoursSummary
  loading?: boolean
}

export default function HoursSummaryCards({ summary, loading }: HoursSummaryCardsProps) {
  // Provide default values if summary is undefined
  const safeSummary = summary || {
    pending: { count: 0, totalHours: 0, totalAmount: 0 },
    approved: { count: 0, totalHours: 0, totalAmount: 0 },
    rejected: { count: 0, totalHours: 0, totalAmount: 0 },
    paid: { count: 0, totalHours: 0, totalAmount: 0 },
  }

  const cards = [
    {
      title: 'Pending',
      icon: ClockIcon,
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      count: safeSummary.pending?.count || 0,
      hours: safeSummary.pending?.totalHours || 0,
      amount: safeSummary.pending?.totalAmount || 0,
    },
    {
      title: 'Approved',
      icon: CheckCircleIcon,
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      count: safeSummary.approved?.count || 0,
      hours: safeSummary.approved?.totalHours || 0,
      amount: safeSummary.approved?.totalAmount || 0,
    },
    {
      title: 'Paid',
      icon: BanknotesIcon,
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
      count: safeSummary.paid?.count || 0,
      hours: safeSummary.paid?.totalHours || 0,
      amount: safeSummary.paid?.totalAmount || 0,
    },
    {
      title: 'Rejected',
      icon: XCircleIcon,
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
      count: safeSummary.rejected?.count || 0,
      hours: safeSummary.rejected?.totalHours || 0,
      amount: safeSummary.rejected?.totalAmount || 0,
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-5 animate-pulse"
          >
            <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg mb-3" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2" />
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.title}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md dark:hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${card.iconBg}`}>
                <Icon className={`h-6 w-6 ${card.iconColor}`} />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              {card.title}
            </h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {card.count}
            </p>
            <div className="flex flex-col gap-0.5 text-xs text-gray-500 dark:text-gray-400">
              <span>{Number(card.hours).toFixed(1)} hours</span>
              <span className="font-medium">
                {formatCurrency(card.amount, 'INR')}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
