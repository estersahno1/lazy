import mammoth from 'mammoth';
import { extractPdfStructuredLines } from './pdfTextUtils';

const MAX_DOCX_SIZE = 2 * 1024 * 1024;
const MAX_TXT_SIZE = 2 * 1024 * 1024;

// A StructuralLine carries whatever formatting signal the source format
// actually exposes. Fields that can't be determined for a given format
// (e.g. isUnderline from a PDF) are `null`, never a guessed `false` — see
// titleDetection.js, which treats `null` as "no signal" (0 points) rather
// than a penalty.
//
// { text, page, order, fontSizePt, isBold, isUnderline, isAllCaps,
//   indentLevel, isCentered, positionRank: 'top'|'middle'|'bottom' }

const HEADING_FONT_SIZE = { h1: 24, h2: 20, h3: 18, h4: 16, h5: 14, h6: 13 };

function isAllCaps(text) {
  return /^[^a-z]*$/.test(text) && /[A-Zא-ת]/.test(text);
}

function positionRankFor(index, total) {
  if (total <= 1) return 'top';
  const ratio = index / (total - 1);
  if (ratio <= 1 / 3) return 'top';
  if (ratio >= 2 / 3) return 'bottom';
  return 'middle';
}

// True if the element's content is wrapped end-to-end in `tagName` (a
// paragraph that's "the whole line is bold", not just one bolded word
// inside a longer sentence).
function isFullyWrapped(el, tagName) {
  const wrapped = el.querySelector(tagName);
  if (!wrapped) return false;
  const wrappedLen = (wrapped.textContent || '').trim().length;
  const totalLen = (el.textContent || '').trim().length;
  return totalLen > 0 && wrappedLen >= totalLen * 0.9;
}

export async function extractStructuredDocx(file) {
  if (file.size > MAX_DOCX_SIZE) {
    throw new Error('הקובץ גדול מדי. מקסימום 2MB');
  }
  const arrayBuffer = await file.arrayBuffer();
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const blocks = [...doc.body.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li')].filter(
    (el) => (el.textContent || '').trim().length > 0
  );

  const lines = blocks.map((el, index) => {
    const text = el.textContent.trim();
    const tag = el.tagName.toLowerCase();
    const heading = HEADING_FONT_SIZE[tag] ?? null;
    return {
      text,
      page: 1,
      order: index,
      fontSizePt: heading,
      isBold: heading ? true : isFullyWrapped(el, 'strong') ? true : null,
      isUnderline: isFullyWrapped(el, 'u') ? true : null,
      isAllCaps: isAllCaps(text),
      indentLevel: tag === 'li' ? 1 : 0,
      isCentered: false, // mammoth's default style map doesn't carry paragraph alignment
      positionRank: positionRankFor(index, blocks.length),
    };
  });

  const text = lines.map((l) => l.text).join('\n').trim();
  return { text, lines };
}

export async function extractStructuredPdf(file) {
  const lines = await extractPdfStructuredLines(file);
  const text = lines.map((l) => l.text).join('\n').trim();
  return { text, lines };
}

export async function extractStructuredTxt(file) {
  if (file.size > MAX_TXT_SIZE) {
    throw new Error('הקובץ גדול מדי. מקסימום 2MB');
  }
  const raw = await file.text();
  const rawLines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const lines = rawLines.map((text, index) => ({
    text,
    page: 1,
    order: index,
    fontSizePt: null,
    isBold: null,
    isUnderline: null,
    isAllCaps: isAllCaps(text),
    indentLevel: 0,
    isCentered: false,
    positionRank: positionRankFor(index, rawLines.length),
  }));

  return { text: raw.trim(), lines };
}

export async function extractStructuredDocument(file) {
  const name = (file.name || '').toLowerCase();

  if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
    return extractStructuredPdf(file);
  }
  if (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx')
  ) {
    return extractStructuredDocx(file);
  }
  if (file.type === 'text/plain' || name.endsWith('.txt')) {
    return extractStructuredTxt(file);
  }

  throw new Error('פורמט לא נתמך. העלי PDF, Word (docx) או TXT');
}
