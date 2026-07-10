import {
  todayLocalDate,
  isBeforeToday,
  addAcademicDays,
  offsetAcademicDays,
  formatLocalDate,
  weeksUntilDeadline,
  getSelectedWeeksDateRange,
} from './scheduleUtils';
import { parseTasksFromDocument } from './taskContentParser';

const STEP_TEMPLATES = [
  {
    title: 'איסוף מקורות וקריאה ראשונית',
    description: 'אספי חומרים, מאמרים ומקורות רלוונטיים לנושא המשימה.',
    durationMinutes: 60,
  },
  {
    title: 'סקירת ספרות ותכנון',
    description: 'כתבי סקירת ספרות ותכנני את מבנה העבודה.',
    durationMinutes: 90,
  },
  {
    title: 'כתיבת טיוטה ראשונה',
    description: 'כתבי טיוטה ראשונית ללא התעכבות על ניסוח מושלם.',
    durationMinutes: 120,
  },
  {
    title: 'עריכה ושיפור',
    description: 'עברי על הטקסט, חזקי טיעונים ותקני ניסוח.',
    durationMinutes: 90,
  },
  {
    title: 'בדיקה סופית והגשה',
    description: 'בדקי פורמט, ביבליוגרפיה ודדליין לפני ההגשה.',
    durationMinutes: 60,
  },
  {
    title: 'הכנה לפי משוב',
    description: 'הטמיעי הערות והשלימי חלקים חסרים לפי הצורך.',
    durationMinutes: 60,
  },
];

export const STEP_STATUS_LABELS = {
  done: 'הושלם',
  active: 'בוצע',
  pending: 'טרם החל',
  at_risk: 'בסיכון',
};

export function extractSubtaskTitle(subtask) {
  if (subtask.subtask_title) return subtask.subtask_title;
  if (subtask.title) return subtask.title;
  return subtask.text?.replace(/^\d+\.\s*/, '').split(' (')[0] || 'תת-משימה';
}

export function formatDuration(minutes) {
  const m = Math.max(1, Number(minutes) || 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem > 0 ? `${h} ש׳ ${rem} ד׳` : `${h} שעות`;
  }
  return `${m} דק׳`;
}

export function formatAllocatedTime(subtask) {
  const dateStr = subtask.allocated_time;
  if (!dateStr) return 'לא שובץ בלו״ז';
  const d = new Date(`${dateStr.split('T')[0]}T12:00:00`);
  const dateLabel = d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
  if (subtask.allocatedTime) {
    return `${dateLabel} · ${subtask.allocatedTime}`;
  }
  return dateLabel;
}

export function normalizeSubtask(subtask, taskId, defaults = {}) {
  const is_done =
    subtask.is_done === true || subtask.status === 'done' || defaults.is_done === true;

  let status = subtask.status;
  if (!status) {
    if (is_done) status = 'done';
    else if (defaults.status) status = defaults.status;
    else status = 'pending';
  }
  if (is_done) status = 'done';

  const allocated_time =
    subtask.allocated_time ??
    subtask.scheduledDate ??
    defaults.allocated_time ??
    null;

  return {
    id: Number(subtask.id) || Date.now() + Math.floor(Math.random() * 1000),
    task_id: Number(subtask.task_id ?? taskId),
    subtask_title: extractSubtaskTitle(subtask),
    allocated_time,
    is_done: Boolean(is_done),
    status,
    label: subtask.label ?? STEP_STATUS_LABELS[status] ?? STEP_STATUS_LABELS.pending,
    durationMinutes: subtask.durationMinutes ?? defaults.durationMinutes ?? 60,
    allocatedTime: subtask.allocatedTime ?? subtask.time ?? null,
    scheduleEventId: subtask.scheduleEventId ?? null,
    description: subtask.description ?? '',
    rescheduleCount: subtask.rescheduleCount ?? 0,
  };
}

export function getTaskSubtasks(task) {
  const list = task.subtasks ?? task.steps ?? [];
  const taskId = Number(task.id);
  return list.map((s, i) => normalizeSubtask(s, taskId, { index: i }));
}

/** @deprecated use normalizeSubtask */
export const normalizeAiStep = normalizeSubtask;
export const extractStepTitle = extractSubtaskTitle;

export function buildStepText(stepNumber, title, scheduledDate) {
  const d = new Date(`${scheduledDate}T12:00:00`);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${stepNumber}. ${title} (${day}.${month})`;
}

export function reconcileTaskSteps(task) {
  const today = todayLocalDate();
  const taskId = Number(task.id);
  let subtasks = getTaskSubtasks(task);
  let assignDate = today;
  let changed = false;

  subtasks = subtasks.map((subtask, i) => {
    if (subtask.is_done) return subtask;
    if (!subtask.allocated_time || !isBeforeToday(subtask.allocated_time.split('T')[0])) {
      return subtask;
    }

    changed = true;
    const newDate = assignDate;
    assignDate = addAcademicDays(assignDate, 1);

    return normalizeSubtask(
      {
        ...subtask,
        status: 'at_risk',
        is_done: false,
        allocated_time: newDate,
        rescheduleCount: (subtask.rescheduleCount || 0) + 1,
        scheduleEventId: null,
      },
      taskId,
      { index: i }
    );
  });

  const firstIncompleteIdx = subtasks.findIndex((s) => !s.is_done);
  if (firstIncompleteIdx >= 0) {
    let activeIdx = -1;
    for (let i = 0; i < subtasks.length; i += 1) {
      const s = subtasks[i];
      if (s.is_done) continue;
      const d = (s.allocated_time || '').split('T')[0];
      if (d && d <= today) {
        activeIdx = i;
        break;
      }
    }

    subtasks = subtasks.map((subtask, i) => {
      if (subtask.is_done) return subtask;

      if (i === activeIdx) {
        if (subtask.status === 'at_risk') return subtask;
        const nextStatus = isBeforeToday((subtask.allocated_time || '').split('T')[0])
          ? 'at_risk'
          : 'active';
        if (subtask.status !== nextStatus) changed = true;
        return normalizeSubtask(
          { ...subtask, status: nextStatus, is_done: false },
          taskId,
          { index: i }
        );
      }

      if (subtask.status === 'active') {
        changed = true;
        return normalizeSubtask(
          { ...subtask, status: 'pending', is_done: false },
          taskId,
          { index: i }
        );
      }

      return subtask;
    });
  }

  return { task: { ...task, subtasks, steps: subtasks }, changed };
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

export function resolveSubtaskStatus(allocatedDate, today) {
  if (isBeforeToday(allocatedDate)) return 'at_risk';
  if (allocatedDate === today) return 'active';
  return 'pending';
}

function allocateDatesForSubtasks(subtaskCount, totalWeeks, selectedWeekIndices, startDate, endDate) {
  const { sortedWeeks, workStartMs, workEndMs } = getSelectedWeeksDateRange(
    totalWeeks,
    selectedWeekIndices,
    startDate,
    endDate
  );
  const workSpan = Math.max(workEndMs - workStartMs, 1);

  if (subtaskCount <= 1) {
    return [formatLocalDate(new Date(workStartMs + workSpan * 0.5))];
  }

  return Array.from({ length: subtaskCount }, (_, i) => {
    const weekPick =
      sortedWeeks[Math.min(sortedWeeks.length - 1, Math.floor((i * sortedWeeks.length) / subtaskCount))];
    const bucket = weekBucketBounds(weekPick, totalWeeks, startDate, endDate);
    const bucketStart = Math.max(bucket.bucketStart, workStartMs);
    const bucketEnd = Math.min(bucket.bucketEnd, workEndMs);
    const bucketSpan = Math.max(bucketEnd - bucketStart, 1);

    const weekAssignments = Array.from({ length: subtaskCount }, (_, j) =>
      sortedWeeks[Math.min(sortedWeeks.length - 1, Math.floor((j * sortedWeeks.length) / subtaskCount))]
    );
    const inWeek = weekAssignments
      .map((w, j) => (w === weekPick ? j : -1))
      .filter((j) => j >= 0);
    const posInWeek = inWeek.indexOf(i);
    const countInWeek = inWeek.length;
    const offset = countInWeek <= 1 ? 0.5 : (posInWeek + 1) / (countInWeek + 1);
    return formatLocalDate(new Date(bucketStart + bucketSpan * offset));
  });
}

export function splitTaskFromContent({
  weeks,
  hoursPerWeek,
  deadline,
  deadlineTime = '23:59',
  taskId,
  documentText = '',
  parsedItems = null,
  fromDocument = false,
  selectedWeekIndices = null,
}) {
  const totalWeeks = Math.max(
    1,
    Math.min(
      deadline ? weeksUntilDeadline(deadline, deadlineTime) : Number(weeks) || 2,
      16
    )
  );
  const parentId = Number(taskId) || Date.now();
  const today = todayLocalDate();
  const endDate = deadline && !isBeforeToday(deadline) ? deadline : offsetAcademicDays(today, totalWeeks * 7);
  const startDate = today;

  let taskItems = Array.isArray(parsedItems) && parsedItems.length
    ? parsedItems.map((item) => ({
        title: item.title || item.subtask_title || '',
        description: item.description || '',
        durationMinutes: item.durationMinutes,
      }))
    : parseTasksFromDocument(documentText);

  if (fromDocument) {
    if (!taskItems.length) return null;
    taskItems = taskItems.slice(0, 15);
  } else if (documentText?.trim() && taskItems.length >= 1) {
    taskItems = taskItems.slice(0, 15);
  } else if (!documentText?.trim()) {
    taskItems = STEP_TEMPLATES.slice(
      0,
      Math.min(Math.max(totalWeeks * 2, 3), STEP_TEMPLATES.length)
    ).map((tpl) => ({
      title: tpl.title,
      description: tpl.description,
      durationMinutes: tpl.durationMinutes,
    }));
  } else {
    taskItems = STEP_TEMPLATES.slice(
      0,
      Math.min(Math.max(totalWeeks * 2, 3), STEP_TEMPLATES.length)
    ).map((tpl) => ({
      title: tpl.title,
      description: tpl.description,
      durationMinutes: tpl.durationMinutes,
    }));
  }

  const allocatedDates = allocateDatesForSubtasks(
    taskItems.length,
    totalWeeks,
    selectedWeekIndices,
    startDate,
    endDate
  );
  const hours = Math.max(1, Number(hoursPerWeek) || 5);
  const defaultDuration = Math.min(
    180,
    Math.max(45, Math.round((hours * 60) / Math.max(taskItems.length, 1)))
  );

  return taskItems.map((item, i) => {
    const allocated_time = allocatedDates[i];
    const status = resolveSubtaskStatus(allocated_time, today);

    const tpl = STEP_TEMPLATES[i % STEP_TEMPLATES.length];
    const durationMinutes = item.durationMinutes ?? tpl?.durationMinutes ?? defaultDuration;
    const description =
      item.description ||
      (fromDocument
        ? `משימה מהמסמך שהועלה · הערכת זמן: ${formatDuration(durationMinutes)}.`
        : `הערכת זמן: ${formatDuration(durationMinutes)} · ${hours} שעות/שבוע.`);

    return normalizeSubtask(
      {
        id: parentId + i + 1,
        subtask_title: item.title,
        description,
        status,
        is_done: false,
        allocated_time,
        durationMinutes,
      },
      parentId,
      { index: i }
    );
  });
}

/** @deprecated use splitTaskFromContent */
export function splitTaskMock(opts) {
  return splitTaskFromContent(opts);
}
