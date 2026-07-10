import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { isSupabaseEnabled } from '../lib/supabase';
import { GoogleIcon } from '../components/Icons';

const emptyLogin = { email: '', password: '' };
const emptyRegister = { name: '', email: '', institution: '', password: '', confirm: '' };

function AuthPage() {
  const { login, loginAsDemo, loginWithGoogle, register, authError, clearAuthError } = useApp();
  const [mode, setMode] = useState('login');
  const [loginForm, setLoginForm] = useState(emptyLogin);
  const [registerForm, setRegisterForm] = useState(emptyRegister);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

  const switchMode = (next) => {
    setMode(next);
    clearAuthError();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loginLoading) return;
    setLoginLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (registerLoading) return;
    if (registerForm.password !== registerForm.confirm) {
      return;
    }
    setRegisterLoading(true);
    try {
      const registeredEmail = await register({
        name: registerForm.name,
        email: registerForm.email,
        institution: registerForm.institution,
        password: registerForm.password,
      });
      if (registeredEmail) {
        setMode('login');
        setLoginForm({ email: registeredEmail, password: '' });
        setRegisterForm(emptyRegister);
      }
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (oauthLoading) return;
    setOauthLoading(true);
    try {
      await loginWithGoogle();
    } finally {
      setOauthLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    if (demoLoading) return;
    setDemoLoading(true);
    try {
      await loginAsDemo();
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-showcase" aria-hidden="true">
        <div className="auth-showcase__glow auth-showcase__glow--a" />
        <div className="auth-showcase__glow auth-showcase__glow--b" />
        <div className="auth-showcase__content">
          <span className="auth-showcase__badge">✨ Lazy Academic Planner</span>
          <h1 className="auth-showcase__title">מנהלים את הסמסטר חכם, לא קשה</h1>
          <p className="auth-showcase__text">
            פירוק משימות גדולות לשלבים, לוח זמנים ברור, מעקב ציונים והתראות בזמן —
            הכל במקום אחד, מותאם אישית לסטודנט הישראלי.
          </p>
          <ul className="auth-showcase__features">
            <li>🧠 פירוק משימות עם AI</li>
            <li>🗓️ מערכת שעות חכמה</li>
            <li>📊 מעקב ציונים וממוצעים</li>
          </ul>
        </div>
      </div>

      <div className="auth-card-wrap">
        <div className="auth-card">
          <p className="auth-card__subtitle">ניהול לימודים חכם לסטודנטים</p>

          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tabs__btn${mode === 'login' ? ' auth-tabs__btn--active' : ''}`}
              onClick={() => switchMode('login')}
            >
              התחברות
            </button>
            <button
              type="button"
              className={`auth-tabs__btn${mode === 'register' ? ' auth-tabs__btn--active' : ''}`}
              onClick={() => switchMode('register')}
            >
              הרשמה
            </button>
          </div>

          {authError && <p className="auth-card__error">{authError}</p>}

          {mode === 'login' ? (
          <form className="auth-form" onSubmit={handleLogin}>
            <label className="form-label" htmlFor="login-email">אימייל</label>
            <input
              id="login-email"
              className="form-input form-input--full"
              type="email"
              placeholder="you@university.ac.il"
              value={loginForm.email}
              onChange={(e) => setLoginForm((p) => ({ ...p, email: e.target.value }))}
              required
              autoComplete="email"
              disabled={loginLoading}
            />
            <label className="form-label" htmlFor="login-password">סיסמה</label>
            <input
              id="login-password"
              className="form-input form-input--full"
              type="password"
              placeholder="הסיסמה שלך"
              value={loginForm.password}
              onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
              required
              autoComplete="current-password"
              disabled={loginLoading}
            />
            <button type="submit" className="btn-gradient auth-form__submit" disabled={loginLoading}>
              {loginLoading ? 'מתחברת...' : 'התחברי'}
            </button>

            <div className="auth-demo">
              <button
                type="button"
                className="auth-demo__btn"
                onClick={handleDemoLogin}
                disabled={demoLoading || loginLoading}
              >
                {demoLoading ? 'טוען דמו...' : 'כניסת דמו — נתונים לדוגמה'}
              </button>
              <p className="auth-card__hint">
                כולם רואים את אותם קורסים, משימות ומערכת שעות מוכנים מראש
              </p>
            </div>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleRegister}>
            <label className="form-label" htmlFor="reg-name">שם מלא</label>
            <input
              id="reg-name"
              className="form-input form-input--full"
              placeholder="שם פרטי ומשפחה"
              value={registerForm.name}
              onChange={(e) => setRegisterForm((p) => ({ ...p, name: e.target.value }))}
              required
              disabled={registerLoading}
            />
            <label className="form-label" htmlFor="reg-email">אימייל</label>
            <input
              id="reg-email"
              className="form-input form-input--full"
              type="email"
              placeholder="you@university.ac.il"
              value={registerForm.email}
              onChange={(e) => setRegisterForm((p) => ({ ...p, email: e.target.value }))}
              required
              autoComplete="email"
              disabled={registerLoading}
            />
            <label className="form-label" htmlFor="reg-institution">מוסד לימודים</label>
            <input
              id="reg-institution"
              className="form-input form-input--full"
              placeholder="למשל: אוניברסיטת תל אביב"
              value={registerForm.institution}
              onChange={(e) => setRegisterForm((p) => ({ ...p, institution: e.target.value }))}
              required
              disabled={registerLoading}
            />
            <label className="form-label" htmlFor="reg-password">סיסמה</label>
            <input
              id="reg-password"
              className="form-input form-input--full"
              type="password"
              placeholder="לפחות 4 תווים"
              value={registerForm.password}
              onChange={(e) => setRegisterForm((p) => ({ ...p, password: e.target.value }))}
              required
              minLength={4}
              autoComplete="new-password"
              disabled={registerLoading}
            />
            <label className="form-label" htmlFor="reg-confirm">אימות סיסמה</label>
            <input
              id="reg-confirm"
              className="form-input form-input--full"
              type="password"
              placeholder="הקלידי שוב את הסיסמה"
              value={registerForm.confirm}
              onChange={(e) => setRegisterForm((p) => ({ ...p, confirm: e.target.value }))}
              required
              minLength={4}
              autoComplete="new-password"
              disabled={registerLoading}
            />
            {registerForm.confirm &&
              registerForm.password !== registerForm.confirm && (
                <p className="auth-card__error">הסיסמאות אינן תואמות</p>
              )}
            <button
              type="submit"
              className="btn-gradient auth-form__submit"
              disabled={
                registerLoading ||
                registerForm.password !== registerForm.confirm ||
                registerForm.password.length < 4
              }
            >
              {registerLoading ? 'נרשמת...' : 'הירשמי'}
            </button>
          </form>
        )}

          <div className="auth-divider">
            <span>או שאתה יכול להתחבר עם...</span>
          </div>

          <button
            type="button"
            className="auth-google-btn"
            onClick={handleGoogleLogin}
            disabled={oauthLoading || loginLoading || !isSupabaseEnabled}
          >
            <GoogleIcon />
            {oauthLoading ? 'מעביר ל-Google...' : 'המשך עם Google'}
          </button>
          {!isSupabaseEnabled && (
            <p className="auth-card__hint">
              כדי ש-Google Login יעבוד צריך להגדיר Supabase (.env.local)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
