import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import MonthCalendar from '../components/MonthCalendar';
import { ScheduleEventForm } from '../components/ProfileEditModal';
import { formatDuration } from '../utils/taskSplitter';
import { getScheduleEventsForDate } from '../utils/scheduleUtils';
import { useSectionReveal } from '../utils/useSectionReveal';

const times = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];

function SchedulePage() {
  const {
    weekDays,
    monthLabel,
    selectedDay,
    setSelectedDay,
    setWeekOffset,
    goToScheduleDate,
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
    scheduleByDay,
  } = useApp();
  const [viewMode, setViewMode] = useState('day');
  const registerReveal = useSectionReveal();

  useEffect(() => {
    syncToCurrentWeek();
  }, [syncToCurrentWeek]);

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

  const selectedDayInfo = weekDays[selectedDay];
  const selectedDate = selectedDayInfo?.date;
  const weekRangeLabel = useMemo(() => {
    if (!weekDays?.length) return '';
    const start = weekDays[0]?.date;
    const end = weekDays[weekDays.length - 1]?.date;
    if (!start || !end) return '';
    const startDate = new Date(`${start}T12:00:00`);
    const endDate = new Date(`${end}T12:00:00`);
    const sameMonth =
      startDate.getMonth() === endDate.getMonth() &&
      startDate.getFullYear() === endDate.getFullYear();

    const startLabel = startDate.toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'long',
    });
    const endLabel = endDate.toLocaleDateString('he-IL', {
      day: 'numeric',
      month: sameMonth ? undefined : 'long',
      year: startDate.getFullYear() !== endDate.getFullYear() ? 'numeric' : undefined,
    });
    return `${startLabel} – ${endLabel}`;
  }, [weekDays]);

  const weekEventsByDay = useMemo(
    () =>
      weekDays.map((day) => ({
        ...day,
        events: getScheduleEventsForDate(scheduleByDay, day.date),
      })),
    [weekDays, scheduleByDay]
  );

  const monthEvents = useMemo(() => {
    if (!selectedDate) return [];
    return getScheduleEventsForDate(scheduleByDay, selectedDate);
  }, [scheduleByDay, selectedDate]);

  return (
    <div className={`page page--schedule page--schedule--${viewMode}`}>
      <div className="page-hero-banner">
        <span className="page-hero-banner__eyebrow">🗓️ סדר יום</span>
        <h1 className="page-hero-banner__title">מערכת שעות שבועית</h1>
        <p className="page-hero-banner__subtitle month-label">{monthLabel}</p>
      </div>

      <div className="schedule-layout section-reveal" ref={registerReveal}>
        {viewMode !== 'month' && (
          <aside className="schedule-layout__calendar">
            <MonthCalendar
              weekDays={weekDays}
              selectedDay={selectedDay}
              onSelectDate={goToScheduleDate}
              scheduleByDay={scheduleByDay}
            />
          </aside>
        )}

        <div className="schedule-layout__main">
          <div className="schedule-view-switch">
            <button
              type="button"
              className={`schedule-view-switch__btn${viewMode === 'day' ? ' schedule-view-switch__btn--active' : ''}`}
              onClick={() => setViewMode('day')}
            >
              יום
            </button>
            <button
              type="button"
              className={`schedule-view-switch__btn${viewMode === 'week' ? ' schedule-view-switch__btn--active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              שבוע
            </button>
            <button
              type="button"
              className={`schedule-view-switch__btn${viewMode === 'month' ? ' schedule-view-switch__btn--active' : ''}`}
              onClick={() => setViewMode('month')}
            >
              חודש
            </button>
          </div>

          {viewMode === 'day' && (
            <>
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

              {selectedDayInfo && (
                <p className="schedule-day-label">
                  לוח זמנים — יום {selectedDayInfo.letter} ({selectedDayInfo.num})
                </p>
              )}
            </>
          )}

          {viewMode === 'day' && (
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
                      onClick={() => openEditEvent(block.id, selectedDay)}
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
          )}

          {viewMode === 'week' && (
            <div className="week-view-wrap">
              <div className="week-view-nav">
                <button
                  type="button"
                  className="week-view-nav__arrow"
                  aria-label="שבוע קודם"
                  onClick={() => setWeekOffset(-1)}
                >
                  ‹
                </button>
                <p className="week-view-nav__label">{weekRangeLabel}</p>
                <button
                  type="button"
                  className="week-view-nav__arrow"
                  aria-label="שבוע הבא"
                  onClick={() => setWeekOffset(1)}
                >
                  ›
                </button>
              </div>

              <div className="week-view-grid">
                {weekEventsByDay.map((day) => (
                  <div key={day.date} className="week-view-day">
                    <div className="week-view-day__head">
                      <strong>{day.letter}</strong>
                      <span>{day.num}</span>
                    </div>
                    {day.events.length === 0 ? (
                      <p className="week-view-day__empty">ללא אירועים</p>
                    ) : (
                      day.events.map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          className={`week-view-event week-view-event--${event.color || 'purple'}`}
                          onClick={() => openEditEvent(event.id, day.dayIndex)}
                        >
                          <span className="week-view-event__title">{event.title}</span>
                          <span className="week-view-event__meta">
                            {event.time}
                            {event.room ? ` · ${event.room}` : ''}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewMode === 'month' && (
            <div className="month-view-panel card">
              <div className="month-view-calendar">
                <MonthCalendar
                  weekDays={weekDays}
                  selectedDay={selectedDay}
                  onSelectDate={goToScheduleDate}
                  scheduleByDay={scheduleByDay}
                />
              </div>
              <p className="month-view-panel__title">
                אירועים לתאריך נבחר:{' '}
                {selectedDate
                  ? selectedDate.split('-').reverse().join('/')
                  : '—'}
              </p>
              {monthEvents.length === 0 ? (
                <p className="schedule-empty">אין אירועים לתאריך זה</p>
              ) : (
                <ul className="month-view-list">
                  {monthEvents.map((event) => (
                    <li key={event.id} className="month-view-list__item">
                      <button
                        type="button"
                        onClick={() => openEditEvent(event.id, selectedDay)}
                      >
                        <strong>{event.title}</strong>
                        <span>
                          {event.time}
                          {event.durationMinutes ? ` · ${formatDuration(event.durationMinutes)}` : ''}
                          {event.room ? ` · ${event.room}` : ''}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
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

      <Modal open={showAddEvent} onClose={closeModals} title="הוספת שיעור / משימה" size="form">
        <ScheduleEventForm key="add" onSubmit={handleAdd} submitLabel="הוסף למערכת" />
      </Modal>

      <Modal open={!!editingEventId} onClose={closeModals} title="עריכת אירוע" size="form">
        <ScheduleEventForm
          key={editingEventId || 'edit'}
          initial={editingEvent}
          onSubmit={handleUpdate}
          onDelete={handleDelete}
          submitLabel="שמור שינויים"
        />
      </Modal>
    </div>
  );
}

export default SchedulePage;
