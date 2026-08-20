import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Edit3,
  MessageSquare,
  FileText,
  ListTodo,
  CheckCircle2,
  ArrowLeft,
  Send,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import {
  getMeetingDetails,
  updateSpeakerLabels,
  analyzeMeeting,
  sendMeetingChatQuery,
  type MeetingDetailsResponse,
} from '../../services/api'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { MarkdownRenderer } from '../../components/ui/MarkdownRenderer'
import { TaskItem } from '../../components/ui/TaskItem'
import { DecisionItem } from '../../components/ui/DecisionItem'
import { useToast } from '../../components/ui/Toast'
import { SectionLabel } from '../../components/ui/SectionLabel'

import { SkeletonMeetingDetail } from '../../components/ui/Skeleton'

export interface MeetingDetailPageProps {
  meetingId: string
  onBack: () => void
}

export const MeetingDetailPage: React.FC<MeetingDetailPageProps> = ({ meetingId, onBack }) => {
  const toast = useToast()
  const [data, setData] = useState<MeetingDetailsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRenamingSpeakers, setIsRenamingSpeakers] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(true)

  // Chat state
  const [chatQuery, setChatQuery] = useState('')
  const [chatHistory, setChatHistory] = useState<
    Array<{ sender: 'user' | 'ai'; text: string; sources?: string[] }>
  >([])
  const [isSendingChat, setIsSendingChat] = useState(false)

  const renameForm = useForm<Record<string, string>>()

  const fetchDetails = async () => {
    setLoading(true)
    try {
      const res = await getMeetingDetails(meetingId)
      setData(res)

      // Populate speaker map form defaults
      const uniqueSpeakers = Array.from(new Set((res.transcripts || []).map((t) => t.speaker)))
      const defaultMap: Record<string, string> = {}
      uniqueSpeakers.forEach((spk) => {
        defaultMap[spk] = spk
      })
      renameForm.reset(defaultMap)
    } catch (err: any) {
      console.error('Error fetching meeting details:', err)
      toast.error('Failed to fetch meeting details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDetails()
  }, [meetingId])

  const handleSpeakerRename = async (formData: Record<string, string>) => {
    try {
      await updateSpeakerLabels(meetingId, formData)
      setIsRenamingSpeakers(false)
      toast.success('Speaker names updated successfully.')
      await fetchDetails()
    } catch (err: any) {
      toast.error(err.message || 'Failed to rename speakers.')
    }
  }

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true)
    try {
      await analyzeMeeting(meetingId)
      toast.success('AI Insights generated successfully.')
      await fetchDetails()
    } catch (err: any) {
      toast.error(err.message || 'Analysis failed.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatQuery.trim()) return

    const q = chatQuery.trim()
    setChatQuery('')
    setChatHistory((prev) => [...prev, { sender: 'user', text: q }])
    setIsSendingChat(true)

    try {
      const res = await sendMeetingChatQuery(meetingId, q)
      setChatHistory((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: res.result.answer,
          sources: res.result.sources,
        },
      ])
    } catch (err: any) {
      toast.error('Failed to answer chat query.')
      setChatHistory((prev) => [
        ...prev,
        { sender: 'ai', text: 'Failed to process question. Please try again.' },
      ])
    } finally {
      setIsSendingChat(false)
    }
  }

  if (loading) {
    return <SkeletonMeetingDetail />
  }

  if (!data) {
    return (
      <div className="py-24 text-center text-[#8B96A5] text-xs">
        Meeting not found.
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            Back to Workspace
          </Button>
        </div>
      </div>
    )
  }

  const { meeting, transcripts, summary, tasks, decisions } = data
  const uniqueSpeakers = Array.from(new Set((transcripts || []).map((t) => t.speaker)))
  const isSummaryError = summary?.executive_summary?.startsWith('Summary generation failed')

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. Header Card */}
      <Card className="p-6 border-[#232B36] bg-[#12171F]">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-[#8B96A5] hover:text-[#F1F5F9] transition-colors mb-4 cursor-pointer font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Workspace</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#F1F5F9] tracking-tight">
                {meeting.title}
              </h1>
              <Badge status={meeting.status} />
            </div>
            <p className="text-xs text-[#8B96A5] mt-1.5 font-medium">
              Created: {new Date(meeting.created_at).toLocaleString()} • Duration:{' '}
              {Math.floor((meeting.duration_seconds || 0) / 60)}m {(meeting.duration_seconds || 0) % 60}s
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setIsRenamingSpeakers(true)}>
              <Edit3 className="w-3.5 h-3.5 text-[#8B96A5]" />
              <span>Rename Speakers</span>
            </Button>

            <Button variant="primary" size="sm" isLoading={isAnalyzing} onClick={handleRunAnalysis}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate AI Insights</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* 2. Executive Summary Card */}
      <Card className="p-6 border-[#232B36] bg-[#12171F]">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#232B36]">
          <h2 className="text-base font-bold text-[#F1F5F9] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#22C55E]" />
            <span>Executive Summary</span>
          </h2>
          {isSummaryError && (
            <Button variant="outline" size="sm" isLoading={isAnalyzing} onClick={handleRunAnalysis}>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Summary</span>
            </Button>
          )}
        </div>

        {isSummaryError ? (
          <div className="p-4 rounded-lg bg-[#EF44441A] border border-[#EF444433] flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-semibold text-[#EF4444] mb-1">Summary Generation Failed</h3>
              <p className="text-xs text-[#8B96A5] leading-relaxed mb-3">{summary?.executive_summary || 'An error occurred during analysis.'}</p>
              <Button variant="danger" size="sm" isLoading={isAnalyzing} onClick={handleRunAnalysis}>
                Retry Insights Generation
              </Button>
            </div>
          </div>
        ) : summary?.executive_summary ? (
          <div className="space-y-4">
            <MarkdownRenderer
              content={summary.executive_summary}
              className="text-xs leading-relaxed text-[#F1F5F9] font-normal"
            />
            {summary.key_discussion_points && summary.key_discussion_points.length > 0 && (
              <div className="pt-4 border-t border-[#232B36]">
                <h3 className="text-xs font-bold text-[#22C55E] uppercase tracking-wider mb-2.5">
                  Key Discussion Points & Deadlines
                </h3>
                <ul className="space-y-2 text-xs text-[#8B96A5]">
                  {summary.key_discussion_points.map((pt, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="text-[#22C55E] font-bold mt-0.5">•</span>
                      <span className="leading-relaxed text-[#F1F5F9]">{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="py-6 text-center text-[#8B96A5] text-xs">
            <p className="mb-3">No executive summary generated yet.</p>
            <Button variant="primary" size="sm" isLoading={isAnalyzing} onClick={handleRunAnalysis}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate AI Insights</span>
            </Button>
          </div>
        )}
      </Card>

      {/* 3. Action Items Card */}
      <Card className="p-6 border-[#232B36] bg-[#12171F]">
        <div className="mb-3">
          <SectionLabel className="mb-2">Execution</SectionLabel>
        </div>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#232B36]">
          <div className="flex items-center gap-2">
            <ListTodo className="w-4 h-4 text-[#22C55E]" />
            <h2 className="text-base font-bold text-[#F1F5F9]">Action Items</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#22C55E1A] text-[#22C55E] border border-[#22C55E33] ml-1">
              {(tasks || []).length}
            </span>
          </div>
        </div>

        {(!tasks || tasks.length === 0) ? (
          <p className="text-xs text-[#8B96A5] italic py-4 text-center">
            No action items extracted for this meeting.
          </p>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                title={task.title}
                description={task.description}
                assigneeName={task.assignee_name}
                dueDate={task.due_date}
                priority={task.priority}
                status={task.status}
              />
            ))}
          </div>
        )}
      </Card>

      {/* 4. Decisions Card */}
      <Card className="p-6 border-[#232B36] bg-[#12171F]">
        <div className="mb-3">
          <SectionLabel className="mb-2">Key Outcomes</SectionLabel>
        </div>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#232B36]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
            <h2 className="text-base font-bold text-[#F1F5F9]">Decisions & Key Points</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#22C55E1A] text-[#22C55E] border border-[#22C55E33] ml-1">
              {(decisions || []).length}
            </span>
          </div>
        </div>

        {(!decisions || decisions.length === 0) ? (
          <p className="text-xs text-[#8B96A5] italic py-4 text-center">
            No key decisions extracted for this meeting.
          </p>
        ) : (
          <div className="space-y-3">
            {decisions.map((d) => (
              <DecisionItem
                key={d.id}
                decisionText={d.decision_text}
                context={d.context}
              />
            ))}
          </div>
        )}
      </Card>

      {/* 5. Transcript Timeline Card with Animated Expand/Collapse */}
      <Card className="p-6 border-[#232B36] bg-[#12171F]">
        <button
          type="button"
          onClick={() => setIsTranscriptOpen(!isTranscriptOpen)}
          className="w-full flex items-center justify-between text-left cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#8B96A5] group-hover:text-[#22C55E] transition-colors" />
            <h2 className="text-base font-bold text-[#F1F5F9]">Transcript Timeline</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#1A212C] text-[#8B96A5] ml-1 border border-[#232B36]">
              {(transcripts || []).length} utterances
            </span>
          </div>
          {isTranscriptOpen ? (
            <ChevronUp className="w-4 h-4 text-[#8B96A5]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#8B96A5]" />
          )}
        </button>

        <AnimatePresence>
          {isTranscriptOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-[#232B36] space-y-3 max-h-[450px] overflow-y-auto pr-2">
                {(!transcripts || transcripts.length === 0) ? (
                  <p className="text-xs text-[#8B96A5]">No transcripts available for this meeting.</p>
                ) : (
                  transcripts.map((t) => (
                    <div key={t.id} className="p-4 rounded-xl bg-[#1A212C] border border-[#232B36] text-xs flex items-start gap-3 hover:border-[#22C55E33] transition-colors">
                      <Avatar name={t.speaker} size="md" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-[#F1F5F9]">
                            {t.speaker}
                          </span>
                          <span className="text-[11px] font-mono text-[#8B96A5]">
                            {t.start_time.toFixed(1)}s - {t.end_time.toFixed(1)}s
                          </span>
                        </div>
                        <p className="text-xs text-[#F1F5F9] leading-relaxed font-normal">{t.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* 6. Meeting Q&A Chat Card */}
      <Card className="p-6 border-[#232B36] bg-[#12171F]">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#232B36]">
          <MessageSquare className="w-4 h-4 text-[#22C55E]" />
          <h2 className="text-base font-bold text-[#F1F5F9]">Meeting Q&A Assistant</h2>
        </div>

        <div className="flex flex-col space-y-4">
          <div className="p-4 rounded-xl bg-[#0B0F14] border border-[#232B36] min-h-[180px] max-h-[400px] overflow-y-auto space-y-3">
            {chatHistory.length === 0 ? (
              <div className="py-12 text-center text-[#8B96A5] text-xs italic">
                Ask any question about this meeting transcript...
              </div>
            ) : (
              chatHistory.map((c, i) => (
                <div
                  key={i}
                  className={`p-3.5 rounded-xl text-xs max-w-[80%] ${
                    c.sender === 'user'
                      ? 'bg-[#22C55E] text-[#0B0F14] font-semibold ml-auto rounded-tr-xs'
                      : 'bg-[#12171F] text-[#F1F5F9] border border-[#232B36] mr-auto rounded-tl-xs'
                  }`}
                >
                  {c.sender === 'ai' ? (
                    <MarkdownRenderer content={c.text} className="text-xs" />
                  ) : (
                    <p className="leading-relaxed font-medium">{c.text}</p>
                  )}
                  {c.sources && c.sources.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-[#232B36] text-[11px] text-[#8B96A5]">
                      <span className="font-semibold text-[#22C55E]">Sources:</span>
                      <ul className="list-disc list-inside mt-1 space-y-0.5">
                        {c.sources.map((src, sIdx) => (
                          <li key={sIdx} className="truncate">{src}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSendChat} className="flex gap-2">
            <Input
              placeholder="Ask a question about this meeting..."
              value={chatQuery}
              onChange={(e) => setChatQuery(e.target.value)}
            />
            <Button type="submit" variant="primary" size="md" isLoading={isSendingChat}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>

      {/* Speaker Rename Modal */}
      <AnimatePresence>
        {isRenamingSpeakers && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#12171F] border border-[#232B36] rounded-xl p-6 text-[#F1F5F9]"
            >
              <h3 className="text-base font-bold text-[#F1F5F9] mb-1">Rename Speakers</h3>
              <p className="text-xs text-[#8B96A5] mb-6 font-medium">
                Replace generic labels (e.g. Speaker 1) with actual participant names.
              </p>

              <form onSubmit={renameForm.handleSubmit(handleSpeakerRename)} className="flex flex-col gap-4">
                {uniqueSpeakers.map((spk) => (
                  <Input
                    key={spk}
                    label={`Original: ${spk}`}
                    placeholder="Enter real name..."
                    {...renameForm.register(spk)}
                  />
                ))}

                <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-[#232B36]">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsRenamingSpeakers(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm">
                    Save Names
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
