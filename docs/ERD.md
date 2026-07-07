# ERD — Lazy

תרשים ישויות-קשרים למודל הנתונים ב-Supabase. המבנה תואם ל-`supabase/schema.sql` ולישויות שבשימוש באפליקציה.

## תרשים

```mermaid
erDiagram
    auth_users ||--|| profiles : "1:1"
    profiles ||--o{ courses : "has"
    profiles ||--o{ urgent_tasks : "has"
    profiles ||--o{ ai_tasks : "has"
    profiles ||--o{ schedule_events : "has"
    profiles ||--o{ notifications : "has"
    courses ||--o| grades : "has"
    ai_tasks ||--o{ subtasks : "contains"

    profiles {
        uuid id PK
        text name
        text institution
        timestamptz created_at
    }

    courses {
        bigint id PK
        uuid user_id FK
        text course_name
        text semester
        text year
    }

    grades {
        bigint id PK
        bigint course_id FK
        numeric score
        numeric weight
    }

    urgent_tasks {
        bigint id PK
        uuid user_id FK
        text title
        date deadline
        text deadline_time
        text course_name
        text priority
        boolean completed
    }

    ai_tasks {
        bigint id PK
        uuid user_id FK
        text title
        date deadline
        text deadline_time
        text description
        numeric hours_per_week
        int weeks
        text course_name
        boolean approved
        text file_name
        int[] selected_week_indices
    }

    subtasks {
        bigint id PK
        bigint task_id FK
        text subtask_title
        text description
        text status
        boolean is_done
        timestamptz allocated_time
        int duration_minutes
        text allocated_time_str
        text schedule_event_id
    }

    schedule_events {
        text id PK
        uuid user_id FK
        int day_index
        date scheduled_date
        text title
        text room
        text time
        text type
        int duration_minutes
        jsonb materials
    }

    notifications {
        bigint id PK
        uuid user_id FK
        text type
        text message
        boolean read
        text related_id
        timestamptz created_at
    }
```

## הסבר קצר על הקשרים

| ישות | תיאור |
|------|--------|
| **profiles** | פרופיל סטודנט — מקושר 1:1 ל-`auth.users` של Supabase Auth |
| **courses** | קורסים לפי סמסטר ושנה |
| **grades** | ציון ונקודות זכות לכל קורס (1:1) |
| **urgent_tasks** | משימות דחופות בדף הבית |
| **ai_tasks** | משימות גדולות שעוברות פירוק לשלבים |
| **subtasks** | שלבי ביצוע של משימת AI, כולל שיבוץ ביומן |
| **schedule_events** | שיעורים, מבחנים ואירועים במערכת השעות |
| **notifications** | התראות שנוצרות ממשימות, מבחנים ושלבים |

## אבטחה (RLS)

כל הטבלאות מוגנות ב-Row Level Security: משתמש רואה ומשנה **רק** שורות ש-`user_id` שלהן שווה ל-`auth.uid()`.

פרטים מלאים ב-`supabase/schema.sql`.
