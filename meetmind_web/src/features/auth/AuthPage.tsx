import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Mail, Lock, User, Brain, AlertCircle, CheckCircle2, RefreshCw, UserPlus } from 'lucide-react'
import { supabase } from '../../services/supabase'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { loginSchema, signupSchema } from './schemas'
import type { LoginFormData, SignupFormData } from './schemas'

export interface AuthPageProps {
  onAuthSuccess: (userEmail: string) => void
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authMessage, setAuthMessage] = useState<string | null>(null)
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)
  const [unregisteredEmail, setUnregisteredEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  // Mode set to 'onChange' for REAL-TIME LIVE VALIDATIONS on every keystroke
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onChange',
  })

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
    mode: 'onChange',
  })

  const handleLogin = async (data: LoginFormData) => {
    setAuthError(null)
    setAuthMessage(null)
    setUnverifiedEmail(null)
    setUnregisteredEmail(null)
    setLoading(true)

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) {
        const errorMsgLower = error.message.toLowerCase()
        const errorCode = (error as any).code || (error as any).status

        const isUnverified =
          errorMsgLower.includes('email not confirmed') ||
          errorMsgLower.includes('not confirmed') ||
          errorMsgLower.includes('unconfirmed') ||
          errorMsgLower.includes('verify') ||
          errorCode === 'email_not_confirmed'

        if (isUnverified) {
          setUnverifiedEmail(data.email)
          setAuthError('Your email address is not verified yet. Please check your inbox and click the verification link before logging in.')
          return
        }

        if (
          errorMsgLower.includes('invalid login credentials') ||
          errorMsgLower.includes('invalid email or password') ||
          errorMsgLower.includes('user not found')
        ) {
          setUnregisteredEmail(data.email)
          setAuthError('This email is not registered or your credentials are invalid. Please register an account first.')
          return
        }

        setAuthError(error.message || 'Failed to sign in. Please check your credentials.')
        return
      }

      const user = authData.user
      if (user) {
        // Enforce Email Verification Guard
        if (!user.email_confirmed_at && !user.confirmed_at) {
          await supabase.auth.signOut()
          setUnverifiedEmail(data.email)
          setAuthError('Your email address is not verified yet. Please check your inbox and click the verification link before logging in.')
          return
        }

        // Auto-provision public.users record if missing
        try {
          await supabase.from('users').upsert({
            id: user.id,
            email: user.email || data.email,
            full_name: user.user_metadata?.full_name || 'MeetMind User',
          })
        } catch (syncErr) {
          console.warn('Could not sync user profile to public.users:', syncErr)
        }

        onAuthSuccess(user.email || data.email)
      }
    } catch (err: any) {
      setAuthError(err.message || 'Failed to sign in. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (data: SignupFormData) => {
    setAuthError(null)
    setAuthMessage(null)
    setUnverifiedEmail(null)
    setUnregisteredEmail(null)
    setLoading(true)

    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
          },
        },
      })

      if (error) throw error

      if (authData.user) {
        setAuthMessage(`Account created successfully! A verification email has been sent to ${data.email}. Please verify your email before logging in.`)
        setIsSignUp(false)
        loginForm.setValue('email', data.email)
      }
    } catch (err: any) {
      setAuthError(err.message || 'Failed to create account.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return
    setResending(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: unverifiedEmail,
      })
      if (error) throw error
      setAuthMessage(`Verification email resent to ${unverifiedEmail}. Please check your inbox!`)
      setAuthError(null)
    } catch (err: any) {
      setAuthError(err.message || 'Failed to resend verification email.')
    } finally {
      setResending(false)
    }
  }

  const switchToRegister = () => {
    if (unregisteredEmail) {
      signupForm.setValue('email', unregisteredEmail)
    }
    setIsSignUp(true)
    setAuthError(null)
    setUnregisteredEmail(null)
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="p-8 border-[#27272a]">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-[#2563eb] flex items-center justify-center mb-4 text-white">
              <Brain className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-[#fafafa] tracking-tight">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="text-xs text-[#a1a1aa] mt-1">
              {isSignUp
                ? 'Start recording and summarizing meetings with AI'
                : 'Sign in to access your meeting transcripts and insights'}
            </p>
          </div>

          {authError && (
            <div className="mb-6 p-4 rounded-lg bg-[#ef44441a] border border-[#ef444433] flex flex-col gap-2.5 text-[#ef4444] text-xs">
              <div className="flex items-start gap-2.5 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{authError}</span>
              </div>

              {unregisteredEmail && (
                <button
                  type="button"
                  onClick={switchToRegister}
                  className="mt-1 flex items-center gap-1.5 self-start text-xs font-bold text-[#2563eb] hover:underline"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register Account Now</span>
                </button>
              )}

              {unverifiedEmail && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="mt-1 flex items-center gap-1.5 self-start text-xs font-semibold text-[#2563eb] hover:underline disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                  {resending ? 'Resending...' : 'Resend Verification Email'}
                </button>
              )}
            </div>
          )}

          {authMessage && (
            <div className="mb-6 p-4 rounded-lg bg-[#22c55e1a] border border-[#22c55e33] flex items-start gap-2.5 text-[#22c55e] text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{authMessage}</span>
            </div>
          )}

          {isSignUp ? (
            <form onSubmit={signupForm.handleSubmit(handleSignUp)} className="flex flex-col gap-4" noValidate>
              <Input
                label="Full Name"
                placeholder="Jane Doe"
                icon={<User className="w-4 h-4" />}
                error={signupForm.formState.errors.fullName?.message}
                {...signupForm.register('fullName')}
              />
              <Input
                label="Email Address"
                type="email"
                placeholder="jane@company.com"
                icon={<Mail className="w-4 h-4" />}
                error={signupForm.formState.errors.email?.message}
                {...signupForm.register('email')}
              />
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                icon={<Lock className="w-4 h-4" />}
                error={signupForm.formState.errors.password?.message}
                {...signupForm.register('password')}
              />

              <Input
                label="Confirm Password"
                type="password"
                placeholder="••••••••"
                icon={<Lock className="w-4 h-4" />}
                error={signupForm.formState.errors.confirmPassword?.message}
                {...signupForm.register('confirmPassword')}
              />
              <Button type="submit" variant="primary" size="lg" isLoading={loading} className="mt-2 w-full">
                Create Account
              </Button>
            </form>
          ) : (
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="flex flex-col gap-4" noValidate>
              <Input
                label="Email Address"
                type="email"
                placeholder="jane@company.com"
                icon={<Mail className="w-4 h-4" />}
                error={loginForm.formState.errors.email?.message}
                {...loginForm.register('email')}
              />
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                icon={<Lock className="w-4 h-4" />}
                error={loginForm.formState.errors.password?.message}
                {...loginForm.register('password')}
              />
              <Button type="submit" variant="primary" size="lg" isLoading={loading} className="mt-2 w-full">
                Sign In
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setAuthError(null)
                setAuthMessage(null)
                setUnverifiedEmail(null)
                setUnregisteredEmail(null)
              }}
              className="text-xs font-medium text-[#2563eb] hover:underline transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
