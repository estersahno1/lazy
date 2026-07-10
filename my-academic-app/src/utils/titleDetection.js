import { inferTaskTitle } from './taskContentParser';

// Known academic-title phrasing (English + Hebrew). A match here is the
// strongest single signal a line is the assignment's title, but it's still
// additive with the other signals below rather than a hard gate — a
// document that titles itself something else entirely should still be
// caught by size/bold/position.
const TITLE_PHRASES = [
  'assignment instructions',
  'midterm assignment',
  'final project',
  'research paper',
  'homework assignment',
  'take-home exam',
  'seminar paper',
  'מטלת בית',
  'מטלת אמצע',
  'עבודה מסכמת',
  'עבודת סמינר',
  'עבודה סופית',
  'מבחן בית',
  'תרגיל בית',
  'עבודת חובה',
];

const CANDIDATE_WINDOW = 20;
const MAX_TITLE_LENGTH = 140;

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function matchesTitlePhrase(text) {
  const lower = text.toLowerCase();
  return TITLE_PHRASES.some((phrase) => lower.includes(phrase.toLowerCase()));
}

// Scores one StructuralLine as a title candidate. A `null` formatting
// field (format didn't expose that signal — e.g. underline on a PDF)
// contributes 0, never a penalty, so a PDF candidate isn't unfairly
// outscored by a DOCX candidate purely because DOCX exposes more signals.
export function scoreTitleCandidate(line, { medianFontSize, lineIndex }) {
  const text = (line.text || '').trim();
  if (!text) return -Infinity;

  let score = 0;

  if (medianFontSize && line.fontSizePt && line.fontSizePt >= medianFontSize * 1.3) score += 3;
  if (line.isBold === true) score += 2;
  if (line.isUnderline === true) score += 1;
  if (line.isCentered === true) score += 2;
  if (lineIndex < 10) score += 2;
  if (matchesTitlePhrase(text)) score += 3;
  if (/[.!?]\s*$/.test(text)) score -= 2;
  if (text.length > 100) score -= 2;

  return score;
}

function truncateTitle(text) {
  if (text.length <= MAX_TITLE_LENGTH) return text;
  return `${text.slice(0, MAX_TITLE_LENGTH - 1).trim()}…`;
}

// Scores every line in the first CANDIDATE_WINDOW lines and returns the
// top scorer as `title`. Falls back to the existing keyword-based
// inferTaskTitle() when nothing clears a minimal bar — this keeps
// behavior at least as good as today's build for plain-text uploads with
// no formatting signal at all.
export function detectTitle(lines, fallbackText, fallbackName) {
  const pool = (lines || []).slice(0, CANDIDATE_WINDOW).filter((l) => (l.text || '').trim());

  const medianFontSize = median(
    (lines || []).map((l) => l.fontSizePt).filter((v) => typeof v === 'number' && v > 0)
  );

  const scored = pool
    .map((line, idx) => ({
      line,
      score: scoreTitleCandidate(line, { medianFontSize, lineIndex: line.order ?? idx }),
    }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best || best.score <= 0) {
    return { title: inferTaskTitle(fallbackText, fallbackName), altTitle: null, confidence: 'low' };
  }

  const second = scored[1];
  const isTie = second && best.score - second.score <= 1 && second.line.text !== best.line.text;

  return {
    title: truncateTitle(best.line.text.trim()),
    altTitle: isTie ? truncateTitle(second.line.text.trim()) : null,
    confidence: best.score >= 5 ? 'high' : 'medium',
  };
}
