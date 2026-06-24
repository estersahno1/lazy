import { useState } from 'react';
import { TrendIcon, ClockIcon, ArrowLeftIcon } from '../components/Icons';
import { useApp } from '../context/AppContext';
import TaskItem from '../components/TaskItem';
import FullScheduleButton from '../components/FullScheduleButton';
import Modal from '../components/Modal';
import MaterialsList from '../components/MaterialsList';
import { PRIORITY_OPTIONS } from '../utils/urgentTaskUtils';
import { getGradeCourseNames } from '../utils/courseNameUtils';

const emptyUrgentForm = {
  title: '',
  deadline: '',
  deadlineTime: '23:59',
  courseName: '',
  priority: 'medium',
  completed: false,
};

function ProgressRing({ percent }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="progress-ring">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#f0f0f0" strokeWidth="6" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="var(--color-secondary)"
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="progress-ring__label">
        <TrendIcon />
      </div>
    </div>
  );
}

function DashboardPage() {
  const {
    profile,
    urgentTasks,
    pendingTasks,
    weeklyProgress,
    nextClass,
    nextExam,
    toggleTask,
    addUrgentTask,
    updateUrgentTask,
    deleteUrgentTask,
    userCourses,
    showMaterials,
    setShowMaterials,
    openMaterials,
    activeMaterials,
  } = useApp();

  const [showUrgentModal, setShowUrgentModal] = useState(false);
  const [editingUrgentId, setEditingUrgentId] = useState(null);
  const [urgentForm, setUrgentForm] = useState(emptyUrgentForm);

  const gradeCourseNames = getGradeCourseNames(userCourses);
  const firstName = profile?.name?.split(' ')[0] || 'סטודנטית';

  const openNewUrgent = () => {
    setEditingUrgentId(null);
    setUrgentForm(emptyUrgentForm);
    setShowUrgentModal(true);
  };

  const openEditUrgent = (task) => {
    setEditingUrgentId(task.id);
    setUrgentForm({
      title: task.title,
      deadline: task.deadline || '',
      deadlineTime: task.deadlineTime || '23:59',
      courseName: task.courseName || '',
      priority: task.priority || 'medium',
      completed: Boolean(task.completed),
    });
    setShowUrgentModal(true);
  };

  const handleUrgentSubmit = (e) => {
    e.preventDefault();
    if (!urgentForm.title.trim()) return;
    const linked = userCourses.find((c) => c.course_name === urgentForm.courseName);
    const payload = {
      ...urgentForm,
      courseId: linked?.id ?? null,
    };
    if (editingUrgentId) {
      updateUrgentTask(editingUrgentId, payload);
    } else {
      addUrgentTask(payload);
    }
    setShowUrgentModal(false);
    setUrgentForm(emptyUrgentForm);
    setEditingUrgentId(null);
  };

  const handleDeleteUrgent = (id) => {
    if (window.confirm('למחוק את המטלה מהרשימה?')) {
      deleteUrgentTask(id);
    }
  };

  return (
    <>
      <h1 className="greeting">שלום, {firstName} 👋</h1>
      <p className="greeting-sub">מוכנה ליום הלמידה הבא שלך?</p>

      <div className="home-cards-row">
        <div className="card card--purple card--compact">
          <p className="card__label">השיעור הבא</p>
          <h2 className="card__title card__title--compact">{nextClass.title}</h2>
          <p className="card__meta card__meta--compact">
            <ClockIcon />
            {nextClass.time}
          </p>
          <p className="card__location">{nextClass.location}</p>
          {nextClass.hasMaterials ? (
            <button
              type="button"
              className="btn btn-ghost-light btn--compact"
              onClick={() => openMaterials(nextClass)}
            >
              חומרים
              <ArrowLeftIcon />
            </button>
          ) : (
            <p className="card__no-materials">אין חומרים</p>
          )}
        </div>

        <div className="card card--exam card--compact">
          <p className="card__label">הבחינה הבאה</p>
          <h2 className="card__title card__title--compact">{nextExam.title}</h2>
          <p className="card__meta card__meta--compact">
            <ClockIcon />
            {nextExam.time}
          </p>
          <p className="card__location">{nextExam.location}</p>
          {nextExam.hasMaterials ? (
            <button
              type="button"
              className="btn btn-exam-light btn--compact"
              onClick={() => openMaterials(nextExam)}
            >
              חומרים
              <ArrowLeftIcon />
            </button>
          ) : (
            <p className="card__no-materials card__no-materials--exam">אין חומרים</p>
          )}
        </div>
      </div>

      <div className="card status-card">
        <ProgressRing percent={weeklyProgress} />
        <div className="status-card__content">
          <h3>סטטוס שבועי</h3>
          <p>התקדמות ביעדי הלמידה</p>
          <p className="status-card__percent">{weeklyProgress}%</p>
        </div>
      </div>

      <div className="section-header">
        <h2>⚠️ משימות דחופות להיום</h2>
        <button type="button" className="section-header__link section-header__link--btn" onClick={openNewUrgent}>
          + מטלה חדשה
        </button>
      </div>
      <p className="section-header__count section-header__count--below">{pendingTasks.length} מטלות פתוחות</p>

      <div className="card card--tasks">
        {urgentTasks.length === 0 ? (
          <p className="form-hint form-hint--center">אין מטלות — לחצי &quot;+ מטלה חדשה&quot; להוספה</p>
        ) : (
          <ul className="task-list">
            {urgentTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={toggleTask}
                onEdit={openEditUrgent}
                onDelete={handleDeleteUrgent}
              />
            ))}
          </ul>
        )}
      </div>

      <FullScheduleButton />

      <Modal
        open={showMaterials}
        onClose={() => setShowMaterials(false)}
        title="חומרי לימוד"
      >
        <MaterialsList materials={activeMaterials?.materials} title={activeMaterials?.title} />
      </Modal>

      <Modal
        open={showUrgentModal}
        onClose={() => setShowUrgentModal(false)}
        title={editingUrgentId ? 'עריכת מטלה להגשה' : 'מטלה חדשה להגשה'}
      >
        <form onSubmit={handleUrgentSubmit}>
          <label className="form-label" htmlFor="urgent-title">שם המטלה</label>
          <input
            id="urgent-title"
            className="form-input form-input--full"
            value={urgentForm.title}
            onChange={(e) => setUrgentForm((p) => ({ ...p, title: e.target.value }))}
            required
          />
          <label className="form-label" htmlFor="urgent-deadline">תאריך יעד</label>
          <input
            id="urgent-deadline"
            className="form-input form-input--full"
            type="date"
            value={urgentForm.deadline}
            onChange={(e) => setUrgentForm((p) => ({ ...p, deadline: e.target.value }))}
          />
          <label className="form-label" htmlFor="urgent-time">שעת הגשה</label>
          <input
            id="urgent-time"
            className="form-input form-input--full"
            type="time"
            value={urgentForm.deadlineTime}
            onChange={(e) => setUrgentForm((p) => ({ ...p, deadlineTime: e.target.value }))}
          />
          <label className="form-label" htmlFor="urgent-course">קורס משויך</label>
          <select
            id="urgent-course"
            className="form-input form-input--full"
            value={urgentForm.courseName}
            onChange={(e) => setUrgentForm((p) => ({ ...p, courseName: e.target.value }))}
          >
            <option value="">ללא קורס</option>
            {gradeCourseNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <label className="form-label" htmlFor="urgent-priority">עדיפות</label>
          <select
            id="urgent-priority"
            className="form-input form-input--full"
            value={urgentForm.priority}
            onChange={(e) => setUrgentForm((p) => ({ ...p, priority: e.target.value }))}
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {editingUrgentId && (
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={urgentForm.completed}
                onChange={(e) => setUrgentForm((p) => ({ ...p, completed: e.target.checked }))}
              />
              המטלה הושלמה
            </label>
          )}
          <button type="submit" className="btn btn-primary">
            {editingUrgentId ? 'שמור שינויים' : 'הוסף מטלה'}
          </button>
        </form>
      </Modal>
    </>
  );
}

export default DashboardPage;
