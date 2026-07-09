import { Routes, Route } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import AppHeader from './components/AppHeader';
import BottomNav from './components/BottomNav';
import Toast from './components/Toast';
import OnboardingTour from './components/OnboardingTour';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import TaskManagerPage from './pages/TaskManagerPage';
import SchedulePage from './pages/SchedulePage';
import GradesPage from './pages/GradesPage';

function AppShell() {
  return (
    <div className="app-shell">
      <AppHeader />
      <BottomNav />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/tasks" element={<TaskManagerPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/grades" element={<GradesPage />} />
        </Routes>
      </main>
      <Toast />
      <OnboardingTour />
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, authLoading } = useApp();
  if (authLoading) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <p className="auth-card__subtitle">טוען...</p>
        </div>
        <Toast />
      </div>
    );
  }
  if (!isAuthenticated) {
    return (
      <>
        <AuthPage />
        <Toast />
      </>
    );
  }
  return <AppShell />;
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
