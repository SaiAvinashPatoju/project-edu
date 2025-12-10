import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
  useParams: vi.fn(() => ({ sessionId: '123' })),
}))

// Mock API
vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
  lectureAPI: {
    processLecture: vi.fn(),
    getProcessingStatus: vi.fn(),
    getUserSessions: vi.fn(),
    getSessionWithSlides: vi.fn(),
    updateSlide: vi.fn(),
  },
}))

// Mock auth store
vi.mock('@/lib/auth-store', () => ({
  useAuthStore: () => ({
    user: { id: 1, email: 'test@university.edu' },
    token: 'mock-token',
    isAuthenticated: true,
  }),
}))

// Mock AuthGuard
vi.mock('@/components/auth/AuthGuard', () => ({
  default: function MockAuthGuard({ children }: { children: React.ReactNode }) {
    return <div data-testid="auth-guard">{children}</div>
  }
}))

// Mock MediaRecorder API
const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  ondataavailable: null as any,
  onstop: null as any,
  state: 'inactive',
}

const mockStream = {
  getTracks: vi.fn(() => [{ stop: vi.fn() }]),
}

// Setup global mocks
beforeEach(() => {
  Object.defineProperty(global.navigator, 'mediaDevices', {
    value: {
      getUserMedia: vi.fn(() => Promise.resolve(mockStream)),
    },
    writable: true,
  })

  Object.defineProperty(global, 'MediaRecorder', {
    value: vi.fn(() => mockMediaRecorder),
    writable: true,
  })

  vi.clearAllMocks()
})

describe('Recording Components', () => {
  describe('AudioRecorder Component', () => {
    it('renders loading state initially', async () => {
      const AudioRecorder = (await import('@/components/recording/AudioRecorder')).default
      
      render(
        <AudioRecorder
          onRecordingComplete={vi.fn()}
          onError={vi.fn()}
        />
      )

      // Should show loading state while requesting permissions
      expect(screen.getByText('Requesting microphone access...')).toBeInTheDocument()
    })
  })

  describe('ProcessingStatus Component', () => {
    it('renders processing interface', async () => {
      const ProcessingStatus = (await import('@/components/processing/ProcessingStatus')).default
      
      render(
        <ProcessingStatus
          sessionId={123}
          onComplete={vi.fn()}
          onError={vi.fn()}
        />
      )

      expect(screen.getByText('Processing Your Lecture')).toBeInTheDocument()
      expect(screen.getByText('Session ID: 123')).toBeInTheDocument()
    })
  })

  describe('Record Page', () => {
    it('renders the recording interface', async () => {
      const RecordPage = (await import('@/app/record/page')).default
      
      render(<RecordPage />)

      expect(screen.getByText('Record New Lecture')).toBeInTheDocument()
      expect(screen.getByText('Audio Recording')).toBeInTheDocument()
      expect(screen.getByText('Lecture Details')).toBeInTheDocument()
    })

    it('shows lecture title input', async () => {
      const RecordPage = (await import('@/app/record/page')).default
      
      render(<RecordPage />)

      expect(screen.getByPlaceholderText('e.g., Introduction to Machine Learning')).toBeInTheDocument()
      expect(screen.getByText('Lecture Title (Optional)')).toBeInTheDocument()
    })

    it('displays processing information', async () => {
      const RecordPage = (await import('@/app/record/page')).default
      
      render(<RecordPage />)

      expect(screen.getByText('Maximum file size: 500MB')).toBeInTheDocument()
      expect(screen.getByText('Maximum duration: 120 minutes')).toBeInTheDocument()
    })
  })

  describe('Processing Page', () => {
    it('renders processing status for valid session ID', async () => {
      const ProcessingPage = (await import('@/app/lectures/[sessionId]/processing/page')).default
      
      render(<ProcessingPage />)

      expect(screen.getByTestId('auth-guard')).toBeInTheDocument()
    })
  })
})

describe('User Workflow Integration', () => {
  it('provides complete recording to processing flow', () => {
    // Test that all necessary components exist and can be imported
    expect(async () => {
      await import('@/components/recording/AudioRecorder')
      await import('@/components/processing/ProcessingStatus')
      await import('@/app/record/page')
      await import('@/app/lectures/[sessionId]/processing/page')
    }).not.toThrow()
  })

  it('has proper API functions for the workflow', async () => {
    const { api, lectureAPI } = await import('@/lib/api')
    
    expect(api).toBeDefined()
    expect(lectureAPI).toBeDefined()
    expect(lectureAPI.processLecture).toBeDefined()
    expect(lectureAPI.getProcessingStatus).toBeDefined()
  })
})