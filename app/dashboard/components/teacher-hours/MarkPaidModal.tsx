'use client'

import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, BanknotesIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { TeacherHourEntry } from './HoursListTable'

interface MarkPaidModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  entry: TeacherHourEntry | null
}

export default function MarkPaidModal({
  isOpen,
  onClose,
  onSuccess,
  entry,
}: MarkPaidModalProps) {
  const [paidDate, setPaidDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [paidAmount, setPaidAmount] = useState<string>(entry?.totalAmount.toString() || '')
  const [paymentNotes, setPaymentNotes] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!entry) return

    if (!paidAmount || parseFloat(paidAmount) <= 0) {
      toast.error('Please enter a valid payment amount')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/teacher-hours/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paid: true,
          paidDate,
          paidAmount: parseFloat(paidAmount),
          paymentNotes: paymentNotes.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to mark as paid')
      }

      toast.success('Payment recorded successfully')
      setPaidDate(format(new Date(), 'yyyy-MM-dd'))
      setPaidAmount('')
      setPaymentNotes('')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error marking as paid:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to mark as paid')
    } finally {
      setLoading(false)
    }
  }

  // Update paidAmount when entry changes
  useState(() => {
    if (entry) {
      setPaidAmount(entry.totalAmount.toString())
    }
  })

  if (!entry) return null

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
                    <BanknotesIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                    Mark as Paid
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
                      {Number(entry.hoursWorked).toFixed(1)}h @ €
                      {entry.hourlyRate ? Number(entry.hourlyRate).toFixed(2) : '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-gray-300 dark:border-gray-600 pt-2 mt-2">
                    <span className="text-gray-600 dark:text-gray-400">Original Amount:</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      €{Number(entry.totalAmount).toFixed(2)}
                    </span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Payment Date */}
                  <div>
                    <label
                      htmlFor="paidDate"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Payment Date *
                    </label>
                    <input
                      type="date"
                      id="paidDate"
                      value={paidDate}
                      onChange={(e) => setPaidDate(e.target.value)}
                      required
                      max={format(new Date(), 'yyyy-MM-dd')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  {/* Paid Amount */}
                  <div>
                    <label
                      htmlFor="paidAmount"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Amount Paid (€) *
                    </label>
                    <input
                      type="number"
                      id="paidAmount"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      required
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    {paidAmount &&
                      parseFloat(paidAmount) !== Number(entry.totalAmount) && (
                        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                          Amount differs from original total (€
                          {Number(entry.totalAmount).toFixed(2)})
                        </p>
                      )}
                  </div>

                  {/* Payment Notes */}
                  <div>
                    <label
                      htmlFor="notes"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Payment Notes (Optional)
                    </label>
                    <textarea
                      id="notes"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      rows={3}
                      placeholder="E.g., Payment method, transaction ID, adjustments..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Confirmation */}
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                    <p className="text-sm text-green-800 dark:text-green-300">
                      This will mark the hours as paid and record the payment details. The teacher
                      will be able to see this in their hours log.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : 'Mark as Paid'}
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
