import React, { useState } from 'react'
import { Brain, Mic, LogOut, LayoutDashboard, User as UserIcon, Menu, X } from 'lucide-react'
import { Button } from './ui/Button'
import { Avatar } from './ui/Avatar'

export interface NavbarProps {
  currentView: 'landing' | 'dashboard' | 'recording' | 'auth'
  onNavigate: (view: 'landing' | 'dashboard' | 'recording' | 'auth') => void
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

  // Don't render top navbar if on landing page because landing page embeds its own unified inset hero navbar
  if (currentView === 'landing') {
    return null
  }

  return (
    <nav className="w-full bg-[#0B0F14]/90 backdrop-blur-md border-b border-[#232B36] sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-3">
      <div className="flex items-center justify-between">
        {/* Brand Logo */}
        <div
          className="flex items-center gap-2.5 cursor-pointer group"
          onClick={() => onNavigate(userEmail ? 'dashboard' : 'landing')}
          title={userEmail ? "Go to Workspace Dashboard" : "Go to Public Landing Page"}
        >
          <div className="w-8 h-8 rounded-lg bg-[#22C55E] flex items-center justify-center text-[#0B0F14] font-bold group-hover:bg-[#16A34A] transition-colors">
            <Brain className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold text-[#F1F5F9] tracking-tight">
              MeetMind AI
            </span>
            <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-[#22C55E1A] text-[#22C55E] border border-[#22C55E33]">
              Pro
            </span>
          </div>
        </div>

        {/* Desktop Nav Items */}
        <div className="hidden md:flex items-center gap-3">
          {currentView !== 'auth' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate(userEmail ? 'dashboard' : 'landing')}
              >
                <span>{userEmail ? 'Home' : 'Landing Page'}</span>
              </Button>

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
                <Mic className="w-3.5 h-3.5 text-[#EF4444]" />
                <span>Record Meeting</span>
              </Button>

              {userEmail ? (
                <div className="flex items-center gap-2 pl-3 border-l border-[#232B36]">
                  <Avatar name={userEmail} size="md" />
                  <Button variant="ghost" size="sm" onClick={onSignOut} title="Sign Out">
                    <LogOut className="w-3.5 h-3.5 text-[#8B96A5] hover:text-[#F1F5F9]" />
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

          {currentView === 'auth' && (
            <Button variant="ghost" size="sm" onClick={() => onNavigate('landing')}>
              <span>Back to Home</span>
            </Button>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="md:hidden flex items-center gap-2">
          {currentView !== 'auth' ? (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#8B96A5] hover:text-[#F1F5F9] bg-[#12171F] border border-[#232B36] rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => onNavigate('landing')}>
              <span>Home</span>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && currentView !== 'auth' && (
        <div className="md:hidden pt-3 pb-2 border-t border-[#232B36] mt-3 flex flex-col gap-2 bg-[#12171F] p-3 rounded-xl border border-[#232B36]">
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
            <Mic className="w-4 h-4 text-[#EF4444]" />
            <span>Record Meeting</span>
          </Button>

          {userEmail ? (
            <div className="flex items-center justify-between pt-2 border-t border-[#232B36] px-2">
              <div className="flex items-center gap-2">
                <Avatar name={userEmail} size="sm" />
                <span className="text-xs text-[#8B96A5] font-medium">{userEmail}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={onSignOut}>
                <LogOut className="w-4 h-4 text-[#EF4444]" />
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
