'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import AuthGuard from '@/components/auth/AuthGuard'
import { api } from '@/lib/api'

interface DailySession {
    id: number
    date: string
    title: string
    course_material: string | null
    prepared_images: string | null
    created_at: string
    updated_at: string
}

export default function DailySessionDetailPage() {
    const router = useRouter()
    const params = useParams()
    const sessionId = params.id as string

    const [session, setSession] = useState<DailySession | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [uploading, setUploading] = useState(false)
    const [uploadSuccess, setUploadSuccess] = useState(false)

    useEffect(() => {
        fetchSession()
    }, [sessionId])

    const fetchSession = async () => {
        try {
            const response = await api.get(`/daily-sessions/${sessionId}`)
            setSession(response.data)
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to load session')
        } finally {
            setLoading(false)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        setUploadSuccess(false)
        setError(null)

        const formData = new FormData()
        formData.append('file', file)

        try {
            await api.post(`/daily-sessions/${sessionId}/material`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            setUploadSuccess(true)
            fetchSession() // Refresh session data
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to upload material')
        } finally {
            setUploading(false)
        }
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    if (loading) {
        return (
            <AuthGuard>
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            </AuthGuard>
        )
    }

    if (!session) {
        return (
            <AuthGuard>
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <div className="text-center">
                        <h2 className="text-xl font-medium text-gray-900">Session not found</h2>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="mt-4 text-indigo-600 hover:text-indigo-500"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </AuthGuard>
        )
    }

    const preparedImages = session.prepared_images ? JSON.parse(session.prepared_images) : []

    return (
        <AuthGuard>
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="text-gray-600 hover:text-gray-900 flex items-center mb-4"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Dashboard
                        </button>
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{session.title}</h1>
                                <p className="text-gray-600">{formatDate(session.date)}</p>
                            </div>
                            <button
                                onClick={() => router.push(`/record?daily_session_id=${session.id}`)}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                </svg>
                                Start Recording
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                            {error}
                        </div>
                    )}

                    {uploadSuccess && (
                        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
                            ✓ Course material uploaded successfully!
                        </div>
                    )}

                    {/* Course Material Upload Section */}
                    <div className="bg-white shadow rounded-lg p-6 mb-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Course Material</h2>

                        {session.course_material ? (
                            <div className="space-y-4">
                                <div className="flex items-center text-green-600 mb-4">
                                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    Material uploaded
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                        {session.course_material.slice(0, 500)}
                                        {session.course_material.length > 500 && '...'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <label className="cursor-pointer text-indigo-600 hover:text-indigo-500 text-sm font-medium">
                                        Replace material
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept=".txt,.pdf,.doc,.docx"
                                            onChange={handleFileUpload}
                                            disabled={uploading}
                                        />
                                    </label>
                                </div>
                            </div>
                        ) : (
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                <h3 className="mt-2 text-sm font-medium text-gray-900">Upload course material</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    Upload your lecture notes, syllabus, or slides to help AI generate better content
                                </p>
                                <label className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
                                    {uploading ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Uploading...
                                        </>
                                    ) : (
                                        'Choose file'
                                    )}
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept=".txt,.pdf,.doc,.docx"
                                        onChange={handleFileUpload}
                                        disabled={uploading}
                                    />
                                </label>
                                <p className="mt-2 text-xs text-gray-500">TXT, PDF, DOC, DOCX up to 10MB</p>
                            </div>
                        )}
                    </div>

                    {/* Prepared Images Section */}
                    {preparedImages.length > 0 && (
                        <div className="bg-white shadow rounded-lg p-6">
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Prepared Images</h2>
                            <p className="text-sm text-gray-600 mb-4">
                                AI has prepared these images based on your course material
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {preparedImages.map((img: string, index: number) => (
                                    <div key={index} className="relative rounded-lg overflow-hidden">
                                        <img src={img} alt={`Prepared image ${index + 1}`} className="w-full h-32 object-cover" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Info Box */}
                    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex">
                            <svg className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <div className="text-sm text-blue-700">
                                <p className="font-medium">How it works</p>
                                <p className="mt-1">
                                    Upload your course material before recording. Our AI will analyze it to generate
                                    more accurate slides and relevant images when you record your lecture.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthGuard>
    )
}
