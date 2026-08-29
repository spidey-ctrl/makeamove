import { useCallback, useEffect, useMemo, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in'
import { api, getToken, setToken, type AuthUser } from '../api/client'
import { AuthContext, type AuthContextValue } from './authContext'

const GOOGLE_CLIENT_ID: string = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? ''

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (Capacitor.isNativePlatform() && GOOGLE_CLIENT_ID) {
      GoogleSignIn.initialize({ clientId: GOOGLE_CLIENT_ID }).catch(() => undefined)
    }
  }, [])

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

  const googleSignIn = useCallback(async (idToken: string) => {
    const result = await api.google(idToken)
    setToken(result.token)
    setUser({ email: result.user.email, verified: true })
  }, [])

  const googleExchange = useCallback(async (code: string) => {
    const result = await api.googleExchange(code)
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
    () => ({ user, loading, login, signup, googleSignIn, googleExchange, logout, forgotPassword, resetPassword }),
    [user, loading, login, signup, googleSignIn, googleExchange, logout, forgotPassword, resetPassword],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}