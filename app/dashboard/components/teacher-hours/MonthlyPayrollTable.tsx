'use client'

import { useState } from 'react'
import { ChevronDownIcon, ChevronRightIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { formatCurrency } from '@/lib/utils'
import { TeacherPayrollSummary } from '@/app/api/teacher-hours/monthly-payroll/route'

interface MonthlyPayrollTableProps {
  teachers: TeacherPayrollSummary[]
  grandTotal: {
    totalTeachers: number
    totalHours: number
    totalApproved: number
    totalPaid: number
    totalUnpaid: number
  }
  period: {
    month?: string
    year?: string
    startDate: string
    endDate: string
  }
  loading: boolean
}

export default function MonthlyPayrollTable({
  teachers,
  grandTotal,
  period,
  loading,
}: MonthlyPayrollTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRow = (teacherId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(teacherId)) {
      newExpanded.delete(teacherId)
    } else {
      newExpanded.add(teacherId)
    }
    setExpandedRows(newExpanded)
  }

  const exportToCSV = () => {
    const headers = ['Teacher', 'Email', 'Hourly Rate (INR)', 'Total Hours', 'Total Approved (INR)', 'Paid (INR)', 'Unpaid (INR)']
    const rows = teachers.map((t) => [
      t.teacherName,
      t.teacherEmail,
      t.hourlyRate.toFixed(2),
      t.totalHours.toFixed(2),
      t.totalApproved.toFixed(2),
      t.totalPaid.toFixed(2),
      t.totalUnpaid.toFixed(2),
    ])

    // Add grand total row
    rows.push([
      'TOTAL',
      '',
      '',
      grandTotal.totalHours.toFixed(2),
      grandTotal.totalApproved.toFixed(2),
      grandTotal.totalPaid.toFixed(2),
      grandTotal.totalUnpaid.toFixed(2),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    const periodLabel = period.month || period.year || 'payroll'
    link.setAttribute('href', url)
    link.setAttribute('download', `teacher-payroll-${periodLabel}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center justify-center">
          <div className="text-gray-500 dark:text-gray-400">Loading payroll data...</div>
        </div>
      </div>
    )
  }

  if (teachers.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-300">No approved hours found for this period.</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Teachers need to log hours and get them approved first.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Export Button */}
      <div className="flex justify-end">
        <button
          onClick={exportToCSV}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
        >
          <ArrowDownTrayIcon className="h-5 w-5" />
          Export to CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Teacher
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Hourly Rate
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Total Hours
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Total Due
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Paid
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Unpaid
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {teachers.map((teacher) => (
                <>
                  {/* Main Row */}
                  <tr
                    key={teacher.teacherId}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {teacher.teacherName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {teacher.teacherEmail}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatCurrency(teacher.hourlyRate, 'INR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                      {teacher.totalHours.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(teacher.totalApproved, 'INR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-success">
                      {formatCurrency(teacher.totalPaid, 'INR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-warning">
                      {formatCurrency(teacher.totalUnpaid, 'INR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {teacher.totalUnpaid > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                          Paid
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => toggleRow(teacher.teacherId)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {expandedRows.has(teacher.teacherId) ? (
                          <ChevronDownIcon className="h-5 w-5" />
                        ) : (
                          <ChevronRightIcon className="h-5 w-5" />
                        )}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Row - Batch Breakdown */}
                  {expandedRows.has(teacher.teacherId) && (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30">
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Batch Breakdown
                          </h4>
                          <div className="grid grid-cols-1 gap-2">
                            {teacher.batches.map((batch, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600"
                              >
                                <div>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {batch.batchCode}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                    ({batch.entriesCount} {batch.entriesCount === 1 ? 'entry' : 'entries'})
                                  </span>
                                </div>
                                <div className="flex items-center gap-6">
                                  <div className="text-right">
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Hours</div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                      {batch.hours.toFixed(2)}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Amount</div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                      {formatCurrency(batch.amount, 'INR')}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}

              {/* Grand Total Row */}
              <tr className="bg-gray-100 dark:bg-gray-700 font-bold">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  TOTAL ({grandTotal.totalTeachers} {grandTotal.totalTeachers === 1 ? 'teacher' : 'teachers'})
                </td>
                <td className="px-6 py-4"></td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                  {grandTotal.totalHours.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                  {formatCurrency(grandTotal.totalApproved, 'INR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-success">
                  {formatCurrency(grandTotal.totalPaid, 'INR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-warning">
                  {formatCurrency(grandTotal.totalUnpaid, 'INR')}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
