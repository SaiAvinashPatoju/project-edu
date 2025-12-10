import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { ErrorToast } from '@/components/error/ErrorToast'
import { parseApiError, getErrorMessage, shouldRetry, ApiError, NetworkError } from '@/lib/error-handler'

// Mock component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

describe('Error Handling System', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Suppress console.error for error boundary tests
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('ErrorBoundary', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )

      expect(screen.getByText('No error')).toBeInTheDocument()
    })

    it('should render error UI when error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByText(/We encountered an unexpected error/)).toBeInTheDocument()
    })

    it('should show refresh and home buttons', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Refresh Page')).toBeInTheDocument()
      expect(screen.getByText('Go Home')).toBeInTheDocument()
    })

    it('should render custom fallback when provided', () => {
      const customFallback = <div>Custom error message</div>

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Custom error message')).toBeInTheDocument()
    })
  })

  describe('ErrorToast', () => {
    it('should display error message', () => {
      const error = new Error('Test error message')
      
      render(
        <ErrorToast 
          error={error}
          onDismiss={vi.fn()}
        />
      )

      expect(screen.getByText('Error')).toBeInTheDocument()
      expect(screen.getByText('Test error message')).toBeInTheDocument()
    })

    it('should show retry button for retryable errors', () => {
      const error = new ApiError({
        code: 'SERVER_ERROR',
        message: 'Server error',
        retry_possible: true
      })
      const onRetry = vi.fn()
      
      render(
        <ErrorToast 
          error={error}
          onRetry={onRetry}
          onDismiss={vi.fn()}
        />
      )

      const retryButton = screen.getByText('Try Again')
      expect(retryButton).toBeInTheDocument()
      
      fireEvent.click(retryButton)
      expect(onRetry).toHaveBeenCalled()
    })

    it('should not show retry button for non-retryable errors', () => {
      const error = new ApiError({
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
        retry_possible: false
      })
      
      render(
        <ErrorToast 
          error={error}
          onDismiss={vi.fn()}
        />
      )

      expect(screen.queryByText('Try Again')).not.toBeInTheDocument()
    })

    it('should call onDismiss when close button is clicked', () => {
      const onDismiss = vi.fn()
      
      render(
        <ErrorToast 
          error={new Error('Test error')}
          onDismiss={onDismiss}
        />
      )

      const closeButton = screen.getByRole('button', { name: /close/i })
      fireEvent.click(closeButton)
      
      expect(onDismiss).toHaveBeenCalled()
    })
  })

  describe('Error Handler Utilities', () => {
    describe('parseApiError', () => {
      it('should parse network errors', () => {
        const error = { code: 'NETWORK_ERROR' }
        const result = parseApiError(error)
        
        expect(result).toBeInstanceOf(NetworkError)
      })

      it('should parse API errors with structured response', () => {
        const error = {
          response: {
            data: {
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid input',
                retry_possible: false
              }
            }
          }
        }
        const result = parseApiError(error)
        
        expect(result).toBeInstanceOf(ApiError)
        expect(result.message).toBe('Invalid input')
      })

      it('should handle 401 unauthorized errors', () => {
        const error = {
          response: {
            status: 401
          }
        }
        const result = parseApiError(error)
        
        expect(result).toBeInstanceOf(ApiError)
        expect(result.message).toContain('session has expired')
      })

      it('should handle 500 server errors', () => {
        const error = {
          response: {
            status: 500
          }
        }
        const result = parseApiError(error)
        
        expect(result).toBeInstanceOf(ApiError)
        expect(result.message).toContain('Server error')
      })
    })

    describe('getErrorMessage', () => {
      it('should return message from ApiError', () => {
        const error = new ApiError({
          code: 'TEST_ERROR',
          message: 'Test message'
        })
        
        expect(getErrorMessage(error)).toBe('Test message')
      })

      it('should return network error message', () => {
        const error = new NetworkError()
        
        expect(getErrorMessage(error)).toContain('Network connection failed')
      })

      it('should return generic message for unknown errors', () => {
        const error = { unknown: 'error' }
        
        expect(getErrorMessage(error)).toBe('An unexpected error occurred')
      })
    })

    describe('shouldRetry', () => {
      it('should return true for retryable API errors', () => {
        const error = new ApiError({
          code: 'SERVER_ERROR',
          message: 'Server error',
          retry_possible: true
        })
        
        expect(shouldRetry(error)).toBe(true)
      })

      it('should return false for non-retryable API errors', () => {
        const error = new ApiError({
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
          retry_possible: false
        })
        
        expect(shouldRetry(error)).toBe(false)
      })

      it('should return true for network errors', () => {
        const error = new NetworkError()
        
        expect(shouldRetry(error)).toBe(true)
      })

      it('should return false for unknown errors', () => {
        const error = new Error('Unknown error')
        
        expect(shouldRetry(error)).toBe(false)
      })
    })
  })
})