import { Link } from 'react-router-dom';
import { CalendarIcon } from './Icons';

function FullScheduleButton() {
  return (
    <Link to="/schedule" className="btn btn-dark btn-link">
      <CalendarIcon />
      לצפייה בלו&quot;ז המלא
    </Link>
  );
}

export default FullScheduleButton;
