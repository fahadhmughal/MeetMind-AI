import React from 'react'

export const EmptyStateIllustration: React.FC<{ className?: string }> = ({ className = 'w-44 h-44' }) => (
  <svg
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="100" cy="100" r="80" fill="#12171F" />
    <path
      d="M60 140C60 115 80 95 100 95C120 95 140 115 140 140"
      stroke="#22C55E"
      strokeWidth="6"
      strokeLinecap="round"
    />
    <rect x="65" y="55" width="70" height="50" rx="8" fill="#12171F" stroke="#232B36" strokeWidth="4" />
    <circle cx="85" cy="80" r="5" fill="#22C55E" />
    <circle cx="100" cy="80" r="5" fill="#22C55E" />
    <circle cx="115" cy="80" r="5" fill="#22C55E" />
    <path d="M75 70H125" stroke="#8B96A5" strokeWidth="3" strokeLinecap="round" />
    <path d="M130 50L145 35" stroke="#22C55E" strokeWidth="4" strokeLinecap="round" />
    <path d="M70 50L55 35" stroke="#22C55E" strokeWidth="4" strokeLinecap="round" />
  </svg>
)

export const NoSearchResultsIllustration: React.FC<{ className?: string }> = ({ className = 'w-40 h-40' }) => (
  <svg
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="100" cy="100" r="80" fill="#12171F" />
    <circle cx="90" cy="90" r="40" stroke="#EF4444" strokeWidth="6" fill="#12171F" />
    <line x1="120" y1="120" x2="155" y2="155" stroke="#EF4444" strokeWidth="8" strokeLinecap="round" />
    <path d="M75 90H105" stroke="#8B96A5" strokeWidth="4" strokeLinecap="round" />
  </svg>
)

export const AuthHeroIllustration: React.FC<{ className?: string }> = ({ className = 'w-full h-auto' }) => (
  <svg
    viewBox="0 0 400 320"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect x="20" y="20" width="360" height="280" rx="16" fill="#0B0F14" stroke="#232B36" strokeWidth="3" />
    {/* Header bar */}
    <rect x="20" y="20" width="360" height="40" rx="16" fill="#12171F" />
    <line x1="20" y1="60" x2="380" y2="60" stroke="#232B36" strokeWidth="2" />
    <circle cx="45" cy="40" r="6" fill="#EF4444" />
    <circle cx="65" cy="40" r="6" fill="#F59E0B" />
    <circle cx="85" cy="40" r="6" fill="#22C55E" />
    
    {/* Dashboard Grid Mockup */}
    <rect x="40" y="80" width="150" height="80" rx="8" fill="#12171F" stroke="#232B36" strokeWidth="2" />
    <rect x="55" y="95" width="80" height="10" rx="3" fill="#232B36" />
    <rect x="55" y="115" width="50" height="24" rx="4" fill="#22C55E1A" />
    <text x="63" y="132" fill="#22C55E" fontSize="14" fontWeight="bold">98.4%</text>

    <rect x="210" y="80" width="150" height="80" rx="8" fill="#12171F" stroke="#232B36" strokeWidth="2" />
    <rect x="225" y="95" width="90" height="10" rx="3" fill="#232B36" />
    <path d="M225 140 Q250 120 275 130 T325 110 T345 125" stroke="#22C55E" strokeWidth="3" fill="none" />

    <rect x="40" y="175" width="320" height="105" rx="8" fill="#12171F" stroke="#232B36" strokeWidth="2" />
    <circle cx="65" cy="205" r="14" fill="#22C55E1A" />
    <path d="M60 205L64 209L71 201" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="90" y="195" width="120" height="10" rx="3" fill="#F1F5F9" />
    <rect x="90" y="210" width="180" height="8" rx="2" fill="#8B96A5" />

    <circle cx="65" cy="250" r="14" fill="#3B82F61A" />
    <rect x="90" y="240" width="100" height="10" rx="3" fill="#F1F5F9" />
    <rect x="90" y="255" width="140" height="8" rx="2" fill="#8B96A5" />
  </svg>
)

export const NoTasksIllustration: React.FC<{ className?: string }> = ({ className = 'w-32 h-32' }) => (
  <svg
    viewBox="0 0 160 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="80" cy="80" r="64" fill="#22C55E1A" />
    <path d="M50 80L70 100L110 60" stroke="#22C55E" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
