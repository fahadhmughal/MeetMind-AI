import React from 'react'
import { CheckCircle2 } from 'lucide-react'

export interface DecisionItemProps {
  id?: string
  decisionText: string
  context?: string | null
  className?: string
}

export const DecisionItem: React.FC<DecisionItemProps> = ({
  decisionText,
  context,
  className = '',
}) => {
  return (
    <div
      className={`p-4 rounded-xl bg-[#12171F] border border-[#232B36] hover:border-[#22C55E]/50 transition-all flex items-start gap-3 mb-3 last:mb-0 ${className}`}
    >
      <div className="w-5 h-5 rounded bg-[#22C55E1A] text-[#22C55E] flex items-center justify-center shrink-0 mt-0.5 border border-[#22C55E33]">
        <CheckCircle2 className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-semibold text-[#F1F5F9] leading-snug">{decisionText}</p>
        {context && <p className="text-xs text-[#8B96A5] mt-1 leading-relaxed">{context}</p>}
      </div>
    </div>
  )
}
