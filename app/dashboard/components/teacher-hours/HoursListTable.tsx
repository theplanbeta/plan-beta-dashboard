'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { PencilIcon, TrashIcon, CheckIcon, XMarkIcon, BanknotesIcon } from '@heroicons/react/24/outline'
import HoursStatusBadge from './HoursStatusBadge'

export interface TeacherHourEntry {
  id: string
  teacherId: string
  batchId: string | null
  date: Date
  hoursWorked: number
  description: string
  hourlyRate: number | null
  totalAmount: number
  paid: boolean
  paidDate: Date | null
  paidAmount: number | null
  paymentNotes: string | null
  status: string
  approvedBy: string | null
  approvedAt: Date | null
  rejectionReason: string | null
  createdAt: Date
  updatedAt: Date
  teacher?: { name: string; email: string }
  batch?: { batchCode: string; name?: string }
}

interface HoursListTableProps {
  entries: TeacherHourEntry[]
  loading?: boolean
  isFounder?: boolean
  onEdit?: (entry: TeacherHourEntry) => void
  onDelete?: (entry: TeacherHourEntry) => void
  onApprove?: (entry: TeacherHourEntry) => void
  onReject?: (entry: TeacherHourEntry) => void
  onMarkPaid?: (entry: TeacherHourEntry) => void
}

export default function HoursListTable({
  entries,
  loading,
  isFounder = false,
  onEdit,
  onDelete,
  onApprove,
  onReject,
  onMarkPaid,
}: HoursListTableProps) {
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [paidFilter, setPaidFilter] = useState<string>('ALL')

  // Filter entries
  const filteredEntries = entries.filter((entry) => {
    if (statusFilter !== 'ALL' && entry.status !== statusFilter) return false
    if (paidFilter === 'PAID' && !entry.paid) return false
    if (paidFilter === 'UNPAID' && entry.paid) return false
    return true
  })

  // Sort by date (most recent first)
  const sortedEntries = [...filteredEntries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-40 animate-pulse" />
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700">
      {/* Header with filters */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Hours Log ({sortedEntries.length})
          </h2>
          <div className="flex flex-wrap gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <select
              value={paidFilter}
              onChange={(e) => setPaidFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">All Payment</option>
              <option value="PAID">Paid</option>
              <option value="UNPAID">Unpaid</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Date
              </th>
              {isFounder && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Teacher
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Batch
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Hours
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedEntries.length === 0 ? (
              <tr>
                <td colSpan={isFounder ? 9 : 8} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                  No hours logged yet
                </td>
              </tr>
            ) : (
              sortedEntries.map((entry) => (
                <tr
                  key={entry.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {format(new Date(entry.date), 'MMM dd, yyyy')}
                  </td>
                  {isFounder && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      <div>
                        <div className="font-medium">{entry.teacher?.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{entry.teacher?.email}</div>
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                    {entry.batch?.batchCode || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    {Number(entry.hoursWorked).toFixed(1)}h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                    {entry.hourlyRate ? `€${Number(entry.hourlyRate).toFixed(2)}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    €{Number(entry.totalAmount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <HoursStatusBadge status={entry.status} paid={entry.paid} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">
                    {entry.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {/* Teacher actions - only for PENDING entries */}
                      {!isFounder && entry.status === 'PENDING' && (
                        <>
                          {onEdit && (
                            <button
                              onClick={() => onEdit(entry)}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                              title="Edit"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={() => onDelete(entry)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                              title="Delete"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          )}
                        </>
                      )}

                      {/* Founder actions */}
                      {isFounder && (
                        <>
                          {entry.status === 'PENDING' && (
                            <>
                              {onApprove && (
                                <button
                                  onClick={() => onApprove(entry)}
                                  className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                                  title="Approve"
                                >
                                  <CheckIcon className="h-5 w-5" />
                                </button>
                              )}
                              {onReject && (
                                <button
                                  onClick={() => onReject(entry)}
                                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                  title="Reject"
                                >
                                  <XMarkIcon className="h-5 w-5" />
                                </button>
                              )}
                            </>
                          )}
                          {entry.status === 'APPROVED' && !entry.paid && onMarkPaid && (
                            <button
                              onClick={() => onMarkPaid(entry)}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                              title="Mark as Paid"
                            >
                              <BanknotesIcon className="h-5 w-5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
