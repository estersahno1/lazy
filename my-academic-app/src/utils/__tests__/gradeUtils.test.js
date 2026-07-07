import { describe, it, expect } from 'vitest'
import {
  calcGpaFromGrades,
  calcGpaForFilter,
  normalizeGrade,
  getGradeForCourse,
  gradesForUser,
} from '../gradeUtils'

describe('normalizeGrade', () => {
  it('clamps score to 0-100', () => {
    expect(normalizeGrade({ id: 1, course_id: 1, score: 150 }).score).toBe(100)
    expect(normalizeGrade({ id: 1, course_id: 1, score: -10 }).score).toBe(0)
  })
  it('defaults weight to 0', () => {
    const g = normalizeGrade({ id: 1, course_id: 1 })
    expect(g.weight).toBe(0)
  })
})

describe('calcGpaFromGrades', () => {
  const courses = [
    { id: 1, user_id: '1', course_name: 'Math' },
    { id: 2, user_id: '1', course_name: 'Physics' },
  ]
  const grades = [
    { id: 1, course_id: 1, score: 90, weight: 4 },
    { id: 2, course_id: 2, score: 80, weight: 3 },
  ]

  it('calculates weighted GPA', () => {
    // (90*4 + 80*3) / (4+3) = 600/7 ≈ 85.7
    expect(calcGpaFromGrades(grades, courses, '1')).toBe('85.7')
  })
  it('returns 0.0 for no grades', () => {
    expect(calcGpaFromGrades([], courses, '1')).toBe('0.0')
  })
})

describe('calcGpaForFilter', () => {
  const courses = [
    { id: 1, user_id: '1', course_name: 'Math', semester: "א'", year: "שנה א'" },
    { id: 2, user_id: '1', course_name: 'Physics', semester: "ב'", year: "שנה א'" },
    { id: 3, user_id: '1', course_name: 'Chem', semester: "א'", year: "שנה ב'" },
  ]
  const grades = [
    { id: 1, course_id: 1, score: 90, weight: 4 },
    { id: 2, course_id: 2, score: 80, weight: 3 },
    { id: 3, course_id: 3, score: 70, weight: 2 },
  ]

  it('filters by year', () => {
    const gpa = calcGpaForFilter(grades, courses, '1', { year: "שנה א'" })
    // (90*4 + 80*3) / 7 = 85.7
    expect(gpa).toBe('85.7')
  })
  it('filters by semester', () => {
    const gpa = calcGpaForFilter(grades, courses, '1', { semester: "א'", year: "שנה א'" })
    expect(gpa).toBe('90.0')
  })
})

describe('getGradeForCourse', () => {
  it('finds grade for course', () => {
    const grades = [{ id: 1, course_id: 5, score: 85, weight: 4 }]
    expect(getGradeForCourse(grades, 5)?.score).toBe(85)
  })
  it('returns null if not found', () => {
    expect(getGradeForCourse([], 99)).toBeNull()
  })
})
