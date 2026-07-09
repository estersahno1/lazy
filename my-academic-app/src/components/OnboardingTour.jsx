import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { SparklesIcon, BookIcon, CalendarIcon, TrendIcon } from './Icons';

function buildSteps(firstName) {
  return [
    {
      key: 'welcome',
      icon: SparklesIcon,
      eyebrow: '✨ Lazy Academic Planner',
      title: `שלום, ${firstName}! ברוכה הבאה ל-Lazy`,
      text: 'שלוש דקות היכרות עם הכלים שיעזרו לך לנהל את הסמסטר בלי לחץ מיותר.',
    },
    {
      key: 'tasks',
      icon: BookIcon,
      eyebrow: 'שלב 1',
      title: 'מפרק המשימות',
      text: 'מעלים מטלה או קובץ, והבינה המלאכותית מפרקת אותה לצעדים קטנים עם תאריכי יעד ריאליים.',
    },
    {
      key: 'schedule',
      icon: CalendarIcon,
      eyebrow: 'שלב 2',
      title: 'מערכת שעות חכמה',
      text: 'השלבים משתבצים אוטומטית ביומן שלך, לצד השיעורים והבחינות שכבר קבועים.',
    },
    {
      key: 'grades',
      icon: TrendIcon,
      eyebrow: 'שלב 3',
      title: 'מעקב ציונים וממוצעים',
      text: 'מזינים ציון ונקודות זכות, והמערכת מחשבת ממוצע והתקדמות לתואר בזמן אמת.',
    },
    {
      key: 'cta',
      icon: SparklesIcon,
      eyebrow: 'מוכנה להתחיל?',
      title: 'בואי נוסיף את הקורס הראשון שלך',
      text: 'זה הבסיס שכל שאר הכלים באפליקציה בונים עליו — לוקח פחות מדקה.',
    },
  ];
}

function OnboardingTour() {
  const { showOnboarding, completeOnboarding, profile } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const touchStartX = useRef(0);

  if (!showOnboarding) return null;

  const firstName = profile?.name?.split(' ')[0] || 'סטודנטית';
  const steps = buildSteps(firstName);
  const lastIndex = steps.length - 1;
  const isLastStep = step === lastIndex;

  const goTo = (index) => {
    setStep(Math.min(Math.max(index, 0), lastIndex));
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) < 50) return;
    if (diff > 0) goTo(step + 1);
    else goTo(step - 1);
  };

  const handleFinish = () => {
    completeOnboarding();
  };

  const handleFinishAndAddCourse = () => {
    completeOnboarding();
    navigate('/grades');
  };

  const CurrentIcon = steps[step].icon;

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-label="הכרות עם המערכת">
      <div className="onboarding-modal">
        <div className="onboarding-panel onboarding-panel--visual" aria-hidden="true">
          <div className="onboarding-panel__glow onboarding-panel__glow--a" />
          <div className="onboarding-panel__glow onboarding-panel__glow--b" />
          <div className="onboarding-panel__icon">
            <CurrentIcon />
          </div>
          <div className="onboarding-panel__dots">
            {steps.map((s, i) => (
              <span
                key={s.key}
                className={`onboarding-panel__dot${i === step ? ' onboarding-panel__dot--active' : ''}`}
              />
            ))}
          </div>
        </div>

        <div className="onboarding-panel onboarding-panel--content">
          <div className="onboarding-dots" aria-hidden="true">
            {steps.map((s, i) => (
              <button
                key={s.key}
                type="button"
                className={`onboarding-dot${i === step ? ' onboarding-dot--active' : ''}`}
                onClick={() => goTo(i)}
                aria-label={`שלב ${i + 1} מתוך ${steps.length}`}
              />
            ))}
          </div>

          <div
            className="onboarding-carousel"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="onboarding-track"
              style={{ transform: `translateX(-${step * 100}%)` }}
            >
              {steps.map((s) => {
                const StepIcon = s.icon;
                return (
                  <div className="onboarding-slide" key={s.key}>
                    <div className="onboarding-slide__icon">
                      <StepIcon />
                    </div>
                    <span className="onboarding-eyebrow">{s.eyebrow}</span>
                    <h2 className="onboarding-title">{s.title}</h2>
                    <p className="onboarding-text">{s.text}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="onboarding-nav">
            {step > 0 && (
              <button
                type="button"
                className="onboarding-nav__back"
                onClick={() => goTo(step - 1)}
                aria-label="שלב קודם"
              >
                ‹
              </button>
            )}
            {isLastStep ? (
              <div className="onboarding-nav__actions">
                <button type="button" className="btn-gradient onboarding-nav__primary" onClick={handleFinishAndAddCourse}>
                  בואי נוסיף את הקורס הראשון
                </button>
                <button type="button" className="onboarding-skip" onClick={handleFinish}>
                  אני אסתכל לבד
                </button>
              </div>
            ) : (
              <div className="onboarding-nav__actions">
                <button type="button" className="btn-gradient onboarding-nav__primary" onClick={() => goTo(step + 1)}>
                  הבא
                </button>
                <button type="button" className="onboarding-skip" onClick={handleFinish}>
                  דלגי
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OnboardingTour;
