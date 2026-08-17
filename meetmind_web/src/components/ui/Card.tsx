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
      className={`bg-[#18181b]/85 backdrop-blur-md border border-[#27272a] rounded-xl p-5 transition-all shadow-sm ${
        interactive ? 'hover:bg-[#1f1f23]/90 hover:border-[#3f3f46] cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
