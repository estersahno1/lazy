import { describe, it, expect } from 'vitest'
import {
  formatLocalDate,
  todayLocalDate,
  weeksUntilDeadline,
  defaultWorkWeekIndices,
  addAcademicDays,
  dateToAcademicDayIndex,
  getWeekDays,
  getScheduleEventsForDate,
  findScheduleEventDay,
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

describe('getScheduleEventsForDate', () => {
  const monday = '2026-06-15' // Monday
  const scheduleByDay = {
    1: [
      { id: 'lecture', title: 'שיעור', time: '10:00', scheduledDate: null },
      { id: 'exam', title: 'מבחן', time: '14:00', scheduledDate: monday },
      { id: 'other-day', title: 'אחר', time: '09:00', scheduledDate: '2026-06-16' },
    ],
    2: [{ id: 'misplaced', title: 'בטעות', time: '11:00', scheduledDate: monday }],
  }

  it('includes recurring lectures and same-date events', () => {
    const events = getScheduleEventsForDate(scheduleByDay, monday)
    expect(events.map((e) => e.id)).toEqual(['lecture', 'misplaced', 'exam'])
  })

  it('excludes events dated for another day', () => {
    const events = getScheduleEventsForDate(scheduleByDay, monday)
    expect(events.find((e) => e.id === 'other-day')).toBeUndefined()
  })

  it('returns empty for missing date', () => {
    expect(getScheduleEventsForDate(scheduleByDay, '')).toEqual([])
  })
})

describe('findScheduleEventDay', () => {
  it('finds the day bucket for an event id', () => {
    const scheduleByDay = {
      0: [],
      3: [{ id: 'ev-1', title: 'שיעור' }],
    }
    expect(findScheduleEventDay(scheduleByDay, 'ev-1')).toBe(3)
    expect(findScheduleEventDay(scheduleByDay, 'missing')).toBeNull()
  })
})
