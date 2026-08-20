import React from 'react'
import { motion } from 'framer-motion'
import { Video, Globe, Monitor, ShieldCheck } from 'lucide-react'

export const TrustedStrip: React.FC = () => {
  const platforms = [
    { name: 'Google Meet', icon: <Video className="w-4 h-4 text-[#22C55E]" /> },
    { name: 'Zoom Meetings', icon: <Globe className="w-4 h-4 text-[#3B82F6]" /> },
    { name: 'Microsoft Teams', icon: <Monitor className="w-4 h-4 text-[#3B82F6]" /> },
    { name: 'In-Person & MP3/WAV Uploads', icon: <ShieldCheck className="w-4 h-4 text-[#22C55E]" /> },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="w-full py-6 px-4 border-y border-[#232B36] bg-[#12171F] my-8"
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-center sm:text-left">
        <span className="text-xs font-bold uppercase tracking-wider text-[#8B96A5] shrink-0">
          Trusted by teams using:
        </span>
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs font-semibold text-[#F1F5F9]">
          {platforms.map((platform, idx) => (
            <React.Fragment key={platform.name}>
              <div className="flex items-center gap-2 bg-[#1A212C] px-3 py-1.5 rounded-lg border border-[#232B36] hover:bg-[#12171F] transition-colors">
                {platform.icon}
                <span>{platform.name}</span>
              </div>
              {idx < platforms.length - 1 && (
                <span className="hidden md:inline text-[#232B36] font-normal">•</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
