'use client'

import React, { useState, useRef, useCallback } from 'react'

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void
  onError: (error: string) => void
}

export default function AudioRecorder({ onRecordingComplete, onError }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const requestMicrophonePermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      })

      streamRef.current = stream
      setHasPermission(true)

      // Find a supported MIME type
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/mpeg',
        ''  // Empty string means use browser default
      ]

      let selectedMimeType = ''
      for (const mimeType of mimeTypes) {
        if (mimeType === '' || MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType
          console.log(`Using MIME type: ${mimeType || 'browser default'}`)
          break
        }
      }

      // Initialize MediaRecorder with supported options
      const recorderOptions: MediaRecorderOptions = {}
      if (selectedMimeType) {
        recorderOptions.mimeType = selectedMimeType
      }

      const mediaRecorder = new MediaRecorder(stream, recorderOptions)

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        // Use the actual MIME type from the recorder
        const actualMimeType = mediaRecorder.mimeType || 'audio/webm'
        const audioBlob = new Blob(chunksRef.current, { type: actualMimeType })
        onRecordingComplete(audioBlob)
        chunksRef.current = []
      }

      mediaRecorderRef.current = mediaRecorder

    } catch (error) {
      console.error('Error accessing microphone:', error)
      setHasPermission(false)
      onError('Microphone access denied. Please allow microphone access to record.')
    }
  }, [onRecordingComplete, onError])

  const startRecording = useCallback(() => {
    if (!mediaRecorderRef.current || !streamRef.current) {
      onError('Microphone not initialized. Please refresh and try again.')
      return
    }

    try {
      chunksRef.current = []
      mediaRecorderRef.current.start(1000) // Collect data every second
      setIsRecording(true)
      setIsPaused(false)
      setRecordingTime(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

    } catch (error) {
      console.error('Error starting recording:', error)
      onError('Failed to start recording. Please try again.')
    }
  }, [onError])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause()
      setIsPaused(true)

      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isRecording])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume()
      setIsPaused(false)

      // Resume timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    }
  }, [isPaused])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)

      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      // Stop all tracks to release microphone
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [isRecording])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Request permission on component mount
  React.useEffect(() => {
    if (hasPermission === null) {
      requestMicrophonePermission()
    }
  }, [hasPermission, requestMicrophonePermission])

  if (hasPermission === null) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Requesting microphone access...</p>
        </div>
      </div>
    )
  }

  if (hasPermission === false) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Microphone Access Required</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>Please allow microphone access to record your lecture.</p>
            </div>
            <div className="mt-4">
              <button
                onClick={requestMicrophonePermission}
                className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-2 rounded-md text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="text-center">
        {/* Recording Status Indicator */}
        <div className="mb-6">
          {isRecording && (
            <div className="flex items-center justify-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`}></div>
              <span className="text-sm font-medium text-gray-700">
                {isPaused ? 'Paused' : 'Recording'}
              </span>
            </div>
          )}
        </div>

        {/* Timer */}
        <div className="mb-6">
          <div className="text-3xl font-mono font-bold text-gray-900">
            {formatTime(recordingTime)}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {isRecording ? (isPaused ? 'Recording paused' : 'Recording in progress') : 'Ready to record'}
          </p>
        </div>

        {/* Control Buttons */}
        <div className="flex justify-center space-x-4">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
              Start Recording
            </button>
          ) : (
            <>
              {!isPaused ? (
                <button
                  onClick={pauseRecording}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Pause
                </button>
              ) : (
                <button
                  onClick={resumeRecording}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Resume
                </button>
              )}

              <button
                onClick={stopRecording}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                </svg>
                Stop Recording
              </button>
            </>
          )}
        </div>

        {/* Recording Tips */}
        {!isRecording && (
          <div className="mt-6 text-xs text-gray-500">
            <p>• Speak clearly and at a normal pace</p>
            <p>• Ensure you&apos;re in a quiet environment</p>
            <p>• Maximum recording time: 120 minutes</p>
          </div>
        )}
      </div>
    </div>
  )
}