'use client'

import React, { useEffect, useState } from 'react'
import { getErrorMessage, shouldRetry } from '@/lib/error-handler'

interface ErrorToastProps {
  error: unknown
  onRetry?: () => void
  onDismiss?: () => void
  autoHide?: boolean
  duration?: number
}

export function ErrorToast({ 
  error, 
  onRetry, 
  onDismiss, 
  autoHide = true, 
  duration = 5000 
}: ErrorToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        onDismiss?.()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [autoHide, duration, onDismiss])

  if (!isVisible) return null

  const message = getErrorMessage(error)
  const canRetry = shouldRetry(error)

  return (
    <div className="fixed top-4 right-4 max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 z-50">
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className="text-sm font-medium text-gray-900">Error</p>
            <p className="mt-1 text-sm text-gray-500">{message}</p>
            {(canRetry && onRetry) && (
              <div className="mt-3">
                <button
                  onClick={onRetry}
                  className="text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={() => {
                setIsVisible(false)
                onDismiss?.()
              }}
              className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}