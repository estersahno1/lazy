const stats = [
  { label: 'Tasks Completed', value: 24 },
  { label: 'Tasks Pending', value: 8 },
  { label: 'Courses Enrolled', value: 5 },
  { label: 'Average Grade', value: '87%' },
];

const recentActivity = [
  { action: 'Submitted essay', course: 'English Literature', time: '2 hours ago' },
  { action: 'Completed quiz', course: 'Calculus II', time: '5 hours ago' },
  { action: 'Added new task', course: 'Web Development', time: 'Yesterday' },
  { action: 'Reviewed notes', course: 'Data Structures', time: '2 days ago' },
];

function DashboardPage() {
  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1>Dashboard</h1>
          <p>Hello, Jane! Here&apos;s an overview of your academic progress.</p>
        </div>

        <section className="card-grid" style={{ marginBottom: '2rem' }}>
          {stats.map((stat) => (
            <div key={stat.label} className="card stat-card">
              <div className="stat-card__value">{stat.value}</div>
              <div className="stat-card__label">{stat.label}</div>
            </div>
          ))}
        </section>

        <section className="card">
          <h2 style={{ marginBottom: '1rem' }}>Recent Activity</h2>
          <ul className="task-list">
            {recentActivity.map((item, index) => (
              <li key={index} className="task-item">
                <div className="task-item__info">
                  <div className="task-item__title">{item.action}</div>
                  <div className="task-item__meta">
                    {item.course} &middot; {item.time}
                  </div>
                </div>
                <span className="badge badge-info">Activity</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

export default DashboardPage;
