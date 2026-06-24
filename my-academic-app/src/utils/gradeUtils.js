export function normalizeGrade(grade) {
  return {
    id: Number(grade.id) || Date.now(),
    course_id: Number(grade.course_id),
    score: Math.min(100, Math.max(0, Number(grade.score) || 0)),
    weight: Math.max(0, Number(grade.weight ?? grade.credits) || 0),
  };
}

export function gradesForUser(grades, userId, courses) {
  const userCourseIds = new Set(
    (courses || [])
      .filter((c) => !c.user_id || Number(c.user_id) === Number(userId))
      .map((c) => Number(c.id))
  );
  return (grades || [])
    .map(normalizeGrade)
    .filter((g) => userCourseIds.has(g.course_id));
}

export function getGradeForCourse(grades, courseId) {
  return (grades || []).map(normalizeGrade).find((g) => g.course_id === Number(courseId)) ?? null;
}

export function calcGpaFromGrades(grades, courses, userId) {
  const userGrades = gradesForUser(grades, userId, courses);
  if (!userGrades.length) return '0.0';
  const total = userGrades.reduce((sum, g) => sum + g.score * g.weight, 0);
  const credits = userGrades.reduce((sum, g) => sum + g.weight, 0);
  return credits ? (total / credits).toFixed(1) : '0.0';
}

export function calcGpaForFilter(grades, courses, userId, { year, semester } = {}) {
  const userCourses = (courses || []).filter(
    (c) => !c.user_id || Number(c.user_id) === Number(userId)
  );
  const filteredCourseIds = new Set(
    userCourses
      .filter((c) => {
        if (year && c.year !== year) return false;
        if (semester && c.semester !== semester) return false;
        return true;
      })
      .map((c) => Number(c.id))
  );
  const filteredGrades = gradesForUser(grades, userId, courses).filter((g) =>
    filteredCourseIds.has(g.course_id)
  );
  if (!filteredGrades.length) return '0.0';
  const total = filteredGrades.reduce((sum, g) => sum + g.score * g.weight, 0);
  const credits = filteredGrades.reduce((sum, g) => sum + g.weight, 0);
  return credits ? (total / credits).toFixed(1) : '0.0';
}

export function enrichCoursesWithGrades(courses, grades, userId) {
  const userCourses = (courses || []).filter(
    (c) => !c.user_id || Number(c.user_id) === Number(userId)
  );
  return userCourses.map((course) => {
    const grade = getGradeForCourse(grades, course.id);
    return {
      ...course,
      score: grade?.score ?? Number(course.grade) ?? 0,
      weight: grade?.weight ?? Number(course.credits) ?? 0,
      gradeId: grade?.id ?? null,
      grade: grade?.score ?? Number(course.grade) ?? 0,
      credits: grade?.weight ?? Number(course.credits) ?? 0,
    };
  });
}

export function migrateCoursesToGrades(courses, existingGrades = []) {
  const grades = [...(existingGrades || []).map(normalizeGrade)];
  const hasGrade = new Set(grades.map((g) => g.course_id));

  (courses || []).forEach((course) => {
    const courseId = Number(course.id);
    if (hasGrade.has(courseId)) return;
    const score = Number(course.grade ?? course.score);
    const weight = Number(course.credits ?? course.weight);
    if (!score && !weight) return;
    grades.push(
      normalizeGrade({
        id: courseId + 1,
        course_id: courseId,
        score: score || 0,
        weight: weight || 0,
      })
    );
    hasGrade.add(courseId);
  });

  return grades;
}
