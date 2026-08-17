import React from 'react'
import { User, Calendar, CheckSquare } from 'lucide-react'
import { Badge } from './Badge'

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
        return 'bg-[#ef44441a] text-[#ef4444] border-[#ef444433]'
      case 'medium':
        return 'bg-[#f59e0b1a] text-[#f59e0b] border-[#f59e0b33]'
      case 'low':
        return 'bg-[#22c55e1a] text-[#22c55e] border-[#22c55e33]'
      default:
        return 'bg-[#1f1f23] text-[#a1a1aa] border-[#27272a]'
    }
  }

  return (
    <div
      className={`p-4 rounded-xl bg-[#18181b] border border-[#27272a] hover:border-[#2563eb66] transition-all shadow-sm flex flex-col gap-2 mb-3 last:mb-0 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <CheckSquare className="w-4 h-4 text-[#2563eb] shrink-0 mt-0.5" />
          <h4 className="text-xs font-semibold text-[#fafafa] leading-snug">{title}</h4>
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
        <p className="text-xs text-[#a1a1aa] pl-6 leading-relaxed">{description}</p>
      )}

      <div className="flex flex-wrap items-center gap-4 text-xs text-[#a1a1aa] pl-6 pt-2 mt-1 border-t border-[#27272a]">
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-[#3b82f6]" />
          <span>
            <strong className="text-[#fafafa] font-medium">Owner:</strong>{' '}
            {assigneeName && assigneeName.trim() ? assigneeName : 'Unassigned'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-[#3b82f6]" />
          <span>
            <strong className="text-[#fafafa] font-medium">Deadline:</strong>{' '}
            {dueDate && dueDate.trim() ? (
              <span className="text-[#2563eb] font-semibold px-1.5 py-0.5 rounded bg-[#2563eb1a]">
                {dueDate}
              </span>
            ) : (
              <span className="text-[#71717a]">No fixed date</span>
            )}
          </span>
        </div>
      </div>
    </div>
  )
}
