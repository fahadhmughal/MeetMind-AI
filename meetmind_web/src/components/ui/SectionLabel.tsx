import React from 'react'

export interface SectionLabelProps {
  children: React.ReactNode
  icon?: React.ReactNode
  className?: string
}

export const SectionLabel: React.FC<SectionLabelProps> = ({
  children,
  icon,
  className = '',
}) => {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#22C55E1A] text-[#22C55E] border border-[#22C55E33] text-xs font-semibold uppercase tracking-wider ${className}`}
    >
      {icon && <span className="w-3.5 h-3.5 flex items-center justify-center">{icon}</span>}
      <span>{children}</span>
    </div>
  )
}
