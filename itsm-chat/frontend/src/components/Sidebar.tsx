/**
 * Sidebar navigation component
 */

import { Link, useLocation } from 'react-router-dom'
import {
  MessageSquare,
  History,
  ListTodo,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface NavItemProps {
  to: string
  icon: typeof MessageSquare
  label: string
  isCollapsed: boolean
  isActive: boolean
}

function NavItem({ to, icon: Icon, label, isCollapsed, isActive }: NavItemProps) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        isActive
          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {!isCollapsed && <span className="font-medium">{label}</span>}
    </Link>
  )
}

export default function Sidebar() {
  const location = useLocation()
  const { user, isAuthenticated, logout } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const navItems = [
    { to: '/', icon: MessageSquare, label: 'Chat' },
    { to: '/conversations', icon: History, label: 'History' },
    { to: '/issues', icon: ListTodo, label: 'My Issues' },
  ]

  return (
    <aside
      className={`h-full glass-strong border-r border-white/10 flex flex-col transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="font-bold text-white">ITSM Chat</h1>
              <p className="text-xs text-gray-500">v2.0</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <NavItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            isCollapsed={isCollapsed}
            isActive={location.pathname === item.to}
          />
        ))}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-white/10">
        {isAuthenticated && user ? (
          <div className="space-y-3">
            <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{user.name}</p>
                  <p className="text-gray-500 text-xs truncate">{user.email}</p>
                </div>
              )}
            </div>
            <button
              onClick={() => logout()}
              className={`flex items-center gap-3 px-4 py-2 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all w-full ${
                isCollapsed ? 'justify-center' : ''
              }`}
            >
              <LogOut className="w-5 h-5" />
              {!isCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-all ${
              isCollapsed ? 'justify-center' : ''
            }`}
          >
            <User className="w-5 h-5" />
            {!isCollapsed && <span className="font-medium">Sign In</span>}
          </Link>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-800 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </aside>
  )
}
