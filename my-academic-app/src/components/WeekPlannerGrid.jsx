import { useEffect, useMemo } from 'react';
import { defaultWorkWeekIndices } from '../utils/scheduleUtils';

function WeekPlannerGrid({ totalWeeks, selectedWeeks, onChange, deadlineLabel }) {
  const weeks = Math.max(1, Math.min(Number(totalWeeks) || 1, 16));

  const selection = useMemo(() => {
    if (!Array.isArray(selectedWeeks) || selectedWeeks.length === 0) {
      return defaultWorkWeekIndices(weeks);
    }
    return [...new Set(selectedWeeks.filter((i) => i >= 0 && i < weeks))].sort((a, b) => a - b);
  }, [selectedWeeks, weeks]);

  useEffect(() => {
    if (weeks > 0 && (!selectedWeeks?.length || selectedWeeks.some((i) => i >= weeks))) {
      onChange(defaultWorkWeekIndices(weeks));
    }
  }, [weeks, selectedWeeks, onChange]);

  const toggleWeek = (index) => {
    const set = new Set(selection);
    if (set.has(index)) {
      if (set.size === 1) return;
      set.delete(index);
    } else {
      set.add(index);
    }
    onChange([...set].sort((a, b) => a - b));
  };

  const cells = Array.from({ length: weeks }, (_, i) => i);

  return (
    <div className="week-planner">
      <div className="week-planner__header">
        <span className="form-label">באילו שבועות לעבוד על המטלה?</span>
        <span className="week-planner__count">{selection.length} / {weeks} נבחרו</span>
      </div>

      <div className="week-planner__track" role="group" aria-label="בחירת שבועות לעבודה" dir="rtl">
        {cells.map((index) => {
          const isSelected = selection.includes(index);
          const isHere = index === 0;
          const isDeadline = index === weeks - 1;
          return (
            <button
              key={index}
              type="button"
              className={`week-planner__cell${isSelected ? ' week-planner__cell--selected' : ''}${isHere ? ' week-planner__cell--here' : ''}${isDeadline ? ' week-planner__cell--deadline' : ''}`}
              aria-pressed={isSelected}
              aria-label={`שבוע ${index + 1}${isHere ? ' — אתה כאן' : ''}${isDeadline ? ' — לקראת היעד' : ''}`}
              onClick={() => toggleWeek(index)}
            >
              <span className="week-planner__cell-num">{index + 1}</span>
            </button>
          );
        })}
      </div>

      {deadlineLabel && (
        <p className="form-hint week-planner__deadline-hint">יעד: {deadlineLabel}</p>
      )}
    </div>
  );
}

export default WeekPlannerGrid;
