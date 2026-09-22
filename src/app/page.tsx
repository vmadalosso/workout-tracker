import { redirect } from "next/navigation";

import { Board } from "@/components/board";
import { SetupError } from "@/components/setup-error";
import { createClient } from "@/lib/supabase/server";
import type { WorkoutCard } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Idempotente: cria week_state e o programa padrão só na primeira visita.
  const { error: bootstrapError } = await supabase.rpc("bootstrap");
  if (bootstrapError) return <SetupError message={bootstrapError.message} />;

  const [stateResult, workoutsResult, exercisesResult, profileResult, weightsResult] =
    await Promise.all([
    supabase.from("week_state").select("week_number").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("workouts")
      .select("id, slug, title, day_label, position")
      .is("archived_at", null)
      .order("position"),
    supabase
      .from("exercises")
      .select("id, workout_id, name, hint, load_note, done, position")
      .is("archived_at", null)
      .order("position"),
    supabase
      .from("profile")
      .select("user_id, start_weight, goal_min, goal_max, updated_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("weight_entries")
      .select("week_number, weight_kg")
      .order("week_number"),
  ]);

  const failure =
    stateResult.error ??
    workoutsResult.error ??
    exercisesResult.error ??
    profileResult.error ??
    weightsResult.error;
  if (failure) return <SetupError message={failure.message} />;

  const byWorkout = new Map<string, WorkoutCard["exercises"]>();
  for (const { workout_id, ...exercise } of exercisesResult.data ?? []) {
    const list = byWorkout.get(workout_id);
    if (list) list.push(exercise);
    else byWorkout.set(workout_id, [exercise]);
  }

  const workouts: WorkoutCard[] = (workoutsResult.data ?? []).map((workout) => ({
    ...workout,
    exercises: byWorkout.get(workout.id) ?? [],
  }));

  return (
    <Board
      userId={user.id}
      initialWeek={stateResult.data?.week_number ?? 1}
      initialWorkouts={workouts}
      profile={profileResult.data ?? null}
      initialWeights={weightsResult.data ?? []}
    />
  );
}
