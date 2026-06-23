const mockTasks = [
  {
    id: 1,
    title: 'Finish React project proposal',
    course: 'Web Development',
    dueDate: '2026-06-25',
    priority: 'high',
    status: 'in-progress',
  },
  {
    id: 2,
    title: 'Read Chapter 7 – Algorithms',
    course: 'Data Structures',
    dueDate: '2026-06-26',
    priority: 'medium',
    status: 'pending',
  },
  {
    id: 3,
    title: 'Submit calculus problem set',
    course: 'Calculus II',
    dueDate: '2026-06-24',
    priority: 'high',
    status: 'pending',
  },
  {
    id: 4,
    title: 'Prepare presentation slides',
    course: 'English Literature',
    dueDate: '2026-06-28',
    priority: 'low',
    status: 'pending',
  },
  {
    id: 5,
    title: 'Review lecture notes',
    course: 'Web Development',
    dueDate: '2026-06-23',
    priority: 'medium',
    status: 'completed',
  },
];

const priorityBadge = {
  high: 'badge-danger',
  medium: 'badge-warning',
  low: 'badge-info',
};

const statusBadge = {
  completed: 'badge-success',
  'in-progress': 'badge-warning',
  pending: 'badge-info',
};

function TaskManagerPage() {
  const completedCount = mockTasks.filter((t) => t.status === 'completed').length;
  const pendingCount = mockTasks.length - completedCount;

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1>Task Manager</h1>
          <p>
            {pendingCount} pending &middot; {completedCount} completed
          </p>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Add New Task</h3>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Task title..."
              style={{
                flex: 1,
                minWidth: '200px',
                padding: '0.5rem 1rem',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--border-radius)',
              }}
            />
            <button className="btn btn-primary" type="button">
              Add Task
            </button>
          </div>
        </div>

        <ul className="task-list">
          {mockTasks.map((task) => (
            <li key={task.id} className="task-item">
              <div className="task-item__info">
                <div className="task-item__title">{task.title}</div>
                <div className="task-item__meta">
                  {task.course} &middot; Due: {task.dueDate}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className={`badge ${priorityBadge[task.priority]}`}>
                  {task.priority}
                </span>
                <span className={`badge ${statusBadge[task.status]}`}>
                  {task.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default TaskManagerPage;
