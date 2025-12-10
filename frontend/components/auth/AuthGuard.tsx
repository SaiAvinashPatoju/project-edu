'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { authAPI } from '@/lib/api'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [loading, setLoading] = useState(true)
  const { isAuthenticated, token, setUser, logout } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      if (!token) {
        router.push('/login')
        return
      }

      try {
        // Verify token is still valid by fetching user data
        const userData = await authAPI.getCurrentUser()
        setUser(userData)
        setLoading(false)
      } catch (error) {
        // Token is invalid, logout and redirect
        logout()
        router.push('/login')
      }
    }

    checkAuth()
  }, [token, router, setUser, logout])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Will redirect to login
  }

  return <>{children}</>
}