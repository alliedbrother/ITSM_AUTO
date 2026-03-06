import { useState, useRef, useEffect } from 'react'
import { Send, RotateCcw, Sparkles, Zap, ArrowRight } from 'lucide-react'
import { useChatApi } from '../hooks/useChatApi'
import ChatMessage from './ChatMessage'
import QuickReply from './QuickReply'
import IssueCreatedCard from './IssueCreatedCard'

export default function Chat() {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    messages,
    sendMessage,
    isLoading,
    quickReplies,
    createdIssue,
    resetChat,
  } = useChatApi()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      sendMessage(input.trim())
      setInput('')
    }
  }

  const handleQuickReply = (value: string) => {
    sendMessage(value)
  }

  const handleReset = () => {
    resetChat()
    inputRef.current?.focus()
  }

  return (
    <div
      className="flex flex-col w-full max-w-2xl h-[90vh] max-h-[800px] rounded-2xl overflow-hidden glass-strong"
      style={{
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(99, 179, 237, 0.1)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{
          background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.95) 0%, rgba(17, 24, 39, 0.8) 100%)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'var(--accent-gradient)',
              boxShadow: 'var(--glow-cyan)',
            }}
          >
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-lg tracking-tight" style={{ color: 'var(--text-primary)' }}>
              ITSM Support
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Intelligent ticket creation
            </p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="p-2.5 rounded-xl transition-all duration-300 hover:scale-105"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
          title="Start new conversation"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-6 py-6 space-y-5"
        style={{ background: 'transparent' }}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
              style={{
                background: 'linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <Sparkles className="w-10 h-10" style={{ color: 'var(--accent-cyan)' }} />
            </div>
            <h2
              className="text-2xl font-semibold mb-3"
              style={{ color: 'var(--text-primary)' }}
            >
              How can I help you?
            </h2>
            <p
              className="text-sm max-w-sm leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              Describe your issue in natural language and I'll create a support ticket with the right priority and routing.
            </p>

            {/* Quick start suggestions */}
            <div className="flex flex-wrap justify-center gap-2 mt-8">
              {[
                'Database is running slow',
                'Security concern',
                'Network connectivity issue',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => sendMessage(suggestion)}
                  className="px-4 py-2 text-sm rounded-full transition-all duration-300 hover:scale-105"
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className="animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <ChatMessage role={message.role} content={message.content} />
          </div>
        ))}

        {/* Issue Created Card */}
        {createdIssue && (
          <div className="animate-slide-up">
            <IssueCreatedCard
              identifier={createdIssue.identifier}
              title={createdIssue.title}
              url={createdIssue.url}
            />
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3 animate-fade-in">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'var(--accent-gradient)',
                boxShadow: 'var(--glow-cyan)',
              }}
            >
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div
              className="rounded-2xl rounded-tl-md px-5 py-3"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div className="flex gap-1.5">
                <span
                  className="w-2 h-2 rounded-full typing-dot"
                  style={{ background: 'var(--accent-cyan)' }}
                />
                <span
                  className="w-2 h-2 rounded-full typing-dot"
                  style={{ background: 'var(--accent-cyan)' }}
                />
                <span
                  className="w-2 h-2 rounded-full typing-dot"
                  style={{ background: 'var(--accent-cyan)' }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies */}
      {quickReplies.length > 0 && !isLoading && (
        <div
          className="px-6 py-3 animate-slide-up"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <div className="flex flex-wrap gap-2">
            {quickReplies.map((reply, index) => (
              <QuickReply
                key={index}
                label={reply.label}
                value={reply.value}
                onClick={handleQuickReply}
              />
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="px-6 py-4"
        style={{
          background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.8) 0%, rgba(17, 24, 39, 0.95) 100%)',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-2 transition-all duration-300"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your issue..."
            disabled={isLoading}
            className="flex-1 bg-transparent py-2 text-sm disabled:opacity-50"
            style={{
              color: 'var(--text-primary)',
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 rounded-lg transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed btn-glow hover:scale-105"
            style={{
              background: input.trim() ? 'var(--accent-gradient)' : 'var(--bg-secondary)',
              color: 'white',
            }}
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <p
          className="text-xs mt-2 text-center"
          style={{ color: 'var(--text-muted)' }}
        >
          Press Enter to send • AI-powered ticket routing
        </p>
      </form>
    </div>
  )
}
