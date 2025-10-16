'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'

function WelcomeLoginContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState('Verifying your welcome link...')

  useEffect(() => {
    const processWelcomeLogin = async () => {
      const token = searchParams.get('token')

      if (!token) {
        setStatus('error')
        setMessage('Invalid link - no token provided')
        return
      }

      try {
        // Call API to validate token and get temp credentials
        const response = await fetch('/api/auth/welcome-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to verify token')
        }

        const { email, tempPassword } = await response.json()

        // Automatically sign in with the temp credentials
        setMessage('Logging you in...')
        const result = await signIn('credentials', {
          email,
          password: tempPassword,
          redirect: false,
        })

        if (result?.error) {
          throw new Error('Login failed')
        }

        setStatus('success')
        setMessage('Success! Redirecting to set your password...')

        // Redirect to profile page to change password
        setTimeout(() => {
          router.push('/dashboard/profile?passwordChangeRequired=true')
        }, 1500)
      } catch (error) {
        setStatus('error')
        setMessage(error instanceof Error ? error.message : 'Something went wrong')

        // Redirect to login after 5 seconds
        setTimeout(() => {
          router.push('/login')
        }, 5000)
      }
    }

    processWelcomeLogin()
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          {status === 'processing' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold text-gray-900">{message}</h2>
              <p className="mt-2 text-gray-600">Please wait...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <svg className="mx-auto h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="mt-4 text-2xl font-bold text-gray-900">{message}</h2>
            </>
          )}

          {status === 'error' && (
            <>
              <svg className="mx-auto h-12 w-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h2 className="mt-4 text-2xl font-bold text-gray-900">Oops!</h2>
              <p className="mt-2 text-gray-600">{message}</p>
              <p className="mt-4 text-sm text-gray-500">
                This link may have expired or been used already.
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Redirecting to login page...
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function WelcomeLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900">Loading...</h2>
          </div>
        </div>
      </div>
    }>
      <WelcomeLoginContent />
    </Suspense>
  )
}
