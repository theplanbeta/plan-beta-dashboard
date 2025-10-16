'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

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
  const searchParams = useSearchParams()
  const passwordChangeRequired = searchParams.get('passwordChangeRequired') === 'true'
  const [profile, setProfile] = useState<TeacherProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setChangingPassword(true)
    setPasswordError(null)
    setPasswordSuccess(false)

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordData),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to change password')
      }

      setPasswordSuccess(true)
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })

      // Sign out the user after 2 seconds to ensure they login with new password
      setTimeout(async () => {
        await signOut({ redirect: true, callbackUrl: '/login?message=Password changed successfully. Please login with your new password.' })
      }, 2000)
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setChangingPassword(false)
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-red-600">Failed to load profile</p>
          {error && <p className="text-sm text-gray-600 mt-2">{error}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Teacher Profile</h1>
        <p className="text-gray-600 mt-2">Manage your professional information</p>
      </div>

      {passwordChangeRequired && (
        <div className="bg-yellow-50 border-2 border-yellow-400 text-yellow-900 px-6 py-4 rounded-lg mb-6 shadow-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-yellow-900">Password Change Required</h3>
              <p className="mt-2 text-sm text-yellow-800">
                For security reasons, you must change your temporary password before accessing the dashboard.
                Please scroll down to the <strong>"Change Password"</strong> section and set a new secure password.
              </p>
            </div>
          </div>
        </div>
      )}

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

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label" htmlFor="name">Full Name *</label>
                <input
                  className="input mt-1"
                  id="name"
                  name="name"
                  type="text"
                  defaultValue={profile.name}
                  required
                />
              </div>

              <div>
                <label className="form-label" htmlFor="email">Email (read-only)</label>
                <input
                  className="input mt-1 bg-gray-50 dark:bg-gray-700"
                  id="email"
                  type="email"
                  defaultValue={profile.email}
                  disabled
                />
              </div>

              <div>
                <label className="form-label" htmlFor="phone">Phone</label>
                <input
                  className="input mt-1"
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={profile.phone || ''}
                />
              </div>

              <div>
                <label className="form-label" htmlFor="whatsapp">WhatsApp</label>
                <input
                  className="input mt-1"
                  id="whatsapp"
                  name="whatsapp"
                  type="tel"
                  defaultValue={profile.whatsapp || ''}
                />
              </div>

              <div>
                <label className="form-label" htmlFor="preferredContact">Preferred Contact Method</label>
                <input
                  className="input mt-1"
                  id="preferredContact"
                  name="preferredContact"
                  type="text"
                  defaultValue={profile.preferredContact || ''}
                  placeholder="e.g., Email, Phone, WhatsApp"
                />
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Professional Information</h2>
            <div className="space-y-4">
              <div>
                <label className="form-label" htmlFor="bio">Bio</label>
                <textarea
                  className="textarea mt-1"
                  id="bio"
                  name="bio"
                  rows={3}
                  defaultValue={profile.bio || ''}
                  placeholder="Brief introduction about yourself..."
                />
              </div>

              <div>
                <label className="form-label" htmlFor="qualifications">Qualifications</label>
                <textarea
                  className="textarea mt-1"
                  id="qualifications"
                  name="qualifications"
                  rows={3}
                  defaultValue={profile.qualifications || ''}
                  placeholder="Your degrees, certifications, etc."
                />
              </div>

              <div>
                <label className="form-label" htmlFor="experience">Experience</label>
                <textarea
                  className="textarea mt-1"
                  id="experience"
                  name="experience"
                  rows={3}
                  defaultValue={profile.experience || ''}
                  placeholder="Your teaching experience..."
                />
              </div>

              <div>
                <label className="form-label" htmlFor="specializations">Specializations</label>
                <textarea
                  className="textarea mt-1"
                  id="specializations"
                  name="specializations"
                  rows={2}
                  defaultValue={profile.specializations || ''}
                  placeholder="Grammar, Conversation, Business German, etc."
                />
              </div>

              <div>
                <label className="form-label" htmlFor="languages">Languages Spoken</label>
                <input
                  className="input mt-1"
                  id="languages"
                  name="languages"
                  type="text"
                  defaultValue={profile.languages || ''}
                  placeholder="English, Hindi, German, etc."
                />
              </div>

              <div>
                <label className="form-label" htmlFor="availability">Availability</label>
                <textarea
                  className="textarea mt-1"
                  id="availability"
                  name="availability"
                  rows={3}
                  defaultValue={profile.availability || ''}
                  placeholder="Your available days/times..."
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 panel-section">
            <button
              className="btn-outline"
              type="button"
              onClick={() => router.push('/dashboard')}
            >
              Cancel
            </button>
            <button className="btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6 mt-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Change Password</h2>

        {passwordSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-4">
            <p className="font-semibold">Password changed successfully!</p>
            <p className="text-sm mt-1">You will be logged out in a moment. Please login again with your new password.</p>
          </div>
        )}

        {passwordError && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
            {passwordError}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="form-label" htmlFor="currentPassword">
              Current Password *
            </label>
            <input
              className="input mt-1"
              id="currentPassword"
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) =>
                setPasswordData({ ...passwordData, currentPassword: e.target.value })
              }
              required
              placeholder="Enter your current password"
            />
          </div>

          <div>
            <label className="form-label" htmlFor="newPassword">
              New Password *
            </label>
            <input
              className="input mt-1"
              id="newPassword"
              type="password"
              value={passwordData.newPassword}
              onChange={(e) =>
                setPasswordData({ ...passwordData, newPassword: e.target.value })
              }
              required
              placeholder="Enter new password"
            />
            <p className="text-xs text-gray-500 mt-1">
              Password must be at least 8 characters long and include uppercase, lowercase, and numbers.
            </p>
          </div>

          <div>
            <label className="form-label" htmlFor="confirmPassword">
              Confirm New Password *
            </label>
            <input
              className="input mt-1"
              id="confirmPassword"
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) =>
                setPasswordData({ ...passwordData, confirmPassword: e.target.value })
              }
              required
              placeholder="Confirm new password"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              className="btn-primary"
              type="submit"
              disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
            >
              {changingPassword ? 'Changing Password...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
