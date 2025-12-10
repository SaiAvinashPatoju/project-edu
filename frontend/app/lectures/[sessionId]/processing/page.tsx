'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import AuthGuard from '@/components/auth/AuthGuard'
import ProcessingStatus from '@/components/processing/ProcessingStatus'

export default function ProcessingPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = parseInt(params.sessionId as string)

  const handleComplete = () => {
    // Processing completed, user can now view slides
    console.log('Processing completed for session:', sessionId)
  }

  const handleError = (error: string) => {
    console.error('Processing error:', error)
  }

  if (isNaN(sessionId)) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Session</h1>
            <p className="text-gray-600 mb-4">The session ID is not valid.</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <ProcessingStatus
        sessionId={sessionId}
        onComplete={handleComplete}
        onError={handleError}
      />
    </AuthGuard>
  )
}