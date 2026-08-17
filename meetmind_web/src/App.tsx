import { useState, useEffect } from 'react'
import { supabase } from './services/supabase'
import { Navbar } from './components/Navbar'
import { AuthPage } from './features/auth/AuthPage'
import { MeetingListPage } from './features/meetings/MeetingListPage'
import { RecordingPage } from './features/recording/RecordingPage'
import { MeetingDetailPage } from './features/meetings/MeetingDetailPage'
import { OrgChatPage } from './features/chat/OrgChatPage'
import { ToastProvider } from './components/ui/Toast'
import { BackgroundAnimation } from './components/ui/BackgroundAnimation'

export function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'recording' | 'detail' | 'org_chat' | 'auth'>('auth')
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [loadingSession, setLoadingSession] = useState<boolean>(true)

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user
      if (user && (user.email_confirmed_at || user.confirmed_at)) {
        setUserEmail(user.email || null)
        setIsAuthenticated(true)
        setCurrentView('dashboard')
      } else {
        setUserEmail(null)
        setIsAuthenticated(false)
        setCurrentView('auth')
      }
      setLoadingSession(false)
    })

    // Listen for auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user
      if (user && (user.email_confirmed_at || user.confirmed_at)) {
        setUserEmail(user.email || null)
        setIsAuthenticated(true)
      } else {
        setUserEmail(null)
        setIsAuthenticated(false)
        setCurrentView('auth')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUserEmail(null)
    setIsAuthenticated(false)
    setCurrentView('auth')
  }

  const handleAuthSuccess = (email: string) => {
    setUserEmail(email)
    setIsAuthenticated(true)
    setCurrentView('dashboard')
  }

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-[#a1a1aa] font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium">Loading MeetMind AI...</p>
        </div>
      </div>
    )
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col font-sans selection:bg-[#2563eb] selection:text-white relative overflow-x-hidden">
        <BackgroundAnimation />
        <Navbar
          currentView={currentView === 'detail' || currentView === 'org_chat' ? 'dashboard' : currentView}
          onNavigate={(view) => {
            if (!isAuthenticated && view !== 'auth') {
              setCurrentView('auth')
              return
            }
            setCurrentView(view)
          }}
          userEmail={userEmail}
          onSignOut={handleSignOut}
        />

        <main className="flex-1 relative z-10">
          {!isAuthenticated || currentView === 'auth' ? (
            <AuthPage onAuthSuccess={handleAuthSuccess} />
          ) : (
            <>
              {currentView === 'dashboard' && (
                <MeetingListPage
                  onStartRecording={() => setCurrentView('recording')}
                  onSelectMeeting={(id) => {
                    setSelectedMeetingId(id)
                    setCurrentView('detail')
                  }}
                />
              )}

              {currentView === 'recording' && (
                <RecordingPage
                  onRecordingComplete={() => setCurrentView('dashboard')}
                  onCancel={() => setCurrentView('dashboard')}
                />
              )}

              {currentView === 'detail' && selectedMeetingId && (
                <MeetingDetailPage
                  meetingId={selectedMeetingId}
                  onBack={() => setCurrentView('dashboard')}
                />
              )}

              {currentView === 'org_chat' && <OrgChatPage />}
            </>
          )}
        </main>
      </div>
    </ToastProvider>
  )
}

export default App
