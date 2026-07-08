import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatNotificationDate } from '../utils/notificationUtils';
import { BellIcon, UserIcon } from './Icons';
import ProfileEditModal from './ProfileEditModal';

const NOTIFICATION_ICONS = {
  ai_task: '📋',
  ai_step: '✂️',
  exam: '📕',
  quiz: '📝',
  urgent: '⚡',
};

function AppHeader() {
  const {
    profile,
    notifications,
    showNotifications,
    showProfile,
    setShowNotifications,
    setShowProfile,
    setShowProfileEdit,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clearAllNotifications,
    degreeGpa,
    logout,
  } = useApp();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const toggleNotifications = () => {
    setShowProfile(false);
    setShowNotifications(!showNotifications);
  };

  const toggleProfile = () => {
    setShowNotifications(false);
    setShowProfile(!showProfile);
  };

  const openProfileEdit = () => {
    setShowProfile(false);
    setShowProfileEdit(true);
  };

  const closePanels = () => {
    setShowNotifications(false);
    setShowProfile(false);
  };

  const renderNotificationsPanel = () => (
    <div className="dropdown-panel dropdown-panel--notifications">
      <div className="dropdown-panel__header">
        <strong>התראות</strong>
        <div className="dropdown-panel__header-actions">
          <button type="button" className="dropdown-panel__action" onClick={markAllNotificationsRead}>
            סמן הכל כנקרא
          </button>
          {notifications.length > 0 && (
            <button
              type="button"
              className="dropdown-panel__action dropdown-panel__action--danger"
              onClick={clearAllNotifications}
            >
              נקה הכל
            </button>
          )}
        </div>
      </div>
      <ul className="dropdown-panel__list">
        {notifications.length === 0 ? (
          <li className="dropdown-panel__empty">אין התראות כרגע — הכל בשליטה ✓</li>
        ) : (
          notifications.map((n) => (
            <li key={n.id} className="dropdown-panel__item-row">
              <button
                type="button"
                className={`dropdown-panel__item${n.read ? '' : ' dropdown-panel__item--unread'}`}
                onClick={() => markNotificationRead(n.id)}
              >
                <span className="dropdown-panel__item-icon" aria-hidden>
                  {NOTIFICATION_ICONS[n.type] || '🔔'}
                </span>
                <span className="dropdown-panel__item-body">
                  <span className="dropdown-panel__item-text">
                    {n.message || n.text}
                  </span>
                  <span className="dropdown-panel__item-date">
                    {formatNotificationDate(n.created_at)}
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="dropdown-panel__item-delete"
                aria-label="מחק התראה"
                onClick={() => deleteNotification(n.id)}
              >
                ×
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );

  return (
    <>
      <header className="app-header">
        <div className="app-header__side app-header__side--start">
          <button
            type="button"
            className="app-header__icon-btn app-header__icon-btn--mobile"
            aria-label="התראות"
            onClick={toggleNotifications}
          >
            <BellIcon />
            {unreadCount > 0 && <span className="app-header__badge">{unreadCount}</span>}
          </button>
          <button
            type="button"
            className="app-header__menu-btn app-header__menu-btn--desktop"
            aria-label="תפריט"
            onClick={toggleProfile}
          >
            ⋯
          </button>
          {showNotifications && renderNotificationsPanel()}
        </div>

        <Link
          to="/"
          className="app-header__brand"
          onClick={closePanels}
        >
          Lazy
        </Link>

        <div className="app-header__side app-header__side--end">
          <button
            type="button"
            className="app-header__avatar app-header__avatar--mobile"
            aria-label="פרופיל"
            onClick={toggleProfile}
          >
            <UserIcon />
          </button>
          <button
            type="button"
            className="app-header__icon-btn app-header__icon-btn--desktop"
            aria-label="התראות"
            onClick={toggleNotifications}
          >
            <BellIcon />
            {unreadCount > 0 && <span className="app-header__badge">{unreadCount}</span>}
          </button>
          {showProfile && (
            <>
              <div className="app-menu-overlay app-menu-overlay--desktop" onClick={closePanels} />
              <div className="dropdown-panel dropdown-panel--profile">
                <p className="dropdown-panel__name">{profile?.name}</p>
                <p className="dropdown-panel__meta">{profile?.institution}</p>
                <p className="dropdown-panel__meta">{profile?.email}</p>
                <p className="dropdown-panel__meta">ממוצע: {degreeGpa}</p>
                <div className="dropdown-panel__separator" />
                <div className="dropdown-panel__nav">
                  <Link to="/" className="dropdown-panel__nav-link" onClick={closePanels}>בית</Link>
                  <Link to="/tasks" className="dropdown-panel__nav-link" onClick={closePanels}>מפרק משימות</Link>
                  <Link to="/schedule" className="dropdown-panel__nav-link" onClick={closePanels}>מערכת שעות</Link>
                  <Link to="/grades" className="dropdown-panel__nav-link" onClick={closePanels}>ציונים</Link>
                </div>
                <div className="dropdown-panel__separator" />
                <button type="button" className="btn btn-primary btn--compact" onClick={openProfileEdit}>
                  עריכת פרופיל
                </button>
                <button type="button" className="btn btn-outline-cancel" onClick={logout}>
                  התנתקות
                </button>
              </div>
            </>
          )}
        </div>
      </header>
      <ProfileEditModal />
    </>
  );
}

export default AppHeader;
