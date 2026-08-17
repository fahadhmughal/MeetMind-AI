import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Send, Globe, FileText, Loader2, Sparkles } from 'lucide-react'
import { sendMeetingChatQuery } from '../../services/api'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { MarkdownRenderer } from '../../components/ui/MarkdownRenderer'

export interface ChatMessage {
  id: string
  sender: 'user' | 'ai'
  text: string
  sources?: string[]
}

export const OrgChatPage: React.FC = () => {
  const [scope, setScope] = useState<'meeting' | 'organization'>('organization')
  const [targetMeetingId, setTargetMeetingId] = useState('')
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isSending, setIsSending] = useState(false)

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    const q = query.trim()
    setQuery('')

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: q,
    }
    setMessages((prev) => [...prev, userMsg])
    setIsSending(true)

    try {
      const res = await sendMeetingChatQuery(
        targetMeetingId || 'global',
        q,
        scope,
        'org_default'
      )

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: res.result.answer,
        sources: res.result.sources,
      }

      setMessages((prev) => [...prev, aiMsg])
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: 'Failed to answer query. Please verify meeting context.',
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="w-10 h-10 rounded-xl bg-[#2563eb1a] border border-[#2563eb33] flex items-center justify-center mx-auto mb-3 text-[#2563eb]">
          <Sparkles className="w-5 h-5" />
        </div>
        <h1 className="text-xl font-bold text-[#fafafa] tracking-tight">AI Assistant Workspace</h1>
        <p className="text-xs text-[#a1a1aa] mt-1">
          Perform grounded Q&A across your organization's meeting memory bank.
        </p>
      </div>

      {/* Scope Selector */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <button
          onClick={() => setScope('organization')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
            scope === 'organization'
              ? 'bg-[#2563eb] border-[#2563eb] text-white'
              : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:text-[#fafafa]'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Whole Organization Scope</span>
        </button>

        <button
          onClick={() => setScope('meeting')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
            scope === 'meeting'
              ? 'bg-[#2563eb] border-[#2563eb] text-white'
              : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:text-[#fafafa]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Single Meeting Scope</span>
        </button>
      </div>

      {scope === 'meeting' && (
        <div className="max-w-xs mx-auto mb-6">
          <Input
            placeholder="Target Meeting ID..."
            value={targetMeetingId}
            onChange={(e) => setTargetMeetingId(e.target.value)}
          />
        </div>
      )}

      {/* Chat Window */}
      <Card className="p-6 h-[550px] flex flex-col justify-between">
        <div className="overflow-y-auto space-y-4 pr-2 flex-1 mb-4">
          {messages.length === 0 ? (
            <div className="py-24 text-center text-[#71717a] text-xs">
              <MessageSquare className="w-8 h-8 text-[#71717a] mx-auto mb-2 opacity-50" />
              Ask questions like <i>"What were the action items from last week's product review?"</i>
            </div>
          ) : (
            messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`p-3.5 rounded-2xl text-xs max-w-[80%] leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-[#27272a] text-[#fafafa] border border-[#3f3f46] ml-auto rounded-tr-xs shadow-xs'
                      : 'bg-[#18181b] text-[#fafafa] border border-[#27272a] mr-auto rounded-tl-xs'
                  }`}
                >
                  {m.sender === 'ai' ? (
                    <MarkdownRenderer content={m.text} className="text-xs" />
                  ) : (
                    <p>{m.text}</p>
                  )}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-[#27272a] text-[10px] text-[#a1a1aa]">
                      <span className="font-semibold text-[#3b82f6] block mb-1">Sources:</span>
                      {m.sources.map((src, i) => (
                        <span key={i} className="block italic">• {src}</span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}

          {isSending && (
            <div className="flex items-center gap-2 text-xs text-[#3b82f6] italic">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Searching vector embeddings and formulating response...</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            placeholder="Ask a question across your organization..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button type="submit" variant="primary" size="md" isLoading={isSending}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </Card>
    </div>
  )
}
