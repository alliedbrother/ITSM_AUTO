/**
 * Chat API hook with authentication support
 */

import { useState, useCallback, useEffect } from 'react'
import { api } from '../lib/api'

export interface QuickReply {
  label: string
  value: string
}

export interface CreatedIssue {
  id: string
  identifier: string
  title: string
  url: string
}

export interface ExtractedInfo {
  title?: string
  description?: string
  priority?: string
  department?: string
  assignee_agent_id?: string
}

export interface ChatResponse {
  session_id: string
  message: string
  phase: string
  quick_replies: QuickReply[]
  extracted?: ExtractedInfo
  created_issue?: CreatedIssue
  error?: string
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

const COMPANY_ID = import.meta.env.VITE_COMPANY_ID || ''

export function useChatApi() {
  const [messages, setMessages] = useState<Message[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([])
  const [createdIssue, setCreatedIssue] = useState<CreatedIssue | null>(null)
  const [phase, setPhase] = useState<string>('classify')
  const [error, setError] = useState<string | null>(null)

  // Check for resume session on mount
  useEffect(() => {
    const resumeId = sessionStorage.getItem('resumeSessionId')
    if (resumeId) {
      sessionStorage.removeItem('resumeSessionId')
      loadConversation(resumeId)
    }
  }, [])

  const loadConversation = async (convSessionId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await api.getConversation(convSessionId)

      setSessionId(data.session_id)
      setMessages(data.messages || [])
      setPhase(data.phase || 'classify')
      setCreatedIssue(data.created_issue || null)

      // Clear quick replies when loading existing conversation
      setQuickReplies([])

      if (data.error) {
        setError(data.error)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load conversation'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    // Add user message to state
    const userMessage: Message = { role: 'user', content }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setError(null)

    try {
      // Use the API client which handles auth automatically
      const data: ChatResponse = await api.sendMessage(
        content,
        sessionId || undefined,
        api.getAccessToken() ? undefined : COMPANY_ID // Only send company_id if not authenticated
      )

      // Update state with response
      setSessionId(data.session_id)
      setPhase(data.phase)
      setQuickReplies(data.quick_replies || [])

      // Add assistant message
      const assistantMessage: Message = { role: 'assistant', content: data.message }
      setMessages(prev => [...prev, assistantMessage])

      // Handle created issue
      if (data.created_issue) {
        setCreatedIssue(data.created_issue)
      }

      if (data.error) {
        setError(data.error)
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      // Add error message as assistant response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`
      }])
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, isLoading])

  const resetChat = useCallback(() => {
    setMessages([])
    setSessionId(null)
    setQuickReplies([])
    setCreatedIssue(null)
    setPhase('classify')
    setError(null)
  }, [])

  return {
    messages,
    sendMessage,
    isLoading,
    quickReplies,
    createdIssue,
    phase,
    error,
    resetChat,
    sessionId,
    loadConversation,
  }
}
