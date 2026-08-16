import type { AppState, Project } from './persistence'

export function createProject(state: AppState, name: string): AppState {
  const project: Project = {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString().slice(0, 10),
  }
  return { ...state, projects: [...state.projects, project] }
}

export function renameProject(state: AppState, id: string, name: string): AppState {
  return {
    ...state,
    projects: state.projects.map((p) => (p.id === id ? { ...p, name } : p)),
  }
}

export function deleteProject(state: AppState, id: string): AppState {
  return {
    ...state,
    projects: state.projects.filter((p) => p.id !== id),
    moves: state.moves.filter((m) => m.projectId !== id),
  }
}