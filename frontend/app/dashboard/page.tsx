'use client'

import AuthGuard from '@/components/auth/AuthGuard'
import SessionList from '@/components/dashboard/SessionList'
import DailySessionList from '@/components/dashboard/DailySessionList'
import { useAuthStore } from '@/lib/auth-store'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const { user, logout } = useAuthStore()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.email}</span>
              <button
                onClick={() => router.push('/record')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Quick Record
              </button>
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>

          <div className="py-8 space-y-8">
            {/* Daily Sessions Section */}
            <div>
              <DailySessionList />
            </div>

            {/* Lecture History Section */}
            <div className="border-t border-gray-200 pt-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">All Lecture Recordings</h2>
              <SessionList />
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}