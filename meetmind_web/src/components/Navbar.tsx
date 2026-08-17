import React, { useState } from 'react'
import { Brain, Mic, LogOut, LayoutDashboard, User as UserIcon, Menu, X } from 'lucide-react'
import { Button } from './ui/Button'

export interface NavbarProps {
  currentView: 'dashboard' | 'recording' | 'auth'
  onNavigate: (view: 'dashboard' | 'recording' | 'auth') => void
  userEmail?: string | null
  onSignOut?: () => void
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  userEmail,
  onSignOut,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="w-full bg-[#09090b] border-b border-[#27272a] sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-3">
      <div className="flex items-center justify-between">
        {/* Brand Logo */}
        <div
          className="flex items-center gap-2.5 cursor-pointer"
          onClick={() => onNavigate('dashboard')}
        >
          <div className="w-8 h-8 rounded-lg bg-[#2563eb] flex items-center justify-center text-white shadow-xs border border-blue-400/20">
            <Brain className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-[#fafafa] tracking-tight">
              MeetMind AI
            </span>
            <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-[#1f1f23] text-[#a1a1aa] border border-[#27272a]">
              Pro
            </span>
          </div>
        </div>

        {/* Desktop Nav Items */}
        <div className="hidden md:flex items-center gap-3">
          {currentView !== 'auth' && (
            <>
              <Button
                variant={currentView === 'dashboard' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => onNavigate('dashboard')}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </Button>

              <Button
                variant={currentView === 'recording' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => onNavigate('recording')}
              >
                <Mic className="w-3.5 h-3.5 text-[#ef4444]" />
                <span>Record Meeting</span>
              </Button>

              {userEmail ? (
                <div className="flex items-center gap-2 pl-3 border-l border-[#27272a]">
                  <div className="w-7 h-7 rounded-full bg-[#1f1f23] border border-[#27272a] flex items-center justify-center text-xs font-semibold text-[#fafafa]">
                    {userEmail[0].toUpperCase()}
                  </div>
                  <Button variant="ghost" size="sm" onClick={onSignOut} title="Sign Out">
                    <LogOut className="w-3.5 h-3.5 text-[#a1a1aa]" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => onNavigate('auth')}>
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Button>
              )}
            </>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="md:hidden flex items-center gap-2">
          {currentView !== 'auth' && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#a1a1aa] hover:text-[#fafafa] bg-[#18181b] border border-[#27272a] rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && currentView !== 'auth' && (
        <div className="md:hidden pt-3 pb-2 border-t border-[#27272a] mt-3 flex flex-col gap-2">
          <Button
            variant={currentView === 'dashboard' ? 'primary' : 'ghost'}
            size="sm"
            className="w-full justify-start"
            onClick={() => {
              onNavigate('dashboard')
              setMobileMenuOpen(false)
            }}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </Button>

          <Button
            variant={currentView === 'recording' ? 'primary' : 'outline'}
            size="sm"
            className="w-full justify-start"
            onClick={() => {
              onNavigate('recording')
              setMobileMenuOpen(false)
            }}
          >
            <Mic className="w-4 h-4 text-[#ef4444]" />
            <span>Record Meeting</span>
          </Button>

          {userEmail ? (
            <div className="flex items-center justify-between pt-2 border-t border-[#27272a] px-2">
              <span className="text-xs text-[#a1a1aa]">{userEmail}</span>
              <Button variant="ghost" size="sm" onClick={onSignOut}>
                <LogOut className="w-4 h-4 text-[#ef4444]" />
                <span>Sign Out</span>
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                onNavigate('auth')
                setMobileMenuOpen(false)
              }}
            >
              <UserIcon className="w-4 h-4" />
              <span>Sign In</span>
            </Button>
          )}
        </div>
      )}
    </nav>
  )
}
