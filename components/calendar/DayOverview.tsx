"use client"

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { formatDate } from '@/lib/calendar-utils'
import Link from 'next/link'

interface Batch {
  id: string
  batchCode: string
  level: string
  status: string
  enrolledCount: number
  totalSeats: number
}

interface Teacher {
  id: string
  name: string
  email: string
}

interface DayOverviewProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date | null
  data: {
    batchesRunning: Batch[]
    teachersAvailable: Teacher[]
    teachersOccupied: Teacher[]
    totalCapacity: number
    usedCapacity: number
  }
}

export function DayOverview({
  isOpen,
  onClose,
  selectedDate,
  data,
}: DayOverviewProps) {
  if (!selectedDate) return null

  const capacityPercentage = (data.usedCapacity / data.totalCapacity) * 100

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
                  👁️ Day Overview - {formatDate(selectedDate)}
                </Dialog.Title>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Complete snapshot of batches and teacher availability
                </p>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                {/* Capacity stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="panel p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Batches Running
                    </p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {data.batchesRunning.length}
                    </p>
                  </div>

                  <div className="panel p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Teachers Available
                    </p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                      {data.teachersAvailable.length}
                    </p>
                  </div>

                  <div className="panel p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Capacity Used
                    </p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {data.usedCapacity}/{data.totalCapacity}
                    </p>
                  </div>
                </div>

                {/* Capacity bar */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">
                      Overall Capacity
                    </span>
                    <span className="font-medium text-foreground">
                      {capacityPercentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        capacityPercentage >= 80
                          ? 'bg-red-500'
                          : capacityPercentage >= 60
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${capacityPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Batches running */}
                <div>
                  <h3 className="font-semibold text-foreground mb-3">
                    Batches Running ({data.batchesRunning.length})
                  </h3>
                  {data.batchesRunning.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      No batches running on this date
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {data.batchesRunning.map((batch) => (
                        <Link
                          key={batch.id}
                          href={`/dashboard/batches/${batch.id}`}
                          className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-foreground">
                              {batch.batchCode}
                            </span>
                            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                              {batch.level}
                            </span>
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded ${
                                batch.status === 'RUNNING'
                                  ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {batch.status}
                            </span>
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {batch.enrolledCount}/{batch.totalSeats} students
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Teachers available */}
                <div>
                  <h3 className="font-semibold text-foreground mb-3">
                    Teachers Available ({data.teachersAvailable.length})
                  </h3>
                  {data.teachersAvailable.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      All teachers are fully booked
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {data.teachersAvailable.map((teacher) => (
                        <div
                          key={teacher.id}
                          className="flex items-center justify-between p-3 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-foreground">
                              {teacher.name}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {teacher.email}
                            </p>
                          </div>
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                            Available
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Teachers occupied */}
                {data.teachersOccupied.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-foreground mb-3">
                      Teachers Fully Booked ({data.teachersOccupied.length})
                    </h3>
                    <div className="space-y-2">
                      {data.teachersOccupied.map((teacher) => (
                        <div
                          key={teacher.id}
                          className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-foreground">
                              {teacher.name}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {teacher.email}
                            </p>
                          </div>
                          <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
                            2/2 Slots
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  Close
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}
