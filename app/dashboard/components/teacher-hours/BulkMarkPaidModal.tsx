'use client'

import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, BanknotesIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'

interface BulkMarkPaidModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  teacherId: string
  teacherName: string
  unpaidAmount: number
  unpaidHours: number
  period: {
    month?: string
    year?: string
    startDate: string
    endDate: string
  }
}

export default function BulkMarkPaidModal({
  isOpen,
  onClose,
  onSuccess,
  teacherId,
  teacherName,
  unpaidAmount,
  unpaidHours,
  period,
}: BulkMarkPaidModalProps) {
  const [paidDate, setPaidDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [paymentMethod, setPaymentMethod] = useState<string>('BANK_TRANSFER')
  const [transactionId, setTransactionId] = useState<string>('')
  const [paymentNotes, setPaymentNotes] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (unpaidAmount <= 0) {
      toast.error('No unpaid hours to mark as paid')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/teacher-hours/bulk-mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId,
          startDate: period.startDate,
          endDate: period.endDate,
          paidDate,
          paymentMethod,
          transactionId: transactionId.trim() || undefined,
          paymentNotes: paymentNotes.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to mark hours as paid')
      }

      const result = await response.json()
      toast.success(`${result.updatedCount} hour entries marked as paid`)
      setPaidDate(format(new Date(), 'yyyy-MM-dd'))
      setPaymentMethod('BANK_TRANSFER')
      setTransactionId('')
      setPaymentNotes('')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error marking hours as paid:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to mark hours as paid')
    } finally {
      setLoading(false)
    }
  }

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
                    Mark All Unpaid Hours as Paid
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Summary */}
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Teacher:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {teacherName}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Period:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {period.month || period.year || `${format(new Date(period.startDate), 'MMM dd')} - ${format(new Date(period.endDate), 'MMM dd, yyyy')}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Unpaid Hours:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {unpaidHours.toFixed(2)}h
                    </span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-gray-300 dark:border-gray-600 pt-2 mt-2">
                    <span className="text-gray-600 dark:text-gray-400">Total Unpaid Amount:</span>
                    <span className="font-bold text-gray-900 dark:text-white text-lg">
                      {formatCurrency(unpaidAmount, 'INR')}
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

                  {/* Payment Method */}
                  <div>
                    <label
                      htmlFor="paymentMethod"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Payment Method *
                    </label>
                    <select
                      id="paymentMethod"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="UPI">UPI</option>
                      <option value="CASH">Cash</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  {/* Transaction ID */}
                  <div>
                    <label
                      htmlFor="transactionId"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Transaction ID / Reference (Optional)
                    </label>
                    <input
                      type="text"
                      id="transactionId"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="e.g., UTR number, transaction reference"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
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
                      placeholder="Add any additional details about this payment..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Warning */}
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                    <p className="text-sm text-green-800 dark:text-green-300">
                      This will mark all unpaid approved hours for {teacherName} in this period as paid.
                      The teacher will be able to see the payment details in their hours log.
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
                      disabled={loading || unpaidAmount <= 0}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : 'Confirm Payment'}
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
