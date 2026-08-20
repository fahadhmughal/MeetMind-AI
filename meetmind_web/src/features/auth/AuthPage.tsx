import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Mail, Lock, User, Brain, AlertCircle, CheckCircle2, RefreshCw, UserPlus, Sparkles, ShieldCheck } from 'lucide-react'
import { supabase } from '../../services/supabase'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { AuthHeroIllustration } from '../../components/ui/Illustrations'
import { useToast } from '../../components/ui/Toast'
import { loginSchema, signupSchema } from './schemas'
import type { LoginFormData, SignupFormData } from './schemas'

export interface AuthPageProps {
  onAuthSuccess: (userEmail: string) => void
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const toast = useToast()
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

        toast.success(`Welcome back, ${user.email || data.email}!`)
        onAuthSuccess(user.email || data.email)
      }
    } catch (err: any) {
      const errMsg = err.message || 'Failed to sign in. Please check your credentials.'
      setAuthError(errMsg)
      toast.error(errMsg)
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
        const msg = `Account created successfully! A verification email has been sent to ${data.email}.`
        setAuthMessage(msg)
        toast.success(msg)
        setIsSignUp(false)
        loginForm.setValue('email', data.email)
      }
    } catch (err: any) {
      const errMsg = err.message || 'Failed to create account.'
      setAuthError(errMsg)
      toast.error(errMsg)
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
      const msg = `Verification email resent to ${unverifiedEmail}. Please check your inbox!`
      setAuthMessage(msg)
      toast.info(msg)
      setAuthError(null)
    } catch (err: any) {
      const errMsg = err.message || 'Failed to resend verification email.'
      setAuthError(errMsg)
      toast.error(errMsg)
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
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Hero Section with Illustration */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="hidden lg:flex flex-col justify-center pr-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#22C55E1A] text-[#22C55E] border border-[#22C55E33] text-xs font-semibold w-fit mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Powered Meeting Workspace</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#F1F5F9] tracking-tight leading-tight mb-3">
            Turn meeting audio into actionable team intelligence.
          </h1>
          <p className="text-sm text-[#8B96A5] leading-relaxed mb-6 font-normal">
            Capture Google Meet, Zoom, and uploaded audio automatically. Generate executive summaries, assign action items, and search transcript vectors instantly.
          </p>

          <AuthHeroIllustration className="w-full h-auto max-w-md mx-auto mb-6" />

          <div className="flex items-center gap-6 text-xs text-[#8B96A5] font-medium border-t border-[#232B36] pt-4">
            <span className="flex items-center gap-1.5 text-[#F1F5F9]">
              <ShieldCheck className="w-4 h-4 text-[#22C55E]" /> Enterprise-Grade Privacy
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-[#F1F5F9]">
              <Sparkles className="w-4 h-4 text-[#22C55E]" /> Speaker Diarization
            </span>
          </div>
        </motion.div>

        {/* Right Form Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md mx-auto"
        >
          <Card className="p-8 border-[#232B36] bg-[#12171F]">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-12 h-12 rounded-xl bg-[#22C55E] flex items-center justify-center mb-4 text-[#0B0F14] font-bold">
                <Brain className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-[#F1F5F9] tracking-tight">
                {isSignUp ? 'Create your account' : 'Welcome back'}
              </h2>
              <p className="text-xs text-[#8B96A5] mt-1 font-medium">
                {isSignUp
                  ? 'Start recording and summarizing meetings with AI'
                  : 'Sign in to access your meeting transcripts and insights'}
              </p>
            </div>

            {authError && (
              <div className="mb-6 p-4 rounded-xl bg-[#EF44441A] border border-[#EF444433] flex flex-col gap-2.5 text-[#EF4444] text-xs">
                <div className="flex items-start gap-2.5 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{authError}</span>
                </div>

                {unregisteredEmail && (
                  <button
                    type="button"
                    onClick={switchToRegister}
                    className="mt-1 flex items-center gap-1.5 self-start text-xs font-bold text-[#22C55E] hover:underline"
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
                    className="mt-1 flex items-center gap-1.5 self-start text-xs font-semibold text-[#22C55E] hover:underline disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                    {resending ? 'Resending...' : 'Resend Verification Email'}
                  </button>
                )}
              </div>
            )}

            {authMessage && (
              <div className="mb-6 p-4 rounded-xl bg-[#22C55E1A] border border-[#22C55E33] flex items-start gap-2.5 text-[#22C55E] text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#22C55E]" />
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
                className="text-xs font-semibold text-[#22C55E] hover:underline transition-colors"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
