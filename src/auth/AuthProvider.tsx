import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, getToken, setToken, type AuthUser } from '../api/client'
import { AuthContext, type AuthContextValue } from './authContext'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }
    api
      .me()
      .then((me) => setUser(me))
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login(email, password)
    setToken(result.token)
    setUser({ email: result.user.email, verified: true })
  }, [])

  const signup = useCallback(async (email: string, password: string) => {
    const result = await api.signup(email, password)
    setToken(result.token)
    setUser({ email: result.user.email, verified: true })
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const forgotPassword = useCallback(async (email: string) => {
    await api.forgotPassword(email)
  }, [])

  const resetPassword = useCallback(async (token: string, password: string) => {
    await api.resetPassword(token, password)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, signup, logout, forgotPassword, resetPassword }),
    [user, loading, login, signup, logout, forgotPassword, resetPassword],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}