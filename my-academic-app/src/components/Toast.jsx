import { useApp } from '../context/AppContext';

function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  return <div className="toast" role="status">{toast}</div>;
}

export default Toast;
