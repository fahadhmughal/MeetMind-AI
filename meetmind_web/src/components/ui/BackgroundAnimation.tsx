import React from 'react'

export const BackgroundAnimation: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none bg-[#0B0F14]"
    >
      {/* Ambient accent glow (#22C55E at 4-6% opacity) */}
      <div className="absolute -top-1/4 -left-1/4 w-[1100px] h-[1100px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(34,197,94,0.05)_0%,rgba(34,197,94,0.015)_45%,transparent_70%)] animate-ambient-glow" />
    </div>
  )
}
