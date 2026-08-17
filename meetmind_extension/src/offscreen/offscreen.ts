// Offscreen document script for persistent audio recording in Chrome Extension Manifest V3
let mediaRecorder: MediaRecorder | null = null
let mediaStream: MediaStream | null = null
let activeAudioCtx: AudioContext | null = null
let rawMicStream: MediaStream | null = null
let rawTabStream: MediaStream | null = null
let audioChunks: Blob[] = []
let activeTitle = 'Google Meet Sync'
let userId: string | null = null

function getMimeType(): string {
  if (typeof MediaRecorder !== 'undefined') {
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus'
    if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
    if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4'
  }
  return 'audio/webm'
}

async function getCombinedStream(streamId?: string): Promise<MediaStream> {
  rawMicStream = null
  rawTabStream = null
  activeAudioCtx = null

  // 1. Capture microphone audio
  try {
    rawMicStream = await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch (e) {
    console.warn('Offscreen mic access notice:', e)
  }

  // 2. Capture tab audio if streamId available (Zoom / Meet browser tab)
  if (streamId) {
    try {
      rawTabStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: 'tab',
            chromeMediaSourceId: streamId,
          },
        } as any,
      })
    } catch (e) {
      console.warn('Offscreen tab audio access notice:', e)
    }
  }

  if (!rawMicStream && !rawTabStream) {
    throw new Error('No audio input sources (microphone or tab) available.')
  }

  // Mix streams via Web Audio API AudioContext
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
  if (AudioContextClass) {
    const audioCtx = new AudioContextClass()
    activeAudioCtx = audioCtx
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume().catch(() => {})
    }

    const destination = audioCtx.createMediaStreamDestination()

    if (rawMicStream) {
      const micSource = audioCtx.createMediaStreamSource(rawMicStream)
      micSource.connect(destination)
    }

    if (rawTabStream) {
      const tabSource = audioCtx.createMediaStreamSource(rawTabStream)
      tabSource.connect(destination)
      // Route tab audio to speakers/headphones so user hears the call
      tabSource.connect(audioCtx.destination)
    }

    return destination.stream
  }

  // Direct stream fallback
  const tracks: MediaStreamTrack[] = []
  if (rawTabStream) rawTabStream.getAudioTracks().forEach((t) => tracks.push(t))
  if (rawMicStream) rawMicStream.getAudioTracks().forEach((t) => tracks.push(t))
  return new MediaStream(tracks)
}

async function startRecording(title: string, targetUserId?: string, streamId?: string) {
  activeTitle = title || 'Google Meet Sync'
  userId = targetUserId || null
  audioChunks = []

  try {
    const stream = await getCombinedStream(streamId)
    mediaStream = stream

    const mimeType = getMimeType()
    mediaRecorder = new MediaRecorder(stream, { mimeType })

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunks.push(event.data)
      }
    }

    mediaRecorder.start(1000)
    console.log('Offscreen recording started cleanly for title:', activeTitle)
    return { status: 'success' }
  } catch (err: any) {
    console.warn('Offscreen recording start notice:', err)
    const errReason = err?.message || err?.name || 'Audio capture permission needed'
    return { status: 'error', message: `Recording setup notice: ${errReason}` }
  }
}

async function stopRecordingAndUpload() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') {
    return { status: 'error', message: 'No active recorder running in offscreen document.' }
  }

  return new Promise((resolve) => {
    mediaRecorder!.onstop = async () => {
      try {
        if (mediaStream) {
          mediaStream.getTracks().forEach((t) => t.stop())
          mediaStream = null
        }
        if (rawMicStream) {
          rawMicStream.getTracks().forEach((t) => t.stop())
          rawMicStream = null
        }
        if (rawTabStream) {
          rawTabStream.getTracks().forEach((t) => t.stop())
          rawTabStream = null
        }
        if (activeAudioCtx && activeAudioCtx.state !== 'closed') {
          activeAudioCtx.close().catch(() => {})
          activeAudioCtx = null
        }

        if (audioChunks.length === 0) {
          throw new Error('No audio captured during session.')
        }

        const mimeType = mediaRecorder?.mimeType || 'audio/webm'
        const audioBlob = new Blob(audioChunks, { type: mimeType })

        const formData = new FormData()
        formData.append('file', audioBlob, 'extension_meeting.wav')
        formData.append('title', activeTitle)
        formData.append('description', 'Captured via MeetMind Chrome Extension')
        if (userId) {
          formData.append('user_id', userId)
        }

        const res = await fetch('http://localhost:8000/api/v1/meetings/upload', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.detail || `Upload failed with status ${res.status}`)
        }

        const meetingData = await res.json()
        const meetingId = meetingData.meeting_id || meetingData.id

        if (meetingId) {
          fetch(`http://localhost:8000/api/v1/meetings/${meetingId}/analyze`, {
            method: 'POST',
          }).catch((err) => console.warn('Background analysis trigger notice:', err))
        }

        audioChunks = []
        mediaRecorder = null

        resolve({
          status: 'success',
          meeting_id: meetingId,
          message: 'Meeting recorded and uploaded successfully.',
        })
      } catch (err: any) {
        console.error('Offscreen upload error:', err)
        resolve({ status: 'error', message: err.message || 'Failed to upload recorded audio.' })
      }
    }

    mediaRecorder!.stop()
  })
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'START_RECORDING_OFFSCREEN') {
    startRecording(message.payload?.title, message.payload?.userId, message.payload?.streamId).then(sendResponse)
    return true
  }

  if (message.type === 'STOP_RECORDING_OFFSCREEN') {
    stopRecordingAndUpload().then(sendResponse)
    return true
  }
})
