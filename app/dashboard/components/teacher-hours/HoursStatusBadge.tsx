'use client'

interface HoursStatusBadgeProps {
  status: string
  paid?: boolean
}

export default function HoursStatusBadge({ status, paid }: HoursStatusBadgeProps) {
  // Determine badge color and text based on status and payment
  const getBadgeStyles = () => {
    if (paid) {
      return {
        text: 'PAID',
        bgClass: 'bg-green-100 dark:bg-green-900/30',
        textClass: 'text-green-800 dark:text-green-300',
        dotClass: 'bg-green-500'
      }
    }

    switch (status) {
      case 'PENDING':
        return {
          text: 'PENDING',
          bgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
          textClass: 'text-yellow-800 dark:text-yellow-300',
          dotClass: 'bg-yellow-500'
        }
      case 'APPROVED':
        return {
          text: 'APPROVED',
          bgClass: 'bg-blue-100 dark:bg-blue-900/30',
          textClass: 'text-blue-800 dark:text-blue-300',
          dotClass: 'bg-blue-500'
        }
      case 'REJECTED':
        return {
          text: 'REJECTED',
          bgClass: 'bg-red-100 dark:bg-red-900/30',
          textClass: 'text-red-800 dark:text-red-300',
          dotClass: 'bg-red-500'
        }
      default:
        return {
          text: status,
          bgClass: 'bg-gray-100 dark:bg-gray-700',
          textClass: 'text-gray-800 dark:text-gray-300',
          dotClass: 'bg-gray-500'
        }
    }
  }

  const { text, bgClass, textClass, dotClass } = getBadgeStyles()

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${bgClass} ${textClass}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      {text}
    </span>
  )
}
