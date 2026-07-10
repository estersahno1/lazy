export function normalizeCourseName(name) {
  return (name ?? '').trim().replace(/\s+/g, ' ');
}

const SCHEDULE_COURSE_TYPES = new Set(['lecture', 'exam']);

export function getGradeCourseNames(courses = []) {
  const names = new Set();

  (courses || []).forEach((course) => {
    const n = normalizeCourseName(course.course_name ?? course.name);
    if (n) names.add(n);
  });

  return [...names].sort((a, b) => a.localeCompare(b, 'he'));
}

export function collectCourseNames(courses = [], scheduleByDay = {}) {
  const names = new Set(getGradeCourseNames(courses));

  for (let day = 0; day <= 6; day += 1) {
    (scheduleByDay[day] || []).forEach((event) => {
      const type = event.type || 'lecture';
      if (!SCHEDULE_COURSE_TYPES.has(type)) return;
      const n = normalizeCourseName(event.title);
      if (n && n.length >= 2) names.add(n);
    });
  }

  return [...names].sort((a, b) => a.localeCompare(b, 'he'));
}

export function findCourseByName(courses, name) {
  const normalized = normalizeCourseName(name).toLowerCase();
  if (!normalized) return null;
  return (
    (courses || []).find(
      (c) => normalizeCourseName(c.course_name).toLowerCase() === normalized
    ) ?? null
  );
}
