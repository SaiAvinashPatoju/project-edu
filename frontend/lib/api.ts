import axios from 'axios'
import { useAuthStore } from './auth-store'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Create axios instance
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API functions
export const authAPI = {
  register: async (email: string, password: string) => {
    const response = await api.post('/auth/register', { email, password })
    return response.data
  },

  login: async (email: string, password: string) => {
    const formData = new FormData()
    formData.append('username', email)
    formData.append('password', password)
    
    // Create a separate axios instance for login to avoid interceptor issues
    const response = await axios.post(`${API_URL}/auth/token`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
    return response.data
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me')
    return response.data
  },
}

// Lecture API functions
export const lectureAPI = {
  processLecture: async (file: File, title?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (title) {
      formData.append('title', title)
    }
    
    const response = await api.post('/lectures/process', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  getProcessingStatus: async (sessionId: number) => {
    const response = await api.get(`/lectures/${sessionId}/status`)
    return response.data
  },

  getUserSessions: async () => {
    const response = await api.get('/lectures/sessions')
    return response.data
  },

  getSessionWithSlides: async (sessionId: number) => {
    const response = await api.get(`/lectures/${sessionId}`)
    return response.data
  },

  updateSlide: async (slideId: number, updates: { title?: string; content?: string }) => {
    const response = await api.put(`/slides/${slideId}`, updates)
    return response.data
  },
}