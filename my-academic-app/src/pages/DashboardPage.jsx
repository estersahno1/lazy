import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
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
    todaysUrgentTasks,
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
  const heroRef = useRef(null);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return 'בוקר טוב';
    if (h >= 12 && h < 17) return 'צהריים טובים';
    if (h >= 17 && h < 21) return 'ערב טוב';
    return 'לילה טוב';
  };
  const sectionsRef = useRef([]);

  const registerReveal = (el) => {
    if (!el) return;
    if (!sectionsRef.current.includes(el)) {
      sectionsRef.current.push(el);
    }
  };

  useLayoutEffect(() => {
    if (!heroRef.current) return undefined;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.home-hero__anim',
        { y: 24, opacity: 0, scale: 0.97 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.7,
          ease: 'power3.out',
          stagger: 0.08,
        }
      );
      gsap.fromTo(
        '.home-hero__badge',
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }
      );
      gsap.fromTo(
        '.home-hero__metric-card',
        { y: 20, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)', stagger: 0.06 }
      );
      gsap.fromTo(
        '.home-hero__focus-card',
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, delay: 0.5, ease: 'power2.out' }
      );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  useLayoutEffect(() => {
    const nodes = sectionsRef.current.filter(Boolean);
    if (!nodes.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');

            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -8% 0px' }
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

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
    <div className="page page--home">
      <section className="home-hero card home-hero--v2" ref={heroRef}>
        <div className="home-hero__bg-grid" aria-hidden />
        <div className="home-hero__glow home-hero__glow--a" aria-hidden />
        <div className="home-hero__glow home-hero__glow--b" aria-hidden />

        <div className="home-hero__inner">
          <div className="home-hero__content home-hero__anim">
            <span className="home-hero__badge">✨ Lazy Academic Planner</span>
            <h1 className="home-hero__title">
              <span className="home-hero__greeting">{getGreeting()}, {firstName}</span>
              <span className="home-hero__headline">מנהלים את הסמסטר חכם, לא קשה</span>
            </h1>
            <p className="home-hero__subtitle">
              פירוק משימות גדולות לשלבים, לוח זמנים ברור, מעקב ציונים והתראות בזמן
              — הכל במקום אחד, מותאם אישית לסטודנט הישראלי.
            </p>
            <div className="home-hero__actions">
              <Link to="/tasks" className="home-hero__btn home-hero__btn--primary">
                <span>התחילי ממשימות</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </Link>
              <Link to="/schedule" className="home-hero__btn home-hero__btn--secondary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span>צפי במערכת שעות</span>
              </Link>
            </div>
          </div>

          <div className="home-hero__visual home-hero__anim">
            <div className="home-hero__glass-card">
              <div className="home-hero__glass-header">
                <div className="home-hero__glass-dot home-hero__glass-dot--pulse" />
                <span className="home-hero__glass-title">Student Pulse</span>
              </div>
              <div className="home-hero__metrics">
                <div className="home-hero__metric-card home-hero__metric-card--progress">
                  <div className="home-hero__metric-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  </div>
                  <span className="home-hero__metric-value">{weeklyProgress}%</span>
                  <span className="home-hero__metric-label">התקדמות שבועית</span>
                </div>
                <div className="home-hero__metric-card home-hero__metric-card--tasks">
                  <div className="home-hero__metric-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                  </div>
                  <span className="home-hero__metric-value">{pendingTasks.length}</span>
                  <span className="home-hero__metric-label">משימות פתוחות</span>
                </div>
                <div className="home-hero__metric-card home-hero__metric-card--courses">
                  <div className="home-hero__metric-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                  </div>
                  <span className="home-hero__metric-value">{userCourses.length}</span>
                  <span className="home-hero__metric-label">קורסים פעילים</span>
                </div>
                <div className="home-hero__metric-card home-hero__metric-card--next">
                  <div className="home-hero__metric-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <span className="home-hero__metric-value">{nextClass.time}</span>
                  <span className="home-hero__metric-label">השיעור הבא</span>
                </div>
              </div>
            </div>
            <div className="home-hero__focus-card">
              <div className="home-hero__focus-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div className="home-hero__focus-body">
                <span className="home-hero__focus-label">הבא בתור</span>
                <span className="home-hero__focus-title">{nextClass.title || 'אין שיעור קרוב'}</span>
                {nextClass.time && <span className="home-hero__focus-meta">{nextClass.time}{nextClass.location ? ` · ${nextClass.location}` : ''}</span>}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="page__cards section-reveal" ref={registerReveal}>
        <div className="home-cards-row home-cards-row--hero">
          <div className="card card--purple">
            <div className="card__icon card__icon--purple">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            </div>
            <p className="card__label">השיעור הבא</p>
            <h2 className="card__title">{nextClass.title}</h2>
            <p className="card__meta">
              <ClockIcon />
              {nextClass.time}
            </p>
            <p className="card__location">{nextClass.location}</p>
            {nextClass.hasMaterials ? (
              <button
                type="button"
                className="btn btn--compact"
                onClick={() => openMaterials(nextClass)}
              >
                <ArrowLeftIcon />
                חומרים
              </button>
            ) : (
              <p className="card__no-materials">אין חומרים</p>
            )}
          </div>

          <div className="card card--exam">
            <div className="card__icon card__icon--pink">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="1"/><path d="M22 20V8a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2z"/><path d="M6 12h12"/><path d="M6 16h12"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/></svg>
            </div>
            <p className="card__label">הבחינה הבאה</p>
            <h2 className="card__title">{nextExam.title}</h2>
            <p className="card__meta">
              <ClockIcon />
              {nextExam.time}
            </p>
            <p className="card__location">{nextExam.location}</p>
            {nextExam.hasMaterials ? (
              <button
                type="button"
                className="btn btn--compact"
                onClick={() => openMaterials(nextExam)}
              >
                <ArrowLeftIcon />
                חומרים
              </button>
            ) : (
              <p className="card__no-materials">אין חומרים</p>
            )}
          </div>
        </div>
      </div>

      <div className="page__status section-reveal" ref={registerReveal}>
      <div className="card status-card">
        <div>
          <ProgressRing percent={weeklyProgress} />
        </div>
        <div className="status-card__content">
          <h3>סטטוס שבועי</h3>
          <p>התקדמות ביעדי הלמידה</p>
          <p className="status-card__percent">{weeklyProgress}%</p>
        </div>
      </div>
      </div>

      <div className="page__urgent page__urgent-panel section-reveal" ref={registerReveal}>
      <div className="section-header">
        <h2>⚠️ משימות דחופות להיום</h2>
        <button type="button" className="section-header__link section-header__link--btn" onClick={openNewUrgent}>
          + מטלה חדשה
        </button>
      </div>
      <p className="section-header__count section-header__count--below">{pendingTasks.length} מטלות פתוחות</p>

      <div className="card card--tasks">
        {todaysUrgentTasks.length === 0 ? (
          <p className="form-hint form-hint--center">אין מטלות — לחצי &quot;+ מטלה חדשה&quot; להוספה</p>
        ) : (
          <ul className="task-list">
            {todaysUrgentTasks.map((task) => (
              <li key={task.id}>
                <TaskItem
                  task={task}
                  onToggle={toggleTask}
                  onEdit={openEditUrgent}
                  onDelete={handleDeleteUrgent}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
      </div>

      <div className="page__footer section-reveal" ref={registerReveal}>
        <FullScheduleButton />
      </div>

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
        size="form"
      >
        <form className="modal-form modal-form--urgent" onSubmit={handleUrgentSubmit}>
          <div className="modal-form__row modal-form__row--wide-start">
            <div className="modal-form__field">
              <label className="form-label" htmlFor="urgent-title">שם המטלה</label>
              <input
                id="urgent-title"
                className="form-input form-input--full"
                value={urgentForm.title}
                onChange={(e) => setUrgentForm((p) => ({ ...p, title: e.target.value }))}
                required
              />
            </div>
            <div className="modal-form__field">
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
            </div>
          </div>
          <div className="modal-form__row modal-form__row--3">
            <div className="modal-form__field">
              <label className="form-label" htmlFor="urgent-deadline">תאריך יעד</label>
              <input
                id="urgent-deadline"
                className="form-input form-input--full"
                type="date"
                value={urgentForm.deadline}
                onChange={(e) => setUrgentForm((p) => ({ ...p, deadline: e.target.value }))}
              />
            </div>
            <div className="modal-form__field">
              <label className="form-label" htmlFor="urgent-time">שעת הגשה</label>
              <input
                id="urgent-time"
                className="form-input form-input--full"
                type="time"
                value={urgentForm.deadlineTime}
                onChange={(e) => setUrgentForm((p) => ({ ...p, deadlineTime: e.target.value }))}
              />
            </div>
            <div className="modal-form__field">
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
            </div>
          </div>
          {editingUrgentId && (
            <label className="form-checkbox modal-form__field--full">
              <input
                type="checkbox"
                checked={urgentForm.completed}
                onChange={(e) => setUrgentForm((p) => ({ ...p, completed: e.target.checked }))}
              />
              המטלה הושלמה
            </label>
          )}
          <button type="submit" className="btn btn-primary modal-form__submit">
            {editingUrgentId ? 'שמור שינויים' : 'הוסף מטלה'}
          </button>
        </form>
      </Modal>
    </div>
  );
}

export default DashboardPage;
