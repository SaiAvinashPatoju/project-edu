'use client'

import { useEffect, useState } from 'react'
import AuthGuard from '@/components/auth/AuthGuard'
import SlidesViewer from '@/components/slides/SlidesViewer'

interface EditorPageProps {
  params: { sessionId: string }
}

export default function EditorPage({ params }: EditorPageProps) {
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    // Handle both sync and async params
    if (params?.sessionId) {
      setSessionId(params.sessionId)
    } else if (typeof params === 'object' && 'then' in params) {
      params.then((resolvedParams: any) => {
        setSessionId(resolvedParams.sessionId)
      })
    }
  }, [params])

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  const sessionIdNum = parseInt(sessionId, 10)

  if (isNaN(sessionIdNum)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Session</h1>
          <p className="text-gray-600">The session ID provided is not valid.</p>
        </div>
      </div>
    )
  }

  return (
    <AuthGuard>
      <SlidesViewer sessionId={sessionIdNum} />
    </AuthGuard>
  )
}