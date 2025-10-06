'use client'

import { use, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

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

interface TeacherDetail {
  id: string
  name: string
  email: string
  phone?: string
  active: boolean
  bio?: string
  qualifications?: string
  experience?: string
  specializations?: string
  languages?: string
  availability?: string
  hourlyRate?: number
  preferredContact?: string
  whatsapp?: string
  createdAt: string
  batches: Batch[]
}

export default function TeacherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: session, status } = useSession()
  const router = useRouter()
  const [teacher, setTeacher] = useState<TeacherDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated' && session?.user?.role !== 'FOUNDER') {
      router.push('/dashboard')
      return
    }

    fetchTeacher()
  }, [session, status, router, id])

  const fetchTeacher = async () => {
    try {
      const res = await fetch(`/api/teachers/${id}`)
      if (!res.ok) throw new Error('Failed to fetch teacher')
      const data = await res.json()
      setTeacher(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teacher')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading teacher details...</p>
        </div>
      </div>
    )
  }

  if (error || !teacher) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="p-6">
          <p className="text-red-600">Failed to load teacher</p>
          {error && <p className="text-sm text-gray-600 mt-2">{error}</p>}
          <Button onClick={() => router.push('/dashboard/teachers')} className="mt-4">
            Back to Teachers
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{teacher.name}</h1>
          <p className="text-gray-600 mt-2">{teacher.email}</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/dashboard/teachers')}>
          ← Back to Teachers
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Information</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <div
                  className={`inline-block px-3 py-1 rounded text-sm font-medium mt-1 ${
                    teacher.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {teacher.active ? 'Active' : 'Inactive'}
                </div>
              </div>

              {teacher.phone && (
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="text-gray-900 mt-1">{teacher.phone}</p>
                </div>
              )}

              {teacher.whatsapp && (
                <div>
                  <p className="text-sm text-gray-600">WhatsApp</p>
                  <p className="text-gray-900 mt-1">{teacher.whatsapp}</p>
                </div>
              )}

              {teacher.preferredContact && (
                <div>
                  <p className="text-sm text-gray-600">Preferred Contact</p>
                  <p className="text-gray-900 mt-1">{teacher.preferredContact}</p>
                </div>
              )}

              {teacher.hourlyRate && (
                <div>
                  <p className="text-sm text-gray-600">Hourly Rate</p>
                  <p className="text-gray-900 mt-1">₹{teacher.hourlyRate}/hr</p>
                </div>
              )}

              {teacher.languages && (
                <div>
                  <p className="text-sm text-gray-600">Languages</p>
                  <p className="text-gray-900 mt-1">{teacher.languages}</p>
                </div>
              )}
            </div>

            {teacher.bio && (
              <div className="mt-6">
                <p className="text-sm text-gray-600 mb-2">Bio</p>
                <p className="text-gray-900 whitespace-pre-wrap">{teacher.bio}</p>
              </div>
            )}

            {teacher.qualifications && (
              <div className="mt-6">
                <p className="text-sm text-gray-600 mb-2">Qualifications</p>
                <p className="text-gray-900 whitespace-pre-wrap">{teacher.qualifications}</p>
              </div>
            )}

            {teacher.experience && (
              <div className="mt-6">
                <p className="text-sm text-gray-600 mb-2">Experience</p>
                <p className="text-gray-900 whitespace-pre-wrap">{teacher.experience}</p>
              </div>
            )}

            {teacher.specializations && (
              <div className="mt-6">
                <p className="text-sm text-gray-600 mb-2">Specializations</p>
                <p className="text-gray-900 whitespace-pre-wrap">{teacher.specializations}</p>
              </div>
            )}

            {teacher.availability && (
              <div className="mt-6">
                <p className="text-sm text-gray-600 mb-2">Availability</p>
                <p className="text-gray-900 whitespace-pre-wrap">{teacher.availability}</p>
              </div>
            )}
          </Card>
        </div>

        {/* Assigned Batches */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Assigned Batches ({teacher.batches.length})
            </h2>

            {teacher.batches.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No batches assigned</p>
            ) : (
              <div className="space-y-3">
                {teacher.batches.map((batch) => (
                  <div
                    key={batch.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/dashboard/batches/${batch.id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{batch.batchCode}</h3>
                        <p className="text-sm text-gray-600">{batch.level}</p>
                      </div>
                      <div
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          batch.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : batch.status === 'UPCOMING'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {batch.status}
                      </div>
                    </div>

                    <p className="text-xs text-gray-600 mb-2">
                      {new Date(batch.startDate).toLocaleDateString()} -{' '}
                      {batch.endDate
                        ? new Date(batch.endDate).toLocaleDateString()
                        : 'Ongoing'}
                    </p>

                    {batch.schedule && (
                      <p className="text-xs text-gray-600 mb-2">{batch.schedule}</p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span>
                        {batch.enrolledCount} / {batch.totalSeats} students
                      </span>
                    </div>
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
