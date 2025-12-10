import { Slide } from './api-client'

export interface SlideDraft {
  slideId: number
  title: string
  content: string
  lastSaved: string
}

export interface SessionDraft {
  sessionId: number
  slides: Record<number, SlideDraft>
  lastModified: string
}

class DraftManager {
  private getStorageKey(sessionId: number): string {
    return `lecture-draft-${sessionId}`
  }

  saveDraft(sessionId: number, slideId: number, title: string, content: string): void {
    try {
      const storageKey = this.getStorageKey(sessionId)
      const existingDraft = this.getDraft(sessionId)
      
      const draft: SessionDraft = {
        sessionId,
        slides: {
          ...existingDraft?.slides,
          [slideId]: {
            slideId,
            title,
            content,
            lastSaved: new Date().toISOString()
          }
        },
        lastModified: new Date().toISOString()
      }
      
      localStorage.setItem(storageKey, JSON.stringify(draft))
    } catch (error) {
      console.warn('Failed to save draft to localStorage:', error)
    }
  }

  getDraft(sessionId: number): SessionDraft | null {
    try {
      const storageKey = this.getStorageKey(sessionId)
      const draftData = localStorage.getItem(storageKey)
      
      if (!draftData) return null
      
      return JSON.parse(draftData)
    } catch (error) {
      console.warn('Failed to load draft from localStorage:', error)
      return null
    }
  }

  getSlideDraft(sessionId: number, slideId: number): SlideDraft | null {
    const sessionDraft = this.getDraft(sessionId)
    return sessionDraft?.slides[slideId] || null
  }

  clearDraft(sessionId: number): void {
    try {
      const storageKey = this.getStorageKey(sessionId)
      localStorage.removeItem(storageKey)
    } catch (error) {
      console.warn('Failed to clear draft from localStorage:', error)
    }
  }

  clearSlideDraft(sessionId: number, slideId: number): void {
    try {
      const draft = this.getDraft(sessionId)
      if (draft && draft.slides[slideId]) {
        delete draft.slides[slideId]
        
        // If no slides left, clear entire draft
        if (Object.keys(draft.slides).length === 0) {
          this.clearDraft(sessionId)
        } else {
          const storageKey = this.getStorageKey(sessionId)
          localStorage.setItem(storageKey, JSON.stringify(draft))
        }
      }
    } catch (error) {
      console.warn('Failed to clear slide draft:', error)
    }
  }

  hasDraft(sessionId: number): boolean {
    const draft = this.getDraft(sessionId)
    return draft !== null && Object.keys(draft.slides).length > 0
  }

  hasUnsavedChanges(sessionId: number, slides: Slide[]): boolean {
    const draft = this.getDraft(sessionId)
    if (!draft) return false

    return slides.some(slide => {
      const slideDraft = draft.slides[slide.id]
      if (!slideDraft) return false
      
      return slideDraft.title !== slide.title || slideDraft.content !== slide.content
    })
  }

  applyDraftsToSlides(sessionId: number, slides: Slide[]): Slide[] {
    const draft = this.getDraft(sessionId)
    if (!draft) return slides

    return slides.map(slide => {
      const slideDraft = draft.slides[slide.id]
      if (slideDraft) {
        return {
          ...slide,
          title: slideDraft.title,
          content: slideDraft.content
        }
      }
      return slide
    })
  }
}

export const draftManager = new DraftManager()

// Hook for managing unsaved changes warning
export function useUnsavedChangesWarning(hasUnsavedChanges: boolean) {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasUnsavedChanges) {
      e.preventDefault()
      e.returnValue = ''
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }
  
  return () => {}
}