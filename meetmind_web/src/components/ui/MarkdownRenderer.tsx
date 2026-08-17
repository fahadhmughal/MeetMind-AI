import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export interface MarkdownRendererProps {
  content: string
  className?: string
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  if (!content) return null

  return (
    <div className={`markdown-content text-[#fafafa] leading-relaxed text-xs ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-base font-bold text-[#fafafa] mt-4 mb-2 pb-1 border-b border-[#27272a]">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-bold text-[#fafafa] mt-3 mb-2 pb-1 border-b border-[#27272a]">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-bold text-[#2563eb] mt-3 mb-1">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xs font-semibold text-[#3b82f6] mt-2 mb-1">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="mb-2 text-[#a1a1aa] text-xs leading-relaxed last:mb-0">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 mb-3 text-[#a1a1aa] text-xs pl-1">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 mb-3 text-[#a1a1aa] text-xs pl-1">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-[#a1a1aa] text-xs leading-relaxed mb-0.5">
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[#2563eb] pl-3 py-1 my-2 bg-[#2563eb1a] rounded-r-lg italic text-[#a1a1aa] text-xs">
              {children}
            </blockquote>
          ),
          code: ({ className: codeClassName, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(codeClassName || '')
            return match ? (
              <pre className="p-3 my-2 bg-[#09090b] border border-[#27272a] rounded-lg overflow-x-auto text-xs font-mono text-[#3b82f6]">
                <code>{children}</code>
              </pre>
            ) : (
              <code className="px-1.5 py-0.5 bg-[#1f1f23] border border-[#27272a] text-[#3b82f6] rounded text-xs font-mono" {...props}>
                {children}
              </code>
            )
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full text-xs text-left text-[#a1a1aa] border border-[#27272a] rounded-lg overflow-hidden">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[#09090b] text-[#fafafa] uppercase tracking-wider font-semibold border-b border-[#27272a]">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 border-r border-[#27272a] last:border-r-0">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border-r border-[#27272a] border-b border-[#27272a] last:border-r-0">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
