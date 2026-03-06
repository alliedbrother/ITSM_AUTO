import { User, Zap } from 'lucide-react'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center`}
        style={{
          background: isUser
            ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
            : 'var(--accent-gradient)',
          boxShadow: isUser ? '0 0 15px rgba(139, 92, 246, 0.3)' : 'var(--glow-cyan)',
        }}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Zap className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Message bubble */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser ? 'rounded-tr-md' : 'rounded-tl-md'
        }`}
        style={{
          background: isUser
            ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)'
            : 'var(--bg-tertiary)',
          border: `1px solid ${isUser ? 'rgba(139, 92, 246, 0.3)' : 'var(--border-subtle)'}`,
          color: 'var(--text-primary)',
        }}
      >
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {content.split('\n').map((line, i) => {
            // Handle bold markdown
            const parts = line.split(/(\*\*.*?\*\*)/g)
            return (
              <span key={i}>
                {parts.map((part, j) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                      <strong
                        key={j}
                        style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}
                      >
                        {part.slice(2, -2)}
                      </strong>
                    )
                  }
                  return part
                })}
                {i < content.split('\n').length - 1 && <br />}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
