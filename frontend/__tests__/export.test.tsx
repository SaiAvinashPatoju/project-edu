import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import ExportDialog from '@/components/export/ExportDialog'
import ExportStatus from '@/components/export/ExportStatus'
import { apiClient } from '@/lib/api-client'

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    startExport: vi.fn(),
    getExportStatus: vi.fn(),
    downloadExport: vi.fn()
  }
}))

// Mock URL.createObjectURL and revokeObjectURL
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'mock-url'),
    revokeObjectURL: vi.fn()
  }
})

describe('ExportDialog', () => {
  const mockProps = {
    sessionId: 1,
    sessionTitle: 'Test Lecture',
    isOpen: true,
    onClose: vi.fn(),
    onExportStarted: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders export dialog when open', () => {
    render(<ExportDialog {...mockProps} />)
    
    expect(screen.getByText('Export Presentation')).toBeInTheDocument()
    expect(screen.getByText('Export "Test Lecture" as:')).toBeInTheDocument()
    expect(screen.getByText('PDF Document')).toBeInTheDocument()
    expect(screen.getByText('PowerPoint Presentation')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<ExportDialog {...mockProps} isOpen={false} />)
    
    expect(screen.queryByText('Export Presentation')).not.toBeInTheDocument()
  })

  it('allows format selection', () => {
    render(<ExportDialog {...mockProps} />)
    
    const pdfRadio = screen.getByDisplayValue('pdf')
    const pptxRadio = screen.getByDisplayValue('pptx')
    
    expect(pdfRadio).toBeChecked()
    expect(pptxRadio).not.toBeChecked()
    
    fireEvent.click(pptxRadio)
    
    expect(pdfRadio).not.toBeChecked()
    expect(pptxRadio).toBeChecked()
  })

  it('starts export when button clicked', async () => {
    const mockStartExport = vi.mocked(apiClient.startExport)
    mockStartExport.mockResolvedValue({
      export_id: 123,
      status: 'pending',
      message: 'Export started'
    })

    render(<ExportDialog {...mockProps} />)
    
    const exportButton = screen.getByText('Start Export')
    fireEvent.click(exportButton)
    
    await waitFor(() => {
      expect(mockStartExport).toHaveBeenCalledWith(1, 'pdf')
      expect(mockProps.onExportStarted).toHaveBeenCalledWith(123, 'pdf')
      expect(mockProps.onClose).toHaveBeenCalled()
    })
  })

  it('handles export error', async () => {
    const mockStartExport = vi.mocked(apiClient.startExport)
    mockStartExport.mockRejectedValue(new Error('Export failed'))

    render(<ExportDialog {...mockProps} />)
    
    const exportButton = screen.getByText('Start Export')
    fireEvent.click(exportButton)
    
    await waitFor(() => {
      expect(screen.getByText('Export failed')).toBeInTheDocument()
    })
  })

  it('disables controls during export', async () => {
    const mockStartExport = vi.mocked(apiClient.startExport)
    mockStartExport.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<ExportDialog {...mockProps} />)
    
    const exportButton = screen.getByText('Start Export')
    fireEvent.click(exportButton)
    
    await waitFor(() => {
      expect(screen.getByText('Starting Export...')).toBeInTheDocument()
      expect(screen.getByDisplayValue('pdf')).toBeDisabled()
      expect(screen.getByDisplayValue('pptx')).toBeDisabled()
    })
  })

  it('closes dialog when cancel clicked', () => {
    render(<ExportDialog {...mockProps} />)
    
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)
    
    expect(mockProps.onClose).toHaveBeenCalled()
  })
})

describe('ExportStatus', () => {
  const mockProps = {
    exportId: 123,
    format: 'pdf',
    onComplete: vi.fn(),
    onError: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows pending status', async () => {
    const mockGetExportStatus = vi.mocked(apiClient.getExportStatus)
    mockGetExportStatus.mockResolvedValue({
      status: 'pending'
    })

    render(<ExportStatus {...mockProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('PDF Export')).toBeInTheDocument()
      expect(screen.getByText('Export queued...')).toBeInTheDocument()
    })
  })

  it('shows processing status', async () => {
    const mockGetExportStatus = vi.mocked(apiClient.getExportStatus)
    mockGetExportStatus.mockResolvedValue({
      status: 'processing'
    })

    render(<ExportStatus {...mockProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Generating PDF file...')).toBeInTheDocument()
    })
  })

  it('shows completed status with download button', async () => {
    const mockGetExportStatus = vi.mocked(apiClient.getExportStatus)
    mockGetExportStatus.mockResolvedValue({
      status: 'completed',
      download_url: '/download/123',
      expires_at: '2024-12-31T23:59:59Z'
    })

    render(<ExportStatus {...mockProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Export completed!')).toBeInTheDocument()
      expect(screen.getByText('Download')).toBeInTheDocument()
      expect(screen.getByText(/Download expires:/)).toBeInTheDocument()
    })
  })

  it('shows failed status with error', async () => {
    const mockGetExportStatus = vi.mocked(apiClient.getExportStatus)
    mockGetExportStatus.mockResolvedValue({
      status: 'failed',
      error: 'Export generation failed'
    })

    render(<ExportStatus {...mockProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Export failed')).toBeInTheDocument()
      expect(screen.getByText('Export generation failed')).toBeInTheDocument()
      expect(mockProps.onError).toHaveBeenCalledWith('Export generation failed')
    })
  })

  it('handles download click', async () => {
    const mockGetExportStatus = vi.mocked(apiClient.getExportStatus)
    const mockDownloadExport = vi.mocked(apiClient.downloadExport)
    
    mockGetExportStatus.mockResolvedValue({
      status: 'completed',
      download_url: '/download/123'
    })
    
    const mockBlob = new Blob(['test content'], { type: 'application/pdf' })
    mockDownloadExport.mockResolvedValue(mockBlob)

    render(<ExportStatus {...mockProps} />)
    
    await waitFor(() => {
      const downloadButton = screen.getByText('Download')
      fireEvent.click(downloadButton)
    })
    
    await waitFor(() => {
      expect(mockDownloadExport).toHaveBeenCalledWith(123)
    })
  })

  it('calls onComplete when export completes', async () => {
    const mockGetExportStatus = vi.mocked(apiClient.getExportStatus)
    mockGetExportStatus.mockResolvedValue({
      status: 'completed',
      download_url: '/download/123'
    })

    render(<ExportStatus {...mockProps} />)
    
    await waitFor(() => {
      expect(mockProps.onComplete).toHaveBeenCalled()
    })
  })

  it('polls status periodically', async () => {
    const mockGetExportStatus = vi.mocked(apiClient.getExportStatus)
    mockGetExportStatus
      .mockResolvedValueOnce({ status: 'pending' })
      .mockResolvedValueOnce({ status: 'processing' })
      .mockResolvedValueOnce({ status: 'completed', download_url: '/download/123' })

    render(<ExportStatus {...mockProps} />)
    
    // Wait for multiple polling cycles
    await waitFor(() => {
      expect(mockGetExportStatus).toHaveBeenCalledTimes(1)
    })
    
    // Fast-forward timers to trigger polling
    vi.advanceTimersByTime(2000)
    
    await waitFor(() => {
      expect(mockGetExportStatus).toHaveBeenCalledTimes(2)
    })
  })

  it('handles polling errors', async () => {
    const mockGetExportStatus = vi.mocked(apiClient.getExportStatus)
    mockGetExportStatus.mockRejectedValue(new Error('Network error'))

    render(<ExportStatus {...mockProps} />)
    
    await waitFor(() => {
      expect(mockProps.onError).toHaveBeenCalledWith('Network error')
    })
  })
})

describe('Export Integration', () => {
  it('handles complete export workflow', async () => {
    const mockStartExport = vi.mocked(apiClient.startExport)
    const mockGetExportStatus = vi.mocked(apiClient.getExportStatus)
    const mockDownloadExport = vi.mocked(apiClient.downloadExport)
    
    // Mock export start
    mockStartExport.mockResolvedValue({
      export_id: 123,
      status: 'pending',
      message: 'Export started'
    })
    
    // Mock status progression
    mockGetExportStatus
      .mockResolvedValueOnce({ status: 'pending' })
      .mockResolvedValueOnce({ status: 'processing' })
      .mockResolvedValueOnce({ 
        status: 'completed', 
        download_url: '/download/123',
        expires_at: '2024-12-31T23:59:59Z'
      })
    
    // Mock download
    const mockBlob = new Blob(['test content'], { type: 'application/pdf' })
    mockDownloadExport.mockResolvedValue(mockBlob)
    
    const onExportStarted = vi.fn()
    const onComplete = vi.fn()
    
    // Render export dialog
    const { rerender } = render(
      <ExportDialog
        sessionId={1}
        sessionTitle="Test Lecture"
        isOpen={true}
        onClose={vi.fn()}
        onExportStarted={onExportStarted}
      />
    )
    
    // Start export
    const exportButton = screen.getByText('Start Export')
    fireEvent.click(exportButton)
    
    await waitFor(() => {
      expect(onExportStarted).toHaveBeenCalledWith(123, 'pdf')
    })
    
    // Render export status
    rerender(
      <ExportStatus
        exportId={123}
        format="pdf"
        onComplete={onComplete}
        onError={vi.fn()}
      />
    )
    
    // Wait for completion
    await waitFor(() => {
      expect(screen.getByText('Export completed!')).toBeInTheDocument()
      expect(onComplete).toHaveBeenCalled()
    })
    
    // Test download
    const downloadButton = screen.getByText('Download')
    fireEvent.click(downloadButton)
    
    await waitFor(() => {
      expect(mockDownloadExport).toHaveBeenCalledWith(123)
    })
  })
})