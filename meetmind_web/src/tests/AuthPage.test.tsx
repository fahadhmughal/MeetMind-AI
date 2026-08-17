import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AuthPage } from '../features/auth/AuthPage'

// Mock supabase client
vi.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      resend: vi.fn(),
      signOut: vi.fn(),
    },
  },
}))

describe('AuthPage Component', () => {
  it('renders login form by default', () => {
    render(<AuthPage onAuthSuccess={() => {}} />)
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('switches to sign up mode cleanly without static rules box', async () => {
    render(<AuthPage onAuthSuccess={() => {}} />)
    const toggleBtn = screen.getByText(/don't have an account\? sign up/i)
    toggleBtn.click()

    expect(await screen.findByText(/create your account/i)).toBeInTheDocument()
    expect(screen.queryByText(/live validations:/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/live password requirements:/i)).not.toBeInTheDocument()
  })
})
