import { describe, expect, it } from 'vitest'
import { nearestDueMoves } from './focus'
import type { Move } from './persistence'

function move(overrides: Partial<Move> & { id: string; deadline: string }): Move {
  return {
    projectId: 'p1',
    title: 'T',
    difficulty: 3,
    progress: 0,
    completed: false,
    completedAt: null,
    ...overrides,
  }
}

describe('nearestDueMoves', () => {
  it('returns the soonest future deadlines first, up to the count', () => {
    const moves = [
      move({ id: 'a', deadline: '2026-08-30' }),
      move({ id: 'b', deadline: '2026-08-20' }),
      move({ id: 'c', deadline: '2026-08-25' }),
    ]
    expect(nearestDueMoves(moves, '2026-08-16', 2).map((m) => m.id)).toEqual(['b', 'c'])
  })

  it('treats a deadline of today as due (not overdue) and includes it', () => {
    const moves = [
      move({ id: 'a', deadline: '2026-08-16' }),
      move({ id: 'b', deadline: '2026-08-22' }),
    ]
    expect(nearestDueMoves(moves, '2026-08-16', 3).map((m) => m.id)).toEqual(['a', 'b'])
  })

  it('excludes overdue moves whose deadline already passed', () => {
    const moves = [move({ id: 'past', deadline: '2026-08-10' })]
    expect(nearestDueMoves(moves, '2026-08-16', 3)).toHaveLength(0)
  })

  it('excludes completed moves even when their deadline is in the future', () => {
    const moves = [move({ id: 'done', deadline: '2026-08-20', completed: true })]
    expect(nearestDueMoves(moves, '2026-08-16', 3)).toHaveLength(0)
  })

  it('ties on the same deadline break deterministically by id', () => {
    const moves = [
      move({ id: 'z', deadline: '2026-08-20' }),
      move({ id: 'a', deadline: '2026-08-20' }),
    ]
    expect(nearestDueMoves(moves, '2026-08-16', 3).map((m) => m.id)).toEqual(['a', 'z'])
  })

  it('returns an empty array when there are no moves at all', () => {
    expect(nearestDueMoves([], '2026-08-16', 3)).toEqual([])
  })
})