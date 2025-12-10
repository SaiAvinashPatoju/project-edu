'use client'

import { useState, useCallback } from 'react'
import { parseApiError, logError } from '@/lib/error-handler'

interface UseErrorHandlerReturn {
  error: unknown | null
  showError: (error: unknown, context?: string) => void
  clearError: () => void
  retryAction?: () => void
  setRetryAction: (action: () => void) => void
}

export function useErrorHandler(): UseErrorHandlerReturn {
  const [error, setError] = useState<unknown | null>(null)
  const [retryAction, setRetryAction] = useState<(() => void) | undefined>()

  const showError = useCallback((error: unknown, context?: string) => {
    const parsedError = parseApiError(error)
    logError(parsedError, context)
    setError(parsedError)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
    setRetryAction(undefined)
  }, [])

  const setRetryActionCallback = useCallback((action: () => void) => {
    setRetryAction(() => action)
  }, [])

  return {
    error,
    showError,
    clearError,
    retryAction,
    setRetryAction: setRetryActionCallback
  }
}