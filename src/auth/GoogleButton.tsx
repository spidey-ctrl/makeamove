import { useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { ErrorCode, GoogleSignIn } from '@capawesome/capacitor-google-sign-in'
import { useAuth } from './authContext'
import { ApiError } from '../api/client'

const CLIENT_ID: string = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? ''
const REDIRECT_URI = 'https://makeamove-flame.vercel.app'

const GSTATE_KEY = 'makeamove_gstate'

function persistState(state: string): void {
  try {
    window.localStorage.setItem(GSTATE_KEY, state)
    window.sessionStorage.setItem(GSTATE_KEY, state)
  } catch {
    /* storage unavailable; exchange still proceeds without a state match */
  }
}

function buildGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

function GoogleGMark() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.1 24.5c0-1.5-.1-2.9-.4-4.3H24v8.2h11.9c-.5 2.8-2.1 5.2-4.5 6.8v5.7h7.3c4.3-4 6.4-9.9 6.4-16.4z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 12-2.1 16-5.8l-7.3-5.7c-2.2 1.5-5 2.4-8.7 2.4-6.7 0-12.3-4.5-14.4-10.6H2.1v5.9C6.1 42.6 14.4 48 24 48z"
      />
      <path
        fill="#FBBC05"
        d="M9.6 28.3c-.5-1.4-.8-2.9-.8-4.3s.3-2.9.8-4.3v-5.9H2.1A24.3 24.3 0 0 0 0 24c0 3.9.9 7.6 2.1 10.8l7.5-6.5z"
      />
      <path
        fill="#EA4335"
        d="M24 9.6c3.5 0 6.7 1.2 9.2 3.6l6.8-6.8C36 2.7 30.5.6 24 .6 14.4.6 6.1 6 2.1 13.2l7.5 6.5C11.7 14.1 17.3 9.6 24 9.6z"
      />
    </svg>
  )
}

type GoogleButtonProps = {
  onBusy?: (busy: boolean) => void
  onError?: (message: string | null) => void
}

export function GoogleButton({ onBusy, onError }: GoogleButtonProps) {
  const auth = useAuth()
  const [busy, setBusy] = useState(false)

  if (!CLIENT_ID) return null

  async function handleNativeClick() {
    setBusy(true)
    onBusy?.(true)
    onError?.(null)
    try {
      const result = await GoogleSignIn.signIn()
      if (!result.idToken) {
        throw new Error('Google did not return an ID token.')
      }
      await auth.googleSignIn(result.idToken)
    } catch (err) {
      const canceled = err instanceof Error && 'code' in err && err.code === ErrorCode.SignInCanceled
      if (!canceled) {
        const message = err instanceof ApiError ? err.message : 'Google sign-in failed. Try again.'
        onError?.(message)
      }
    } finally {
      setBusy(false)
      onBusy?.(false)
    }
  }

  function handleWebClick() {
    const state =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2)
    persistState(state)
    window.location.assign(buildGoogleAuthUrl(state))
  }

  const handleClick = () => {
    if (Capacitor.isNativePlatform()) {
      void handleNativeClick()
    } else {
      handleWebClick()
    }
  }

  return (
    <button type="button" className="google-btn-redirect" onClick={handleClick} disabled={busy}>
      <GoogleGMark />
      <span>{busy ? 'Please wait…' : 'Continue with Google'}</span>
    </button>
  )
}