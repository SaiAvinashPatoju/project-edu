import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import SessionList from '@/components/dashboard/SessionList'
import { apiClient } from '@/lib/api-client'

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    fetchSessions: vi.fn()
  }
}))

// Mock Next.js router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  })
}))

describe('SessionList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    vi.mocked(apiClient.fetchSessions).mockImplementation(() => new Promise(() => {}))
    
    render(<SessionList />)
    
    // Check for loading skeleton instead of text
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renders empty state when no sessions exist', async () => {
    vi.mocked(apiClient.fetchSessions).mockResolvedValue([])
    
    render(<SessionList />)
    
    await waitFor(() => {
      expect(screen.getByText('No lecture sessions')).toBeInTheDocument()
      expect(screen.getByText('Get started by creating your first lecture session.')).toBeInTheDocument()
    })
  })

  it('renders sessions list when sessions exist', async () => {
    const mockSessions = [
      {
        id: 1,
        title: 'Test Lecture 1',
        processing_status: 'completed' as const,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:30:00Z',
        audio_duration: 3600
      },
      {
        id: 2,
        title: 'Test Lecture 2',
        processing_status: 'processing' as const,
        created_at: '2024-01-02T10:00:00Z',
        updated_at: '2024-01-02T10:15:00Z',
        audio_duration: 1800
      }
    ]

    vi.mocked(apiClient.fetchSessions).mockResolvedValue(mockSessions)
    
    render(<SessionList />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Lecture 1')).toBeInTheDocument()
      expect(screen.getByText('Test Lecture 2')).toBeInTheDocument()
      expect(screen.getByText('completed')).toBeInTheDocument()
      expect(screen.getByText('processing')).toBeInTheDocument()
    })
  })

  it('handles session click for completed session', async () => {
    const mockSessions = [
      {
        id: 1,
        title: 'Completed Lecture',
        processing_status: 'completed' as const,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:30:00Z',
        audio_duration: 3600
      }
    ]

    vi.mocked(apiClient.fetchSessions).mockResolvedValue(mockSessions)
    
    render(<SessionList />)
    
    await waitFor(() => {
      const sessionCard = screen.getByText('Completed Lecture').closest('div')
      fireEvent.click(sessionCard!)
    })

    expect(mockPush).toHaveBeenCalledWith('/editor/1')
  })

  it('handles session click for processing session', async () => {
    const mockSessions = [
      {
        id: 2,
        title: 'Processing Lecture',
        processing_status: 'processing' as const,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:30:00Z',
        audio_duration: 1800
      }
    ]

    vi.mocked(apiClient.fetchSessions).mockResolvedValue(mockSessions)
    
    render(<SessionList />)
    
    await waitFor(() => {
      const sessionCard = screen.getByText('Processing Lecture').closest('div')
      fireEvent.click(sessionCard!)
    })

    expect(mockPush).toHaveBeenCalledWith('/processing/2')
  })

  it('displays error state when API call fails', async () => {
    vi.mocked(apiClient.fetchSessions).mockRejectedValue(new Error('API Error'))
    
    render(<SessionList />)
    
    await waitFor(() => {
      expect(screen.getByText('Error loading sessions')).toBeInTheDocument()
      expect(screen.getByText('API Error')).toBeInTheDocument()
    })
  })

  it('allows retry after error', async () => {
    vi.mocked(apiClient.fetchSessions)
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValue([])
    
    render(<SessionList />)
    
    await waitFor(() => {
      expect(screen.getByText('Error loading sessions')).toBeInTheDocument()
    })

    const retryButton = screen.getByText('Try again')
    fireEvent.click(retryButton)

    await waitFor(() => {
      expect(screen.getByText('No lecture sessions')).toBeInTheDocument()
    })
  })

  it('formats duration correctly', async () => {
    const mockSessions = [
      {
        id: 1,
        title: 'Test Lecture',
        processing_status: 'completed' as const,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:30:00Z',
        audio_duration: 3665 // 61 minutes and 5 seconds
      }
    ]

    vi.mocked(apiClient.fetchSessions).mockResolvedValue(mockSessions)
    
    render(<SessionList />)
    
    await waitFor(() => {
      expect(screen.getByText('Duration: 61:05')).toBeInTheDocument()
    })
  })

  it('shows appropriate status colors', async () => {
    const mockSessions = [
      {
        id: 1,
        title: 'Completed Lecture',
        processing_status: 'completed' as const,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:30:00Z'
      },
      {
        id: 2,
        title: 'Failed Lecture',
        processing_status: 'failed' as const,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:30:00Z'
      }
    ]

    vi.mocked(apiClient.fetchSessions).mockResolvedValue(mockSessions)
    
    render(<SessionList />)
    
    await waitFor(() => {
      const completedBadge = screen.getByText('completed')
      const failedBadge = screen.getByText('failed')
      
      expect(completedBadge).toHaveClass('bg-green-100', 'text-green-800')
      expect(failedBadge).toHaveClass('bg-red-100', 'text-red-800')
    })
  })
})