-- ============================================================
-- workout_tracker  |  schema isolado dentro de dev-portfolio-db
-- ============================================================
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Depois: Settings -> API -> Exposed schemas -> adicionar "workout_tracker".

create schema if not exists workout_tracker;

grant usage on schema workout_tracker to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- Tabelas
-- ------------------------------------------------------------

-- Upper A, Lower A, Upper B, Lower B (editavel)
create table if not exists workout_tracker.workouts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  slug        text not null,
  title       text not null,
  day_label   text,
  position    integer not null default 0,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint workouts_user_slug_key unique (user_id, slug)
);

-- load_note ("50 / 3x10") vive aqui, por isso sobrevive ao reset da semana
create table if not exists workout_tracker.exercises (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  workout_id  uuid not null references workout_tracker.workouts (id) on delete cascade,
  name        text not null,
  load_note   text not null default '',
  done        boolean not null default false,
  position    integer not null default 0,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists exercises_workout_position_idx
  on workout_tracker.exercises (workout_id, position);

-- uma linha por usuario: qual semana esta rodando agora
create table if not exists workout_tracker.week_state (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  week_number integer not null default 1,
  started_at  timestamptz not null default now()
);

-- snapshot congelado de cada semana fechada
create table if not exists workout_tracker.week_history (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  week_number    integer not null,
  started_at     timestamptz not null,
  completed_at   timestamptz not null default now(),
  workouts_done  integer not null default 0,
  workouts_total integer not null default 0,
  snapshot       jsonb not null default '[]'::jsonb,
  constraint week_history_user_week_key unique (user_id, week_number)
);

create index if not exists week_history_user_idx
  on workout_tracker.week_history (user_id, week_number desc);

-- ------------------------------------------------------------
-- updated_at
-- ------------------------------------------------------------

create or replace function workout_tracker.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  new.updated_at := now();
  return new;
end;
$fn$;

drop trigger if exists workouts_touch on workout_tracker.workouts;
create trigger workouts_touch before update on workout_tracker.workouts
  for each row execute function workout_tracker.touch_updated_at();

drop trigger if exists exercises_touch on workout_tracker.exercises;
create trigger exercises_touch before update on workout_tracker.exercises
  for each row execute function workout_tracker.touch_updated_at();

-- ------------------------------------------------------------
-- RLS: cada usuario so enxerga o proprio treino
-- ------------------------------------------------------------

alter table workout_tracker.workouts      enable row level security;
alter table workout_tracker.exercises     enable row level security;
alter table workout_tracker.week_state    enable row level security;
alter table workout_tracker.week_history  enable row level security;

drop policy if exists workouts_own on workout_tracker.workouts;
create policy workouts_own on workout_tracker.workouts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists exercises_own on workout_tracker.exercises;
create policy exercises_own on workout_tracker.exercises
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists week_state_own on workout_tracker.week_state;
create policy week_state_own on workout_tracker.week_state
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists week_history_own on workout_tracker.week_history;
create policy week_history_own on workout_tracker.week_history
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update, delete
  on workout_tracker.workouts,
     workout_tracker.exercises,
     workout_tracker.week_state,
     workout_tracker.week_history
  to authenticated;

grant all on all tables in schema workout_tracker to service_role;
