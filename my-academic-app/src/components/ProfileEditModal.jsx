import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Modal from './Modal';
import { readPdfFile, getMaterialName } from '../utils/scheduleUtils';
import CourseNameInput from './CourseNameInput';

const emptyForm = {
  title: '',
  room: '',
  time: '09:00',
  type: 'lecture',
  materialsText: '',
};

export function ScheduleEventForm({ initial, onSubmit, onDelete, submitLabel }) {
  const [form, setForm] = useState(emptyForm);
  const [pdfFiles, setPdfFiles] = useState([]);
  const [fileError, setFileError] = useState('');
  const { showToast, courseNameSuggestions } = useApp();

  useEffect(() => {
    if (initial) {
      const textMaterials = (initial.materials || [])
        .filter((m) => typeof m === 'string' || m.type === 'text')
        .map(getMaterialName);
      const existingPdfs = (initial.materials || []).filter((m) => m.type === 'pdf');
      setForm({
        title: initial.title || '',
        room: initial.room || '',
        time: initial.time || '09:00',
        type: initial.type || 'lecture',
        materialsText: textMaterials.join(', '),
      });
      setPdfFiles(existingPdfs);
    } else {
      setForm(emptyForm);
      setPdfFiles([]);
    }
    setFileError('');
  }, [initial]);

  const handlePdfChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError('');
    try {
      const pdf = await readPdfFile(file);
      setPdfFiles((prev) => [...prev.filter((p) => p.name !== pdf.name), pdf]);
      showToast(`הקובץ ${file.name} הועלה`);
    } catch (err) {
      setFileError(err.message);
    }
    e.target.value = '';
  };

  const removePdf = (name) => {
    setPdfFiles((prev) => prev.filter((p) => p.name !== name));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSubmit({ ...form, pdfMaterials: pdfFiles });
  };

  return (
    <form onSubmit={handleSubmit}>
      <label className="form-label" htmlFor="schedule-event-title">שם השיעור / הקורס</label>
      <CourseNameInput
        id="schedule-event-title"
        value={form.title}
        onChange={(title) => setForm((p) => ({ ...p, title }))}
        suggestions={courseNameSuggestions}
        placeholder="שם השיעור / המשימה"
        required
      />
      <p className="form-hint">אותו שם יוצע גם בעמוד הציונים — לשמירה על מזהה אחיד</p>
      <div className="form-row">
        <input
          className="form-input"
          placeholder="מיקום / חדר"
          value={form.room}
          onChange={(e) => setForm((p) => ({ ...p, room: e.target.value }))}
        />
        <input
          className="form-input"
          type="time"
          value={form.time}
          onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))}
          required
        />
      </div>
      <textarea
        className="form-input form-input--full form-textarea"
        placeholder="חומרי לימוד בטקסט (הפרידי בפסיקים)"
        value={form.materialsText}
        onChange={(e) => setForm((p) => ({ ...p, materialsText: e.target.value }))}
        rows={2}
      />
      <div className="file-upload">
        <label className="file-upload__label">
          📎 העלאת PDF (עד 2MB, ללא מצגות)
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="file-upload__input"
            onChange={handlePdfChange}
          />
        </label>
        {fileError && <p className="file-upload__error">{fileError}</p>}
        {pdfFiles.length > 0 && (
          <ul className="file-upload__list">
            {pdfFiles.map((pdf) => (
              <li key={pdf.name} className="file-upload__item">
                <span>📕 {pdf.name}</span>
                <button type="button" onClick={() => removePdf(pdf.name)} aria-label="הסר">
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="form-row">
        <button
          type="button"
          className={`type-pill${form.type === 'lecture' ? ' type-pill--active' : ''}`}
          onClick={() => setForm((p) => ({ ...p, type: 'lecture' }))}
        >
          הרצאה
        </button>
        <button
          type="button"
          className={`type-pill${form.type === 'exam' ? ' type-pill--active' : ''}`}
          onClick={() => setForm((p) => ({ ...p, type: 'exam' }))}
        >
          מטלה / בחינה
        </button>
      </div>
      <button type="submit" className="btn btn-primary" style={{ marginTop: 'var(--space-2)' }}>
        {submitLabel}
      </button>
      {onDelete && (
        <button type="button" className="btn btn-danger-outline" onClick={onDelete}>
          מחק אירוע
        </button>
      )}
    </form>
  );
}

function ProfileEditModal() {
  const { profile, showProfileEdit, setShowProfileEdit, updateStudent, deleteAccount } = useApp();
  const [form, setForm] = useState({ name: '', email: '', institution: '' });

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || '',
        email: profile.email || '',
        institution: profile.institution || '',
      });
    }
  }, [profile, showProfileEdit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    updateStudent(form);
  };

  const handleDeleteAccount = () => {
    const ok = window.confirm(
      'למחוק את החשבון לצמיתות?\nכל הנתונים (קורסים, משימות, ציונים) יימחקו ולא ניתן לשחזר.'
    );
    if (ok) deleteAccount();
  };

  return (
    <Modal open={showProfileEdit} onClose={() => setShowProfileEdit(false)} title="עריכת פרופיל">
      <form onSubmit={handleSubmit}>
        <label className="form-label" htmlFor="profile-name">שם מלא</label>
        <input
          id="profile-name"
          className="form-input form-input--full"
          placeholder="שם מלא"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          required
        />
        <label className="form-label" htmlFor="profile-email">אימייל</label>
        <input
          id="profile-email"
          className="form-input form-input--full"
          type="email"
          placeholder="אימייל"
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          required
        />
        <label className="form-label" htmlFor="profile-institution">מוסד לימודים</label>
        <input
          id="profile-institution"
          className="form-input form-input--full"
          placeholder="מוסד לימודים"
          value={form.institution}
          onChange={(e) => setForm((p) => ({ ...p, institution: e.target.value }))}
          required
        />
        <button type="submit" className="btn btn-primary">
          שמור פרופיל
        </button>
        <button type="button" className="btn btn-danger-outline" onClick={handleDeleteAccount}>
          מחק חשבון לצמיתות
        </button>
      </form>
    </Modal>
  );
}

export default ProfileEditModal;
