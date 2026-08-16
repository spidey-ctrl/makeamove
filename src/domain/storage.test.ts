import { beforeEach, describe, expect, it } from 'vitest'
import { SCHEMA_VERSION, STORAGE_KEY } from './persistence'
import {
  createMove,
  createProject,
  setMoveCompleted,
  setProjectModel,
  updateMove,
} from './store'
import { loadState, saveState } from './storage'
import { sortActiveMoves } from './strategy'

describe('projects and moves through the storage integration seam', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('persists a created project and move, and loads them back intact', () => {
    let state = loadState()
    state = createProject(state, 'College')
    const projectId = state.projects[0].id
    state = createMove(state, projectId, {
      title: 'Finish essay',
      deadline: '2026-08-30',
    })
    state = updateMove(state, state.moves[0].id, { progress: 75 })
    saveState(state)

    const reloaded = loadState()
    expect(reloaded.projects).toEqual([
      {
        id: projectId,
        name: 'College',
        createdAt: expect.any(String) as unknown,
        model: 'low-hanging-fruit',
      },
    ])
    expect(reloaded.moves).toHaveLength(1)
    expect(reloaded.moves[0]).toMatchObject({
      projectId,
      title: 'Finish essay',
      deadline: '2026-08-30',
      difficulty: 3,
      progress: 75,
      completed: false,
      completedAt: null,
    })
  })

  it('reload produces a clean empty app when storage is untouched', () => {
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(loadState()).toEqual({
      schemaVersion: SCHEMA_VERSION,
      projects: [],
      moves: [],
    })
  })

  it('persists completion state and excludes completed moves from the engine after reload', () => {
    let state = loadState()
    state = createProject(state, 'College')
    const projectId = state.projects[0].id
    state = createMove(state, projectId, { title: 'Done one', deadline: '2026-08-20' })
    state = setMoveCompleted(state, state.moves[0].id, true)
    state = createMove(state, projectId, { title: 'Open one', deadline: '2026-08-30' })
    const doneId = state.moves.find((m) => m.title === 'Done one')!.id
    saveState(state)

    const reloaded = loadState()
    const done = reloaded.moves.find((m) => m.id === doneId)!
    expect(done.completed).toBe(true)
    expect(done.completedAt).toBeTruthy()
    const titles = sortActiveMoves(
      reloaded.moves.filter((m) => m.projectId === projectId),
      'low-hanging-fruit',
    ).map((m) => m.title)
    expect(titles).toEqual(['Open one'])
  })

  it('migrates pre-v2 stored data on load through the storage boundary', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        projects: [{ id: 'p1', name: 'College', createdAt: '2026-08-16' }],
        moves: [],
      }),
    )

    const reloaded = loadState()
    expect(reloaded.schemaVersion).toBe(SCHEMA_VERSION)
    expect(reloaded.projects[0].model).toBe('low-hanging-fruit')
  })

  it('persists the execution model switch across a reload', () => {
    let state = loadState()
    state = createProject(state, 'College')
    const projectId = state.projects[0].id
    state = setProjectModel(state, projectId, 'high-hanging-fruit')
    saveState(state)

    const reloaded = loadState()
    expect(reloaded.projects[0].model).toBe('high-hanging-fruit')
  })

  it('applies the strategy engine to freshly hydrated moves after a reload', () => {
    let state = loadState()
    state = createProject(state, 'College')
    const projectId = state.projects[0].id
    state = createMove(state, projectId, {
      title: 'Hard one',
      deadline: '2026-09-10',
    })
    state = updateMove(state, state.moves[0].id, { difficulty: 5 })
    state = createMove(state, projectId, {
      title: 'Easy one',
      deadline: '2026-08-20',
    })
    saveState(state)

    const reloaded = loadState()
    const ids = sortActiveMoves(
      reloaded.moves.filter((m) => m.projectId === projectId),
      'high-hanging-fruit',
    ).map((m) => m.title)
    expect(ids).toEqual(['Hard one', 'Easy one'])
  })
})