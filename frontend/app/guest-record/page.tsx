'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import AudioRecorder from '@/components/recording/AudioRecorder'
import { api } from '@/lib/api'

// AI-themed demo content (~1 minute reading)
const DEMO_TEXT = `Welcome to the AI Classroom demo! Let me tell you about Artificial Intelligence.

Artificial Intelligence, or AI, is the simulation of human intelligence by machines. It enables computers to learn from experience, adjust to new inputs, and perform human-like tasks.

There are three main types of AI. First, Narrow AI, which is designed for specific tasks like voice assistants or recommendation systems. Second, General AI, which would have human-level intelligence across all domains - this doesn't exist yet. Third, Super AI, a theoretical concept where machines surpass human intelligence.

Machine Learning is a subset of AI that allows systems to learn and improve from experience without being explicitly programmed. Deep Learning uses neural networks with many layers to analyze complex patterns in data.

AI applications include natural language processing for understanding text and speech, computer vision for analyzing images and videos, and autonomous vehicles that can drive themselves.

The future of AI promises exciting developments in healthcare, education, and scientific research. Thank you for trying our AI Classroom demo!`

// Demo images that will reveal during recording
const DEMO_IMAGES = [
    {
        id: 1,
        url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=300&fit=crop',
        title: 'AI Neural Networks',
        revealAt: 5
    },
    {
        id: 2,
        url: 'https://images.unsplash.com/photo-1555255707-c07966088b7b?w=400&h=300&fit=crop',
        title: 'Machine Learning',
        revealAt: 20
    },
    {
        id: 3,
        url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&h=300&fit=crop',
        title: 'Robotics & AI',
        revealAt: 35
    },
    {
        id: 4,
        url: 'https://images.unsplash.com/photo-1507146153580-69a1fe6d8aa1?w=400&h=300&fit=crop',
        title: 'Future of AI',
        revealAt: 50
    }
]

interface Slide {
    id: number
    slide_number: number
    title: string
    content: string
}

export default function GuestRecordPage() {
    const [isRecording, setIsRecording] = useState(false)
    const [recordingTime, setRecordingTime] = useState(0)
    const [revealedImages, setRevealedImages] = useState<number[]>([])
    const [sessionTimeLeft, setSessionTimeLeft] = useState<number | null>(null)
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
    const [uploadError, setUploadError] = useState<string | null>(null)

    // Processing states
    const [isProcessing, setIsProcessing] = useState(false)
    const [processingStatus, setProcessingStatus] = useState<string>('')
    const [sessionId, setSessionId] = useState<number | null>(null)
    const [slides, setSlides] = useState<Slide[]>([])
    const [showSlides, setShowSlides] = useState(false)

    const router = useRouter()
    const { user, logout } = useAuthStore()

    // Check guest session and setup timer
    useEffect(() => {
        const guestSession = localStorage.getItem('guest_session')

        if (!guestSession) {
            router.push('/guest-login')
            return
        }

        const { expires_at } = JSON.parse(guestSession)
        // Backend sends UTC time without 'Z' suffix, need to parse as UTC
        const expiresDate = new Date(expires_at.endsWith('Z') ? expires_at : expires_at + 'Z')

        const updateTimer = () => {
            const now = new Date()
            const diffMs = expiresDate.getTime() - now.getTime()

            if (diffMs <= 0) {
                // Session expired
                localStorage.removeItem('guest_session')
                logout()
                router.push('/')
                return
            }

            setSessionTimeLeft(Math.floor(diffMs / 1000))
        }

        updateTimer()
        const interval = setInterval(updateTimer, 1000)

        return () => clearInterval(interval)
    }, [router, logout])

    // Track recording time for image reveals
    useEffect(() => {
        if (!isRecording) return

        const interval = setInterval(() => {
            setRecordingTime(prev => {
                const newTime = prev + 1

                // Check for image reveals
                DEMO_IMAGES.forEach(img => {
                    if (newTime >= img.revealAt && !revealedImages.includes(img.id)) {
                        setRevealedImages(prev => [...prev, img.id])
                    }
                })

                return newTime
            })
        }, 1000)

        return () => clearInterval(interval)
    }, [isRecording, revealedImages])

    const handleRecordingComplete = (audioBlob: Blob) => {
        setRecordedBlob(audioBlob)
        setIsRecording(false)
        setUploadError(null)
    }

    const handleRecordingError = (error: string) => {
        setUploadError(error)
    }

    const handleRecordingStart = useCallback(() => {
        setIsRecording(true)
        setRecordingTime(0)
        setRevealedImages([])
    }, [])

    // Process the recording through the AI
    const processRecording = async () => {
        if (!recordedBlob) return

        setIsProcessing(true)
        setProcessingStatus('Uploading recording...')
        setUploadError(null)

        try {
            // Upload the recording
            const formData = new FormData()
            const audioFile = new File([recordedBlob], 'demo-lecture.webm', { type: 'audio/webm' })
            formData.append('file', audioFile)
            formData.append('title', 'AI Classroom Demo')

            const uploadResponse = await api.post('/lectures/process', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })

            const newSessionId = uploadResponse.data.session_id
            setSessionId(newSessionId)
            setProcessingStatus('Processing your lecture...')

            // Poll for processing status
            let status = 'pending'
            while (status === 'pending' || status === 'processing') {
                await new Promise(resolve => setTimeout(resolve, 2000))

                const statusResponse = await api.get(`/lectures/${newSessionId}/status`)
                status = statusResponse.data.status

                if (status === 'processing') {
                    setProcessingStatus('AI is generating slides...')
                }
            }

            if (status === 'completed') {
                setProcessingStatus('Loading your slides...')

                // Fetch the generated slides
                const slidesResponse = await api.get(`/lectures/${newSessionId}`)
                setSlides(slidesResponse.data.slides || [])
                setShowSlides(true)
                setProcessingStatus('')
            } else {
                setUploadError('Processing failed. Please try again.')
            }
        } catch (error: any) {
            console.error('Processing error:', error)
            setUploadError(error.response?.data?.detail || 'Failed to process recording')
        } finally {
            setIsProcessing(false)
        }
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const formatSessionTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Session Timer Banner */}
            <div className="bg-amber-500/90 text-slate-900 py-2 px-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">
                            Guest Session: {sessionTimeLeft !== null ? formatSessionTime(sessionTimeLeft) : '--:--'} remaining
                        </span>
                    </div>
                    <span className="text-sm">Demo data will be deleted after expiry</span>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white">AI Classroom Demo</h1>
                        <p className="mt-2 text-gray-400">Try our lecture-to-slides conversion with sample AI content</p>
                    </div>
                    <button
                        onClick={() => {
                            localStorage.removeItem('guest_session')
                            logout()
                            router.push('/')
                        }}
                        className="text-gray-400 hover:text-white px-4 py-2 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors"
                    >
                        End Session
                    </button>
                </div>

                {uploadError && (
                    <div className="mb-6 bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-red-200">
                        {uploadError}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Demo Text Section */}
                    <div className="space-y-6">
                        <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
                            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Demo Script (Read Aloud)
                            </h2>
                            <div className="prose prose-invert max-w-none">
                                <p className="text-gray-300 leading-relaxed whitespace-pre-line text-lg">
                                    {DEMO_TEXT}
                                </p>
                            </div>
                            <div className="mt-4 text-sm text-gray-500">
                                Estimated reading time: ~1 minute
                            </div>
                        </div>

                        {/* Recording Section */}
                        <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
                            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                </svg>
                                Record Your Lecture
                            </h2>
                            <AudioRecorder
                                onRecordingComplete={handleRecordingComplete}
                                onError={handleRecordingError}
                            />
                            {recordedBlob && !showSlides && (
                                <div className="mt-4 space-y-3">
                                    {isProcessing ? (
                                        <div className="p-4 bg-indigo-500/20 border border-indigo-500/30 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <svg className="animate-spin h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <span className="text-indigo-200">{processingStatus}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
                                            <p className="text-green-200 mb-3">✓ Recording complete!</p>
                                            <button
                                                onClick={processRecording}
                                                className="w-full py-2 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all"
                                            >
                                                Generate Slides Preview
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Images Section */}
                    <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
                        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            AI-Generated Visuals
                            {!isRecording && revealedImages.length === 0 && (
                                <span className="text-sm font-normal text-gray-400 ml-2">(Start recording to reveal)</span>
                            )}
                        </h2>

                        <div className="grid grid-cols-2 gap-4">
                            {DEMO_IMAGES.map((img) => {
                                const isRevealed = revealedImages.includes(img.id)
                                return (
                                    <div
                                        key={img.id}
                                        className={`relative rounded-lg overflow-hidden transition-all duration-700 ${isRevealed ? 'opacity-100 scale-100' : 'opacity-30 scale-95'
                                            }`}
                                    >
                                        {!isRevealed && (
                                            <div className="absolute inset-0 bg-slate-800/80 backdrop-blur-sm flex items-center justify-center z-10">
                                                <div className="text-center text-gray-400">
                                                    <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                    </svg>
                                                    <p className="text-sm">Reveals at {img.revealAt}s</p>
                                                </div>
                                            </div>
                                        )}
                                        <img
                                            src={img.url}
                                            alt={img.title}
                                            className="w-full h-40 object-cover"
                                        />
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                                            <p className="text-white text-sm font-medium">{img.title}</p>
                                        </div>
                                        {isRevealed && (
                                            <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        <div className="mt-6 p-4 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                            <h3 className="font-medium text-purple-200 mb-2">💡 How it works</h3>
                            <p className="text-sm text-purple-300/80">
                                In a full account, when you upload course materials, our AI pre-generates relevant images
                                before you start recording. This reduces processing time and improves slide quality.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Generated Slides Preview */}
                {showSlides && slides.length > 0 && (
                    <div className="mt-8">
                        <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Your Generated Slides Preview
                                </h2>
                                <span className="text-sm text-gray-400">{slides.length} slides</span>
                            </div>

                            <div className="space-y-4">
                                {slides.map((slide, index) => (
                                    <div
                                        key={slide.id}
                                        className="bg-white/10 rounded-lg p-5 border border-white/20"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                                                {slide.slide_number}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-lg font-semibold text-white mb-2">{slide.title}</h3>
                                                <p className="text-gray-300 whitespace-pre-line">{slide.content}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Demo limitation notice */}
                            <div className="mt-6 p-4 bg-amber-500/20 border border-amber-400/30 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-amber-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <div>
                                        <p className="font-medium text-amber-200">Demo Preview Only</p>
                                        <p className="text-sm text-amber-300/80 mt-1">
                                            Create a free account to download slides as PDF or PowerPoint, edit content, and save your lectures permanently.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Upgrade CTA */}
                <div className="mt-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-center">
                    <h3 className="text-2xl font-bold text-white mb-2">
                        {showSlides ? 'Love what you see?' : 'Ready for the full experience?'}
                    </h3>
                    <p className="text-indigo-200 mb-4">
                        {showSlides
                            ? 'Create an account to download your slides, edit content, and save lectures permanently'
                            : 'Create an account to save your lectures, generate slides, and export to PDF/PowerPoint'
                        }
                    </p>
                    <a
                        href="/register"
                        className="inline-flex items-center px-6 py-3 bg-white text-indigo-600 font-medium rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                        Create Free Account
                        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </a>
                </div>
            </div>
        </div>
    )
}
