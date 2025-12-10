'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthGuard from '@/components/auth/AuthGuard'
import AudioRecorder from '@/components/recording/AudioRecorder'
import { api } from '@/lib/api'

export default function RecordPage() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [lectureTitle, setLectureTitle] = useState('')
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
      // Create FormData for file upload
      const formData = new FormData()

      // Create a file from the blob
      const audioFile = new File([recordedBlob], 'lecture.webm', {
        type: 'audio/webm'
      })

      formData.append('file', audioFile)

      if (lectureTitle.trim()) {
        formData.append('title', lectureTitle.trim())
      }

      const dailySessionId = searchParams.get('daily_session_id')
      if (dailySessionId) {
        formData.append('daily_session_id', dailySessionId)
      }

      // Upload to backend
      const response = await api.post('/lectures/process', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      const { session_id } = response.data

      // Redirect to processing status page
      router.push(`/lectures/${session_id}/processing`)

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

  const handleGoBack = () => {
    router.push('/dashboard')
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Record New Lecture</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Record your lecture and we&apos;ll automatically generate slides for you
                </p>
              </div>
              <button
                onClick={handleGoBack}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </button>
            </div>
          </div>

          {searchParams.get('daily_session_id') && (
            <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-md p-4 flex items-center">
              <svg className="h-5 w-5 text-indigo-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-indigo-700 font-medium">
                Recording linked to Daily Session
              </span>
            </div>
          )}

          {/* Error Display */}
          {uploadError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{uploadError}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recording Section */}
            <div className="lg:col-span-2">
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Audio Recording</h2>
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
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Lecture Details</h2>
                </div>
                <div className="p-6 space-y-4">
                  {/* Title Input */}
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                      Lecture Title (Optional)
                    </label>
                    <input
                      type="text"
                      id="title"
                      value={lectureTitle}
                      onChange={(e) => setLectureTitle(e.target.value)}
                      placeholder="e.g., Introduction to Machine Learning"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      maxLength={100}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      If not provided, we&apos;ll generate a title automatically
                    </p>
                  </div>

                  {/* Recording Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Recording Status
                    </label>
                    <div className={`p-3 rounded-md ${recordedBlob ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                      <div className="flex items-center">
                        {recordedBlob ? (
                          <>
                            <svg className="h-5 w-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm text-green-800">Recording ready</span>
                          </>
                        ) : (
                          <>
                            <svg className="h-5 w-5 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm text-gray-600">No recording yet</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    {recordedBlob && (
                      <button
                        onClick={handleUpload}
                        disabled={isUploading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUploading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Uploading...
                          </>
                        ) : (
                          'Process Lecture'
                        )}
                      </button>
                    )}

                    {recordedBlob && (
                      <button
                        onClick={handleStartOver}
                        disabled={isUploading}
                        className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Record Again
                      </button>
                    )}
                  </div>

                  {/* Upload Info */}
                  <div className="mt-6 p-4 bg-blue-50 rounded-md">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">Processing Info</h3>
                        <div className="mt-2 text-sm text-blue-700">
                          <ul className="list-disc list-inside space-y-1">
                            <li>Maximum file size: 500MB</li>
                            <li>Maximum duration: 120 minutes</li>
                            <li>Processing typically takes 30-50% of audio length</li>
                            <li>You&apos;ll be able to edit slides after processing</li>
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