import { useState } from 'react';
import { useApp } from '../context/AppContext';

const emptyLogin = { email: '', password: '' };
const emptyRegister = { name: '', email: '', institution: '', password: '', confirm: '' };

function AuthPage() {
  const { login, register, authError, clearAuthError } = useApp();
  const [mode, setMode] = useState('login');
  const [loginForm, setLoginForm] = useState(emptyLogin);
  const [registerForm, setRegisterForm] = useState(emptyRegister);

  const switchMode = (next) => {
    setMode(next);
    clearAuthError();
  };

  const handleLogin = (e) => {
    e.preventDefault();
    login(loginForm.email, loginForm.password);
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (registerForm.password !== registerForm.confirm) {
      return;
    }
    const registeredEmail = register({
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

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-card__brand">Lazy</h1>
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
