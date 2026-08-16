import { beforeEach, describe, expect, it } from 'vitest'
import { SCHEMA_VERSION, STORAGE_KEY } from './persistence'
import {
  createMove,
  createProject,
  reopenMove,
  setMoveCompleted,
  setMoveDeadline,
  setProjectModel,
  updateMove,
} from './store'
import { loadState, saveState } from './storage'
import { sortActiveMoves } from './strategy'
import { findOverdueMoves } from './rollover'
import { groupHistory } from './history'
import { addDays } from './dates'

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

  it('completed moves stay excluded from the engine in both models after reload', () => {
    let state = loadState()
    state = createProject(state, 'College')
    const projectId = state.projects[0].id
    state = createMove(state, projectId, { title: 'Done one', deadline: '2026-08-20' })
    state = setMoveCompleted(state, state.moves[0].id, true)
    state = createMove(state, projectId, { title: 'Open one', deadline: '2026-08-30' })
    saveState(state)

    const reloaded = loadState()
    const projectMoves = reloaded.moves.filter((m) => m.projectId === projectId)
    expect(
      sortActiveMoves(projectMoves, 'low-hanging-fruit').map((m) => m.title),
    ).toEqual(['Open one'])
    expect(
      sortActiveMoves(projectMoves, 'high-hanging-fruit').map((m) => m.title),
    ).toEqual(['Open one'])
  })

  it('still refuses unticking a move hydrated at 100% progress', () => {
    let state = loadState()
    state = createProject(state, 'College')
    const projectId = state.projects[0].id
    state = createMove(state, projectId, { title: 'Full', deadline: '2026-08-20' })
    state = updateMove(state, state.moves[0].id, { progress: 100 })
    saveState(state)

    const reloaded = loadState()
    const moveId = reloaded.moves[0].id
    const refused = setMoveCompleted(reloaded, moveId, false)
    expect(refused.moves[0].completed).toBe(true)
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

  it('detects overdue moves on load and a rolled-over deadline survives reload', () => {
    let state = loadState()
    state = createProject(state, 'College')
    const projectId = state.projects[0].id
    state = createMove(state, projectId, { title: 'Late one', deadline: '2026-08-01' })
    state = createMove(state, projectId, { title: 'Fine one', deadline: '2026-09-30' })
    const lateId = state.moves.find((m) => m.title === 'Late one')!.id
    saveState(state)

    const afterLoad = loadState()
    expect(
      findOverdueMoves(afterLoad.moves, '2026-08-16').map((m) => m.title),
    ).toEqual(['Late one'])

    const rolled = setMoveDeadline(afterLoad, lateId, addDays('2026-08-16', 7))
    saveState(rolled)

    const afterRoll = loadState()
    const late = afterRoll.moves.find((m) => m.id === lateId)!
    expect(late.deadline).toBe('2026-08-23')
    expect(findOverdueMoves(afterRoll.moves, '2026-08-16')).toHaveLength(0)
  })

  it('a completed move with a past deadline never triggers the rollover prompt after reload', () => {
    let state = loadState()
    state = createProject(state, 'College')
    const projectId = state.projects[0].id
    state = createMove(state, projectId, { title: 'Done, was late', deadline: '2026-08-01' })
    state = setMoveCompleted(state, state.moves[0].id, true)
    saveState(state)

    const reloaded = loadState()
    expect(findOverdueMoves(reloaded.moves, '2026-08-16')).toHaveLength(0)
  })

  it('rolling a deadline reshuffles the strategy engine order after reload', () => {
    let state = loadState()
    state = createProject(state, 'College')
    const projectId = state.projects[0].id
    state = createMove(state, projectId, { title: 'Was urgent', deadline: '2026-08-01' })
    state = createMove(state, projectId, { title: 'Due soon', deadline: '2026-08-20' })
    const urgentId = state.moves.find((m) => m.title === 'Was urgent')!.id
    saveState(state)

    expect(
      sortActiveMoves(
        state.moves.filter((m) => m.projectId === projectId),
        'low-hanging-fruit',
      ).map((m) => m.title),
    ).toEqual(['Was urgent', 'Due soon'])

    const rolled = setMoveDeadline(loadState(), urgentId, addDays('2026-08-16', 7))
    saveState(rolled)

    const afterRoll = loadState()
    expect(
      sortActiveMoves(
        afterRoll.moves.filter((m) => m.projectId === projectId),
        'low-hanging-fruit',
      ).map((m) => m.title),
    ).toEqual(['Due soon', 'Was urgent'])
  })

  it('reopen returns a move to the active list while its record stays in history after reload', () => {
    let state = loadState()
    state = createProject(state, 'College')
    const projectId = state.projects[0].id
    state = createMove(state, projectId, { title: 'Missed something', deadline: '2026-08-30' })
    state = setMoveCompleted(state, state.moves[0].id, true)
    const completedAt = state.moves[0].completedAt
    saveState(state)

    const reloaded = loadState()
    expect(groupHistory(reloaded.moves, '2026-08-16').length).toBeGreaterThan(0)

    const reopened = reopenMove(reloaded, reloaded.moves[0].id)
    saveState(reopened)

    const afterReopen = loadState()
    const move = afterReopen.moves[0]
    expect(move.completed).toBe(false)
    expect(move.progress).toBe(0)
    expect(move.completedAt).toBe(completedAt)
    const stillInHistory = groupHistory(afterReopen.moves, '2026-08-16')
    expect(stillInHistory.length).toBeGreaterThan(0)
    expect(stillInHistory[0].moves.map((m) => m.id)).toContain(move.id)
  })

  it('re-completing a reopened move keeps its original completion record (ADR 0002)', () => {
    let state = loadState()
    state = createProject(state, 'College')
    const projectId = state.projects[0].id
    state = createMove(state, projectId, { title: 'Redo', deadline: '2026-08-30' })
    state = setMoveCompleted(state, state.moves[0].id, true)
    const firstDate = state.moves[0].completedAt
    state = reopenMove(state, state.moves[0].id)
    saveState(state)

    const reopened = loadState()
    const reCompleted = setMoveCompleted(reopened, reopened.moves[0].id, true)
    saveState(reCompleted)

    const after = loadState()
    expect(after.moves[0].completed).toBe(true)
    expect(after.moves[0].completedAt).toBe(firstDate)
  })

  it('a reopened move that is still overdue reappears in the rollover prompt after reload', () => {
    let state = loadState()
    state = createProject(state, 'College')
    const projectId = state.projects[0].id
    state = createMove(state, projectId, { title: 'Round two', deadline: '2026-08-01' })
    state = setMoveCompleted(state, state.moves[0].id, true)
    saveState(state)

    const reloaded = loadState()
    expect(findOverdueMoves(reloaded.moves, '2026-08-16')).toHaveLength(0)
    const reopened = reopenMove(reloaded, reloaded.moves[0].id)
    saveState(reopened)

    const after = loadState()
    const prompts = findOverdueMoves(after.moves, '2026-08-16')
    expect(prompts.map((m) => m.title)).toEqual(['Round two'])
  })

  it('a reopened move returns to the strategy engine ordering after reload', () => {
    let state = loadState()
    state = createProject(state, 'College')
    const projectId = state.projects[0].id
    state = createMove(state, projectId, { title: 'Back in the list', deadline: '2026-08-10' })
    state = setMoveCompleted(state, state.moves[0].id, true)
    saveState(state)

    const reloaded = loadState()
    expect(
      sortActiveMoves(
        reloaded.moves.filter((m) => m.projectId === projectId),
        'low-hanging-fruit',
      ),
    ).toHaveLength(0)

    const reopened = reopenMove(reloaded, reloaded.moves[0].id)
    saveState(reopened)

    const after = loadState()
    const ordered = sortActiveMoves(
      after.moves.filter((m) => m.projectId === projectId),
      'low-hanging-fruit',
    )
    expect(ordered.map((m) => m.title)).toEqual(['Back in the list'])
  })
})