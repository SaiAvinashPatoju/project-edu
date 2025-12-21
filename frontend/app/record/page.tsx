'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AuthGuard from '@/components/auth/AuthGuard'
import AudioRecorder from '@/components/recording/AudioRecorder'
import { api } from '@/lib/api'
import { Mic, Calendar, AlertCircle, Info, CheckCircle, ArrowLeft, Upload, Loader2, Sparkles, Brain } from 'lucide-react'

export default function RecordPage() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [lectureTitle, setLectureTitle] = useState('')
  const [selectedModel, setSelectedModel] = useState('qwen')
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleRecordingComplete = (audioBlob: Blob) => {
    setRecordedBlob(audioBlob)
    setUploadError(null)
  }

  const handleRecordingError = (error: string) => {
    setUploadError(error)
  }

  const handleUpload = async () => {
    if (!recordedBlob) {
      setUploadError('No recording available to upload')
      return
    }

    setIsUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      const audioFile = new File([recordedBlob], 'lecture.webm', { type: 'audio/webm' })
      formData.append('file', audioFile)

      if (lectureTitle.trim()) {
        formData.append('title', lectureTitle.trim())
      }

      const dailySessionId = searchParams.get('daily_session_id')
      if (dailySessionId) {
        formData.append('daily_session_id', dailySessionId)
      }

      // Add model selection
      formData.append('model', selectedModel)
      console.log('Submitting with model:', selectedModel)

      const response = await api.post('/lectures/process', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      router.push(`/lectures/${response.data.session_id}/processing`)
    } catch (error: any) {
      console.error('Upload error:', error)
      if (error.response?.status === 413) {
        setUploadError('File too large. Maximum size is 500MB.')
      } else if (error.response?.status === 400) {
        setUploadError(error.response.data?.detail || 'Invalid file format.')
      } else if (error.response?.status === 401) {
        setUploadError('Authentication required. Please log in again.')
      } else {
        setUploadError('Upload failed. Please try again.')
      }
    } finally {
      setIsUploading(false)
    }
  }

  const handleStartOver = () => {
    setRecordedBlob(null)
    setUploadError(null)
    setLectureTitle('')
  }

  return (
    <AuthGuard>
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-stone-50 to-slate-100">
        {/* === RICH BACKGROUND === */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-20 w-[600px] h-[600px] bg-teal-600/25 rounded-full blur-3xl"></div>
          <div className="absolute top-1/3 -right-40 w-[700px] h-[700px] bg-teal-700/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] bg-teal-600/20 rounded-full blur-3xl"></div>
          <div className="absolute top-20 left-1/4 w-[400px] h-[400px] bg-rose-500/25 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-[450px] h-[450px] bg-rose-400/20 rounded-full blur-3xl"></div>
        </div>

        {/* === MAIN CONTENT === */}
        <div className="relative z-10 min-h-screen p-4 md:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto">

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="w-12 h-12 bg-white border border-slate-200 rounded-xl shadow-lg flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Record New Lecture</h1>
                  <p className="text-slate-500">Record and we&apos;ll generate slides automatically</p>
                </div>
              </div>

              {/* Recording indicator */}
              <div className="hidden md:flex items-center gap-3 bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-2.5">
                <div className={`w-3 h-3 rounded-full ${recordedBlob ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-rose-500 animate-pulse shadow-lg shadow-rose-500/50'}`}></div>
                <span className="text-slate-700 text-sm font-semibold">
                  {recordedBlob ? 'Ready to process' : 'Not recording'}
                </span>
              </div>
            </div>

            {/* Daily Session Indicator */}
            {searchParams.get('daily_session_id') && (
              <div className="mb-6 bg-teal-50 border border-teal-200 rounded-xl shadow p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md shadow-teal-500/30">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <span className="text-teal-800 font-semibold">Recording linked to Daily Session</span>
              </div>
            )}

            {/* Error Display */}
            {uploadError && (
              <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl shadow p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl flex items-center justify-center shadow-md shadow-rose-500/30">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <span className="text-rose-800 font-medium">{uploadError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recording Section */}
              <div className="lg:col-span-2">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-gradient-to-r from-slate-50 to-white">
                    <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/30">
                      <Mic className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Audio Recording</h2>
                      <p className="text-sm text-slate-500">Click to start recording your lecture</p>
                    </div>
                  </div>
                  <div className="p-6">
                    <AudioRecorder
                      onRecordingComplete={handleRecordingComplete}
                      onError={handleRecordingError}
                    />
                  </div>
                </div>
              </div>

              {/* Upload Section */}
              <div className="lg:col-span-1">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                    <h2 className="text-lg font-bold text-slate-900">Lecture Details</h2>
                  </div>
                  <div className="p-6 space-y-5">
                    {/* Title Input */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Lecture Title (Optional)
                      </label>
                      <input
                        type="text"
                        value={lectureTitle}
                        onChange={(e) => setLectureTitle(e.target.value)}
                        placeholder="e.g., Introduction to Machine Learning"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                        maxLength={100}
                      />
                      <p className="mt-2 text-xs text-slate-500">
                        If not provided, we&apos;ll generate a title automatically
                      </p>
                    </div>

                    {/* Model Selection */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        <span className="flex items-center gap-2">
                          <Brain className="w-4 h-4" />
                          AI Model
                        </span>
                      </label>
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all cursor-pointer"
                      >
                        <option value="qwen">Qwen 2.5-3B (Local, Recommended)</option>
                        <option value="gemma">Gemma 3 4B (Local, Lighter)</option>
                        <option value="gemini">Gemini 2.0 Flash (Cloud)</option>
                      </select>
                      <p className="mt-2 text-xs text-slate-500">
                        {selectedModel === 'qwen' && 'Best quality for detailed slides'}
                        {selectedModel === 'gemma' && 'Faster, good for quick processing'}
                        {selectedModel === 'gemini' && 'Cloud-based, requires API key'}
                      </p>
                    </div>

                    {/* Recording Status */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Recording Status
                      </label>
                      <div className={`p-4 rounded-xl flex items-center gap-3 ${recordedBlob
                        ? 'bg-green-50 border-2 border-green-200'
                        : 'bg-slate-50 border-2 border-slate-200'
                        }`}>
                        {recordedBlob ? (
                          <>
                            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-md shadow-green-500/30">
                              <CheckCircle className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <span className="text-green-800 font-bold">Recording ready!</span>
                              <p className="text-sm text-green-600">Click &quot;Process Lecture&quot; to continue</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center">
                              <Mic className="w-5 h-5 text-slate-500" />
                            </div>
                            <span className="text-slate-600 font-medium">No recording yet</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3 pt-2">
                      {recordedBlob && (
                        <>
                          <button
                            onClick={handleUpload}
                            disabled={isUploading}
                            className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-xl font-bold shadow-xl shadow-rose-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-5 h-5" />
                                Process Lecture
                              </>
                            )}
                          </button>

                          <button
                            onClick={handleStartOver}
                            disabled={isUploading}
                            className="w-full py-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl font-medium disabled:opacity-50 transition-all"
                          >
                            Record Again
                          </button>
                        </>
                      )}
                    </div>

                    {/* Info Box */}
                    <div className="mt-4 p-4 bg-teal-50 border border-teal-200 rounded-xl">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md shadow-teal-500/30 flex-shrink-0">
                          <Info className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-teal-900 mb-2">Processing Info</h3>
                          <ul className="text-sm text-teal-700 space-y-1">
                            <li>• Max file size: 500MB</li>
                            <li>• Max duration: 120 minutes</li>
                            <li>• Processing: 30-50% of audio length</li>
                            <li>• Edit slides after processing</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}