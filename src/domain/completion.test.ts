import { describe, expect, it } from 'vitest'
import { emptyState } from './persistence'
import {
  createProject,
  createMove,
  setMoveCompleted,
  updateMove,
} from './store'

function stateWithMove() {
  const withProject = createProject(emptyState(), 'College')
  const projectId = withProject.projects[0].id
  return createMove(withProject, projectId, {
    title: 'Finish essay',
    deadline: '2026-08-30',
  })
}

describe('move completion', () => {
  it('marks a move completed at any progress level', () => {
    const withMove = stateWithMove()
    const state = updateMove(withMove, withMove.moves[0].id, { progress: 60 })
    const moveId = state.moves[0].id
    const next = setMoveCompleted(state, moveId, true)
    expect(next.moves[0].completed).toBe(true)
    expect(next.moves[0].completedAt).toBeTruthy()
  })

  it('unticking a move below 100% progress is allowed', () => {
    const withMove = stateWithMove()
    const state = updateMove(withMove, withMove.moves[0].id, { progress: 60 })
    const moveId = state.moves[0].id
    const completed = setMoveCompleted(state, moveId, true)
    const next = setMoveCompleted(completed, moveId, false)
    expect(next.moves[0].completed).toBe(false)
    expect(next.moves[0].completedAt).toBeNull()
  })

  it('unticking a move at 100% progress is refused', () => {
    const withMove = stateWithMove()
    const state = updateMove(withMove, withMove.moves[0].id, { progress: 100 })
    const moveId = state.moves[0].id
    const next = setMoveCompleted(state, moveId, false)
    expect(next.moves[0].completed).toBe(true)
  })

  it('sliding progress to 100% auto-completes the move', () => {
    const withMove = stateWithMove()
    const state = updateMove(withMove, withMove.moves[0].id, { progress: 100 })
    expect(state.moves[0].completed).toBe(true)
    expect(state.moves[0].completedAt).toBeTruthy()
  })

  it('a completed move stays completed when its slider moves backwards', () => {
    const withMove = stateWithMove()
    const withTicked = setMoveCompleted(withMove, withMove.moves[0].id, true)
    const moveId = withTicked.moves[0].id
    const next = updateMove(withTicked, moveId, { progress: 40 })
    expect(next.moves[0].completed).toBe(true)
  })

  it('completion date is recorded once and persists across later edits', () => {
    const withMove = stateWithMove()
    const withTicked = setMoveCompleted(withMove, withMove.moves[0].id, true)
    const moveId = withTicked.moves[0].id
    const recorded = withTicked.moves[0].completedAt
    const next = updateMove(withTicked, moveId, { difficulty: 5 })
    expect(next.moves[0].completedAt).toBe(recorded)
  })
})