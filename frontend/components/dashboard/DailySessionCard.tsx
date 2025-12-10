'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

interface DailySession {
    id: number
    date: string
    title: string
    course_material: string | null
    prepared_images: string | null
    created_at: string
    updated_at: string
}

interface DailySessionCardProps {
    session: DailySession
    onDelete: () => void
}

export default function DailySessionCard({ session, onDelete }: DailySessionCardProps) {
    const router = useRouter()

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        })
    }

    const hasMaterial = !!session.course_material

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            {/* Date Badge */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2">
                <div className="flex items-center justify-between">
                    <span className="text-white font-medium">{formatDate(session.date)}</span>
                    {hasMaterial && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Material
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2 line-clamp-2">
                    {session.title}
                </h3>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 mt-4">
                    <button
                        onClick={() => router.push(`/record?daily_session_id=${session.id}`)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                    >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        Record
                    </button>
                    <button
                        onClick={() => router.push(`/daily-sessions/${session.id}`)}
                        className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Upload
                    </button>
                    <button
                        onClick={onDelete}
                        className="inline-flex items-center justify-center px-2 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-500 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    )
}
