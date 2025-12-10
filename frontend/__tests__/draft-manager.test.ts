import { describe, it, expect, beforeEach, vi } from 'vitest'
import { draftManager } from '@/lib/draft-manager'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('DraftManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('saveDraft', () => {
    it('saves a new draft to localStorage', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      draftManager.saveDraft(1, 1, 'Test Title', 'Test Content')
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'lecture-draft-1',
        expect.stringContaining('"sessionId":1')
      )
    })

    it('updates existing draft in localStorage', () => {
      const existingDraft = {
        sessionId: 1,
        slides: {
          1: {
            slideId: 1,
            title: 'Old Title',
            content: 'Old Content',
            lastSaved: '2024-01-01T10:00:00.000Z'
          }
        },
        lastModified: '2024-01-01T10:00:00.000Z'
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingDraft))
      
      draftManager.saveDraft(1, 1, 'New Title', 'New Content')
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'lecture-draft-1',
        expect.stringContaining('"title":"New Title"')
      )
    })

    it('handles localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error')
      })
      
      // Should not throw
      expect(() => {
        draftManager.saveDraft(1, 1, 'Test Title', 'Test Content')
      }).not.toThrow()
    })
  })

  describe('getDraft', () => {
    it('returns null when no draft exists', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      const result = draftManager.getDraft(1)
      
      expect(result).toBeNull()
    })

    it('returns parsed draft when it exists', () => {
      const draft = {
        sessionId: 1,
        slides: {
          1: {
            slideId: 1,
            title: 'Test Title',
            content: 'Test Content',
            lastSaved: '2024-01-01T10:00:00.000Z'
          }
        },
        lastModified: '2024-01-01T10:00:00.000Z'
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(draft))
      
      const result = draftManager.getDraft(1)
      
      expect(result).toEqual(draft)
    })

    it('handles JSON parse errors gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json')
      
      const result = draftManager.getDraft(1)
      
      expect(result).toBeNull()
    })
  })

  describe('getSlideDraft', () => {
    it('returns slide draft when it exists', () => {
      const draft = {
        sessionId: 1,
        slides: {
          1: {
            slideId: 1,
            title: 'Test Title',
            content: 'Test Content',
            lastSaved: '2024-01-01T10:00:00.000Z'
          }
        },
        lastModified: '2024-01-01T10:00:00.000Z'
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(draft))
      
      const result = draftManager.getSlideDraft(1, 1)
      
      expect(result).toEqual(draft.slides[1])
    })

    it('returns null when slide draft does not exist', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      const result = draftManager.getSlideDraft(1, 1)
      
      expect(result).toBeNull()
    })
  })

  describe('clearDraft', () => {
    it('removes draft from localStorage', () => {
      draftManager.clearDraft(1)
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('lecture-draft-1')
    })

    it('handles localStorage errors gracefully', () => {
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('Storage error')
      })
      
      expect(() => {
        draftManager.clearDraft(1)
      }).not.toThrow()
    })
  })

  describe('clearSlideDraft', () => {
    it('removes specific slide draft', () => {
      const draft = {
        sessionId: 1,
        slides: {
          1: {
            slideId: 1,
            title: 'Test Title 1',
            content: 'Test Content 1',
            lastSaved: '2024-01-01T10:00:00.000Z'
          },
          2: {
            slideId: 2,
            title: 'Test Title 2',
            content: 'Test Content 2',
            lastSaved: '2024-01-01T10:00:00.000Z'
          }
        },
        lastModified: '2024-01-01T10:00:00.000Z'
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(draft))
      
      draftManager.clearSlideDraft(1, 1)
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'lecture-draft-1',
        expect.not.stringContaining('"slideId":1')
      )
    })

    it('clears entire draft when no slides remain', () => {
      const draft = {
        sessionId: 1,
        slides: {
          1: {
            slideId: 1,
            title: 'Test Title',
            content: 'Test Content',
            lastSaved: '2024-01-01T10:00:00.000Z'
          }
        },
        lastModified: '2024-01-01T10:00:00.000Z'
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(draft))
      
      draftManager.clearSlideDraft(1, 1)
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('lecture-draft-1')
    })
  })

  describe('hasDraft', () => {
    it('returns true when draft exists with slides', () => {
      const draft = {
        sessionId: 1,
        slides: {
          1: {
            slideId: 1,
            title: 'Test Title',
            content: 'Test Content',
            lastSaved: '2024-01-01T10:00:00.000Z'
          }
        },
        lastModified: '2024-01-01T10:00:00.000Z'
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(draft))
      
      const result = draftManager.hasDraft(1)
      
      expect(result).toBe(true)
    })

    it('returns false when no draft exists', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      const result = draftManager.hasDraft(1)
      
      expect(result).toBe(false)
    })

    it('returns false when draft exists but has no slides', () => {
      const draft = {
        sessionId: 1,
        slides: {},
        lastModified: '2024-01-01T10:00:00.000Z'
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(draft))
      
      const result = draftManager.hasDraft(1)
      
      expect(result).toBe(false)
    })
  })

  describe('hasUnsavedChanges', () => {
    it('returns true when slide content differs from draft', () => {
      const draft = {
        sessionId: 1,
        slides: {
          1: {
            slideId: 1,
            title: 'Modified Title',
            content: 'Original Content',
            lastSaved: '2024-01-01T10:00:00.000Z'
          }
        },
        lastModified: '2024-01-01T10:00:00.000Z'
      }
      
      const slides = [
        {
          id: 1,
          session_id: 1,
          slide_number: 1,
          title: 'Original Title',
          content: 'Original Content',
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:30:00Z'
        }
      ]
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(draft))
      
      const result = draftManager.hasUnsavedChanges(1, slides)
      
      expect(result).toBe(true)
    })

    it('returns false when no changes exist', () => {
      const draft = {
        sessionId: 1,
        slides: {
          1: {
            slideId: 1,
            title: 'Same Title',
            content: 'Same Content',
            lastSaved: '2024-01-01T10:00:00.000Z'
          }
        },
        lastModified: '2024-01-01T10:00:00.000Z'
      }
      
      const slides = [
        {
          id: 1,
          session_id: 1,
          slide_number: 1,
          title: 'Same Title',
          content: 'Same Content',
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:30:00Z'
        }
      ]
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(draft))
      
      const result = draftManager.hasUnsavedChanges(1, slides)
      
      expect(result).toBe(false)
    })
  })

  describe('applyDraftsToSlides', () => {
    it('applies draft changes to slides', () => {
      const draft = {
        sessionId: 1,
        slides: {
          1: {
            slideId: 1,
            title: 'Modified Title',
            content: 'Modified Content',
            lastSaved: '2024-01-01T10:00:00.000Z'
          }
        },
        lastModified: '2024-01-01T10:00:00.000Z'
      }
      
      const slides = [
        {
          id: 1,
          session_id: 1,
          slide_number: 1,
          title: 'Original Title',
          content: 'Original Content',
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:30:00Z'
        }
      ]
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(draft))
      
      const result = draftManager.applyDraftsToSlides(1, slides)
      
      expect(result[0].title).toBe('Modified Title')
      expect(result[0].content).toBe('Modified Content')
    })

    it('returns original slides when no draft exists', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      const slides = [
        {
          id: 1,
          session_id: 1,
          slide_number: 1,
          title: 'Original Title',
          content: 'Original Content',
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:30:00Z'
        }
      ]
      
      const result = draftManager.applyDraftsToSlides(1, slides)
      
      expect(result).toEqual(slides)
    })
  })
})