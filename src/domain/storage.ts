import { hydrate, serialize, STORAGE_KEY, type AppState } from './persistence'

export const OWNER_KEY = 'makeamove_owner'

export function loadState(): AppState {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  return hydrate(raw)
}

export function saveState(state: AppState): void {
  window.localStorage.setItem(STORAGE_KEY, serialize(state))
}

export function loadOwner(): string | null {
  return window.localStorage.getItem(OWNER_KEY)
}

export function saveOwner(email: string): void {
  window.localStorage.setItem(OWNER_KEY, email)
}

export function clearLocalData(): void {
  window.localStorage.removeItem(STORAGE_KEY)
  window.localStorage.removeItem(OWNER_KEY)
}