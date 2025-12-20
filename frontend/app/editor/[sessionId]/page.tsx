'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import AuthGuard from '@/components/auth/AuthGuard'
import SlidesViewer from '@/components/slides/SlidesViewer'

export default function EditorPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const sessionIdNum = parseInt(sessionId, 10)

  if (isNaN(sessionIdNum)) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-stone-50">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-20 w-[600px] h-[600px] bg-teal-800/40 rounded-full blur-3xl"></div>
          <div className="absolute top-1/3 -right-40 w-[700px] h-[700px] bg-teal-900/35 rounded-full blur-3xl"></div>
        </div>
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-[40px] shadow-2xl shadow-teal-900/10 p-12 text-center">
            <h1 className="text-2xl font-bold text-teal-900 mb-2">Invalid Session</h1>
            <p className="text-teal-700 mb-6">The session ID provided is not valid.</p>
            <Link href="/dashboard" className="px-6 py-3 bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-full font-medium shadow-lg shadow-teal-500/30">
              Back to Dashboard
            </Link>
          </div>
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