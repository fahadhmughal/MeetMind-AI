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
  BarChart2,
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
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { useToast } from '../../components/ui/Toast'
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
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0

    return { total, completed, thisWeek, rate }
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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#fafafa] tracking-tight">
            Meeting Workspace
          </h1>
          <p className="text-xs text-[#a1a1aa] mt-1">
            Access transcribed calls, executive summaries, action items, and grounded AI search.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setIsUploadModalOpen(true)}>
            <UploadCloud className="w-4 h-4 text-[#a1a1aa]" />
            <span>Upload Audio</span>
          </Button>

          <Button variant="primary" size="sm" onClick={onStartRecording}>
            <Plus className="w-4 h-4" />
            <span>Record Meeting</span>
          </Button>
        </div>
      </div>

      {/* Top Summary Stat Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#a1a1aa]">Total Meetings</span>
            <FileText className="w-4 h-4 text-[#71717a]" />
          </div>
          <p className="text-xl font-semibold text-[#fafafa] mt-2">{stats.total}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#a1a1aa]">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
          </div>
          <p className="text-xl font-semibold text-[#fafafa] mt-2">{stats.completed}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#a1a1aa]">This Week</span>
            <Calendar className="w-4 h-4 text-[#3b82f6]" />
          </div>
          <p className="text-xl font-semibold text-[#fafafa] mt-2">{stats.thisWeek}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#a1a1aa]">Completion Rate</span>
            <BarChart2 className="w-4 h-4 text-[#2563eb]" />
          </div>
          <p className="text-xl font-semibold text-[#fafafa] mt-2">{stats.rate}%</p>
        </Card>
      </div>

      {/* Search & Filter Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
        <div className="w-full sm:max-w-xs">
          <Input
            placeholder="Search meetings by title or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="w-full sm:w-auto flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#18181b] border border-[#27272a] text-xs text-[#fafafa] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="processing">Processing</option>
            <option value="scheduled">Scheduled</option>
            <option value="failed">Failed</option>
          </select>

          <Button variant="ghost" size="sm" onClick={fetchMeetings} title="Refresh meetings list">
            <RefreshCw className="w-3.5 h-3.5 text-[#a1a1aa]" />
          </Button>
        </div>
      </div>

      {/* Meeting Grid & Loading Skeletons */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="h-44 p-6 animate-pulse flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="h-4 bg-[#27272a] rounded w-1/2" />
                  <div className="h-4 bg-[#27272a] rounded w-16" />
                </div>
                <div className="h-3 bg-[#27272a] rounded w-1/3 mb-4" />
                <div className="h-3 bg-[#27272a] rounded w-3/4 mb-2" />
                <div className="h-3 bg-[#27272a] rounded w-1/2" />
              </div>
              <div className="h-4 bg-[#27272a] rounded w-1/4 pt-3 border-t border-[#27272a]" />
            </Card>
          ))}
        </div>
      ) : filteredMeetings.length === 0 ? (
        /* Empty State */
        <Card className="py-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#1f1f23] border border-[#27272a] flex items-center justify-center mx-auto mb-4 text-[#71717a]">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-[#fafafa] mb-1">
            {searchQuery || statusFilter !== 'all' ? 'No matching meetings found' : 'No meetings recorded yet'}
          </h3>
          <p className="text-xs text-[#a1a1aa] max-w-sm mx-auto mb-6">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search terms or status filter to locate your recording.'
              : 'Record live audio or upload a pre-recorded meeting file to generate executive summaries and action items.'}
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
        </Card>
      ) : (
        /* Meeting Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredMeetings.map((meeting, index) => {
              const rawDesc = meeting.description || ''
              const teaser =
                rawDesc.split('\n')[0].replace(/^Key Highlights:.*$/gi, '').trim() ||
                'Transcript recorded and ready for analysis.'

              return (
                <motion.div
                  key={meeting.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                >
                  <Card
                    interactive
                    onClick={() => handleOpenMeeting(meeting.id)}
                    className="h-full flex flex-col justify-between p-6 hover:border-[#3f3f46] transition-all shadow-sm group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <h3 className="text-sm font-semibold text-[#fafafa] group-hover:text-[#2563eb] transition-colors line-clamp-1 leading-snug">
                          {meeting.title}
                        </h3>
                        <Badge status={meeting.status} />
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-[#a1a1aa] mb-3.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[#71717a]" />
                          {new Date(meeting.created_at).toLocaleDateString()}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-[#71717a]" />
                          {formatDuration(meeting.duration_seconds || 0)}
                        </span>
                      </div>

                      <p className="text-xs text-[#a1a1aa] line-clamp-2 mb-4 leading-relaxed font-normal">
                        {teaser}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#27272a] flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteTargetId(meeting.id)
                        }}
                        className="p-1.5 text-[#71717a] hover:text-[#ef4444] hover:bg-[#ef44441a] rounded-lg transition-colors"
                        title="Delete meeting"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <span className="text-[#2563eb] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-xs">
                        <span>View Insights</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
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
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#18181b] border border-[#27272a] rounded-xl p-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#27272a] mb-5">
                <h3 className="text-base font-semibold text-[#fafafa]">Upload Meeting Audio</h3>
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="text-[#71717a] hover:text-[#fafafa] p-1 rounded-lg"
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
                  <label className="text-xs font-medium text-[#a1a1aa] block mb-1.5">
                    Audio File (MP3, WAV, M4A, WEBM) *
                  </label>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-[#fafafa] file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#1f1f23] file:text-[#fafafa] hover:file:bg-[#27272a]"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-[#27272a]">
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
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full h-full sm:h-auto sm:max-h-[92vh] max-w-5xl bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden flex flex-col shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setSelectedMeetingId(null)}
                className="absolute top-4 right-4 z-20 p-2 rounded-lg bg-[#1f1f23] text-[#a1a1aa] hover:text-[#fafafa] transition-colors border border-[#27272a]"
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
