import React from 'react'
import { motion } from 'framer-motion'

export interface StatCardProps {
  value: string
  label: string
  subtext?: string
  icon?: React.ReactNode
  index?: number
  isIllustrative?: boolean
  className?: string
}

export const StatCard: React.FC<StatCardProps> = ({
  value,
  label,
  subtext,
  icon,
  index = 0,
  isIllustrative = false,
  className = '',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className={`bg-[#12171F] border border-[#232B36] rounded-xl p-6 hover:bg-[#1A212C] transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${className}`}
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-3xl sm:text-4xl font-extrabold text-[#F1F5F9] tracking-tight">
            {value}
          </span>
          {icon && (
            <div className="w-10 h-10 rounded-xl bg-[#22C55E1A] text-[#22C55E] border border-[#22C55E33] flex items-center justify-center">
              {icon}
            </div>
          )}
        </div>
        <h4 className="text-sm font-bold text-[#F1F5F9] tracking-tight">{label}</h4>
        {subtext && <p className="text-xs text-[#8B96A5] mt-1 font-medium leading-relaxed">{subtext}</p>}
      </div>

      {isIllustrative && (
        <div className="mt-3 pt-3 border-t border-[#232B36] flex items-center justify-between">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-[#8B96A5]">
            *Illustrative benchmark
          </span>
        </div>
      )}
    </motion.div>
  )
}
