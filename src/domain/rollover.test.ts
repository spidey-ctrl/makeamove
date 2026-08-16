import { describe, expect, it } from 'vitest'
import { findOverdueMoves } from './rollover'
import type { Move } from './persistence'

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

describe('overdue move detection', () => {
  it('finds only active moves whose deadline is before today', () => {
    const moves = [
      move({ id: 'late', deadline: '2026-08-15' }),
      move({ id: 'today', deadline: '2026-08-16' }),
      move({ id: 'future', deadline: '2026-08-20' }),
      move({ id: 'done-late', deadline: '2026-08-10', completed: true, completedAt: '2026-08-12' }),
    ]
    expect(findOverdueMoves(moves, '2026-08-16').map((m) => m.id)).toEqual(['late'])
  })

  it('returns an empty list when nothing is overdue', () => {
    const moves = [move({ deadline: '2026-08-16' }), move({ deadline: '2026-08-20' })]
    expect(findOverdueMoves(moves, '2026-08-16')).toEqual([])
  })
})