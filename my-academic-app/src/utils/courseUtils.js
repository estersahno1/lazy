const SEMESTER_OPTIONS = ["א'", "ב'", 'קיץ'];
const YEAR_OPTIONS = ["שנה א'", "שנה ב'", "שנה ג'", "שנה ד'"];

export { SEMESTER_OPTIONS, YEAR_OPTIONS };

export function semesterVariant(semester) {
  if (semester === "א'") return 'primary';
  if (semester === "ב'") return 'pink';
  return 'summer';
}

export function normalizeCourse(course, userId) {
  const uid = Number(userId ?? course.user_id) || 0;
  return {
    id: Number(course.id) || Date.now(),
    user_id: Number(course.user_id ?? uid),
    course_name: course.course_name ?? course.name ?? '',
    semester: course.semester ?? "א'",
    year: course.year ?? "שנה א'",
    variant: course.variant ?? semesterVariant(course.semester ?? "א'"),
  };
}

export function sameUserId(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

export function coursesForUser(courses, userId) {
  if (!userId) return [];
  return (courses || []).filter(
    (c) => !c.user_id || sameUserId(c.user_id, userId)
  );
}
