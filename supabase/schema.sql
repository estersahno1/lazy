-- Lazy — Supabase schema
-- הריצי ב-Supabase Dashboard → SQL Editor

-- ─── Profiles (מקושר ל-Supabase Auth) ───────────────────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  institution text not null default '',
  created_at timestamptz not null default now(),
  onboarding_completed boolean not null default false
);

-- אם כבר הרצת את הקובץ הזה בעבר (לפני שנוסף onboarding_completed), השורה
-- הבאה מוסיפה את העמודה בלי לגעת בשאר הטבלה. אפשר להריץ אותה גם אם היא
-- כבר קיימת — היא לא תעשה כלום במקרה כזה.
alter table public.profiles add column if not exists onboarding_completed boolean not null default false;

alter table public.profiles enable row level security;

create policy "profiles: select own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: insert own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id);

-- טריגר: יצירת פרופיל אוטומטית בהרשמה
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, institution)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'institution', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Courses & Grades ────────────────────────────────────────────────────────

create table if not exists public.courses (
  id bigint primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_name text not null default '',
  semester text not null default 'א''',
  year text not null default 'שנה א'''
);

create table if not exists public.grades (
  id bigint primary key,
  course_id bigint not null references public.courses (id) on delete cascade,
  score numeric(5,2) not null default 0 check (score >= 0 and score <= 100),
  weight numeric(5,2) not null default 0 check (weight >= 0),
  unique (course_id)
);

alter table public.courses enable row level security;
alter table public.grades enable row level security;

create policy "courses: all own"
  on public.courses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "grades: all via course"
  on public.grades for all
  using (
    exists (
      select 1 from public.courses c
      where c.id = grades.course_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.courses c
      where c.id = grades.course_id and c.user_id = auth.uid()
    )
  );

-- ─── Urgent tasks ────────────────────────────────────────────────────────────

create table if not exists public.urgent_tasks (
  id bigint primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default '',
  deadline date,
  deadline_time text not null default '23:59',
  course_name text not null default '',
  priority text not null default 'medium',
  completed boolean not null default false
);

alter table public.urgent_tasks enable row level security;

create policy "urgent_tasks: all own"
  on public.urgent_tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── AI tasks & subtasks ─────────────────────────────────────────────────────

create table if not exists public.ai_tasks (
  id bigint primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default '',
  deadline date,
  deadline_time text not null default '23:59',
  description text not null default '',
  hours_per_week numeric(5,2) not null default 5,
  weeks int not null default 4,
  course_name text not null default '',
  approved boolean not null default false,
  file_name text,
  selected_week_indices int[] not null default '{}'
);

create table if not exists public.subtasks (
  id bigint primary key,
  task_id bigint not null references public.ai_tasks (id) on delete cascade,
  subtask_title text not null default '',
  description text not null default '',
  status text not null default 'pending',
  is_done boolean not null default false,
  allocated_time timestamptz,
  duration_minutes int not null default 60,
  allocated_time_str text,
  schedule_event_id text
);

alter table public.ai_tasks enable row level security;
alter table public.subtasks enable row level security;

create policy "ai_tasks: all own"
  on public.ai_tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "subtasks: all via task"
  on public.subtasks for all
  using (
    exists (
      select 1 from public.ai_tasks t
      where t.id = subtasks.task_id and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.ai_tasks t
      where t.id = subtasks.task_id and t.user_id = auth.uid()
    )
  );

-- ─── Schedule events ─────────────────────────────────────────────────────────

create table if not exists public.schedule_events (
  id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  day_index int check (day_index >= 0 and day_index <= 6),
  scheduled_date date,
  title text not null default '',
  room text not null default '',
  time text not null default '09:00',
  type text not null default 'lecture',
  duration_minutes int not null default 90,
  materials jsonb not null default '[]'::jsonb
);

-- אם כבר הרצת את הקובץ הזה בעבר (לפני שנוסף יום שישי/שבת), השורות הבאות
-- מרחיבות את המגבלה מ-0-4 ל-0-6. אפשר להריץ אותן גם אם הן כבר קיימות.
alter table public.schedule_events drop constraint if exists schedule_events_day_index_check;
alter table public.schedule_events add constraint schedule_events_day_index_check check (day_index >= 0 and day_index <= 6);

alter table public.schedule_events enable row level security;

create policy "schedule_events: all own"
  on public.schedule_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Notifications ───────────────────────────────────────────────────────────

create table if not exists public.notifications (
  id bigint primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null default 'general',
  message text not null default '',
  read boolean not null default false,
  related_id text,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "notifications: all own"
  on public.notifications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

create index if not exists idx_courses_user on public.courses (user_id);
create index if not exists idx_urgent_tasks_user on public.urgent_tasks (user_id);
create index if not exists idx_ai_tasks_user on public.ai_tasks (user_id);
create index if not exists idx_subtasks_task on public.subtasks (task_id);
create index if not exists idx_schedule_events_user on public.schedule_events (user_id);
create index if not exists idx_notifications_user on public.notifications (user_id);
