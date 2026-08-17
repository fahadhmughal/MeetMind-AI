import { describe, it, expect, vi } from 'vitest'
import { handleMessage } from '../background/serviceWorker'

describe('Service Worker Message Handler', () => {
  it('returns initial idle status', () => {
    const sendResponse = vi.fn()
    handleMessage({ type: 'GET_STATUS' }, sendResponse)
    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        state: expect.objectContaining({ isRecording: false, status: 'idle' }),
      })
    )
  })

  it('handles START_RECORDING message', () => {
    const sendResponse = vi.fn()
    handleMessage(
      { type: 'START_RECORDING', payload: { title: 'Google Meet Review', sourceMode: 'tab' } },
      sendResponse
    )

    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        state: expect.objectContaining({
          isRecording: true,
          meetingTitle: 'Google Meet Review',
          sourceMode: 'mic',
        }),
      })
    )
  })
})
