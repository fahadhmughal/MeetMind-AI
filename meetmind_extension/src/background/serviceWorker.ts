export interface RecordingState {
  isRecording: boolean
  meetingTitle: string
  sourceMode: 'tab' | 'mic'
  startTime: number | null
  status: 'idle' | 'recording' | 'uploading' | 'completed' | 'error'
  errorMessage?: string
}

let state: RecordingState = {
  isRecording: false,
  meetingTitle: '',
  sourceMode: 'tab',
  startTime: null,
  status: 'idle',
}

// Hydrate state from chrome.storage.local on SW startup
if (typeof chrome !== 'undefined' && chrome.storage?.local) {
  chrome.storage.local.get(['extensionRecordingState'], (result) => {
    if (result?.extensionRecordingState) {
      state = { ...state, ...result.extensionRecordingState }
    }
  })
}

function updateState(newState: Partial<RecordingState>) {
  state = { ...state, ...newState }
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.set({ extensionRecordingState: state })
  }
}

async function ensureOffscreenDocument() {
  if (typeof chrome === 'undefined' || !chrome.offscreen) return
  const hasDoc = await chrome.offscreen.hasDocument()
  if (!hasDoc) {
    await chrome.offscreen.createDocument({
      url: 'src/offscreen/offscreen.html',
      reasons: [chrome.offscreen.Reason.USER_MEDIA, chrome.offscreen.Reason.AUDIO_PLAYBACK],
      justification: 'Record meeting audio continuously in background offscreen document',
    })
  }
}

async function sendToOffscreenWithRetry(msg: any, maxRetries = 6): Promise<any> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return null
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await new Promise((resolve) => {
        chrome.runtime.sendMessage(msg, (response) => {
          if (chrome.runtime.lastError) {
            resolve(null)
          } else {
            resolve(response)
          }
        })
      })
      if (res) return res
    } catch (e) {
      // retry
    }
    await new Promise((r) => setTimeout(r, 200))
  }
  return null
}

export function handleMessage(
  message: { type: string; payload?: any },
  sendResponse: (response: any) => void
) {
  switch (message.type) {
    case 'GET_STATUS':
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.get(['extensionRecordingState'], (result) => {
          const current = result?.extensionRecordingState || state
          state = { ...state, ...current }
          sendResponse({ status: 'success', state: state })
        })
        return true
      } else {
        sendResponse({ status: 'success', state })
      }
      break

    case 'START_RECORDING':
      updateState({
        isRecording: true,
        meetingTitle: message.payload?.title || 'Google Meet Sync',
        sourceMode: 'mic',
        startTime: message.payload?.startTime || Date.now(),
        status: 'recording',
        errorMessage: undefined,
      })

      ;(async () => {
        try {
          await ensureOffscreenDocument()
          let streamId: string | undefined = undefined
          if (typeof chrome !== 'undefined' && chrome.tabCapture?.getMediaStreamId) {
            streamId = await new Promise<string | undefined>((resolve) => {
              chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const targetTabId = tabs && tabs[0] ? tabs[0].id : undefined
                chrome.tabCapture.getMediaStreamId({ targetTabId }, (id) => {
                  if (chrome.runtime.lastError || !id) {
                    console.warn('tabCapture.getMediaStreamId notice:', chrome.runtime.lastError?.message)
                    resolve(undefined)
                  } else {
                    resolve(id)
                  }
                })
              })
            })
          }

          const res = await sendToOffscreenWithRetry({
            type: 'START_RECORDING_OFFSCREEN',
            payload: {
              title: message.payload?.title || 'Google Meet Sync',
              userId: message.payload?.userId,
              streamId,
            },
          })

          if (res?.status === 'error') {
            updateState({
              isRecording: false,
              status: 'error',
              errorMessage: res.message || 'Offscreen recording failed.',
            })
          }
        } catch (err: any) {
          console.warn('Ensure offscreen document notice:', err)
        }
      })()

      sendResponse({ status: 'success', state })
      break

    case 'STOP_RECORDING':
      updateState({
        status: 'uploading',
      })

      ;(async () => {
        try {
          await ensureOffscreenDocument()
          const res = await sendToOffscreenWithRetry({ type: 'STOP_RECORDING_OFFSCREEN' })
          if (res?.status === 'success') {
            updateState({
              isRecording: false,
              status: 'completed',
            })
            sendResponse({ status: 'success', state, ...res })
          } else {
            updateState({
              isRecording: false,
              status: 'error',
              errorMessage: res?.message || 'Failed to finish offscreen recording.',
            })
            sendResponse({ status: 'error', message: res?.message || 'Offscreen stop failed.' })
          }
        } catch (err: any) {
          updateState({ isRecording: false, status: 'error', errorMessage: err.message })
          sendResponse({ status: 'error', message: err.message })
        }
      })()

      return true

    case 'RESET_STATUS':
      updateState({
        isRecording: false,
        status: 'idle',
        errorMessage: undefined,
        startTime: null,
      })
      sendResponse({ status: 'success', state })
      break

    default:
      sendResponse({ status: 'error', message: 'Unknown action type.' })
      break
  }
}

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    return handleMessage(message, sendResponse)
  })
}
