# lazy

פרויקט מסכם — פיתוח אתרים

**אתר חי:** _[יש להוסיף קישור ל-Vercel אחרי דיפלוימנט — ראו "דיפלוימנט (Vercel)" בהמשך]_

---

## על האפליקציה

**Lazy** היא אפליקציית ניהול לימודים לסטודנטים — מרכזת במקום אחד את מה שחשוב ביום-יום האקדמי: משימות, מערכת שעות וציונים. האפליקציה בנויה mobile-first בעברית (RTL), עם ממשק נקי וניווט תחתון בין ארבעה עמודים.

### הבעיה

סטודנטים מתמודדים עם עומס של מטלות ארוכות, דדליינים, מערכת שעות ומעקב ציונים — לרוב בכלים נפרדים (יומן, נוטס, אקסל, וואטסאפ). קשה לתכנן עבודה על פרויקטים גדולים, לשבץ זמן בפועל, ולא לאבד משימות דחופות.

### קהל היעד

סטודנטים אקדמיים (בעיקר תואר ראשון) שצריכים לנהל מטלות סמסטריאליות, לעקוב אחרי ציונים, ולתכנן את השבוע סביב מערכת שעות.

### הבידול

| Lazy | Google Calendar | Notion / Todoist | אפליקציות מכללה |
|------|-----------------|------------------|-----------------|
| פירוק משימות אקדמיות לשלבים + שיבוץ ביומן | יומן כללי, בלי לוגיקת לימודים | רשימות משימות, בלי מערכת שעות וציונים | לרוב רק מערכת שעות / ציונים, בלי תכנון מטלות |
| ממשק עברי RTL, mobile-first | לא מותאם לסטודנט ישראלי | כללי, לא אקדמי | תלוי מוסד, לא אישי |

**Lazy** משלבת: **תכנון חכם של מטלות** (פירוק לשלבים לפי דדליין ושעות עבודה), **מערכת שעות**, **ציונים וממוצע**, ו**משימות דחופות** — הכל באפליקציה אחת.

### מה אפשר לעשות

- **דף הבית** — התקדמות שבועית, השיעור והמבחן הקרובים, משימות דחופות.
- **AI Tasks** — פירוק משימות גדולות לשלבים, שיבוץ בלוח זמנים, מעקב התקדמות. הזנה ידנית או העלאת Word / PDF / TXT לחילוץ משימות מהמסמך. כולל פירוק חכם באמצעות **OpenAI API** (דרך Supabase Edge Function).
- **מערכת שעות** — לוח שבועי וחודשי, הוספה ועריכה של שיעורים, מבחנים ואירועים.
- **ציונים** — רישום קורסים, נקודות זכות וציון, חישוב ממוצע לפי סמסטר ושנה.

### איך זה עובד (טכנולוגית)

- **פרונט:** React 18 + Vite, React Router, Context API.
- **בקאנד:** Supabase (PostgreSQL + Auth + RLS).
- **אחסון:** כש-Supabase מוגדר — נתונים בטבלאות מנורמלות; אחרת fallback ל-localStorage (פיתוח מקומי).
- **פירוק משימות:** לוגיקה מקומית (heuristics + ניתוח מסמכים בעברית) **וגם** פירוק חכם באמצעות OpenAI API (דרך Supabase Edge Function — המפתח נשמר בצד השרת).
- **קבצים:** `mammoth` (Word), `pdfjs-dist` (PDF) — עיבוד בצד הלקוח בלבד.

---

## חשבון דמו

| שדה | ערך |
|-----|-----|
| אימייל | `dana@university.ac.il` |
| סיסמה | `1234` |

_(במצב localStorage בלבד — נוצר אוטומטית בהרצה ראשונה)_

---

## הרצה מקומית

```bash
cd my-academic-app
npm install
cp .env.example .env.local   # אופציונלי — לחיבור Supabase
npm run dev
```

פתחי: http://localhost:5173 (מומלץ במצב מובייל / DevTools)

### חיבור Supabase

1. צרי פרויקט ב-[supabase.com](https://supabase.com)
2. הריצי את `supabase/schema.sql` ב-SQL Editor
3. העתיקי URL ו-anon key ל-`.env.local`
4. הפעילי מחדש `npm run dev`

### הגדרת Edge Function (OpenAI)

לפירוק חכם של מטלות באמצעות OpenAI:

1. התקיני את Supabase CLI: `brew install supabase/tap/supabase`
2. צרי פרויקט מקומי: `supabase link --project-ref YOUR_PROJECT_REF`
3. הגדרי מפתח OpenAI: `supabase secrets set OPENAI_API_KEY=sk-...`
4. פרסי את ה-Edge Function: `supabase functions deploy parse-task`
5. ה-Edge Function תיקרא אוטומטית מהלקוח כשמשתמשים בלחצן "פרק עם OpenAI"

> **חשוב:** מפתח ה-OpenAI נשמר רק ב-Supabase Secrets ולא מגיע לצד הלקוח.

---

## דיפלוימנט (Vercel)

1. חברי את ה-repo ל-[Vercel](https://vercel.com)
2. **Root Directory:** `my-academic-app`
3. **Environment Variables:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
4. Deploy — Vercel מריץ `npm run build` אוטומטית

קובץ `vercel.json` מגדיר rewrite ל-SPA routing.

---

## עמודים

| עמוד | Route |
|------|-------|
| בית (Home) | `/` |
| AI Tasks | `/tasks` |
| מערכת שעות | `/schedule` |
| ציונים | `/grades` |

---

## שירותים חיצוניים

| שירות | סוג | שימוש |
|-------|------|--------|
| **Supabase** | Auth + Database (PostgreSQL) | אוטנטיקציה (אימייל + Google OAuth), אחסון נתונים, RLS, Edge Functions |
| **OpenAI** | External API | פירוק חכם של מטלות אקדמיות לשלבי עבודה (דרך Supabase Edge Function) |
| **Supabase Edge Function** | Serverless Function | הרצת קריאה מאובטחת ל-OpenAI API (מפתח ה-API נשמר בצד השרת) |
| **Vercel** | Hosting | דיפלוימנט והרצת האפליקציה |
| **Google Fonts** | External resource | גופנים Heebo + Plus Jakarta Sans |
| **mammoth** | Client library | חילוץ טקסט מקבצי Word (.docx) |
| **pdfjs-dist** | Client library | חילוץ טקסט מקבצי PDF |
| **GSAP** | Client library | אנימציות בדף הבית |

מפתחות Supabase ו-OpenAI נשמרים ב-`.env.local` / משתני סביבה ב-Vercel / Supabase Secrets — **לא** בקוד המקור.

---

## מודל נתונים (ERD)

![ERD](docs/ERD.png)

תרשים מלא: [`docs/ERD.md`](docs/ERD.md)  
סכמת SQL: [`supabase/schema.sql`](supabase/schema.sql)

---

## מבנה הפרויקט

```
lazy/
├── README.md
├── docs/ERD.md
├── supabase/schema.sql
└── my-academic-app/
    ├── DESIGN.md
    ├── vercel.json
    ├── .env.example
    └── src/
        ├── components/   # AppHeader, BottomNav, Modal…
        ├── pages/        # Dashboard, Tasks, Schedule, Grades
        ├── context/      # AppContext — state גלובלי
        ├── lib/          # Supabase client
        ├── services/     # auth + sync ל-Supabase
        └── utils/        # לוגיקת משימות, ציונים, לוח שנה
```

---

## שמירת שינויים ב-Git (GitHub)

```bash
git status
git add .
git commit -m "תיאור קצר של מה ששינית"
git push origin main
```

| פקודה | במילים פשוטות |
|-------|----------------|
| `git status` | מראה אילו קבצים שינית |
| `git add .` | מוסיפה את כל השינויים ל-staging |
| `git commit -m "..."` | שומרת snapshot עם הודעה |
| `git push origin main` | שולחת ל-GitHub |

> לפני `git push` — `git pull origin main` אם עובדים בצוות.

**GitHub:** https://github.com/estersahno1/lazy
