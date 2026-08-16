import { describe, expect, it } from 'vitest'
import type { Move } from './persistence'
import { groupHistory } from './history'

function move(overrides: Partial<Move>): Move {
  return {
    id: Math.random().toString(36).slice(2),
    projectId: 'p1',
    title: 'A move',
    difficulty: 3,
    progress: 0,
    deadline: '2026-08-30',
    completed: false,
    completedAt: null,
    ...overrides,
  }
}

describe('history grouping', () => {
  it('groups completed moves into today, yesterday, and earlier', () => {
    const moves = [
      move({ id: 'earlier', completedAt: '2026-08-10' }),
      move({ id: 'yesterday', completedAt: '2026-08-15' }),
      move({ id: 'today', completedAt: '2026-08-16' }),
    ]
    const groups = groupHistory(moves, '2026-08-16')
    expect(groups.map((g) => g.label)).toEqual(['today', 'yesterday', 'earlier'])
    expect(groups.map((g) => g.moves[0].id)).toEqual(['today', 'yesterday', 'earlier'])
  })

  it('omits groups with no moves', () => {
    const groups = groupHistory(
      [move({ completedAt: '2026-08-10' }), move({ completedAt: '2026-08-16' })],
      '2026-08-16',
    )
    expect(groups.map((g) => g.label)).toEqual(['today', 'earlier'])
  })

  it('orders each group newest-completion-first', () => {
    const moves = [
      move({ id: 'older-today', completedAt: '2026-08-16' }),
      move({ id: 'newer-today', completedAt: '2026-08-16' }),
    ]
    const groups = groupHistory(moves, '2026-08-16')
    expect(groups[0].moves.map((m) => m.id)).toEqual(['newer-today', 'older-today'])
  })

  it('treats any completedAt older than yesterday as earlier', () => {
    const moves = [move({ completedAt: '2026-08-01' }), move({ completedAt: '2026-07-01' })]
    const groups = groupHistory(moves, '2026-08-16')
    expect(groups.map((g) => g.label)).toEqual(['earlier'])
  })
})