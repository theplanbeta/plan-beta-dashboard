'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface TeacherProfile {
  id: string
  name: string
  email: string
  phone?: string
  bio?: string
  qualifications?: string
  experience?: string
  specializations?: string
  languages?: string
  availability?: string
  hourlyRate?: number
  preferredContact?: string
  whatsapp?: string
  active: boolean
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<TeacherProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

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
      fetchProfile()
    }
  }, [session, status, router])

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/teachers/${session?.user?.id}`)
      if (!res.ok) throw new Error('Failed to fetch profile')
      const data = await res.json()
      setProfile(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!profile) return

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const formData = new FormData(e.currentTarget)
      const data = {
        name: formData.get('name') as string,
        phone: formData.get('phone') as string,
        bio: formData.get('bio') as string,
        qualifications: formData.get('qualifications') as string,
        experience: formData.get('experience') as string,
        specializations: formData.get('specializations') as string,
        languages: formData.get('languages') as string,
        availability: formData.get('availability') as string,
        hourlyRate: formData.get('hourlyRate')
          ? parseFloat(formData.get('hourlyRate') as string)
          : undefined,
        preferredContact: formData.get('preferredContact') as string,
        whatsapp: formData.get('whatsapp') as string,
      }

      const res = await fetch(`/api/teachers/${session?.user?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to update profile')
      }

      const updated = await res.json()
      setProfile(updated)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6">
          <p className="text-red-600">Failed to load profile</p>
          {error && <p className="text-sm text-gray-600 mt-2">{error}</p>}
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Teacher Profile</h1>
        <p className="text-gray-600 mt-2">Manage your professional information</p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-6">
          Profile updated successfully!
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  defaultValue={profile.name}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="email">Email (read-only)</Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue={profile.email}
                  disabled
                  className="mt-1 bg-gray-50"
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={profile.phone || ''}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  name="whatsapp"
                  type="tel"
                  defaultValue={profile.whatsapp || ''}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="preferredContact">Preferred Contact Method</Label>
                <Input
                  id="preferredContact"
                  name="preferredContact"
                  type="text"
                  defaultValue={profile.preferredContact || ''}
                  placeholder="e.g., Email, Phone, WhatsApp"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="hourlyRate">Hourly Rate (₹/€)</Label>
                <Input
                  id="hourlyRate"
                  name="hourlyRate"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={profile.hourlyRate || ''}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Professional Information</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  rows={3}
                  defaultValue={profile.bio || ''}
                  placeholder="Brief introduction about yourself..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="qualifications">Qualifications</Label>
                <Textarea
                  id="qualifications"
                  name="qualifications"
                  rows={3}
                  defaultValue={profile.qualifications || ''}
                  placeholder="Your degrees, certifications, etc."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="experience">Experience</Label>
                <Textarea
                  id="experience"
                  name="experience"
                  rows={3}
                  defaultValue={profile.experience || ''}
                  placeholder="Your teaching experience..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="specializations">Specializations</Label>
                <Textarea
                  id="specializations"
                  name="specializations"
                  rows={2}
                  defaultValue={profile.specializations || ''}
                  placeholder="Grammar, Conversation, Business German, etc."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="languages">Languages Spoken</Label>
                <Input
                  id="languages"
                  name="languages"
                  type="text"
                  defaultValue={profile.languages || ''}
                  placeholder="English, Hindi, German, etc."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="availability">Availability</Label>
                <Textarea
                  id="availability"
                  name="availability"
                  rows={3}
                  defaultValue={profile.availability || ''}
                  placeholder="Your available days/times..."
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
