import { supabase, isSupabaseEnabled } from '../lib/supabase';

function createEmptySchedule() {
  return { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
}

function scheduleFromRows(rows) {
  const scheduleByDay = createEmptySchedule();
  (rows || []).forEach((row) => {
    const day = row.day_index;
    if (day == null || day < 0 || day > 6) return;
    scheduleByDay[day].push({
      id: row.id,
      title: row.title,
      room: row.room,
      time: row.time,
      type: row.type,
      durationMinutes: row.duration_minutes,
      materials: row.materials || [],
      scheduledDate: row.scheduled_date || null,
    });
  });
  return scheduleByDay;
}

function scheduleToRows(userId, scheduleByDay) {
  const rows = [];
  for (let d = 0; d <= 6; d++) {
    (scheduleByDay[d] || []).forEach((ev) => {
      rows.push({
        id: String(ev.id),
        user_id: userId,
        day_index: d,
        scheduled_date: ev.scheduledDate || null,
        title: ev.title || '',
        room: ev.room || '',
        time: ev.time || '09:00',
        type: ev.type || 'lecture',
        duration_minutes: ev.durationMinutes || 90,
        materials: ev.materials || [],
      });
    });
  }
  return rows;
}

export async function loadAppStateFromSupabase(userId) {
  if (!isSupabaseEnabled) return null;

  const [coursesRes, urgentRes, tasksRes, scheduleRes, notificationsRes] =
    await Promise.all([
      supabase.from('courses').select('*').eq('user_id', userId),
      supabase.from('urgent_tasks').select('*').eq('user_id', userId),
      supabase.from('ai_tasks').select('*').eq('user_id', userId),
      supabase.from('schedule_events').select('*').eq('user_id', userId),
      supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
    ]);

  const courseIds = (coursesRes.data || []).map((c) => c.id);
  const taskIds = (tasksRes.data || []).map((t) => t.id);

  const [gradesRes, subtasksRes] = await Promise.all([
    courseIds.length
      ? supabase.from('grades').select('*').in('course_id', courseIds)
      : Promise.resolve({ data: [], error: null }),
    taskIds.length
      ? supabase.from('subtasks').select('*').in('task_id', taskIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const errors = [
    coursesRes.error,
    gradesRes.error,
    urgentRes.error,
    tasksRes.error,
    subtasksRes.error,
    scheduleRes.error,
    notificationsRes.error,
  ].filter(Boolean);
  if (errors.length) {
    console.warn('Supabase load errors:', errors);
  }

  const courses = (coursesRes.data || []).map((c) => ({
    id: Number(c.id),
    user_id: c.user_id,
    course_name: c.course_name,
    semester: c.semester,
    year: c.year,
    variant: c.semester === "א'" ? 'primary' : c.semester === "ב'" ? 'pink' : 'summer',
  }));

  const grades = (gradesRes.data || []).map((g) => ({
    id: Number(g.id),
    course_id: Number(g.course_id),
    score: Number(g.score),
    weight: Number(g.weight),
  }));

  const urgentTasks = (urgentRes.data || []).map((t) => ({
    id: Number(t.id),
    user_id: t.user_id,
    title: t.title,
    deadline: t.deadline || '',
    deadlineTime: t.deadline_time || '23:59',
    courseId: t.course_id != null ? Number(t.course_id) : null,
    courseName: t.course_name || '',
    priority: t.priority || 'medium',
    completed: Boolean(t.completed),
  }));

  const subtasksByTask = {};
  (subtasksRes.data || []).forEach((s) => {
    const taskId = Number(s.task_id);
    if (!subtasksByTask[taskId]) subtasksByTask[taskId] = [];
    subtasksByTask[taskId].push({
      id: Number(s.id),
      task_id: taskId,
      subtask_title: s.subtask_title,
      description: s.description,
      notes: s.notes || '',
      status: s.status,
      is_done: s.is_done,
      allocated_time: s.allocated_time,
      durationMinutes: s.duration_minutes,
      allocatedTime: s.allocated_time_str,
      scheduleEventId: s.schedule_event_id,
    });
  });

  const aiTasks = (tasksRes.data || []).map((t) => {
    const subtasks = subtasksByTask[Number(t.id)] || [];
    return {
      id: Number(t.id),
      title: t.title,
      deadline: t.deadline || '',
      deadlineTime: t.deadline_time || '23:59',
      description: t.description || '',
      hoursPerWeek: Number(t.hours_per_week) || 5,
      weeks: t.weeks || 4,
      courseId: t.course_id != null ? Number(t.course_id) : null,
      courseName: t.course_name || '',
      approved: Boolean(t.approved),
      fileName: t.file_name,
      selectedWeekIndices: t.selected_week_indices || [],
      subtasks,
      steps: subtasks,
    };
  });

  const notifications = (notificationsRes.data || []).map((n) => ({
    id: String(n.id),
    type: n.type,
    message: n.message,
    read: n.read,
    relatedId: n.related_id,
    date: n.created_at,
  }));

  return {
    courses,
    grades,
    urgentTasks,
    aiTasks,
    activeTaskIndex: 0,
    scheduleByDay: scheduleFromRows(scheduleRes.data),
    notifications,
    readNotificationIds: notifications.filter((n) => n.read).map((n) => n.id),
    weekOffset: 0,
    selectedDay: 0,
    showAllCourses: false,
    editingCourseId: null,
  };
}

export async function saveAppStateToSupabase(userId, state) {
  if (!isSupabaseEnabled) return;

  const courseRows = (state.courses || []).map((c) => ({
    id: Number(c.id),
    user_id: userId,
    course_name: c.course_name || c.name || '',
    semester: c.semester || "א'",
    year: c.year || "שנה א'",
  }));

  const gradeRows = (state.grades || []).map((g) => ({
    id: Number(g.id),
    course_id: Number(g.course_id),
    score: Number(g.score) || 0,
    weight: Number(g.weight) || 0,
  }));

  const urgentRows = (state.urgentTasks || []).map((t) => ({
    id: Number(t.id),
    user_id: userId,
    course_id: t.courseId != null ? Number(t.courseId) : null,
    title: t.title || '',
    deadline: t.deadline || null,
    deadline_time: t.deadlineTime || '23:59',
    course_name: t.courseName || '',
    priority: t.priority || 'medium',
    completed: Boolean(t.completed),
  }));

  const taskRows = (state.aiTasks || []).map((t) => ({
    id: Number(t.id),
    user_id: userId,
    course_id: t.courseId != null ? Number(t.courseId) : null,
    title: t.title || '',
    deadline: t.deadline || null,
    deadline_time: t.deadlineTime || '23:59',
    description: t.description || '',
    hours_per_week: Number(t.hoursPerWeek) || 5,
    weeks: t.weeks || 4,
    course_name: t.courseName || '',
    approved: Boolean(t.approved),
    file_name: t.fileName || null,
    selected_week_indices: t.selectedWeekIndices || [],
  }));

  const subtaskRows = [];
  (state.aiTasks || []).forEach((t) => {
    const subtasks = t.subtasks || t.steps || [];
    subtasks.forEach((s) => {
      subtaskRows.push({
        id: Number(s.id),
        task_id: Number(t.id),
        subtask_title: s.subtask_title || s.title || '',
        description: s.description || '',
        notes: s.notes || '',
        status: s.status || 'pending',
        is_done: Boolean(s.is_done),
        allocated_time: s.allocated_time || null,
        duration_minutes: s.durationMinutes || 60,
        allocated_time_str: s.allocatedTime || null,
        schedule_event_id: s.scheduleEventId || null,
      });
    });
  });

  const scheduleRows = scheduleToRows(userId, state.scheduleByDay || createEmptySchedule());

  const notificationRows = (state.notifications || []).map((n) => ({
    id: Number(n.id) || Date.now(),
    user_id: userId,
    type: n.type || 'general',
    message: n.message || '',
    read: Boolean(n.read),
    related_id: n.relatedId || null,
    created_at: n.date || new Date().toISOString(),
  }));

  await supabase.from('courses').delete().eq('user_id', userId);
  await supabase.from('urgent_tasks').delete().eq('user_id', userId);
  await supabase.from('ai_tasks').delete().eq('user_id', userId);
  await supabase.from('schedule_events').delete().eq('user_id', userId);
  await supabase.from('notifications').delete().eq('user_id', userId);

  if (courseRows.length) await supabase.from('courses').upsert(courseRows);
  if (gradeRows.length) await supabase.from('grades').upsert(gradeRows);
  if (urgentRows.length) await supabase.from('urgent_tasks').upsert(urgentRows);
  if (taskRows.length) await supabase.from('ai_tasks').upsert(taskRows);
  if (subtaskRows.length) await supabase.from('subtasks').upsert(subtaskRows);
  if (scheduleRows.length) await supabase.from('schedule_events').upsert(scheduleRows);
  if (notificationRows.length) await supabase.from('notifications').upsert(notificationRows);
}

export { isSupabaseEnabled };
