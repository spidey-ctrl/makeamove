import type { AppState, Move, Project } from './persistence'

export function mergeStates(local: AppState, server: AppState): AppState {
  if (server.projects.length === 0 && server.moves.length === 0) return local

  const projectMap = new Map<string, Project>()
  for (const p of [...local.projects, ...server.projects]) projectMap.set(p.id, p)

  const moveMap = new Map<string, Move>()
  for (const m of [...local.moves, ...server.moves]) moveMap.set(m.id, m)

  return {
    schemaVersion: Math.max(local.schemaVersion, server.schemaVersion),
    projects: [...projectMap.values()],
    moves: [...moveMap.values()],
    globalModel: server.globalModel,
  }
}