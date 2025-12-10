'use client'

import React, { useState, useEffect } from 'react'
import { apiClient, ExportStatusResponse } from '@/lib/api-client'

interface ExportStatusProps {
  exportId: number
  format: string
  onComplete?: () => void
  onError?: (error: string) => void
}

export default function ExportStatus({ exportId, format, onComplete, onError }: ExportStatusProps) {
  const [status, setStatus] = useState<ExportStatusResponse | null>(null)
  const [isPolling, setIsPolling] = useState(true)

  useEffect(() => {
    let intervalId: NodeJS.Timeout

    const pollStatus = async () => {
      try {
        const statusResponse = await apiClient.getExportStatus(exportId)
        setStatus(statusResponse)

        if (statusResponse.status === 'completed') {
          setIsPolling(false)
          onComplete?.()
        } else if (statusResponse.status === 'failed') {
          setIsPolling(false)
          onError?.(statusResponse.error || 'Export failed')
        }
      } catch (err) {
        console.error('Failed to get export status:', err)
        setIsPolling(false)
        onError?.(err instanceof Error ? err.message : 'Failed to check export status')
      }
    }

    if (isPolling) {
      // Poll immediately, then every 2 seconds
      pollStatus()
      intervalId = setInterval(pollStatus, 2000)
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [exportId, isPolling, onComplete, onError])

  const handleDownload = async () => {
    if (status?.download_url) {
      try {
        const blob = await apiClient.downloadExport(exportId)
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `lecture.${format}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      } catch (error) {
        console.error('Download failed:', error)
        // Could show an error message to the user
      }
    }
  }

  const getStatusIcon = () => {
    switch (status?.status) {
      case 'pending':
        return (
          <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )
      case 'processing':
        return (
          <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )
      case 'completed':
        return (
          <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'failed':
        return (
          <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      default:
        return null
    }
  }

  const getStatusText = () => {
    switch (status?.status) {
      case 'pending':
        return 'Export queued...'
      case 'processing':
        return `Generating ${format.toUpperCase()} file...`
      case 'completed':
        return 'Export completed!'
      case 'failed':
        return 'Export failed'
      default:
        return 'Checking status...'
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <p className="font-medium">{format.toUpperCase()} Export</p>
            <p className="text-sm text-gray-600">{getStatusText()}</p>
          </div>
        </div>

        {status?.status === 'completed' && (
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Download</span>
          </button>
        )}
      </div>

      {status?.expires_at && status.status === 'completed' && (
        <p className="text-xs text-gray-500 mt-2">
          Download expires: {new Date(status.expires_at).toLocaleDateString()}
        </p>
      )}

      {status?.error && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
          <p className="text-red-600 text-sm">{status.error}</p>
        </div>
      )}
    </div>
  )
}