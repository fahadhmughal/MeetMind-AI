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
  Sparkles,
  LayoutDashboard,
  RotateCcw,
} from 'lucide-react'

import { CONFIG } from '../config'

export function Popup() {
  const [isRecording, setIsRecording] = useState(false)
  const [meetingTitle, setMeetingTitle] = useState('Google Meet Sync')
  const [status, setStatus] = useState<'idle' | 'recording' | 'uploading' | 'completed' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [completedMeetingId, setCompletedMeetingId] = useState<string | null>(null)

  // Hydrate persistent recording state on mount and preserve state across tab switches
  useEffect(() => {
    const syncState = (resState: any) => {
      if (!resState) return
      setIsRecording(resState.isRecording || false)
      setStatus(resState.status || 'idle')
      if (resState.meetingTitle) setMeetingTitle(resState.meetingTitle)
      if (resState.errorMessage) setErrorMessage(resState.errorMessage)
      if (resState.meetingId) setCompletedMeetingId(resState.meetingId)

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
    setCompletedMeetingId(null)

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        }).catch(() => null)
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
            if (res.meeting_id) setCompletedMeetingId(res.meeting_id)
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

  const handleResetState = () => {
    setIsRecording(false)
    setStatus('idle')
    setErrorMessage(null)
    setTimerSeconds(0)
    setCompletedMeetingId(null)

    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'RESET_STATUS' })
    }
  }

  const handleOpenWebApp = (targetMeetingId?: string | null) => {
    const targetId = typeof targetMeetingId === 'string' ? targetMeetingId : completedMeetingId
    const baseUrl = CONFIG.WEB_APP_URL || 'http://localhost:5175'
    const webAppUrl = targetId ? `${baseUrl}/?meetingId=${targetId}` : baseUrl
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      chrome.tabs.create({ url: webAppUrl })
    } else {
      window.open(webAppUrl, '_blank')
    }
  }

  return (
    <div className="w-[360px] bg-[#0B0F14] text-[#F1F5F9] p-4 font-sans border border-[#232B36] flex flex-col justify-between select-none rounded-xl">
      {/* 1. Header Bar */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-[#232B36] mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#22C55E] flex items-center justify-center text-[#0B0F14] font-bold">
              <Brain className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-extrabold text-[#F1F5F9] tracking-tight">MeetMind AI</span>
              <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.2 rounded bg-[#22C55E1A] text-[#22C55E] border border-[#22C55E33]">
                Pro
              </span>
            </div>
          </div>

          <button
            onClick={handleOpenWebApp}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#F1F5F9] bg-[#1A212C] hover:bg-[#232B36] border border-[#232B36] px-2.5 py-1 rounded-md transition-all cursor-pointer"
          >
            <span>Web App</span>
            <ExternalLink className="w-3 h-3 text-[#22C55E]" />
          </button>
        </div>

        {/* 2. Meeting Title Input */}
        <div className="mb-4">
          <label className="text-[11px] font-semibold text-[#8B96A5] mb-1 block">Meeting Title</label>
          <input
            type="text"
            value={meetingTitle}
            onChange={(e) => setMeetingTitle(e.target.value)}
            disabled={isRecording}
            placeholder="Google Meet / Teams Sync"
            className="w-full bg-[#12171F] border border-[#232B36] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] placeholder-[#8B96A5] focus:outline-none focus:border-[#22C55E] disabled:opacity-60 transition-all font-medium"
          />
        </div>

        {/* 3. Active Recording Panel / Status Display */}
        <div className="p-4 rounded-xl bg-[#12171F] border border-[#232B36] text-center mb-4 flex flex-col items-center justify-center min-h-[130px]">
          {status === 'recording' ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#EF4444] bg-[#EF44441A] px-2.5 py-0.5 rounded-full border border-[#EF444433]">
                <Radio className="w-3.5 h-3.5 animate-pulse text-[#EF4444]" />
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
                    className="w-1.5 bg-[#EF4444] rounded-full"
                  />
                ))}
              </div>

              <div className="text-2xl font-mono font-bold text-[#F1F5F9] tracking-wider">
                {formatTimer(timerSeconds)}
              </div>
            </div>
          ) : status === 'uploading' ? (
            <div className="py-2 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 text-[#22C55E] animate-spin" />
              <span className="text-xs font-semibold text-[#F1F5F9]">Transmitting Audio to Backend...</span>
              <p className="text-[10px] text-[#8B96A5] font-medium">Adding meeting to your Web Dashboard</p>
            </div>
          ) : status === 'completed' ? (
            <div className="py-2 flex flex-col items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-[#22C55E]" />
              <span className="text-xs font-bold text-[#22C55E]">Capture Complete & Added to Dashboard!</span>
              <button
                onClick={handleOpenWebApp}
                className="mt-1 text-[11px] text-[#22C55E] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>View Summary & Insights</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          ) : status === 'error' ? (
            <div className="py-2 flex flex-col items-center gap-1 text-[#EF4444]">
              <AlertCircle className="w-6 h-6" />
              <span className="text-xs font-bold">Capture Failed</span>
              <p className="text-[10px] text-[#8B96A5] leading-tight mt-1 font-medium">{errorMessage}</p>
              <button
                onClick={handleResetState}
                className="mt-2 text-[10px] text-[#8B96A5] hover:text-[#F1F5F9] flex items-center gap-1 cursor-pointer font-semibold"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Try Again</span>
              </button>
            </div>
          ) : (
            <div className="py-2 flex flex-col items-center gap-1">
              <Sparkles className="w-5 h-5 text-[#22C55E]" />
              <span className="text-xs font-bold text-[#F1F5F9]">Ready to Capture</span>
              <p className="text-[11px] text-[#8B96A5] font-medium">Record live audio or Zoom/Meet tabs directly.</p>
            </div>
          )}
        </div>

        {/* 4. Primary Action Button */}
        {isRecording ? (
          <button
            onClick={handleStopRecording}
            className="w-full py-2.5 bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Stop & Save to Dashboard</span>
          </button>
        ) : status === 'completed' ? (
          <button
            onClick={handleResetState}
            className="w-full py-2.5 bg-[#1A212C] hover:bg-[#232B36] text-[#F1F5F9] border border-[#232B36] rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Capture Another Meeting</span>
          </button>
        ) : (
          <button
            onClick={handleStartRecording}
            className="w-full py-2.5 bg-[#22C55E] hover:bg-[#16A34A] text-[#0B0F14] font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Start Meeting Capture</span>
          </button>
        )}
      </div>

      {/* 5. Footer Resilience Pill */}
      <div className="pt-3 border-t border-[#232B36] mt-4 flex items-center justify-between text-[10px] text-[#8B96A5] font-medium">
        <div className="flex items-center gap-1 text-[#22C55E]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" />
          <span>Local Buffer Active</span>
        </div>
        <button
          onClick={handleOpenWebApp}
          className="flex items-center gap-1 text-[#8B96A5] hover:text-[#F1F5F9] transition-colors cursor-pointer"
        >
          <LayoutDashboard className="w-3 h-3" />
          <span>Workspace</span>
        </button>
      </div>
    </div>
  )
}

export default Popup
