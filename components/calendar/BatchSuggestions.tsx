"use client"

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { formatDate } from '@/lib/calendar-utils'
import type { BatchSuggestion } from '@/lib/availability-intelligence'
import Link from 'next/link'

interface BatchSuggestionsProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date | null
  suggestions: BatchSuggestion[]
}

export function BatchSuggestions({
  isOpen,
  onClose,
  selectedDate,
  suggestions,
}: BatchSuggestionsProps) {
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
            <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-[80vh] flex flex-col">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <Dialog.Title className="text-lg font-semibold text-foreground">
                  💡 Batch Suggestions for {formatDate(selectedDate)}
                </Dialog.Title>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {suggestions.length > 0
                    ? `${suggestions.length} batch opportunities based on teacher availability`
                    : 'No batch opportunities found for this date'}
                </p>
              </div>

              {/* Suggestions list */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {suggestions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className="text-6xl mb-4">😔</div>
                    <p className="text-lg font-medium text-foreground">
                      No teachers available
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      All teachers are fully booked on this date.
                      <br />
                      Try selecting a different date or check when teachers become available.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {suggestions.map((suggestion, index) => {
                      const scoreColor =
                        suggestion.feasibilityScore >= 80
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                          : suggestion.feasibilityScore >= 60
                          ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                          : 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'

                      return (
                        <div
                          key={`${suggestion.teacher.id}-${suggestion.suggestedLevel}-${suggestion.suggestedTiming}-${index}`}
                          className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              {/* Teacher and level */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-foreground">
                                  {suggestion.teacher.name}
                                </p>
                                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                                  {suggestion.suggestedLevel}
                                </span>
                                <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded">
                                  {suggestion.suggestedTiming}
                                </span>
                              </div>

                              {/* Reason */}
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                {suggestion.reason}
                              </p>

                              {/* Warnings */}
                              {suggestion.warnings.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {suggestion.warnings.map((warning, wIndex) => (
                                    <p
                                      key={wIndex}
                                      className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1"
                                    >
                                      <span>⚠️</span>
                                      {warning}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Score and action */}
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                              <div
                                className={`px-3 py-1.5 rounded-lg text-sm font-bold ${scoreColor}`}
                              >
                                {suggestion.feasibilityScore}%
                              </div>

                              <Link
                                href={`/dashboard/batches/new?startDate=${dateStr}&teacherId=${suggestion.teacher.id}&level=${suggestion.suggestedLevel}&timing=${suggestion.suggestedTiming}`}
                                className="px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                              >
                                Create Batch
                              </Link>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  Close
                </button>
                {suggestions.length > 0 && (
                  <Link
                    href={`/dashboard/batches/new?startDate=${dateStr}`}
                    className="px-4 py-2 text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Create Custom Batch
                  </Link>
                )}
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}
