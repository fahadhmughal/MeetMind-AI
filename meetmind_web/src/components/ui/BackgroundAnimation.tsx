import React from 'react'

export const BackgroundAnimation: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none bg-[#09090b]"
    >
      {/* 1. Faint static dot-grid pattern (#27272a dots on #09090b, 24px spacing) */}
      <div className="absolute inset-0 bg-dot-grid opacity-75" />

      {/* 2. Slow-moving radial gradient glow (#2563EB at 4-5% max opacity, pure CSS 38s drift) */}
      <div className="absolute -top-1/4 -left-1/4 w-[1100px] h-[1100px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.05)_0%,rgba(37,99,235,0.02)_45%,transparent_70%)] animate-ambient-glow" />
    </div>
  )
}
