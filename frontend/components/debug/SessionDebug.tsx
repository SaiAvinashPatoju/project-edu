'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/api-client'

interface SessionDebugProps {
  sessionId: number
}

export default function SessionDebug({ sessionId }: SessionDebugProps) {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testAPI = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('Testing API call for session:', sessionId)
      const data = await apiClient.fetchSessionWithSlides(sessionId)
      console.log('API Response:', data)
      setDebugInfo(data)
    } catch (err: any) {
      console.error('API Error:', err)
      setError(err.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 m-4">
      <h3 className="text-lg font-medium text-yellow-800 mb-4">Debug Session {sessionId}</h3>
      
      <button
        onClick={testAPI}
        disabled={loading}
        className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test API Call'}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded">
          <h4 className="font-medium text-red-800">Error:</h4>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {debugInfo && (
        <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded">
          <h4 className="font-medium text-green-800">Success! Session Data:</h4>
          <pre className="text-sm text-green-700 mt-2 overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}