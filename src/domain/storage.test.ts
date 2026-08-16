import { beforeEach, describe, expect, it } from 'vitest'
import { STORAGE_KEY } from './persistence'
import { createMove, createProject, updateMove } from './store'
import { loadState, saveState } from './storage'

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
      { id: projectId, name: 'College', createdAt: expect.any(String) },
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
      schemaVersion: 1,
      projects: [],
      moves: [],
    })
  })
})