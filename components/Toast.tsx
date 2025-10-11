"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

type Toast = {
  id: string
  message: string
  type?: 'success' | 'error' | 'info'
  duration?: number
}

type ToastContextType = {
  addToast: (message: string, options?: Omit<Toast, 'id' | 'message'>) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((message: string, options?: Omit<Toast, 'id' | 'message'>) => {
    const id = Math.random().toString(36).slice(2)
    const toast: Toast = {
      id,
      message,
      type: options?.type || 'info',
      duration: options?.duration ?? 3000,
    }
    setToasts((prev) => [...prev, toast])
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => remove(id), toast.duration)
    }
  }, [remove])

  const value = useMemo(() => ({ addToast }), [addToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`min-w-[260px] max-w-sm px-4 py-3 rounded-md shadow-sm border text-sm backdrop-blur-sm ${
              t.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-200'
                : t.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200'
                : 'bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

