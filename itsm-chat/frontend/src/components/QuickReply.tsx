interface QuickReplyProps {
  label: string
  value: string
  onClick: (value: string) => void
}

export default function QuickReply({ label, value, onClick }: QuickReplyProps) {
  return (
    <button
      onClick={() => onClick(value)}
      className="px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 hover:scale-105 btn-glow"
      style={{
        background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
        border: '1px solid var(--border-accent)',
        color: 'var(--accent-cyan)',
      }}
    >
      {label}
    </button>
  )
}
