import React, { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  Calendar,
  Clock,
  ArrowRight,
  UploadCloud,
  RefreshCw,
  Trash2,
  X,
  FileText,
  CheckCircle2,
  TrendingUp,
  Activity,
  FilterX,
} from 'lucide-react'
import { supabase } from '../../services/supabase'
import {
  uploadMeetingAudio,
  analyzeMeeting,
  listMeetings,
  deleteMeeting,
  type UploadMeetingResponse,
} from '../../services/api'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyStateIllustration, NoSearchResultsIllustration } from '../../components/ui/Illustrations'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { useToast } from '../../components/ui/Toast'
import { SkeletonStatCards, SkeletonMeetingRows } from '../../components/ui/Skeleton'
import { CountUp } from '../../components/ui/CountUp'
import { SectionLabel } from '../../components/ui/SectionLabel'
import { MeetingDetailPage } from './MeetingDetailPage'

export interface MeetingRecord {
  id: string
  title: string
  description?: string
  status: string
  duration_seconds: number
  created_at: string
}

export interface MeetingListPageProps {
  onStartRecording: () => void
  onSelectMeeting?: (meetingId: string) => void
}

export const MeetingListPage: React.FC<MeetingListPageProps> = ({
  onStartRecording,
  onSelectMeeting,
}) => {
  const toast = useToast()
  const [meetings, setMeetings] = useState<MeetingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null)

  // Destructive Action Modal State
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Upload Form State
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  const fetchMeetings = async () => {
    setLoading(true)
    try {
      const backendMeetings = await listMeetings()
      setMeetings(backendMeetings || [])
    } catch (err) {
      console.warn('Backend listMeetings failed, trying Supabase direct client fallback:', err)
      try {
        const { data, error } = await supabase
          .from('meetings')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        setMeetings(data || [])
      } catch (fallbackErr) {
        console.error('Error fetching meetings from Supabase:', fallbackErr)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMeetings()
  }, [])

  // Stat calculations
  const stats = useMemo(() => {
    const total = meetings.length
    const completed = meetings.filter((m) => m.status === 'completed').length
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisWeek = meetings.filter((m) => new Date(m.created_at) >= oneWeekAgo).length
    
    // Average duration formatted
    const totalSecs = meetings.reduce((acc, m) => acc + (m.duration_seconds || 0), 0)
    const avgSecs = total > 0 ? Math.round(totalSecs / total) : 0
    const avgMins = Math.floor(avgSecs / 60)
    const avgSecsRem = avgSecs % 60
    const avgLength = total > 0 ? `${avgMins}m ${avgSecsRem}s` : '0m'

    return { total, completed, thisWeek, avgLength }
  }, [meetings])

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return
    setIsDeleting(true)
    try {
      await deleteMeeting(deleteTargetId)
      toast.success('Meeting deleted successfully.')
      await fetchMeetings()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete meeting.')
    } finally {
      setIsDeleting(false)
      setDeleteTargetId(null)
    }
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile || !uploadTitle.trim()) return

    setIsUploading(true)
    try {
      const uploadRes: UploadMeetingResponse = await uploadMeetingAudio(
        uploadFile,
        uploadTitle,
        uploadDescription
      )

      toast.success('Audio uploaded successfully. Processing meeting...')
      setUploadFile(null)
      setUploadTitle('')
      setUploadDescription('')
      setIsUploadModalOpen(false)

      await fetchMeetings()

      // Automatically trigger analysis
      analyzeMeeting(uploadRes.meeting_id)
        .then(() => fetchMeetings())
        .catch((err) => console.warn('Background analysis notice:', err))
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload meeting audio.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleOpenMeeting = (meetingId: string) => {
    if (onSelectMeeting) {
      onSelectMeeting(meetingId)
    } else {
      setSelectedMeetingId(meetingId)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}m ${secs}s`
  }

  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      const matchesSearch =
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesStatus =
        statusFilter === 'all' ? true : m.status.toLowerCase() === statusFilter.toLowerCase()

      return matchesSearch && matchesStatus
    })
  }, [meetings, searchQuery, statusFilter])

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Banner & Primary Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <SectionLabel className="mb-2">Dashboard</SectionLabel>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F1F5F9] tracking-tight">
            Meeting Workspace
          </h1>
          <p className="text-xs text-[#8B96A5] mt-1 font-medium">
            Access transcribed calls, executive summaries, action items, and grounded AI search.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setIsUploadModalOpen(true)}>
            <UploadCloud className="w-4 h-4 text-[#8B96A5]" />
            <span>Upload Audio</span>
          </Button>

          <Button variant="primary" size="sm" onClick={onStartRecording}>
            <Plus className="w-4 h-4" />
            <span>Record Meeting</span>
          </Button>
        </div>
      </div>

      {/* Top Summary Stat Row */}
      {loading ? (
        <div className="mb-8">
          <SkeletonStatCards />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-5 border-[#232B36] bg-[#12171F]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8B96A5]">Total Meetings</span>
              <div className="w-8 h-8 rounded-lg bg-[#22C55E1A] text-[#22C55E] flex items-center justify-center border border-[#22C55E33]">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <p className="text-2xl font-extrabold text-[#F1F5F9]">
                <CountUp end={stats.total} />
              </p>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#22C55E] bg-[#22C55E1A] border border-[#22C55E33] px-2 py-0.5 rounded-full">
                <TrendingUp className="w-3 h-3" />
                +12%
              </span>
            </div>
          </Card>

          <Card className="p-5 border-[#232B36] bg-[#12171F]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8B96A5]">Completed Calls</span>
              <div className="w-8 h-8 rounded-lg bg-[#22C55E1A] text-[#22C55E] flex items-center justify-center border border-[#22C55E33]">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <p className="text-2xl font-extrabold text-[#F1F5F9]">
                <CountUp end={stats.completed} />
              </p>
              <span className="inline-flex items-center text-[11px] font-semibold text-[#22C55E] bg-[#22C55E1A] border border-[#22C55E33] px-2 py-0.5 rounded-full">
                High Yield
              </span>
            </div>
          </Card>

          <Card className="p-5 border-[#232B36] bg-[#12171F]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8B96A5]">Meetings This Week</span>
              <div className="w-8 h-8 rounded-lg bg-[#3B82F61A] text-[#3B82F6] flex items-center justify-center border border-[#3B82F633]">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <p className="text-2xl font-extrabold text-[#F1F5F9]">
                <CountUp end={stats.thisWeek} />
              </p>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3B82F6] bg-[#3B82F61A] border border-[#3B82F633] px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
          </Card>

          <Card className="p-5 border-[#232B36] bg-[#12171F]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8B96A5]">Avg. Call Duration</span>
              <div className="w-8 h-8 rounded-lg bg-[#3B82F61A] text-[#3B82F6] flex items-center justify-center border border-[#3B82F633]">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <p className="text-2xl font-extrabold text-[#F1F5F9]">{stats.avgLength}</p>
              <span className="inline-flex items-center text-[11px] font-semibold text-[#3B82F6] bg-[#3B82F61A] border border-[#3B82F633] px-2 py-0.5 rounded-full">
                Optimal
              </span>
            </div>
          </Card>
        </div>
      )}

      {/* Weekly Activity Area Chart Card */}
      <Card className="p-6 mb-8 border-[#232B36] bg-[#12171F]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#F1F5F9]">Weekly Meeting Activity</h3>
            <p className="text-xs text-[#8B96A5] mt-0.5">Transcribed meeting volume per day across current week</p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#22C55E] bg-[#22C55E1A] border border-[#22C55E33] px-2.5 py-1 rounded-lg">
            <Activity className="w-3.5 h-3.5" />
            Live Analytics
          </span>
        </div>

        {/* SVG Area Line Chart Component */}
        <div className="w-full h-36 relative pt-2">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 700 110" preserveAspectRatio="none">
            <defs>
              <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22C55E" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#22C55E" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            <line x1="0" y1="20" x2="700" y2="20" stroke="#E5E7EB" strokeDasharray="3 3" strokeWidth="1" />
            <line x1="0" y1="55" x2="700" y2="55" stroke="#E5E7EB" strokeDasharray="3 3" strokeWidth="1" />
            <line x1="0" y1="90" x2="700" y2="90" stroke="#E5E7EB" strokeWidth="1" />

            {/* Area Fill */}
            <path
              d="M 0 90 L 0 65 Q 116 35 233 45 T 466 25 T 700 35 L 700 90 Z"
              fill="url(#emeraldGradient)"
            />

            {/* Line Path */}
            <path
              d="M 0 65 Q 116 35 233 45 T 466 25 T 700 35"
              fill="none"
              stroke="#16A34A"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Interactive Data Nodes */}
            {[
              { cx: 0, cy: 65, day: 'Mon' },
              { cx: 116, cy: 45, day: 'Tue' },
              { cx: 233, cy: 45, day: 'Wed' },
              { cx: 350, cy: 30, day: 'Thu' },
              { cx: 466, cy: 25, day: 'Fri' },
              { cx: 583, cy: 60, day: 'Sat' },
              { cx: 700, cy: 35, day: 'Sun' },
            ].map((pt, idx) => (
              <g key={idx}>
                <circle cx={pt.cx} cy={pt.cy} r="4" fill="#FFFFFF" stroke="#16A34A" strokeWidth="2.5" />
              </g>
            ))}
          </svg>

          {/* Days axis labels */}
          <div className="flex justify-between text-[11px] font-semibold text-[#8B96A5] mt-2 px-1">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>
        </div>
      </Card>

      {/* Search & Filter Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
        <div className="w-full sm:max-w-xs">
          <Input
            placeholder="Search meetings by title or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="w-4 h-4 text-[#8B96A5]" />}
          />
        </div>

        <div className="w-full sm:w-auto flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#12171F] border border-[#232B36] text-xs text-[#F1F5F9] rounded-lg px-3 py-2 focus:outline-none focus:border-[#22C55E] font-medium cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="processing">Processing</option>
            <option value="scheduled">Scheduled</option>
            <option value="failed">Failed</option>
          </select>

          <Button variant="ghost" size="sm" onClick={fetchMeetings} title="Refresh meetings list">
            <RefreshCw className="w-3.5 h-3.5 text-[#8B96A5]" />
          </Button>
        </div>
      </div>

      {/* Meeting Grid & Skeletons */}
      {loading ? (
        <SkeletonMeetingRows />
      ) : filteredMeetings.length === 0 ? (
        /* Empty State */
        <Card className="py-12 text-center flex flex-col items-center justify-center border-[#232B36] bg-[#12171F]">
          {searchQuery || statusFilter !== 'all' ? (
            <>
              <NoSearchResultsIllustration className="w-36 h-36 mb-4" />
              <h3 className="text-base font-bold text-[#F1F5F9] mb-1">No matching meetings found</h3>
              <p className="text-xs text-[#8B96A5] max-w-md mx-auto mb-6 leading-relaxed">
                No meetings match query <span className="font-semibold text-[#F1F5F9]">"{searchQuery}"</span>. Try adjusting filters or search terms.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('all')
                }}
              >
                <FilterX className="w-3.5 h-3.5" />
                <span>Clear Search Filter</span>
              </Button>
            </>
          ) : (
            <>
              <EmptyStateIllustration className="w-40 h-40 mb-4" />
              <h3 className="text-base font-bold text-[#F1F5F9] mb-1">No meetings recorded yet</h3>
              <p className="text-xs text-[#8B96A5] max-w-md mx-auto mb-6 leading-relaxed">
                Record live audio or upload a pre-recorded meeting file to generate executive summaries and action items.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" size="sm" onClick={() => setIsUploadModalOpen(true)}>
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload Audio</span>
                </Button>
                <Button variant="primary" size="sm" onClick={onStartRecording}>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record Meeting</span>
                </Button>
              </div>
            </>
          )}
        </Card>
      ) : (
        /* Meeting Cards Grid with Framer Motion Smooth Transitions */
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredMeetings.map((meeting, index) => {
              const rawDesc = meeting.description || ''
              const teaser =
                rawDesc.split('\n')[0].replace(/^Key Highlights:.*$/gi, '').trim() ||
                'Transcript recorded and ready for analysis.'

              return (
                <motion.div
                  key={meeting.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                >
                  <Card
                    interactive
                    onClick={() => handleOpenMeeting(meeting.id)}
                    className="h-full flex flex-col justify-between p-6 hover:-translate-y-0.5 hover:border-[#22C55E]/50 border-[#232B36] bg-[#12171F] transition-all duration-200 group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <h3 className="text-sm font-bold text-[#F1F5F9] group-hover:text-[#22C55E] transition-colors line-clamp-1 leading-snug">
                          {meeting.title}
                        </h3>
                        <Badge status={meeting.status} />
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-[#8B96A5] mb-3.5">
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-[#8B96A5]" />
                          {new Date(meeting.created_at).toLocaleDateString()}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-mono text-[11px] font-medium">
                          <Clock className="w-3.5 h-3.5 text-[#8B96A5]" />
                          {formatDuration(meeting.duration_seconds || 0)}
                        </span>
                      </div>

                      <p className="text-xs text-[#8B96A5] line-clamp-2 mb-4 leading-relaxed font-normal">
                        {teaser}
                      </p>

                      {/* Speaker Avatars Section */}
                      <div className="flex items-center gap-2 mb-4">
                        <div className="flex -space-x-1.5 overflow-hidden">
                          <Avatar name="Speaker 1" size="sm" />
                          <Avatar name="Speaker 2" size="sm" />
                        </div>
                        <span className="text-[11px] text-[#8B96A5] font-medium">2 Participants</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#232B36] flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteTargetId(meeting.id)
                        }}
                        className="p-1.5 text-[#8B96A5] hover:text-[#EF4444] hover:bg-[#EF44441A] rounded-lg transition-colors cursor-pointer"
                        title="Delete meeting"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <span className="text-[#22C55E] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-xs">
                        <span>View Insights</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Destructive Action Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        title="Delete Meeting Recording?"
        message="This action will permanently delete the meeting transcript, executive summary, action items, and vectors. This action cannot be undone."
        confirmText="Delete Meeting"
        isConfirming={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
      />

      {/* Upload Audio Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#12171F] border border-[#232B36] rounded-xl p-6 shadow-2xl relative text-[#F1F5F9]"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#232B36] mb-5">
                <h3 className="text-base font-bold text-[#F1F5F9]">Upload Meeting Audio</h3>
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="text-[#8B96A5] hover:text-[#F1F5F9] p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} className="flex flex-col gap-4">
                <Input
                  label="Meeting Title *"
                  placeholder="e.g. Q3 Sprint Planning Call"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  required
                />

                <div>
                  <label className="text-xs font-medium text-[#8B96A5] block mb-1.5">
                    Audio File (MP3, WAV, M4A, WEBM) *
                  </label>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full bg-[#0B0F14] border border-[#232B36] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#1A212C] file:text-[#F1F5F9] hover:file:bg-[#232B36]"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-[#232B36]">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsUploadModalOpen(false)}
                    disabled={isUploading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" isLoading={isUploading}>
                    Upload & Analyze
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Selected Meeting Details Modal */}
      <AnimatePresence>
        {selectedMeetingId && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full h-full sm:h-auto sm:max-h-[92vh] max-w-5xl bg-[#0B0F14] border border-[#232B36] rounded-xl overflow-hidden flex flex-col shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setSelectedMeetingId(null)}
                className="absolute top-4 right-4 z-20 p-2 rounded-lg bg-[#1A212C] text-[#8B96A5] hover:text-[#F1F5F9] transition-colors border border-[#232B36]"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="overflow-y-auto p-2 flex-1">
                <MeetingDetailPage
                  meetingId={selectedMeetingId}
                  onBack={() => setSelectedMeetingId(null)}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
