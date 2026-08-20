import React from 'react'
import { motion } from 'framer-motion'

export interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  index?: number
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  index = 0,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="bg-[#12171F] border border-[#232B36] rounded-xl p-6 hover:bg-[#1A212C] transition-all duration-300 group flex flex-col justify-between"
    >
      <div>
        <div className="w-12 h-12 rounded-xl bg-[#22C55E1A] border border-[#22C55E33] text-[#22C55E] flex items-center justify-center mb-5 group-hover:bg-[#22C55E] group-hover:text-[#0B0F14] transition-colors duration-300">
          {icon}
        </div>
        <h3 className="text-lg font-bold text-[#F1F5F9] tracking-tight mb-2 group-hover:text-[#22C55E] transition-colors">
          {title}
        </h3>
        <p className="text-sm text-[#8B96A5] leading-relaxed font-normal">
          {description}
        </p>
      </div>
    </motion.div>
  )
}
