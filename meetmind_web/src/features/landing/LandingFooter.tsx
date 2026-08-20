import React from 'react'
import { Brain, Sparkles, Shield, Globe, Share2, Code } from 'lucide-react'

export interface LandingFooterProps {
  onNavigateAuth: () => void
}

export const LandingFooter: React.FC<LandingFooterProps> = ({ onNavigateAuth }) => {
  return (
    <footer className="bg-[#0B0F14] border-t border-[#232B36] mt-20 pt-16 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-10 mb-12">
        {/* Brand Column */}
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#22C55E] flex items-center justify-center text-[#0B0F14] font-bold">
              <Brain className="w-4 h-4" />
            </div>
            <span className="text-lg font-extrabold text-[#F1F5F9] tracking-tight">
              MeetMind AI
            </span>
          </div>
          <p className="text-xs text-[#8B96A5] leading-relaxed max-w-sm mb-6 font-normal">
            Turn meeting audio into actionable team intelligence. Real-time recording, speaker diarization, automated summaries, and grounded vector search.
          </p>
          <div className="flex items-center gap-3 text-[#8B96A5]">
            <a href="#globe" className="p-2 rounded-lg bg-[#12171F] border border-[#232B36] hover:text-[#22C55E] hover:border-[#22C55E33] transition-colors" title="Global Web">
              <Globe className="w-4 h-4" />
            </a>
            <a href="#share" className="p-2 rounded-lg bg-[#12171F] border border-[#232B36] hover:text-[#22C55E] hover:border-[#22C55E33] transition-colors" title="Share Workspace">
              <Share2 className="w-4 h-4" />
            </a>
            <a href="#code" className="p-2 rounded-lg bg-[#12171F] border border-[#232B36] hover:text-[#22C55E] hover:border-[#22C55E33] transition-colors" title="Developer API">
              <Code className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Column 1: Product */}
        <div>
          <h4 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider mb-4">Product</h4>
          <ul className="space-y-2.5 text-xs text-[#8B96A5] font-medium">
            <li><a href="#features" className="hover:text-[#22C55E] transition-colors">Real-Time Recording</a></li>
            <li><a href="#features" className="hover:text-[#22C55E] transition-colors">Speaker Diarization</a></li>
            <li><a href="#features" className="hover:text-[#22C55E] transition-colors">Vector Memory Search</a></li>
            <li><a href="#features" className="hover:text-[#22C55E] transition-colors">Bilingual Support (Urdu/EN)</a></li>
            <li><a href="#chrome-extension" className="hover:text-[#22C55E] transition-colors">Chrome Extension</a></li>
          </ul>
        </div>

        {/* Column 2: Company */}
        <div>
          <h4 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider mb-4">Company</h4>
          <ul className="space-y-2.5 text-xs text-[#8B96A5] font-medium">
            <li><a href="#why-meetmind" className="hover:text-[#22C55E] transition-colors">Why MeetMind</a></li>
            <li><a href="#faq" className="hover:text-[#22C55E] transition-colors">FAQ & Support</a></li>
            <li><button type="button" onClick={onNavigateAuth} className="hover:text-[#22C55E] transition-colors cursor-pointer">Sign In</button></li>
            <li><button type="button" onClick={onNavigateAuth} className="hover:text-[#22C55E] transition-colors cursor-pointer">Get Started Free</button></li>
          </ul>
        </div>

        {/* Column 3: Legal & Security */}
        <div>
          <h4 className="text-xs font-bold text-[#F1F5F9] uppercase tracking-wider mb-4">Legal & Security</h4>
          <ul className="space-y-2.5 text-xs text-[#8B96A5] font-medium">
            <li><a href="#privacy" className="hover:text-[#22C55E] transition-colors">Privacy Policy</a></li>
            <li><a href="#terms" className="hover:text-[#22C55E] transition-colors">Terms of Service</a></li>
            <li><a href="#security" className="hover:text-[#22C55E] transition-colors flex items-center gap-1"><Shield className="w-3 h-3 text-[#22C55E]" /> Enterprise Security</a></li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-8 border-t border-[#232B36] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8B96A5] font-medium">
        <p>© {new Date().getFullYear()} MeetMind AI Inc. All rights reserved.</p>
        <p className="flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-[#22C55E]" />
          <span>Engineered for modern team intelligence</span>
        </p>
      </div>
    </footer>
  )
}
