import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isConfirming?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isConfirming = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-[#18181b] border border-[#27272a] rounded-xl p-6 shadow-2xl"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#ef44441a] flex items-center justify-center text-[#ef4444] shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#fafafa] mb-1">{title}</h3>
              <p className="text-xs text-[#a1a1aa] leading-relaxed mb-6">{message}</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#27272a]">
            <button
              type="button"
              onClick={onCancel}
              disabled={isConfirming}
              className="px-4 py-2 text-xs font-medium text-[#a1a1aa] hover:text-[#fafafa] bg-[#1f1f23] hover:bg-[#27272a] border border-[#27272a] rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#2563eb] disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isConfirming}
              className="px-4 py-2 text-xs font-medium text-white bg-[#ef4444] hover:bg-[#dc2626] rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#ef4444] disabled:opacity-50 flex items-center gap-2"
            >
              {isConfirming ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
