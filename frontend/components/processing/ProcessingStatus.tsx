'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { CheckCircle, XCircle, Mic, FileText, Layers, Home, RefreshCw, Eye, Info } from 'lucide-react'

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

const processingSteps = [
  { id: 'transcribe', label: 'Transcribing audio', icon: Mic },
  { id: 'generate', label: 'Generating slide content', icon: FileText },
  { id: 'finalize', label: 'Finalizing slides', icon: Layers },
]

export default function ProcessingStatus({ sessionId, onComplete, onError }: ProcessingStatusProps) {
  const [status, setStatus] = useState<ProcessingStatusData>({ status: 'pending' })
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isPolling, setIsPolling] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)
  const router = useRouter()

  const fetchStatus = useCallback(async () => {
    try {
      const response = await api.get(`/lectures/${sessionId}/status`)
      const newStatus = response.data as ProcessingStatusData
      setStatus(newStatus)

      // Simulate step progression based on progress
      if (newStatus.progress) {
        if (newStatus.progress < 33) setCurrentStep(0)
        else if (newStatus.progress < 66) setCurrentStep(1)
        else setCurrentStep(2)
      }

      if (newStatus.status === 'completed') {
        setIsPolling(false)
        setCurrentStep(3)
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

  useEffect(() => {
    if (!isPolling) return
    const interval = setInterval(fetchStatus, 5000)
    fetchStatus()
    return () => clearInterval(interval)
  }, [isPolling, fetchStatus])

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

  return (
    <div className="min-h-screen relative overflow-hidden bg-stone-50">
      {/* === FIXED BACKGROUND === */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] bg-teal-800/40 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -right-40 w-[700px] h-[700px] bg-teal-900/35 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] bg-teal-800/30 rounded-full blur-3xl"></div>
        <div className="absolute top-20 left-1/4 w-[400px] h-[400px] bg-rose-400/35 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-[450px] h-[450px] bg-rose-300/30 rounded-full blur-3xl"></div>
      </div>

      {/* === MAIN CONTENT === */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-[40px] shadow-2xl shadow-teal-900/10 p-10">

            {/* Header */}
            <div className="text-center mb-8">
              {/* Status Icon */}
              <div className="inline-flex items-center justify-center w-20 h-20 mb-6">
                {status.status === 'completed' ? (
                  <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
                    <CheckCircle className="w-10 h-10 text-white" />
                  </div>
                ) : status.status === 'failed' ? (
                  <div className="w-20 h-20 bg-gradient-to-br from-rose-400 to-rose-500 rounded-full flex items-center justify-center shadow-lg shadow-rose-500/30">
                    <XCircle className="w-10 h-10 text-white" />
                  </div>
                ) : (
                  <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg shadow-teal-500/30 relative">
                    <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-ping"></div>
                    <svg className="w-10 h-10 text-white animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}
              </div>

              <h1 className="text-2xl font-bold text-teal-900">
                {status.status === 'completed' ? 'Processing Complete!' :
                  status.status === 'failed' ? 'Processing Failed' :
                    'Processing Your Lecture'}
              </h1>
              <p className="text-teal-700/70 mt-2">
                {status.status === 'completed' ? 'Your slides are ready to view and edit.' :
                  status.status === 'failed' ? (status.error || 'Something went wrong. Please try again.') :
                    `Session ID: ${sessionId}`}
              </p>
            </div>

            {/* Progress Bar */}
            {(status.status === 'pending' || status.status === 'processing') && (
              <div className="mb-8">
                <div className="flex justify-between text-sm text-teal-700 mb-2">
                  <span>Progress</span>
                  <span>{status.progress || 0}%</span>
                </div>
                <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full transition-all duration-500"
                    style={{ width: `${status.progress || 0}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Processing Steps */}
            {(status.status === 'pending' || status.status === 'processing') && (
              <div className="space-y-4 mb-8">
                {processingSteps.map((step, index) => {
                  const Icon = step.icon
                  const isActive = currentStep === index
                  const isComplete = currentStep > index

                  return (
                    <div key={step.id} className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isComplete ? 'bg-green-500/20 border border-green-500/30' :
                          isActive ? 'bg-teal-500/20 border border-teal-500/30' :
                            'bg-white/10 border border-white/20'
                        }`}>
                        {isComplete ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Icon className={`w-5 h-5 ${isActive ? 'text-teal-600' : 'text-teal-700/50'}`} />
                        )}
                      </div>
                      <span className={`font-medium ${isComplete ? 'text-green-700' :
                          isActive ? 'text-teal-900' :
                            'text-teal-700/50'
                        }`}>
                        {step.label}
                        {isActive && <span className="ml-2 text-teal-500">...</span>}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Elapsed Time */}
            <div className="text-center mb-8">
              <p className="text-teal-700/70 text-sm">
                Elapsed time: <span className="font-mono font-medium text-teal-900">{formatTime(elapsedTime)}</span>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {status.status === 'completed' && (
                <>
                  <button
                    onClick={() => router.push(`/editor/${sessionId}`)}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white rounded-full font-semibold shadow-lg shadow-teal-500/30 transition-all"
                  >
                    <Eye className="w-5 h-5" />
                    View & Edit Slides
                  </button>
                  <Link
                    href="/dashboard"
                    className="w-full flex items-center justify-center gap-2 py-3 bg-white/20 backdrop-blur-xl border border-white/40 text-teal-900 rounded-full font-medium hover:bg-white/30 transition-all"
                  >
                    <Home className="w-5 h-5" />
                    Back to Dashboard
                  </Link>
                </>
              )}

              {status.status === 'failed' && (
                <>
                  <button
                    onClick={() => router.push('/record')}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-rose-500 to-rose-400 hover:from-rose-600 hover:to-rose-500 text-white rounded-full font-semibold shadow-lg shadow-rose-500/30 transition-all"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Try Again
                  </button>
                  <Link
                    href="/dashboard"
                    className="w-full flex items-center justify-center gap-2 py-3 bg-white/20 backdrop-blur-xl border border-white/40 text-teal-900 rounded-full font-medium hover:bg-white/30 transition-all"
                  >
                    <Home className="w-5 h-5" />
                    Back to Dashboard
                  </Link>
                </>
              )}

              {(status.status === 'pending' || status.status === 'processing') && (
                <Link
                  href="/dashboard"
                  className="w-full flex items-center justify-center gap-2 py-3 bg-white/20 backdrop-blur-xl border border-white/40 text-teal-900 rounded-full font-medium hover:bg-white/30 transition-all"
                >
                  <Home className="w-5 h-5" />
                  Leave This Page
                </Link>
              )}
            </div>

            {/* Info Box */}
            {(status.status === 'pending' || status.status === 'processing') && (
              <div className="mt-6 p-4 bg-teal-500/5 border border-teal-500/10 rounded-xl flex gap-3">
                <Info className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-teal-700">
                  You can safely leave this page. Processing will continue in the background,
                  and you can check the status from your dashboard.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}