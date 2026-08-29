import type { AppState } from '../domain/persistence'

const TOKEN_KEY = 'makeamove_token'

export function getToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token === null) window.localStorage.removeItem(TOKEN_KEY)
  else window.localStorage.setItem(TOKEN_KEY, token)
}

export type AuthUser = {
  email: string
  verified: boolean
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (options.body !== undefined && !(options.body instanceof URLSearchParams)) {
    headers['Content-Type'] = 'application/json'
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(path, { ...options, headers })
  let data: unknown = null
  const text = await response.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }
  if (!response.ok) {
    const detail =
      data && typeof data === 'object' && 'detail' in data ? String((data as { detail: unknown }).detail) : 'Request failed'
    throw new ApiError(response.status, detail)
  }
  return data as T
}

export const api = {
  signup(email: string, password: string): Promise<{ token: string; user: { email: string } }> {
    return request('api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

  login(email: string, password: string): Promise<{ token: string; user: { email: string } }> {
    return request('api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

  me(): Promise<AuthUser> {
    return request('api/auth/me')
  },

  forgotPassword(email: string): Promise<{ message?: string }> {
    return request('api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  },

  resetPassword(token: string, password: string): Promise<{ message?: string }> {
    return request('api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    })
  },

  getState(): Promise<{ state: AppState | null; updatedAt: string | null }> {
    return request('api/me/state')
  },

  putState(state: AppState): Promise<{ ok: boolean; updatedAt: string | null }> {
    return request('api/me/state', {
      method: 'PUT',
      body: JSON.stringify({ state }),
    })
  },
}