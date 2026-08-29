import { useEffect, useState } from 'react'
import { useAuth } from './authContext'
import { ApiError } from '../api/client'
import { GoogleButton } from './GoogleButton'

type Mode = 'login' | 'signup' | 'forgot' | 'reset' | 'message'

function resetTokenFromHash(): string | null {
  const raw = window.location.hash
  if (!raw.startsWith('#reset/')) return null
  const token = raw.slice('#reset/'.length)
  return token.length > 0 ? decodeURIComponent(token) : null
}

function clearResetHash() {
  window.history.replaceState(null, '', window.location.pathname + window.location.search)
}

export function AuthPages() {
  const auth = useAuth()
  const [serverToken] = useState(resetTokenFromHash)
  const [mode, setMode] = useState<Mode>(serverToken ? 'reset' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (mode !== 'login') return
    const token = resetTokenFromHash()
    if (token) {
      setMode('reset')
    }
  }, [mode])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (!code) return
    try {
      window.localStorage.removeItem('makeamove_gstate')
      window.sessionStorage.removeItem('makeamove_gstate')
    } catch {
      /* ignore storage errors */
    }
    setBusy(true)
    auth
      .googleExchange(code)
      .catch((err) => {
        const message = err instanceof ApiError ? err.message : 'Something went wrong. Try again.'
        setError(message)
      })
      .finally(() => {
        setBusy(false)
        window.history.replaceState(null, '', window.location.pathname)
      })
  }, [auth])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    if ((mode === 'signup' || mode === 'reset') && password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if ((mode === 'signup' || mode === 'reset') && password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setBusy(true)
    try {
      if (mode === 'login') {
        await auth.login(email.trim(), password)
      } else if (mode === 'signup') {
        await auth.signup(email.trim(), password)
      } else if (mode === 'forgot') {
        await auth.forgotPassword(email.trim())
        setMode('message')
        setNotice('Check your email for a reset link. It expires in 30 minutes.')
      } else if (mode === 'reset' && serverToken) {
        await auth.resetPassword(serverToken, password)
        clearResetHash()
        setMode('message')
        setNotice('Password updated. You can now sign in.')
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong. Try again.'
      setError(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="start-view">
      <div className="start-inner auth-inner">
        <div className="start-mark-row">
          <span className="start-mark">→</span>
          <span className="start-name">MakeAMove</span>
        </div>

        {mode === 'message' ? (
          <div className="auth-card">
            <p className="auth-notice">{notice}</p>
            {String(notice ?? '').includes('sign in') && (
              <button type="button" className="start-action start-primary" onClick={() => setMode('login')}>
                Go to login
              </button>
            )}
          </div>
        ) : (
          <div className="auth-card">
            {(mode === 'login' || mode === 'signup') && (
              <div className="auth-google-wrap">
                <GoogleButton />
                <div className="auth-divider">
                  <span>or</span>
                </div>
              </div>
            )}
            <form className="auth-form" onSubmit={handleSubmit}>
              <h1 className="auth-title">
                {mode === 'login' && 'Welcome back.'}
                {mode === 'signup' && 'Create your account.'}
                {mode === 'forgot' && 'Reset your password.'}
                {mode === 'reset' && 'Choose a new password.'}
              </h1>

            {mode !== 'reset' && (
              <label className="auth-field">
                <span className="auth-label">Email</span>
                <input
                  type="email"
                  className="input auth-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </label>
            )}

            {mode !== 'forgot' && (
              <label className="auth-field">
                <span className="auth-label">Password</span>
                <input
                  type="password"
                  className="input auth-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'reset' ? 'New password' : 'At least 8 characters'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                />
              </label>
            )}

            {(mode === 'signup' || mode === 'reset') && (
              <label className="auth-field">
                <span className="auth-label">Confirm password</span>
                <input
                  type="password"
                  className="input auth-input"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  required
                />
              </label>
            )}

            {error && <p className="auth-error">{error}</p>}

            <button
              type="submit"
              className="start-action start-primary"
              disabled={busy}
              style={busy ? { opacity: 0.6 } : undefined}
            >
              {busy
                ? 'Please wait…'
                : mode === 'login'
                  ? 'Sign in'
                  : mode === 'forgot'
                    ? 'Send reset link'
                    : mode === 'reset'
                      ? 'Update password'
                      : 'Create account'}
            </button>

            <div className="auth-switch">
              {mode === 'login' && (
                <>
                  <button type="button" className="btn-ghost-link" onClick={() => setMode('signup')}>
                    Create an account
                  </button>
                  <button type="button" className="btn-ghost-link" onClick={() => setMode('forgot')}>
                    Forgot password?
                  </button>
                </>
              )}
              {(mode === 'signup' || mode === 'forgot' || mode === 'reset') && (
                <button type="button" className="btn-ghost-link" onClick={() => setMode('login')}>
                  Back to sign in
                </button>
              )}
            </div>
            </form>
          </div>
        )}
      </div>
    </main>
  )
}