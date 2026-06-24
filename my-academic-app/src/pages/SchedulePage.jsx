import { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import { ScheduleEventForm } from '../components/ProfileEditModal';
import { formatDuration } from '../utils/taskSplitter';

const times = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];

function SchedulePage() {
  const {
    weekDays,
    monthLabel,
    selectedDay,
    setSelectedDay,
    setWeekOffset,
    currentSchedule,
    showAddEvent,
    setShowAddEvent,
    editingEvent,
    editingEventId,
    setEditingEventId,
    openEditEvent,
    addScheduleEvent,
    updateScheduleEvent,
    deleteScheduleEvent,
    syncToCurrentWeek,
  } = useApp();

  useEffect(() => {
    syncToCurrentWeek();
  }, []);

  const handleAdd = (form) => {
    addScheduleEvent(form);
  };

  const handleUpdate = (form) => {
    updateScheduleEvent(selectedDay, editingEventId, form);
  };

  const handleDelete = () => {
    if (editingEventId) {
      deleteScheduleEvent(selectedDay, editingEventId);
    }
  };

  const closeModals = () => {
    setShowAddEvent(false);
    setEditingEventId(null);
  };

  return (
    <>
      <h1 className="page-title">מערכת שעות שבועית</h1>
      <p className="page-subtitle month-label">{monthLabel}</p>

      <div className="day-selector">
        <button
          type="button"
          className="day-selector__arrow"
          aria-label="שבוע קודם"
          onClick={() => setWeekOffset(-1)}
        >
          &lt;
        </button>
        <div className="day-selector__days">
          {weekDays.map((day) => (
            <button
              key={day.date}
              type="button"
              className={`day-pill${selectedDay === day.dayIndex ? ' day-pill--active' : ''}`}
              onClick={() => setSelectedDay(day.dayIndex)}
            >
              <span className="day-pill__letter">{day.letter}</span>
              <span className="day-pill__num">{day.num}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="day-selector__arrow"
          aria-label="שבוע הבא"
          onClick={() => setWeekOffset(1)}
        >
          &gt;
        </button>
      </div>

      <div className="schedule-grid">
        <div className="schedule-grid__times">
          {times.map((time) => (
            <span key={time} className="schedule-grid__time">
              {time}
            </span>
          ))}
        </div>
        <div className="schedule-grid__blocks">
          {currentSchedule.length === 0 ? (
            <p className="schedule-empty">אין שיעורים ביום זה — לחצי + להוספה</p>
          ) : (
            currentSchedule.map((block) => (
              <button
                key={block.id}
                type="button"
                className={`schedule-block schedule-block--${block.color}${block.type === 'exam' ? ' schedule-block--dark' : ''}${block.atRisk ? ' schedule-block--at-risk' : ''}`}
                style={{ top: block.top, height: block.height }}
                onClick={() => openEditEvent(block.id)}
                title="לחיצה לעריכה"
              >
                <div>{block.title}</div>
                <div className="schedule-block__room">
                  {block.time}
                  {block.durationMinutes ? ` · ${formatDuration(block.durationMinutes)}` : ''}
                  {block.room ? ` · ${block.room}` : ''}
                </div>
                {(block.materials || []).length > 0 && (
                  <div className="schedule-block__materials">
                    📎 {block.materials.length} חומרים
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      <button
        type="button"
        className="fab"
        aria-label="הוסף שיעור"
        onClick={() => {
          setEditingEventId(null);
          setShowAddEvent(true);
        }}
      >
        +
      </button>

      <Modal open={showAddEvent} onClose={closeModals} title="הוספת שיעור / משימה">
        <ScheduleEventForm key="add" onSubmit={handleAdd} submitLabel="הוסף למערכת" />
      </Modal>

      <Modal open={!!editingEventId} onClose={closeModals} title="עריכת אירוע">
        <ScheduleEventForm
          key={editingEventId || 'edit'}
          initial={editingEvent}
          onSubmit={handleUpdate}
          onDelete={handleDelete}
          submitLabel="שמור שינויים"
        />
      </Modal>
    </>
  );
}

export default SchedulePage;
