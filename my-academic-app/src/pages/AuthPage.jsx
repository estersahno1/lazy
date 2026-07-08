import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { isSupabaseEnabled } from '../lib/supabase';

const emptyLogin = { email: '', password: '' };
const emptyRegister = { name: '', email: '', institution: '', password: '', confirm: '' };

function AuthPage() {
  const { login, loginWithGoogle, register, authError, clearAuthError } = useApp();
  const [mode, setMode] = useState('login');
  const [loginForm, setLoginForm] = useState(emptyLogin);
  const [registerForm, setRegisterForm] = useState(emptyRegister);
  const [oauthLoading, setOauthLoading] = useState(false);

  const switchMode = (next) => {
    setMode(next);
    clearAuthError();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    await login(loginForm.email, loginForm.password);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (registerForm.password !== registerForm.confirm) {
      return;
    }
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

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img src="/logo.png" alt="Lazy" className="auth-card__logo" />
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

        <>
          <button
            type="button"
            className="btn btn-primary auth-form__submit"
            onClick={handleGoogleLogin}
            disabled={oauthLoading}
          >
            {oauthLoading ? 'מעביר ל-Google...' : 'המשך עם Google'}
          </button>
          <p className="auth-card__hint">
            {isSupabaseEnabled
              ? 'או התחברות עם אימייל וסיסמה'
              : 'כדי ש-Google Login יעבוד צריך להגדיר Supabase (.env.local)'}
          </p>
        </>

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
            />
            <button type="submit" className="btn btn-primary auth-form__submit">
              התחברי
            </button>
            <p className="auth-card__hint">
              חשבון דמו: dana@university.ac.il / 1234
            </p>
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
            />
            <label className="form-label" htmlFor="reg-institution">מוסד לימודים</label>
            <input
              id="reg-institution"
              className="form-input form-input--full"
              placeholder="למשל: אוניברסיטת תל אביב"
              value={registerForm.institution}
              onChange={(e) => setRegisterForm((p) => ({ ...p, institution: e.target.value }))}
              required
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
            />
            {registerForm.confirm &&
              registerForm.password !== registerForm.confirm && (
                <p className="auth-card__error">הסיסמאות אינן תואמות</p>
              )}
            <button
              type="submit"
              className="btn btn-primary auth-form__submit"
              disabled={
                registerForm.password !== registerForm.confirm ||
                registerForm.password.length < 4
              }
            >
              הירשמי
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default AuthPage;
