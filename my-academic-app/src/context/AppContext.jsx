import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import {
  getTodayAcademicDayIndex,
  getWeekDays,
  normalizeEvent,
  getNextClassFromSchedule,
  getNextExamFromSchedule,
  parseTime,
  dateToAcademicDayIndex,
  addAcademicDays,
  offsetAcademicDays,
  todayLocalDate,
  getDayIndexForScheduleDate,
  getWeekOffsetForDate,
  weeksUntilDeadline,
  durationToHeight,
  findFreeTimeSlot,
  minutesToTop,
} from '../utils/scheduleUtils';
import {
  splitTaskMock,
  splitTaskFromContent,
  normalizeSubtask,
  getTaskSubtasks,
  STEP_STATUS_LABELS,
  extractSubtaskTitle,
  reconcileTaskSteps,
  resolveSubtaskStatus,
} from '../utils/taskSplitter';
import {
  generateNotificationCandidates,
  syncStoredNotifications,
  mergeNotificationReadState,
} from '../utils/notificationUtils';
import {
  ensureDemoStudentAccount,
  getSessionStudentId,
  getStudentById,
  loginStudent,
  registerStudent,
  logoutStudent,
  updateStudentRecord,
  deleteStudentAccount,
  isDemoCredentials,
  isLocalDemoStudent,
} from '../utils/authUtils';
import { isSupabaseEnabled } from '../lib/supabase';
import {
  getSupabaseSession,
  fetchSupabaseStudent,
  supabaseLogin,
  supabaseLoginWithGoogle,
  supabaseRegister,
  supabaseLogout,
  supabaseUpdateProfile,
  supabaseDeleteAccount,
  supabaseCompleteOnboarding,
} from '../services/supabaseAuth';
import {
  loadAppStateFromSupabase,
  saveAppStateToSupabase,
} from '../services/supabaseData';
import {
  isDemoUser,
  needsDemoSeedRefresh,
  buildDemoAppState,
} from '../utils/demoSeed';
import { normalizeCourse, coursesForUser, semesterVariant } from '../utils/courseUtils';
import { collectCourseNames, normalizeCourseName, getGradeCourseNames } from '../utils/courseNameUtils';
import { normalizeUrgentTask } from '../utils/urgentTaskUtils';
import {
  normalizeGrade,
  gradesForUser,
  getGradeForCourse,
  calcGpaFromGrades,
  calcGpaForFilter,
  migrateCoursesToGrades,
  enrichCoursesWithGrades,
} from '../utils/gradeUtils';

const APP_DATA_PREFIX = 'lazy-app-data-v6';
const LEGACY_STORAGE_KEY = 'lazy-app-data-v5';
const TOTAL_DEGREE_CREDITS = 120;

function buildDefaultAiTasks() {
  const today = todayLocalDate();
  const deadline = offsetAcademicDays(today, 20);
  const taskId = 1001;
  const subtasks = [
    {
      id: 1,
      subtask_title: 'איסוף מאמרים',
      description: 'אספי 8–10 מאמרים רלוונטיים מהספרייה הדיגיטלית.',
      status: 'done',
      is_done: true,
      allocated_time: offsetAcademicDays(today, -7),
      durationMinutes: 60,
    },
    {
      id: 2,
      subtask_title: 'כתיבת סקירת ספרות',
      description: 'כתבי 3 עמודים המסכמים את המחקר הקיים בתחום.',
      status: 'active',
      is_done: false,
      allocated_time: today,
      durationMinutes: 90,
    },
    {
      id: 3,
      subtask_title: 'טיוטה ראשונה',
      description: 'הכיני טיוטה ראשונה של 10 עמודים לפי מבנה הסמינריון.',
      status: 'pending',
      is_done: false,
      allocated_time: offsetAcademicDays(today, 4),
      durationMinutes: 120,
    },
  ].map((s, i) => normalizeSubtask(s, taskId, { index: i }));

  return [
    {
      id: taskId,
      title: 'עבודה בסמינריון בחינוך',
      deadline,
      weeks: 4,
      hoursPerWeek: 5,
      description: '',
      fileName: null,
      approved: false,
      subtasks,
    },
  ];
}

const defaultAiTasks = buildDefaultAiTasks();

function normalizeSchedule(scheduleByDay) {
  const result = {};
  for (let d = 0; d <= 6; d++) {
    result[d] = (scheduleByDay[d] || []).map(normalizeEvent);
  }
  return result;
}

function parseMaterials(text) {
  if (!text) return [];
  return text
    .split(/[,،\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => ({ type: 'text', name }));
}

function normalizeAiTask(task) {
  const taskId = Number(task.id) || Date.now();
  const subtasks = getTaskSubtasks({ ...task, id: taskId });
  return {
    id: taskId,
    title: task.title ?? '',
    deadline: task.deadline ?? '',
    deadlineTime: task.deadlineTime ?? '23:59',
      weeks: task.weeks ?? (task.selectedWeekIndices?.length || 4),
    hoursPerWeek: task.hoursPerWeek ?? 5,
    description: task.description ?? '',
    fileName: task.fileName ?? null,
    courseId: task.courseId ?? null,
    courseName: task.courseName ?? '',
    selectedWeekIndices: task.selectedWeekIndices ?? [],
    approved: Boolean(task.approved),
    subtasks,
    steps: subtasks,
  };
}

function migrateFromLegacyFormat(parsed) {
  if (parsed.aiTasks?.length) {
    return {
      aiTasks: parsed.aiTasks.map(normalizeAiTask),
      activeTaskIndex: Math.min(
        parsed.activeTaskIndex ?? 0,
        Math.max(0, parsed.aiTasks.length - 1)
      ),
    };
  }

  if (parsed.currentAiTask || parsed.aiSteps) {
    const task = normalizeAiTask({
      id: `migrated-${Date.now()}`,
      title: parsed.currentAiTask?.title ?? 'משימת AI',
      deadline: parsed.currentAiTask?.deadline ?? '',
      weeks: parsed.currentAiTask?.weeks ?? 4,
      hoursPerWeek: parsed.currentAiTask?.hoursPerWeek ?? 5,
      description: parsed.currentAiTask?.description ?? '',
      fileName: parsed.currentAiTask?.fileName ?? null,
      approved: Boolean(parsed.aiApproved),
      steps: (parsed.aiSteps || []).map((s) => normalizeSubtask(s, Date.now())),
    });
    return { aiTasks: [task], activeTaskIndex: 0 };
  }

  return { aiTasks: defaultAiTasks.map(normalizeAiTask), activeTaskIndex: 0 };
}

function minutesToTimeString(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function removeEventFromSchedule(scheduleByDay, eventId) {
  const next = { ...scheduleByDay };
  for (let d = 0; d <= 6; d++) {
    next[d] = (next[d] || []).filter((e) => e.id !== eventId);
  }
  return next;
}

function makeEventBlock(event) {
  const durationMinutes = event.durationMinutes || 60;
  const timeMinutes = event.time
    ? parseTime(event.time)
    : findFreeTimeSlot([], durationMinutes);
  const time = event.time || minutesToTimeString(timeMinutes);

  return {
    id: event.id || `ev-${Date.now()}`,
    title: event.title,
    room: event.room || '',
    time,
    top: event.top || minutesToTop(timeMinutes),
    height: event.height || durationToHeight(durationMinutes),
    color: event.atRisk ? 'orange' : event.type === 'exam' ? 'orange' : event.type === 'task' ? 'pink' : 'purple',
    type: event.type || 'lecture',
    materials: event.materials || [],
    durationMinutes,
    atRisk: Boolean(event.atRisk),
    taskId: event.taskId ?? null,
    stepId: event.stepId ?? null,
    scheduledDate: event.scheduledDate ?? null,
  };
}

function syncTaskSubtasks(task, subtasks) {
  return { ...task, subtasks, steps: subtasks };
}

function buildAiStepBlock(taskId, subtask, dayBlocks, weekOffset = 0) {
  const dateStr = (subtask.allocated_time || '').split('T')[0];
  const slotMinutes = findFreeTimeSlot(dayBlocks, subtask.durationMinutes);
  const eventId = subtask.scheduleEventId || `ai-${taskId}-${subtask.id}`;
  const title = subtask.subtask_title || extractSubtaskTitle(subtask);
  const time = minutesToTimeString(slotMinutes);

  return {
    dayIndex: getDayIndexForScheduleDate(dateStr, weekOffset),
    block: makeEventBlock({
      id: eventId,
      title,
      room: 'משימת AI',
      time,
      type: 'task',
      durationMinutes: subtask.durationMinutes,
      atRisk: subtask.status === 'at_risk',
      taskId,
      stepId: subtask.id,
      scheduledDate: dateStr,
      materials: [],
    }),
    eventId,
    allocatedTime: time,
  };
}

function removeTaskBlocksFromSchedule(scheduleByDay, taskId) {
  const next = { ...scheduleByDay };
  const idStr = String(taskId);
  for (let d = 0; d <= 6; d++) {
    next[d] = (next[d] || []).filter((e) => String(e.taskId) !== idStr);
  }
  return next;
}

function removeLinkedTasksForCourse(state, courseId, courseName) {
  const nameNorm = normalizeCourseName(courseName).toLowerCase();
  const matchesCourse = (item) =>
    Number(item.courseId) === Number(courseId) ||
    (nameNorm && normalizeCourseName(item.courseName).toLowerCase() === nameNorm);

  const tasksToRemove = state.aiTasks.filter(matchesCourse);
  let scheduleByDay = state.scheduleByDay;
  tasksToRemove.forEach((task) => {
    scheduleByDay = removeTaskBlocksFromSchedule(scheduleByDay, task.id);
  });
  const removedIds = new Set(tasksToRemove.map((t) => Number(t.id)));

  return {
    aiTasks: state.aiTasks.filter((t) => !removedIds.has(Number(t.id))),
    urgentTasks: state.urgentTasks.filter((t) => !matchesCourse(t)),
    scheduleByDay,
    removedAiCount: tasksToRemove.length,
  };
}

function reconcileAllAiTasks(aiTasks, scheduleByDay, weekOffset = 0) {
  let nextSchedule = scheduleByDay;
  let anyChanged = false;

  const nextTasks = aiTasks.map((task) => {
    const { task: reconciled, changed } = reconcileTaskSteps(task);
    if (!changed) return reconciled;

    anyChanged = true;
    nextSchedule = removeTaskBlocksFromSchedule(nextSchedule, reconciled.id);

    const hasOpenSteps = getTaskSubtasks(reconciled).some((s) => !s.is_done);
    if (!hasOpenSteps || !reconciled.approved) return reconciled;

    const synced = scheduleTaskSteps({ ...reconciled, approved: true }, nextSchedule, weekOffset);
    nextSchedule = synced.scheduleByDay;
    return synced.task;
  });

  return { aiTasks: nextTasks, scheduleByDay: nextSchedule, changed: anyChanged };
}

function applyAiTasksReconciliation(state) {
  const { aiTasks, scheduleByDay, changed } = reconcileAllAiTasks(
    state.aiTasks,
    state.scheduleByDay,
    state.weekOffset ?? 0
  );
  if (!changed) return state;
  return { ...state, aiTasks, scheduleByDay };
}

function scheduleTaskSteps(task, scheduleByDay, weekOffset = 0) {
  let nextSchedule = { ...scheduleByDay };
  const subtasks = getTaskSubtasks(task);
  const updatedSubtasks = subtasks.map((subtask) => {
    const dateStr = (subtask.allocated_time || '').split('T')[0];
    if (subtask.is_done || !dateStr) return subtask;

    if (subtask.scheduleEventId) {
      nextSchedule = removeEventFromSchedule(nextSchedule, subtask.scheduleEventId);
    }

    const dayIndex = getDayIndexForScheduleDate(dateStr, weekOffset);
    const dayBlocks = nextSchedule[dayIndex] || [];
    const { block, eventId, allocatedTime } = buildAiStepBlock(
      task.id,
      subtask,
      dayBlocks,
      weekOffset
    );

    nextSchedule = {
      ...nextSchedule,
      [dayIndex]: [...dayBlocks, block],
    };

    return normalizeSubtask(
      {
        ...subtask,
        scheduleEventId: eventId,
        allocatedTime,
        allocated_time: dateStr,
      },
      task.id
    );
  });

  return {
    scheduleByDay: nextSchedule,
    task: syncTaskSubtasks({ ...task, approved: task.approved !== false }, updatedSubtasks),
  };
}

function createEmptySchedule() {
  return { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
}

function createFreshAppState() {
  return {
    urgentTasks: [],
    courses: [],
    grades: [],
    notifications: [],
    scheduleByDay: createEmptySchedule(),
    weekOffset: 0,
    selectedDay: getTodayAcademicDayIndex(),
    aiTasks: [],
    activeTaskIndex: 0,
    readNotificationIds: [],
    showAllCourses: false,
    editingCourseId: null,
  };
}

const defaultData = createFreshAppState();

const AppContext = createContext(null);

function studentStorageKey(studentId) {
  return `${APP_DATA_PREFIX}-${studentId}`;
}

function parseStoredAppData(parsed, userId) {
  const {
    notifications: legacyNotifications,
    readNotificationIds: savedReadIds,
    profile: _legacyProfile,
    courses: rawCourses,
    aiTasks: rawAiTasks,
    currentAiTask,
    aiSteps,
    ...parsedRest
  } = parsed;

  let aiTasks = [];
  let activeTaskIndex = 0;
  if (rawAiTasks?.length) {
    aiTasks = rawAiTasks.map(normalizeAiTask);
    activeTaskIndex = Math.min(
      parsed.activeTaskIndex ?? 0,
      Math.max(0, aiTasks.length - 1)
    );
  } else if (currentAiTask || aiSteps) {
    const migrated = migrateFromLegacyFormat(parsed);
    aiTasks = migrated.aiTasks;
    activeTaskIndex = migrated.activeTaskIndex;
  }

  const readNotificationIds =
    savedReadIds ??
    (legacyNotifications || []).filter((n) => n.read).map((n) => String(n.id));

  const hasSchedule =
    parsed.scheduleByDay &&
    Object.values(parsed.scheduleByDay).some((day) => (day || []).length > 0);

  const courses = (rawCourses || []).map((c) => normalizeCourse(c, userId));
  const grades = migrateCoursesToGrades(courses, parsed.grades || []);

  const notificationCandidates = generateNotificationCandidates({
    aiTasks,
    scheduleByDay: hasSchedule ? parsed.scheduleByDay : createEmptySchedule(),
    urgentTasks: parsed.urgentTasks || [],
    weekOffset: 0,
  });
  const notifications = syncStoredNotifications(
    parsed.notifications || legacyNotifications || [],
    notificationCandidates,
    userId
  );

  return {
    ...createFreshAppState(),
    ...parsedRest,
    courses,
    grades,
    urgentTasks: (parsed.urgentTasks || []).map((t) => normalizeUrgentTask(t, userId)),
    notifications,
    scheduleByDay: normalizeSchedule(
      hasSchedule ? parsed.scheduleByDay : createEmptySchedule()
    ),
    aiTasks,
    activeTaskIndex,
    readNotificationIds,
    selectedDay: getTodayAcademicDayIndex(),
    weekOffset: 0,
  };
}

function resolveDemoSeedState(studentId, email) {
  if (!isDemoUser(email)) return null;
  return buildDemoAppState(studentId);
}

function loadStateForStudent(studentId, studentEmail) {
  const email =
    studentEmail ?? getStudentById(studentId)?.email ?? '';

  try {
    const raw = localStorage.getItem(studentStorageKey(studentId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isDemoUser(email) && needsDemoSeedRefresh(parsed)) {
        const demoState = resolveDemoSeedState(studentId, email);
        return applyAiTasksReconciliation(
          parseStoredAppData(demoState, studentId)
        );
      }
      return applyAiTasksReconciliation(
        parseStoredAppData(parsed, studentId)
      );
    }
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy && Number(studentId) === 1) {
      const parsed = JSON.parse(legacy);
      if (isDemoUser(email) && needsDemoSeedRefresh(parsed)) {
        const demoState = resolveDemoSeedState(studentId, email);
        return applyAiTasksReconciliation(
          parseStoredAppData(demoState, studentId)
        );
      }
      return applyAiTasksReconciliation(
        parseStoredAppData(parsed, studentId)
      );
    }
  } catch {
    /* ignore */
  }

  if (isDemoUser(email)) {
    const demoState = resolveDemoSeedState(studentId, email);
    return applyAiTasksReconciliation(
      parseStoredAppData(demoState, studentId)
    );
  }

  return createFreshAppState();
}

function initSession() {
  ensureDemoStudentAccount();
  if (isSupabaseEnabled) {
    return { student: null, appState: createFreshAppState() };
  }
  const sessionId = getSessionStudentId();
  if (!sessionId) {
    return { student: null, appState: createFreshAppState() };
  }
  const student = getStudentById(sessionId);
  if (!student) {
    logoutStudent();
    return { student: null, appState: createFreshAppState() };
  }
  return {
    student,
    appState: loadStateForStudent(student.id, student.email),
  };
}


function calcGpa(courses, grades, userId) {
  return calcGpaFromGrades(grades, courses, userId);
}

function mergeCloudState(cloudState, studentId, studentEmail) {
  if (!cloudState) {
    return loadStateForStudent(studentId, studentEmail);
  }
  const merged = applyAiTasksReconciliation(
    parseStoredAppData(
      {
        ...createFreshAppState(),
        ...cloudState,
        selectedDay: getTodayAcademicDayIndex(),
      },
      studentId
    )
  );
  if (isDemoUser(studentEmail) && needsDemoSeedRefresh(merged)) {
    const demoState = resolveDemoSeedState(studentId, studentEmail);
    return applyAiTasksReconciliation(
      parseStoredAppData(demoState, studentId)
    );
  }
  return merged;
}

export function AppProvider({ children }) {
  const sessionInit = useMemo(() => initSession(), []);
  const [currentStudent, setCurrentStudent] = useState(sessionInit.student);
  const [state, setState] = useState(sessionInit.appState);
  const [authLoading, setAuthLoading] = useState(isSupabaseEnabled);
  const [authError, setAuthError] = useState('');
  const [toast, setToast] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);
  const [materialsSource, setMaterialsSource] = useState(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!isSupabaseEnabled) return undefined;
    let cancelled = false;

    (async () => {
      const session = await getSupabaseSession();
      if (cancelled) return;
      if (session) {
        const student = await fetchSupabaseStudent(session);
        const cloudState = await loadAppStateFromSupabase(session.user.id);
        if (cancelled) return;
        setCurrentStudent(student);
        setState(mergeCloudState(cloudState, student.id, student.email));
        setAuthLoading(false);
        return;
      }

      const sessionId = getSessionStudentId();
      if (sessionId) {
        const student = getStudentById(sessionId);
        if (student && isLocalDemoStudent(student)) {
          setCurrentStudent(student);
          setState(loadStateForStudent(student.id, student.email));
        }
      }
      setAuthLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!currentStudent) return undefined;
    localStorage.setItem(studentStorageKey(currentStudent.id), JSON.stringify(state));
    if (!isSupabaseEnabled || isLocalDemoStudent(currentStudent)) return undefined;

    const timer = setTimeout(() => {
      saveAppStateToSupabase(currentStudent.id, state).catch((err) => {
        console.warn('Supabase save failed:', err);
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [state, currentStudent]);

  useEffect(() => {
    const syncOverdue = () => {
      setState((prev) => applyAiTasksReconciliation(prev));
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') syncOverdue();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (currentStudent && !currentStudent.hasCompletedOnboarding) {
      setShowOnboarding(true);
    }
  }, [currentStudent, authLoading]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2800);
  };

  const activeTask = state.aiTasks[state.activeTaskIndex] ?? state.aiTasks[0] ?? null;

  const currentAiTask = useMemo(() => {
    if (!activeTask) return null;
    const { steps, approved, ...rest } = activeTask;
    return rest;
  }, [activeTask]);

  const aiSteps = useMemo(() => getTaskSubtasks(activeTask ?? {}), [activeTask]);
  const aiApproved = activeTask?.approved ?? false;

  const nextClass = useMemo(() => {
    const names = getGradeCourseNames(
      enrichCoursesWithGrades(state.courses, state.grades, currentStudent?.id)
    );
    return getNextClassFromSchedule(state.scheduleByDay, names);
  }, [state.scheduleByDay, state.courses, state.grades, currentStudent?.id]);

  const nextExam = useMemo(
    () => getNextExamFromSchedule(state.scheduleByDay),
    [state.scheduleByDay]
  );

  const openMaterials = (source) => {
    setMaterialsSource(source);
    setShowMaterials(true);
  };

  const syncToCurrentWeek = useCallback(() => {
    setState((prev) => ({
      ...prev,
      weekOffset: 0,
      selectedDay: getTodayAcademicDayIndex(),
    }));
  }, []);

  const toggleTask = (id) => {
    setState((prev) => ({
      ...prev,
      urgentTasks: prev.urgentTasks.map((t) =>
        t.id === id ? normalizeUrgentTask({ ...t, completed: !t.completed }, currentStudent?.id) : t
      ),
    }));
  };

  const addUrgentTask = (task) => {
    if (!currentStudent) return;
    const normalized = normalizeUrgentTask({ ...task, id: Date.now() }, currentStudent.id);
    setState((prev) => ({
      ...prev,
      urgentTasks: [...prev.urgentTasks, normalized],
    }));
    showToast('המטלה נוספה לרשימה');
  };

  const updateUrgentTask = (id, updates) => {
    setState((prev) => ({
      ...prev,
      urgentTasks: prev.urgentTasks.map((t) =>
        t.id === id ? normalizeUrgentTask({ ...t, ...updates, id: t.id }, currentStudent?.id) : t
      ),
    }));
    showToast('המטלה עודכנה');
  };

  const deleteUrgentTask = (id) => {
    setState((prev) => ({
      ...prev,
      urgentTasks: prev.urgentTasks.filter((t) => t.id !== id),
    }));
    showToast('המטלה נמחקה מהרשימה');
  };

  const weeklyProgress = useMemo(() => {
    const tasks = state.urgentTasks;
    const allSteps = state.aiTasks.flatMap((t) => getTaskSubtasks(t));
    const taskDone = tasks.filter((t) => t.completed).length;
    const stepDone = allSteps.filter((s) => s.is_done).length;
    const total = tasks.length + allSteps.length;
    const done = taskDone + stepDone;
    return total ? Math.round((done / total) * 100) : 0;
  }, [state.urgentTasks, state.aiTasks]);

  const degreeGpa = useMemo(
    () => calcGpa(state.courses, state.grades, currentStudent?.id),
    [state.courses, state.grades, currentStudent?.id]
  );
  const annualGpa = useMemo(
    () =>
      calcGpaForFilter(state.grades, state.courses, currentStudent?.id, {
        semester: "א'",
        year: "שנה א'",
      }),
    [state.courses, state.grades, currentStudent?.id]
  );

  const totalCredits = useMemo(
    () =>
      gradesForUser(state.grades, currentStudent?.id, state.courses).reduce(
        (sum, g) => sum + Number(g.weight),
        0
      ),
    [state.grades, state.courses, currentStudent?.id]
  );

  const updateStudent = async (updates) => {
    if (!currentStudent) return;
    if (isSupabaseEnabled && !isLocalDemoStudent(currentStudent)) {
      const result = await supabaseUpdateProfile(currentStudent.id, {
        ...updates,
        email: currentStudent.email,
      });
      if (!result.ok) {
        showToast(result.error);
        return;
      }
      setCurrentStudent((prev) => ({ ...prev, ...result.student }));
      setShowProfileEdit(false);
      showToast('הפרופיל עודכן!');
      return;
    }
    const result = updateStudentRecord(currentStudent.id, updates);
    if (!result.ok) {
      showToast(result.error);
      return;
    }
    setCurrentStudent(result.student);
    setShowProfileEdit(false);
    showToast('הפרופיל עודכן!');
  };

  const completeOnboarding = () => {
    if (!currentStudent) return;
    setShowOnboarding(false);
    setCurrentStudent((prev) => (prev ? { ...prev, hasCompletedOnboarding: true } : prev));
    if (isSupabaseEnabled && !isLocalDemoStudent(currentStudent)) {
      supabaseCompleteOnboarding(currentStudent.id);
    } else {
      updateStudentRecord(currentStudent.id, { hasCompletedOnboarding: true });
    }
  };

  const clearAuthError = () => setAuthError('');

  const login = async (email, password) => {
    if (isDemoCredentials(email, password)) {
      ensureDemoStudentAccount();
      const result = loginStudent(email, password);
      if (!result.ok) {
        setAuthError(result.error);
        return;
      }
      setAuthError('');
      setCurrentStudent(result.student);
      setState(loadStateForStudent(result.student.id, result.student.email));
      showToast(`שלום, ${result.student.name.split(' ')[0]}!`);
      return;
    }
    if (isSupabaseEnabled) {
      const result = await supabaseLogin(email, password);
      if (!result.ok) {
        setAuthError(result.error);
        return;
      }
      setAuthError('');
      setCurrentStudent(result.student);
      const cloudState = await loadAppStateFromSupabase(result.student.id);
      setState(mergeCloudState(cloudState, result.student.id, result.student.email));
      showToast(`שלום, ${result.student.name.split(' ')[0]}!`);
      return;
    }
    const result = loginStudent(email, password);
    if (!result.ok) {
      setAuthError(result.error);
      return;
    }
    setAuthError('');
    setCurrentStudent(result.student);
    setState(loadStateForStudent(result.student.id, result.student.email));
    showToast(`שלום, ${result.student.name.split(' ')[0]}!`);
  };

  const loginWithGoogle = async () => {
    if (!isSupabaseEnabled) {
      setAuthError('Google Login זמין רק כש-Supabase מוגדר');
      return { ok: false };
    }
    const result = await supabaseLoginWithGoogle();
    if (!result.ok) {
      setAuthError(result.error);
      return result;
    }
    return result;
  };

  const register = async ({ name, email, institution, password }) => {
    if (isSupabaseEnabled) {
      const result = await supabaseRegister({ name, email, institution, password });
      if (!result.ok) {
        setAuthError(result.error);
        return null;
      }
      setAuthError('');
      if (result.needsConfirmation) {
        showToast('נרשמת! אשרי את האימייל ואז התחברי');
        return result.email;
      }
      setCurrentStudent(result.student);
      setState(createFreshAppState());
      showToast('נרשמת בהצלחה!');
      return result.email;
    }
    const result = registerStudent({ name, email, institution, password });
    if (!result.ok) {
      setAuthError(result.error);
      return null;
    }
    setAuthError('');
    showToast('נרשמת בהצלחה! התחברי עם האימייל והסיסמה');
    return result.student.email;
  };

  const logout = async () => {
    if (isSupabaseEnabled && !isLocalDemoStudent(currentStudent)) {
      await supabaseLogout();
    } else {
      logoutStudent();
    }
    setCurrentStudent(null);
    setState(createFreshAppState());
    setShowProfile(false);
    setShowNotifications(false);
    setAuthError('');
    showToast('התנתקת בהצלחה');
  };

  const deleteAccount = async () => {
    if (!currentStudent) return false;
    if (isSupabaseEnabled && !isLocalDemoStudent(currentStudent)) {
      const result = await supabaseDeleteAccount(currentStudent.id);
      if (!result.ok) {
        showToast(result.error);
        return false;
      }
      setCurrentStudent(null);
      setState(createFreshAppState());
      setShowProfileEdit(false);
      setShowProfile(false);
      showToast('החשבון נמחק לצמיתות');
      return true;
    }
    const key = studentStorageKey(currentStudent.id);
    const result = deleteStudentAccount(currentStudent.id, key);
    if (!result.ok) {
      showToast(result.error);
      return false;
    }
    setCurrentStudent(null);
    setState(createFreshAppState());
    setShowProfileEdit(false);
    setShowProfile(false);
    showToast('החשבון נמחק לצמיתות');
    return true;
  };

  const addCourse = (course) => {
    if (!currentStudent) return;
    setState((prev) => {
      const courseId = Date.now();
      const { score, weight, grade, credits, ...courseMeta } = course;
      const normalizedCourse = normalizeCourse(
        {
          ...courseMeta,
          id: courseId,
          user_id: currentStudent.id,
          variant: semesterVariant(course.semester),
        },
        currentStudent.id
      );
      const gradeRecord = normalizeGrade({
        id: courseId + 1,
        course_id: courseId,
        score: score ?? grade ?? null,
        weight: Number(weight ?? credits) || 0,
      });
      return {
        ...prev,
        courses: [...prev.courses, normalizedCourse],
        grades: [...prev.grades, gradeRecord],
        editingCourseId: null,
      };
    });
    showToast('הקורס נוסף בהצלחה!');
  };

  const updateCourse = (id, course) => {
    if (!currentStudent) return;
    setState((prev) => {
      const { score, weight, grade, credits, ...courseMeta } = course;
      const nextCourses = prev.courses.map((c) =>
        c.id === id
          ? normalizeCourse(
              {
                ...c,
                ...courseMeta,
                id,
                user_id: currentStudent.id,
                variant: semesterVariant(course.semester ?? c.semester),
              },
              currentStudent.id
            )
          : c
      );
      const existingGrade = getGradeForCourse(prev.grades, id);
      const nextGrades = existingGrade
        ? prev.grades.map((g) =>
            g.course_id === Number(id)
              ? normalizeGrade({
                  ...g,
                  score: score ?? grade ?? null,
                  weight: Number(weight ?? credits ?? g.weight) || 0,
                })
              : g
          )
        : [
            ...prev.grades,
            normalizeGrade({
              id: Date.now(),
              course_id: id,
              score: score ?? grade ?? null,
              weight: Number(weight ?? credits) || 0,
            }),
          ];
      return {
        ...prev,
        courses: nextCourses,
        grades: nextGrades,
        editingCourseId: null,
      };
    });
    showToast('הקורס עודכן!');
  };

  const deleteCourse = (id) => {
    setState((prev) => {
      const course = prev.courses.find((c) => c.id === id);
      const { aiTasks, urgentTasks, scheduleByDay } = removeLinkedTasksForCourse(
        prev,
        id,
        course?.course_name
      );
      return {
        ...prev,
        courses: prev.courses.filter((c) => c.id !== id),
        grades: prev.grades.filter((g) => g.course_id !== Number(id)),
        aiTasks,
        urgentTasks,
        scheduleByDay,
        editingCourseId: prev.editingCourseId === id ? null : prev.editingCourseId,
        activeTaskIndex: Math.min(
          prev.activeTaskIndex,
          Math.max(0, aiTasks.length - 1)
        ),
      };
    });
    showToast('הקורס נמחק — כולל מטלות משויכות');
  };

  const deleteGradeForCourse = (courseId) => {
    setState((prev) => ({
      ...prev,
      grades: prev.grades.filter((g) => g.course_id !== Number(courseId)),
    }));
    showToast('הציון נמחק מהמערכת');
  };

  const setEditingCourse = (id) => {
    setState((prev) => ({ ...prev, editingCourseId: id }));
  };

  const toggleShowAllCourses = () => {
    setState((prev) => ({ ...prev, showAllCourses: !prev.showAllCourses }));
  };

  const applyWeekChange = (prev, newOffset, selectedDay) => {
    let nextSchedule = prev.scheduleByDay;
    let aiTasks = prev.aiTasks;

    prev.aiTasks.forEach((task) => {
      if (!task.approved) return;
      nextSchedule = removeTaskBlocksFromSchedule(nextSchedule, task.id);
    });

    aiTasks = prev.aiTasks.map((task) => {
      if (!task.approved) return task;
      const synced = scheduleTaskSteps(task, nextSchedule, newOffset);
      nextSchedule = synced.scheduleByDay;
      return synced.task;
    });

    return {
      ...prev,
      weekOffset: newOffset,
      selectedDay,
      scheduleByDay: nextSchedule,
      aiTasks,
    };
  };

  const setWeekOffset = (delta) => {
    setState((prev) => {
      const newOffset = prev.weekOffset + delta;
      const selectedDay = newOffset === 0 ? getTodayAcademicDayIndex() : prev.selectedDay;
      return applyWeekChange(prev, newOffset, selectedDay);
    });
  };

  const goToScheduleDate = (dateStr) => {
    setState((prev) => {
      const weekOffset = getWeekOffsetForDate(dateStr);
      const selectedDay = getDayIndexForScheduleDate(dateStr, weekOffset);
      return applyWeekChange(prev, weekOffset, selectedDay);
    });
  };

  const setSelectedDay = (index) => {
    setState((prev) => ({ ...prev, selectedDay: index }));
  };

  const setActiveTaskIndex = (index) => {
    setState((prev) => ({
      ...prev,
      activeTaskIndex: Math.max(0, Math.min(index, prev.aiTasks.length - 1)),
    }));
  };

  const mergeMaterials = (materialsText, pdfMaterials) => {
    const textMats = parseMaterials(materialsText);
    return [...textMats, ...(pdfMaterials || [])];
  };

  const buildEventBlock = (event) => {
    const materials = mergeMaterials(event.materialsText, event.pdfMaterials);
    return makeEventBlock({
      ...event,
      materials: materials.length ? materials : event.materials,
    });
  };

  const addScheduleEvent = (event) => {
    const day = state.selectedDay;
    const newBlock = buildEventBlock(event);
    setState((prev) => ({
      ...prev,
      scheduleByDay: {
        ...prev.scheduleByDay,
        [day]: [...(prev.scheduleByDay[day] || []), newBlock],
      },
    }));
    setShowAddEvent(false);
    showToast('השיעור נוסף למערכת!');
  };

  const updateScheduleEvent = (day, eventId, event) => {
    setState((prev) => ({
      ...prev,
      scheduleByDay: {
        ...prev.scheduleByDay,
        [day]: (prev.scheduleByDay[day] || []).map((e) =>
          e.id === eventId ? buildEventBlock({ ...event, id: eventId }) : e
        ),
      },
    }));
    setEditingEventId(null);
    showToast('האירוע עודכן!');
  };

  const deleteScheduleEvent = (day, eventId) => {
    setState((prev) => ({
      ...prev,
      scheduleByDay: {
        ...prev.scheduleByDay,
        [day]: (prev.scheduleByDay[day] || []).filter((e) => e.id !== eventId),
      },
    }));
    setEditingEventId(null);
    showToast('האירוע הוסר מהמערכת.');
  };

  const openEditEvent = (eventId) => {
    setEditingEventId(eventId);
    setShowAddEvent(false);
  };

  const createAiTask = ({
    title,
    deadline,
    deadlineTime,
    weeks,
    hoursPerWeek,
    description,
    fileName,
    documentText,
    parsedItems,
    fromDocument = false,
    selectedWeekIndices,
    courseId,
    courseName,
  }) => {
    const taskId = Date.now();
    const subtasks = splitTaskFromContent({
      weeks,
      hoursPerWeek,
      deadline,
      deadlineTime,
      taskId,
      documentText: documentText || description || '',
      parsedItems,
      fromDocument: fromDocument || Boolean(fileName),
      selectedWeekIndices,
    });

    if (!subtasks?.length) {
      showToast(
        'לא זוהו משימות בקובץ. ודאי שיש רשימה ממוספרת (1. / א. / -) או ערכי את התיאור ידנית.'
      );
      return false;
    }

    const newTask = normalizeAiTask({
      id: taskId,
      title,
      deadline,
      deadlineTime: deadlineTime || '23:59',
      weeks: deadline
        ? weeksUntilDeadline(deadline, deadlineTime || '23:59')
        : weeks || selectedWeekIndices?.length || 1,
      hoursPerWeek,
      description,
      fileName,
      courseId: courseId ?? null,
      courseName: courseName ?? '',
      selectedWeekIndices: selectedWeekIndices ?? [],
      approved: false,
      subtasks,
    });

    setState((prev) => ({
      ...prev,
      aiTasks: [...prev.aiTasks, newTask],
      activeTaskIndex: prev.aiTasks.length,
    }));
    setShowNewTaskModal(false);
    showToast(
      fromDocument || fileName
        ? `המשימה פורקה ל-${subtasks.length} שלבים מהמסמך. אשרי את הלו"ז כדי לשבץ ביומן.`
        : `המשימה פורקה ל-${subtasks.length} שלבים. אשרי את הלו"ז כדי לשבץ ביומן.`
    );
    return true;
  };

  const deleteAiTask = (taskId) => {
    setState((prev) => {
      const idx = prev.aiTasks.findIndex((t) => Number(t.id) === Number(taskId));
      if (idx === -1) return prev;

      const nextTasks = prev.aiTasks.filter((t) => Number(t.id) !== Number(taskId));
      let nextIndex = prev.activeTaskIndex;
      if (idx < prev.activeTaskIndex) {
        nextIndex = prev.activeTaskIndex - 1;
      } else if (idx === prev.activeTaskIndex) {
        nextIndex = Math.min(prev.activeTaskIndex, Math.max(0, nextTasks.length - 1));
      }
      nextIndex = Math.max(0, Math.min(nextIndex, Math.max(0, nextTasks.length - 1)));

      return {
        ...prev,
        aiTasks: nextTasks,
        activeTaskIndex: nextIndex,
        scheduleByDay: removeTaskBlocksFromSchedule(prev.scheduleByDay, taskId),
      };
    });
    showToast('המשימה נמחקה — כולל שיבוצים ביומן');
  };

  const markStepDone = (taskId, stepId) => {
    setState((prev) => {
      let scheduleByDay = prev.scheduleByDay;
      const aiTasks = prev.aiTasks.map((task) => {
        if (Number(task.id) !== Number(taskId)) return task;

        const subtasks = getTaskSubtasks(task);
        const stepIdx = subtasks.findIndex((s) => s.id === stepId);
        if (stepIdx === -1) return task;

        const step = subtasks[stepIdx];
        if (step.is_done) return task;

        if (step.scheduleEventId) {
          scheduleByDay = removeEventFromSchedule(scheduleByDay, step.scheduleEventId);
        }

        const updated = subtasks.map((s, i) => {
          if (s.id === stepId) {
            return normalizeSubtask(
              {
                ...s,
                is_done: true,
                status: 'done',
                label: STEP_STATUS_LABELS.done,
                scheduleEventId: null,
              },
              task.id
            );
          }
          if (i === stepIdx + 1 && !s.is_done && (s.status === 'pending' || s.status === 'at_risk')) {
            return normalizeSubtask(
              { ...s, status: 'active', is_done: false },
              task.id
            );
          }
          return s;
        });

        return syncTaskSubtasks(task, updated);
      });

      return { ...prev, aiTasks, scheduleByDay };
    });
    showToast('תת-המשימה סומנה כהושלמה!');
  };

  const markStepNotDone = (taskId, stepId) => {
    setState((prev) => {
      let scheduleByDay = { ...prev.scheduleByDay };
      const aiTasks = prev.aiTasks.map((task) => {
        if (Number(task.id) !== Number(taskId)) return task;

        const subtasks = getTaskSubtasks(task);
        const stepIdx = subtasks.findIndex((s) => s.id === stepId);
        if (stepIdx === -1) return task;

        const step = subtasks[stepIdx];
        if (step.is_done) return task;

        const dateStr = (step.allocated_time || todayLocalDate()).split('T')[0];
        const newDate = addAcademicDays(dateStr, 1);
        const dayIndex = getDayIndexForScheduleDate(newDate, prev.weekOffset);
        const dayBlocks = (scheduleByDay[dayIndex] || []).filter(
          (e) => e.id !== step.scheduleEventId
        );

        if (step.scheduleEventId) {
          scheduleByDay = removeEventFromSchedule(scheduleByDay, step.scheduleEventId);
        }

        const title = step.subtask_title || extractSubtaskTitle(step);
        const eventId = `ai-${taskId}-${stepId}-${Date.now()}`;
        const slotMinutes = findFreeTimeSlot(dayBlocks, step.durationMinutes);
        const allocatedTime = minutesToTimeString(slotMinutes);
        const newBlock = makeEventBlock({
          id: eventId,
          title,
          room: 'משימת AI',
          time: allocatedTime,
          type: 'task',
          durationMinutes: step.durationMinutes,
          atRisk: true,
          taskId,
          stepId,
          scheduledDate: newDate,
          materials: [],
        });

        scheduleByDay = {
          ...scheduleByDay,
          [dayIndex]: [...dayBlocks, newBlock],
        };

        const updated = subtasks.map((s) => {
          if (s.id !== stepId) return s;
          return normalizeSubtask(
            {
              ...s,
              is_done: false,
              status: 'at_risk',
              label: STEP_STATUS_LABELS.at_risk,
              allocated_time: newDate,
              allocatedTime,
              scheduleEventId: eventId,
              rescheduleCount: (s.rescheduleCount || 0) + 1,
            },
            task.id
          );
        });

        return syncTaskSubtasks({ ...task, approved: true }, updated);
      });

      return { ...prev, aiTasks, scheduleByDay };
    });
    showToast('תת-המשימה נדחתה ליום הבא — התאריך והיומן עודכנו');
  };

  const deleteSubtask = (taskId, stepId) => {
    const task = state.aiTasks.find((t) => Number(t.id) === Number(taskId));
    if (!task) return false;
    if (getTaskSubtasks(task).length <= 1) {
      showToast('לא ניתן למחוק את תת-המשימה האחרונה — מחקי את המשימה כולה');
      return false;
    }

    setState((prev) => {
      let scheduleByDay = prev.scheduleByDay;
      const aiTasks = prev.aiTasks.map((t) => {
        if (Number(t.id) !== Number(taskId)) return t;
        const subtasks = getTaskSubtasks(t);
        const step = subtasks.find((s) => s.id === stepId);
        if (!step) return t;
        if (step.scheduleEventId) {
          scheduleByDay = removeEventFromSchedule(scheduleByDay, step.scheduleEventId);
        }
        return syncTaskSubtasks(
          t,
          subtasks.filter((s) => s.id !== stepId)
        );
      });
      return { ...prev, aiTasks, scheduleByDay };
    });
    showToast('תת-המשימה נמחקה');
    return true;
  };

  const updateSubtaskSchedule = (taskId, stepId, { date, time }) => {
    if (!date) {
      showToast('בחרי תאריך לשיבוץ');
      return false;
    }

    setState((prev) => {
      let scheduleByDay = { ...prev.scheduleByDay };
      const aiTasks = prev.aiTasks.map((task) => {
        if (Number(task.id) !== Number(taskId)) return task;

        const subtasks = getTaskSubtasks(task);
        const stepIdx = subtasks.findIndex((s) => s.id === stepId);
        if (stepIdx === -1) return task;

        const step = subtasks[stepIdx];
        if (step.is_done) return task;

        if (step.scheduleEventId) {
          scheduleByDay = removeEventFromSchedule(scheduleByDay, step.scheduleEventId);
        }

        const dateStr = date.split('T')[0];
        const today = todayLocalDate();
        const nextStatus = resolveSubtaskStatus(dateStr, today);
        const dayIndex = getDayIndexForScheduleDate(dateStr, prev.weekOffset);
        const dayBlocks = (scheduleByDay[dayIndex] || []).filter(
          (e) => e.id !== step.scheduleEventId
        );
        const slotMinutes = time
          ? parseTime(time)
          : findFreeTimeSlot(dayBlocks, step.durationMinutes);
        const allocatedTime = minutesToTimeString(slotMinutes);
        const eventId = `ai-${taskId}-${stepId}-${Date.now()}`;
        let scheduleEventId = null;

        if (task.approved) {
          const title = step.subtask_title || extractSubtaskTitle(step);
          const newBlock = makeEventBlock({
            id: eventId,
            title,
            room: 'משימת AI',
            time: allocatedTime,
            type: 'task',
            durationMinutes: step.durationMinutes,
            atRisk: nextStatus === 'at_risk',
            taskId,
            stepId,
            scheduledDate: dateStr,
            materials: [],
          });
          scheduleByDay = {
            ...scheduleByDay,
            [dayIndex]: [...dayBlocks, newBlock],
          };
          scheduleEventId = eventId;
        }

        const updated = subtasks.map((s, i) => {
          if (s.id !== stepId) return s;
          return normalizeSubtask(
            {
              ...s,
              allocated_time: dateStr,
              allocatedTime: time || allocatedTime,
              scheduleEventId,
              status: nextStatus,
              label: STEP_STATUS_LABELS[nextStatus],
            },
            task.id
          );
        });

        return syncTaskSubtasks(task, updated);
      });

      return { ...prev, aiTasks, scheduleByDay };
    });
    showToast('משבצת הזמן עודכנה');
    return true;
  };

  const approveAiTaskSchedule = (taskId) => {
    const task = state.aiTasks.find((t) => t.id === taskId);
    if (!task || task.approved) return false;

    const weekOffset = state.weekOffset ?? 0;
    const { scheduleByDay, task: scheduledTask } = scheduleTaskSteps(
      { ...task, approved: true },
      state.scheduleByDay,
      weekOffset
    );

    setState((prev) => ({
      ...prev,
      aiTasks: prev.aiTasks.map((t) => (Number(t.id) === Number(taskId) ? scheduledTask : t)),
      scheduleByDay,
    }));
    showToast('הלו"ז אושר ושובץ ביומן!');
    return true;
  };

  const approveAiSchedule = () => {
    if (!activeTask) return false;
    return approveAiTaskSchedule(activeTask.id);
  };

  const markNotificationRead = (id) => {
    setState((prev) => ({
      ...prev,
      notifications: (prev.notifications || []).map((n) =>
        n.id === Number(id) || n.sourceKey === String(id)
          ? { ...n, read: true }
          : n
      ),
      readNotificationIds: [...new Set([...(prev.readNotificationIds || []), String(id)])],
    }));
  };

  const markAllNotificationsRead = () => {
    setState((prev) => ({
      ...prev,
      notifications: (prev.notifications || []).map((n) => ({ ...n, read: true })),
      readNotificationIds: [
        ...new Set([
          ...(prev.readNotificationIds || []),
          ...(prev.notifications || []).map((n) => String(n.id)),
        ]),
      ],
    }));
  };

  const deleteNotification = (id) => {
    const key = String(id);
    setState((prev) => ({
      ...prev,
      notifications: (prev.notifications || []).filter(
        (n) => String(n.id) !== key && n.sourceKey !== key
      ),
      readNotificationIds: (prev.readNotificationIds || []).filter((k) => k !== key),
    }));
  };

  const clearAllNotifications = () => {
    setState((prev) => ({
      ...prev,
      notifications: [],
      readNotificationIds: [],
    }));
    showToast('כל ההתראות נמחקו');
  };

  const { days, monthLabel } = getWeekDays(state.weekOffset);

  const notifications = useMemo(
    () => mergeNotificationReadState(state.notifications || [], state.readNotificationIds || []),
    [state.notifications, state.readNotificationIds]
  );

  useEffect(() => {
    if (!currentStudent) return;
    const candidates = generateNotificationCandidates({
      aiTasks: state.aiTasks,
      scheduleByDay: state.scheduleByDay,
      urgentTasks: state.urgentTasks,
      weekOffset: state.weekOffset,
    });
    const synced = syncStoredNotifications(
      state.notifications,
      candidates,
      currentStudent.id
    );
    const changed =
      JSON.stringify(synced.map((n) => [n.sourceKey, n.message, n.read])) !==
      JSON.stringify((state.notifications || []).map((n) => [n.sourceKey, n.message, n.read]));
    if (changed) {
      setState((prev) => ({ ...prev, notifications: synced }));
    }
  }, [
    currentStudent,
    state.aiTasks,
    state.scheduleByDay,
    state.urgentTasks,
    state.weekOffset,
  ]);

  const currentSchedule = useMemo(() => {
    const dayDate = days[state.selectedDay]?.date;
    return (state.scheduleByDay[state.selectedDay] || []).filter(
      (ev) => !ev.scheduledDate || ev.scheduledDate === dayDate
    );
  }, [state.scheduleByDay, state.selectedDay, days]);
  const userCourses = useMemo(
    () => enrichCoursesWithGrades(state.courses, state.grades, currentStudent?.id),
    [state.courses, state.grades, currentStudent?.id]
  );
  const courseNameSuggestions = useMemo(
    () => collectCourseNames(userCourses, state.scheduleByDay),
    [userCourses, state.scheduleByDay]
  );
  const visibleCourses = state.showAllCourses
    ? userCourses
    : userCourses.slice(0, 2);
  const pendingTasks = state.urgentTasks.filter((t) => !t.completed);

  const editingEvent = editingEventId
    ? (state.scheduleByDay[state.selectedDay] || []).find((e) => e.id === editingEventId)
    : null;

  const activeMaterials = materialsSource || nextClass;

  const value = {
    ...state,
    currentStudent,
    isAuthenticated: Boolean(currentStudent),
    authLoading,
    profile: currentStudent,
    notifications,
    currentAiTask,
    aiSteps,
    aiApproved,
    nextClass,
    nextExam,
    activeMaterials,
    toast,
    showNotifications,
    showProfile,
    showProfileEdit,
    showMaterials,
    materialsSource,
    showAddEvent,
    showNewTaskModal,
    editingEventId,
    editingEvent,
    setShowNotifications,
    setShowProfile,
    setShowProfileEdit,
    setShowMaterials,
    setMaterialsSource,
    openMaterials,
    setShowAddEvent,
    setShowNewTaskModal,
    setEditingEventId,
    openEditEvent,
    syncToCurrentWeek,
    showToast,
    toggleTask,
    addUrgentTask,
    updateUrgentTask,
    deleteUrgentTask,
    weeklyProgress,
    degreeGpa,
    annualGpa,
    totalCredits,
    totalDegreeCredits: TOTAL_DEGREE_CREDITS,
    updateStudent,
    updateProfile: updateStudent,
    login,
    loginWithGoogle,
    register,
    logout,
    deleteAccount,
    authError,
    clearAuthError,
    showOnboarding,
    completeOnboarding,
    addCourse,
    updateCourse,
    deleteCourse,
    deleteGradeForCourse,
    setEditingCourse,
    toggleShowAllCourses,
    visibleCourses,
    userCourses,
    courses: userCourses,
    courseNameSuggestions,
    grades: state.grades,
    calcGpaForFilter: (filter) =>
      calcGpaForFilter(state.grades, state.courses, currentStudent?.id, filter),
    pendingTasks,
    setWeekOffset,
    goToScheduleDate,
    setSelectedDay,
    setActiveTaskIndex,
    addScheduleEvent,
    updateScheduleEvent,
    deleteScheduleEvent,
    createAiTask,
    deleteAiTask,
    deleteSubtask,
    updateSubtaskSchedule,
    markStepDone,
    markStepNotDone,
    approveAiTaskSchedule,
    approveAiSchedule,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clearAllNotifications,
    weekDays: days,
    monthLabel,
    currentSchedule,
    parseMaterials,
    mergeMaterials,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
