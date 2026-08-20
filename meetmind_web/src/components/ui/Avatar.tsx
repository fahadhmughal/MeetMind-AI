import React from 'react'

export interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
  xl: 'w-12 h-12 text-base',
}

// Curated palette of modern, solid professional background colors
const AVATAR_PALETTE = [
  'bg-[#16A34A]', // Dark Emerald
  'bg-[#2563EB]', // Royal Blue
  'bg-[#7C3AED]', // Deep Purple
  'bg-[#DB2777]', // Magenta
  'bg-[#D97706]', // Warm Amber
  'bg-[#0891B2]', // Deep Cyan
  'bg-[#059669]', // Teal
  'bg-[#0284C7]', // Sky Blue
  'bg-[#EA580C]', // Deep Orange
]

function hashString(str: string): number {
  let hash = 0
  const cleanStr = (str || 'User').trim().toLowerCase()
  for (let i = 0; i < cleanStr.length; i++) {
    hash = cleanStr.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

export const Avatar: React.FC<AvatarProps> = ({ name, size = 'md', className = '' }) => {
  const cleanName = (name || 'Speaker').trim()
  
  // Extract initials (e.g. "Fahad Mughal" -> "FM", "Speaker 1" -> "S1", "user@email.com" -> "U")
  let initials = ''
  if (cleanName.includes('@')) {
    initials = cleanName.charAt(0).toUpperCase()
  } else {
    const parts = cleanName.split(' ').filter(Boolean)
    if (parts.length >= 2) {
      initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    } else if (parts.length === 1) {
      initials = parts[0].substring(0, 2).toUpperCase()
    } else {
      initials = 'S'
    }
  }

  const colorIndex = hashString(cleanName) % AVATAR_PALETTE.length
  const bgColorClass = AVATAR_PALETTE[colorIndex]

  return (
    <div
      className={`${sizeClasses[size]} rounded-full ${bgColorClass} text-white font-extrabold flex items-center justify-center shrink-0 border border-white/10 select-none ${className}`}
      title={cleanName}
    >
      <span>{initials}</span>
    </div>
  )
}
