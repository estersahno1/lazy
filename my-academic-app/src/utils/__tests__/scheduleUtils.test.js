import { describe, it, expect } from 'vitest'
import {
  formatLocalDate,
  todayLocalDate,
  weeksUntilDeadline,
  defaultWorkWeekIndices,
  addAcademicDays,
  dateToAcademicDayIndex,
  getWeekDays,
} from '../scheduleUtils'

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

describe('addAcademicDays (7-day week)', () => {
  it('counts every calendar day, including weekends', () => {
    const start = '2026-07-05' // a Sunday
    for (let i = 1; i <= 10; i += 1) {
      const expected = new Date(2026, 6, 5 + i)
      expect(addAcademicDays(start, i)).toBe(formatLocalDate(expected))
    }
  })

  it('lands on Friday/Saturday without skipping them', () => {
    const start = '2026-07-05' // a Sunday
    expect(new Date(`${addAcademicDays(start, 5)}T12:00:00`).getDay()).toBe(5)
    expect(new Date(`${addAcademicDays(start, 6)}T12:00:00`).getDay()).toBe(6)
  })
})

describe('dateToAcademicDayIndex (7-day week)', () => {
  it('returns the raw day-of-week for every day, 0-6', () => {
    const start = new Date(2026, 6, 5) // Sunday
    for (let i = 0; i <= 6; i += 1) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      expect(dateToAcademicDayIndex(formatLocalDate(d))).toBe(i)
    }
  })
})

describe('getWeekDays (7-day week)', () => {
  it('returns 7 days spanning Sunday through Saturday', () => {
    const { days } = getWeekDays(0)
    expect(days).toHaveLength(7)
    expect(days.map((d) => d.dayIndex)).toEqual([0, 1, 2, 3, 4, 5, 6])
  })
})
