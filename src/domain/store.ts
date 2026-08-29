import type { AppState, ExecutionModel, Move, Project } from './persistence'

export function createProject(state: AppState, name: string): AppState {
  const project: Project = {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString().slice(0, 10),
    model: 'low-hanging-fruit' as ExecutionModel,
  }
  return { ...state, projects: [...state.projects, project] }
}

export function renameProject(state: AppState, id: string, name: string): AppState {
  return {
    ...state,
    projects: state.projects.map((p) => (p.id === id ? { ...p, name } : p)),
  }
}

export function setProjectModel(
  state: AppState,
  id: string,
  model: ExecutionModel,
): AppState {
  return {
    ...state,
    projects: state.projects.map((p) => (p.id === id ? { ...p, model } : p)),
  }
}

export function setGlobalModel(state: AppState, model: ExecutionModel): AppState {
  return { ...state, globalModel: model }
}

export function deleteProject(state: AppState, id: string): AppState {
  return {
    ...state,
    projects: state.projects.filter((p) => p.id !== id),
    moves: state.moves.filter((m) => m.projectId !== id),
  }
}

export type NewMove = {
  title: string
  deadline: string
  deadlineTime?: string | null
  difficulty?: number
  progress?: number
}

export function createMove(state: AppState, projectId: string, input: NewMove): AppState {
  const progress = clamp(input.progress ?? 0, 0, 100)
  const autoCompleted = progress >= 100
  const move: Move = {
    id: crypto.randomUUID(),
    projectId,
    title: input.title,
    difficulty: clamp(input.difficulty ?? 3, 1, 5),
    progress,
    deadline: input.deadline,
    deadlineTime: input.deadlineTime ?? null,
    completed: autoCompleted,
    completedAt: autoCompleted ? today() : null,
  }
  return { ...state, moves: [...state.moves, move] }
}

export type MovePatch = Partial<
  Pick<Move, 'title' | 'difficulty' | 'progress' | 'deadline' | 'deadlineTime'>
>

export function updateMove(state: AppState, id: string, patch: MovePatch): AppState {
  return {
    ...state,
    moves: state.moves.map((m) => {
      if (m.id !== id) return m
      const progress = clamp(patch.progress ?? m.progress, 0, 100)
      const autoCompleted = progress >= 100
      return {
        ...m,
        difficulty: clamp(patch.difficulty ?? m.difficulty, 1, 5),
        progress,
        title: patch.title ?? m.title,
        deadline: patch.deadline ?? m.deadline,
        deadlineTime:
          patch.deadlineTime === undefined ? m.deadlineTime : (patch.deadlineTime ?? null),
        completed: m.completed || autoCompleted,
        completedAt: m.completedAt ?? (autoCompleted ? today() : null),
      }
    }),
  }
}

export function setMoveCompleted(
  state: AppState,
  id: string,
  completed: boolean,
): AppState {
  return {
    ...state,
    moves: state.moves.map((m) => {
      if (m.id !== id) return m
      if (m.progress >= 100 && !completed) return m
      return {
        ...m,
        completed,
        completedAt: completed ? (m.completedAt ?? today()) : null,
      }
    }),
  }
}

export function deleteMove(state: AppState, id: string): AppState {
  return {
    ...state,
    moves: state.moves.filter((m) => m.id !== id),
  }
}

export function setMoveDeadline(state: AppState, id: string, deadline: string): AppState {
  return {
    ...state,
    moves: state.moves.map((m) => (m.id === id ? { ...m, deadline } : m)),
  }
}

export function reopenMove(state: AppState, id: string): AppState {
  return {
    ...state,
    moves: state.moves.map((m) =>
      m.id === id ? { ...m, completed: false, progress: 0 } : m,
    ),
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}