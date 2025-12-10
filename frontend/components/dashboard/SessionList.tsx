'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient, LectureSession } from '@/lib/api-client'
import ExportDialog from '../export/ExportDialog'
import ExportStatus from '../export/ExportStatus'

interface SessionListProps {
  onSessionSelect?: (session: LectureSession) => void
}

export default function SessionList({ onSessionSelect }: SessionListProps) {
  const [sessions, setSessions] = useState<LectureSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [selectedSession, setSelectedSession] = useState<LectureSession | null>(null)
  const [activeExports, setActiveExports] = useState<Array<{ id: number; format: string; sessionId: number }>>([])
  const router = useRouter()

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.fetchSessions()
      setSessions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'processing':
        return 'bg-yellow-100 text-yellow-800'
      case 'pending':
        return 'bg-blue-100 text-blue-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleSessionClick = (session: LectureSession) => {
    if (session.processing_status === 'completed') {
      router.push(`/editor/${session.id}`)
    } else if (session.processing_status === 'processing' || session.processing_status === 'pending') {
      router.push(`/processing/${session.id}`)
    }
    
    if (onSessionSelect) {
      onSessionSelect(session)
    }
  }

  const handleExportClick = (e: React.MouseEvent, session: LectureSession) => {
    e.stopPropagation() // Prevent session click
    setSelectedSession(session)
    setShowExportDialog(true)
  }

  const handleExportStarted = (exportId: number, format: string) => {
    if (selectedSession) {
      setActiveExports(prev => [...prev, { id: exportId, format, sessionId: selectedSession.id }])
    }
    setShowExportDialog(false)
    setSelectedSession(null)
  }

  const handleExportComplete = (exportId: number) => {
    // Keep the export in the list so user can download
  }

  const handleExportError = (exportId: number, error: string) => {
    setActiveExports(prev => prev.filter(exp => exp.id !== exportId))
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading sessions</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={loadSessions}
                className="bg-red-100 px-2 py-1 rounded text-sm text-red-800 hover:bg-red-200"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No lecture sessions</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by creating your first lecture session.</p>
        <div className="mt-6">
          <button
            onClick={() => router.push('/record')}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Start New Session
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Active exports */}
      {activeExports.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Active Exports</h3>
          <div className="space-y-2">
            {activeExports.map((exportItem) => {
              const session = sessions.find(s => s.id === exportItem.sessionId)
              return (
                <div key={exportItem.id} className="bg-white rounded p-3">
                  <p className="text-sm font-medium mb-2">{session?.title}</p>
                  <ExportStatus
                    exportId={exportItem.id}
                    format={exportItem.format}
                    onComplete={() => handleExportComplete(exportItem.id)}
                    onError={(error) => handleExportError(exportItem.id, error)}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {sessions.map((session) => (
        <div
          key={session.id}
          onClick={() => handleSessionClick(session)}
          className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-medium text-gray-900 truncate">
                  {session.title}
                </h3>
                <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                  <span>Created {formatDate(session.created_at)}</span>
                  {session.audio_duration && (
                    <span>Duration: {formatDuration(session.audio_duration)}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                    session.processing_status
                  )}`}
                >
                  {session.processing_status}
                </span>
                {session.processing_status === 'completed' && (
                  <>
                    <button
                      onClick={(e) => handleExportClick(e, session)}
                      className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                      title="Export presentation"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </>
                )}
              </div>
            </div>
            
            {session.processing_status === 'failed' && (
              <div className="mt-2 text-sm text-red-600">
                Processing failed. Click to retry or contact support.
              </div>
            )}
            
            {(session.processing_status === 'processing' || session.processing_status === 'pending') && (
              <div className="mt-2 text-sm text-blue-600">
                Click to view processing status
              </div>
            )}
            
            {session.processing_status === 'completed' && (
              <div className="mt-2 text-sm text-green-600">
                Ready to edit • Click to open editor
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Export Dialog */}
      {selectedSession && (
        <ExportDialog
          sessionId={selectedSession.id}
          sessionTitle={selectedSession.title}
          isOpen={showExportDialog}
          onClose={() => {
            setShowExportDialog(false)
            setSelectedSession(null)
          }}
          onExportStarted={handleExportStarted}
        />
      )}
    </div>
  )
}