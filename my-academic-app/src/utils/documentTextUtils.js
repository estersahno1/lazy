import mammoth from 'mammoth';
import { extractPdfText } from './pdfTextUtils';
import { MAX_PDF_SIZE } from './scheduleUtils';

const MAX_DOCX_SIZE = 2 * 1024 * 1024;

export async function extractDocxText(file) {
  if (file.size > MAX_DOCX_SIZE) {
    throw new Error('הקובץ גדול מדי. מקסימום 2MB');
  }
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value?.trim() || '';
}

export async function extractTxtText(file) {
  if (file.size > MAX_DOCX_SIZE) {
    throw new Error('הקובץ גדול מדי. מקסימום 2MB');
  }
  return file.text();
}

export async function extractDocumentText(file) {
  const name = (file.name || '').toLowerCase();

  if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
    return extractPdfText(file);
  }
  if (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx')
  ) {
    return extractDocxText(file);
  }
  if (file.type === 'text/plain' || name.endsWith('.txt')) {
    return extractTxtText(file);
  }

  throw new Error('פורמט לא נתמך. העלי PDF, Word (docx) או TXT');
}

export function isSupportedTaskFile(file) {
  const name = (file.name || '').toLowerCase();
  return (
    file.type === 'application/pdf' ||
    name.endsWith('.pdf') ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx') ||
    file.type === 'text/plain' ||
    name.endsWith('.txt')
  );
}

export { MAX_PDF_SIZE, MAX_DOCX_SIZE };
