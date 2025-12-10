'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { api } from '@/lib/api'

export default function GuestLoginForm() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [isRegisteredError, setIsRegisteredError] = useState(false)

    const router = useRouter()
    const { login } = useAuthStore()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsRegisteredError(false)
        setLoading(true)

        try {
            const response = await api.post('/auth/guest', { email })
            const { access_token, expires_at } = response.data

            // Store token and user info
            login(access_token, {
                id: 0,
                email,
                is_active: true,
                created_at: new Date().toISOString()
            })

            // Store guest session info separately
            localStorage.setItem('guest_session', JSON.stringify({
                is_guest: true,
                expires_at
            }))

            // Redirect to guest recording page
            router.push('/guest-record')
        } catch (err: any) {
            const errorMessage = err.response?.data?.detail || 'Guest login failed'

            // Check if email is already registered
            if (errorMessage.includes('registered') || err.response?.status === 400) {
                setError('This email is already registered.')
                setIsRegisteredError(true)
            } else {
                setError(errorMessage)
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
                    <div className="text-center mb-8">
                        <div className="mx-auto w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-extrabold text-white">
                            Try as Guest
                        </h2>
                        <p className="mt-2 text-sm text-gray-300">
                            Quick 10-minute demo session
                        </p>
                    </div>

                    {/* Warning Banner */}
                    <div className="mb-6 bg-amber-500/20 border border-amber-400/30 rounded-lg p-4">
                        <div className="flex">
                            <svg className="h-5 w-5 text-amber-400 mr-2 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <div className="text-sm text-amber-200">
                                <p className="font-medium">Session expires in 10 minutes</p>
                                <p className="mt-1 text-amber-300/80">Your data will be deleted after expiry</p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/20 border border-red-400/30 text-red-200 px-4 py-3 rounded-lg">
                                <p>{error}</p>
                                {isRegisteredError && (
                                    <button
                                        type="button"
                                        onClick={() => router.push('/login')}
                                        className="mt-3 w-full py-2 px-4 bg-white text-indigo-600 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        Sign In Instead
                                    </button>
                                )}
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="appearance-none relative block w-full px-4 py-3 bg-white/10 border border-white/20 placeholder-gray-400 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                                placeholder="your-email@example.com"
                            />
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-pink-500/25"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Starting session...
                                    </>
                                ) : (
                                    'Start Demo Session'
                                )}
                            </button>
                        </div>

                        <div className="text-center space-y-3">
                            <span className="text-sm text-gray-300">
                                Have a .edu email?{' '}
                                <a href="/register" className="font-medium text-pink-400 hover:text-pink-300 transition-colors">
                                    Create full account
                                </a>
                            </span>
                            <div>
                                <a href="/login" className="text-sm text-gray-400 hover:text-gray-300 transition-colors">
                                    Already have an account? Sign in
                                </a>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
