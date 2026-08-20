import React from 'react'

export interface BadgeProps {
  status: 'completed' | 'processing' | 'pending' | 'scheduled' | 'failed' | string
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  const normalized = status.toLowerCase()

  let style = 'bg-[#1A212C] text-[#8B96A5] border-[#232B36]'
  if (normalized === 'completed' || normalized === 'success' || normalized === 'paid') {
    style = 'bg-[#22C55E1A] text-[#22C55E] border-[#22C55E33]'
  } else if (normalized === 'processing' || normalized === 'pending' || normalized === 'risk' || normalized === 'in progress') {
    style = 'bg-[#F59E0B1A] text-[#F59E0B] border-[#F59E0B33]'
  } else if (normalized === 'scheduled' || normalized === 'info') {
    style = 'bg-[#3B82F61A] text-[#3B82F6] border-[#3B82F633]'
  } else if (normalized === 'failed' || normalized === 'error' || normalized === 'high') {
    style = 'bg-[#EF44441A] text-[#EF4444] border-[#EF444433]'
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border capitalize tracking-tight ${style} ${className}`}
    >
      {status}
    </span>
  )
}
