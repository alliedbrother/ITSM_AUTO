/**
 * Conversations history page
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  Trash2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { api, ConversationSummary } from '../lib/api'

export default function ConversationsPage() {
  const navigate = useNavigate()
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadConversations = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await api.getConversations()
      setConversations(response.conversations)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!confirm('Delete this conversation?')) return

    try {
      await api.deleteSession(sessionId)
      setConversations((prev) => prev.filter((c) => c.session_id !== sessionId))
    } catch (err) {
      console.error('Failed to delete conversation:', err)
    }
  }

  const handleResume = (sessionId: string) => {
    // Store session ID and navigate to chat
    sessionStorage.setItem('resumeSessionId', sessionId)
    navigate('/')
  }

  useEffect(() => {
    loadConversations()
  }, [])

  const getPhaseIcon = (phase: string) => {
    if (phase === 'done') return <CheckCircle2 className="w-4 h-4 text-emerald-400" />
    return <Clock className="w-4 h-4 text-yellow-400" />
  }

  return (
    <div className="h-full p-6 overflow-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold gradient-text mb-2">
              Conversation History
            </h1>
            <p className="text-gray-400">
              Resume or review your previous conversations
            </p>
          </div>
          <button
            onClick={loadConversations}
            disabled={isLoading}
            className="p-2 rounded-lg glass text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 mb-6">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && conversations.length === 0 && (
          <div className="text-center py-12 glass-strong rounded-2xl">
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-300 mb-2">
              No conversations yet
            </h3>
            <p className="text-gray-500 mb-6">
              Start a new conversation to get help with IT issues
            </p>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
            >
              Start a conversation
            </button>
          </div>
        )}

        {/* Conversations List */}
        {!isLoading && conversations.length > 0 && (
          <div className="space-y-3">
            {conversations.map((conv) => (
              <div
                key={conv.session_id}
                onClick={() => handleResume(conv.session_id)}
                className="glass-strong rounded-xl p-4 hover:border-cyan-500/30 border border-transparent transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div className="flex items-center gap-2">
                        {getPhaseIcon(conv.phase)}
                        <span className="text-gray-500 text-sm">
                          {conv.phase === 'done' ? 'Completed' : 'In progress'}
                        </span>
                      </div>
                      {conv.has_created_issue && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                          Issue created
                        </span>
                      )}
                    </div>
                    <p className="text-white font-medium line-clamp-2">
                      {conv.preview}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-gray-500 text-sm">
                      <span>{conv.message_count} messages</span>
                      {conv.updated_at && (
                        <span>
                          Updated {new Date(conv.updated_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleDelete(conv.session_id, e)}
                      className="p-2 rounded-lg glass text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
