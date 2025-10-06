'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Batch {
  id: string
  batchCode: string
  level: string
  startDate: string
  endDate: string | null
  schedule: string | null
  status: string
  enrolledCount: number
  totalSeats: number
}

interface HourEntry {
  id: string
  date: string
  hoursWorked: number
  description: string
  hourlyRate: number
  totalAmount: number
  status: string
  paid: boolean
  batch?: {
    batchCode: string
    level: string
  }
  rejectionReason?: string
}

interface HoursSummary {
  total: { hours: number; amount: number }
  pending: { hours: number; amount: number }
  approved: { hours: number; amount: number }
  rejected: { hours: number; amount: number }
  payment: { paid: number; unpaid: number }
}

export default function TeacherDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [batches, setBatches] = useState<Batch[]>([])
  const [hours, setHours] = useState<HourEntry[]>([])
  const [summary, setSummary] = useState<HoursSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLogHoursOpen, setIsLogHoursOpen] = useState(false)
  const [loggingHours, setLoggingHours] = useState(false)
  const [logError, setLogError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated' && session?.user?.role !== 'TEACHER') {
      router.push('/dashboard')
      return
    }

    if (session?.user?.id) {
      fetchData()
    }
  }, [session, status, router])

  const fetchData = async () => {
    try {
      const [batchesRes, hoursRes, summaryRes] = await Promise.all([
        fetch(`/api/teachers/${session?.user?.id}`),
        fetch('/api/teacher-hours'),
        fetch('/api/teacher-hours/summary'),
      ])

      if (!batchesRes.ok || !hoursRes.ok || !summaryRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const batchesData = await batchesRes.json()
      const hoursData = await hoursRes.json()
      const summaryData = await summaryRes.json()

      setBatches(batchesData.batches || [])
      setHours(hoursData)
      setSummary(summaryData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleLogHours = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoggingHours(true)
    setLogError(null)

    try {
      const formData = new FormData(e.currentTarget)
      const data = {
        batchId: formData.get('batchId') as string || undefined,
        date: formData.get('date') as string,
        hoursWorked: parseFloat(formData.get('hoursWorked') as string),
        description: formData.get('description') as string,
        hourlyRate: formData.get('hourlyRate')
          ? parseFloat(formData.get('hourlyRate') as string)
          : undefined,
      }

      const res = await fetch('/api/teacher-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to log hours')
      }

      setIsLogHoursOpen(false)
      fetchData()
      ;(e.target as HTMLFormElement).reset()
    } catch (err) {
      setLogError(err instanceof Error ? err.message : 'Failed to log hours')
    } finally {
      setLoggingHours(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome, {session?.user?.name || 'Teacher'}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/profile')}
          >
            Edit Profile
          </Button>
          <Dialog open={isLogHoursOpen} onOpenChange={setIsLogHoursOpen}>
            <DialogTrigger asChild>
              <Button>+ Log Hours</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log Teaching Hours</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleLogHours} className="space-y-4 mt-4">
                {logError && (
                  <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                    {logError}
                  </div>
                )}

                <div>
                  <Label htmlFor="log-batch">Batch (Optional)</Label>
                  <select
                    id="log-batch"
                    name="batchId"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1"
                  >
                    <option value="">-- General / Not batch-specific --</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.batchCode} - {batch.level}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="log-date">Date *</Label>
                  <Input
                    id="log-date"
                    name="date"
                    type="date"
                    required
                    max={new Date().toISOString().split('T')[0]}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="log-hours">Hours Worked *</Label>
                  <Input
                    id="log-hours"
                    name="hoursWorked"
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="log-rate">Hourly Rate (Optional)</Label>
                  <Input
                    id="log-rate"
                    name="hourlyRate"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Leave empty to use profile default"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="log-description">Description *</Label>
                  <Textarea
                    id="log-description"
                    name="description"
                    rows={3}
                    required
                    placeholder="What did you teach/work on?"
                    className="mt-1"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsLogHoursOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loggingHours}>
                    {loggingHours ? 'Logging...' : 'Log Hours'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-600">Total Hours</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {summary.total.hours.toFixed(1)}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              ₹{summary.total.amount.toFixed(2)}
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-600">Pending Approval</h3>
            <p className="text-3xl font-bold text-yellow-600 mt-2">
              {summary.pending.hours.toFixed(1)}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              ₹{summary.pending.amount.toFixed(2)}
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-600">Approved</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {summary.approved.hours.toFixed(1)}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              ₹{summary.approved.amount.toFixed(2)}
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-600">Payment Status</h3>
            <p className="text-lg font-semibold text-green-600 mt-2">
              Paid: ₹{summary.payment.paid.toFixed(2)}
            </p>
            <p className="text-lg font-semibold text-orange-600">
              Unpaid: ₹{summary.payment.unpaid.toFixed(2)}
            </p>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assigned Batches */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              My Batches ({batches.length})
            </h2>

            {batches.length === 0 ? (
              <p className="text-gray-600 text-center py-8">
                No batches assigned yet
              </p>
            ) : (
              <div className="space-y-3">
                {batches.map((batch) => (
                  <div
                    key={batch.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {batch.batchCode}
                        </h3>
                        <p className="text-sm text-gray-600">{batch.level}</p>
                      </div>
                      <div
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          batch.status === 'ACTIVE' || batch.status === 'RUNNING'
                            ? 'bg-green-100 text-green-800'
                            : batch.status === 'UPCOMING' ||
                              batch.status === 'FILLING'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {batch.status}
                      </div>
                    </div>

                    {batch.schedule && (
                      <p className="text-xs text-gray-600 mb-2">
                        {batch.schedule}
                      </p>
                    )}

                    <div className="text-xs text-gray-600">
                      {batch.enrolledCount} / {batch.totalSeats} students
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Recent Hour Entries */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Recent Hour Entries
            </h2>

            {hours.length === 0 ? (
              <p className="text-gray-600 text-center py-8">
                No hours logged yet. Click "Log Hours" to get started!
              </p>
            ) : (
              <div className="space-y-3">
                {hours.slice(0, 10).map((entry) => (
                  <div
                    key={entry.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">
                            {entry.hoursWorked}h on{' '}
                            {new Date(entry.date).toLocaleDateString()}
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
                        {entry.batch && (
                          <p className="text-sm text-gray-600 mt-1">
                            {entry.batch.batchCode} - {entry.batch.level}
                          </p>
                        )}
                        <p className="text-sm text-gray-700 mt-2">
                          {entry.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          ₹{entry.totalAmount.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-600">
                          @₹{entry.hourlyRate}/hr
                        </p>
                      </div>
                    </div>

                    {entry.rejectionReason && (
                      <div className="mt-3 p-3 bg-red-50 rounded border border-red-200">
                        <p className="text-sm font-medium text-red-800">
                          Rejection Reason:
                        </p>
                        <p className="text-sm text-red-700 mt-1">
                          {entry.rejectionReason}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
