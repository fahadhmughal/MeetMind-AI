import React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  interactive?: boolean
}

export const Card: React.FC<CardProps> = ({
  children,
  interactive = false,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`bg-[#12171F] border border-[#232B36] text-[#F1F5F9] rounded-xl p-5 transition-all ${
        interactive ? 'hover:bg-[#1A212C] hover:border-[#232B36] cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
