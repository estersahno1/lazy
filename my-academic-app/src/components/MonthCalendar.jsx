import { useEffect, useMemo, useState } from 'react';
import {
  buildMonthGrid,
  CALENDAR_WEEK_HEADERS,
  todayLocalDate,
} from '../utils/scheduleUtils';

function MonthCalendar({ weekDays, selectedDay, onSelectDate, monthEventsByDate = {} }) {
  const selectedDate = weekDays[selectedDay]?.date;
  const anchor = selectedDate ? new Date(`${selectedDate}T12:00:00`) : new Date();
  const [viewYear, setViewYear] = useState(anchor.getFullYear());
  const [viewMonth, setViewMonth] = useState(anchor.getMonth());

  useEffect(() => {
    if (!selectedDate) return;
    const d = new Date(`${selectedDate}T12:00:00`);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [selectedDate]);

  const grid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const weekDateSet = useMemo(() => new Set(weekDays.map((d) => d.date)), [weekDays]);
  const today = todayLocalDate();

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <div className="month-calendar card">
      <div className="month-calendar__header">
        <button type="button" className="month-calendar__nav" aria-label="חודש קודם" onClick={goPrevMonth}>
          ›
        </button>
        <h2 className="month-calendar__title">
          {grid.monthName} {grid.year}
        </h2>
        <button type="button" className="month-calendar__nav" aria-label="חודש הבא" onClick={goNextMonth}>
          ‹
        </button>
      </div>

      <div className="month-calendar__weekdays">
        {CALENDAR_WEEK_HEADERS.map((label) => (
          <span key={label} className="month-calendar__weekday">
            {label}
          </span>
        ))}
      </div>

      <div className="month-calendar__grid">
        {grid.cells.map((cell, i) => {
          if (!cell) {
            return <span key={`empty-${i}`} className="month-calendar__cell month-calendar__cell--empty" />;
          }
          const isSelected = cell.date === selectedDate;
          const isToday = cell.date === today;
          const inWeek = weekDateSet.has(cell.date);
          const events = monthEventsByDate[cell.date] || [];
          return (
            <button
              key={cell.date}
              type="button"
              className={`month-calendar__cell${isSelected ? ' month-calendar__cell--selected' : ''}${isToday ? ' month-calendar__cell--today' : ''}${inWeek ? ' month-calendar__cell--in-week' : ''}${events.length ? ' month-calendar__cell--has-events' : ''}`}
              onClick={() => onSelectDate(cell.date)}
              aria-label={`${cell.day} ${grid.monthName}`}
              aria-pressed={isSelected}
            >
              <span className="month-calendar__day-num">{cell.day}</span>
              {events.length > 0 && (
                <span className="month-calendar__tooltip" role="tooltip">
                  {events.map((event) => (
                    <span key={event.id} className="month-calendar__tooltip-line">
                      <strong>{event.title}</strong>
                      <em>
                        {event.time}
                        {event.room ? ` · ${event.room}` : ''}
                      </em>
                    </span>
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default MonthCalendar;
