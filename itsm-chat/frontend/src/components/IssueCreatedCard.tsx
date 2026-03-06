import { CheckCircle, ExternalLink, Ticket } from 'lucide-react'

interface IssueCreatedCardProps {
  identifier: string
  title: string
  url: string
}

export default function IssueCreatedCard({ identifier, title, url }: IssueCreatedCardProps) {
  return (
    <div
      className="rounded-xl p-5 animate-slide-up"
      style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(34, 211, 238, 0.05) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        boxShadow: '0 0 30px rgba(16, 185, 129, 0.1)',
      }}
    >
      <div className="flex items-start gap-4">
        {/* Success icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
          }}
        >
          <CheckCircle className="w-6 h-6" style={{ color: 'var(--accent-emerald)' }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold" style={{ color: 'var(--accent-emerald)' }}>
              Issue Created
            </h3>
            <span
              className="px-2 py-0.5 text-xs font-mono rounded"
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--accent-emerald)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
              }}
            >
              {identifier}
            </span>
          </div>

          <p
            className="text-sm truncate mb-3"
            style={{ color: 'var(--text-secondary)' }}
          >
            {title}
          </p>

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, var(--accent-emerald) 0%, #059669 100%)',
              color: 'white',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)',
            }}
          >
            <Ticket className="w-4 h-4" />
            View Issue
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  )
}
