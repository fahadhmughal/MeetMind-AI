import React, { forwardRef } from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label className="text-xs font-medium text-[#a1a1aa]">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3 text-[#71717a] pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full bg-[#18181b] border rounded-lg px-3.5 py-2 text-xs text-[#fafafa] placeholder-[#71717a] transition-all focus:outline-none focus:ring-2 ${
              icon ? 'pl-9' : ''
            } ${
              error
                ? 'border-[#ef4444] focus:ring-[#ef4444]'
                : 'border-[#27272a] focus:border-[#2563eb] focus:ring-[#2563eb]'
            } ${className}`}
            {...props}
          />
        </div>
        {error && (
          <span className="text-[11px] text-[#ef4444] font-medium">
            {error}
          </span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
