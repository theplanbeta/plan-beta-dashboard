'use client'

import { Fragment, useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'

interface Batch {
  id: string
  name: string
}

interface LogHoursModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editEntry?: {
    id: string
    batchId: string | null
    date: Date
    hoursWorked: number
    description: string
  } | null
  teacherId: string
  teacherHourlyRate?: number | null
  batches: Batch[]
}

export default function LogHoursModal({
  isOpen,
  onClose,
  onSuccess,
  editEntry,
  teacherId,
  teacherHourlyRate,
  batches,
}: LogHoursModalProps) {
  const [batchId, setBatchId] = useState<string>('')
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [hoursWorked, setHoursWorked] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [hourlyRate, setHourlyRate] = useState<string>(teacherHourlyRate?.toString() || '')
  const [loading, setLoading] = useState(false)

  // Reset form when modal opens/closes or edit entry changes
  useEffect(() => {
    if (isOpen) {
      if (editEntry) {
        setBatchId(editEntry.batchId || '')
        setDate(format(new Date(editEntry.date), 'yyyy-MM-dd'))
        setHoursWorked(editEntry.hoursWorked.toString())
        setDescription(editEntry.description)
      } else {
        setBatchId('')
        setDate(format(new Date(), 'yyyy-MM-dd'))
        setHoursWorked('')
        setDescription('')
        setHourlyRate(teacherHourlyRate?.toString() || '')
      }
    }
  }, [isOpen, editEntry, teacherHourlyRate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!hoursWorked || parseFloat(hoursWorked) <= 0) {
      toast.error('Please enter valid hours worked')
      return
    }

    if (parseFloat(hoursWorked) > 24) {
      toast.error('Hours cannot exceed 24')
      return
    }

    if (!description.trim()) {
      toast.error('Please enter a description')
      return
    }

    if (description.trim().length > 500) {
      toast.error('Description too long (max 500 characters)')
      return
    }

    setLoading(true)

    try {
      const payload = {
        batchId: batchId || undefined,
        date,
        hoursWorked: parseFloat(hoursWorked),
        description: description.trim(),
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
      }

      let response

      if (editEntry) {
        // Update existing entry
        response = await fetch(`/api/teacher-hours/${editEntry.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        // Create new entry
        response = await fetch('/api/teacher-hours', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save hours')
      }

      toast.success(editEntry ? 'Hours updated successfully' : 'Hours logged successfully')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error saving hours:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save hours')
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
                    className="text-lg font-semibold text-gray-900 dark:text-white"
                  >
                    {editEntry ? 'Edit Hours' : 'Log Hours'}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Batch Selection */}
                  <div>
                    <label
                      htmlFor="batch"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Batch (Optional)
                    </label>
                    <select
                      id="batch"
                      value={batchId}
                      onChange={(e) => setBatchId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">No specific batch</option>
                      {batches.map((batch) => (
                        <option key={batch.id} value={batch.id}>
                          {batch.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date */}
                  <div>
                    <label
                      htmlFor="date"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Date *
                    </label>
                    <input
                      type="date"
                      id="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      max={format(new Date(), 'yyyy-MM-dd')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Hours Worked */}
                  <div>
                    <label
                      htmlFor="hours"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Hours Worked *
                    </label>
                    <input
                      type="number"
                      id="hours"
                      value={hoursWorked}
                      onChange={(e) => setHoursWorked(e.target.value)}
                      required
                      min="0.25"
                      max="24"
                      step="0.25"
                      placeholder="e.g., 2.5"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Hourly Rate */}
                  <div>
                    <label
                      htmlFor="rate"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Hourly Rate (€) {teacherHourlyRate && '(Auto-filled from profile)'}
                    </label>
                    <input
                      type="number"
                      id="rate"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      min="0"
                      step="0.01"
                      placeholder="Optional"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Description *
                    </label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                      rows={3}
                      maxLength={500}
                      placeholder="What did you work on?"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {description.length}/500 characters
                    </p>
                  </div>

                  {/* Calculated Total */}
                  {hoursWorked && hourlyRate && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                          Total Amount:
                        </span>
                        <span className="text-lg font-bold text-blue-900 dark:text-blue-300">
                          €{(parseFloat(hoursWorked) * parseFloat(hourlyRate)).toFixed(2)}
                        </span>
                      </div>
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
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : editEntry ? 'Update' : 'Log Hours'}
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
