-- ============================================================
-- Sugestao por exercicio no campo de registro.
-- Musculacao anota "carga x reps"; cardio anota tempo.
-- ============================================================

alter table workout_tracker.exercises
  add column if not exists hint text not null default 'carga x reps';

-- "Cardio 15 min" vira nome "Cardio" + sugestao "15 min".
update workout_tracker.exercises
   set hint = regexp_replace(name, '^Cardio\s+', ''),
       name = 'Cardio'
 where name ~ '^Cardio\s+\S';

-- ------------------------------------------------------------
-- bootstrap: mesma funcao, agora semeando o hint junto.
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
