'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthGuard from '@/components/auth/AuthGuard'
import { apiClient, LectureSession } from '@/lib/api-client'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import {
  Search, Bell, Zap, Clock, Eye, FileEdit, Trash2, ChevronRight,
  BookOpen, Layers, Timer, Mic, Plus, Upload, Calendar
} from 'lucide-react'

interface DailySession {
  id: number
  date: string
  title: string
  course_material: string | null
  prepared_images: string | null
  created_at: string
  updated_at: string
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [sessions, setSessions] = useState<LectureSession[]>([])
  const [dailySessions, setDailySessions] = useState<DailySession[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewSessionForm, setShowNewSessionForm] = useState(false)
  const [newSessionTitle, setNewSessionTitle] = useState('')
  const [newSessionDate, setNewSessionDate] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [lecturesData, dailyData] = await Promise.all([
        apiClient.fetchSessions(),
        api.get('/daily-sessions')
      ])
      setSessions(lecturesData)
      setDailySessions(dailyData.data)
    } catch (err) {
      console.error('Failed to load data:', err)
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
      setDailySessions([response.data, ...dailySessions])
      setNewSessionTitle('')
      setNewSessionDate('')
      setShowNewSessionForm(false)
    } catch (err) {
      console.error('Failed to create session:', err)
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteDailySession = async (sessionId: number) => {
    try {
      await api.delete(`/daily-sessions/${sessionId}`)
      setDailySessions(dailySessions.filter(s => s.id !== sessionId))
    } catch (err) {
      console.error('Failed to delete session:', err)
    }
  }

  const handleDeleteLecture = async (sessionId: number) => {
    try {
      await apiClient.deleteLectureSession(sessionId)
      setSessions(sessions.filter(s => s.id !== sessionId))
    } catch (err) {
      console.error('Failed to delete lecture:', err)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Stats
  const totalLectures = sessions.length
  const totalSlides = sessions.filter(s => s.processing_status === 'completed').length * 8
  const timeSaved = Math.round(totalLectures * 2)

  return (
    <AuthGuard>
      <div className="space-y-6">

        {/* === SOLID HEADER === */}
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-lg shadow-slate-900/5 p-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>

          <div className="flex items-center gap-4">
            {/* Search Bar */}
            <div className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-400 w-40"
              />
            </div>

            {/* Notification Bell */}
            <button className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors">
              <Bell className="w-5 h-5" />
            </button>

            {/* Mobile menu */}
            <div className="lg:hidden flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">{user?.email?.split('@')[0]}</span>
            </div>
          </div>
        </div>

        {/* === HERO BANNER === */}
        <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 rounded-3xl shadow-2xl shadow-teal-900/30 p-8 flex flex-col lg:flex-row items-center justify-between gap-6 relative overflow-hidden">
          {/* Decorative pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-rose-400/20 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
          </div>

          <div className="flex-1 relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
              Hello, {user?.email?.split('@')[0] || 'Professor'}!
            </h2>
            <p className="text-teal-100 text-lg mb-6">
              System status: <span className="text-green-300 font-semibold">● Ready to record</span>
            </p>

            <Link
              href="/record"
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-teal-700 px-8 py-4 rounded-full font-bold shadow-xl shadow-black/20 transition-all duration-300 hover:-translate-y-1"
            >
              <Zap className="w-5 h-5" />
              Start New Recording
            </Link>
          </div>

          {/* 3D Illustration */}
          <div className="w-48 h-48 md:w-64 md:h-64 relative z-10">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm rounded-3xl border border-white/20 flex items-center justify-center">
              <div className="relative">
                <div className="w-28 h-36 bg-white rounded-2xl shadow-2xl flex flex-col items-center justify-center p-4">
                  <div className="w-20 h-4 bg-gradient-to-r from-teal-400 to-teal-500 rounded-full mb-3"></div>
                  <div className="w-16 h-2 bg-slate-200 rounded mb-2"></div>
                  <div className="w-14 h-2 bg-slate-200 rounded mb-2"></div>
                  <div className="w-18 h-2 bg-slate-200 rounded mb-4"></div>
                  <div className="flex gap-2">
                    <div className="w-8 h-6 bg-teal-50 rounded border border-teal-200"></div>
                    <div className="w-8 h-6 bg-rose-50 rounded border border-rose-200"></div>
                  </div>
                </div>
                <div className="absolute -bottom-3 -left-5 w-12 h-12 bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-xl shadow-rose-500/50">
                  <Mic className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* === QUICK STATS ROW === */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Lectures */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-lg shadow-slate-900/5 p-6 flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/30">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-4xl font-bold text-slate-900">{totalLectures}</p>
              <p className="text-slate-500 font-medium">Total Lectures</p>
            </div>
          </div>

          {/* Slides Generated */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-lg shadow-slate-900/5 p-6 flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/30">
              <Layers className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-4xl font-bold text-slate-900">{totalSlides}</p>
              <p className="text-slate-500 font-medium">Slides Generated</p>
            </div>
          </div>

          {/* Time Saved */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-lg shadow-slate-900/5 p-6 flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Timer className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-4xl font-bold text-slate-900">{timeSaved}h</p>
              <p className="text-slate-500 font-medium">Time Saved</p>
            </div>
          </div>
        </div>

        {/* === DAILY SESSIONS === */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-slate-900">Your Daily Sessions</h3>
            <button
              onClick={() => setShowNewSessionForm(!showNewSessionForm)}
              className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-teal-500/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              New Session
            </button>
          </div>

          {/* New Session Form */}
          {showNewSessionForm && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-4 mb-4">
              <form onSubmit={handleCreateSession} className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  value={newSessionTitle}
                  onChange={(e) => setNewSessionTitle(e.target.value)}
                  placeholder="Session title..."
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
                <input
                  type="date"
                  value={newSessionDate}
                  onChange={(e) => setNewSessionDate(e.target.value)}
                  className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl font-medium disabled:opacity-50 shadow-md"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </form>
            </div>
          )}

          {/* Daily Sessions Grid */}
          {dailySessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dailySessions.map((session) => (
                <div key={session.id} className="bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-4 py-2.5 text-white text-sm font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {formatDate(session.date)}
                  </div>
                  <div className="p-4">
                    <h4 className="font-bold text-slate-900 mb-4 text-lg">{session.title}</h4>
                    <div className="flex items-center gap-2">
                      <Link
                        href="/record"
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md shadow-rose-500/30 transition-all"
                      >
                        <Mic className="w-4 h-4" />
                        Record
                      </Link>
                      <button className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
                        <Upload className="w-4 h-4" />
                        Upload
                      </button>
                      <button
                        onClick={() => handleDeleteDailySession(session.id)}
                        className="p-2.5 bg-slate-100 hover:bg-rose-100 border border-slate-200 text-slate-500 hover:text-rose-500 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-8 text-center">
              <p className="text-slate-600">No daily sessions yet. Create one to start organizing your lectures!</p>
            </div>
          )}
        </div>

        {/* === RECENT LECTURES === */}
        <div>
          <h3 className="text-xl font-bold text-slate-900 mb-4">All Lecture Recordings</h3>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-2xl shadow p-4 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="w-48 h-4 bg-slate-200 rounded mb-2"></div>
                      <div className="w-32 h-3 bg-slate-200 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-white border border-slate-200 rounded-2xl shadow-lg p-4 flex items-center gap-4 hover:shadow-xl hover:border-slate-300 transition-all cursor-pointer"
                  onClick={() => {
                    if (session.processing_status === 'completed') {
                      router.push(`/editor/${session.id}`)
                    }
                  }}
                >
                  {/* Status Dot */}
                  <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center">
                    <div className={`w-4 h-4 rounded-full shadow-lg ${session.processing_status === 'completed' ? 'bg-green-500 shadow-green-500/50' :
                      session.processing_status === 'processing' ? 'bg-amber-500 shadow-amber-500/50 animate-pulse' :
                        session.processing_status === 'failed' ? 'bg-red-500 shadow-red-500/50' :
                          'bg-blue-500 shadow-blue-500/50'
                      }`}></div>
                  </div>

                  {/* Session Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 truncate text-lg">{session.title}</h4>
                    <p className="text-sm text-slate-500">
                      Created {new Date(session.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                    {session.processing_status === 'completed' && (
                      <p className="text-sm text-green-600 font-medium mt-1">Ready to edit • Click to open</p>
                    )}
                  </div>

                  {/* Duration */}
                  <div className="hidden sm:flex items-center gap-1 text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">{formatDuration(session.audio_duration)}</span>
                  </div>

                  {/* Status Badge */}
                  <span className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide ${session.processing_status === 'completed'
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : session.processing_status === 'processing'
                      ? 'bg-amber-100 text-amber-700 border border-amber-200'
                      : session.processing_status === 'failed'
                        ? 'bg-red-100 text-red-700 border border-red-200'
                        : 'bg-blue-100 text-blue-700 border border-blue-200'
                    }`}>
                    {session.processing_status}
                  </span>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {session.processing_status === 'completed' && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/editor/${session.id}`) }}
                          className="p-2.5 bg-slate-100 hover:bg-teal-100 border border-slate-200 rounded-xl text-slate-600 hover:text-teal-600 transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/editor/${session.id}`) }}
                          className="p-2.5 bg-slate-100 hover:bg-teal-100 border border-slate-200 rounded-xl text-slate-600 hover:text-teal-600 transition-colors"
                          title="Edit"
                        >
                          <FileEdit className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteLecture(session.id) }}
                      className="p-2.5 bg-slate-100 hover:bg-rose-100 border border-slate-200 rounded-xl text-slate-600 hover:text-rose-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-12 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-500/30">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-2">No lectures yet</h4>
              <p className="text-slate-500 mb-6">Start recording your first lecture to generate slides!</p>
              <Link
                href="/record"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-rose-500/30"
              >
                <Mic className="w-5 h-5" />
                Start Recording
              </Link>
            </div>
          )}
        </div>

      </div>
    </AuthGuard>
  )
}