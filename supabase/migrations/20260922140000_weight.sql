-- ============================================================
-- Peso por semana + faixa de meta
-- ============================================================

create table if not exists workout_tracker.profile (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  start_weight numeric(5, 2),
  goal_min     numeric(5, 2),
  goal_max     numeric(5, 2),
  updated_at   timestamptz not null default now(),
  constraint profile_goal_order check (goal_min is null or goal_max is null or goal_min <= goal_max)
);

create table if not exists workout_tracker.weight_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  week_number integer not null,
  weight_kg   numeric(5, 2) not null check (weight_kg > 0 and weight_kg < 500),
  recorded_at timestamptz not null default now(),
  constraint weight_entries_user_week_key unique (user_id, week_number)
);

create index if not exists weight_entries_user_week_idx
  on workout_tracker.weight_entries (user_id, week_number);

drop trigger if exists profile_touch on workout_tracker.profile;
create trigger profile_touch before update on workout_tracker.profile
  for each row execute function workout_tracker.touch_updated_at();

alter table workout_tracker.profile        enable row level security;
alter table workout_tracker.weight_entries enable row level security;

drop policy if exists profile_own on workout_tracker.profile;
create policy profile_own on workout_tracker.profile
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists weight_entries_own on workout_tracker.weight_entries;
create policy weight_entries_own on workout_tracker.weight_entries
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update, delete
  on workout_tracker.profile, workout_tracker.weight_entries
  to authenticated;

grant all on workout_tracker.profile, workout_tracker.weight_entries to service_role;

-- ------------------------------------------------------------
-- bootstrap passa a semear o perfil tambem.
-- Os valores vem do artefato original: inicio 76 kg, meta 69-72.
-- ------------------------------------------------------------
create or replace function workout_tracker.seed_profile()
returns void
language plpgsql
security invoker
set search_path = ''
as $fn$
begin
  insert into workout_tracker.profile (user_id, start_weight, goal_min, goal_max)
  values (auth.uid(), 76, 69, 72)
  on conflict (user_id) do nothing;
end;
$fn$;

grant execute on function workout_tracker.seed_profile() to authenticated;

-- ------------------------------------------------------------
-- O seed do programa vira funcao propria. bootstrap() passa a ser um
-- despachante, para a proxima coisa que precisar nascer com o usuario
-- nao exigir reescrever o JSON dos exercicios de novo.
-- ------------------------------------------------------------
create or replace function workout_tracker.seed_program()
returns void
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_user uuid := auth.uid();
  v_workout_id uuid;
  v_program jsonb := $seed$[
    {
      "slug": "upper_a", "title": "Upper A", "day_label": "Terça",
      "exercises": [
        {"name": "Chest Press (máquina)"},
        {"name": "Supino inclinado c/ halteres"},
        {"name": "Remada sentada (máquina)"},
        {"name": "Pulley frente"},
        {"name": "Desenvolvimento (máquina)"},
        {"name": "Elevação lateral c/ halteres"},
        {"name": "Tríceps corda"},
        {"name": "Rosca martelo"},
        {"name": "Cardio", "hint": "15 min"}
      ]
    },
    {
      "slug": "lower_a", "title": "Lower A", "day_label": "Quinta",
      "exercises": [
        {"name": "Leg Press"},
        {"name": "Mesa flexora"},
        {"name": "Cadeira extensora"},
        {"name": "Stiff c/ halteres"},
        {"name": "Panturrilha (máquina)"},
        {"name": "Abdômen (máquina/cabo)"},
        {"name": "Cardio", "hint": "15 min"}
      ]
    },
    {
      "slug": "upper_b", "title": "Upper B", "day_label": "Sexta",
      "exercises": [
        {"name": "Chest Press inclinado (máquina)"},
        {"name": "Peck Deck"},
        {"name": "Remada articulada (máquina)"},
        {"name": "Pulley pegada neutra"},
        {"name": "Face Pull"},
        {"name": "Elevação lateral"},
        {"name": "Rosca Scott (máquina)"},
        {"name": "Tríceps corda"},
        {"name": "Cardio", "hint": "15 min"}
      ]
    },
    {
      "slug": "lower_b", "title": "Lower B", "day_label": "Sábado ou Domingo",
      "exercises": [
        {"name": "Hack Squat / Leg Press"},
        {"name": "Afundo c/ halteres"},
        {"name": "Mesa flexora"},
        {"name": "Cadeira extensora"},
        {"name": "Extensão lombar"},
        {"name": "Panturrilha"},
        {"name": "Abdômen"},
        {"name": "Cardio", "hint": "20 min"}
      ]
    }
  ]$seed$::jsonb;
  v_workout jsonb;
  v_wi integer;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if exists (select 1 from workout_tracker.workouts where user_id = v_user) then
    return;
  end if;

  for v_wi in 0 .. jsonb_array_length(v_program) - 1 loop
    v_workout := v_program -> v_wi;

    insert into workout_tracker.workouts (user_id, slug, title, day_label, position)
    values (
      v_user,
      v_workout ->> 'slug',
      v_workout ->> 'title',
      v_workout ->> 'day_label',
      v_wi
    )
    returning id into v_workout_id;

    insert into workout_tracker.exercises (user_id, workout_id, name, hint, position)
    select
      v_user,
      v_workout_id,
      ex.value ->> 'name',
      coalesce(ex.value ->> 'hint', 'carga x reps'),
      ex.ordinality - 1
    from jsonb_array_elements(v_workout -> 'exercises') with ordinality as ex(value, ordinality);
  end loop;
end;
$fn$;

create or replace function workout_tracker.bootstrap()
returns void
language plpgsql
security invoker
set search_path = ''
as $fn$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into workout_tracker.week_state (user_id)
  values (auth.uid())
  on conflict (user_id) do nothing;

  perform workout_tracker.seed_program();
  perform workout_tracker.seed_profile();
end;
$fn$;

grant execute on function workout_tracker.seed_program() to authenticated;
grant execute on function workout_tracker.bootstrap()    to authenticated;
