import { useAuthStore } from './auth-store'
import { parseApiError, logError } from './error-handler'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Types for API responses
export interface LectureSession {
  id: number
  title: string
  transcript?: string
  audio_duration?: number
  processing_status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  updated_at: string
}

export interface Slide {
  id: number
  session_id: number
  slide_number: number
  title: string
  content: string
  confidence_data?: string
  created_at: string
  updated_at: string
}

export interface SessionWithSlides {
  session: LectureSession
  slides: Slide[]
}

export interface SlideUpdate {
  title?: string
  content?: string
}

export interface ExportRequest {
  format: 'pdf' | 'pptx'
}

export interface ExportStartResponse {
  export_id: number
  status: string
  message: string
}

export interface ExportStatusResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  download_url?: string
  error?: string
  expires_at?: string
}

class ApiClient {
  private getAuthHeaders() {
    const token = useAuthStore.getState().token
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }

  private async handleResponse<T>(response: Response, context?: string): Promise<T> {
    if (!response.ok) {
      let errorData
      try {
        errorData = await response.json()
      } catch {
        errorData = { message: response.statusText }
      }

      const error = {
        response: {
          status: response.status,
          data: errorData
        },
        message: errorData.message || response.statusText
      }

      const parsedError = parseApiError(error)
      logError(parsedError, context)
      throw parsedError
    }

    return response.json()
  }

  async fetchSessions(): Promise<LectureSession[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/lectures/sessions`, {
        headers: this.getAuthHeaders()
      })
      
      return this.handleResponse<LectureSession[]>(response, 'fetchSessions')
    } catch (error) {
      logError(error, 'fetchSessions')
      throw error
    }
  }

  async fetchSessionWithSlides(sessionId: number): Promise<SessionWithSlides> {
    try {
      const response = await fetch(`${API_BASE_URL}/lectures/${sessionId}`, {
        headers: this.getAuthHeaders()
      })
      
      return this.handleResponse<SessionWithSlides>(response, 'fetchSessionWithSlides')
    } catch (error) {
      logError(error, 'fetchSessionWithSlides')
      throw error
    }
  }

  async updateSlide(slideId: number, update: SlideUpdate): Promise<Slide> {
    try {
      const response = await fetch(`${API_BASE_URL}/slides/${slideId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(update)
      })
      
      return this.handleResponse<Slide>(response, 'updateSlide')
    } catch (error) {
      logError(error, 'updateSlide')
      throw error
    }
  }

  async getProcessingStatus(sessionId: number): Promise<{ status: string; progress?: number; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/lectures/${sessionId}/status`, {
        headers: this.getAuthHeaders()
      })
      
      return this.handleResponse<{ status: string; progress?: number; error?: string }>(response, 'getProcessingStatus')
    } catch (error) {
      logError(error, 'getProcessingStatus')
      throw error
    }
  }

  async startExport(sessionId: number, format: 'pdf' | 'pptx'): Promise<ExportStartResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/slides/${sessionId}/export`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ format })
      })
      
      return this.handleResponse<ExportStartResponse>(response, 'startExport')
    } catch (error) {
      logError(error, 'startExport')
      throw error
    }
  }

  async getExportStatus(exportId: number): Promise<ExportStatusResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/slides/export/${exportId}/status`, {
        headers: this.getAuthHeaders()
      })
      
      return this.handleResponse<ExportStatusResponse>(response, 'getExportStatus')
    } catch (error) {
      logError(error, 'getExportStatus')
      throw error
    }
  }

  async downloadExport(exportId: number): Promise<Blob> {
    try {
      const response = await fetch(`${API_BASE_URL}/exports/download/${exportId}`, {
        headers: this.getAuthHeaders()
      })
      
      if (!response.ok) {
        const error = {
          response: {
            status: response.status,
            data: { message: 'Failed to download export' }
          },
          message: 'Failed to download export'
        }
        const parsedError = parseApiError(error)
        logError(parsedError, 'downloadExport')
        throw parsedError
      }
      
      return response.blob()
    } catch (error) {
      logError(error, 'downloadExport')
      throw error
    }
  }
}

export const apiClient = new ApiClient()