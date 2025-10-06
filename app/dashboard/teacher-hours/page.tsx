'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface HourEntry {
  id: string
  date: string
  hoursWorked: number
  description: string
  hourlyRate: number
  totalAmount: number
  status: string
  paid: boolean
  paidAmount?: number
  paidDate?: string
  paymentNotes?: string
  rejectionReason?: string
  teacher: {
    id: string
    name: string
    email: string
  }
  batch?: {
    id: string
    batchCode: string
    level: string
  }
}

export default function TeacherHoursManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [hours, setHours] = useState<HourEntry[]>([])
  const [filteredHours, setFilteredHours] = useState<HourEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('PENDING')
  const [paidFilter, setPaidFilter] = useState<string>('all')

  const [selectedEntry, setSelectedEntry] = useState<HourEntry | null>(null)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'pay' | null>(null)
  const [processing, setProcessing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated' && session?.user?.role !== 'FOUNDER') {
      router.push('/dashboard')
      return
    }

    fetchHours()
  }, [session, status, router])

  useEffect(() => {
    filterHours()
  }, [hours, statusFilter, paidFilter])

  const fetchHours = async () => {
    try {
      const res = await fetch('/api/teacher-hours')
      if (!res.ok) throw new Error('Failed to fetch hours')
      const data = await res.json()
      setHours(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load hours')
    } finally {
      setLoading(false)
    }
  }

  const filterHours = () => {
    let filtered = hours

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((h) => h.status === statusFilter)
    }

    // Payment filter
    if (paidFilter === 'paid') {
      filtered = filtered.filter((h) => h.paid)
    } else if (paidFilter === 'unpaid') {
      filtered = filtered.filter((h) => h.status === 'APPROVED' && !h.paid)
    }

    setFilteredHours(filtered)
  }

  const openActionDialog = (
    entry: HourEntry,
    action: 'approve' | 'reject' | 'pay'
  ) => {
    setSelectedEntry(entry)
    setActionType(action)
    setActionDialogOpen(true)
    setActionError(null)
  }

  const handleApprove = async () => {
    if (!selectedEntry) return

    setProcessing(true)
    setActionError(null)

    try {
      const res = await fetch(`/api/teacher-hours/${selectedEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to approve hours')
      }

      setActionDialogOpen(false)
      fetchHours()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to approve hours')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedEntry) return

    setProcessing(true)
    setActionError(null)

    try {
      const formData = new FormData(e.currentTarget)
      const rejectionReason = formData.get('rejectionReason') as string

      const res = await fetch(`/api/teacher-hours/${selectedEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'REJECTED',
          rejectionReason,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to reject hours')
      }

      setActionDialogOpen(false)
      fetchHours()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to reject hours')
    } finally {
      setProcessing(false)
    }
  }

  const handleMarkPaid = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedEntry) return

    setProcessing(true)
    setActionError(null)

    try {
      const formData = new FormData(e.currentTarget)
      const data = {
        paidAmount: parseFloat(formData.get('paidAmount') as string),
        paymentNotes: formData.get('paymentNotes') as string,
      }

      const res = await fetch(`/api/teacher-hours/${selectedEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to mark as paid')
      }

      setActionDialogOpen(false)
      fetchHours()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to mark as paid')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading hours...</p>
        </div>
      </div>
    )
  }

  const stats = {
    pending: hours.filter((h) => h.status === 'PENDING').length,
    approved: hours.filter((h) => h.status === 'APPROVED').length,
    rejected: hours.filter((h) => h.status === 'REJECTED').length,
    unpaid: hours.filter((h) => h.status === 'APPROVED' && !h.paid).length,
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Teacher Hours Management</h1>
        <p className="text-gray-600 mt-2">
          Review and approve teacher hour submissions
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-600">Pending Approval</h3>
          <p className="text-2xl font-bold text-yellow-600 mt-2">{stats.pending}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-600">Approved</h3>
          <p className="text-2xl font-bold text-green-600 mt-2">{stats.approved}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-600">Rejected</h3>
          <p className="text-2xl font-bold text-red-600 mt-2">{stats.rejected}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-600">Unpaid (Approved)</h3>
          <p className="text-2xl font-bold text-orange-600 mt-2">{stats.unpaid}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="status-filter">Status</Label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1"
            >
              <option value="all">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div>
            <Label htmlFor="paid-filter">Payment Status</Label>
            <select
              id="paid-filter"
              value={paidFilter}
              onChange={(e) => setPaidFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1"
            >
              <option value="all">All</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid (Approved)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Hours List */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Hour Entries ({filteredHours.length})
        </h2>

        {filteredHours.length === 0 ? (
          <p className="text-gray-600 text-center py-8">No entries found</p>
        ) : (
          <div className="space-y-4">
            {filteredHours.map((entry) => (
              <div
                key={entry.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {entry.teacher.name}
                      </h3>
                      <div
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          entry.status === 'APPROVED'
                            ? 'bg-green-100 text-green-800'
                            : entry.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {entry.status}
                      </div>
                      {entry.paid && (
                        <div className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          PAID
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{entry.teacher.email}</p>
                    {entry.batch && (
                      <p className="text-sm text-gray-700 mt-1">
                        Batch: {entry.batch.batchCode} - {entry.batch.level}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      ₹{entry.totalAmount.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {entry.hoursWorked}h × ₹{entry.hourlyRate}/hr
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(entry.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-gray-700 mb-3">{entry.description}</p>

                {entry.rejectionReason && (
                  <div className="mb-3 p-3 bg-red-50 rounded border border-red-200">
                    <p className="text-sm font-medium text-red-800">
                      Rejection Reason:
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      {entry.rejectionReason}
                    </p>
                  </div>
                )}

                {entry.paid && entry.paidAmount && (
                  <div className="mb-3 p-3 bg-blue-50 rounded border border-blue-200">
                    <p className="text-sm font-medium text-blue-800">
                      Payment Info:
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      Amount: ₹{entry.paidAmount.toFixed(2)} on{' '}
                      {entry.paidDate
                        ? new Date(entry.paidDate).toLocaleDateString()
                        : 'N/A'}
                    </p>
                    {entry.paymentNotes && (
                      <p className="text-sm text-blue-700 mt-1">
                        Notes: {entry.paymentNotes}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-3 border-t">
                  {entry.status === 'PENDING' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => openActionDialog(entry, 'approve')}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openActionDialog(entry, 'reject')}
                      >
                        Reject
                      </Button>
                    </>
                  )}

                  {entry.status === 'APPROVED' && !entry.paid && (
                    <Button
                      size="sm"
                      onClick={() => openActionDialog(entry, 'pay')}
                    >
                      Mark as Paid
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve'
                ? 'Approve Hours'
                : actionType === 'reject'
                ? 'Reject Hours'
                : 'Mark as Paid'}
            </DialogTitle>
          </DialogHeader>

          {actionError && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
              {actionError}
            </div>
          )}

          {actionType === 'approve' && selectedEntry && (
            <div className="space-y-4 mt-4">
              <p>
                Approve {selectedEntry.hoursWorked} hours for{' '}
                {selectedEntry.teacher.name}?
              </p>
              <p className="text-sm text-gray-600">
                Amount: ₹{selectedEntry.totalAmount.toFixed(2)}
              </p>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setActionDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleApprove} disabled={processing}>
                  {processing ? 'Approving...' : 'Approve'}
                </Button>
              </div>
            </div>
          )}

          {actionType === 'reject' && selectedEntry && (
            <form onSubmit={handleReject} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                <Textarea
                  id="rejectionReason"
                  name="rejectionReason"
                  rows={3}
                  required
                  placeholder="Explain why these hours are being rejected..."
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActionDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={processing}>
                  {processing ? 'Rejecting...' : 'Reject Hours'}
                </Button>
              </div>
            </form>
          )}

          {actionType === 'pay' && selectedEntry && (
            <form onSubmit={handleMarkPaid} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="paidAmount">Amount Paid *</Label>
                <Input
                  id="paidAmount"
                  name="paidAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={selectedEntry.totalAmount}
                  required
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Original amount: ₹{selectedEntry.totalAmount.toFixed(2)}
                </p>
              </div>

              <div>
                <Label htmlFor="paymentNotes">Payment Notes (Optional)</Label>
                <Textarea
                  id="paymentNotes"
                  name="paymentNotes"
                  rows={2}
                  placeholder="Transaction ID, payment method, etc."
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActionDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={processing}>
                  {processing ? 'Processing...' : 'Mark as Paid'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
