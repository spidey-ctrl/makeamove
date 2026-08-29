import { describe, expect, it } from 'vitest'
import type { Move } from './persistence'
import { sortActiveMoves } from './strategy'

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

describe('strategy engine', () => {
  it('low hanging fruit orders by difficulty ascending', () => {
    const moves = [move({ id: 'hard', difficulty: 5 }), move({ id: 'easy', difficulty: 1 })]
    expect(sortActiveMoves(moves, 'low-hanging-fruit').map((m) => m.id)).toEqual([
      'easy',
      'hard',
    ])
  })

  it('high hanging fruit orders by difficulty descending', () => {
    const moves = [move({ id: 'easy', difficulty: 1 }), move({ id: 'hard', difficulty: 5 })]
    expect(sortActiveMoves(moves, 'high-hanging-fruit').map((m) => m.id)).toEqual([
      'hard',
      'easy',
    ])
  })

  it('ties are broken by deadline ascending in both models', () => {
    const moves = [
      move({ id: 'late', difficulty: 2, deadline: '2026-09-10' }),
      move({ id: 'early', difficulty: 2, deadline: '2026-08-20' }),
    ]
    expect(sortActiveMoves(moves, 'low-hanging-fruit').map((m) => m.id)).toEqual([
      'early',
      'late',
    ])
    expect(sortActiveMoves(moves, 'high-hanging-fruit').map((m) => m.id)).toEqual([
      'early',
      'late',
    ])
  })

  it('progress never affects the order', () => {
    const moves = [
      move({ id: 'progressed', difficulty: 2, deadline: '2026-08-20', progress: 90 }),
      move({ id: 'fresh', difficulty: 2, deadline: '2026-08-10', progress: 0 }),
    ]
    expect(sortActiveMoves(moves, 'low-hanging-fruit').map((m) => m.id)).toEqual([
      'fresh',
      'progressed',
    ])
  })

  it('excludes completed moves', () => {
    const moves = [
      move({ id: 'active', difficulty: 5 }),
      move({ id: 'done', difficulty: 1, completed: true, completedAt: '2026-08-16' }),
    ]
    expect(sortActiveMoves(moves, 'low-hanging-fruit').map((m) => m.id)).toEqual([
      'active',
    ])
  })

  it('handles empty and single-move inputs', () => {
    expect(sortActiveMoves([], 'low-hanging-fruit')).toEqual([])
    const only = move({ id: 'solo', difficulty: 3 })
    expect(sortActiveMoves([only], 'high-hanging-fruit')).toEqual([only])
  })

  it('deadline first orders by due date ascending', () => {
    const moves = [
      move({ id: 'late', difficulty: 5, deadline: '2026-09-10' }),
      move({ id: 'early', difficulty: 1, deadline: '2026-08-20' }),
    ]
    expect(sortActiveMoves(moves, 'deadline-first').map((m) => m.id)).toEqual([
      'early',
      'late',
    ])
  })

  it('deadline first falls back to easiest for same-day deadlines', () => {
    const moves = [
      move({ id: 'hard', difficulty: 5, deadline: '2026-08-20' }),
      move({ id: 'easy', difficulty: 1, deadline: '2026-08-20' }),
    ]
    expect(sortActiveMoves(moves, 'deadline-first').map((m) => m.id)).toEqual([
      'easy',
      'hard',
    ])
  })
})