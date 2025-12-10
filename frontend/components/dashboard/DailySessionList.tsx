'use client'

import React, { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import DailySessionCard from './DailySessionCard'

interface DailySession {
    id: number
    date: string
    title: string
    course_material: string | null
    prepared_images: string | null
    created_at: string
    updated_at: string
}

export default function DailySessionList() {
    const [sessions, setSessions] = useState<DailySession[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [newSessionTitle, setNewSessionTitle] = useState('')
    const [newSessionDate, setNewSessionDate] = useState('')
    const [creating, setCreating] = useState(false)

    useEffect(() => {
        fetchSessions()
    }, [])

    const fetchSessions = async () => {
        try {
            const response = await api.get('/daily-sessions')
            setSessions(response.data)
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to load sessions')
        } finally {
            setLoading(false)
        }
    }

    const handleCreateSession = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newSessionTitle.trim() || !newSessionDate) return

        setCreating(true)
        try {
            const response = await api.post('/daily-sessions', {
                title: newSessionTitle.trim(),
                date: newSessionDate
            })
            setSessions([response.data, ...sessions])
            setNewSessionTitle('')
            setNewSessionDate('')
            setShowCreateForm(false)
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to create session')
        } finally {
            setCreating(false)
        }
    }

    const handleDeleteSession = async (sessionId: number) => {
        try {
            await api.delete(`/daily-sessions/${sessionId}`)
            setSessions(sessions.filter(s => s.id !== sessionId))
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to delete session')
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        )
    }

    return (
        <div>
            {/* Header with Create Button */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-gray-900">Your Daily Sessions</h2>
                <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Session
                </button>
            </div>

            {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                    {error}
                    <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">×</button>
                </div>
            )}

            {/* Create Form */}
            {showCreateForm && (
                <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <form onSubmit={handleCreateSession} className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                                Session Title
                            </label>
                            <input
                                type="text"
                                id="title"
                                value={newSessionTitle}
                                onChange={(e) => setNewSessionTitle(e.target.value)}
                                placeholder="e.g., Introduction to Machine Learning"
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                required
                            />
                        </div>
                        <div className="sm:w-48">
                            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                                Date
                            </label>
                            <input
                                type="date"
                                id="date"
                                value={newSessionDate}
                                onChange={(e) => setNewSessionDate(e.target.value)}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                required
                            />
                        </div>
                        <div className="flex items-end gap-2">
                            <button
                                type="submit"
                                disabled={creating}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
                            >
                                {creating ? 'Creating...' : 'Create'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowCreateForm(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Sessions Grid */}
            {sessions.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No sessions yet</h3>
                    <p className="mt-1 text-sm text-gray-500">Create a daily session to organize your lectures by date.</p>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                        Create your first session
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sessions.map((session) => (
                        <DailySessionCard
                            key={session.id}
                            session={session}
                            onDelete={() => handleDeleteSession(session.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
