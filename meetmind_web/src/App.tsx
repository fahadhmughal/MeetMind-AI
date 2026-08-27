import { useState, useEffect } from 'react'
import { supabase } from './services/supabase'
import { Navbar } from './components/Navbar'
import { LandingPage } from './features/landing/LandingPage'
import { AuthPage } from './features/auth/AuthPage'
import { MeetingListPage } from './features/meetings/MeetingListPage'
import { RecordingPage } from './features/recording/RecordingPage'
import { MeetingDetailPage } from './features/meetings/MeetingDetailPage'
import { OrgChatPage } from './features/chat/OrgChatPage'
import { ToastProvider } from './components/ui/Toast'
import { BackgroundAnimation } from './components/ui/BackgroundAnimation'

export function App() {
  const [currentView, setCurrentView] = useState<
    'landing' | 'dashboard' | 'recording' | 'detail' | 'org_chat' | 'auth'
  >('landing')
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [loadingSession, setLoadingSession] = useState<boolean>(true)

  useEffect(() => {
    // Check URL parameters for direct meeting navigation (e.g. ?meetingId=uuid)
    const params = new URLSearchParams(window.location.search)
    const meetingIdFromUrl = params.get('meetingId') || params.get('meeting_id')
    if (meetingIdFromUrl) {
      setSelectedMeetingId(meetingIdFromUrl)
    }

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user
      if (user && (user.email_confirmed_at || user.confirmed_at)) {
        setUserEmail(user.email || null)
        setIsAuthenticated(true)
        if (meetingIdFromUrl) {
          setCurrentView('detail')
        } else {
          setCurrentView('dashboard')
        }
      } else {
        setUserEmail(null)
        setIsAuthenticated(false)
        if (meetingIdFromUrl) {
          setCurrentView('auth')
        } else {
          setCurrentView('landing')
        }
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
    setSelectedMeetingId(null)
    setCurrentView('landing')
  }

  const handleAuthSuccess = (email: string) => {
    setUserEmail(email)
    setIsAuthenticated(true)
    if (selectedMeetingId) {
      setCurrentView('detail')
    } else {
      setCurrentView('dashboard')
    }
  }

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-[#0B0F14] flex items-center justify-center text-[#8B96A5] font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium">Loading MeetMind AI...</p>
        </div>
      </div>
    )
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#0B0F14] text-[#F1F5F9] flex flex-col font-sans selection:bg-[#22C55E] selection:text-[#0B0F14] relative overflow-x-hidden">
        <BackgroundAnimation />
        <Navbar
          currentView={
            currentView === 'detail' || currentView === 'org_chat'
              ? 'dashboard'
              : currentView === 'landing'
              ? 'landing'
              : currentView
          }
          onNavigate={(view) => {
            if (view === 'landing') {
              setCurrentView(isAuthenticated ? 'dashboard' : 'landing')
              return
            }
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
          {currentView === 'landing' ? (
            <LandingPage
              isAuthenticated={isAuthenticated}
              onNavigateAuth={() => setCurrentView(isAuthenticated ? 'dashboard' : 'auth')}
              onNavigateDashboard={() => setCurrentView('dashboard')}
            />
          ) : !isAuthenticated || currentView === 'auth' ? (
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
