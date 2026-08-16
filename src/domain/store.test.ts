import { describe, expect, it } from 'vitest'
import { emptyState } from './persistence'
import { createProject, deleteProject, renameProject } from './store'

describe('project mutations', () => {
  it('createProject adds a project to the empty state', () => {
    const next = createProject(emptyState(), 'College')
    expect(next.projects).toHaveLength(1)
    expect(next.projects[0]).toMatchObject({
      name: 'College',
      createdAt: expect.any(String) as unknown,
    })
    expect(next.projects[0].id).toBeTruthy()
  })

  it('createProject does not mutate the input state', () => {
    const state = emptyState()
    createProject(state, 'College')
    expect(state.projects).toHaveLength(0)
  })

  it('renameProject renames an existing project', () => {
    const state = createProject(emptyState(), 'College')
    const id = state.projects[0].id
    const next = renameProject(state, id, 'Capstone')
    expect(next.projects[0].name).toBe('Capstone')
  })

  it('renameProject leaves other projects alone', () => {
    const two = createProject(createProject(emptyState(), 'A'), 'B')
    const idA = two.projects.find((p) => p.name === 'A')!.id
    const next = renameProject(two, idA, 'A2')
    const b = next.projects.find((p) => p.name === 'B')
    expect(b).toBeTruthy()
    expect(next.projects).toHaveLength(2)
  })

  it('deleteProject removes the project', () => {
    const state = createProject(emptyState(), 'College')
    const id = state.projects[0].id
    const next = deleteProject(state, id)
    expect(next.projects).toHaveLength(0)
  })

  it('deleteProject removes the project\'s moves too', () => {
    const state = {
      ...createProject(emptyState(), 'College'),
      moves: [
        {
          id: 'm1',
          projectId: '',
          title: 'Finish essay',
          difficulty: 3,
          progress: 60,
          deadline: '2026-08-30',
          completed: false,
          completedAt: null,
        },
      ],
    }
    const projectId = state.projects[0].id
    const withMoves = {
      ...state,
      moves: state.moves.map((m) => ({ ...m, projectId })),
    }
    const next = deleteProject(withMoves, projectId)
    expect(next.projects).toHaveLength(0)
    expect(next.moves).toHaveLength(0)
  })
})