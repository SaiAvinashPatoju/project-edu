import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import RegisterForm from '@/components/auth/RegisterForm'
import LoginForm from '@/components/auth/LoginForm'
import AuthGuard from '@/components/auth/AuthGuard'
import { useAuthStore } from '@/lib/auth-store'
import { authAPI } from '@/lib/api'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

// Mock API
vi.mock('@/lib/api', () => ({
  authAPI: {
    register: vi.fn(),
    login: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}))

// Mock auth store
vi.mock('@/lib/auth-store', () => ({
  useAuthStore: vi.fn(),
}))

describe('RegisterForm', () => {
  const mockPush = vi.fn()
  const mockLogin = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as any).mockReturnValue({ push: mockPush })
    ;(useAuthStore as any).mockReturnValue({ login: mockLogin })
  })

  it('renders registration form', () => {
    render(<RegisterForm />)
    
    expect(screen.getByText('Create your account')).toBeInTheDocument()
    expect(screen.getByLabelText('Email address')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument()
  })

  it('validates .edu email requirement', async () => {
    render(<RegisterForm />)
    
    const emailInput = screen.getByLabelText('Email address')
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const submitButton = screen.getByRole('button', { name: 'Create account' })

    fireEvent.change(emailInput, { target: { value: 'test@gmail.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid .edu email address')).toBeInTheDocument()
    })
  })

  it('validates password length', async () => {
    render(<RegisterForm />)
    
    const emailInput = screen.getByLabelText('Email address')
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const submitButton = screen.getByRole('button', { name: 'Create account' })

    fireEvent.change(emailInput, { target: { value: 'test@university.edu' } })
    fireEvent.change(passwordInput, { target: { value: '123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: '123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters long')).toBeInTheDocument()
    })
  })

  it('validates password confirmation', async () => {
    render(<RegisterForm />)
    
    const emailInput = screen.getByLabelText('Email address')
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const submitButton = screen.getByRole('button', { name: 'Create account' })

    fireEvent.change(emailInput, { target: { value: 'test@university.edu' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'different123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    })
  })

  it('handles successful registration', async () => {
    const mockTokenData = { access_token: 'test-token', token_type: 'bearer' }
    const mockUserData = { id: 1, email: 'test@university.edu', is_active: true, created_at: '2023-01-01' }

    ;(authAPI.register as any).mockResolvedValue(mockTokenData)
    ;(authAPI.getCurrentUser as any).mockResolvedValue(mockUserData)

    render(<RegisterForm />)
    
    const emailInput = screen.getByLabelText('Email address')
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const submitButton = screen.getByRole('button', { name: 'Create account' })

    fireEvent.change(emailInput, { target: { value: 'test@university.edu' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(authAPI.register).toHaveBeenCalledWith('test@university.edu', 'password123')
      expect(authAPI.getCurrentUser).toHaveBeenCalled()
      expect(mockLogin).toHaveBeenCalledWith('test-token', mockUserData)
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })
})

describe('LoginForm', () => {
  const mockPush = vi.fn()
  const mockLogin = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as any).mockReturnValue({ push: mockPush })
    ;(useAuthStore as any).mockReturnValue({ login: mockLogin })
  })

  it('renders login form', () => {
    render(<LoginForm />)
    
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument()
    expect(screen.getByLabelText('Email address')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('handles successful login', async () => {
    const mockTokenData = { access_token: 'test-token', token_type: 'bearer' }
    const mockUserData = { id: 1, email: 'test@university.edu', is_active: true, created_at: '2023-01-01' }

    ;(authAPI.login as any).mockResolvedValue(mockTokenData)
    ;(authAPI.getCurrentUser as any).mockResolvedValue(mockUserData)

    render(<LoginForm />)
    
    const emailInput = screen.getByLabelText('Email address')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Sign in' })

    fireEvent.change(emailInput, { target: { value: 'test@university.edu' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(authAPI.login).toHaveBeenCalledWith('test@university.edu', 'password123')
      expect(authAPI.getCurrentUser).toHaveBeenCalled()
      expect(mockLogin).toHaveBeenCalledWith('test-token', mockUserData)
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('handles login error', async () => {
    ;(authAPI.login as any).mockRejectedValue({
      response: { data: { detail: 'Incorrect email or password' } }
    })

    render(<LoginForm />)
    
    const emailInput = screen.getByLabelText('Email address')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Sign in' })

    fireEvent.change(emailInput, { target: { value: 'test@university.edu' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Incorrect email or password')).toBeInTheDocument()
    })
  })
})

describe('AuthGuard', () => {
  const mockPush = vi.fn()
  const mockSetUser = vi.fn()
  const mockLogout = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as any).mockReturnValue({ push: mockPush })
  })

  it('redirects to login when not authenticated', () => {
    ;(useAuthStore as any).mockReturnValue({
      isAuthenticated: false,
      token: null,
      setUser: mockSetUser,
      logout: mockLogout,
    })

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    )

    expect(mockPush).toHaveBeenCalledWith('/login')
  })

  it('shows loading spinner while checking auth', () => {
    ;(useAuthStore as any).mockReturnValue({
      isAuthenticated: true,
      token: 'valid-token',
      setUser: mockSetUser,
      logout: mockLogout,
    })

    ;(authAPI.getCurrentUser as any).mockImplementation(() => new Promise(() => {})) // Never resolves

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    )

    expect(document.querySelector('.animate-spin')).toBeInTheDocument() // Loading spinner
  })

  it('renders children when authenticated', async () => {
    const mockUserData = { id: 1, email: 'test@university.edu', is_active: true, created_at: '2023-01-01' }

    ;(useAuthStore as any).mockReturnValue({
      isAuthenticated: true,
      token: 'valid-token',
      setUser: mockSetUser,
      logout: mockLogout,
    })

    ;(authAPI.getCurrentUser as any).mockResolvedValue(mockUserData)

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    )

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
      expect(mockSetUser).toHaveBeenCalledWith(mockUserData)
    })
  })

  it('logs out and redirects when token is invalid', async () => {
    ;(useAuthStore as any).mockReturnValue({
      isAuthenticated: true,
      token: 'invalid-token',
      setUser: mockSetUser,
      logout: mockLogout,
    })

    ;(authAPI.getCurrentUser as any).mockRejectedValue(new Error('Unauthorized'))

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    )

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })
})