import { Routes, Route } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import AppHeader from './components/AppHeader';
import BottomNav from './components/BottomNav';
import Toast from './components/Toast';
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
    </div>
  );
}

function AppContent() {
  const { isAuthenticated } = useApp();
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
