import { Link } from 'react-router-dom';

const features = [
  {
    title: 'Task Management',
    description: 'Organize assignments, deadlines, and study goals in one place.',
  },
  {
    title: 'Dashboard Overview',
    description: 'Track your progress with at-a-glance stats and insights.',
  },
  {
    title: 'Secure Access',
    description: 'Sign in to keep your academic data private and synced.',
  },
];

function LandingPage() {
  return (
    <div className="page">
      <div className="container">
        <section className="hero">
          <h1>Welcome to AcademicApp</h1>
          <p>
            Your all-in-one platform for managing academic tasks, tracking
            progress, and staying organized throughout the semester.
          </p>
          <div className="hero-actions">
            <Link to="/auth" className="btn btn-primary">
              Get Started
            </Link>
            <Link to="/dashboard" className="btn btn-outline">
              View Dashboard
            </Link>
          </div>
        </section>

        <section className="card-grid">
          {features.map((feature) => (
            <div key={feature.title} className="card">
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

export default LandingPage;
