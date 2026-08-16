import { describe, expect, it } from 'vitest'
import {
  emptyState,
  hydrate,
  migrate,
  serialize,
  SCHEMA_VERSION,
  STORAGE_KEY,
} from './persistence'

describe('persistence seam', () => {
  it('seeds a clean empty state when storage is missing', () => {
    expect(hydrate(null)).toEqual(emptyState())
  })

  it('seeds a clean empty state when stored data is corrupt', () => {
    expect(hydrate('not json{{{')).toEqual(emptyState())
    expect(hydrate('{"schemaVersion": "nope"}')).toEqual(emptyState())
    expect(hydrate('{"schemaVersion": 2}')).toEqual(emptyState())
  })

  it('seeds a clean empty state when stored data has an unknown future schema', () => {
    expect(hydrate('{"schemaVersion": 99, "projects": [], "moves": []}')).toEqual(
      emptyState(),
    )
  })

  it('returns current-schema data unchanged', () => {
    const state = {
      schemaVersion: SCHEMA_VERSION,
      projects: [
        { id: 'p1', name: 'College', createdAt: '2026-08-16', model: 'low-hanging-fruit' as const },
      ],
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
      projects: [
        { id: 'p1', name: 'College', createdAt: '2026-08-16', model: 'high-hanging-fruit' as const },
      ],
    }
    expect(hydrate(serialize(state))).toEqual(state)
  })

  it('exposes a stable storage key', () => {
    expect(STORAGE_KEY).toBe('makeamove')
  })
})

describe('schema v1 -> v2 migration', () => {
  const v1State = {
    schemaVersion: 1,
    projects: [
      { id: 'p1', name: 'College', createdAt: '2026-08-16' },
      { id: 'p2', name: 'Work', createdAt: '2026-08-10' },
    ],
    moves: [],
  }

  it('migrate adds the default low-hanging-fruit model to every project', () => {
    const next = migrate(v1State)
    expect(next.schemaVersion).toBe(SCHEMA_VERSION)
    expect(next.projects[0].model).toBe('low-hanging-fruit')
    expect(next.projects[1].model).toBe('low-hanging-fruit')
  })

  it('hydrate upgrades stored v1 data transparently', () => {
    const next = hydrate(JSON.stringify(v1State))
    expect(next.schemaVersion).toBe(SCHEMA_VERSION)
    expect(next.projects).toHaveLength(2)
    expect(next.projects.every((p) => p.model === 'low-hanging-fruit')).toBe(true)
    expect(next.moves).toEqual([])
  })

  it('current-schema data is untouched by migration', () => {
    const current = {
      ...emptyState(),
      projects: [
        { id: 'p1', name: 'College', createdAt: '2026-08-16', model: 'high-hanging-fruit' as const },
      ],
    }
    expect(migrate(current)).toBe(current)
  })
})