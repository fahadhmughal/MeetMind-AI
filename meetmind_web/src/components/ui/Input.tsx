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
          <label className="text-xs font-medium text-[#F1F5F9]">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3 text-[#8B96A5] pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full bg-[#12171F] border rounded-lg px-3.5 py-2 text-xs text-[#F1F5F9] placeholder-[#8B96A5] transition-all focus:outline-none focus:ring-2 ${
              icon ? 'pl-9' : ''
            } ${
              error
                ? 'border-[#EF4444] focus:ring-[#EF4444]'
                : 'border-[#232B36] focus:border-[#22C55E] focus:ring-[#22C55E]'
            } ${className}`}
            {...props}
          />
        </div>
        {error && (
          <span className="text-[11px] text-[#EF4444] font-medium">
            {error}
          </span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
