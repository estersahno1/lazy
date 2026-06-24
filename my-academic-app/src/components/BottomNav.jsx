import { NavLink } from 'react-router-dom';
import { HomeIcon, SparklesIcon, CalendarIcon, ChartIcon } from './Icons';

const navItems = [
  { to: '/', label: 'בית', icon: HomeIcon, end: true },
  { to: '/tasks', label: 'מפרק משימות', icon: SparklesIcon },
  { to: '/schedule', label: 'מערכת שעות', icon: CalendarIcon },
  { to: '/grades', label: 'ציונים', icon: ChartIcon },
];

function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="ניווט ראשי">
      {navItems.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`
          }
        >
          <Icon />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default BottomNav;
