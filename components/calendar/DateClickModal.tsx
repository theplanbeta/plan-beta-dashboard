"use client"

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { formatDate } from '@/lib/calendar-utils'
import Link from 'next/link'

interface DateClickModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date | null
  onShowSuggestions: () => void
  onShowDayOverview: () => void
  suggestionsCount: number
  dayOverviewData: {
    batchesRunning: number
    teachersAvailable: number
  }
}

export function DateClickModal({
  isOpen,
  onClose,
  selectedDate,
  onShowSuggestions,
  onShowDayOverview,
  suggestionsCount,
  dayOverviewData,
}: DateClickModalProps) {
  if (!selectedDate) return null

  const dateStr = selectedDate.toISOString().split('T')[0]

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </Transition.Child>

        {/* Modal */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="mx-auto max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <Dialog.Title className="text-lg font-semibold text-foreground">
                  Actions for {formatDate(selectedDate)}
                </Dialog.Title>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Choose an action to perform on this date
                </p>
              </div>

              {/* Actions */}
              <div className="px-6 py-4 space-y-2">
                {/* Add Lead */}
                <Link
                  href={`/dashboard/leads/new?followUpDate=${dateStr}`}
                  className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xl">
                    📝
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      Add Lead
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Set follow-up date to {formatDate(selectedDate)}
                    </p>
                  </div>
                </Link>

                {/* Create Batch */}
                <Link
                  href={`/dashboard/batches/new?startDate=${dateStr}`}
                  className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-400 text-xl">
                    ➕
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground group-hover:text-green-600 dark:group-hover:text-green-400">
                      Create Batch
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Starting on {formatDate(selectedDate)}
                    </p>
                  </div>
                </Link>

                {/* Add Reminder */}
                <button
                  onClick={() => {
                    // TODO: Open reminder creation modal
                    alert('Reminder creation coming soon!')
                    onClose()
                  }}
                  className="w-full flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center text-yellow-600 dark:text-yellow-400 text-xl">
                    ⏰
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-foreground group-hover:text-yellow-600 dark:group-hover:text-yellow-400">
                      Add Reminder
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Due on {formatDate(selectedDate)}
                    </p>
                  </div>
                </button>

                {/* Divider */}
                <div className="py-2">
                  <div className="border-t border-gray-200 dark:border-gray-700" />
                </div>

                {/* See Batch Suggestions */}
                <button
                  onClick={() => {
                    onShowSuggestions()
                    onClose()
                  }}
                  className="w-full flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-400 text-xl">
                    💡
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400">
                        See Batch Suggestions
                      </p>
                      {suggestionsCount > 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full">
                          {suggestionsCount}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Based on teacher availability
                    </p>
                  </div>
                </button>

                {/* View Day Overview */}
                <button
                  onClick={() => {
                    onShowDayOverview()
                    onClose()
                  }}
                  className="w-full flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 text-xl">
                    👁️
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-foreground group-hover:text-gray-600 dark:group-hover:text-gray-400">
                      View Day Overview
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {dayOverviewData.batchesRunning} batches running, {dayOverviewData.teachersAvailable} teachers available
                    </p>
                  </div>
                </button>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  Cancel
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}
