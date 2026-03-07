/**
 * Centralized API client for ITSM Chat
 */

const API_URL = import.meta.env.VITE_API_URL || '/api'

export interface User {
  id: string
  email: string
  name: string
  company_id: string
  created_at: string
  last_login_at?: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: User
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  name: string
  company_id?: string
}

export interface UserIssue {
  id: string
  user_id: string
  issue_id: string
  issue_identifier?: string
  issue_title?: string
  issue_status?: string
  created_at: string
  last_updated_at?: string
  notified_at?: string
  issue_url?: string
}

export interface IssueListResponse {
  issues: UserIssue[]
  total: number
  page: number
  per_page: number
}

export interface ConversationSummary {
  session_id: string
  preview: string
  message_count: number
  phase: string
  created_at?: string
  updated_at?: string
  has_created_issue: boolean
}

class ApiClient {
  private accessToken: string | null = null

  constructor() {
    // Try to restore token from localStorage
    this.accessToken = localStorage.getItem('access_token')
  }

  setAccessToken(token: string | null) {
    this.accessToken = token
    if (token) {
      localStorage.setItem('access_token', token)
    } else {
      localStorage.removeItem('access_token')
    }
  }

  setRefreshToken(token: string | null) {
    if (token) {
      localStorage.setItem('refresh_token', token)
    } else {
      localStorage.removeItem('refresh_token')
    }
  }

  getAccessToken(): string | null {
    return this.accessToken
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    }

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    })

    if (response.status === 401) {
      // Try to refresh token
      const refreshed = await this.tryRefreshToken()
      if (refreshed) {
        // Retry the request with new token
        headers['Authorization'] = `Bearer ${this.accessToken}`
        const retryResponse = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers,
        })
        if (!retryResponse.ok) {
          throw new Error(`HTTP error: ${retryResponse.status}`)
        }
        return retryResponse.json()
      }
      throw new Error('Unauthorized')
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `HTTP error: ${response.status}`)
    }

    return response.json()
  }

  private async tryRefreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) return false

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })

      if (!response.ok) {
        this.clearTokens()
        return false
      }

      const data: TokenResponse = await response.json()
      this.setAccessToken(data.access_token)
      this.setRefreshToken(data.refresh_token)
      return true
    } catch {
      this.clearTokens()
      return false
    }
  }

  clearTokens() {
    this.accessToken = null
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }

  // Auth endpoints
  async login(credentials: LoginCredentials): Promise<TokenResponse> {
    const data = await this.request<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
    this.setAccessToken(data.access_token)
    this.setRefreshToken(data.refresh_token)
    return data
  }

  async register(userData: RegisterData): Promise<TokenResponse> {
    const data = await this.request<TokenResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
    this.setAccessToken(data.access_token)
    this.setRefreshToken(data.refresh_token)
    return data
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' })
    } finally {
      this.clearTokens()
    }
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me')
  }

  // Chat endpoints
  async sendMessage(
    message: string,
    sessionId?: string,
    companyId?: string
  ): Promise<any> {
    return this.request('/chat/message', {
      method: 'POST',
      body: JSON.stringify({
        message,
        session_id: sessionId,
        company_id: companyId,
      }),
    })
  }

  async getConversations(
    page = 1,
    perPage = 20
  ): Promise<{ conversations: ConversationSummary[]; total: number }> {
    return this.request(`/chat/conversations?page=${page}&per_page=${perPage}`)
  }

  async getConversation(sessionId: string): Promise<any> {
    return this.request(`/chat/conversations/${sessionId}`)
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.request(`/chat/session/${sessionId}`, { method: 'DELETE' })
  }

  // Issues endpoints
  async getIssues(
    status?: string,
    page = 1,
    perPage = 20
  ): Promise<IssueListResponse> {
    let url = `/issues?page=${page}&per_page=${perPage}`
    if (status) url += `&status=${status}`
    return this.request(url)
  }

  async getIssue(issueId: string): Promise<any> {
    return this.request(`/issues/${issueId}`)
  }

  async getIssueActivity(issueId: string): Promise<any> {
    return this.request(`/issues/${issueId}/activity`)
  }
}

export const api = new ApiClient()
