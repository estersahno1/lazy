import { formatDeadlineLabel } from './scheduleUtils';

export const PRIORITY_OPTIONS = [
  { value: 'high', label: 'דחוף' },
  { value: 'medium', label: 'רגיל' },
  { value: 'low', label: 'נמוך' },
];

export function formatUrgentTaskMeta(task) {
  const parts = [];
  if (task.deadline) {
    parts.push(`יעד: ${formatDeadlineLabel(task.deadline, task.deadlineTime || '23:59')}`);
  }
  if (task.courseName) parts.push(task.courseName);
  if (task.priority === 'high') parts.push('דחיפות גבוהה');
  return parts.join(' · ') || 'ללא תאריך יעד';
}

export function normalizeUrgentTask(task, userId = null) {
  const normalized = {
    id: Number(task.id) || Date.now(),
    user_id: userId ?? task.user_id ?? null,
    title: (task.title || '').trim(),
    deadline: task.deadline || '',
    deadlineTime: task.deadlineTime || '23:59',
    courseId: task.courseId ?? null,
    courseName: (task.courseName || '').trim(),
    priority: task.priority || 'medium',
    completed: Boolean(task.completed),
  };
  normalized.meta = formatUrgentTaskMeta(normalized);
  return normalized;
}
