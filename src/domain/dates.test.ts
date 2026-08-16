import { describe, expect, it } from 'vitest'
import { addDays, isOverdue, todayString } from './dates'

describe('overdue date logic', () => {
  it('counts a move overdue when its deadline is strictly before today', () => {
    expect(isOverdue('2026-08-15', '2026-08-16')).toBe(true)
  })

  it('does NOT count a move due today as overdue', () => {
    expect(isOverdue('2026-08-16', '2026-08-16')).toBe(false)
  })

  it('does not count a move due tomorrow as overdue', () => {
    expect(isOverdue('2026-08-17', '2026-08-16')).toBe(false)
  })

  it('defaultRolloverDate is today + 7 days', () => {
    expect(addDays('2026-08-16', 7)).toBe('2026-08-23')
  })

  it('adds across month boundaries', () => {
    expect(addDays('2026-08-30', 7)).toBe('2026-09-06')
  })

  it('adds across year boundaries', () => {
    expect(addDays('2026-12-30', 7)).toBe('2027-01-06')
  })

  it('todayString uses the local calendar date', () => {
    expect(todayString(new Date(2026, 7, 16))).toBe('2026-08-16')
    expect(todayString(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})