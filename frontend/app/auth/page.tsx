'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { authAPI } from '@/lib/api'
import { BookOpen, GraduationCap, Loader2 } from 'lucide-react'

export default function AuthPage() {
    const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const { login } = useAuthStore()
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            let tokenData

            if (activeTab === 'signup') {
                if (password !== confirmPassword) {
                    setError('Passwords do not match')
                    setLoading(false)
                    return
                }
                tokenData = await authAPI.register(email, password)
            } else {
                tokenData = await authAPI.login(email, password)
            }

            useAuthStore.setState({ token: tokenData.access_token })
            const userData = await authAPI.getCurrentUser()
            login(tokenData.access_token, userData)
            router.push('/dashboard')
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Authentication failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-stone-50 to-slate-100">
            {/* === RICH BACKGROUND === */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -left-20 w-[600px] h-[600px] bg-teal-600/25 rounded-full blur-3xl"></div>
                <div className="absolute top-1/3 -right-40 w-[700px] h-[700px] bg-teal-700/20 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] bg-teal-600/20 rounded-full blur-3xl"></div>
                <div className="absolute top-20 left-1/4 w-[400px] h-[400px] bg-rose-500/25 rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 right-20 w-[450px] h-[450px] bg-rose-400/20 rounded-full blur-3xl"></div>
            </div>

            {/* Decorative Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-10 right-10 w-80 h-96 bg-white/40 backdrop-blur-sm border border-white/50 rounded-[50px] rotate-12 shadow-xl"></div>
                <div className="absolute -bottom-20 -left-10 w-72 h-80 bg-white/40 backdrop-blur-sm border border-white/50 rounded-[40px] -rotate-6 shadow-xl"></div>
                <div className="absolute top-1/3 right-1/4 w-40 h-40 bg-white/30 backdrop-blur-sm border border-white/40 rounded-full shadow-lg"></div>
            </div>

            {/* === MAIN CARD === */}
            <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-md">
                    <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-3xl shadow-2xl shadow-slate-900/10 p-10">

                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-20 h-20 mb-4">
                                <div className="relative">
                                    <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-xl shadow-teal-500/40">
                                        <BookOpen className="w-8 h-8 text-white" />
                                    </div>
                                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-rose-500 to-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-rose-500/40 rotate-12">
                                        <GraduationCap className="w-5 h-5 text-white" />
                                    </div>
                                </div>
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900">Welcome to EduSlides</h1>
                            <p className="text-slate-500 mt-1">Please enter your details.</p>
                        </div>

                        {/* Tab Switcher */}
                        <div className="mb-8">
                            <div className="bg-slate-100 border-2 border-slate-200 rounded-xl p-1.5 flex">
                                <button
                                    onClick={() => setActiveTab('signin')}
                                    className={`flex-1 py-3 px-6 rounded-lg text-sm font-bold transition-all duration-300 ${activeTab === 'signin'
                                        ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-lg shadow-teal-500/30'
                                        : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                >
                                    Sign In
                                </button>
                                <button
                                    onClick={() => setActiveTab('signup')}
                                    className={`flex-1 py-3 px-6 rounded-lg text-sm font-bold transition-all duration-300 ${activeTab === 'signup'
                                        ? 'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/30'
                                        : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                >
                                    Sign Up
                                </button>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="mb-6 p-4 bg-rose-50 border-2 border-rose-200 rounded-xl text-rose-700 text-sm text-center font-medium">
                                {error}
                            </div>
                        )}

                        {/* Auth Form */}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    School Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@university.edu"
                                    required
                                    className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                                />
                            </div>

                            {activeTab === 'signup' && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Confirm Password
                                    </label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                                    />
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-4 text-white rounded-xl font-bold shadow-xl transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2 ${activeTab === 'signin'
                                        ? 'bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 shadow-teal-500/30'
                                        : 'bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 shadow-rose-500/30'
                                    }`}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    activeTab === 'signin' ? 'Continue' : 'Create Account'
                                )}
                            </button>
                        </form>

                        {/* Back to Home */}
                        <div className="mt-6 text-center">
                            <Link
                                href="/"
                                className="text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors"
                            >
                                ← Back to Home
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
