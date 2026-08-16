import { describe, expect, it } from 'vitest'
import { emptyState, hydrate, serialize, STORAGE_KEY } from './persistence'

describe('persistence seam', () => {
  it('seeds a clean empty state when storage is missing', () => {
    expect(hydrate(null)).toEqual(emptyState())
  })

  it('seeds a clean empty state when stored data is corrupt', () => {
    expect(hydrate('not json{{{')).toEqual(emptyState())
    expect(hydrate('{"schemaVersion": "nope"}')).toEqual(emptyState())
  })

  it('seeds a clean empty state when stored data has an unknown future schema', () => {
    expect(hydrate('{"schemaVersion": 99, "projects": [], "moves": []}')).toEqual(
      emptyState(),
    )
  })

  it('returns current-schema data unchanged', () => {
    const state = {
      schemaVersion: 1,
      projects: [{ id: 'p1', name: 'College', createdAt: '2026-08-16' }],
      moves: [
        {
          id: 'm1',
          projectId: 'p1',
          title: 'Finish essay',
          difficulty: 3,
          progress: 60,
          deadline: '2026-08-30',
          completed: false,
          completedAt: null,
        },
      ],
    }
    expect(hydrate(JSON.stringify(state))).toEqual(state)
  })

  it('round-trips state through serialize/hydrate', () => {
    const state = {
      ...emptyState(),
      projects: [{ id: 'p1', name: 'College', createdAt: '2026-08-16' }],
    }
    expect(hydrate(serialize(state))).toEqual(state)
  })

  it('exposes a stable storage key', () => {
    expect(STORAGE_KEY).toBe('makeamove')
  })
})
