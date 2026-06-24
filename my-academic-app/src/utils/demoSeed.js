import {
  todayLocalDate,
  offsetAcademicDays,
  getTodayAcademicDayIndex,
  minutesToTop,
  durationToHeight,
} from './scheduleUtils';
import { normalizeSubtask } from './taskSplitter';
import { YEAR_OPTIONS, SEMESTER_OPTIONS } from './courseUtils';

export const DEMO_USER_EMAIL = 'dana@university.ac.il';
export const DEMO_SEED_VERSION = 2;

const [YEAR_A, YEAR_B] = YEAR_OPTIONS;
const [SEM_A, SEM_B] = SEMESTER_OPTIONS;
const VALID_YEARS = new Set(YEAR_OPTIONS);

export function isDemoUser(email) {
  return (email ?? '').trim().toLowerCase() === DEMO_USER_EMAIL;
}

export function isEmptyDemoSeedTarget(data) {
  if (!data) return true;
  const hasCourses = (data.courses || []).length > 0;
  const hasUrgent = (data.urgentTasks || []).length > 0;
  const hasAi = (data.aiTasks || []).length > 0;
  const hasSchedule =
    data.scheduleByDay &&
    Object.values(data.scheduleByDay).some((day) => (day || []).length > 0);
  return !hasCourses && !hasUrgent && !hasAi && !hasSchedule;
}

export function needsDemoSeedRefresh(data) {
  if (!data) return true;
  if (isEmptyDemoSeedTarget(data)) return true;
  if (data.demoSeedVersion !== DEMO_SEED_VERSION) return true;
  const courses = data.courses || [];
  if (courses.some((c) => c.year && !VALID_YEARS.has(c.year))) return true;
  return false;
}

function scheduleBlock(id, { title, room, time, type = 'lecture', durationMinutes = 90, materials = [], scheduledDate = null }) {
  const [h, m] = time.split(':').map(Number);
  const timeMinutes = h * 60 + m;
  const color = type === 'exam' ? 'orange' : type === 'task' ? 'pink' : 'purple';
  return {
    id,
    title,
    room,
    time,
    top: minutesToTop(timeMinutes),
    height: durationToHeight(durationMinutes),
    color,
    type,
    materials,
    durationMinutes,
    ...(scheduledDate ? { scheduledDate } : {}),
  };
}

function buildDemoCourses(userId) {
  return [
    // שנה א׳ — סמסטר א׳
    { id: 101, user_id: userId, course_name: 'מבוא לעבודה סוציאלית', semester: SEM_A, year: YEAR_A },
    { id: 102, user_id: userId, course_name: 'מיומנויות למידה אקדמית', semester: SEM_A, year: YEAR_A },
    { id: 103, user_id: userId, course_name: 'כתיבה אקדמית', semester: SEM_A, year: YEAR_A },
    // שנה א׳ — סמסטר ב׳
    { id: 104, user_id: userId, course_name: 'פסיכולוגיה כללית', semester: SEM_B, year: YEAR_A },
    { id: 105, user_id: userId, course_name: 'תקשורת בינאישית', semester: SEM_B, year: YEAR_A },
    { id: 106, user_id: userId, course_name: 'מבוא לפילוסופיה', semester: SEM_B, year: YEAR_A },
    // שנה ב׳ — סמסטר א׳
    { id: 107, user_id: userId, course_name: 'עקרונות החינוך', semester: SEM_A, year: YEAR_B },
    { id: 108, user_id: userId, course_name: 'מבוא לסוציולוגיה', semester: SEM_A, year: YEAR_B },
    { id: 109, user_id: userId, course_name: 'פסיכולוגיה התפתחותית', semester: SEM_A, year: YEAR_B },
    // שנה ב׳ — סמסטר ב׳ (נוכחי)
    { id: 110, user_id: userId, course_name: 'שיטות מחקר בחברה', semester: SEM_B, year: YEAR_B },
    { id: 111, user_id: userId, course_name: 'סטטיסטיקה לעבודה סוציאלית', semester: SEM_B, year: YEAR_B },
    { id: 112, user_id: userId, course_name: 'אתיקה מקצועית בעבודה סוציאלית', semester: SEM_B, year: YEAR_B },
  ];
}

function buildDemoGrades() {
  return [
    { id: 201, course_id: 101, score: 90, weight: 3 },
    { id: 202, course_id: 102, score: 88, weight: 2 },
    { id: 203, course_id: 103, score: 85, weight: 2 },
    { id: 204, course_id: 104, score: 87, weight: 3 },
    { id: 205, course_id: 105, score: 91, weight: 3 },
    { id: 206, course_id: 106, score: 82, weight: 2 },
    { id: 207, course_id: 107, score: 95, weight: 3 },
    { id: 208, course_id: 108, score: 92, weight: 3 },
    { id: 209, course_id: 109, score: 88, weight: 3 },
    { id: 210, course_id: 110, score: 84, weight: 3 },
    { id: 211, course_id: 111, score: 76, weight: 4 },
    { id: 212, course_id: 112, score: 93, weight: 2 },
  ];
}

function buildDemoUrgentTasks(userId) {
  const today = todayLocalDate();
  return [
    {
      id: 301,
      user_id: userId,
      title: 'להגיש סיכום מאמר — פסיכולוגיה התפתחותית',
      deadline: offsetAcademicDays(today, 1),
      deadlineTime: '23:59',
      courseId: 109,
      courseName: 'פסיכולוגיה התפתחותית',
      priority: 'high',
      completed: false,
    },
    {
      id: 302,
      user_id: userId,
      title: 'לפתור תרגיל בית 4 — סטטיסטיקה',
      deadline: offsetAcademicDays(today, 3),
      deadlineTime: '18:00',
      courseId: 111,
      courseName: 'סטטיסטיקה לעבודה סוציאלית',
      priority: 'high',
      completed: false,
    },
    {
      id: 303,
      user_id: userId,
      title: 'להכין מצגת קבוצתית — מבוא לסוציולוגיה',
      deadline: offsetAcademicDays(today, -2),
      deadlineTime: '12:00',
      courseId: 108,
      courseName: 'מבוא לסוציולוגיה',
      priority: 'medium',
      completed: true,
    },
    {
      id: 304,
      user_id: userId,
      title: 'לעדכן יומן שדה — שיטות מחקר בחברה',
      deadline: offsetAcademicDays(today, 5),
      deadlineTime: '23:59',
      courseId: 110,
      courseName: 'שיטות מחקר בחברה',
      priority: 'medium',
      completed: false,
    },
    {
      id: 305,
      user_id: userId,
      title: 'לקרוא פרק 7 — אתיקה מקצועית',
      deadline: offsetAcademicDays(today, 4),
      deadlineTime: '20:00',
      courseId: 112,
      courseName: 'אתיקה מקצועית בעבודה סוציאלית',
      priority: 'low',
      completed: false,
    },
    {
      id: 306,
      user_id: userId,
      title: 'להירשם לשעות קבלה — מרצה פסיכולוגיה',
      deadline: today,
      deadlineTime: '17:00',
      courseId: 109,
      courseName: 'פסיכולוגיה התפתחותית',
      priority: 'medium',
      completed: false,
    },
    {
      id: 307,
      user_id: userId,
      title: 'להדפיס חומרים לסדנת כתיבה',
      deadline: offsetAcademicDays(today, 2),
      deadlineTime: '08:00',
      courseId: null,
      courseName: '',
      priority: 'low',
      completed: false,
    },
  ];
}

function buildDemoSchedule() {
  const today = todayLocalDate();
  const statsExamDate = offsetAcademicDays(today, 12);
  const ethicsExamDate = offsetAcademicDays(today, 18);

  return {
    0: [
      scheduleBlock('sch-1', {
        title: 'פסיכולוגיה התפתחותית',
        room: 'אולם 204',
        time: '09:00',
        durationMinutes: 90,
        materials: [
          { type: 'text', name: 'מצגת שיעור 6' },
          { type: 'text', name: 'פרק 3 — התפתחות רגשית' },
        ],
      }),
      scheduleBlock('sch-2', {
        title: 'מבוא לסוציולוגיה',
        room: 'כיתה 112',
        time: '11:30',
        durationMinutes: 90,
        materials: [{ type: 'text', name: 'מאמר: תיאוריות חברתיות' }],
      }),
    ],
    1: [
      scheduleBlock('sch-3', {
        title: 'סטטיסטיקה לעבודה סוציאלית',
        room: 'מעבדת מחשבים 3',
        time: '10:00',
        durationMinutes: 120,
        materials: [
          { type: 'text', name: 'תרגיל בית 4' },
          { type: 'text', name: 'גיליון נתונים — SPSS' },
        ],
      }),
      scheduleBlock('sch-3b', {
        title: 'שיטות מחקר בחברה',
        room: 'כיתה 305',
        time: '14:00',
        durationMinutes: 90,
        materials: [{ type: 'text', name: 'מדריך לכתיבת מחקר' }],
      }),
    ],
    2: [
      scheduleBlock('sch-4', {
        title: 'עקרונות החינוך',
        room: 'אולם 101',
        time: '08:30',
        durationMinutes: 90,
        materials: [{ type: 'text', name: 'סיכום הרצאה — שיעור 4' }],
      }),
      scheduleBlock('sch-5', {
        title: 'אתיקה מקצועית בעבודה סוציאלית',
        room: 'כיתה 208',
        time: '13:00',
        durationMinutes: 90,
        materials: [{ type: 'text', name: 'קוד אתי — עבודה סוציאלית' }],
      }),
    ],
    3: [
      scheduleBlock('sch-6', {
        title: 'סדנת כתיבה אקדמית',
        room: 'ספרייה — חדר 2',
        time: '14:00',
        durationMinutes: 60,
        materials: [{ type: 'text', name: 'תבנית עבודה סמינריונית' }],
      }),
      scheduleBlock('sch-6b', {
        title: 'שעות קבלה — ד״ר לוי',
        room: 'משרד 412',
        time: '16:00',
        durationMinutes: 30,
        type: 'lecture',
        materials: [],
      }),
    ],
    4: [
      scheduleBlock('sch-exam-stats', {
        title: 'מבחן — סטטיסטיקה לעבודה סוציאלית',
        room: 'אולם 150',
        time: '09:00',
        type: 'exam',
        durationMinutes: 180,
        scheduledDate: statsExamDate,
        materials: [{ type: 'text', name: 'חומר לבחינה — פרקים 1–8' }],
      }),
      scheduleBlock('sch-exam-ethics', {
        title: 'בוחן — אתיקה מקצועית',
        room: 'כיתה 208',
        time: '13:00',
        type: 'exam',
        durationMinutes: 90,
        scheduledDate: ethicsExamDate,
        materials: [{ type: 'text', name: 'מקרי בוחן — דילמות אתיות' }],
      }),
    ],
  };
}

function buildSubtasks(taskId, steps) {
  return steps.map((s, i) => normalizeSubtask(s, taskId, { index: i }));
}

function buildDemoAiTasks() {
  const today = todayLocalDate();

  const seminarTaskId = 1001;
  const seminarSubtasks = buildSubtasks(seminarTaskId, [
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
    {
      id: 4,
      subtask_title: 'עריכה והגשה',
      description: 'ערכי, הוסיפי ביבליוגרפיה והגישי לפי הנחיות המרצה.',
      status: 'pending',
      is_done: false,
      allocated_time: offsetAcademicDays(today, 14),
      durationMinutes: 90,
    },
  ]);

  const homeworkTaskId = 1002;
  const homeworkSubtasks = buildSubtasks(homeworkTaskId, [
    {
      id: 1,
      subtask_title: 'קריאת הוראות המטלה',
      description: 'עברי על דף המטלה וסמני את דרישות ההגשה.',
      status: 'done',
      is_done: true,
      allocated_time: offsetAcademicDays(today, -2),
      durationMinutes: 30,
    },
    {
      id: 2,
      subtask_title: 'פתרון שאלות 1–5',
      description: 'חשבי ממוצע, סטיית תקן ומתאם לפי הנתונים בגיליון.',
      status: 'active',
      is_done: false,
      allocated_time: offsetAcademicDays(today, 2),
      durationMinutes: 120,
    },
    {
      id: 3,
      subtask_title: 'בדיקה והגשה',
      description: 'בדקי את התשובות והעלי לפורטל הקורס.',
      status: 'pending',
      is_done: false,
      allocated_time: offsetAcademicDays(today, 8),
      durationMinutes: 45,
    },
  ]);

  const journalTaskId = 1003;
  const journalSubtasks = buildSubtasks(journalTaskId, [
    {
      id: 1,
      subtask_title: 'תיעוד שדה — ביקור ראשון',
      description: 'כתבי תיאור מפורט של הביקור, כולל תצפיות ורефלקציה.',
      status: 'done',
      is_done: true,
      allocated_time: offsetAcademicDays(today, -5),
      durationMinutes: 60,
    },
    {
      id: 2,
      subtask_title: 'ניתוח מקרה',
      description: 'נתחי את המקרה לפי מודל עבודה סוציאלית שנלמד בכיתה.',
      status: 'active',
      is_done: false,
      allocated_time: offsetAcademicDays(today, 1),
      durationMinutes: 90,
    },
    {
      id: 3,
      subtask_title: 'הגשת יומן',
      description: 'סכמי והגישי את יומן השדה המלא.',
      status: 'pending',
      is_done: false,
      allocated_time: offsetAcademicDays(today, 6),
      durationMinutes: 60,
    },
  ]);

  return [
    {
      id: seminarTaskId,
      title: 'עבודה סמינריונית — פסיכולוגיה התפתחותית',
      deadline: offsetAcademicDays(today, 20),
      deadlineTime: '23:59',
      weeks: 4,
      hoursPerWeek: 5,
      description: 'עבודה סמינריונית על התפתחות רגשית בגיל הרך',
      fileName: 'הנחיות_סמינריון.pdf',
      courseId: 109,
      courseName: 'פסיכולוגיה התפתחותית',
      selectedWeekIndices: [0, 1, 2, 3],
      approved: true,
      subtasks: seminarSubtasks,
    },
    {
      id: homeworkTaskId,
      title: 'תרגיל בית 4 — סטטיסטיקה',
      deadline: offsetAcademicDays(today, 10),
      deadlineTime: '23:59',
      weeks: 2,
      hoursPerWeek: 3,
      description: 'ניתוח נתונים וחישוב מדדי מרכז ופיזור',
      fileName: null,
      courseId: 111,
      courseName: 'סטטיסטיקה לעבודה סוציאלית',
      selectedWeekIndices: [0, 1],
      approved: false,
      subtasks: homeworkSubtasks,
    },
    {
      id: journalTaskId,
      title: 'יומן שדה — שיטות מחקר',
      deadline: offsetAcademicDays(today, 14),
      deadlineTime: '23:59',
      weeks: 3,
      hoursPerWeek: 4,
      description: 'תיעוד וניתוח של 3 ביקורי שדה',
      fileName: 'תבנית_יומן_שדה.docx',
      courseId: 110,
      courseName: 'שיטות מחקר בחברה',
      selectedWeekIndices: [0, 1, 2],
      approved: true,
      subtasks: journalSubtasks,
    },
  ];
}

export function buildDemoAppState(userId) {
  return {
    demoSeedVersion: DEMO_SEED_VERSION,
    urgentTasks: buildDemoUrgentTasks(userId),
    courses: buildDemoCourses(userId),
    grades: buildDemoGrades(),
    notifications: [],
    scheduleByDay: buildDemoSchedule(),
    weekOffset: 0,
    selectedDay: getTodayAcademicDayIndex(),
    aiTasks: buildDemoAiTasks(),
    activeTaskIndex: 0,
    readNotificationIds: [],
    showAllCourses: false,
    editingCourseId: null,
  };
}
