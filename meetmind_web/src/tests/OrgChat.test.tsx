import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { OrgChatPage } from '../features/chat/OrgChatPage'
import * as api from '../services/api'

vi.mock('../services/api', () => ({
  sendMeetingChatQuery: vi.fn(),
}))

describe('OrgChatPage Component', () => {
  it('renders title and input field', () => {
    render(<OrgChatPage />)
    expect(screen.getByText('AI Assistant Workspace')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ask a question across your organization...')).toBeInTheDocument()
  })

  it('sends question and displays answer', async () => {
    vi.mocked(api.sendMeetingChatQuery).mockResolvedValue({
      status: 'success',
      meeting_id: 'global',
      scope: 'organization',
      result: {
        answer: 'The project deadline is August 20th.',
        sources: ['Speaker A: Deadline set for August 20th.'],
      },
    })

    render(<OrgChatPage />)

    const input = screen.getByPlaceholderText('Ask a question across your organization...')
    fireEvent.change(input, { target: { value: 'What is the deadline?' } })

    const button = screen.getByRole('button', { name: '' })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('The project deadline is August 20th.')).toBeInTheDocument()
    })
  })
})
