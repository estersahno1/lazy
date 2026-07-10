const STUDENTS_KEY = 'lazy-students';
const SESSION_KEY = 'lazy-current-student-id';

export function normalizeStudent(student) {
  return {
    id: Number(student.id),
    name: student.name ?? '',
    email: (student.email ?? '').trim().toLowerCase(),
    institution: student.institution ?? '',
    created_at: student.created_at ?? todayIso(),
    password: student.password ?? '',
    hasCompletedOnboarding: student.hasCompletedOnboarding ?? false,
  };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function loadStudents() {
  try {
    const raw = localStorage.getItem(STUDENTS_KEY);
    if (raw) return JSON.parse(raw).map(normalizeStudent);
  } catch {
    /* ignore */
  }
  return [];
}

export function saveStudents(students) {
  localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
}

export function getSessionStudentId() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
}

export function setSessionStudentId(id) {
  if (id == null) {
    localStorage.removeItem(SESSION_KEY);
  } else {
    localStorage.setItem(SESSION_KEY, String(id));
  }
}

export function getStudentById(id) {
  const students = loadStudents();
  const found = students.find((s) => s.id === Number(id));
  if (!found) return null;
  const { password: _pw, ...publicStudent } = found;
  return publicStudent;
}

export function getStudentWithPassword(email) {
  const normalized = email.trim().toLowerCase();
  return loadStudents().find((s) => s.email === normalized) ?? null;
}

export function registerStudent({ name, email, institution, password }) {
  const students = loadStudents();
  const normalizedEmail = email.trim().toLowerCase();

  if (students.some((s) => s.email === normalizedEmail)) {
    return { ok: false, error: 'כתובת האימייל כבר רשומה במערכת' };
  }

  if (!password || password.length < 4) {
    return { ok: false, error: 'הסיסמה חייבת להכיל לפחות 4 תווים' };
  }

  const student = normalizeStudent({
    id: Date.now(),
    name: name.trim(),
    email: normalizedEmail,
    institution: institution.trim(),
    created_at: todayIso(),
    password,
  });

  students.push(student);
  saveStudents(students);

  const { password: _pw, ...publicStudent } = student;
  return { ok: true, student: publicStudent };
}

export function loginStudent(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const student = getStudentWithPassword(normalizedEmail);
  if (!student) {
    return { ok: false, error: 'אימייל או סיסמה שגויים' };
  }
  if (student.password !== password) {
    return { ok: false, error: 'אימייל או סיסמה שגויים' };
  }

  setSessionStudentId(student.id);
  const { password: _pw, ...publicStudent } = student;
  return { ok: true, student: publicStudent };
}

export function logoutStudent() {
  setSessionStudentId(null);
}

export function updateStudentRecord(id, updates) {
  const students = loadStudents();
  const idx = students.findIndex((s) => s.id === Number(id));
  if (idx === -1) return null;

  const nextEmail = updates.email
    ? updates.email.trim().toLowerCase()
    : students[idx].email;

  if (
    nextEmail !== students[idx].email &&
    students.some((s) => s.email === nextEmail)
  ) {
    return { ok: false, error: 'כתובת האימייל כבר בשימוש' };
  }

  const updated = normalizeStudent({
    ...students[idx],
    ...updates,
    id: students[idx].id,
    created_at: students[idx].created_at,
    email: nextEmail,
  });

  students[idx] = updated;
  saveStudents(students);

  const { password: _pw, ...publicStudent } = updated;
  return { ok: true, student: publicStudent };
}

export function deleteStudentAccount(studentId, appDataKey) {
  const id = Number(studentId);
  const students = loadStudents();
  const next = students.filter((s) => s.id !== id);
  if (next.length === students.length) {
    return { ok: false, error: 'משתמש לא נמצא' };
  }
  saveStudents(next);
  if (appDataKey) {
    localStorage.removeItem(appDataKey);
  }
  if (getSessionStudentId() === id) {
    setSessionStudentId(null);
  }
  return { ok: true };
}

export const DEMO_USER_EMAIL = 'dana@university.ac.il';
export const DEMO_USER_PASSWORD = '1234';

export function isDemoCredentials(email, password) {
  return (
    (email ?? '').trim().toLowerCase() === DEMO_USER_EMAIL &&
    password === DEMO_USER_PASSWORD
  );
}

/** One-click demo entry — same credentials shown on the auth screen. */
export function getDemoCredentials() {
  return { email: DEMO_USER_EMAIL, password: DEMO_USER_PASSWORD };
}

export function isLocalDemoStudent(student) {
  return Boolean(student && isDemoUserEmail(student.email) && typeof student.id === 'number');
}

function isDemoUserEmail(email) {
  return (email ?? '').trim().toLowerCase() === DEMO_USER_EMAIL;
}

export function ensureDemoStudentAccount() {
  const students = loadStudents();
  const demoIndex = students.findIndex((s) => s.email === DEMO_USER_EMAIL);

  if (demoIndex === -1) {
    const demoId = students.some((s) => s.id === 1) ? Date.now() : 1;
    const demo = normalizeStudent({
      id: demoId,
      name: 'דנה כהן',
      email: DEMO_USER_EMAIL,
      institution: 'הקריה האקדמית אונו',
      created_at: todayIso(),
      password: DEMO_USER_PASSWORD,
      hasCompletedOnboarding: true,
    });
    students.push(demo);
    saveStudents(students);
    return;
  }

  const current = students[demoIndex];
  const needsUpdate =
    current.name !== 'דנה כהן' ||
    current.institution !== 'הקריה האקדמית אונו' ||
    current.password !== DEMO_USER_PASSWORD ||
    current.hasCompletedOnboarding !== true;

  if (needsUpdate) {
    students[demoIndex] = normalizeStudent({
      ...current,
      name: 'דנה כהן',
      institution: 'הקריה האקדמית אונו',
      password: DEMO_USER_PASSWORD,
      hasCompletedOnboarding: true,
    });
    saveStudents(students);
  }
}

/** @deprecated use ensureDemoStudentAccount */
export function seedDemoStudentIfEmpty() {
  ensureDemoStudentAccount();
}
