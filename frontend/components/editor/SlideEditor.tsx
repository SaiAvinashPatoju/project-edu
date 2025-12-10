'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient, SessionWithSlides, Slide } from '@/lib/api-client'
import { draftManager, useUnsavedChangesWarning } from '@/lib/draft-manager'
import SlideCard from './SlideCard'
import ExportDialog from '../export/ExportDialog'
import ExportStatus from '../export/ExportStatus'
import SessionDebug from '../debug/SessionDebug'

interface SlideEditorProps {
  sessionId: number
}

export default function SlideEditor({ sessionId }: SlideEditorProps) {
  const [sessionData, setSessionData] = useState<SessionWithSlides | null>(null)
  const [slides, setSlides] = useState<Slide[]>([])
  const [activeSlideIndex, setActiveSlideIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showDraftPrompt, setShowDraftPrompt] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [activeExports, setActiveExports] = useState<Array<{ id: number; format: string }>>([])
  const [exportError, setExportError] = useState<string | null>(null)
  
  const router = useRouter()

  // Auto-save interval
  const AUTO_SAVE_INTERVAL = 10000 // 10 seconds

  // Set up unsaved changes warning
  useUnsavedChangesWarning(hasUnsavedChanges)

  const loadSessionData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.fetchSessionWithSlides(sessionId)
      setSessionData(data)
      
      // Check for drafts and apply them
      const hasDraft = draftManager.hasDraft(sessionId)
      if (hasDraft) {
        const slidesWithDrafts = draftManager.applyDraftsToSlides(sessionId, data.slides)
        setSlides(slidesWithDrafts)
        setHasUnsavedChanges(draftManager.hasUnsavedChanges(sessionId, data.slides))
        setShowDraftPrompt(true)
      } else {
        setSlides(data.slides)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    loadSessionData()
  }, [loadSessionData])

  // Auto-save drafts
  useEffect(() => {
    if (!slides.length || !sessionData) return

    const interval = setInterval(() => {
      slides.forEach(slide => {
        const originalSlide = sessionData.slides.find(s => s.id === slide.id)
        if (originalSlide && (slide.title !== originalSlide.title || slide.content !== originalSlide.content)) {
          draftManager.saveDraft(sessionId, slide.id, slide.title, slide.content)
        }
      })
    }, AUTO_SAVE_INTERVAL)

    return () => clearInterval(interval)
  }, [slides, sessionData, sessionId])

  const handleSlideUpdate = useCallback((slideId: number, title: string, content: string) => {
    setSlides(prevSlides => 
      prevSlides.map(slide => 
        slide.id === slideId 
          ? { ...slide, title, content }
          : slide
      )
    )
    
    // Save draft immediately on edit
    draftManager.saveDraft(sessionId, slideId, title, content)
    setHasUnsavedChanges(true)
  }, [sessionId])

  const saveChanges = async () => {
    if (!sessionData) return

    try {
      setSaving(true)
      
      // Save all changed slides
      const savePromises = slides.map(async (slide) => {
        const originalSlide = sessionData.slides.find(s => s.id === slide.id)
        if (originalSlide && (slide.title !== originalSlide.title || slide.content !== originalSlide.content)) {
          return apiClient.updateSlide(slide.id, {
            title: slide.title,
            content: slide.content
          })
        }
        return slide
      })

      const updatedSlides = await Promise.all(savePromises)
      
      // Update session data with saved slides
      setSessionData(prev => prev ? { ...prev, slides: updatedSlides } : null)
      setHasUnsavedChanges(false)
      
      // Clear drafts after successful save
      draftManager.clearDraft(sessionId)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const discardDrafts = () => {
    if (sessionData) {
      setSlides(sessionData.slides)
      draftManager.clearDraft(sessionId)
      setHasUnsavedChanges(false)
      setShowDraftPrompt(false)
    }
  }

  const acceptDrafts = () => {
    setShowDraftPrompt(false)
  }

  const handleExportStarted = (exportId: number, format: string) => {
    setActiveExports(prev => [...prev, { id: exportId, format }])
    setExportError(null)
  }

  const handleExportComplete = (exportId: number) => {
    // Keep the export in the list so user can download
    // Could optionally remove after some time
  }

  const handleExportError = (exportId: number, error: string) => {
    setExportError(error)
    setActiveExports(prev => prev.filter(exp => exp.id !== exportId))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading slides...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-md p-6 max-w-md">
            <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Session</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <div className="space-x-3">
              <button
                onClick={loadSessionData}
                className="bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded text-sm"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
          <SessionDebug sessionId={sessionId} />
        </div>
      </div>
    )
  }

  if (!sessionData || slides.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No slides found for this session.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{sessionData.session.title}</h1>
                <p className="text-sm text-gray-500">{slides.length} slides</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {hasUnsavedChanges && (
                <span className="text-sm text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                  Unsaved changes
                </span>
              )}
              <button
                onClick={() => setShowExportDialog(true)}
                disabled={hasUnsavedChanges}
                className={`px-4 py-2 rounded text-sm font-medium flex items-center space-x-2 ${
                  !hasUnsavedChanges
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                title={hasUnsavedChanges ? 'Save changes before exporting' : 'Export presentation'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Export</span>
              </button>
              <button
                onClick={saveChanges}
                disabled={!hasUnsavedChanges || saving}
                className={`px-4 py-2 rounded text-sm font-medium ${
                  hasUnsavedChanges && !saving
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Draft restoration prompt */}
      {showDraftPrompt && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-blue-800">
                  We found unsaved changes from a previous session. Would you like to restore them?
                </span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={acceptDrafts}
                  className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                >
                  Keep Changes
                </button>
                <button
                  onClick={discardDrafts}
                  className="text-sm bg-gray-300 hover:bg-gray-400 text-gray-700 px-3 py-1 rounded"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export error notification */}
      {exportError && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-red-800">Export failed: {exportError}</span>
              </div>
              <button
                onClick={() => setExportError(null)}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active exports */}
      {activeExports.length > 0 && (
        <div className="bg-gray-50 border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Active Exports</h3>
            <div className="space-y-2">
              {activeExports.map((exportItem) => (
                <ExportStatus
                  key={exportItem.id}
                  exportId={exportItem.id}
                  format={exportItem.format}
                  onComplete={() => handleExportComplete(exportItem.id)}
                  onError={(error) => handleExportError(exportItem.id, error)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Slide navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Slides</h3>
              <div className="space-y-2">
                {slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    onClick={() => setActiveSlideIndex(index)}
                    className={`w-full text-left p-3 rounded-md text-sm transition-colors ${
                      activeSlideIndex === index
                        ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="font-medium truncate">{slide.title}</div>
                    <div className="text-xs text-gray-500 mt-1">Slide {slide.slide_number}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active slide editor */}
          <div className="lg:col-span-3">
            {slides[activeSlideIndex] && (
              <SlideCard
                slide={slides[activeSlideIndex]}
                isActive={true}
                onUpdate={handleSlideUpdate}
                onSelect={() => {}}
              />
            )}
          </div>
        </div>
      </div>

      {/* Export Dialog */}
      <ExportDialog
        sessionId={sessionId}
        sessionTitle={sessionData.session.title}
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExportStarted={handleExportStarted}
      />
    </div>
  )
}