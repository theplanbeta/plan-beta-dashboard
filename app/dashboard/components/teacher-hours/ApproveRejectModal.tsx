'use client'

import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { TeacherHourEntry } from './HoursListTable'

interface ApproveRejectModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  entry: TeacherHourEntry | null
  mode: 'approve' | 'reject'
}

export default function ApproveRejectModal({
  isOpen,
  onClose,
  onSuccess,
  entry,
  mode,
}: ApproveRejectModalProps) {
  const [rejectionReason, setRejectionReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!entry) return

    if (mode === 'reject' && !rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection')
      return
    }

    setLoading(true)

    try {
      const payload =
        mode === 'approve'
          ? { status: 'APPROVED' }
          : { status: 'REJECTED', rejectionReason: rejectionReason.trim() }

      const response = await fetch(`/api/teacher-hours/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Failed to ${mode} entry`)
      }

      toast.success(mode === 'approve' ? 'Entry approved' : 'Entry rejected')
      setRejectionReason('')
      onSuccess()
      onClose()
    } catch (error) {
      console.error(`Error ${mode}ing entry:`, error)
      toast.error(error instanceof Error ? error.message : `Failed to ${mode} entry`)
    } finally {
      setLoading(false)
    }
  }

  if (!entry) return null

  const isApprove = mode === 'approve'

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 dark:bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"
                  >
                    {isApprove ? (
                      <>
                        <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                        Approve Hours
                      </>
                    ) : (
                      <>
                        <XCircleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                        Reject Hours
                      </>
                    )}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Entry Details */}
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Teacher:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {entry.teacher?.name}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Date:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {format(new Date(entry.date), 'MMM dd, yyyy')}
                    </span>
                  </div>
                  {entry.batch && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Batch:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {entry.batch.name}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Hours:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {Number(entry.hoursWorked).toFixed(1)}h
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Rate:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {entry.hourlyRate ? `€${Number(entry.hourlyRate).toFixed(2)}` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-gray-300 dark:border-gray-600 pt-2 mt-2">
                    <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      €{Number(entry.totalAmount).toFixed(2)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-300 dark:border-gray-600">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Description:</p>
                    <p className="text-sm text-gray-900 dark:text-white">{entry.description}</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Rejection Reason */}
                  {!isApprove && (
                    <div>
                      <label
                        htmlFor="reason"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      >
                        Reason for Rejection *
                      </label>
                      <textarea
                        id="reason"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        required
                        rows={3}
                        placeholder="Explain why this entry is being rejected..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                      />
                    </div>
                  )}

                  {/* Confirmation Message */}
                  {isApprove && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                      <p className="text-sm text-green-800 dark:text-green-300">
                        This will approve the hours entry. The teacher will be able to see the
                        approval status.
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
                        isApprove
                          ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                          : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                      }`}
                    >
                      {loading ? 'Processing...' : isApprove ? 'Approve' : 'Reject'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
