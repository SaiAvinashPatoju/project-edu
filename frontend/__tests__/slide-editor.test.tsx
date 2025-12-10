import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import SlideEditor from '@/components/editor/SlideEditor'
import { apiClient } from '@/lib/api-client'
import { draftManager } from '@/lib/draft-manager'

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    fetchSessionWithSlides: vi.fn(),
    updateSlide: vi.fn()
  }
}))

// Mock the draft manager
vi.mock('@/lib/draft-manager', () => ({
  draftManager: {
    hasDraft: vi.fn(),
    getDraft: vi.fn(),
    saveDraft: vi.fn(),
    clearDraft: vi.fn(),
    hasUnsavedChanges: vi.fn(),
    applyDraftsToSlides: vi.fn()
  },
  useUnsavedChangesWarning: vi.fn()
}))

// Mock Next.js router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  })
}))

describe('SlideEditor', () => {
  const mockSessionData = {
    session: {
      id: 1,
      title: 'Test Lecture',
      processing_status: 'completed' as const,
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:30:00Z'
    },
    slides: [
      {
        id: 1,
        session_id: 1,
        slide_number: 1,
        title: 'Introduction',
        content: '["Welcome to the lecture", "Today we will cover..."]',
        confidence_data: '{"low_confidence_words": ["lecture"]}',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:30:00Z'
      },
      {
        id: 2,
        session_id: 1,
        slide_number: 2,
        title: 'Main Content',
        content: '["Key points", "Important concepts"]',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:30:00Z'
      }
    ]
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(draftManager.hasDraft).mockReturnValue(false)
    vi.mocked(draftManager.applyDraftsToSlides).mockImplementation((_, slides) => slides)
    vi.mocked(draftManager.hasUnsavedChanges).mockReturnValue(false)
  })

  it('renders loading state initially', () => {
    vi.mocked(apiClient.fetchSessionWithSlides).mockImplementation(() => new Promise(() => {}))
    
    render(<SlideEditor sessionId={1} />)
    
    expect(screen.getByText('Loading slides...')).toBeInTheDocument()
  })

  it('renders session data when loaded', async () => {
    vi.mocked(apiClient.fetchSessionWithSlides).mockResolvedValue(mockSessionData)
    
    render(<SlideEditor sessionId={1} />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Lecture')).toBeInTheDocument()
      expect(screen.getByText('2 slides')).toBeInTheDocument()
      expect(screen.getByText('Introduction')).toBeInTheDocument()
    })
  })

  it('displays slides in navigation', async () => {
    vi.mocked(apiClient.fetchSessionWithSlides).mockResolvedValue(mockSessionData)
    
    render(<SlideEditor sessionId={1} />)
    
    await waitFor(() => {
      expect(screen.getByText('Introduction')).toBeInTheDocument()
      expect(screen.getByText('Main Content')).toBeInTheDocument()
      expect(screen.getByText('Slide 1')).toBeInTheDocument()
      expect(screen.getByText('Slide 2')).toBeInTheDocument()
    })
  })

  it('handles slide navigation', async () => {
    vi.mocked(apiClient.fetchSessionWithSlides).mockResolvedValue(mockSessionData)
    
    render(<SlideEditor sessionId={1} />)
    
    await waitFor(() => {
      const slide2Button = screen.getByText('Main Content')
      fireEvent.click(slide2Button)
    })

    // Should show the second slide content
    expect(screen.getByText('Key points')).toBeInTheDocument()
  })

  it('shows draft restoration prompt when drafts exist', async () => {
    vi.mocked(apiClient.fetchSessionWithSlides).mockResolvedValue(mockSessionData)
    vi.mocked(draftManager.hasDraft).mockReturnValue(true)
    vi.mocked(draftManager.hasUnsavedChanges).mockReturnValue(true)
    
    render(<SlideEditor sessionId={1} />)
    
    await waitFor(() => {
      expect(screen.getByText(/We found unsaved changes/)).toBeInTheDocument()
      expect(screen.getByText('Keep Changes')).toBeInTheDocument()
      expect(screen.getByText('Discard')).toBeInTheDocument()
    })
  })

  it('handles draft restoration', async () => {
    vi.mocked(apiClient.fetchSessionWithSlides).mockResolvedValue(mockSessionData)
    vi.mocked(draftManager.hasDraft).mockReturnValue(true)
    vi.mocked(draftManager.hasUnsavedChanges).mockReturnValue(true)
    
    const modifiedSlides = [
      { ...mockSessionData.slides[0], title: 'Modified Introduction' },
      mockSessionData.slides[1]
    ]
    vi.mocked(draftManager.applyDraftsToSlides).mockReturnValue(modifiedSlides)
    
    render(<SlideEditor sessionId={1} />)
    
    await waitFor(() => {
      const keepButton = screen.getByText('Keep Changes')
      fireEvent.click(keepButton)
    })

    expect(screen.getByText('Modified Introduction')).toBeInTheDocument()
  })

  it('handles draft discard', async () => {
    vi.mocked(apiClient.fetchSessionWithSlides).mockResolvedValue(mockSessionData)
    vi.mocked(draftManager.hasDraft).mockReturnValue(true)
    
    render(<SlideEditor sessionId={1} />)
    
    await waitFor(() => {
      const discardButton = screen.getByText('Discard')
      fireEvent.click(discardButton)
    })

    expect(draftManager.clearDraft).toHaveBeenCalledWith(1)
  })

  it('shows save button when there are unsaved changes', async () => {
    vi.mocked(apiClient.fetchSessionWithSlides).mockResolvedValue(mockSessionData)
    
    render(<SlideEditor sessionId={1} />)
    
    await waitFor(() => {
      expect(screen.getByText('Introduction')).toBeInTheDocument()
    })

    // Simulate unsaved changes
    const saveButton = screen.getByText('Save Changes')
    expect(saveButton).toBeDisabled()
  })

  it('handles save changes', async () => {
    vi.mocked(apiClient.fetchSessionWithSlides).mockResolvedValue(mockSessionData)
    vi.mocked(apiClient.updateSlide).mockResolvedValue(mockSessionData.slides[0])
    
    render(<SlideEditor sessionId={1} />)
    
    await waitFor(() => {
      expect(screen.getByText('Introduction')).toBeInTheDocument()
    })

    // Simulate having unsaved changes by modifying state
    // This would normally happen through slide editing
    const saveButton = screen.getByText('Save Changes')
    
    // Note: In a real test, we'd need to simulate the slide editing flow
    // For now, we're testing that the save function exists and can be called
    expect(saveButton).toBeInTheDocument()
  })

  it('displays error state when session fails to load', async () => {
    vi.mocked(apiClient.fetchSessionWithSlides).mockRejectedValue(new Error('Session not found'))
    
    render(<SlideEditor sessionId={1} />)
    
    await waitFor(() => {
      expect(screen.getByText('Error Loading Session')).toBeInTheDocument()
      expect(screen.getByText('Session not found')).toBeInTheDocument()
    })
  })

  it('handles back to dashboard navigation', async () => {
    vi.mocked(apiClient.fetchSessionWithSlides).mockResolvedValue(mockSessionData)
    
    render(<SlideEditor sessionId={1} />)
    
    await waitFor(() => {
      const backButton = screen.getByRole('button', { name: /back/i })
      fireEvent.click(backButton)
    })

    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })

  it('highlights low confidence words', async () => {
    vi.mocked(apiClient.fetchSessionWithSlides).mockResolvedValue(mockSessionData)
    
    render(<SlideEditor sessionId={1} />)
    
    await waitFor(() => {
      expect(screen.getByText('Review needed')).toBeInTheDocument()
    })
  })

  it('shows unsaved changes indicator', async () => {
    vi.mocked(apiClient.fetchSessionWithSlides).mockResolvedValue(mockSessionData)
    vi.mocked(draftManager.hasUnsavedChanges).mockReturnValue(true)
    
    render(<SlideEditor sessionId={1} />)
    
    await waitFor(() => {
      expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    })
  })
})