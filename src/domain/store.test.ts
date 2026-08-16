import { describe, expect, it } from 'vitest'
import { emptyState } from './persistence'
import {
  createProject,
  createMove,
  deleteMove,
  setMoveDeadline,
  setProjectModel,
  updateMove,
} from './store'

function stateWithProject() {
  return createProject(emptyState(), 'College')
}

describe('move mutations', () => {
  it('createMove adds a move with defaults to the given project', () => {
    const state = stateWithProject()
    const projectId = state.projects[0].id
    const next = createMove(state, projectId, {
      title: 'Finish essay',
      deadline: '2026-08-30',
    })
    expect(next.moves).toHaveLength(1)
    expect(next.moves[0]).toMatchObject({
      projectId,
      title: 'Finish essay',
      deadline: '2026-08-30',
      difficulty: 3,
      progress: 0,
      completed: false,
      completedAt: null,
    })
    expect(next.moves[0].id).toBeTruthy()
  })

  it('createMove does not mutate the input state', () => {
    const state = stateWithProject()
    const projectId = state.projects[0].id
    createMove(state, projectId, { title: 'X', deadline: '2026-08-30' })
    expect(state.moves).toHaveLength(0)
  })

  it('createMove only adds moves to the targeted project', () => {
    const two = createProject(stateWithProject(), 'Work')
    const firstId = two.projects.find((p) => p.name === 'College')!.id
    const next = createMove(two, firstId, {
      title: 'Finish essay',
      deadline: '2026-08-30',
    })
    expect(next.moves).toHaveLength(1)
    expect(next.moves[0].projectId).toBe(firstId)
  })

  it('updateMove edits title, difficulty, progress, and deadline', () => {
    const state = stateWithProject()
    const projectId = state.projects[0].id
    const withMove = createMove(state, projectId, {
      title: 'Finish essay',
      deadline: '2026-08-30',
    })
    const moveId = withMove.moves[0].id
    const next = updateMove(withMove, moveId, {
      title: 'Proofread essay',
      difficulty: 5,
      progress: 75,
      deadline: '2026-09-01',
    })
    expect(next.moves[0]).toMatchObject({
      title: 'Proofread essay',
      difficulty: 5,
      progress: 75,
      deadline: '2026-09-01',
    })
  })

  it('updateMove leaves unrelated moves untouched', () => {
    const state = stateWithProject()
    const projectId = state.projects[0].id
    const withTwo = createMove(
      createMove(state, projectId, { title: 'A', deadline: '2026-08-30' }),
      projectId,
      { title: 'B', deadline: '2026-09-01' },
    )
    const a = withTwo.moves.find((m) => m.title === 'A')!
    const b = withTwo.moves.find((m) => m.title === 'B')!
    const next = updateMove(withTwo, a.id, { progress: 40 })
    expect(next.moves).toHaveLength(2)
    expect(next.moves.find((m) => m.id === b.id)!.progress).toBe(0)
  })

  it('updateMove clamps difficulty to 1-5 and progress to 0-100', () => {
    const state = stateWithProject()
    const projectId = state.projects[0].id
    const withMove = createMove(state, projectId, {
      title: 'Finish essay',
      deadline: '2026-08-30',
    })
    const moveId = withMove.moves[0].id
    const next = updateMove(withMove, moveId, { difficulty: 9, progress: -10 })
    expect(next.moves[0].difficulty).toBe(5)
    expect(next.moves[0].progress).toBe(0)
  })

  it('deleteMove removes only the given move', () => {
    const state = stateWithProject()
    const projectId = state.projects[0].id
    const withTwo = createMove(
      createMove(state, projectId, { title: 'A', deadline: '2026-08-30' }),
      projectId,
      { title: 'B', deadline: '2026-09-01' },
    )
    const a = withTwo.moves.find((m) => m.title === 'A')!
    const next = deleteMove(withTwo, a.id)
    expect(next.moves).toHaveLength(1)
    expect(next.moves[0].title).toBe('B')
  })
})

describe('execution model', () => {
  it('createProject defaults to low hanging fruit', () => {
    const next = createProject(emptyState(), 'College')
    expect(next.projects[0].model).toBe('low-hanging-fruit')
  })

  it('setProjectModel switches an existing project', () => {
    const state = createProject(emptyState(), 'College')
    const id = state.projects[0].id
    const next = setProjectModel(state, id, 'high-hanging-fruit')
    expect(next.projects[0].model).toBe('high-hanging-fruit')
  })
})

describe('rollover', () => {
  it('setMoveDeadline updates a move deadline', () => {
    const withProject = createProject(emptyState(), 'College')
    const projectId = withProject.projects[0].id
    const withMove = createMove(withProject, projectId, {
      title: 'Finish essay',
      deadline: '2026-08-30',
    })
    const id = withMove.moves[0].id
    const next = setMoveDeadline(withMove, id, '2026-09-06')
    expect(next.moves[0].deadline).toBe('2026-09-06')
  })
})