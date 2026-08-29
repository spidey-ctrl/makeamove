import { createContext, useContext } from 'react'
import type { AuthUser } from '../api/client'

export type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string) => Promise<void>
  logout: () => void
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (token: string, password: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => undefined,
  signup: async () => undefined,
  logout: () => undefined,
  forgotPassword: async () => undefined,
  resetPassword: async () => undefined,
})

export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}