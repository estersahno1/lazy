import { NavLink } from 'react-router-dom';

const footerLinks = [
  { to: '/', label: 'Home' },
  { to: '/auth', label: 'Auth' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/tasks', label: 'Tasks' },
];

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <ul className="footer-links">
          {footerLinks.map(({ to, label }) => (
            <li key={to}>
              <NavLink to={to}>{label}</NavLink>
            </li>
          ))}
        </ul>
        <p className="footer-copy">
          &copy; {year} AcademicApp. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
