import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { BookIcon, CalendarIcon, CalendarPlusIcon, TrashIcon } from '../components/Icons';
import Modal from '../components/Modal';
import WeekPlannerGrid from '../components/WeekPlannerGrid';
import CourseNameInput from '../components/CourseNameInput';
import { weeksUntilDeadline, formatDeadlineLabel, defaultWorkWeekIndices } from '../utils/scheduleUtils';
import { extractDocumentText, isSupportedTaskFile } from '../utils/documentTextUtils';
import { inferTaskTitle, previewParsedTasks, PARSE_STRATEGIES, PARSE_STRATEGY_LABELS } from '../utils/taskContentParser';
import { parseTaskWithOpenAI } from '../services/edgeFunctions';
import { findCourseByName, getGradeCourseNames } from '../utils/courseNameUtils';
import { formatDuration, formatAllocatedTime, getTaskSubtasks } from '../utils/taskSplitter';

const SPLIT_BUILD_MODES = {
  manual: 'manual',
  ai: 'ai',
};

const badgeClass = {
  done: 'timeline__badge--done',
  active: 'timeline__badge--active',
  pending: 'timeline__badge--pending',
  at_risk: 'timeline__badge--at_risk',
};

const AI_TIPS = [
  'חלוקת המשימה לצעדים קטנים מעלה את סיכויי ההצלחה ב-40%.',
  'שבצי את השלבים ביומן — קל יותר לעמוד ביעדים כשיש זמן מוגדר.',
  'אם שלב לא הושלם, המערכת תדחה אותו ותסמן אותו בסיכון — כך לא תפספסי כלום.',
  'העלי קובץ Word, PDF או TXT — המערכת תפרק לפי המשימות שבמסמך.',
  'התחילי מהשלב הפעיל — סמני "הושלם" רק כשבאמת סיימת.',
  'שעה וחצי לסקירת ספרות? המערכת תשבץ בלו"ז בדיוק לפי משך הזמן שהוגדר.',
];

const emptyTaskForm = {
  title: '',
  courseName: '',
  deadline: '',
  deadlineTime: '23:59',
  hoursPerWeek: '5',
  description: '',
};

function TaskSlide({
  task,
  onApprove,
  onStepDone,
  onStepNotDone,
  onDelete,
  onDeleteSubtask,
  onUpdateSubtaskSchedule,
}) {
  const [expandedId, setExpandedId] = useState(null);
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [scheduleDraft, setScheduleDraft] = useState({ date: '', time: '09:00' });
  const subtasks = getTaskSubtasks(task);
  const selectedWeekCount = task.selectedWeekIndices?.length || defaultWorkWeekIndices(task.weeks).length;
  const workRangeLabel = useMemo(() => {
    const pending = subtasks.filter((s) => s.allocated_time);
    if (!pending.length) return '';
    const dates = pending.map((s) => s.allocated_time.split('T')[0]).sort();
    const first = new Date(`${dates[0]}T12:00:00`).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
    const last = new Date(`${dates[dates.length - 1]}T12:00:00`).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
    return `${first} – ${last}`;
  }, [subtasks]);

  const deadlineLabel = formatDeadlineLabel(task.deadline, task.deadlineTime);

  const handleStepClick = (step) => {
    setExpandedId(expandedId === step.id ? null : step.id);
  };

  const openScheduleEdit = (subtask, e) => {
    e?.stopPropagation();
    setEditingScheduleId(subtask.id);
    setScheduleDraft({
      date: (subtask.allocated_time || '').split('T')[0],
      time: subtask.allocatedTime || '09:00',
    });
    setExpandedId(subtask.id);
  };

  const saveScheduleEdit = (subtaskId) => {
    if (!scheduleDraft.date) return;
    onUpdateSubtaskSchedule(task.id, subtaskId, {
      date: scheduleDraft.date,
      time: scheduleDraft.time,
    });
    setEditingScheduleId(null);
  };

  const deadlineDateMax = task.deadline || undefined;

  const handleDelete = () => {
    const ok = window.confirm(
      `למחוק את "${task.title}"?\nכל תתי-המשימות והשיבוצים ביומן יוסרו (למשל במקרה של ביטול או פטור).`
    );
    if (ok) onDelete(task.id);
  };

  return (
    <div className="ai-carousel__slide">
      <div className="task-overview">
        <div className="task-overview__icon">
          <BookIcon />
        </div>
        <div className="task-overview__content">
          <p className="task-overview__title">{task.title}</p>
          <p className="task-overview__date">
            <CalendarIcon />
            תאריך הגשה: {deadlineLabel}
          </p>
          <p className="task-overview__meta">
            {selectedWeekCount} שבועות לעבודה · {task.hoursPerWeek} שעות/שבוע
            {workRangeLabel && ` · ${workRangeLabel}`}
            {task.courseName && ` · ${task.courseName}`}
            {task.fileName && ` · ${task.fileName}`}
          </p>
        </div>
        <button
          type="button"
          className="task-overview__delete"
          aria-label="מחק משימה"
          onClick={handleDelete}
        >
          <TrashIcon />
        </button>
      </div>

      <ol className="timeline">
        {subtasks.map((subtask) => (
          <li
            key={subtask.id}
            className={`timeline__item timeline__item--${subtask.status}`}
          >
            <span className="timeline__dot" />
            <div
              className={`timeline__card${subtask.status === 'active' ? ' timeline__card--active' : ''}`}
            >
              <button
                type="button"
                className="timeline__card-main timeline__card--btn"
                onClick={() => handleStepClick(subtask)}
              >
                <div className="timeline__row">
                  <span className="timeline__text">{subtask.subtask_title}</span>
                  <span className={`timeline__badge ${badgeClass[subtask.status] || badgeClass.pending}`}>
                    {subtask.is_done ? 'הושלם' : subtask.label}
                  </span>
                </div>
                <p className="timeline__duration">
                  📅 {formatAllocatedTime(subtask)} · ⏱ {formatDuration(subtask.durationMinutes)}
                </p>
                {(expandedId === subtask.id || subtask.status === 'active' || subtask.status === 'at_risk') && (
                  <p className="timeline__description">{subtask.description}</p>
                )}
              </button>

              {!subtask.is_done && (
                <div className="timeline__schedule-actions">
                  <button
                    type="button"
                    className="btn btn-outline btn--compact timeline__edit-date-btn"
                    onClick={(e) => openScheduleEdit(subtask, e)}
                  >
                    עריכת תאריך
                  </button>
                </div>
              )}

              {editingScheduleId === subtask.id && !subtask.is_done && (
                <div className="timeline__schedule-edit">
                  <label className="form-label" htmlFor={`subtask-date-${subtask.id}`}>
                    תאריך ושעה לביצוע
                  </label>
                  <div className="form-row">
                    <input
                      className="form-input"
                      type="date"
                      id={`subtask-date-${subtask.id}`}
                      value={scheduleDraft.date}
                      min={new Date().toISOString().split('T')[0]}
                      max={deadlineDateMax}
                      onChange={(e) =>
                        setScheduleDraft((prev) => ({ ...prev, date: e.target.value }))
                      }
                    />
                    <input
                      className="form-input"
                      type="time"
                      id={`subtask-time-${subtask.id}`}
                      value={scheduleDraft.time}
                      onChange={(e) =>
                        setScheduleDraft((prev) => ({ ...prev, time: e.target.value }))
                      }
                    />
                  </div>
                  <div className="timeline__schedule-edit-btns">
                    <button
                      type="button"
                      className="btn btn-dark btn--compact"
                      onClick={() => saveScheduleEdit(subtask.id)}
                    >
                      שמור תאריך
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn--compact"
                      onClick={() => setEditingScheduleId(null)}
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              )}

              {expandedId === subtask.id && (
                <div className="timeline__actions">
                  {!subtask.is_done && (
                    <>
                      <button
                        type="button"
                        className="timeline__btn-done"
                        onClick={() => onStepDone(task.id, subtask.id)}
                      >
                        הושלם
                      </button>
                      <button
                        type="button"
                        className="timeline__btn-fail"
                        onClick={() => onStepNotDone(task.id, subtask.id)}
                      >
                        לא הושלם
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="timeline__btn-delete"
                    onClick={() => {
                      if (window.confirm('למחוק את תת-המשימה?')) {
                        onDeleteSubtask(task.id, subtask.id);
                      }
                    }}
                  >
                    מחק תת-משימה
                  </button>
                </div>
              )}
              {(subtask.status === 'active' || subtask.status === 'at_risk') &&
                expandedId !== subtask.id && (
                <div className="timeline__actions">
                  <button
                    type="button"
                    className="timeline__btn-done"
                    onClick={() => onStepDone(task.id, subtask.id)}
                  >
                    הושלם
                  </button>
                  <button
                    type="button"
                    className="timeline__btn-fail"
                    onClick={() => onStepNotDone(task.id, subtask.id)}
                  >
                    לא הושלם
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>

      <button
        type="button"
        className="btn btn-dark"
        onClick={() => onApprove(task.id)}
        disabled={task.approved}
      >
        <CalendarPlusIcon />
        {task.approved ? 'שובץ ביומן ✓' : 'אשר ושבץ ביומן'}
      </button>
    </div>
  );
}

function TaskManagerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    aiTasks,
    activeTaskIndex,
    setActiveTaskIndex,
    markStepDone,
    markStepNotDone,
    approveAiTaskSchedule,
    showNewTaskModal,
    setShowNewTaskModal,
    createAiTask,
    deleteAiTask,
    deleteSubtask,
    updateSubtaskSchedule,
    showToast,
    userCourses,
  } = useApp();

  const gradeCourseNames = useMemo(() => getGradeCourseNames(userCourses), [userCourses]);

  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [taskFileName, setTaskFileName] = useState(null);
  const [fileError, setFileError] = useState('');
  const [fromDocument, setFromDocument] = useState(false);
  const [parsedPreview, setParsedPreview] = useState([]);
  const [splitBuildMode, setSplitBuildMode] = useState(SPLIT_BUILD_MODES.manual);
  const [aiStrategy, setAiStrategy] = useState(PARSE_STRATEGIES.parts);
  const [aiParsed, setAiParsed] = useState(false);
  const [selectedWeekIndices, setSelectedWeekIndices] = useState([]);
  const [tipIndex, setTipIndex] = useState(0);
  const carouselRef = useRef(null);
  const touchStartX = useRef(0);
  const taskFileInputRef = useRef(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [openAiLoading, setOpenAiLoading] = useState(false);

  const weeksLeft = weeksUntilDeadline(taskForm.deadline, taskForm.deadlineTime);
  const deadlinePlannerLabel = taskForm.deadline
    ? formatDeadlineLabel(taskForm.deadline, taskForm.deadlineTime)
    : '';

  useEffect(() => {
    if (!taskForm.deadline || weeksLeft < 1) return;
    setSelectedWeekIndices((prev) => {
      if (!prev.length || prev.some((i) => i >= weeksLeft)) {
        return defaultWorkWeekIndices(weeksLeft);
      }
      return prev;
    });
  }, [taskForm.deadline, taskForm.deadlineTime, weeksLeft]);

  useEffect(() => {
    setTipIndex(Math.floor(Math.random() * AI_TIPS.length));
  }, [location.key]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) < 50) return;
    if (diff > 0 && activeTaskIndex < aiTasks.length - 1) {
      setActiveTaskIndex(activeTaskIndex + 1);
    } else if (diff < 0 && activeTaskIndex > 0) {
      setActiveTaskIndex(activeTaskIndex - 1);
    }
  };

  const handleApprove = (taskId) => {
    const ok = approveAiTaskSchedule(taskId);
    if (ok) {
      setTimeout(() => navigate('/schedule'), 1200);
    }
  };

  const resetTaskModal = () => {
    setTaskForm(emptyTaskForm);
    setTaskFileName(null);
    setFileError('');
    setFromDocument(false);
    setParsedPreview([]);
    setSplitBuildMode(SPLIT_BUILD_MODES.manual);
    setAiStrategy(PARSE_STRATEGIES.parts);
    setAiParsed(false);
    setSelectedWeekIndices([]);
  };

  const runAiParse = () => {
    if (!taskForm.description.trim()) {
      setFileError('אין טקסט לפירוק. העלי קובץ או הדביקי את נוסח המטלה.');
      return;
    }
    const { items, ok } = previewParsedTasks(taskForm.description, aiStrategy);
    if (!ok) {
      setFileError(
        'לא זוהו חלקים במסמך. נסי "לפי קבוצות לוגיות" או בני ידנית את השלבים.'
      );
      setParsedPreview([]);
      setAiParsed(false);
      return;
    }
    setParsedPreview(items);
    setAiParsed(true);
    setFileError('');
    showToast(`פורקו ${items.length} שלבים — אפשר לערוך לפני האישור`);
  };

  const runOpenAiParse = async () => {
    if (!taskForm.description.trim()) {
      setFileError('אין טקסט לפירוק. העלי קובץ או הדביקי את נוסח המטלה.');
      return;
    }
    setOpenAiLoading(true);
    setFileError('');
    try {
      const result = await parseTaskWithOpenAI(taskForm.title, taskForm.description);
      if (!result.ok) {
        setFileError(result.error || 'שגיאה בפירוק עם OpenAI');
        return;
      }
      setParsedPreview(result.items);
      setAiParsed(true);
      showToast(`🧠 OpenAI פירקה ל-${result.items.length} שלבים`);
    } catch (err) {
      setFileError(err.message || 'שגיאה ברשת');
    } finally {
      setOpenAiLoading(false);
    }
  };

  const handleSplitModeChange = (mode) => {
    setSplitBuildMode(mode);
    if (mode === SPLIT_BUILD_MODES.manual) {
      setAiParsed(false);
    }
  };

  const handleDescriptionChange = (e) => {
    const description = e.target.value;
    setTaskForm((p) => ({ ...p, description }));
    if (aiParsed) {
      setAiParsed(false);
      setParsedPreview([]);
    }
  };

  const handleTaskFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError('');
    setFileLoading(true);
    try {
      if (!isSupportedTaskFile(file)) {
        setFileError('פורמט לא נתמך. העלי Word (docx), PDF או TXT (עד 2MB)');
        return;
      }
      const text = await extractDocumentText(file);
      if (!text.trim()) {
        setFileError('לא נמצא טקסט בקובץ. נסי Word, TXT או הדביקי את הטקסט ידנית.');
        return;
      }
      const baseName = file.name.replace(/\.(pdf|docx|txt)$/i, '');
      const nextDescription = taskForm.description
        ? `${taskForm.description}\n\n${text}`
        : text;
      setTaskForm((p) => ({
        ...p,
        title: p.title || inferTaskTitle(text, baseName),
        description: nextDescription,
      }));
      setTaskFileName(file.name);
      setFromDocument(true);
      setSplitBuildMode(SPLIT_BUILD_MODES.manual);
      setParsedPreview([]);
      setAiParsed(false);
      setFileError('');
      showToast('הקובץ נקרא — בחרי פירוק ידני או לחצי "פרק עם AI"');
    } catch (err) {
      setFileError(err.message || 'שגיאה בקריאת הקובץ');
    } finally {
      setFileLoading(false);
      e.target.value = '';
    }
  };

  const updatePreviewItem = (index, field, value) => {
    setParsedPreview((items) =>
      items.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const removePreviewItem = (index) => {
    setParsedPreview((items) => items.filter((_, i) => i !== index));
  };

  const addPreviewItem = () => {
    setParsedPreview((items) => [
      ...items,
      { title: '', description: '', durationMinutes: 90 },
    ]);
  };

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;
    if (!selectedWeekIndices.length) {
      setFileError('בחרי לפחות שבוע אחד לעבודה על המטלה.');
      return;
    }

    const previewItems = parsedPreview.filter((item) => item.title?.trim());
    if (fromDocument && previewItems.length === 0) {
      setFileError(
        'הוסיפי שלבים ידנית או לחצי "פרק עם AI" לפני יצירת המשימה.'
      );
      return;
    }

    const linkedCourse = findCourseByName(userCourses, taskForm.courseName);

    const ok = createAiTask({
      title: taskForm.title,
      deadline: taskForm.deadline,
      deadlineTime: taskForm.deadlineTime,
      weeks: weeksLeft || 1,
      hoursPerWeek: taskForm.hoursPerWeek,
      description: taskForm.description,
      documentText: taskForm.description,
      fileName: taskFileName,
      parsedItems: previewItems.length ? previewItems : null,
      fromDocument,
      selectedWeekIndices,
      courseId: linkedCourse?.id ?? null,
      courseName: taskForm.courseName.trim(),
    });
    if (ok) resetTaskModal();
  };

  return (
    <div className="page page--tasks">
      <div className="tasks-page-header">
        <div className="tasks-page-header__text">
          <h1 className="page-title">מפרק המשימות</h1>
          <p className="page-subtitle">
            הבינה המלאכותית פירקה את המטלה שלך לצעדים ברי ביצוע.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn--new-task"
          onClick={() => setShowNewTaskModal(true)}
        >
          + משימה חדשה
        </button>
      </div>

      {aiTasks.length > 0 ? (
        <div className="page__carousel">
          <div
            ref={carouselRef}
            className="ai-carousel-wrap"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="ai-carousel-track"
              style={{ transform: `translateX(-${activeTaskIndex * 100}%)` }}
            >
              {aiTasks.map((task) => (
                <TaskSlide
                  key={task.id}
                  task={task}
                  onApprove={handleApprove}
                  onStepDone={markStepDone}
                  onStepNotDone={markStepNotDone}
                  onDelete={deleteAiTask}
                  onDeleteSubtask={deleteSubtask}
                  onUpdateSubtaskSchedule={updateSubtaskSchedule}
                />
              ))}
            </div>
          </div>

          {aiTasks.length > 1 && (
            <div className="ai-carousel__nav">
              <button
                type="button"
                className="ai-carousel__arrow"
                aria-label="משימה קודמת"
                disabled={activeTaskIndex === 0}
                onClick={() => setActiveTaskIndex(activeTaskIndex - 1)}
              >
                ›
              </button>
              <div className="ai-carousel__dots" aria-label="ניווט בין משימות">
                {aiTasks.map((task, i) => (
                  <button
                    key={task.id}
                    type="button"
                    className={`ai-carousel__dot${i === activeTaskIndex ? ' ai-carousel__dot--active' : ''}`}
                    aria-label={`משימה ${i + 1} מתוך ${aiTasks.length}`}
                    aria-current={i === activeTaskIndex ? 'true' : undefined}
                    onClick={() => setActiveTaskIndex(i)}
                  />
                ))}
              </div>
              <button
                type="button"
                className="ai-carousel__arrow"
                aria-label="משימה הבאה"
                disabled={activeTaskIndex === aiTasks.length - 1}
                onClick={() => setActiveTaskIndex(activeTaskIndex + 1)}
              >
                ‹
              </button>
            </div>
          )}

          {aiTasks.length === 1 && (
            <div className="ai-carousel__dots ai-carousel__dots--single" aria-hidden>
              <span className="ai-carousel__dot ai-carousel__dot--active" />
            </div>
          )}
        </div>
      ) : (
        <p className="page-subtitle page__empty">אין משימות AI — לחצי + משימה חדשה</p>
      )}

      <div className="tip-box">
        <span className="tip-box__icon">💡</span>
        <p>טיפ: {AI_TIPS[tipIndex]}</p>
      </div>

      <Modal
        open={showNewTaskModal}
        onClose={() => {
          setShowNewTaskModal(false);
          resetTaskModal();
        }}
        title="משימה חדשה לפירוק"
        size="wide"
      >
        <form className="modal-form modal-form--task" onSubmit={handleCreateTask}>
          <div className="modal-form__row modal-form__row--wide-start">
            <div className="modal-form__field">
              <label className="form-label" htmlFor="task-title">שם המשימה / העבודה</label>
              <input
                id="task-title"
                className="form-input form-input--full"
                placeholder="שם המשימה / העבודה"
                value={taskForm.title}
                onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))}
                required
              />
            </div>
            <div className="modal-form__field">
              <label className="form-label" htmlFor="task-course">קורס משויך (אופציונלי)</label>
              <CourseNameInput
                id="task-course"
                value={taskForm.courseName}
                onChange={(courseName) => setTaskForm((p) => ({ ...p, courseName }))}
                suggestions={gradeCourseNames}
                placeholder="בחרי מהרשימה או הקלידי שם קורס"
              />
              <p className="form-hint">
                אפשר לבחור קורס מהציונים או להקליד שם קורס שעדיין לא הוספת
              </p>
            </div>
          </div>
          <div className="modal-form__row">
            <div className="modal-form__field">
              <label className="form-label" htmlFor="task-deadline">תאריך יעד</label>
              <input
                id="task-deadline"
                className="form-input form-input--full"
                type="date"
                value={taskForm.deadline}
                onChange={(e) => setTaskForm((p) => ({ ...p, deadline: e.target.value }))}
                required
              />
            </div>
            <div className="modal-form__field">
              <label className="form-label" htmlFor="task-deadline-time">שעת הגשה</label>
              <input
                id="task-deadline-time"
                className="form-input form-input--full"
                type="time"
                value={taskForm.deadlineTime}
                onChange={(e) => setTaskForm((p) => ({ ...p, deadlineTime: e.target.value }))}
                required
              />
            </div>
          </div>
          {taskForm.deadline && weeksLeft > 0 && (
            <div className="modal-form__field modal-form__field--full">
              <WeekPlannerGrid
                totalWeeks={weeksLeft}
                selectedWeeks={selectedWeekIndices}
                onChange={setSelectedWeekIndices}
                deadlineLabel={deadlinePlannerLabel}
              />
            </div>
          )}
          <div className="modal-form__row modal-form__row--hours-upload">
            <div className="modal-form__field">
              <label className="form-label" htmlFor="task-hours">שעות בשבוע</label>
              <input
                id="task-hours"
                className="form-input form-input--full"
                type="number"
                min="1"
                max="30"
                value={taskForm.hoursPerWeek}
                onChange={(e) => setTaskForm((p) => ({ ...p, hoursPerWeek: e.target.value }))}
                required
              />
              <p className="form-hint">כמה שעות בשבוע תקדישי לעבודה על המשימה</p>
            </div>
            <div className="modal-form__field">
              <span className="form-label">קובץ מטלה (אופציונלי)</span>
              <div className="file-upload">
                <input
                  ref={taskFileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  className="file-upload__input"
                  onChange={handleTaskFile}
                  tabIndex={-1}
                  aria-hidden="true"
                />
                <button
                  type="button"
                  className="file-upload__label file-upload__trigger"
                  disabled={fileLoading}
                  onClick={() => taskFileInputRef.current?.click()}
                >
                  {fileLoading ? 'קורא קובץ...' : '📎 העלאת קובץ (Word, PDF או TXT, עד 2MB)'}
                </button>
                {fileError && <p className="file-upload__error">{fileError}</p>}
                {taskFileName && (
                  <p className="file-upload__ok">
                    ✓ {taskFileName}
                    {aiParsed && parsedPreview.length > 0
                      ? ` — פורקו ${parsedPreview.length} שלבים`
                      : fromDocument
                        ? ' — הקובץ נקרא, ממתין לפירוק'
                        : ''}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="modal-form__field modal-form__field--full">
            <label className="form-label" htmlFor="task-description">תיאור המשימה</label>
            <textarea
              id="task-description"
              className="form-input form-input--full form-textarea"
              placeholder="תיאור המשימה / הדביקי כאן את נוסח המטלה"
              value={taskForm.description}
              onChange={handleDescriptionChange}
              rows={fromDocument ? 6 : 3}
            />
          </div>

          {fromDocument && (
            <div className="modal-form__field modal-form__field--full split-mode">
              <p className="form-label">איך לפרק את המטלה?</p>
              <div className="split-mode__choices" role="radiogroup" aria-label="אופן פירוק המטלה">
                <label className="split-mode__option">
                  <input
                    type="radio"
                    name="split-build-mode"
                    value={SPLIT_BUILD_MODES.manual}
                    checked={splitBuildMode === SPLIT_BUILD_MODES.manual}
                    onChange={() => handleSplitModeChange(SPLIT_BUILD_MODES.manual)}
                  />
                  <span className="split-mode__label">
                    <strong>ידני</strong>
                    <small>בני שלבים בעצמך מהתמלול</small>
                  </span>
                </label>
                <label className="split-mode__option">
                  <input
                    type="radio"
                    name="split-build-mode"
                    value={SPLIT_BUILD_MODES.ai}
                    checked={splitBuildMode === SPLIT_BUILD_MODES.ai}
                    onChange={() => handleSplitModeChange(SPLIT_BUILD_MODES.ai)}
                  />
                  <span className="split-mode__label">
                    <strong>AI</strong>
                    <small>פירוק אוטומטי לפי המבנה במסמך</small>
                  </span>
                </label>
              </div>

              {splitBuildMode === SPLIT_BUILD_MODES.ai && (
                <div className="split-mode__ai">
                  <label className="form-label" htmlFor="ai-strategy">שיטת פירוק</label>
                  <select
                    id="ai-strategy"
                    className="form-input form-input--full"
                    value={aiStrategy}
                    onChange={(e) => {
                      setAiStrategy(e.target.value);
                      setAiParsed(false);
                      setParsedPreview([]);
                    }}
                  >
                    <option value={PARSE_STRATEGIES.parts}>
                      {PARSE_STRATEGY_LABELS.parts} — מומלץ
                    </option>
                    <option value={PARSE_STRATEGIES.grouped}>
                      {PARSE_STRATEGY_LABELS.grouped}
                    </option>
                  </select>
                  <p className="form-hint">
                    {aiStrategy === PARSE_STRATEGIES.parts
                      ? '3 שלבים לפי חלק ראשון (2 ש׳), שני (4 ש׳) ושלישי (2 ש׳).'
                      : 'פירוק מפורט יותר לפי קבוצות דרישות (כמו במטלות ארוכות).'}
                  </p>
                  <button
                    type="button"
                    className="btn btn-outline split-mode__ai-btn"
                    onClick={runAiParse}
                  >
                    ✨ פרק עם AI
                  </button>
                </div>
              )}

              <div className="split-mode__openai">
                <button
                  type="button"
                  className="btn btn-primary split-mode__openai-btn"
                  onClick={runOpenAiParse}
                  disabled={openAiLoading}
                >
                  {openAiLoading ? 'מפרקת...' : '🧠 פרק עם OpenAI (חכם)'}
                </button>
                <p className="form-hint">
                  שימוש ב-OpenAI GPT לפירוק חכם של המטלה לשלבים מותאמים אישית
                </p>
              </div>
            </div>
          )}

          {(fromDocument || parsedPreview.length > 0) && (
            <div className="modal-form__field modal-form__field--full parse-preview">
              <div className="parse-preview__header">
                <p className="form-label">
                  {splitBuildMode === SPLIT_BUILD_MODES.manual
                    ? 'שלבי העבודה (בנייה ידנית)'
                    : 'שלבים שיפורקו מהמסמך'}
                </p>
                <button type="button" className="btn btn-outline btn--compact" onClick={addPreviewItem}>
                  + הוסף שלב
                </button>
              </div>
              {parsedPreview.length === 0 ? (
                <p className="form-hint">
                  {splitBuildMode === SPLIT_BUILD_MODES.manual
                    ? 'לחצי "+ הוסף שלב" ובני את רשימת המשימות מהתמלול.'
                    : 'לחצי "פרק עם AI" כדי ליצור שלבים אוטומטית, או עברי לפירוק ידני.'}
                </p>
              ) : (
                <ol className="parse-preview__list">
                  {parsedPreview.map((item, i) => (
                    <li key={i} className="parse-preview__item parse-preview__item--rich">
                      <span className="parse-preview__num">{i + 1}.</span>
                      <div className="parse-preview__fields">
                        {item.section && (
                          <span className="parse-preview__section">{item.section}</span>
                        )}
                        {item.durationMinutes && (
                          <span className="parse-preview__duration">
                            ⏱ {formatDuration(item.durationMinutes)}
                          </span>
                        )}
                        <input
                          className="form-input parse-preview__input"
                          value={item.title}
                          onChange={(e) => updatePreviewItem(i, 'title', e.target.value)}
                          placeholder="כותרת השלב"
                          required
                        />
                        <textarea
                          className="form-input parse-preview__textarea"
                          value={item.description || ''}
                          onChange={(e) => updatePreviewItem(i, 'description', e.target.value)}
                          placeholder="פירוט השלב (מהמסמך)"
                          rows={2}
                        />
                      </div>
                      <button
                        type="button"
                        className="parse-preview__remove"
                        aria-label="הסר שלב"
                        onClick={() => removePreviewItem(i)}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {!fromDocument && !taskFileName && (
            <p className="form-hint modal-form__field--full">
              בלי קובץ — המערכת תציע חלוקה כללית. להתאמה למטלה, העלי קובץ Word/PDF עם רשימת משימות.
            </p>
          )}
          <button type="submit" className="btn btn-primary modal-form__submit">
            פרק לי את המשימה
          </button>
        </form>
      </Modal>
    </div>
  );
}

export default TaskManagerPage;
