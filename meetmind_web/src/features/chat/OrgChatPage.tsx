import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Send, Globe, FileText, Loader2, Sparkles } from 'lucide-react'
import { sendMeetingChatQuery } from '../../services/api'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { MarkdownRenderer } from '../../components/ui/MarkdownRenderer'

import { useToast } from '../../components/ui/Toast'

import { SectionLabel } from '../../components/ui/SectionLabel'

export interface ChatMessage {
  id: string
  sender: 'user' | 'ai'
  text: string
  sources?: string[]
}

export const OrgChatPage: React.FC = () => {
  const toast = useToast()
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
      toast.error('Failed to query organization memory bank.')
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
        <SectionLabel icon={<Sparkles className="w-3.5 h-3.5" />} className="mb-3">
          Vector Memory Search
        </SectionLabel>
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#F1F5F9] tracking-tight">AI Assistant Workspace</h1>
        <p className="text-xs text-[#8B96A5] mt-1 font-medium">
          Perform grounded Q&A across your organization's meeting memory bank.
        </p>
      </div>

      {/* Scope Selector */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <button
          onClick={() => setScope('organization')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
            scope === 'organization'
              ? 'bg-[#22C55E] border-transparent text-[#0B0F14]'
              : 'bg-[#12171F] border-[#232B36] text-[#8B96A5] hover:text-[#F1F5F9]'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Whole Organization Scope</span>
        </button>

        <button
          onClick={() => setScope('meeting')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
            scope === 'meeting'
              ? 'bg-[#22C55E] border-transparent text-[#0B0F14]'
              : 'bg-[#12171F] border-[#232B36] text-[#8B96A5] hover:text-[#F1F5F9]'
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
      <Card className="p-6 h-[550px] flex flex-col justify-between border-[#232B36] bg-[#12171F]">
        <div className="overflow-y-auto space-y-4 pr-2 flex-1 mb-4">
          {messages.length === 0 ? (
            <div className="py-24 text-center text-[#8B96A5] text-xs">
              <MessageSquare className="w-8 h-8 text-[#232B36] mx-auto mb-2" />
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
                  className={`p-3.5 rounded-xl text-xs max-w-[80%] leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-[#22C55E] text-[#0B0F14] font-semibold ml-auto rounded-tr-xs'
                      : 'bg-[#0B0F14] text-[#F1F5F9] border border-[#232B36] mr-auto rounded-tl-xs'
                  }`}
                >
                  {m.sender === 'ai' ? (
                    <MarkdownRenderer content={m.text} className="text-xs" />
                  ) : (
                    <p className="font-medium">{m.text}</p>
                  )}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-[#232B36] text-[10px] text-[#8B96A5]">
                      <span className="font-semibold text-[#22C55E] block mb-1">Sources:</span>
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
            <div className="flex items-center gap-2 text-xs text-[#22C55E] font-medium italic">
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
