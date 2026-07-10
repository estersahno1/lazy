import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { BrainIcon, CalendarIcon, CalendarPlusIcon, TrashIcon, ClockIcon, CheckIcon, NoteIcon, EditIcon } from '../components/Icons';
import Modal from '../components/Modal';
import WeekPlannerGrid from '../components/WeekPlannerGrid';
import CourseNameInput from '../components/CourseNameInput';
import { weeksUntilDeadline, formatDeadlineLabel, defaultWorkWeekIndices } from '../utils/scheduleUtils';
import { isSupportedTaskFile } from '../utils/documentTextUtils';
import { extractStructuredDocument } from '../utils/documentStructure';
import { detectTitle } from '../utils/titleDetection';
import { findCourseByName, getGradeCourseNames } from '../utils/courseNameUtils';
import { formatDuration, formatAllocatedTime, getTaskSubtasks } from '../utils/taskSplitter';
import { useSectionReveal } from '../utils/useSectionReveal';
import { parseTaskWithAI } from '../services/edgeFunctions';

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
  'הוסיפי הערות לתתי-משימות — תזכורות קצרות שעוזרות לחזור לעבודה בקלות.',
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

function TaskAccordion({
  task,
  onApprove,
  onStepDone,
  onDelete,
  onDeleteSubtask,
  onUpdateSubtaskSchedule,
  onUpdateSubtaskNotes,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [panelMode, setPanelMode] = useState(null); // 'notes' | 'schedule' | null
  const [scheduleDraft, setScheduleDraft] = useState({ date: '', time: '09:00' });
  const [notesDraft, setNotesDraft] = useState('');
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

  const toggleOpen = () => setIsOpen((prev) => !prev);

  const handleStepClick = (step) => {
    if (expandedId === step.id) {
      setExpandedId(null);
      setPanelMode(null);
      return;
    }
    setExpandedId(step.id);
    setPanelMode(null);
  };

  const openScheduleEdit = (subtask, e) => {
    e?.stopPropagation();
    const closing = expandedId === subtask.id && panelMode === 'schedule';
    setExpandedId(subtask.id);
    setPanelMode(closing ? null : 'schedule');
    setScheduleDraft({
      date: (subtask.allocated_time || '').split('T')[0],
      time: subtask.allocatedTime || '09:00',
    });
  };

  const openNotesEdit = (subtask, e) => {
    e?.stopPropagation();
    const closing = expandedId === subtask.id && panelMode === 'notes';
    setExpandedId(subtask.id);
    setPanelMode(closing ? null : 'notes');
    setNotesDraft(subtask.notes || '');
  };

  const saveScheduleEdit = (subtaskId) => {
    if (!scheduleDraft.date) return;
    onUpdateSubtaskSchedule(task.id, subtaskId, {
      date: scheduleDraft.date,
      time: scheduleDraft.time,
    });
    setPanelMode(null);
  };

  const saveNotesEdit = (subtaskId) => {
    onUpdateSubtaskNotes(task.id, subtaskId, notesDraft.trim());
    setPanelMode(null);
  };

  const deadlineDateMax = task.deadline || undefined;

  const handleDelete = () => {
    const ok = window.confirm(
      `למחוק את "${task.title}"?\nכל תתי-המשימות והשיבוצים ביומן יוסרו (למשל במקרה של ביטול או פטור).`
    );
    if (ok) onDelete(task.id);
  };

  return (
    <div className={`task-accordion${isOpen ? ' task-accordion--open' : ''}`}>
      <div className="task-overview">
        <button
          type="button"
          className="task-overview__toggle"
          aria-expanded={isOpen}
          onClick={toggleOpen}
        >
          <div className="task-overview__icon">
            <BrainIcon />
          </div>
          <div className="task-overview__content">
            <span className="task-overview__title">{task.title}</span>
            <span className="task-overview__date">
              <CalendarIcon />
              תאריך הגשה: {deadlineLabel}
            </span>
            <span className="task-overview__meta">
              {subtasks.length} שלבים · {selectedWeekCount} שבועות לעבודה · {task.hoursPerWeek} שעות/שבוע
              {workRangeLabel && ` · ${workRangeLabel}`}
              {task.courseName && ` · ${task.courseName}`}
              {task.fileName && ` · ${task.fileName}`}
            </span>
          </div>
          <span className="task-overview__chevron" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </button>
        <button
          type="button"
          className="task-overview__delete"
          aria-label="מחק משימה"
          onClick={handleDelete}
        >
          <TrashIcon />
        </button>
      </div>

      {isOpen && (
        <div className="task-accordion__body">
          <ol className="timeline">
            {subtasks.map((subtask) => {
              const isExpanded = expandedId === subtask.id;
              const showDetails =
                isExpanded || subtask.status === 'active' || subtask.status === 'at_risk';
              const notesOpen = isExpanded && panelMode === 'notes';
              const scheduleOpen = isExpanded && panelMode === 'schedule' && !subtask.is_done;
              const hasNotes = Boolean(subtask.notes?.trim());

              return (
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
                        <span className="timeline__meta-item">
                          <CalendarIcon />
                          {formatAllocatedTime(subtask)}
                        </span>
                        <span className="timeline__meta-item">
                          <ClockIcon />
                          {formatDuration(subtask.durationMinutes)}
                        </span>
                      </p>
                      {showDetails && subtask.description && (
                        <p className="timeline__description">{subtask.description}</p>
                      )}
                      {hasNotes && !notesOpen && (
                        <p className="timeline__notes-preview">
                          <NoteIcon size={14} />
                          <span>{subtask.notes}</span>
                        </p>
                      )}
                    </button>

                    {(!subtask.is_done || isExpanded || hasNotes) && (
                      <div className={`timeline__toolbar${subtask.is_done ? ' timeline__toolbar--done' : ''}`}>
                        {!subtask.is_done && (
                          <button
                            type="button"
                            className="timeline__tool timeline__tool--done"
                            onClick={() => onStepDone(task.id, subtask.id)}
                          >
                            <CheckIcon size={15} />
                            הושלם
                          </button>
                        )}
                        <button
                          type="button"
                          className={`timeline__tool${notesOpen ? ' timeline__tool--active' : ''}${hasNotes ? ' timeline__tool--has-note' : ''}`}
                          onClick={(e) => openNotesEdit(subtask, e)}
                          aria-pressed={notesOpen}
                        >
                          <NoteIcon size={15} />
                          הערות
                        </button>
                        {!subtask.is_done && (
                          <button
                            type="button"
                            className={`timeline__tool${scheduleOpen ? ' timeline__tool--active' : ''}`}
                            onClick={(e) => openScheduleEdit(subtask, e)}
                            aria-pressed={scheduleOpen}
                          >
                            <EditIcon size={15} />
                            עדכן תאריך
                          </button>
                        )}
                      </div>
                    )}

                    {notesOpen && (
                      <div className="timeline__panel">
                        <label className="form-label" htmlFor={`subtask-notes-${subtask.id}`}>
                          הערות לתת-המשימה
                        </label>
                        <textarea
                          id={`subtask-notes-${subtask.id}`}
                          className="form-input timeline__notes-input"
                          rows={3}
                          placeholder="למשל: מצאתי מאמר טוב ב־JSTOR, להמשיך מפרק 2…"
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                        />
                        <div className="timeline__panel-actions">
                          <button
                            type="button"
                            className="btn btn-dark btn--compact timeline__panel-btn"
                            onClick={() => saveNotesEdit(subtask.id)}
                          >
                            שמור הערה
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn--compact timeline__panel-btn"
                            onClick={() => setPanelMode(null)}
                          >
                            ביטול
                          </button>
                        </div>
                      </div>
                    )}

                    {scheduleOpen && (
                      <div className="timeline__panel">
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
                        <div className="timeline__panel-actions">
                          <button
                            type="button"
                            className="btn btn-dark btn--compact timeline__panel-btn"
                            onClick={() => saveScheduleEdit(subtask.id)}
                          >
                            שמור תאריך
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn--compact timeline__panel-btn"
                            onClick={() => setPanelMode(null)}
                          >
                            ביטול
                          </button>
                        </div>
                      </div>
                    )}

                    {isExpanded && (
                      <div className="timeline__footer">
                        <button
                          type="button"
                          className="timeline__delete-link"
                          onClick={() => {
                            if (window.confirm('למחוק את תת-המשימה?')) {
                              onDeleteSubtask(task.id, subtask.id);
                            }
                          }}
                        >
                          <TrashIcon />
                          מחק תת-משימה
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
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
      )}
    </div>
  );
}

function TaskManagerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    aiTasks,
    markStepDone,
    approveAiTaskSchedule,
    showNewTaskModal,
    setShowNewTaskModal,
    createAiTask,
    deleteAiTask,
    deleteSubtask,
    updateSubtaskSchedule,
    updateSubtaskNotes,
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
  const [aiParsed, setAiParsed] = useState(false);
  const [selectedWeekIndices, setSelectedWeekIndices] = useState([]);
  const [tipIndex, setTipIndex] = useState(0);
  const taskFileInputRef = useRef(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [aiServiceLoading, setAiServiceLoading] = useState(false);
  const registerReveal = useSectionReveal();

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
    setAiParsed(false);
    setSelectedWeekIndices([]);
  };

  const runAiServiceParse = async () => {
    if (!taskForm.description.trim()) {
      setFileError('אין טקסט לפירוק. העלי קובץ או הדביקי את נוסח המטלה.');
      return;
    }
    setAiServiceLoading(true);
    setFileError('');
    try {
      const result = await parseTaskWithAI(taskForm.title, taskForm.description);
      if (!result.ok) {
        setFileError(result.error || 'שגיאה בפירוק חכם');
        return;
      }
      setParsedPreview(result.items);
      setAiParsed(true);
      showToast(`🧠 פורקה המטלה ל-${result.items.length} שלבים`);
    } catch (err) {
      setFileError(err.message || 'שגיאה ברשת');
    } finally {
      setAiServiceLoading(false);
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
      const { text, lines } = await extractStructuredDocument(file);
      if (!text.trim()) {
        setFileError('לא נמצא טקסט בקובץ. נסי Word, TXT או הדביקי את הטקסט ידנית.');
        return;
      }
      const baseName = file.name.replace(/\.(pdf|docx|txt)$/i, '');
      const nextDescription = taskForm.description
        ? `${taskForm.description}\n\n${text}`
        : text;
      const { title: detectedTitle } = detectTitle(lines, text, baseName);
      setTaskForm((p) => ({
        ...p,
        title: p.title || detectedTitle,
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
      <div className="tasks-page-header page-hero-banner">
        <div className="tasks-page-header__text">
          <span className="page-hero-banner__eyebrow">🧠 פירוק חכם</span>
          <h1 className="page-hero-banner__title">מפרק המשימות</h1>
          <p className="page-hero-banner__subtitle">
            הבינה המלאכותית פירקה את המטלה שלך לצעדים ברי ביצוע.
          </p>
        </div>
        <button
          type="button"
          className="btn-on-glass btn--new-task"
          onClick={() => setShowNewTaskModal(true)}
        >
          + משימה חדשה
        </button>
      </div>

      {aiTasks.length > 0 ? (
        <div className="tasks-list section-reveal" ref={registerReveal}>
          {aiTasks.map((task) => (
            <TaskAccordion
              key={task.id}
              task={task}
              onApprove={handleApprove}
              onStepDone={markStepDone}
              onDelete={deleteAiTask}
              onDeleteSubtask={deleteSubtask}
              onUpdateSubtaskSchedule={updateSubtaskSchedule}
              onUpdateSubtaskNotes={updateSubtaskNotes}
            />
          ))}
        </div>
      ) : (
        <p className="page-subtitle page__empty">אין משימות AI — לחצי + משימה חדשה</p>
      )}

      <div className="tip-box section-reveal" ref={registerReveal}>
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
                <div className="split-mode__ai-service">
                  <button
                    type="button"
                    className="btn btn-primary split-mode__ai-service-btn"
                    onClick={runAiServiceParse}
                    disabled={aiServiceLoading}
                  >
                    {aiServiceLoading ? 'מפרקת...' : '🧠 פירוק חכם עם AI'}
                  </button>
                  <p className="form-hint">
                    שימוש במודל שפה לפירוק חכם של המטלה לשלבים מותאמים אישית
                  </p>
                </div>
              )}
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
