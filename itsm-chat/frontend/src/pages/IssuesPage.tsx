/**
 * Issues history page
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  ListTodo,
  RefreshCw,
  Filter,
} from 'lucide-react'
import { api, UserIssue } from '../lib/api'

const STATUS_CONFIG: Record<string, { icon: typeof Clock; color: string; bg: string }> = {
  todo: { icon: ListTodo, color: 'text-gray-400', bg: 'bg-gray-500/20' },
  backlog: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  in_progress: { icon: RefreshCw, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  done: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
}

function IssueStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.todo
  const Icon = config.icon

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {status.replace('_', ' ')}
    </span>
  )
}

export default function IssuesPage() {
  const [issues, setIssues] = useState<UserIssue[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const loadIssues = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await api.getIssues(statusFilter || undefined, page)
      setIssues(response.issues)
      setTotal(response.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load issues')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadIssues()
  }, [statusFilter, page])

  return (
    <div className="h-full p-6 overflow-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold gradient-text mb-2">My Issues</h1>
          <p className="text-gray-400">
            Track the status of issues you've created through chat
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2 text-gray-400">
            <Filter className="w-4 h-4" />
            <span className="text-sm">Filter:</span>
          </div>
          <div className="flex gap-2">
            {['', 'todo', 'in_progress', 'done'].map((status) => (
              <button
                key={status || 'all'}
                onClick={() => {
                  setStatusFilter(status)
                  setPage(1)
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  statusFilter === status
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'glass text-gray-400 hover:text-white'
                }`}
              >
                {status ? status.replace('_', ' ') : 'All'}
              </button>
            ))}
          </div>
          <button
            onClick={loadIssues}
            disabled={isLoading}
            className="ml-auto p-2 rounded-lg glass text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
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
        {!isLoading && !error && issues.length === 0 && (
          <div className="text-center py-12 glass-strong rounded-2xl">
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <ListTodo className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-300 mb-2">No issues yet</h3>
            <p className="text-gray-500 mb-6">
              Issues you create through chat will appear here
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
            >
              Start a conversation
            </Link>
          </div>
        )}

        {/* Issues List */}
        {!isLoading && issues.length > 0 && (
          <div className="space-y-3">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className="glass-strong rounded-xl p-4 hover:border-cyan-500/30 border border-transparent transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-cyan-400 font-mono text-sm">
                        {issue.issue_identifier || 'N/A'}
                      </span>
                      <IssueStatusBadge status={issue.issue_status || 'todo'} />
                    </div>
                    <h3 className="text-white font-medium truncate">
                      {issue.issue_title || 'Untitled Issue'}
                    </h3>
                    <p className="text-gray-500 text-sm mt-1">
                      Created {new Date(issue.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {issue.issue_url && (
                    <a
                      href={issue.issue_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg glass text-cyan-400 hover:text-cyan-300 text-sm transition-colors"
                    >
                      View
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg glass text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-gray-500 px-4">
              Page {page} of {Math.ceil(total / 20)}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= Math.ceil(total / 20)}
              className="px-3 py-1.5 rounded-lg glass text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
