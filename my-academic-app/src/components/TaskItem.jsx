function TaskItem({ task, onToggle, onEdit, onDelete }) {
  return (
    <li className={`task-item${task.completed ? ' task-item--done' : ''}`}>
      <div className="task-item__info">
        <p className={`task-item__title${task.completed ? ' task-item__title--done' : ''}`}>
          {task.title}
        </p>
        <p className="task-item__meta">{task.meta}</p>
      </div>
      <div className="task-item__actions">
        {onEdit && (
          <button
            type="button"
            className="task-item__action-btn"
            aria-label="ערוך מטלה"
            onClick={() => onEdit(task)}
          >
            ✎
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            className="task-item__action-btn task-item__action-btn--danger"
            aria-label="מחק מטלה"
            onClick={() => onDelete(task.id)}
          >
            ×
          </button>
        )}
        <button
          type="button"
          className={`task-item__checkbox${task.completed ? ' task-item__checkbox--checked' : ''}`}
          onClick={() => onToggle(task.id)}
          aria-checked={task.completed}
          aria-label={task.completed ? 'בטל סימון' : 'סמן כהושלם'}
        >
          {task.completed && '✓'}
        </button>
      </div>
    </li>
  );
}

export default TaskItem;
