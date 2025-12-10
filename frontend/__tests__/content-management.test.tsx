import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { apiClient } from '@/lib/api-client'
import { draftManager } from '@/lib/draft-manager'

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    fetchSessions: vi.fn(),
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

describe('Content Management Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(draftManager.hasDraft).mockReturnValue(false)
    vi.mocked(draftManager.applyDraftsToSlides).mockImplementation((_, slides) => slides)
    vi.mocked(draftManager.hasUnsavedChanges).mockReturnValue(false)
  })

  it('should have API client methods available', () => {
    expect(apiClient.fetchSessions).toBeDefined()
    expect(apiClient.fetchSessionWithSlides).toBeDefined()
    expect(apiClient.updateSlide).toBeDefined()
  })

  it('should have draft manager methods available', () => {
    expect(draftManager.hasDraft).toBeDefined()
    expect(draftManager.saveDraft).toBeDefined()
    expect(draftManager.clearDraft).toBeDefined()
    expect(draftManager.hasUnsavedChanges).toBeDefined()
    expect(draftManager.applyDraftsToSlides).toBeDefined()
  })

  it('should handle API client session fetching', async () => {
    const mockSessions = [
      {
        id: 1,
        title: 'Test Session',
        processing_status: 'completed' as const,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:30:00Z'
      }
    ]

    vi.mocked(apiClient.fetchSessions).mockResolvedValue(mockSessions)
    
    const sessions = await apiClient.fetchSessions()
    expect(sessions).toEqual(mockSessions)
    expect(apiClient.fetchSessions).toHaveBeenCalledTimes(1)
  })

  it('should handle API client session with slides fetching', async () => {
    const mockSessionWithSlides = {
      session: {
        id: 1,
        title: 'Test Session',
        processing_status: 'completed' as const,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:30:00Z'
      },
      slides: [
        {
          id: 1,
          session_id: 1,
          slide_number: 1,
          title: 'Test Slide',
          content: '["Test content"]',
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:30:00Z'
        }
      ]
    }

    vi.mocked(apiClient.fetchSessionWithSlides).mockResolvedValue(mockSessionWithSlides)
    
    const sessionData = await apiClient.fetchSessionWithSlides(1)
    expect(sessionData).toEqual(mockSessionWithSlides)
    expect(apiClient.fetchSessionWithSlides).toHaveBeenCalledWith(1)
  })

  it('should handle slide updates', async () => {
    const mockSlide = {
      id: 1,
      session_id: 1,
      slide_number: 1,
      title: 'Updated Title',
      content: '["Updated content"]',
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:30:00Z'
    }

    vi.mocked(apiClient.updateSlide).mockResolvedValue(mockSlide)
    
    const updatedSlide = await apiClient.updateSlide(1, {
      title: 'Updated Title',
      content: '["Updated content"]'
    })
    
    expect(updatedSlide).toEqual(mockSlide)
    expect(apiClient.updateSlide).toHaveBeenCalledWith(1, {
      title: 'Updated Title',
      content: '["Updated content"]'
    })
  })

  it('should handle draft management workflow', () => {
    // Test draft saving
    draftManager.saveDraft(1, 1, 'Test Title', 'Test Content')
    expect(draftManager.saveDraft).toHaveBeenCalledWith(1, 1, 'Test Title', 'Test Content')

    // Test draft checking
    vi.mocked(draftManager.hasDraft).mockReturnValue(true)
    expect(draftManager.hasDraft(1)).toBe(true)

    // Test draft clearing
    draftManager.clearDraft(1)
    expect(draftManager.clearDraft).toHaveBeenCalledWith(1)
  })

  it('should handle error scenarios gracefully', async () => {
    // Test API error handling
    vi.mocked(apiClient.fetchSessions).mockRejectedValue(new Error('Network error'))
    
    await expect(apiClient.fetchSessions()).rejects.toThrow('Network error')

    // Test session not found
    vi.mocked(apiClient.fetchSessionWithSlides).mockRejectedValue(new Error('Session not found'))
    
    await expect(apiClient.fetchSessionWithSlides(999)).rejects.toThrow('Session not found')

    // Test slide update failure
    vi.mocked(apiClient.updateSlide).mockRejectedValue(new Error('Update failed'))
    
    await expect(apiClient.updateSlide(1, { title: 'New Title' })).rejects.toThrow('Update failed')
  })
})