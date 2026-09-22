-- ============================================================
-- workout_tracker  |  funcoes (bootstrap + reset da semana)
-- ============================================================

-- ------------------------------------------------------------
-- bootstrap: cria week_state e o programa padrao na primeira vez.
-- Idempotente: se ja existe treino, nao faz nada.
-- ------------------------------------------------------------
create or replace function workout_tracker.bootstrap()
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
        "Chest Press (máquina)",
        "Supino inclinado c/ halteres",
        "Remada sentada (máquina)",
        "Pulley frente",
        "Desenvolvimento (máquina)",
        "Elevação lateral c/ halteres",
        "Tríceps corda",
        "Rosca martelo",
        "Cardio 15 min"
      ]
    },
    {
      "slug": "lower_a", "title": "Lower A", "day_label": "Quinta",
      "exercises": [
        "Leg Press",
        "Mesa flexora",
        "Cadeira extensora",
        "Stiff c/ halteres",
        "Panturrilha (máquina)",
        "Abdômen (máquina/cabo)",
        "Cardio 15 min"
      ]
    },
    {
      "slug": "upper_b", "title": "Upper B", "day_label": "Sexta",
      "exercises": [
        "Chest Press inclinado (máquina)",
        "Peck Deck",
        "Remada articulada (máquina)",
        "Pulley pegada neutra",
        "Face Pull",
        "Elevação lateral",
        "Rosca Scott (máquina)",
        "Tríceps corda",
        "Cardio 15 min"
      ]
    },
    {
      "slug": "lower_b", "title": "Lower B", "day_label": "Sábado ou Domingo",
      "exercises": [
        "Hack Squat / Leg Press",
        "Afundo c/ halteres",
        "Mesa flexora",
        "Cadeira extensora",
        "Extensão lombar",
        "Panturrilha",
        "Abdômen",
        "Cardio 20 min"
      ]
    }
  ]$seed$::jsonb;
  v_workout jsonb;
  v_wi integer;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  insert into workout_tracker.week_state (user_id)
  values (v_user)
  on conflict (user_id) do nothing;

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

    insert into workout_tracker.exercises (user_id, workout_id, name, position)
    select v_user, v_workout_id, ex.value #>> '{}', ex.ordinality - 1
    from jsonb_array_elements(v_workout -> 'exercises') with ordinality as ex(value, ordinality);
  end loop;
end;
$fn$;

-- ------------------------------------------------------------
-- reset_week: arquiva a semana atual e comeca a proxima.
-- Zera apenas os checks. load_note NAO e apagado.
-- ------------------------------------------------------------
create or replace function workout_tracker.reset_week()
returns integer
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_user uuid := auth.uid();
  v_state workout_tracker.week_state;
  v_snapshot jsonb;
  v_total integer;
  v_done integer;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select * into v_state
  from workout_tracker.week_state
  where user_id = v_user
  for update;

  if not found then
    insert into workout_tracker.week_state (user_id) values (v_user)
    returning * into v_state;
  end if;

  -- congela o estado atual
  select
    coalesce(jsonb_agg(w.payload order by w.position), '[]'::jsonb),
    count(*),
    count(*) filter (where w.all_done)
  into v_snapshot, v_total, v_done
  from (
    select
      wk.position,
      coalesce(bool_and(ex.done), false) as all_done,
      jsonb_build_object(
        'slug', wk.slug,
        'title', wk.title,
        'day_label', wk.day_label,
        'done', coalesce(bool_and(ex.done), false),
        'exercises', coalesce(
          jsonb_agg(
            jsonb_build_object('name', ex.name, 'load_note', ex.load_note, 'done', ex.done)
            order by ex.position
          ) filter (where ex.id is not null),
          '[]'::jsonb
        )
      ) as payload
    from workout_tracker.workouts wk
    left join workout_tracker.exercises ex
      on ex.workout_id = wk.id and ex.archived_at is null
    where wk.user_id = v_user and wk.archived_at is null
    group by wk.id, wk.position, wk.slug, wk.title, wk.day_label
  ) w;

  insert into workout_tracker.week_history
    (user_id, week_number, started_at, workouts_done, workouts_total, snapshot)
  values
    (v_user, v_state.week_number, v_state.started_at, v_done, v_total, v_snapshot)
  on conflict (user_id, week_number) do update
    set completed_at   = now(),
        workouts_done  = excluded.workouts_done,
        workouts_total = excluded.workouts_total,
        snapshot       = excluded.snapshot;

  -- zera os checks, preserva as cargas
  update workout_tracker.exercises
     set done = false
   where user_id = v_user and done;

  update workout_tracker.week_state
     set week_number = v_state.week_number + 1,
         started_at  = now()
   where user_id = v_user;

  return v_state.week_number + 1;
end;
$fn$;

grant execute on function workout_tracker.bootstrap()  to authenticated;
grant execute on function workout_tracker.reset_week() to authenticated;
