export type Project = {
  id: string
  name: string
  createdAt: string
}

export type Move = {
  id: string
  projectId: string
  title: string
  difficulty: number
  progress: number
  deadline: string
  completed: boolean
  completedAt: string | null
}

export type AppState = {
  schemaVersion: number
  projects: Project[]
  moves: Move[]
}

export const SCHEMA_VERSION = 1
export const STORAGE_KEY = 'makeamove'

export function emptyState(): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    projects: [],
    moves: [],
  }
}

export function hydrate(raw: string | null): AppState {
  if (raw === null) return emptyState()

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return emptyState()
  }

  if (!isAppState(parsed)) return emptyState()
  if (parsed.schemaVersion > SCHEMA_VERSION) return emptyState()

  return parsed
}

export function serialize(state: AppState): string {
  return JSON.stringify(state)
}

function isAppState(value: unknown): value is AppState {
  if (typeof value !== 'object' || value === null) return false
  const state = value as Record<string, unknown>
  return (
    state.schemaVersion === SCHEMA_VERSION &&
    Array.isArray(state.projects) &&
    Array.isArray(state.moves)
  )
}
