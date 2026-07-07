import { describe, it, expect } from 'vitest'
import { semesterVariant, normalizeCourse, sameUserId, coursesForUser } from '../courseUtils'

describe('semesterVariant', () => {
  it('returns primary for semester א', () => {
    expect(semesterVariant("א'")).toBe('primary')
  })
  it('returns pink for semester ב', () => {
    expect(semesterVariant("ב'")).toBe('pink')
  })
  it('returns summer for קיץ', () => {
    expect(semesterVariant('קיץ')).toBe('summer')
  })
})

describe('sameUserId', () => {
  it('returns true for same id', () => {
    expect(sameUserId('123', '123')).toBe(true)
  })
  it('returns false for different ids', () => {
    expect(sameUserId('123', '456')).toBe(false)
  })
  it('returns false when null', () => {
    expect(sameUserId(null, '123')).toBe(false)
  })
})

describe('coursesForUser', () => {
  const courses = [
    { id: 1, user_id: '100', course_name: 'Math' },
    { id: 2, user_id: '200', course_name: 'Physics' },
  ]
  it('filters courses by user id', () => {
    expect(coursesForUser(courses, '100')).toHaveLength(1)
    expect(coursesForUser(courses, '100')[0].course_name).toBe('Math')
  })
  it('returns empty for no userId', () => {
    expect(coursesForUser(courses, null)).toHaveLength(0)
  })
})

describe('normalizeCourse', () => {
  it('normalizes a course with defaults', () => {
    const result = normalizeCourse({ course_name: 'Algebra' }, '100')
    expect(result.course_name).toBe('Algebra')
    expect(result.semester).toBe("א'")
    expect(result.year).toBe("שנה א'")
  })
})
