/**
 * Notification toast component for real-time updates
 */

import { useEffect, useState, useCallback } from 'react'
import { X, CheckCircle2, Bell } from 'lucide-react'
import { IssueNotification } from '../hooks/useWebSocket'

interface Toast {
  id: string
  notification: IssueNotification
  isVisible: boolean
}

interface NotificationToastProps {
  notification: IssueNotification | null
}

export default function NotificationToast({ notification }: NotificationToastProps) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((notif: IssueNotification) => {
    const id = `${notif.issue_id}-${Date.now()}`
    setToasts((prev) => [...prev, { id, notification: notif, isVisible: true }])

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isVisible: false } : t))
      )
      // Remove from DOM after animation
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 300)
    }, 5000)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isVisible: false } : t))
    )
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 300)
  }, [])

  useEffect(() => {
    if (notification) {
      addToast(notification)
    }
  }, [notification, addToast])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3">
      {toasts.map((toast) => {
        const { notification: notif, isVisible, id } = toast
        const isCompleted = notif.new_status === 'done'

        return (
          <div
            key={id}
            className={`flex items-start gap-3 p-4 rounded-xl glass-strong border border-white/10 max-w-sm shadow-xl transition-all duration-300 ${
              isVisible
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 translate-x-8'
            }`}
          >
            {/* Icon */}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                isCompleted ? 'bg-emerald-500/20' : 'bg-blue-500/20'
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <Bell className="w-5 h-5 text-blue-400" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm">
                {notif.issue_identifier || 'Issue'} Updated
              </p>
              <p className="text-gray-400 text-sm mt-0.5">{notif.message}</p>
              {notif.issue_title && (
                <p className="text-gray-500 text-xs mt-1 truncate">
                  {notif.issue_title}
                </p>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => dismissToast(id)}
              className="text-gray-500 hover:text-white transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
