'use client'

import { use } from 'react'
import AuthGuard from '@/components/auth/AuthGuard'
import SlidesViewer from '@/components/slides/SlidesViewer'

interface EditorPageProps {
  params: Promise<{ sessionId: string }>
}

export default function EditorPage({ params }: EditorPageProps) {
  const resolvedParams = use(params)
  const sessionId = resolvedParams.sessionId
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