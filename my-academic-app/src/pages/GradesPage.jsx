import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { TrashIcon, EditIcon } from '../components/Icons';
import { SEMESTER_OPTIONS, YEAR_OPTIONS, semesterVariant } from '../utils/courseUtils';
import CourseNameInput from '../components/CourseNameInput';
import Modal from '../components/Modal';
import { useSectionReveal } from '../utils/useSectionReveal';

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

function CourseFormFields({ idPrefix, values, onFieldChange, onCourseNameChange, courseNameSuggestions }) {
  return (
    <>
      <label className="form-label" htmlFor={`${idPrefix}-name`}>
        שם הקורס
      </label>
      <CourseNameInput
        id={`${idPrefix}-name`}
        value={values.courseName}
        onChange={onCourseNameChange}
        suggestions={courseNameSuggestions}
        placeholder="שם הקורס"
        required
      />
      <p className="form-hint">שמות קורסים מהמערכת יוצעו אוטומטית לשמירה על אחידות</p>
      <div className="form-row">
        <div className="form-field">
          <label className="form-label" htmlFor={`${idPrefix}-credits`}>
            נקודות זכות (נ״ז)
          </label>
          <input
            id={`${idPrefix}-credits`}
            className="form-input"
            name="credits"
            placeholder="נ״ז"
            type="number"
            min="1"
            max="10"
            value={values.credits}
            onChange={onFieldChange}
            required
          />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor={`${idPrefix}-grade`}>
            ציון (אופציונלי)
          </label>
          <input
            id={`${idPrefix}-grade`}
            className="form-input"
            name="grade"
            placeholder="טרם הוזן"
            type="number"
            min="0"
            max="100"
            value={values.grade}
            onChange={onFieldChange}
          />
        </div>
      </div>
      <div className="form-row">
        <div className="form-field">
          <label className="form-label" htmlFor={`${idPrefix}-semester`}>
            סמסטר
          </label>
          <select
            id={`${idPrefix}-semester`}
            className="form-input"
            name="semester"
            value={values.semester}
            onChange={onFieldChange}
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
          <label className="form-label" htmlFor={`${idPrefix}-year`}>
            שנה
          </label>
          <select
            id={`${idPrefix}-year`}
            className="form-input"
            name="year"
            value={values.year}
            onChange={onFieldChange}
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
    </>
  );
}

function GradesPage() {
  const {
    courses,
    addCourse,
    updateCourse,
    deleteCourse,
    editingCourseId,
    setEditingCourse,
    degreeGpa,
    calcGpaForFilter,
    totalCredits,
    totalDegreeCredits,
    courseNameSuggestions,
  } = useApp();

  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [yearFilter, setYearFilter] = useState('all');
  const [gpaSemester, setGpaSemester] = useState("א'");
  const [gpaYear, setGpaYear] = useState("שנה א'");

  useEffect(() => {
    if (!editingCourseId) return;
    const course = courses.find((c) => c.id === editingCourseId);
    if (!course) return;
    const rawGrade = course.grade ?? course.score;
    setEditForm({
      courseName: course.course_name,
      credits: String(course.credits ?? course.weight ?? ''),
      grade: rawGrade == null ? '' : String(rawGrade),
      semester: course.semester || "א'",
      year: course.year || "שנה א'",
    });
  }, [editingCourseId, courses]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleEditChange = (e) => {
    setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const buildPayload = (values) => ({
    course_name: values.courseName.trim(),
    score: values.grade.trim() === '' ? null : Number(values.grade),
    weight: Number(values.credits) || 0,
    semester: values.semester,
    year: values.year,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    addCourse(buildPayload(form));
    setForm(emptyForm);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    updateCourse(editingCourseId, buildPayload(editForm));
  };

  const handleCancelEdit = () => {
    setEditingCourse(null);
  };

  const handleDeleteCourse = (course) => {
    const ok = window.confirm(
      `למחוק את "${course.course_name}"?\nהקורס, הציון והמטלות המשויכות אליו יוסרו מהמערכת.`
    );
    if (ok) deleteCourse(course.id);
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
  const registerReveal = useSectionReveal();

  return (
    <div className="page page--grades">
      <div className="page-hero-banner">
        <span className="page-hero-banner__eyebrow">📊 מעקב אקדמי</span>
        <h1 className="page-hero-banner__title">מעקב ציונים וממוצעים</h1>
        <p className="page-hero-banner__subtitle">התקדמות הלימודים שלך תחת שליטה</p>
      </div>

      <div className="page__overview section-reveal" ref={registerReveal}>
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

      <div className="page__form section-reveal" ref={registerReveal}>
      <form className="form-card form-card--grades" onSubmit={handleSubmit}>
        <div className="form-card__header">
          <span className="form-card__icon">+</span>
          הוספת ציון חדש
        </div>
        <CourseFormFields
          idPrefix="course"
          values={form}
          onFieldChange={handleChange}
          onCourseNameChange={(courseName) => setForm((prev) => ({ ...prev, courseName }))}
          courseNameSuggestions={courseNameSuggestions}
        />
        <button type="submit" className="btn btn-primary">
          + הוסף ציון
        </button>
      </form>
      </div>

      <Modal
        open={Boolean(editingCourseId)}
        onClose={handleCancelEdit}
        title="עריכת קורס"
        size="form"
      >
        <form className="modal-form" onSubmit={handleEditSubmit}>
          <CourseFormFields
            idPrefix="edit-course"
            values={editForm}
            onFieldChange={handleEditChange}
            onCourseNameChange={(courseName) => setEditForm((prev) => ({ ...prev, courseName }))}
            courseNameSuggestions={courseNameSuggestions}
          />
          <button type="submit" className="btn btn-primary modal-form__submit">
            שמור שינויים
          </button>
        </form>
      </Modal>

      <div className="page__courses section-reveal" ref={registerReveal}>
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
                        ציון: {(course.score ?? course.grade) != null ? (course.score ?? course.grade) : 'טרם הוזן'} | {course.weight ?? course.credits} נ״ז
                        | {course.year} · סמסטר {course.semester}
                      </p>
                    </div>
                    <div className="course-card__actions">
                      <button
                        type="button"
                        className="course-card__icon-btn"
                        aria-label="ערוך"
                        onClick={() => setEditingCourse(course.id)}
                      >
                        <EditIcon />
                      </button>
                      <button
                        type="button"
                        className="course-card__icon-btn"
                        aria-label="מחק קורס"
                        onClick={() => handleDeleteCourse(course)}
                      >
                        <TrashIcon />
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
