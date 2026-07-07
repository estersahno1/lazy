import { describe, it, expect } from 'vitest'
import { formatLocalDate, todayLocalDate, weeksUntilDeadline, defaultWorkWeekIndices } from '../scheduleUtils'

describe('formatLocalDate', () => {
  it('formats a date as YYYY-MM-DD', () => {
    const d = new Date(2026, 5, 15)
    expect(formatLocalDate(d)).toBe('2026-06-15')
  })
})

describe('todayLocalDate', () => {
  it('returns today as YYYY-MM-DD', () => {
    const result = todayLocalDate()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('weeksUntilDeadline', () => {
  it('returns 0 for past deadline', () => {
    expect(weeksUntilDeadline('2020-01-01')).toBe(0)
  })
  it('returns 0 for no deadline', () => {
    expect(weeksUntilDeadline('')).toBe(0)
  })
  it('returns positive for future deadline', () => {
    const future = new Date()
    future.setDate(future.getDate() + 30)
    const y = future.getFullYear()
    const m = String(future.getMonth() + 1).padStart(2, '0')
    const d = String(future.getDate()).padStart(2, '0')
    expect(weeksUntilDeadline(`${y}-${m}-${d}`)).toBeGreaterThan(0)
  })
})

describe('defaultWorkWeekIndices', () => {
  it('returns last 3 weeks for > 3 weeks', () => {
    expect(defaultWorkWeekIndices(10)).toEqual([7, 8, 9])
  })
  it('returns all weeks for <= 3', () => {
    expect(defaultWorkWeekIndices(2)).toEqual([0, 1])
  })
})
