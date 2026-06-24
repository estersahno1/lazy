import { getWeekDays, todayLocalDate, isBeforeToday } from './scheduleUtils';
import { extractSubtaskTitle, getTaskSubtasks } from './taskSplitter';

const APPROACHING_DAYS = 7;

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(`${todayLocalDate()}T12:00:00`);
  const target = new Date(`${dateStr}T12:00:00`);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function formatHebrewDate(dateStr) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'short',
  });
}

function daysLabel(days) {
  if (days === 0) return 'היום';
  if (days === 1) return 'מחר';
  return `עוד ${days} ימים`;
}

function isQuizEvent(ev) {
  const title = (ev.title || '').toLowerCase();
  return title.includes('בוחן') || title.includes('quiz');
}

function isExamEvent(ev) {
  return ev.type === 'exam';
}

function getEventDate(ev, dayIndex, weekOffset = 0) {
  if (ev.scheduledDate) return ev.scheduledDate;
  const { days } = getWeekDays(weekOffset);
  return days[dayIndex]?.date ?? null;
}

function pushIfApproaching(list, { sourceKey, message, type, daysLeft }) {
  if (daysLeft === null || daysLeft > APPROACHING_DAYS) return;
  list.push({
    sourceKey,
    message,
    type,
    daysLeft,
    read: false,
  });
}

export function normalizeNotification(notification, userId) {
  return {
    id: Number(notification.id) || Date.now(),
    user_id: Number(notification.user_id ?? userId) || 0,
    message: notification.message ?? notification.text ?? '',
    created_at: notification.created_at ?? new Date().toISOString(),
    read: Boolean(notification.read),
    type: notification.type ?? 'general',
    sourceKey: notification.sourceKey ?? String(notification.id),
    daysLeft: notification.daysLeft ?? 0,
  };
}

export function generateNotificationCandidates({
  aiTasks = [],
  scheduleByDay = {},
  urgentTasks = [],
  weekOffset = 0,
}) {
  const items = [];

  aiTasks.forEach((task) => {
    if (task.deadline) {
      const daysLeft = daysUntil(task.deadline.split('T')[0]);
      if (daysLeft !== null && daysLeft <= APPROACHING_DAYS && daysLeft >= 0) {
        pushIfApproaching(items, {
          sourceKey: `ai-deadline-${task.id}`,
          type: 'ai_task',
          daysLeft,
          message: `המשימה שלך "${task.title}" — תאריך היעד מתקרב (${daysLabel(daysLeft)})`,
        });
      } else if (daysLeft !== null && daysLeft < 0) {
        pushIfApproaching(items, {
          sourceKey: `ai-deadline-overdue-${task.id}`,
          type: 'ai_task',
          daysLeft: 0,
          message: `המשימה שלך "${task.title}" — תאריך היעד עבר!`,
        });
      }
    }

    getTaskSubtasks(task).forEach((subtask) => {
      if (subtask.is_done || !subtask.allocated_time) return;
      const dateStr = subtask.allocated_time.split('T')[0];
      const daysLeft = daysUntil(dateStr);
      if (daysLeft === null || daysLeft > APPROACHING_DAYS || daysLeft < 0) return;
      const stepTitle = subtask.subtask_title || extractSubtaskTitle(subtask);
      pushIfApproaching(items, {
        sourceKey: `ai-step-${task.id}-${subtask.id}`,
        type: 'ai_step',
        daysLeft,
        message: `תת-המשימה "${stepTitle}" במשימה "${task.title}" מתקרבת (${daysLabel(daysLeft)})`,
      });
    });
  });

  for (let dayIndex = 0; dayIndex <= 4; dayIndex++) {
    (scheduleByDay[dayIndex] || []).forEach((ev) => {
      if (!isExamEvent(ev)) return;
      const dateStr = getEventDate(ev, dayIndex, weekOffset);
      if (!dateStr || isBeforeToday(dateStr)) return;

      const daysLeft = daysUntil(dateStr);
      if (daysLeft === null || daysLeft > APPROACHING_DAYS) return;

      const dateLabel = formatHebrewDate(dateStr);
      const eventId = ev.id || `day${dayIndex}-${ev.title}`;

      if (isQuizEvent(ev)) {
        pushIfApproaching(items, {
          sourceKey: `quiz-${eventId}`,
          type: 'quiz',
          daysLeft,
          message: `הבוחן שלך "${ev.title}" מתקרב — ${dateLabel} (${daysLabel(daysLeft)})`,
        });
      } else {
        pushIfApproaching(items, {
          sourceKey: `exam-${eventId}`,
          type: 'exam',
          daysLeft,
          message: `הבחינה "${ev.title}" מתקרבת — ${dateLabel} (${daysLabel(daysLeft)})`,
        });
      }
    });
  }

  urgentTasks
    .filter((t) => !t.completed)
    .forEach((t) => {
      items.push({
        sourceKey: `urgent-${t.id}`,
        type: 'urgent',
        daysLeft: 0,
        message: `תזכורת: ${t.title}${t.meta ? ` — ${t.meta}` : ''}`,
        read: false,
      });
    });

  items.sort((a, b) => a.daysLeft - b.daysLeft);
  return items;
}

/** @deprecated use generateNotificationCandidates */
export function generateNotifications(opts) {
  return generateNotificationCandidates(opts);
}

export function syncStoredNotifications(stored, candidates, userId) {
  const byKey = new Map((stored || []).map((n) => [n.sourceKey, normalizeNotification(n, userId)]));
  const activeKeys = new Set(candidates.map((c) => c.sourceKey));
  const now = new Date().toISOString();

  const next = candidates.map((candidate) => {
    const existing = byKey.get(candidate.sourceKey);
    if (existing) {
      return normalizeNotification(
        {
          ...existing,
          message: candidate.message,
          type: candidate.type,
          daysLeft: candidate.daysLeft,
        },
        userId
      );
    }
    return normalizeNotification(
      {
        id: Date.now() + Math.floor(Math.random() * 10000),
        user_id: userId,
        message: candidate.message,
        created_at: now,
        read: false,
        type: candidate.type,
        sourceKey: candidate.sourceKey,
        daysLeft: candidate.daysLeft,
      },
      userId
    );
  });

  const archived = (stored || [])
    .filter((n) => !activeKeys.has(n.sourceKey) && n.read)
    .map((n) => normalizeNotification(n, userId))
    .slice(-20);

  return [...next, ...archived].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
}

export function mergeNotificationReadState(notifications, readNotificationIds = []) {
  const readSet = new Set(readNotificationIds.map(String));
  return notifications.map((n) => ({
    ...n,
    read: n.read || readSet.has(String(n.id)) || readSet.has(n.sourceKey),
  }));
}

export function formatNotificationDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('he-IL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
