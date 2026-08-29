import { describe, expect, it } from 'vitest'
import { emptyState, type AppState } from './persistence'
import { mergeStates } from './sync'

function withMove(
  state: AppState,
  overrides: Partial<{ id: string; title: string; difficulty: number; progress: number; deadline: string; completed: boolean }>,
): AppState {
  const move = {
    id: 'm1' as string,
    projectId: 'p1',
    title: 'Move',
    difficulty: 3,
    progress: 0,
    deadline: '2026-08-30',
    completed: false,
    completedAt: null,
    ...overrides,
  }
  return { ...state, moves: [move] }
}

describe('mergeStates', () => {
  it('keeps local when server is empty (migration)', () => {
    const local = withMove(emptyState(), { id: 'm1' })
    const merged = mergeStates(local, emptyState())
    expect(merged.moves).toHaveLength(1)
    expect(merged.projects).toEqual(local.projects)
  })

  it('adopts server when local is empty', () => {
    const server = withMove(emptyState(), { id: 'server-move' })
    const merged = mergeStates(emptyState(), server)
    expect(merged.moves[0].id).toBe('server-move')
  })

  it('unions disjoint projects and moves from both sides', () => {
    const local: AppState = { ...emptyState(), projects: [{ id: 'pa', name: 'A', createdAt: '2026-08-01', model: 'low-hanging-fruit' }] }
    const server: AppState = { ...emptyState(), projects: [{ id: 'pb', name: 'B', createdAt: '2026-08-02', model: 'low-hanging-fruit' }] }
    const merged = mergeStates(local, server)
    expect(merged.projects.map((p) => p.id).sort()).toEqual(['pa', 'pb'])
  })

  it('server wins fields for the same id but keeps the id', () => {
    const local = withMove(emptyState(), { id: 'm1', progress: 10 })
    const server = withMove(emptyState(), { id: 'm1', progress: 80 })
    const merged = mergeStates(local, server)
    expect(merged.moves).toHaveLength(1)
    expect(merged.moves[0].progress).toBe(80)
  })

  it('server globalModel wins', () => {
    const serverWithData: AppState = {
      ...emptyState(),
      globalModel: 'deadline-first',
      projects: [{ id: 'ps', name: 'S', createdAt: '2026-08-01', model: 'low-hanging-fruit' }],
    }
    const merged = mergeStates({ ...emptyState(), globalModel: 'low-hanging-fruit' }, serverWithData)
    expect(merged.globalModel).toBe('deadline-first')
  })
})