'use client'

import { useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiClient, SessionWithSlides } from '@/lib/api-client'
import { ChevronLeft, ChevronRight, Download, Home, Quote, AlertCircle, Sparkles, BookOpen, List, CheckCircle } from 'lucide-react'

interface SlidesViewerProps {
  sessionId: number
}

// Parse markdown-style formatting in text
function parseFormattedText(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  let remaining = text
  let key = 0

  // Pattern for **bold** text
  const boldPattern = /\*\*([^*]+)\*\*/g
  let lastIndex = 0
  let match

  while ((match = boldPattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>)
    }
    // Add the bold text with teal color
    parts.push(
      <span key={key++} className="font-bold text-teal-700">
        {match[1]}
      </span>
    )
    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>)
  }

  return parts.length > 0 ? parts : [<span key={0}>{text}</span>]
}

// Parse slide content which may be JSON string, plain string, or array
function parseSlideContent(content: any): string[] {
  if (!content) return []

  // If already an array, return it
  if (Array.isArray(content)) {
    return content.map(item => String(item))
  }

  // If it's a string, try to parse as JSON first
  if (typeof content === 'string') {
    const trimmed = content.trim()

    // Check if it looks like a JSON array
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          return parsed.map(item => String(item))
        }
      } catch (e) {
        // Not valid JSON, fall through
      }
    }

    // Split by newlines if it contains them
    if (trimmed.includes('\n')) {
      return trimmed.split('\n').filter(line => line.trim())
    }

    // Return as single item array
    return trimmed ? [trimmed] : []
  }

  // Fallback
  return [String(content)]
}

// Render content based on slide type
function SlideContent({ slide }: { slide: any }) {
  const slideType = slide.slide_type || slide.type || 'list'
  const rawContent = slide.content
  const title = slide.title

  // Parse the content
  const content = parseSlideContent(rawContent)

  // Title Slide
  if (slideType === 'title') {
    // For title slides, content is the subtitle (single string)
    const subtitle = typeof rawContent === 'string' ? rawContent : (content[0] || '')
    return (
      <div className="flex flex-col items-center justify-center text-center h-full py-12">
        <div className="mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-teal-500/30">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-teal-900 mb-4 leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xl md:text-2xl text-rose-500 font-medium">
            {subtitle}
          </p>
        )}
      </div>
    )
  }

  // Quote Slide
  if (slideType === 'quote') {
    const quoteText = typeof rawContent === 'string' ? rawContent : (content[0] || '')
    return (
      <div className="flex flex-col items-center justify-center text-center h-full py-12 relative">
        {/* Big quote icon in background */}
        <div className="absolute top-8 left-8 opacity-10">
          <Quote className="w-32 h-32 text-teal-900" />
        </div>
        <h2 className="text-xl font-bold text-teal-600 mb-8 uppercase tracking-wider">
          {title}
        </h2>
        <blockquote className="text-2xl md:text-3xl text-slate-600 italic max-w-2xl leading-relaxed">
          &quot;{quoteText}&quot;
        </blockquote>
      </div>
    )
  }

  // Summary Slide
  if (slideType === 'summary') {
    return (
      <div className="h-full py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-teal-900">
            {title}
          </h1>
        </div>
        <div className="space-y-4">
          {content.map((item: string, index: number) => (
            <div key={index} className="flex items-start gap-4 p-4 bg-green-50 border-l-4 border-green-500 rounded-r-xl">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                {index + 1}
              </div>
              <p className="text-lg text-slate-700 pt-1">
                {parseFormattedText(item)}
              </p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Concept Slide
  if (slideType === 'concept') {
    return (
      <div className="h-full py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/30">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-teal-900">
            {title}
          </h1>
        </div>
        <div className="space-y-5">
          {content.map((item: string, index: number) => (
            <div key={index} className="flex items-start gap-4">
              <div className="w-3 h-3 bg-gradient-to-br from-rose-400 to-rose-500 rounded-full flex-shrink-0 mt-2.5 shadow-lg shadow-rose-400/50"></div>
              <p className="text-lg md:text-xl text-slate-700">
                {parseFormattedText(item)}
              </p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // List Slide (default)
  const bulletColors = [
    { bg: 'bg-teal-500', shadow: 'shadow-teal-500/50' },
    { bg: 'bg-rose-500', shadow: 'shadow-rose-500/50' },
    { bg: 'bg-orange-500', shadow: 'shadow-orange-500/50' },
    { bg: 'bg-teal-500', shadow: 'shadow-teal-500/50' },
    { bg: 'bg-rose-500', shadow: 'shadow-rose-500/50' },
  ]

  return (
    <div className="h-full py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/30">
          <List className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-teal-900">
          {title}
        </h1>
      </div>
      <div className="space-y-5">
        {content.map((item: string, index: number) => {
          const colorConfig = bulletColors[index % bulletColors.length]
          const cleanItem = item.replace(/^[•\-\*]\s*/, '')
          return (
            <div key={index} className="flex items-start gap-4">
              <div className={`w-3 h-3 ${colorConfig.bg} rounded-full flex-shrink-0 mt-2.5 shadow-lg ${colorConfig.shadow}`}></div>
              <p className="text-lg md:text-xl text-slate-700">
                {parseFormattedText(cleanItem)}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function SlidesViewer({ sessionId }: SlidesViewerProps) {
  const [sessionData, setSessionData] = useState<SessionWithSlides | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadSessionData()
  }, [sessionId])

  const loadSessionData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.fetchSessionWithSlides(sessionId)
      setSessionData(data)
    } catch (err: any) {
      console.error('Error loading session:', err)
      setError(err.message || 'Failed to load session')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'pdf' | 'pptx') => {
    setExportLoading(true)
    setShowExportMenu(false)
    setExportMessage(null)

    try {
      // Start the export
      const result = await apiClient.startExport(sessionId, format)
      const exportId = result.export_id

      setExportMessage({
        type: 'success',
        text: `${format.toUpperCase()} export started. Generating file...`
      })

      // Poll for export completion
      const pollInterval = setInterval(async () => {
        try {
          const status = await apiClient.getExportStatus(exportId)

          if (status.status === 'completed') {
            clearInterval(pollInterval)
            setExportMessage({
              type: 'success',
              text: `${format.toUpperCase()} ready! Starting download...`
            })

            // Download the file
            try {
              const blob = await apiClient.downloadExport(exportId)
              const url = window.URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `${sessionData?.session.title || 'lecture'}.${format}`
              document.body.appendChild(a)
              a.click()
              window.URL.revokeObjectURL(url)
              document.body.removeChild(a)

              setExportMessage({
                type: 'success',
                text: `${format.toUpperCase()} downloaded successfully!`
              })
              setTimeout(() => setExportMessage(null), 5000)
            } catch (downloadErr: any) {
              setExportMessage({
                type: 'error',
                text: downloadErr.message || 'Failed to download file'
              })
            }
            setExportLoading(false)
          } else if (status.status === 'failed') {
            clearInterval(pollInterval)
            setExportMessage({
              type: 'error',
              text: status.error || 'Export failed'
            })
            setExportLoading(false)
          }
          // If still processing, continue polling
        } catch (pollErr) {
          clearInterval(pollInterval)
          console.error('Polling error:', pollErr)
          setExportLoading(false)
        }
      }, 2000) // Poll every 2 seconds

      // Timeout after 2 minutes
      setTimeout(() => {
        clearInterval(pollInterval)
        if (exportLoading) {
          setExportMessage({
            type: 'error',
            text: 'Export timed out. Please try again.'
          })
          setExportLoading(false)
        }
      }, 120000)

    } catch (err: any) {
      console.error('Export error:', err)
      setExportMessage({
        type: 'error',
        text: err.message || 'Failed to start export'
      })
      setExportLoading(false)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!sessionData) return
      if (e.key === 'ArrowLeft') {
        setCurrentSlide(prev => Math.max(0, prev - 1))
      } else if (e.key === 'ArrowRight') {
        setCurrentSlide(prev => Math.min(sessionData.slides.length - 1, prev + 1))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sessionData])

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-stone-50 to-slate-100">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-20 w-[600px] h-[600px] bg-teal-600/25 rounded-full blur-3xl"></div>
          <div className="absolute top-1/3 -right-40 w-[700px] h-[700px] bg-teal-700/20 rounded-full blur-3xl"></div>
          <div className="absolute top-20 right-1/4 w-[400px] h-[400px] bg-rose-500/25 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-teal-600 border-t-transparent mx-auto"></div>
            <p className="mt-6 text-slate-700 font-medium text-lg">Loading slides...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-stone-50 to-slate-100">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-20 w-[600px] h-[600px] bg-teal-600/25 rounded-full blur-3xl"></div>
          <div className="absolute top-1/3 -right-40 w-[700px] h-[700px] bg-teal-700/20 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
          <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl p-12 text-center max-w-md">
            <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-rose-500/30">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Error Loading Slides</h3>
            <p className="text-slate-600 mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={loadSessionData}
                className="px-6 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl font-medium shadow-lg shadow-teal-500/30"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-3 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-medium"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!sessionData || !sessionData.slides || sessionData.slides.length === 0) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-stone-50 to-slate-100">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-20 w-[600px] h-[600px] bg-teal-600/25 rounded-full blur-3xl"></div>
          <div className="absolute top-1/3 -right-40 w-[700px] h-[700px] bg-teal-700/20 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
          <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl p-12 text-center max-w-md">
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Slides Found</h3>
            <p className="text-slate-600 mb-6">This session doesn&apos;t have any slides yet.</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl font-medium shadow-lg shadow-teal-500/30"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  const slides = sessionData.slides.sort((a, b) => a.slide_number - b.slide_number)
  const currentSlideData = slides[currentSlide]

  // Determine slide type for visual indicators
  const getSlideTypeIcon = (slide: any) => {
    const type = slide.slide_type || slide.type || 'list'
    switch (type) {
      case 'title': return 'bg-teal-500'
      case 'concept': return 'bg-rose-500'
      case 'quote': return 'bg-orange-500'
      case 'summary': return 'bg-green-500'
      default: return 'bg-teal-500'
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-stone-50 to-slate-100">
      {/* === RICH BACKGROUND === */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] bg-teal-600/25 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -right-40 w-[700px] h-[700px] bg-teal-700/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] bg-teal-600/20 rounded-full blur-3xl"></div>
        <div className="absolute top-20 right-1/4 w-[400px] h-[400px] bg-rose-500/25 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-[450px] h-[450px] bg-rose-400/20 rounded-full blur-3xl"></div>
      </div>

      {/* === MAIN CONTENT === */}
      <div className="relative z-10 min-h-screen flex flex-col">

        {/* === FLOATING HEADER === */}
        <div className="flex justify-center pt-6 px-4 relative z-50">
          <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl px-6 py-3 shadow-xl flex items-center gap-4">
            {/* Back Button */}
            <Link
              href="/dashboard"
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <Home className="w-5 h-5 text-slate-600" />
            </Link>

            {/* Lecture Title */}
            <span className="text-slate-900 font-semibold">
              {sessionData.session.title || `Lecture ${sessionId}`}
            </span>

            <div className="w-px h-6 bg-slate-200"></div>

            {/* Slide Counter */}
            <span className="text-slate-500 text-sm font-medium">
              {currentSlide + 1} / {slides.length}
            </span>

            <div className="w-px h-6 bg-slate-200"></div>

            {/* Export Button */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={exportLoading}
                className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white px-5 py-2 rounded-xl font-medium shadow-lg shadow-rose-500/30 transition-all disabled:opacity-50"
              >
                {exportLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export
                  </>
                )}
              </button>

              {showExportMenu && !exportLoading && (
                <>
                  {/* Click-away overlay - rendered BEFORE dropdown so dropdown gets clicks */}
                  <div
                    className="fixed inset-0"
                    onClick={() => setShowExportMenu(false)}
                  />
                  <div className="absolute top-full right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-[60] flex gap-1 p-2">
                    <button
                      onClick={() => handleExport('pdf')}
                      className="flex items-center gap-2 px-4 py-2.5 text-slate-700 hover:bg-rose-50 hover:text-rose-600 rounded-lg font-medium transition-colors whitespace-nowrap"
                    >
                      📄 PDF
                    </button>
                    <button
                      onClick={() => handleExport('pptx')}
                      className="flex items-center gap-2 px-4 py-2.5 text-slate-700 hover:bg-rose-50 hover:text-rose-600 rounded-lg font-medium transition-colors whitespace-nowrap"
                    >
                      📊 PPTX
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Toast Notification */}
        {exportMessage && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className={`px-6 py-3 rounded-xl shadow-xl flex items-center gap-3 ${exportMessage.type === 'success'
              ? 'bg-green-500 text-white'
              : 'bg-rose-500 text-white'
              }`}>
              {exportMessage.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span className="font-medium">{exportMessage.text}</span>
              <button
                onClick={() => setExportMessage(null)}
                className="ml-2 text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* === MAIN STAGE === */}
        <div className="flex-1 flex items-center justify-center px-4 py-8 relative">

          {/* Navigation Arrow - Left */}
          <button
            onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
            disabled={currentSlide === 0}
            className="absolute left-4 md:left-12 w-14 h-14 md:w-16 md:h-16 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl flex items-center justify-center shadow-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all"
          >
            <ChevronLeft className="w-6 h-6 md:w-8 md:h-8 text-slate-600" />
          </button>

          {/* Main Slide Card */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl p-8 md:p-12 max-w-4xl w-full mx-16 md:mx-24 min-h-[450px] md:min-h-[520px] flex flex-col">
            <SlideContent slide={currentSlideData} />
          </div>

          {/* Navigation Arrow - Right */}
          <button
            onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
            disabled={currentSlide === slides.length - 1}
            className="absolute right-4 md:right-12 w-14 h-14 md:w-16 md:h-16 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl flex items-center justify-center shadow-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all"
          >
            <ChevronRight className="w-6 h-6 md:w-8 md:h-8 text-slate-600" />
          </button>
        </div>

        {/* === THUMBNAIL DOCK === */}
        <div className="flex justify-center pb-6 px-4">
          <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl px-4 py-3 shadow-xl flex items-center gap-3 overflow-x-auto max-w-full">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                onClick={() => setCurrentSlide(index)}
                className={`flex-shrink-0 w-20 h-14 md:w-24 md:h-16 bg-white border-2 rounded-xl shadow-md transition-all duration-300 overflow-hidden ${index === currentSlide
                  ? 'border-rose-400 ring-2 ring-rose-400/30 scale-105'
                  : 'border-slate-200 opacity-70 hover:opacity-100'
                  }`}
              >
                <div className="p-2 h-full flex flex-col">
                  <div className={`w-full h-1.5 ${getSlideTypeIcon(slide)} rounded mb-1 opacity-80`}></div>
                  <div className="w-3/4 h-1 bg-slate-200 rounded mb-0.5"></div>
                  <div className="w-1/2 h-1 bg-slate-200 rounded"></div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}