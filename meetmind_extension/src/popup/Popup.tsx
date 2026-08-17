import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Brain,
  Mic,
  Square,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Radio,
  Volume2,
  Sparkles,
  LayoutDashboard,
  RotateCcw,
} from 'lucide-react'

function createValidWavBlob(sampleRate: number = 44100): Blob {
  const numSamples = sampleRate * 2
  const buffer = new ArrayBuffer(44 + numSamples * 2)
  const view = new DataView(buffer)

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + numSamples * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, numSamples * 2, true)

  return new Blob([buffer], { type: 'audio/wav' })
}

export function Popup() {
  const [isRecording, setIsRecording] = useState(false)
  const [meetingTitle, setMeetingTitle] = useState('Google Meet Sync')
  const [sourceMode, setSourceMode] = useState<'tab' | 'mic'>('tab')
  const [status, setStatus] = useState<'idle' | 'recording' | 'uploading' | 'completed' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [timerSeconds, setTimerSeconds] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Hydrate persistent recording state on mount and preserve state across tab switches
  useEffect(() => {
    const syncState = (resState: any) => {
      if (!resState) return
      setIsRecording(resState.isRecording || false)
      setStatus(resState.status || 'idle')
      if (resState.meetingTitle) setMeetingTitle(resState.meetingTitle)
      if (resState.sourceMode) setSourceMode(resState.sourceMode)
      if (resState.errorMessage) setErrorMessage(resState.errorMessage)

      if (resState.isRecording && resState.startTime) {
        const elapsed = Math.max(0, Math.floor((Date.now() - resState.startTime) / 1000))
        setTimerSeconds(elapsed)
      }
    }

    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (res) => {
        if (res?.state) syncState(res.state)
      })
    }

    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['extensionRecordingState'], (result) => {
        if (result?.extensionRecordingState) {
          syncState(result.extensionRecordingState)
        }
      })
    }
  }, [])

  // Live timer counter during active recording
  useEffect(() => {
    let interval: any = null
    if (isRecording) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRecording])

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleStartRecording = async () => {
    setErrorMessage(null)
    setTimerSeconds(0)

    // Request mic access in popup to ensure Chrome extension permission is granted
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null)
        if (stream) {
          stream.getTracks().forEach((t) => t.stop())
        }
      }
    } catch (e) {
      console.warn('Microphone permission check notice:', e)
    }

    const startTime = Date.now()
    setIsRecording(true)
    setStatus('recording')

    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'START_RECORDING',
        payload: { title: meetingTitle, sourceMode: 'mic', startTime },
      })
    }
  }

  const handleStopRecording = async () => {
    setStatus('uploading')
    setIsRecording(false)

    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage(
        {
          type: 'STOP_RECORDING',
        },
        (res) => {
          if (res?.status === 'success') {
            setStatus('completed')
          } else {
            setStatus('error')
            setErrorMessage(res?.message || 'Failed to finish offscreen recording.')
          }
        }
      )
    } else {
      setStatus('completed')
    }
  }

  const directUploadToBackend = async (blob: Blob) => {
    try {
      const formData = new FormData()
      formData.append('file', blob, 'extension_meeting.wav')
      formData.append('title', meetingTitle || 'Google Meet Sync')
      formData.append('description', 'Captured via MeetMind Chrome Extension')

      const res = await fetch('http://localhost:8000/api/v1/meetings/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.detail || `Server returned HTTP ${res.status}`)
      }

      const data = await res.json()
      if (data.meeting_id || data.id) {
        fetch(`http://localhost:8000/api/v1/meetings/${data.meeting_id || data.id}/analyze`, {
          method: 'POST',
        }).catch((err) => console.warn('Analyze call notice:', err))
      }

      setStatus('completed')
    } catch (err: any) {
      setStatus('error')
      setErrorMessage(err.message || 'Failed to upload meeting audio to backend.')
    }
  }

  const handleResetState = () => {
    setIsRecording(false)
    setStatus('idle')
    setErrorMessage(null)
    setTimerSeconds(0)

    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'RESET_STATUS' })
    }
  }

  const handleOpenWebApp = () => {
    const webAppUrl = 'http://localhost:5175'
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      chrome.tabs.create({ url: webAppUrl })
    } else {
      window.open(webAppUrl, '_blank')
    }
  }

  return (
    <div className="w-[360px] bg-[#09090b] text-[#fafafa] p-4 font-sans border border-[#27272a] shadow-2xl flex flex-col justify-between select-none">
      {/* 1. Header Bar */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-[#27272a] mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#2563eb] flex items-center justify-center text-white shadow-xs border border-blue-400/20">
              <Brain className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#fafafa] tracking-tight">MeetMind AI</span>
              <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.2 rounded bg-[#1f1f23] text-[#a1a1aa] border border-[#27272a]">
                Pro
              </span>
            </div>
          </div>

          <button
            onClick={handleOpenWebApp}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#2563eb] hover:text-[#3b82f6] bg-[#2563eb1a] hover:bg-[#2563eb33] border border-[#2563eb33] px-2.5 py-1 rounded-md transition-all cursor-pointer"
          >
            <span>Web App</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* 2. Meeting Title Input */}
        <div className="mb-4">
          <label className="text-[11px] font-medium text-[#a1a1aa] mb-1 block">Meeting Title</label>
          <input
            type="text"
            value={meetingTitle}
            onChange={(e) => setMeetingTitle(e.target.value)}
            disabled={isRecording}
            placeholder="Google Meet / Teams Sync"
            className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:ring-2 focus:ring-[#2563eb] disabled:opacity-60 transition-all"
          />
        </div>

        {/* 4. Active Recording Panel / Status Display */}
        <div className="p-4 rounded-xl bg-[#18181b] border border-[#27272a] text-center mb-4 flex flex-col items-center justify-center min-h-[130px]">
          {status === 'recording' ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#ef4444] bg-[#ef44441a] px-2.5 py-0.5 rounded-full border border-[#ef444433]">
                <Radio className="w-3.5 h-3.5 animate-pulse text-[#ef4444]" />
                <span>LIVE CAPTURE</span>
              </div>

              {/* Animated Waveform Visualizer */}
              <div className="flex items-center gap-1 h-8 my-1">
                {[30, 60, 90, 45, 75, 50, 85, 40].map((h, idx) => (
                  <motion.div
                    key={idx}
                    animate={{ height: [`${h * 0.3}%`, `${h}%`, `${h * 0.4}%`] }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.7,
                      delay: idx * 0.08,
                      ease: 'easeInOut',
                    }}
                    className="w-1.5 bg-[#ef4444] rounded-full"
                  />
                ))}
              </div>

              <div className="text-2xl font-mono font-bold text-white tracking-wider">
                {formatTimer(timerSeconds)}
              </div>
            </div>
          ) : status === 'uploading' ? (
            <div className="py-2 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 text-[#2563eb] animate-spin" />
              <span className="text-xs font-semibold text-[#fafafa]">Transmitting Audio to Backend...</span>
              <p className="text-[10px] text-[#a1a1aa]">Adding meeting to your Web Dashboard</p>
            </div>
          ) : status === 'completed' ? (
            <div className="py-2 flex flex-col items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-[#22c55e]" />
              <span className="text-xs font-semibold text-[#22c55e]">Capture Complete & Added to Dashboard!</span>
              <button
                onClick={handleOpenWebApp}
                className="mt-1 text-[11px] text-[#2563eb] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>View Summary & Insights</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          ) : status === 'error' ? (
            <div className="py-2 flex flex-col items-center gap-1 text-[#ef4444]">
              <AlertCircle className="w-6 h-6" />
              <span className="text-xs font-semibold">Capture Failed</span>
              <p className="text-[10px] text-[#a1a1aa] leading-tight mt-1">{errorMessage}</p>
              <button
                onClick={handleResetState}
                className="mt-2 text-[10px] text-[#a1a1aa] hover:text-[#fafafa] flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Try Again</span>
              </button>
            </div>
          ) : (
            <div className="py-2 flex flex-col items-center gap-1">
              <Sparkles className="w-5 h-5 text-[#3b82f6] opacity-80" />
              <span className="text-xs font-semibold text-[#fafafa]">Ready to Capture</span>
              <p className="text-[11px] text-[#a1a1aa]">Record live audio or Google Meet tabs directly.</p>
            </div>
          )}
        </div>

        {/* 5. Primary Action Button */}
        {isRecording ? (
          <button
            onClick={handleStopRecording}
            className="w-full py-2.5 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-[0.98]"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Stop & Save to Dashboard</span>
          </button>
        ) : status === 'completed' ? (
          <button
            onClick={handleResetState}
            className="w-full py-2.5 bg-[#18181b] hover:bg-[#27272a] text-[#fafafa] border border-[#27272a] rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Capture Another Meeting</span>
          </button>
        ) : (
          <button
            onClick={handleStartRecording}
            className="w-full py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-[0.98] border border-blue-400/20"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Start Meeting Capture</span>
          </button>
        )}
      </div>

      {/* 6. Footer Resilience Pill */}
      <div className="pt-3 border-t border-[#27272a] mt-4 flex items-center justify-between text-[10px] text-[#71717a]">
        <div className="flex items-center gap-1 text-[#22c55e]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Local Buffer Active</span>
        </div>
        <button
          onClick={handleOpenWebApp}
          className="flex items-center gap-1 text-[#a1a1aa] hover:text-[#fafafa] transition-colors cursor-pointer"
        >
          <LayoutDashboard className="w-3 h-3" />
          <span>Workspace</span>
        </button>
      </div>
    </div>
  )
}

export default Popup
