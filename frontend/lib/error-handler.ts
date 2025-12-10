export interface AppError {
  code: string
  message: string
  details?: string
  retry_possible?: boolean
}

export interface ErrorResponse {
  error: AppError
}

export class ApiError extends Error {
  public code: string
  public details?: string
  public retryPossible: boolean

  constructor(error: AppError) {
    super(error.message)
    this.name = 'ApiError'
    this.code = error.code
    this.details = error.details
    this.retryPossible = error.retry_possible ?? false
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network connection failed') {
    super(message)
    this.name = 'NetworkError'
  }
}

export class ValidationError extends Error {
  public field?: string

  constructor(message: string, field?: string) {
    super(message)
    this.name = 'ValidationError'
    this.field = field
  }
}

export function parseApiError(error: any): ApiError | NetworkError | Error {
  // Network errors (no response)
  if (!error.response) {
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
      return new NetworkError()
    }
    return new Error(error.message || 'An unexpected error occurred')
  }

  // API errors with structured response
  if (error.response?.data?.error) {
    return new ApiError(error.response.data.error)
  }

  // HTTP errors without structured response
  const status = error.response?.status
  if (status === 401) {
    return new ApiError({
      code: 'UNAUTHORIZED',
      message: 'Your session has expired. Please log in again.',
      retry_possible: false
    })
  }

  if (status === 403) {
    return new ApiError({
      code: 'FORBIDDEN',
      message: 'You do not have permission to perform this action.',
      retry_possible: false
    })
  }

  if (status === 404) {
    return new ApiError({
      code: 'NOT_FOUND',
      message: 'The requested resource was not found.',
      retry_possible: false
    })
  }

  if (status === 422) {
    return new ValidationError(
      error.response?.data?.detail || 'Invalid input provided'
    )
  }

  if (status >= 500) {
    return new ApiError({
      code: 'SERVER_ERROR',
      message: 'Server error occurred. Please try again later.',
      retry_possible: true
    })
  }

  // Fallback for unknown errors
  return new Error(error.message || 'An unexpected error occurred')
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }

  if (error instanceof NetworkError) {
    return 'Network connection failed. Please check your internet connection and try again.'
  }

  if (error instanceof ValidationError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'An unexpected error occurred'
}

export function shouldRetry(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.retryPossible
  }

  if (error instanceof NetworkError) {
    return true
  }

  return false
}

// Error logging utility
export function logError(error: unknown, context?: string) {
  const errorInfo = {
    message: getErrorMessage(error),
    context,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown'
  }

  console.error('Application Error:', errorInfo)

  // In production, send to error reporting service
  if (process.env.NODE_ENV === 'production') {
    // Example: sendToErrorService(errorInfo)
  }
}