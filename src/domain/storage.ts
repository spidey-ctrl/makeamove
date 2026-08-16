import { hydrate, serialize, STORAGE_KEY, type AppState } from './persistence'

export function loadState(): AppState {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  return hydrate(raw)
}

export function saveState(state: AppState): void {
  window.localStorage.setItem(STORAGE_KEY, serialize(state))
}