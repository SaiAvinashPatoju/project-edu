'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient, SessionWithSlides } from '@/lib/api-client'

interface SlidesViewerProps {
  sessionId: number
}

export default function SlidesViewer({ sessionId }: SlidesViewerProps) {
  const [sessionData, setSessionData] = useState<SessionWithSlides | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const router = useRouter()

  useEffect(() => {
    loadSessionData()
  }, [sessionId])

  const loadSessionData = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('Loading session data for ID:', sessionId)
      const data = await apiClient.fetchSessionWithSlides(sessionId)
      console.log('Session data loaded:', data)
      setSessionData(data)
    } catch (err: any) {
      console.error('Error loading session:', err)
      setError(err.message || 'Failed to load session')
    } finally {
      setLoading(false)
    }
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
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Slides</h3>
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

          {/* Debug info */}
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left">
            <h4 className="font-medium text-yellow-800 mb-2">Debug Info:</h4>
            <p className="text-sm text-yellow-700">Session ID: {sessionId}</p>
            <p className="text-sm text-yellow-700">Error: {error}</p>
            <button
              onClick={() => {
                console.log('Testing direct API call...')
                fetch(`http://localhost:8000/lectures/${sessionId}`, {
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth-storage') ? JSON.parse(localStorage.getItem('auth-storage')!).state.token : 'no-token'}`
                  }
                })
                  .then(res => res.json())
                  .then(data => console.log('Direct API response:', data))
                  .catch(err => console.error('Direct API error:', err))
              }}
              className="mt-2 bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
            >
              Test Direct API Call
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!sessionData || !sessionData.slides || sessionData.slides.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Slides Found</h3>
          <p className="text-gray-600 mb-4">This session doesn&apos;t have any slides yet.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const slides = sessionData.slides.sort((a, b) => a.slide_number - b.slide_number)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{sessionData.session.title}</h1>
              <p className="text-sm text-gray-600">
                {slides.length} slides • Created {new Date(sessionData.session.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => {
                  // TODO: Implement export functionality
                  alert('Export functionality coming soon!')
                }}
                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
              >
                Export Slides
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Slides Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium text-gray-900">
            Slide {currentSlide + 1} of {slides.length}
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
              disabled={currentSlide === 0}
              className="bg-white border border-gray-300 text-gray-700 px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
              disabled={currentSlide === slides.length - 1}
              className="bg-white border border-gray-300 text-gray-700 px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>

        {/* Current Slide */}
        <div className="bg-white rounded-lg shadow-lg p-8 min-h-96">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            {slides[currentSlide]?.title}
          </h3>
          <div className="prose max-w-none">
            {slides[currentSlide]?.content.split('\n').map((line, index) => (
              <p key={index} className="text-gray-700 mb-3">
                {line.startsWith('•') || line.startsWith('-') ? (
                  <span className="flex items-start">
                    <span className="text-indigo-600 mr-2">•</span>
                    <span>{line.replace(/^[•-]\s*/, '')}</span>
                  </span>
                ) : (
                  line
                )}
              </p>
            ))}
          </div>
        </div>

        {/* Slide Thumbnails */}
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">All Slides</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                onClick={() => setCurrentSlide(index)}
                className={`cursor-pointer border-2 rounded-lg p-3 transition-colors ${index === currentSlide
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
              >
                <div className="text-xs text-gray-500 mb-1">Slide {slide.slide_number}</div>
                <div className="text-sm font-medium text-gray-900 truncate">
                  {slide.title}
                </div>
                <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {slide.content.substring(0, 100)}...
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}