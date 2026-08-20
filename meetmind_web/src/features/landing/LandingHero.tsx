import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Brain, ArrowRight, Play, CheckCircle2, Menu, X, Sparkles, ShieldCheck, Zap } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { SectionLabel } from '../../components/ui/SectionLabel'
import { AuthHeroIllustration } from '../../components/ui/Illustrations'

export interface LandingHeroProps {
  onGetStarted: () => void
  onSignIn: () => void
  onScrollToSection: (sectionId: string) => void
  isAuthenticated?: boolean
  onNavigateDashboard?: () => void
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onGetStarted,
  onSignIn,
  onScrollToSection,
  isAuthenticated = false,
  onNavigateDashboard,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const handlePrimaryClick = isAuthenticated && onNavigateDashboard ? onNavigateDashboard : onGetStarted

  return (
    <div className="w-full pt-4 pb-8 px-3 sm:px-6 lg:px-8">
      {/* Inset Rounded Card Container */}
      <div className="max-w-7xl mx-auto bg-[#12171F] border border-[#232B36] rounded-xl overflow-hidden relative">
        {/* Integrated Top Navigation */}
        <nav className="w-full px-6 py-4 border-b border-[#232B36] flex items-center justify-between bg-[#12171F] sticky top-0 z-30">
          {/* Logo + Wordmark */}
          <div
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={() => (isAuthenticated && onNavigateDashboard ? onNavigateDashboard() : onScrollToSection('hero'))}
          >
            <div className="w-9 h-9 rounded-xl bg-[#22C55E] flex items-center justify-center text-[#0B0F14] font-bold group-hover:bg-[#16A34A] transition-colors">
              <Brain className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-extrabold text-[#F1F5F9] tracking-tight">
                MeetMind AI
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-[#22C55E1A] text-[#22C55E] border border-[#22C55E33]">
                Pro
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-8 text-xs font-semibold text-[#8B96A5]">
            <button
              type="button"
              onClick={() => onScrollToSection('features')}
              className="hover:text-[#22C55E] transition-colors cursor-pointer"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => onScrollToSection('why-meetmind')}
              className="hover:text-[#22C55E] transition-colors cursor-pointer"
            >
              Why MeetMind
            </button>
            <button
              type="button"
              onClick={() => onScrollToSection('faq')}
              className="hover:text-[#22C55E] transition-colors cursor-pointer"
            >
              FAQ
            </button>
          </div>

          {/* Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            {!isAuthenticated && (
              <Button variant="ghost" size="sm" onClick={onSignIn}>
                Sign In
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={handlePrimaryClick}>
              <span>{isAuthenticated ? 'Go to Dashboard' : 'Get Started Free'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="lg:hidden flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={handlePrimaryClick} className="sm:hidden">
              {isAuthenticated ? 'Dashboard' : 'Get Started'}
            </Button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#8B96A5] hover:text-[#F1F5F9] bg-[#1A212C] border border-[#232B36] rounded-lg cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden px-6 py-4 bg-[#1A212C] border-b border-[#232B36] flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                onScrollToSection('features')
                setMobileMenuOpen(false)
              }}
              className="text-left text-sm font-semibold text-[#F1F5F9] py-1"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => {
                onScrollToSection('why-meetmind')
                setMobileMenuOpen(false)
              }}
              className="text-left text-sm font-semibold text-[#F1F5F9] py-1"
            >
              Why MeetMind
            </button>
            <button
              type="button"
              onClick={() => {
                onScrollToSection('faq')
                setMobileMenuOpen(false)
              }}
              className="text-left text-sm font-semibold text-[#F1F5F9] py-1"
            >
              FAQ
            </button>
            <div className="pt-3 border-t border-[#232B36] flex flex-col gap-2">
              <Button variant="outline" size="sm" onClick={onSignIn} className="w-full justify-center">
                Sign In
              </Button>
              <Button variant="primary" size="sm" onClick={onGetStarted} className="w-full justify-center">
                Get Started Free
              </Button>
            </div>
          </div>
        )}

        {/* Hero Content Grid */}
        <div className="px-6 py-12 sm:py-16 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Headline & CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-7 flex flex-col items-start"
          >
            <SectionLabel icon={<Sparkles className="w-3.5 h-3.5 text-[#22C55E]" />} className="mb-6">
              AI-Powered Meeting Workspace
            </SectionLabel>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#F1F5F9] tracking-tight leading-[1.15] mb-5">
              Turn meeting audio into <span className="text-[#22C55E]">actionable team intelligence.</span>
            </h1>

            <p className="text-base sm:text-lg text-[#8B96A5] font-normal leading-relaxed mb-8 max-w-2xl">
              Capture Google Meet, Zoom, and uploaded audio automatically. Generate executive summaries, assign action items, and search transcript vectors instantly with enterprise security.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto mb-8">
              <Button variant="primary" size="lg" onClick={handlePrimaryClick}>
                <span>{isAuthenticated ? 'Open Workspace Dashboard' : 'Get Started Free'}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() => onScrollToSection('features')}
                className="group"
              >
                <Play className="w-4 h-4 text-[#22C55E] group-hover:scale-110 transition-transform" />
                <span>See How It Works</span>
              </Button>
            </div>

            {/* Bullet Highlights */}
            <div className="flex flex-wrap items-center gap-6 text-xs text-[#8B96A5] font-medium pt-4 border-t border-[#232B36] w-full">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" /> No Credit Card Required
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#22C55E] shrink-0" /> Enterprise Privacy Guard
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[#22C55E] shrink-0" /> Instantly Search Transcripts
              </span>
            </div>
          </motion.div>

          {/* Right Column: Visual Dashboard Mockup Illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="lg:col-span-5 relative"
          >
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <div className="bg-[#0B0F14] border border-[#232B36] rounded-xl p-4">
                <AuthHeroIllustration className="w-full h-auto rounded-xl" />
              </div>

              {/* Floating Stat Badge Overlay */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="absolute -bottom-5 -left-4 sm:-left-6 bg-[#12171F] border border-[#232B36] rounded-xl p-3.5 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-[#22C55E1A] text-[#22C55E] flex items-center justify-center font-extrabold text-sm border border-[#22C55E33]">
                  98%
                </div>
                <div>
                  <p className="text-xs font-bold text-[#F1F5F9]">Diarization Accuracy</p>
                  <p className="text-[11px] text-[#8B96A5] font-medium">Bilingual Urdu/English</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
