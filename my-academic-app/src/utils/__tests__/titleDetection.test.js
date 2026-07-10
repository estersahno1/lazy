import { describe, it, expect } from 'vitest'
import { scoreTitleCandidate, detectTitle } from '../titleDetection'

function line(overrides) {
  return {
    text: '',
    page: 1,
    order: 0,
    fontSizePt: null,
    isBold: null,
    isUnderline: null,
    isAllCaps: false,
    indentLevel: 0,
    isCentered: false,
    positionRank: 'top',
    ...overrides,
  }
}

describe('scoreTitleCandidate', () => {
  it('rewards bold + large + early + phrase-matching lines', () => {
    const candidate = line({
      text: 'עבודה מסכמת בדיני חוקה',
      fontSizePt: 24,
      isBold: true,
      order: 1,
    })
    const score = scoreTitleCandidate(candidate, { medianFontSize: 12, lineIndex: 1 })
    // size(3) + bold(2) + first-10-lines(2) + phrase(3) = 10
    expect(score).toBe(10)
  })

  it('does not penalize a null formatting field', () => {
    const withUnknownUnderline = line({ text: 'Final Project', fontSizePt: 20, isBold: true, isUnderline: null })
    const score = scoreTitleCandidate(withUnknownUnderline, { medianFontSize: 12, lineIndex: 0 })
    // size(3) + bold(2) + first-10-lines(2) + phrase(3) = 10, underline contributes 0
    expect(score).toBe(10)
  })

  it('penalizes a full sentence and an over-long line', () => {
    const sentence = line({
      text: 'This paragraph happens to be bold but it is really just a long instructional sentence that goes on and on for quite a while.',
      isBold: true,
    })
    const score = scoreTitleCandidate(sentence, { medianFontSize: 12, lineIndex: 0 })
    // bold(2) + first-10-lines(2) - sentence(2) - length(2) = 0
    expect(score).toBe(0)
  })

  it('returns -Infinity for an empty line', () => {
    expect(scoreTitleCandidate(line({ text: '   ' }), { medianFontSize: 12, lineIndex: 0 })).toBe(-Infinity)
  })
})

describe('detectTitle', () => {
  it('picks the highest-scoring candidate over a longer plain-body line', () => {
    const lines = [
      line({ text: 'עבודה מסכמת — יסודות המשפט החוקתי', fontSizePt: 22, isBold: true, order: 0 }),
      line({ text: 'זהו טקסט גוף רגיל שמתאר את הרקע למטלה בצורה ארוכה ומפורטת יותר.', fontSizePt: 12, order: 1 }),
    ]
    const result = detectTitle(lines, 'irrelevant fallback text', 'file')
    expect(result.title).toContain('עבודה מסכמת')
    expect(result.confidence).toBe('high')
  })

  it('surfaces a near-tied second candidate as altTitle', () => {
    const lines = [
      line({ text: 'Constitutional Law Overview', fontSizePt: 22, isBold: true, order: 0 }),
      line({ text: 'Judicial Review of Emergency Powers', fontSizePt: 22, isBold: true, order: 1 }),
    ]
    const result = detectTitle(lines, 'irrelevant', 'file')
    expect(result.altTitle).not.toBeNull()
    expect(result.altTitle).not.toBe(result.title)
  })

  it('falls back to inferTaskTitle when no line has any signal', () => {
    const lines = [
      line({ text: 'assignment: please read the following carefully before starting.', order: 0 }),
      line({ text: 'this is just plain unformatted text with nothing special about it at all here.', order: 1 }),
    ]
    const result = detectTitle(lines, 'assignment: please read the following carefully before starting.', 'my-file')
    expect(result.title).toBeTruthy()
    expect(result.confidence).toBe('low')
  })

  it('falls back gracefully when given no lines at all', () => {
    const result = detectTitle([], '', 'uploaded-file')
    expect(result.title).toBeTruthy()
  })
})
