'use client'

import React, { useState } from 'react'
import { apiClient } from '@/lib/api-client'

interface ExportDialogProps {
  sessionId: number
  sessionTitle: string
  isOpen: boolean
  onClose: () => void
  onExportStarted: (exportId: number, format: string) => void
}

export default function ExportDialog({
  sessionId,
  sessionTitle,
  isOpen,
  onClose,
  onExportStarted
}: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'pptx'>('pdf')
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async () => {
    setIsExporting(true)
    setError(null)

    try {
      const response = await apiClient.startExport(sessionId, selectedFormat)
      onExportStarted(response.export_id, selectedFormat)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Export Presentation</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isExporting}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <p className="text-gray-600 mb-2">Export &quot;{sessionTitle}&quot; as:</p>
        </div>

        <div className="space-y-3 mb-6">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="format"
              value="pdf"
              checked={selectedFormat === 'pdf'}
              onChange={(e) => setSelectedFormat(e.target.value as 'pdf')}
              className="w-4 h-4 text-blue-600"
              disabled={isExporting}
            />
            <div>
              <div className="font-medium">PDF Document</div>
              <div className="text-sm text-gray-500">
                Non-editable document with each slide as a page
              </div>
            </div>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="format"
              value="pptx"
              checked={selectedFormat === 'pptx'}
              onChange={(e) => setSelectedFormat(e.target.value as 'pptx')}
              className="w-4 h-4 text-blue-600"
              disabled={isExporting}
            />
            <div>
              <div className="font-medium">PowerPoint Presentation</div>
              <div className="text-sm text-gray-500">
                Editable .pptx file with native PowerPoint slides
              </div>
            </div>
          </label>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isExporting && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            <span>{isExporting ? 'Starting Export...' : 'Start Export'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}