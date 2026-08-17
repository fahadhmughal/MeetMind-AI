import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Mic, Square, Loader2, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react'
import { saveAudioChunk, getBufferedAudioChunks, clearAudioBuffer } from '../../utils/audioBuffer'
import { uploadMeetingAudio, analyzeMeeting } from '../../services/api'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'

export interface RecordingPageProps {
  onRecordingComplete: () => void
  onCancel: () => void
}

export const RecordingPage: React.FC<RecordingPageProps> = ({
  onRecordingComplete,
  onCancel,
}) => {
  const [isRecording, setIsRecording] = useState(false)
  const [meetingTitle, setMeetingTitle] = useState('')
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [processingState, setProcessingState] = useState<'idle' | 'uploading' | 'transcribing' | 'completed' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerIntervalRef = useRef<any>(null)
  const audioChunksRef = useRef<Blob[]>([])

  useEffect(() => {
    return () => {
      stopTracksAndTimer()
    }
  }, [])

  const stopTracksAndTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
    }
  }

  const startRecording = async () => {
    if (!meetingTitle.trim()) {
      alert('Please enter a meeting title before starting.')
      return
    }

    try {
      await clearAudioBuffer()
      audioChunksRef.current = []

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data)
          saveAudioChunk(e.data).catch(() => {})
        }
      }

      // Collect data continuously
      mediaRecorder.start(1000)

      setIsRecording(true)
      setRecordingSeconds(0)

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1)
      }, 1000)

    } catch (err: any) {
      console.error('Microphone permission or recording error:', err)
      setErrorMessage(err.message || 'Microphone access denied or unreadable.')
    }
  }

  const stopRecordingAndUpload = async () => {
    if (!mediaRecorderRef.current || !isRecording) return

    stopTracksAndTimer()
    setIsRecording(false)
    setProcessingState('uploading')

    try {
      // Stop mediaRecorder and wait for onstop / data available
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }

      // Wait 300ms to allow final chunk to flush
      await new Promise((r) => setTimeout(r, 300))

      let chunks = audioChunksRef.current
      if (chunks.length === 0) {
        chunks = await getBufferedAudioChunks()
      }

      if (chunks.length === 0) {
        throw new Error('No audio chunks recorded.')
      }

      const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm'
      const completeBlob = new Blob(chunks, { type: mimeType })

      setProcessingState('transcribing')

      // Upload to FastAPI Backend
      const result = await uploadMeetingAudio(
        completeBlob,
        meetingTitle,
        'Recorded directly via browser MediaRecorder'
      )

      if (result.meeting_id) {
        await analyzeMeeting(result.meeting_id).catch(console.error)
      }

      // Clear local IndexedDB backup buffer
      await clearAudioBuffer()

      setProcessingState('completed')
      setTimeout(() => {
        onRecordingComplete()
      }, 1500)

    } catch (err: any) {
      console.error('Error uploading recorded audio:', err)
      const rawError = err.message || 'Failed to upload recorded meeting.'
      if (
        rawError.toLowerCase().includes('no spoken audio') ||
        rawError.toLowerCase().includes('no speech') ||
        rawError.toLowerCase().includes('language_detection')
      ) {
        setErrorMessage('No spoken speech was detected in this recording. Please make sure your microphone is unmuted and speak clearly during the meeting.')
      } else {
        setErrorMessage(rawError)
      }
      setProcessingState('error')
    }
  }

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const s = secs % 60
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-xl p-8 border-slate-800 shadow-2xl text-center">
        {processingState !== 'idle' ? (
          <div className="py-8 flex flex-col items-center justify-center">
            {processingState === 'uploading' && (
              <>
                <Loader2 className="w-12 h-12 text-[#2563eb] animate-spin mb-4" />
                <h3 className="text-xl font-bold text-white">Saving & Uploading Audio</h3>
                <p className="text-sm text-slate-400 mt-2">
                  Assembling buffered audio slices and transmitting to server...
                </p>
              </>
            )}

            {processingState === 'transcribing' && (
              <>
                <Loader2 className="w-12 h-12 text-amber-400 animate-spin mb-4" />
                <h3 className="text-xl font-bold text-white">AssemblyAI Speech-to-Text</h3>
                <p className="text-sm text-slate-400 mt-2">
                  Diarizing speakers and generating timestamped timeline...
                </p>
              </>
            )}

            {processingState === 'completed' && (
              <>
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-4 animate-bounce" />
                <h3 className="text-xl font-bold text-white">Processing Complete!</h3>
                <p className="text-sm text-slate-400 mt-2">
                  Meeting transcript and insights are ready. Redirecting to workspace...
                </p>
              </>
            )}

            {processingState === 'error' && (
              <>
                <AlertCircle className="w-12 h-12 text-rose-400 mb-4" />
                <h3 className="text-xl font-bold text-white">Upload Failed</h3>
                <p className="text-sm text-rose-300 mt-2 mb-6">{errorMessage}</p>
                <Button variant="primary" size="md" onClick={() => setProcessingState('idle')}>
                  Try Again
                </Button>
              </>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full w-fit mx-auto mb-6">
              <ShieldCheck className="w-4 h-4" />
              <span>Crash Resilience Active (IndexedDB Buffer)</span>
            </div>

            <h2 className="text-2xl font-extrabold text-white mb-2">Live Meeting Capture</h2>
            <p className="text-sm text-slate-400 mb-8">
              Record microphone audio. Audio is automatically saved locally every 5 seconds.
            </p>

            {!isRecording ? (
              <div className="flex flex-col gap-6 max-w-md mx-auto">
                <Input
                  label="Meeting Title"
                  placeholder="e.g., Weekly Team Sync"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  required
                />
                <div className="flex justify-center gap-4">
                  <Button variant="ghost" size="lg" onClick={onCancel}>
                    Cancel
                  </Button>
                  <Button variant="danger" size="lg" onClick={startRecording}>
                    <Mic className="w-5 h-5" />
                    <span>Start Recording</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6">
                {/* Waveform Visualizer Animation */}
                <div className="flex items-center gap-1.5 h-16 my-4">
                  {[40, 70, 30, 90, 50, 80, 45, 65, 35, 85].map((h, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: [`${h * 0.3}%`, `${h}%`, `${h * 0.4}%`] }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.8,
                        delay: i * 0.08,
                        ease: 'easeInOut',
                      }}
                      className="w-2 bg-[#2563eb] rounded-full"
                    />
                  ))}
                </div>

                <div className="text-3xl font-mono font-bold text-white tracking-wider">
                  {formatTimer(recordingSeconds)}
                </div>

                <p className="text-xs text-slate-400">
                  Recording live audio for <span className="font-semibold text-slate-200">{meetingTitle}</span>...
                </p>

                <Button variant="danger" size="lg" onClick={stopRecordingAndUpload}>
                  <Square className="w-5 h-5 fill-current" />
                  <span>End & Process Meeting</span>
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
