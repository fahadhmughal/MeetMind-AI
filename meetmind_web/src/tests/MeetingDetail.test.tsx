import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MeetingDetailPage } from '../features/meetings/MeetingDetailPage'
import { ToastProvider } from '../components/ui/Toast'
import * as api from '../services/api'

vi.mock('../services/api', () => ({
  getMeetingDetails: vi.fn(),
  updateSpeakerLabels: vi.fn(),
  analyzeMeeting: vi.fn(),
  sendMeetingChatQuery: vi.fn(),
}))

describe('MeetingDetailPage Component', () => {
  it('renders meeting details and transcript correctly', async () => {
    vi.mocked(api.getMeetingDetails).mockResolvedValue({
      status: 'success',
      meeting: {
        id: 'm1',
        title: 'Strategy Sync',
        status: 'completed',
        duration_seconds: 120,
        created_at: new Date().toISOString(),
      },
      transcripts: [
        { id: 't1', speaker: 'Speaker 1', content: 'We need to launch on Friday.', start_time: 0.0, end_time: 5.0 },
      ],
      summary: {
        executive_summary: 'Launch planned for Friday.',
        key_discussion_points: ['Deployment schedule'],
      },
      tasks: [],
      decisions: [],
    })

    render(
      <ToastProvider>
        <MeetingDetailPage meetingId="m1" onBack={vi.fn()} />
      </ToastProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Strategy Sync')).toBeInTheDocument()
    })

    expect(screen.getByText('Speaker 1')).toBeInTheDocument()
    expect(screen.getByText('We need to launch on Friday.')).toBeInTheDocument()
  })
})
