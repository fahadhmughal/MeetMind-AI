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
      className={`p-4 rounded-xl bg-[#18181b] border border-[#27272a] hover:border-[#22c55e33] transition-all shadow-sm flex items-start gap-3 mb-3 last:mb-0 ${className}`}
    >
      <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-xs font-semibold text-[#fafafa] leading-snug">{decisionText}</p>
        {context && <p className="text-xs text-[#a1a1aa] mt-1 leading-relaxed">{context}</p>}
      </div>
    </div>
  )
}
