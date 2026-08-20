import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Mic,
  Users,
  CheckSquare,
  MessageSquare,
  Languages,
  ShieldCheck,
  Zap,
  Clock,
  TrendingUp,
  Award,
  ArrowRight,
  Sparkles,
  HelpCircle,
} from 'lucide-react'

import { SectionLabel } from '../../components/ui/SectionLabel'
import { LandingHero } from './LandingHero'
import { TrustedStrip } from './TrustedStrip'
import { FeatureCard } from './FeatureCard'
import { StatCard } from './StatCard'
import { FaqAccordionItem } from './FaqAccordionItem'
import { LandingFooter } from './LandingFooter'

export interface LandingPageProps {
  onNavigateAuth: () => void
  isAuthenticated?: boolean
  onNavigateDashboard?: () => void
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateAuth,
  isAuthenticated = false,
  onNavigateDashboard,
}) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)

  const handleScrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const features = [
    {
      icon: <Mic className="w-6 h-6 text-[#22C55E]" />,
      title: 'Real-Time Recording',
      description:
        'Capture clear meeting audio directly from Google Meet, Zoom, or your microphone with automatic noise mitigation.',
    },
    {
      icon: <Users className="w-6 h-6 text-[#22C55E]" />,
      title: 'Speaker-Labeled Transcripts',
      description:
        'Automatic speaker diarization separates voices and allows easy custom naming for accurate team attribution.',
    },
    {
      icon: <CheckSquare className="w-6 h-6 text-[#22C55E]" />,
      title: 'Auto Summaries & Action Items',
      description:
        'Structured extraction of executive summaries, key decisions, and assigned tasks with deadlines instantly.',
    },
    {
      icon: <MessageSquare className="w-6 h-6 text-[#22C55E]" />,
      title: 'Cross-Meeting AI Chat',
      description:
        'Ask questions across your organization’s entire meeting memory bank powered by grounded vector search.',
    },
    {
      icon: <Languages className="w-6 h-6 text-[#22C55E]" />,
      title: 'Bilingual (Urdu/English) Support',
      description:
        'Engineered for mixed language conversations with seamless transcription and translation capability.',
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-[#22C55E]" />,
      title: 'Enterprise-Ready Security',
      description:
        'Encrypted vector storage, row-level access control, and complete data privacy for your company knowledge.',
    },
  ]

  const stats = [
    {
      value: '75%',
      label: 'Minutes Saved Per Meeting',
      subtext: 'Drastically reduces manual note-taking and follow-up email composition.',
      icon: <Clock className="w-5 h-5 text-[#22C55E]" />,
    },
    {
      value: '2+',
      label: 'Languages Supported',
      subtext: 'First-class support for English and Urdu mixed-code conversations.',
      icon: <Languages className="w-5 h-5 text-[#22C55E]" />,
    },
    {
      value: '98.4%',
      label: 'Transcript Accuracy',
      subtext: 'High-precision STT and speaker diarization models.',
      icon: <Award className="w-5 h-5 text-[#22C55E]" />,
    },
    {
      value: '10x',
      label: 'Faster Action Item Tracking',
      subtext: 'Instant task extraction and integration into workspace workflows.',
      icon: <TrendingUp className="w-5 h-5 text-[#22C55E]" />,
    },
  ]

  const faqs = [
    {
      question: 'Is my meeting data private and secure?',
      answer:
        'Yes. All audio recordings, transcripts, and vector embeddings are encrypted at rest and in transit. Your data is isolated per user and organization using strict Row-Level Security policies.',
    },
    {
      question: 'What languages are supported?',
      answer:
        'MeetMind AI natively supports English and Urdu, including code-switched (mixed English/Urdu) conversations commonly spoken in team meetings.',
    },
    {
      question: 'Does it work with in-person meetings?',
      answer:
        'Absolutely. You can record live in-person discussions using your browser microphone or upload pre-recorded MP3, WAV, or M4A audio files directly into MeetMind AI.',
    },
    {
      question: 'What happens if I lose internet mid-meeting?',
      answer:
        'The recording buffer stores audio locally in your browser session. Once your connection is restored, MeetMind AI automatically resumes uploading the chunked audio seamlessly.',
    },
    {
      question: 'Can I use this with my whole team?',
      answer:
        'Yes! MeetMind AI supports organization-wide workspaces where teams can share transcripts, search across historical meeting vector memories, and track shared action items.',
    },
    {
      question: 'How does the Chrome extension integration work?',
      answer:
        'The MeetMind Chrome extension attaches to Google Meet or tab audio, streaming low-latency chunks directly to the MeetMind processing pipeline for real-time analysis.',
    },
  ]

  return (
    <div className="w-full bg-[#0B0F14] text-[#F1F5F9] font-sans min-h-screen">
      {/* A. Hero Container */}
      <section id="hero">
        <LandingHero
          onGetStarted={onNavigateAuth}
          onSignIn={onNavigateAuth}
          onScrollToSection={handleScrollToSection}
          isAuthenticated={isAuthenticated}
          onNavigateDashboard={onNavigateDashboard}
        />
      </section>

      {/* B. Trusted-By Strip */}
      <TrustedStrip />

      {/* C. Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <SectionLabel icon={<Zap className="w-3.5 h-3.5" />} className="mb-3">
            Core Capabilities
          </SectionLabel>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#F1F5F9] tracking-tight mb-4">
            Everything you need for effortless meeting intelligence.
          </h2>
          <p className="text-sm sm:text-base text-[#8B96A5] font-normal leading-relaxed">
            From live audio capture to cross-meeting vector search, MeetMind AI turns every conversation into searchable team knowledge.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feat, idx) => (
            <FeatureCard
              key={feat.title}
              icon={feat.icon}
              title={feat.title}
              description={feat.description}
              index={idx}
            />
          ))}
        </div>
      </section>

      {/* D. "Why MeetMind" Stats Section */}
      <section id="why-meetmind" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-[#12171F] border border-[#232B36] rounded-xl p-8 sm:p-12">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <SectionLabel icon={<TrendingUp className="w-3.5 h-3.5" />} className="mb-3">
              Why MeetMind
            </SectionLabel>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#F1F5F9] tracking-tight mb-3">
              Measurable impact on team velocity
            </h2>
            <p className="text-xs sm:text-sm text-[#8B96A5] font-normal leading-relaxed">
              Real outcomes experienced by engineering, product, and leadership teams.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, idx) => (
              <StatCard
                key={stat.label}
                value={stat.value}
                label={stat.label}
                subtext={stat.subtext}
                icon={stat.icon}
                index={idx}
                isIllustrative={true}
              />
            ))}
          </div>
        </div>
      </section>

      {/* E. FAQ Accordion Section */}
      <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <SectionLabel icon={<HelpCircle className="w-3.5 h-3.5" />} className="mb-3">
            Got Questions?
          </SectionLabel>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F1F5F9] tracking-tight mb-3">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-[#8B96A5] font-normal leading-relaxed">
            Everything you need to know about privacy, language support, and workspace features.
          </p>
        </div>

        <div className="flex flex-col gap-3.5">
          {faqs.map((faq, idx) => (
            <FaqAccordionItem
              key={faq.question}
              question={faq.question}
              answer={faq.answer}
              isOpen={openFaqIndex === idx}
              onToggle={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
              index={idx}
            />
          ))}
        </div>
      </section>

      {/* F. Final CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="bg-[#12171F] border border-[#232B36] rounded-xl p-8 sm:p-14 text-center text-[#F1F5F9] relative overflow-hidden"
        >
          <div className="relative z-10 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#22C55E1A] text-[#22C55E] text-xs font-semibold uppercase tracking-wider mb-6 border border-[#22C55E33]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ready to transform your meetings?</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4 text-[#F1F5F9]">
              Start capturing intelligent meeting insights today.
            </h2>

            <p className="text-sm sm:text-base text-[#8B96A5] font-normal leading-relaxed mb-8 max-w-xl mx-auto">
              Join teams saving hours every week with automated transcriptions, summaries, and instant AI search.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={isAuthenticated && onNavigateDashboard ? onNavigateDashboard : onNavigateAuth}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] text-[#0B0F14] font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isAuthenticated ? 'Go to Workspace Dashboard' : 'Get Started Free'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {!isAuthenticated && (
                <button
                  type="button"
                  onClick={onNavigateAuth}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#1A212C] hover:bg-[#232B36] text-[#F1F5F9] font-bold text-sm border border-[#232B36] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </section>

      {/* G. Footer */}
      <LandingFooter onNavigateAuth={onNavigateAuth} />
    </div>
  )
}
