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

  return (
    <>
      <header className="app-header">
        <div className="app-header__side">
          <button
            type="button"
            className="app-header__icon-btn"
            aria-label="התראות"
            onClick={toggleNotifications}
          >
            <BellIcon />
            {unreadCount > 0 && <span className="app-header__badge">{unreadCount}</span>}
          </button>
          {showNotifications && (
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
          )}
        </div>

        <Link
          to="/"
          className="app-header__brand"
          onClick={() => {
            setShowNotifications(false);
            setShowProfile(false);
          }}
        >
          Lazy
        </Link>

        <div className="app-header__side app-header__side--end">
          <button
            type="button"
            className="app-header__avatar"
            aria-label="פרופיל"
            onClick={toggleProfile}
          >
            <UserIcon />
          </button>
          {showProfile && (
            <div className="dropdown-panel dropdown-panel--profile">
              <p className="dropdown-panel__name">{profile?.name}</p>
              <p className="dropdown-panel__meta">{profile?.institution}</p>
              <p className="dropdown-panel__meta">{profile?.email}</p>
              <p className="dropdown-panel__meta">ממוצע: {degreeGpa}</p>
              <button type="button" className="btn btn-primary btn--compact" onClick={openProfileEdit}>
                עריכת פרופיל
              </button>
              <button type="button" className="btn btn-outline-cancel" onClick={logout}>
                התנתקות
              </button>
            </div>
          )}
        </div>
      </header>
      <ProfileEditModal />
    </>
  );
}

export default AppHeader;
