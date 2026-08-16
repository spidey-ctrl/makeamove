export type ExecutionModel = 'low-hanging-fruit' | 'high-hanging-fruit'

export type Project = {
  id: string
  name: string
  createdAt: string
  model: ExecutionModel
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

export type PersistedProject = {
  id: string
  name: string
  createdAt: string
  model?: ExecutionModel
}

export type PersistedState = {
  schemaVersion: number
  projects: PersistedProject[]
  moves: Move[]
}

export const SCHEMA_VERSION = 2
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

  if (!isPersistedState(parsed)) return emptyState()
  if (parsed.schemaVersion > SCHEMA_VERSION) return emptyState()

  return migrate(parsed)
}

export function migrate(state: PersistedState): AppState {
  let current: AppState
  if (state.schemaVersion < 2) {
    current = migrateV1ToV2(state)
  } else {
    current = state as AppState
  }
  return current
}

function migrateV1ToV2(state: PersistedState): AppState {
  return {
    schemaVersion: 2,
    projects: state.projects.map((p) => ({
      ...p,
      model: p.model ?? 'low-hanging-fruit',
    })),
    moves: state.moves,
  }
}

export function serialize(state: AppState): string {
  return JSON.stringify(state)
}

function isPersistedState(value: unknown): value is PersistedState {
  if (typeof value !== 'object' || value === null) return false
  const state = value as Record<string, unknown>
  return (
    typeof state.schemaVersion === 'number' &&
    Array.isArray(state.projects) &&
    Array.isArray(state.moves)
  )
}