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
import { MarkdownRenderer } from '../../components/ui/MarkdownRenderer'
import { TaskItem } from '../../components/ui/TaskItem'
import { DecisionItem } from '../../components/ui/DecisionItem'
import { useToast } from '../../components/ui/Toast'

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
      setChatHistory((prev) => [
        ...prev,
        { sender: 'ai', text: 'Failed to process question. Please try again.' },
      ])
    } finally {
      setIsSendingChat(false)
    }
  }

  if (loading) {
    return (
      <div className="py-24 text-center text-[#a1a1aa] font-medium text-xs">
        Loading meeting details...
      </div>
    )
  }

  if (!data) {
    return (
      <div className="py-24 text-center text-[#a1a1aa] text-xs">
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
      <Card className="p-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-[#a1a1aa] hover:text-[#fafafa] transition-colors mb-4 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Workspace</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-[#fafafa] tracking-tight">
                {meeting.title}
              </h1>
              <Badge status={meeting.status} />
            </div>
            <p className="text-xs text-[#a1a1aa] mt-1.5">
              Created: {new Date(meeting.created_at).toLocaleString()} • Duration:{' '}
              {Math.floor((meeting.duration_seconds || 0) / 60)}m {(meeting.duration_seconds || 0) % 60}s
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setIsRenamingSpeakers(true)}>
              <Edit3 className="w-3.5 h-3.5 text-[#a1a1aa]" />
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
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#27272a]">
          <h2 className="text-base font-semibold text-[#fafafa] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#2563eb]" />
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
          <div className="p-4 rounded-lg bg-[#ef44441a] border border-[#ef444433] flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#ef4444] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-semibold text-[#ef4444] mb-1">Summary Generation Failed</h3>
              <p className="text-xs text-[#a1a1aa] leading-relaxed mb-3">{summary?.executive_summary || 'An error occurred during analysis.'}</p>
              <Button variant="danger" size="sm" isLoading={isAnalyzing} onClick={handleRunAnalysis}>
                Retry Insights Generation
              </Button>
            </div>
          </div>
        ) : summary?.executive_summary ? (
          <div className="space-y-4">
            <MarkdownRenderer
              content={summary.executive_summary}
              className="text-xs leading-relaxed text-[#fafafa]"
            />
            {summary.key_discussion_points && summary.key_discussion_points.length > 0 && (
              <div className="pt-4 border-t border-[#27272a]">
                <h3 className="text-xs font-semibold text-[#3b82f6] uppercase tracking-wider mb-2.5">
                  Key Discussion Points & Deadlines
                </h3>
                <ul className="space-y-2 text-xs text-[#a1a1aa]">
                  {summary.key_discussion_points.map((pt, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="text-[#2563eb] font-bold mt-0.5">•</span>
                      <span className="leading-relaxed text-[#fafafa]">{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="py-6 text-center text-[#a1a1aa] text-xs">
            <p className="mb-3">No executive summary generated yet.</p>
            <Button variant="primary" size="sm" isLoading={isAnalyzing} onClick={handleRunAnalysis}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate AI Insights</span>
            </Button>
          </div>
        )}
      </Card>

      {/* 3. Action Items Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#27272a]">
          <div className="flex items-center gap-2">
            <ListTodo className="w-4 h-4 text-[#2563eb]" />
            <h2 className="text-base font-semibold text-[#fafafa]">Action Items</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#2563eb1a] text-[#2563eb] border border-[#2563eb33] ml-1">
              {(tasks || []).length}
            </span>
          </div>
        </div>

        {(!tasks || tasks.length === 0) ? (
          <p className="text-xs text-[#71717a] italic py-4 text-center">
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
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#27272a]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
            <h2 className="text-base font-semibold text-[#fafafa]">Decisions & Key Points</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#22c55e1a] text-[#22c55e] border border-[#22c55e33] ml-1">
              {(decisions || []).length}
            </span>
          </div>
        </div>

        {(!decisions || decisions.length === 0) ? (
          <p className="text-xs text-[#71717a] italic py-4 text-center">
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

      {/* 5. Transcript Timeline Card */}
      <Card className="p-6">
        <button
          type="button"
          onClick={() => setIsTranscriptOpen(!isTranscriptOpen)}
          className="w-full flex items-center justify-between text-left cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#71717a] group-hover:text-[#2563eb] transition-colors" />
            <h2 className="text-base font-semibold text-[#fafafa]">Transcript Timeline</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#1f1f23] text-[#a1a1aa] ml-1 border border-[#27272a]">
              {(transcripts || []).length} entries
            </span>
          </div>
          {isTranscriptOpen ? (
            <ChevronUp className="w-4 h-4 text-[#71717a]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#71717a]" />
          )}
        </button>

        {isTranscriptOpen && (
          <div className="mt-4 pt-4 border-t border-[#27272a] space-y-3 max-h-[450px] overflow-y-auto pr-2">
            {(!transcripts || transcripts.length === 0) ? (
              <p className="text-xs text-[#71717a]">No transcripts available for this meeting.</p>
            ) : (
              transcripts.map((t) => (
                <div key={t.id} className="p-3.5 rounded-xl bg-[#09090b] border border-[#27272a] text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-[#2563eb] px-2 py-0.5 bg-[#2563eb1a] rounded border border-[#2563eb33]">
                      {t.speaker}
                    </span>
                    <span className="text-[11px] font-mono text-[#71717a]">
                      {t.start_time.toFixed(1)}s - {t.end_time.toFixed(1)}s
                    </span>
                  </div>
                  <p className="text-xs text-[#a1a1aa] leading-relaxed">{t.content}</p>
                </div>
              ))
            )}
          </div>
        )}
      </Card>

      {/* 6. Meeting Q&A Chat Card */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#27272a]">
          <MessageSquare className="w-4 h-4 text-[#2563eb]" />
          <h2 className="text-base font-semibold text-[#fafafa]">Meeting Q&A Assistant</h2>
        </div>

        <div className="flex flex-col space-y-4">
          <div className="p-4 rounded-xl bg-[#09090b] border border-[#27272a] min-h-[180px] max-h-[400px] overflow-y-auto space-y-3">
            {chatHistory.length === 0 ? (
              <div className="py-12 text-center text-[#71717a] text-xs italic">
                Ask any question about this meeting transcript...
              </div>
            ) : (
              chatHistory.map((c, i) => (
                <div
                  key={i}
                  className={`p-3.5 rounded-2xl text-xs max-w-[80%] ${
                    c.sender === 'user'
                      ? 'bg-[#27272a] text-[#fafafa] border border-[#3f3f46] ml-auto rounded-tr-xs shadow-xs'
                      : 'bg-[#18181b] text-[#fafafa] border border-[#27272a] mr-auto rounded-tl-xs'
                  }`}
                >
                  {c.sender === 'ai' ? (
                    <MarkdownRenderer content={c.text} className="text-xs" />
                  ) : (
                    <p className="leading-relaxed">{c.text}</p>
                  )}
                  {c.sources && c.sources.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-[#27272a] text-[11px] text-[#a1a1aa]">
                      <span className="font-semibold text-[#3b82f6]">Sources:</span>
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
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#18181b] border border-[#27272a] rounded-xl p-6 shadow-2xl"
            >
              <h3 className="text-base font-semibold text-[#fafafa] mb-1">Rename Speakers</h3>
              <p className="text-xs text-[#a1a1aa] mb-6">
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

                <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-[#27272a]">
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
