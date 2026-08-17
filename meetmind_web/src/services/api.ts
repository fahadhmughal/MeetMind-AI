import { supabase } from './supabase'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export interface MeetingDetailsResponse {
  status: string
  meeting: {
    id: string
    title: string
    description?: string
    status: string
    duration_seconds: number
    created_at: string
  }
  transcripts: Array<{
    id: string
    speaker: string
    content: string
    start_time: number
    end_time: number
  }>
  summary?: {
    executive_summary: string
    key_discussion_points: string[]
  }
  tasks: Array<{
    id: string
    title: string
    description?: string
    assignee_name?: string
    due_date?: string
    priority: string
    status?: string
  }>
  decisions: Array<{
    id: string
    decision_text: string
    context?: string
  }>
}

export interface UploadMeetingResponse {
  meeting_id: string
  title: string
  status: string
  duration_seconds: number
  utterances: Array<{
    speaker: string
    content: string
    start_time: number
    end_time: number
  }>
}

export interface MeetingAnalysisResponse {
  status: string
  meeting_id: string
  analysis: {
    summary: {
      executive_summary: string
      key_discussion_points: string[]
    }
    tasks: Array<{
      title: string
      description?: string
      assignee_name?: string
      due_date?: string
      priority: string
    }>
    decisions: Array<{
      decision_text: string
      context?: string
    }>
  }
}

export interface ChatResponse {
  status: string
  meeting_id: string
  scope: string
  result: {
    answer: string
    sources: string[]
  }
}

/**
 * Retrieves authorization headers containing the active Supabase access_token.
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {}
  try {
    const sessionPromise = supabase.auth.getSession()
    const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { session: null } }), 1500)
    )
    const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise])

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }
    if (session?.user?.id) {
      headers['X-User-Id'] = session.user.id
    }
  } catch (err) {
    console.warn('Could not retrieve Supabase session headers:', err)
  }

  // Direct localStorage fallback if session was not ready
  if (!headers['X-User-Id']) {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.endsWith('-auth-token') || key.includes('supabase.auth.token'))) {
          const raw = localStorage.getItem(key)
          if (raw) {
            const parsed = JSON.parse(raw)
            const token = parsed.access_token || parsed.currentSession?.access_token
            const userId = parsed.user?.id || parsed.currentSession?.user?.id
            if (token && !headers['Authorization']) headers['Authorization'] = `Bearer ${token}`
            if (userId && !headers['X-User-Id']) headers['X-User-Id'] = userId
          }
        }
      }
    } catch (lsErr) {
      console.warn('LocalStorage fallback auth notice:', lsErr)
    }
  }

  return headers
}

/**
 * Standardized fetch wrapper to handle backend connectivity and error states cleanly.
 */
async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const authHeaders = await getAuthHeaders()
  const combinedHeaders = {
    ...authHeaders,
    ...(options.headers as Record<string, string> || {}),
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: combinedHeaders,
    })
    return response
  } catch (err: any) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error(
        `Unable to connect to MeetMind Backend at ${API_BASE_URL}. Please confirm 'python main.py' is running and active.`
      )
    }
    throw err
  }
}

export async function listMeetings(): Promise<Array<{
  id: string
  title: string
  description?: string
  status: string
  duration_seconds: number
  created_at: string
}>> {
  const response = await apiFetch('/api/v1/meetings', {
    method: 'GET',
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to fetch meetings.')
  }

  const data = await response.json()
  return data.meetings || []
}

export async function uploadMeetingAudio(
  audioBlob: Blob,
  title: string,
  description?: string
): Promise<UploadMeetingResponse> {
  const { data: { session } } = await supabase.auth.getSession()
  const formData = new FormData()
  formData.append('file', audioBlob, 'recording.wav')
  formData.append('title', title)
  if (description) {
    formData.append('description', description)
  }
  if (session?.user?.id) {
    formData.append('user_id', session.user.id)
  }

  const response = await apiFetch('/api/v1/meetings/upload', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to upload meeting audio.')
  }

  return response.json()
}

export async function getMeetingDetails(meetingId: string): Promise<MeetingDetailsResponse> {
  const response = await apiFetch(`/api/v1/meetings/${meetingId}`, {
    method: 'GET',
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to fetch meeting details.')
  }

  return response.json()
}

export async function updateSpeakerLabels(
  meetingId: string,
  speakerMap: Record<string, string>
): Promise<{ status: string; updated_utterances: number }> {
  const response = await apiFetch(`/api/v1/meetings/${meetingId}/speakers`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ speaker_map: speakerMap }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to rename speakers.')
  }

  return response.json()
}

export async function analyzeMeeting(meetingId: string): Promise<MeetingAnalysisResponse> {
  const response = await apiFetch(`/api/v1/meetings/${meetingId}/analyze`, {
    method: 'POST',
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to analyze meeting.')
  }

  return response.json()
}

export async function sendMeetingChatQuery(
  meetingId: string,
  query: string,
  scope: 'meeting' | 'organization' = 'meeting',
  organizationId?: string
): Promise<ChatResponse> {
  const response = await apiFetch(`/api/v1/meetings/${meetingId}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      scope,
      organization_id: organizationId,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to send chat query.')
  }

  return response.json()
}

export async function deleteMeeting(meetingId: string): Promise<{ status: string; message: string }> {
  const response = await apiFetch(`/api/v1/meetings/${meetingId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to delete meeting.')
  }

  return response.json()
}
