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
  DialogTrigger,
} from '@/components/ui/dialog'

interface Teacher {
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
  hourlyRate?: number
  _count: {
    batches: number
  }
}

export default function TeachersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated' && session?.user?.role !== 'FOUNDER') {
      router.push('/dashboard')
      return
    }

    fetchTeachers()
  }, [session, status, router])

  const fetchTeachers = async () => {
    try {
      const res = await fetch('/api/teachers')
      if (!res.ok) throw new Error('Failed to fetch teachers')
      const data = await res.json()
      setTeachers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teachers')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTeacher = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCreating(true)
    setCreateError(null)

    try {
      const formData = new FormData(e.currentTarget)
      const data = {
        email: formData.get('email') as string,
        name: formData.get('name') as string,
        password: formData.get('password') as string,
        phone: formData.get('phone') as string,
        bio: formData.get('bio') as string,
        qualifications: formData.get('qualifications') as string,
        experience: formData.get('experience') as string,
        specializations: formData.get('specializations') as string,
        languages: formData.get('languages') as string,
        hourlyRate: formData.get('hourlyRate')
          ? parseFloat(formData.get('hourlyRate') as string)
          : undefined,
      }

      const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to create teacher')
      }

      setIsCreateOpen(false)
      fetchTeachers()
      ;(e.target as HTMLFormElement).reset()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create teacher')
    } finally {
      setCreating(false)
    }
  }

  const toggleActive = async (teacherId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/teachers/${teacherId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive }),
      })

      if (!res.ok) throw new Error('Failed to update teacher status')

      fetchTeachers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update teacher status')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading teachers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Teachers</h1>
          <p className="text-gray-600 mt-2">Manage teacher accounts and assignments</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>+ Add Teacher</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Teacher</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateTeacher} className="space-y-4 mt-4">
              {createError && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                  {createError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="create-name">Full Name *</Label>
                  <Input
                    id="create-name"
                    name="name"
                    type="text"
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="create-email">Email *</Label>
                  <Input
                    id="create-email"
                    name="email"
                    type="email"
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="create-password">Password *</Label>
                  <Input
                    id="create-password"
                    name="password"
                    type="password"
                    minLength={6}
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="create-phone">Phone</Label>
                  <Input
                    id="create-phone"
                    name="phone"
                    type="tel"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="create-hourlyRate">Hourly Rate</Label>
                  <Input
                    id="create-hourlyRate"
                    name="hourlyRate"
                    type="number"
                    step="0.01"
                    min="0"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="create-languages">Languages</Label>
                  <Input
                    id="create-languages"
                    name="languages"
                    type="text"
                    placeholder="English, Hindi, German"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="create-bio">Bio</Label>
                <Textarea
                  id="create-bio"
                  name="bio"
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="create-qualifications">Qualifications</Label>
                <Textarea
                  id="create-qualifications"
                  name="qualifications"
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="create-experience">Experience</Label>
                <Textarea
                  id="create-experience"
                  name="experience"
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="create-specializations">Specializations</Label>
                <Textarea
                  id="create-specializations"
                  name="specializations"
                  rows={2}
                  placeholder="Grammar, Conversation, Business German"
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Teacher'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teachers.map((teacher) => (
          <Card key={teacher.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{teacher.name}</h3>
                <p className="text-sm text-gray-600">{teacher.email}</p>
              </div>
              <div
                className={`px-2 py-1 rounded text-xs font-medium ${
                  teacher.active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {teacher.active ? 'Active' : 'Inactive'}
              </div>
            </div>

            {teacher.phone && (
              <p className="text-sm text-gray-600 mb-2">📞 {teacher.phone}</p>
            )}

            {teacher.specializations && (
              <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                <span className="font-medium">Specializations:</span>{' '}
                {teacher.specializations}
              </p>
            )}

            {teacher.languages && (
              <p className="text-sm text-gray-700 mb-2">
                <span className="font-medium">Languages:</span> {teacher.languages}
              </p>
            )}

            {teacher.hourlyRate && (
              <p className="text-sm text-gray-700 mb-2">
                <span className="font-medium">Rate:</span> ₹{teacher.hourlyRate}/hr
              </p>
            )}

            <div className="border-t pt-4 mt-4">
              <p className="text-sm text-gray-600 mb-3">
                <span className="font-medium">{teacher._count.batches}</span> assigned batch
                {teacher._count.batches !== 1 ? 'es' : ''}
              </p>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/dashboard/teachers/${teacher.id}`)}
                  className="flex-1"
                >
                  View Details
                </Button>
                <Button
                  size="sm"
                  variant={teacher.active ? 'outline' : 'default'}
                  onClick={() => toggleActive(teacher.id, teacher.active)}
                >
                  {teacher.active ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {teachers.length === 0 && !error && (
        <Card className="p-12 text-center">
          <p className="text-gray-600">No teachers found. Create your first teacher account!</p>
        </Card>
      )}
    </div>
  )
}
