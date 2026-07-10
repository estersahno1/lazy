import { normalizeCourseName } from './courseNameUtils';

export const MAX_PDF_SIZE = 2 * 1024 * 1024; // 2MB

export function formatLocalDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayLocalDate() {
  return formatLocalDate(new Date());
}

export function weeksUntilDeadline(deadlineDate, deadlineTime = '23:59') {
  if (!deadlineDate) return 0;
  const now = new Date();
  const time = deadlineTime?.length === 5 ? deadlineTime : '23:59';
  const end = new Date(`${deadlineDate}T${time}:00`);
  const diffMs = end - now;
  if (diffMs <= 0) return 0;
  return Math.max(1, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)));
}

/** ברירת מחדל: שלושת השבועות האחרונים לפני היעד */
export function defaultWorkWeekIndices(totalWeeks) {
  const weeks = Math.max(1, Math.min(Number(totalWeeks) || 1, 16));
  if (weeks <= 3) return Array.from({ length: weeks }, (_, i) => i);
  return [weeks - 3, weeks - 2, weeks - 1];
}

function weekBucketBounds(weekIndex, totalWeeks, startDate, endDate) {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate.split('T')[0]}T12:00:00`);
  const spanMs = Math.max(end.getTime() - start.getTime(), 1);
  return {
    bucketStart: start.getTime() + (weekIndex / totalWeeks) * spanMs,
    bucketEnd: start.getTime() + ((weekIndex + 1) / totalWeeks) * spanMs,
  };
}

/** טווח תאריכי עבודה לפי שבועות שנבחרו (0 = השבוע הנוכחי, אחרון = לקראת היעד) */
export function getSelectedWeeksDateRange(totalWeeks, selectedWeekIndices, startDate, endDate) {
  const weeks = Math.max(1, Math.min(Number(totalWeeks) || 1, 16));
  const sortedWeeks =
    selectedWeekIndices?.length > 0
      ? [...new Set(selectedWeekIndices)].filter((i) => i >= 0 && i < weeks).sort((a, b) => a - b)
      : defaultWorkWeekIndices(weeks);

  if (!sortedWeeks.length) {
    const fallback = defaultWorkWeekIndices(weeks);
    const first = weekBucketBounds(fallback[0], weeks, startDate, endDate);
    const last = weekBucketBounds(fallback[fallback.length - 1], weeks, startDate, endDate);
    return { sortedWeeks: fallback, workStartMs: first.bucketStart, workEndMs: last.bucketEnd };
  }

  const first = weekBucketBounds(sortedWeeks[0], weeks, startDate, endDate);
  const last = weekBucketBounds(sortedWeeks[sortedWeeks.length - 1], weeks, startDate, endDate);
  return { sortedWeeks, workStartMs: first.bucketStart, workEndMs: last.bucketEnd };
}

export function formatDeadlineLabel(deadlineDate, deadlineTime) {
  if (!deadlineDate) return 'לא הוגדר';
  const d = new Date(`${deadlineDate}T12:00:00`);
  const dateLabel = d.toLocaleDateString('he-IL');
  return deadlineTime ? `${dateLabel} · ${deadlineTime}` : dateLabel;
}

export function isBeforeToday(dateStr) {
  if (!dateStr) return false;
  return dateStr < todayLocalDate();
}

export function getTodayAcademicDayIndex() {
  return new Date().getDay();
}

export function getSundayOfWeek(weekOffset = 0) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay() + weekOffset * 7);
  return sunday;
}

const MONTH_NAMES = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

const HEBREW_DAYS = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"];

export function getWeekDays(weekOffset = 0) {
  const sunday = getSundayOfWeek(weekOffset);
  const days = HEBREW_DAYS.map((letter, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return {
      letter,
      num: d.getDate(),
      dayIndex: i,
      date: formatLocalDate(d),
    };
  });
  const monthLabel = `${MONTH_NAMES[sunday.getMonth()]} ${sunday.getFullYear()}`;
  return { days, monthLabel, weekStart: formatLocalDate(sunday) };
}

export const CALENDAR_WEEK_HEADERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

export function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push({
      day: d,
      date: formatLocalDate(new Date(year, month, d)),
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return {
    year,
    month,
    cells,
    monthName: MONTH_NAMES[month],
  };
}

export function getWeekOffsetForDate(dateStr) {
  const targetSun = new Date(`${dateStr}T12:00:00`);
  targetSun.setDate(targetSun.getDate() - targetSun.getDay());
  targetSun.setHours(0, 0, 0, 0);
  const todaySun = getSundayOfWeek(0);
  return Math.round((targetSun - todaySun) / (7 * 86400000));
}

export function parseTime(time) {
  const [h, m] = String(time).split(':').map(Number);
  return h * 60 + (m || 0);
}

export function topToTime(top) {
  const pct = parseFloat(top) / 100;
  const start = 8 * 60;
  const end = 15 * 60;
  const mins = start + pct * (end - start);
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function normalizeMaterial(m) {
  if (typeof m === 'string') return { type: 'text', name: m };
  return m;
}

export function getMaterialName(m) {
  const mat = normalizeMaterial(m);
  return mat.name;
}

export function isPdfMaterial(m) {
  const mat = normalizeMaterial(m);
  return mat.type === 'pdf' && mat.data;
}

export function normalizeEvent(ev) {
  const materials = (ev.materials || []).map(normalizeMaterial);
  return {
    ...ev,
    time: ev.time || topToTime(ev.top),
    materials,
  };
}

function collectEvents(scheduleByDay, filterFn) {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayIdx = getTodayAcademicDayIndex();

  const all = [];
  for (let d = 0; d <= 6; d++) {
    (scheduleByDay[d] || []).forEach((ev) => {
      const normalized = normalizeEvent(ev);
      if (filterFn && !filterFn(normalized)) return;
      all.push({
        ...normalized,
        dayIndex: d,
        timeMinutes: parseTime(normalized.time),
      });
    });
  }
  all.sort((a, b) => a.dayIndex - b.dayIndex || a.timeMinutes - b.timeMinutes);

  const upcoming = all.find(
    (ev) =>
      ev.dayIndex > todayIdx ||
      (ev.dayIndex === todayIdx && ev.timeMinutes >= nowMinutes)
  );

  return { chosen: upcoming || all[0], todayIdx, all };
}

const DAY_NAMES = ["יום א'", "יום ב'", "יום ג'", "יום ד'", "יום ה'", "יום ו'", "יום שבת"];

function formatEventSummary(chosen, todayIdx) {
  if (!chosen) {
    return null;
  }
  const dayLabel = chosen.dayIndex !== todayIdx ? ` · ${DAY_NAMES[chosen.dayIndex]}` : '';
  const materials = chosen.materials || [];
  return {
    title: chosen.title,
    time: `${chosen.time}${dayLabel}`,
    location: chosen.room,
    materials,
    hasMaterials: materials.length > 0,
    dayIndex: chosen.dayIndex,
  };
}

export function getNextClassFromSchedule(scheduleByDay, knownCourseNames = null) {
  const known = Array.isArray(knownCourseNames)
    ? new Set(
        knownCourseNames
          .map((n) => normalizeCourseName(n).toLowerCase())
          .filter(Boolean)
      )
    : null;

  const { chosen, todayIdx } = collectEvents(scheduleByDay, (ev) => {
    if (ev.type !== 'lecture') return false;
    if (!known?.size) return true;
    return known.has(normalizeCourseName(ev.title).toLowerCase());
  });

  if (!chosen) {
    return {
      title: known?.size
        ? 'אין שיעורים קרובים בקורסים שלך'
        : 'אין שיעורים השבוע',
      time: '--:--',
      location: known?.size
        ? 'הוסיפי שיעורים במערכת השעות לקורסים מהציונים'
        : 'הוסיפי קורסים בציונים ושיעורים במערכת',
      materials: [],
      hasMaterials: false,
    };
  }
  return formatEventSummary(chosen, todayIdx);
}

export function getNextExamFromSchedule(scheduleByDay) {
  const { chosen, todayIdx } = collectEvents(
    scheduleByDay,
    (ev) => ev.type === 'exam'
  );
  if (!chosen) {
    return {
      title: 'אין בחינות קרובות',
      time: '--:--',
      location: 'הבחינות הבאות יופיעו כאן',
      materials: [],
      hasMaterials: false,
    };
  }
  return formatEventSummary(chosen, todayIdx);
}

export function readPdfFile(file) {
  return new Promise((resolve, reject) => {
    if (file.type !== 'application/pdf') {
      reject(new Error('רק קבצי PDF מותרים'));
      return;
    }
    if (file.size > MAX_PDF_SIZE) {
      reject(new Error('הקובץ גדול מדי. מקסימום 2MB (ללא מצגות)'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        type: 'pdf',
        name: file.name,
        data: reader.result,
        size: file.size,
      });
    };
    reader.onerror = () => reject(new Error('שגיאה בקריאת הקובץ'));
    reader.readAsDataURL(file);
  });
}

export function openPdfMaterial(material) {
  const mat = normalizeMaterial(material);
  if (mat.type === 'pdf' && mat.data) {
    window.open(mat.data, '_blank', 'noopener,noreferrer');
  }
}

const SCHEDULE_START_MINUTES = 8 * 60;
const SCHEDULE_END_MINUTES = 15 * 60;
const SCHEDULE_SPAN_MINUTES = SCHEDULE_END_MINUTES - SCHEDULE_START_MINUTES;

export function dateToAcademicDayIndex(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.getDay();
}

/** אירועי יום: חוזרים (בלי תאריך) + חד-פעמיים שתאריכם תואם */
export function getScheduleEventsForDate(scheduleByDay, dateStr) {
  if (!dateStr) return [];
  const dayIndex = dateToAcademicDayIndex(dateStr);
  const events = (scheduleByDay?.[dayIndex] || []).filter(
    (ev) => !ev.scheduledDate || ev.scheduledDate === dateStr
  );
  const seen = new Set(events.map((e) => e.id));
  for (let d = 0; d <= 6; d += 1) {
    if (d === dayIndex) continue;
    for (const ev of scheduleByDay?.[d] || []) {
      if (ev.scheduledDate === dateStr && !seen.has(ev.id)) {
        events.push(ev);
        seen.add(ev.id);
      }
    }
  }
  return events.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
}

export function findScheduleEventDay(scheduleByDay, eventId) {
  if (eventId == null) return null;
  for (let d = 0; d <= 6; d += 1) {
    if ((scheduleByDay?.[d] || []).some((e) => e.id === eventId)) return d;
  }
  return null;
}

export function addAcademicDays(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
}

export function offsetAcademicDays(dateStr, offset) {
  return addAcademicDays(dateStr, offset);
}

export function getDayIndexForScheduleDate(scheduledDate, weekOffset = 0) {
  const { days } = getWeekDays(weekOffset);
  const idx = days.findIndex((d) => d.date === scheduledDate);
  return idx >= 0 ? idx : dateToAcademicDayIndex(scheduledDate);
}

export function durationToHeight(durationMinutes) {
  const mins = Math.max(15, Number(durationMinutes) || 60);
  const pct = (mins / SCHEDULE_SPAN_MINUTES) * 100;
  return `${Math.max(4, Math.min(90, pct))}%`;
}

export function minutesToTop(timeMinutes) {
  const pct = ((timeMinutes - SCHEDULE_START_MINUTES) / SCHEDULE_SPAN_MINUTES) * 100;
  return `${Math.max(2, Math.min(85, pct))}%`;
}

export function findFreeTimeSlot(scheduleBlocks, durationMinutes, preferredStart = 9 * 60) {
  const duration = Math.max(15, Number(durationMinutes) || 60);
  const occupied = (scheduleBlocks || [])
    .map((block) => {
      const start = parseTime(block.time);
      const blockDuration = block.durationMinutes || 60;
      return { start, end: start + blockDuration };
    })
    .sort((a, b) => a.start - b.start);

  let candidate = Math.max(SCHEDULE_START_MINUTES, preferredStart);
  for (const block of occupied) {
    if (candidate + duration <= block.start) break;
    if (candidate < block.end) candidate = block.end;
  }

  if (candidate + duration > SCHEDULE_END_MINUTES) {
    candidate = SCHEDULE_START_MINUTES;
    for (const block of occupied) {
      if (candidate + duration <= block.start) break;
      if (candidate < block.end) candidate = block.end;
    }
  }

  return Math.min(candidate, SCHEDULE_END_MINUTES - duration);
}
