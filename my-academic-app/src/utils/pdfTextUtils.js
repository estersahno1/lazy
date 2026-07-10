import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { MAX_PDF_SIZE } from './scheduleUtils';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Groups raw pdf.js text items into rows by rounded Y-coordinate, sorted
// left-to-right within a row. Keeps per-row metadata (height/x-span/font)
// so callers can derive structural signals (size rank, position, bold
// heuristic) without re-walking the item list.
function collectPdfRows(items) {
  if (!items?.length) return [];

  const rows = [];
  for (const item of items) {
    if (!item.str?.trim()) continue;
    const y = item.transform ? Math.round(item.transform[5]) : 0;
    const x = item.transform ? Math.round(item.transform[4]) : 0;
    const height = item.transform ? Math.abs(item.transform[3]) : item.height || 0;
    const width = item.width || 0;
    const last = rows[rows.length - 1];
    const part = { x, text: item.str, height, fontName: item.fontName };
    if (last && Math.abs(last.y - y) <= 4) {
      last.parts.push(part);
      last.xEnd = Math.max(last.xEnd, x + width);
    } else {
      rows.push({ y, xStart: x, xEnd: x + width, parts: [part] });
    }
  }

  return rows.map((row) => {
    row.parts.sort((a, b) => a.x - b.x);
    const text = row.parts.map((p) => p.text).join(' ').replace(/\s+/g, ' ').trim();
    const height = Math.max(...row.parts.map((p) => p.height), 0);
    // attribute the row's font to whichever item is tallest (heuristic:
    // that's the most likely a heading run rather than an inline aside)
    const dominant = row.parts.reduce((a, b) => (b.height > a.height ? b : a), row.parts[0]);
    return { text, y: row.y, xStart: row.xStart, xEnd: row.xEnd, height, fontName: dominant?.fontName };
  });
}

function groupPdfItemsIntoLines(items) {
  return collectPdfRows(items).map((row) => row.text);
}

async function loadPdfDocument(data) {
  const uint8 = data instanceof Uint8Array ? data : new Uint8Array(data);

  try {
    return await pdfjsLib.getDocument({ data: uint8 }).promise;
  } catch (workerErr) {
    try {
      return await pdfjsLib.getDocument({ data: uint8, disableWorker: true }).promise;
    } catch {
      throw workerErr;
    }
  }
}

async function openPdf(file, maxSizeError) {
  if (file.size > MAX_PDF_SIZE) {
    throw new Error(maxSizeError);
  }
  try {
    const data = await file.arrayBuffer();
    return await loadPdfDocument(data);
  } catch (err) {
    const msg = err?.message || '';
    if (msg.includes('password') || msg.includes('Password')) {
      throw new Error('הקובץ מוגן בסיסמה. העלי קובץ ללא הגנה.');
    }
    throw new Error('לא ניתן לקרוא את קובץ ה-PDF. נסי Word (docx) או TXT.');
  }
}

export async function extractPdfText(file) {
  const pdf = await openPdf(file, 'הקובץ גדול מדי. מקסימום 2MB');

  const pageLines = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const lines = groupPdfItemsIntoLines(content.items);
    if (lines.length) pageLines.push(...lines);
  }

  const text = pageLines.join('\n').trim();
  if (!text) {
    throw new Error(
      'לא נמצא טקסט ב-PDF (ייתכן שזה סריקה). העלי Word (docx), TXT, או הדביקי את הטקסט ידנית.'
    );
  }

  return text;
}

// Structural extraction: same row-grouping primitive as extractPdfText, but
// keeps size/position/font metadata per row instead of collapsing to plain
// strings. isUnderline is always null — pdf.js exposes no reliable signal
// for it, and a guessed false would be presented with false confidence.
export async function extractPdfStructuredLines(file) {
  const pdf = await openPdf(file, 'הקובץ גדול מדי. מקסימום 2MB');

  const lines = [];
  let order = 0;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const rows = collectPdfRows(content.items);
    if (!rows.length) continue;

    const [, , pageWidth, pageHeight] = page.view;
    const topThird = pageHeight * (2 / 3);
    const bottomThird = pageHeight * (1 / 3);
    const pageCenterX = pageWidth / 2;

    rows.forEach((row) => {
      const rowCenterX = (row.xStart + row.xEnd) / 2;
      const isCentered = Math.abs(rowCenterX - pageCenterX) < pageWidth * 0.08;
      const fontLower = (row.fontName || '').toLowerCase();
      const isBold = /bold|black|heavy/.test(fontLower) || null;

      lines.push({
        text: row.text,
        page: pageNum,
        order: order++,
        fontSizePt: row.height || null,
        isBold,
        isUnderline: null,
        isAllCaps: /^[^a-z]*$/.test(row.text) && /[A-Zא-ת]/.test(row.text),
        indentLevel: 0,
        isCentered,
        positionRank: row.y >= topThird ? 'top' : row.y <= bottomThird ? 'bottom' : 'middle',
      });
    });
  }

  if (!lines.length) {
    throw new Error(
      'לא נמצא טקסט ב-PDF (ייתכן שזה סריקה). העלי Word (docx), TXT, או הדביקי את הטקסט ידנית.'
    );
  }

  return lines;
}
