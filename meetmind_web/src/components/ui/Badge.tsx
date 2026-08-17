import React from 'react'

export interface BadgeProps {
  status: 'completed' | 'processing' | 'pending' | 'scheduled' | 'failed' | string
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  const normalized = status.toLowerCase()

  let style = 'bg-[#1f1f23] text-[#a1a1aa] border-[#27272a]'
  if (normalized === 'completed' || normalized === 'success') {
    style = 'bg-[#22c55e1a] text-[#22c55e] border-[#22c55e33]'
  } else if (normalized === 'processing' || normalized === 'pending' || normalized === 'risk') {
    style = 'bg-[#f59e0b1a] text-[#f59e0b] border-[#f59e0b33]'
  } else if (normalized === 'scheduled' || normalized === 'info') {
    style = 'bg-[#3b82f61a] text-[#3b82f6] border-[#3b82f633]'
  } else if (normalized === 'failed' || normalized === 'error') {
    style = 'bg-[#ef44441a] text-[#ef4444] border-[#ef444433]'
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border capitalize tracking-tight ${style} ${className}`}
    >
      {status}
    </span>
  )
}
