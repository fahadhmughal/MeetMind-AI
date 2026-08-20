import React from 'react'
import { Calendar, CheckSquare } from 'lucide-react'
import { Badge } from './Badge'
import { Avatar } from './Avatar'

export interface TaskItemProps {
  id?: string
  title: string
  description?: string
  assigneeName?: string | null
  dueDate?: string | null
  priority?: 'low' | 'medium' | 'high' | string
  status?: string
  className?: string
}

export const TaskItem: React.FC<TaskItemProps> = ({
  title,
  description,
  assigneeName,
  dueDate,
  priority = 'medium',
  status = 'pending',
  className = '',
}) => {
  const getPriorityStyle = (p: string) => {
    switch (p?.toLowerCase()) {
      case 'high':
        return 'bg-[#EF44441A] text-[#EF4444] border-[#EF444433]'
      case 'medium':
        return 'bg-[#F59E0B1A] text-[#F59E0B] border-[#F59E0B33]'
      case 'low':
        return 'bg-[#22C55E1A] text-[#22C55E] border-[#22C55E33]'
      default:
        return 'bg-[#1A212C] text-[#8B96A5] border-[#232B36]'
    }
  }

  const owner = assigneeName && assigneeName.trim() ? assigneeName : 'Unassigned'

  return (
    <div
      className={`p-4 rounded-xl bg-[#12171F] border border-[#232B36] hover:border-[#22C55E]/50 transition-all flex flex-col gap-2.5 mb-3 last:mb-0 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <div className="w-5 h-5 rounded bg-[#22C55E1A] text-[#22C55E] flex items-center justify-center shrink-0 mt-0.5 border border-[#22C55E33]">
            <CheckSquare className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-xs font-semibold text-[#F1F5F9] leading-snug">{title}</h4>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider ${getPriorityStyle(
              priority
            )}`}
          >
            {priority}
          </span>
          <Badge status={status} />
        </div>
      </div>

      {description && (
        <p className="text-xs text-[#8B96A5] pl-7 leading-relaxed">{description}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#8B96A5] pl-7 pt-2 mt-1 border-t border-[#232B36]">
        <div className="flex items-center gap-2">
          <Avatar name={owner} size="sm" />
          <span>
            <strong className="text-[#F1F5F9] font-medium">Owner:</strong> {owner}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-[#8B96A5]">
          <Calendar className="w-3.5 h-3.5 text-[#22C55E]" />
          <span>
            <strong className="text-[#F1F5F9] font-medium">Deadline:</strong>{' '}
            {dueDate && dueDate.trim() ? (
              <span className="text-[#22C55E] font-semibold px-2 py-0.5 rounded bg-[#22C55E1A] border border-[#22C55E33]">
                {dueDate}
              </span>
            ) : (
              <span className="text-[#8B96A5]">No fixed date</span>
            )}
          </span>
        </div>
      </div>
    </div>
  )
}
