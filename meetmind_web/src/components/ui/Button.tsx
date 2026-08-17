import React from 'react'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  children: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  children,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 focus:ring-offset-[#09090b] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs'

  const variants = {
    primary:
      'bg-[#2563eb] hover:bg-[#1d4ed8] text-white border border-blue-400/20 active:bg-[#1e40af]',
    secondary:
      'bg-[#18181b] hover:bg-[#1f1f23] text-[#fafafa] border border-[#27272a] active:bg-[#09090b]',
    outline:
      'border border-[#27272a] bg-[#18181b]/60 hover:bg-[#1f1f23] text-[#fafafa] hover:border-[#3f3f46] active:bg-[#09090b]',
    danger:
      'bg-[#ef4444] hover:bg-[#dc2626] text-[#fafafa] active:bg-[#b91c1c]',
    ghost:
      'bg-transparent hover:bg-[#1f1f23] text-[#a1a1aa] hover:text-[#fafafa]',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-xs font-semibold gap-2',
    lg: 'px-5 py-2.5 text-sm font-semibold gap-2.5',
  }

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Processing...</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}
