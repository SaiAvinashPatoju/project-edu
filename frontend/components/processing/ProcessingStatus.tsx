'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

interface ProcessingStatusProps {
  sessionId: number
  onComplete?: () => void
  onError?: (error: string) => void
}

interface ProcessingStatusData {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  error?: string
}

export default function ProcessingStatus({ sessionId, onComplete, onError }: ProcessingStatusProps) {
  const [status, setStatus] = useState<ProcessingStatusData>({ status: 'pending' })
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isPolling, setIsPolling] = useState(true)
  const router = useRouter()

  const fetchStatus = useCallback(async () => {
    try {
      const response = await api.get(`/lectures/${sessionId}/status`)
      const newStatus = response.data as ProcessingStatusData
      setStatus(newStatus)

      if (newStatus.status === 'completed') {
        setIsPolling(false)
        onComplete?.()
      } else if (newStatus.status === 'failed') {
        setIsPolling(false)
        onError?.(newStatus.error || 'Processing failed')
      }
    } catch (error) {
      console.error('Error fetching status:', error)
      setIsPolling(false)
      onError?.('Failed to check processing status')
    }
  }, [sessionId, onComplete, onError])

  // Poll for status updates
  useEffect(() => {
    if (!isPolling) return

    const interval = setInterval(fetchStatus, 5000) // Poll every 5 seconds
    
    // Initial fetch
    fetchStatus()

    return () => clearInterval(interval)
  }, [isPolling, fetchStatus])

  // Timer for elapsed time
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusIcon = () => {
    switch (status.status) {
      case 'pending':
        return (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        )
      case 'processing':
        return (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        )
      case 'completed':
        return (
          <div className="rounded-full h-8 w-8 bg-green-100 flex items-center justify-center">
            <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )
      case 'failed':
        return (
          <div className="rounded-full h-8 w-8 bg-red-100 flex items-center justify-center">
            <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
        )
    }
  }

  const getStatusMessage = () => {
    switch (status.status) {
      case 'pending':
        return 'Your lecture is queued for processing...'
      case 'processing':
        return 'Processing your lecture audio and generating slides...'
      case 'completed':
        return 'Processing complete! Your slides are ready.'
      case 'failed':
        return status.error || 'Processing failed. Please try again.'
    }
  }

  const getStatusColor = () => {
    switch (status.status) {
      case 'pending':
      case 'processing':
        return 'text-indigo-600'
      case 'completed':
        return 'text-green-600'
      case 'failed':
        return 'text-red-600'
    }
  }

  const handleViewSlides = () => {
    router.push(`/lectures/${sessionId}/edit`)
  }

  const handleRetry = () => {
    router.push('/dashboard')
  }

  const handleGoToDashboard = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Processing Your Lecture
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Session ID: {sessionId}
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          {/* Status Icon and Message */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              {getStatusIcon()}
            </div>
            <h3 className={`text-lg font-medium ${getStatusColor()}`}>
              {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {getStatusMessage()}
            </p>
          </div>

          {/* Progress Bar (if available) */}
          {status.progress !== undefined && (
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Progress</span>
                <span>{status.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${status.progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Elapsed Time */}
          <div className="text-center mb-6">
            <p className="text-sm text-gray-500">
              Elapsed time: {formatTime(elapsedTime)}
            </p>
          </div>

          {/* Processing Steps */}
          {(status.status === 'pending' || status.status === 'processing') && (
            <div className="space-y-3 mb-6">
              <div className="flex items-center text-sm">
                <div className={`w-2 h-2 rounded-full mr-3 ${
                  status.status === 'processing' ? 'bg-indigo-600' : 'bg-gray-300'
                }`}></div>
                <span className={status.status === 'processing' ? 'text-indigo-600' : 'text-gray-500'}>
                  Transcribing audio
                </span>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 rounded-full bg-gray-300 mr-3"></div>
                <span className="text-gray-500">Generating slide content</span>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 rounded-full bg-gray-300 mr-3"></div>
                <span className="text-gray-500">Finalizing slides</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col space-y-3">
            {status.status === 'completed' && (
              <>
                <button
                  onClick={handleViewSlides}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  View & Edit Slides
                </button>
                <button
                  onClick={handleGoToDashboard}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Back to Dashboard
                </button>
              </>
            )}

            {status.status === 'failed' && (
              <>
                <button
                  onClick={handleRetry}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Try Again
                </button>
                <button
                  onClick={handleGoToDashboard}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Back to Dashboard
                </button>
              </>
            )}

            {(status.status === 'pending' || status.status === 'processing') && (
              <button
                onClick={handleGoToDashboard}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Leave This Page
              </button>
            )}
          </div>

          {/* Processing Info */}
          {(status.status === 'pending' || status.status === 'processing') && (
            <div className="mt-6 p-4 bg-blue-50 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    You can safely leave this page. Processing will continue in the background, 
                    and you can check the status from your dashboard.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}