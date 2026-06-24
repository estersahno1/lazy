import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { MAX_PDF_SIZE } from './scheduleUtils';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function groupPdfItemsIntoLines(items) {
  if (!items?.length) return [];

  const rows = [];
  for (const item of items) {
    if (!item.str?.trim()) continue;
    const y = item.transform ? Math.round(item.transform[5]) : 0;
    const x = item.transform ? Math.round(item.transform[4]) : 0;
    const last = rows[rows.length - 1];
    if (last && Math.abs(last.y - y) <= 4) {
      last.parts.push({ x, text: item.str });
    } else {
      rows.push({ y, parts: [{ x, text: item.str }] });
    }
  }

  return rows.map((row) => {
    row.parts.sort((a, b) => a.x - b.x);
    return row.parts.map((p) => p.text).join(' ').replace(/\s+/g, ' ').trim();
  });
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

export async function extractPdfText(file) {
  if (file.size > MAX_PDF_SIZE) {
    throw new Error('הקובץ גדול מדי. מקסימום 2MB');
  }

  let pdf;
  try {
    const data = await file.arrayBuffer();
    pdf = await loadPdfDocument(data);
  } catch (err) {
    const msg = err?.message || '';
    if (msg.includes('password') || msg.includes('Password')) {
      throw new Error('הקובץ מוגן בסיסמה. העלי קובץ ללא הגנה.');
    }
    throw new Error('לא ניתן לקרוא את קובץ ה-PDF. נסי Word (docx) או TXT.');
  }

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
