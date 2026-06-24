import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { TrashIcon, EditIcon } from '../components/Icons';
import { SEMESTER_OPTIONS, YEAR_OPTIONS, semesterVariant } from '../utils/courseUtils';
import CourseNameInput from '../components/CourseNameInput';

const emptyForm = {
  courseName: '',
  credits: '',
  grade: '',
  semester: "א'",
  year: "שנה א'",
};

const SEMESTER_GROUPS = [
  { key: "א'", label: 'סמסטר א׳', variant: 'primary' },
  { key: "ב'", label: 'סמסטר ב׳', variant: 'pink' },
  { key: 'קיץ', label: 'סמסטר קיץ', variant: 'summer' },
];

function GradesPage() {
  const {
    courses,
    addCourse,
    updateCourse,
    deleteCourse,
    deleteGradeForCourse,
    editingCourseId,
    setEditingCourse,
    degreeGpa,
    calcGpaForFilter,
    totalCredits,
    totalDegreeCredits,
    courseNameSuggestions,
  } = useApp();

  const [form, setForm] = useState(emptyForm);
  const [yearFilter, setYearFilter] = useState('all');
  const [gpaSemester, setGpaSemester] = useState("א'");
  const [gpaYear, setGpaYear] = useState("שנה א'");

  useEffect(() => {
    if (editingCourseId) {
      const course = courses.find((c) => c.id === editingCourseId);
      if (course) {
        setForm({
          courseName: course.course_name,
          credits: String(course.credits ?? course.weight ?? ''),
          grade: String(course.grade ?? course.score ?? ''),
          semester: course.semester || "א'",
          year: course.year || "שנה א'",
        });
      }
    } else {
      setForm(emptyForm);
    }
  }, [editingCourseId, courses]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      course_name: form.courseName.trim(),
      score: Number(form.grade) || 0,
      weight: Number(form.credits) || 0,
      semester: form.semester,
      year: form.year,
    };
    if (editingCourseId) {
      updateCourse(editingCourseId, payload);
    } else {
      addCourse(payload);
    }
    setForm(emptyForm);
  };

  const handleCancelEdit = () => {
    setEditingCourse(null);
    setForm(emptyForm);
  };

  const handleDeleteCourse = (course) => {
    const ok = window.confirm(
      `למחוק את "${course.course_name}"?\nהקורס, הציון והמטלות המשויכות אליו יוסרו מהמערכת.`
    );
    if (ok) deleteCourse(course.id);
  };

  const handleDeleteGrade = (course) => {
    const ok = window.confirm(`למחוק את הציון של "${course.course_name}"? הקורס יישאר ברשימה.`);
    if (ok) deleteGradeForCourse(course.id);
  };

  const filteredCourses = useMemo(() => {
    if (yearFilter === 'all') return courses;
    return courses.filter((c) => c.year === yearFilter);
  }, [courses, yearFilter]);

  const groupedCourses = useMemo(() => {
    const groups = {};
    SEMESTER_GROUPS.forEach((g) => {
      groups[g.key] = filteredCourses.filter((c) => c.semester === g.key);
    });
    return groups;
  }, [filteredCourses]);

  const filteredGpa = useMemo(
    () =>
      calcGpaForFilter({
        semester: gpaSemester,
        year: gpaYear,
      }),
    [calcGpaForFilter, gpaSemester, gpaYear]
  );

  const creditPercent = Math.min(100, Math.round((totalCredits / totalDegreeCredits) * 100));

  return (
    <div className="page page--grades">
      <div className="page__intro">
        <h1 className="page-title">מעקב ציונים וממוצעים</h1>
        <p className="page-subtitle">התקדמות הלימודים שלך תחת שליטה</p>
      </div>

      <div className="page__overview">
      <div className="stat-row">
        <div className="stat-card">
          <p className="stat-card__label">ממוצע תואר</p>
          <p className="stat-card__value stat-card__value--primary">{degreeGpa}</p>
          <div className="stat-card__bar stat-card__bar--primary" />
        </div>
        <div className="stat-card stat-card--filterable">
          <p className="stat-card__label">ממוצע לפי סינון</p>
          <p className="stat-card__value stat-card__value--secondary">{filteredGpa}</p>
          <div className="stat-card__filters">
            <select
              className="form-input form-input--compact"
              value={gpaYear}
              onChange={(e) => setGpaYear(e.target.value)}
              aria-label="סינון לפי שנה"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select
              className="form-input form-input--compact"
              value={gpaSemester}
              onChange={(e) => setGpaSemester(e.target.value)}
              aria-label="סינון לפי סמסטר"
            >
              {SEMESTER_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  סמסטר {s}
                </option>
              ))}
            </select>
          </div>
          <div className="stat-card__bar stat-card__bar--secondary" />
        </div>
      </div>

      <div className="degree-progress card">
        <div className="degree-progress__header">
          <span>התקדמות תואר</span>
          <span>
            {totalCredits} / {totalDegreeCredits} נ״ז
          </span>
        </div>
        <div className="degree-progress__track">
          <div className="degree-progress__fill" style={{ width: `${creditPercent}%` }} />
        </div>
        <p className="degree-progress__label">{creditPercent}% מהתואר הושלם</p>
      </div>
      </div>

      <div className="page__form">
      <form className="form-card form-card--grades" onSubmit={handleSubmit}>
        <div className="form-card__header">
          <span className="form-card__icon">{editingCourseId ? '✎' : '+'}</span>
          {editingCourseId ? 'עריכת קורס' : 'הוספת ציון חדש'}
        </div>
        <label className="form-label" htmlFor="course-name">
          שם הקורס
        </label>
        <CourseNameInput
          id="course-name"
          value={form.courseName}
          onChange={(courseName) => setForm((prev) => ({ ...prev, courseName }))}
          suggestions={courseNameSuggestions}
          placeholder="שם הקורס"
          required
        />
        <p className="form-hint">שמות קורסים מהמערכת יוצעו אוטומטית לשמירה על אחידות</p>
        <div className="form-row">
          <div className="form-field">
            <label className="form-label" htmlFor="course-credits">
              נקודות זכות (נ״ז)
            </label>
            <input
              id="course-credits"
              className="form-input"
              name="credits"
              placeholder="נ״ז"
              type="number"
              min="1"
              max="10"
              value={form.credits}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="course-grade">
              ציון
            </label>
            <input
              id="course-grade"
              className="form-input"
              name="grade"
              placeholder="ציון"
              type="number"
              min="0"
              max="100"
              value={form.grade}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label className="form-label" htmlFor="course-semester">
              סמסטר
            </label>
            <select
              id="course-semester"
              className="form-input"
              name="semester"
              value={form.semester}
              onChange={handleChange}
              required
            >
              {SEMESTER_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  סמסטר {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="course-year">
              שנה
            </label>
            <select
              id="course-year"
              className="form-input"
              name="year"
              value={form.year}
              onChange={handleChange}
              required
            >
              {YEAR_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" className="btn btn-primary">
          {editingCourseId ? 'שמור שינויים' : '+ הוסף ציון'}
        </button>
        {editingCourseId && (
          <button type="button" className="btn btn-outline-cancel" onClick={handleCancelEdit}>
            ביטול
          </button>
        )}
      </form>
      </div>

      <div className="page__courses">
      <div className="section-header">
        <h2>רשימת קורסים ({filteredCourses.length})</h2>
      </div>

      <div className="year-filter" role="group" aria-label="סינון לפי שנה">
        <button
          type="button"
          className={`year-filter__btn${yearFilter === 'all' ? ' year-filter__btn--active' : ''}`}
          onClick={() => setYearFilter('all')}
        >
          הכל
        </button>
        {YEAR_OPTIONS.map((year) => (
          <button
            key={year}
            type="button"
            className={`year-filter__btn${yearFilter === year ? ' year-filter__btn--active' : ''}`}
            onClick={() => setYearFilter(year)}
          >
            {year}
          </button>
        ))}
      </div>

      {filteredCourses.length === 0 ? (
        <p className="page-subtitle">אין קורסים עדיין — הוסיפי ציון ראשון למעלה</p>
      ) : (
        SEMESTER_GROUPS.map((group) => {
          const list = groupedCourses[group.key] || [];
          if (!list.length) return null;
          return (
            <section key={group.key} className={`semester-group semester-group--${group.variant}`}>
              <h3 className="semester-group__title">{group.label}</h3>
              <div className="semester-group__list">
                {list.map((course) => (
                  <div
                    key={course.id}
                    className={`course-card course-card--${semesterVariant(course.semester)}`}
                  >
                    <div>
                      <p className="course-card__title">{course.course_name}</p>
                      <p className="course-card__meta">
                        ציון: {course.score ?? course.grade} | {course.weight ?? course.credits} נ״ז
                        | {course.year} · סמסטר {course.semester}
                      </p>
                    </div>
                    <div className="course-card__actions">
                      <button
                        type="button"
                        className="app-header__icon-btn"
                        aria-label="מחק קורס"
                        onClick={() => handleDeleteCourse(course)}
                      >
                        <TrashIcon />
                      </button>
                      {(course.score != null || course.grade != null) && (
                        <button
                          type="button"
                          className="course-card__grade-delete"
                          aria-label="מחק ציון"
                          onClick={() => handleDeleteGrade(course)}
                          title="מחק ציון בלבד"
                        >
                          ציון
                        </button>
                      )}
                      <button
                        type="button"
                        className="app-header__icon-btn"
                        aria-label="ערוך"
                        onClick={() => setEditingCourse(course.id)}
                      >
                        <EditIcon />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })
      )}
      </div>
    </div>
  );
}

export default GradesPage;
