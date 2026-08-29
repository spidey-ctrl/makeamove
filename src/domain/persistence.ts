export type ExecutionModel = 'low-hanging-fruit' | 'high-hanging-fruit' | 'deadline-first'

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
  deadlineTime?: string | null
  completed: boolean
  completedAt: string | null
}

export type AppState = {
  schemaVersion: number
  projects: Project[]
  moves: Move[]
  globalModel: ExecutionModel
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
  globalModel?: ExecutionModel
}

export const SCHEMA_VERSION = 3
export const STORAGE_KEY = 'makeamove'

export function emptyState(): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    projects: [],
    moves: [],
    globalModel: 'low-hanging-fruit',
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
  let current: PersistedState = state
  let version = state.schemaVersion
  if (version < 2) {
    current = {
      ...current,
      schemaVersion: 2,
      projects: current.projects.map((p) => ({
        ...p,
        model: p.model ?? 'low-hanging-fruit' as ExecutionModel,
      })),
    }
    version = 2
  }
  if (version < 3) {
    current = {
      ...current,
      schemaVersion: 3,
      globalModel: current.globalModel ?? ('low-hanging-fruit' as ExecutionModel),
    }
  }
  return current as AppState
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