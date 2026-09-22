"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, LogOut, RotateCcw, Trophy, X } from "lucide-react";

import { WeightCard } from "@/components/weight-card";
import { WorkoutCard as WorkoutCardView } from "@/components/workout-card";
import { createClient } from "@/lib/supabase/client";
import type { ProfileRow, WeightEntry, WorkoutCard } from "@/lib/database.types";

/** Quanto esperar depois da última tecla antes de gravar a carga. */
const SAVE_DELAY_MS = 600;

type PendingLoad = { value: string; timer: ReturnType<typeof setTimeout> };

function isDone(workout: WorkoutCard) {
  return workout.exercises.length > 0 && workout.exercises.every((ex) => ex.done);
}

export function Board({
  userId,
  initialWeek,
  initialWorkouts,
  profile,
  initialWeights,
}: {
  userId: string;
  initialWeek: number;
  initialWorkouts: WorkoutCard[];
  profile: ProfileRow | null;
  initialWeights: WeightEntry[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [week, setWeek] = useState(initialWeek);
  const [workouts, setWorkouts] = useState(initialWorkouts);
  const [error, setError] = useState<string | null>(null);
  // Acordeao: so um card aberto por vez, comecando no primeiro treino que
  // ainda falta. Na ordem Upper A -> Lower A -> Upper B -> Lower B, isso abre
  // sozinho no treino da vez sem precisar adivinhar o dia da semana.
  const [openId, setOpenId] = useState<string | null>(
    () => initialWorkouts.find((workout) => !isDone(workout))?.id ?? null,
  );
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const pendingLoads = useRef(new Map<string, PendingLoad>());

  const total = workouts.length;
  const doneCount = workouts.filter(isDone).length;
  const allDone = total > 0 && doneCount === total;
  const progress = total > 0 ? (doneCount / total) * 100 : 0;

  /** Aplica um patch nos exercícios que casarem com o predicado. */
  function patch(matches: (exerciseId: string, workoutId: string) => boolean, done: boolean) {
    setWorkouts((prev) =>
      prev.map((workout) => ({
        ...workout,
        exercises: workout.exercises.map((exercise) =>
          matches(exercise.id, workout.id) ? { ...exercise, done } : exercise,
        ),
      })),
    );
  }

  async function toggleExercise(exerciseId: string, next: boolean) {
    patch((id) => id === exerciseId, next);

    const { error: updateError } = await supabase
      .from("exercises")
      .update({ done: next })
      .eq("id", exerciseId);

    if (updateError) {
      patch((id) => id === exerciseId, !next);
      setError("Não deu para salvar esse check.");
    }
  }

  async function toggleWorkout(workoutId: string) {
    const workout = workouts.find((item) => item.id === workoutId);
    if (!workout || workout.exercises.length === 0) return;

    const next = !isDone(workout);
    const previous = new Map(workout.exercises.map((ex) => [ex.id, ex.done]));

    patch((_, id) => id === workoutId, next);

    const { error: updateError } = await supabase
      .from("exercises")
      .update({ done: next })
      .eq("workout_id", workoutId)
      .is("archived_at", null);

    if (updateError) {
      setWorkouts((prev) =>
        prev.map((item) =>
          item.id === workoutId
            ? {
                ...item,
                exercises: item.exercises.map((ex) => ({
                  ...ex,
                  done: previous.get(ex.id) ?? ex.done,
                })),
              }
            : item,
        ),
      );
      setError(`Não deu para marcar ${workout.title}.`);
    }
  }

  async function saveLoad(exerciseId: string, value: string) {
    const { error: updateError } = await supabase
      .from("exercises")
      .update({ load_note: value })
      .eq("id", exerciseId);

    if (updateError) setError("Não deu para salvar a carga.");
  }

  function changeLoad(exerciseId: string, value: string) {
    setWorkouts((prev) =>
      prev.map((workout) => ({
        ...workout,
        exercises: workout.exercises.map((exercise) =>
          exercise.id === exerciseId ? { ...exercise, load_note: value } : exercise,
        ),
      })),
    );

    const pending = pendingLoads.current;
    const existing = pending.get(exerciseId);
    if (existing) clearTimeout(existing.timer);

    pending.set(exerciseId, {
      value,
      timer: setTimeout(() => {
        pending.delete(exerciseId);
        void saveLoad(exerciseId, value);
      }, SAVE_DELAY_MS),
    });
  }

  /** Grava o que ainda estiver no debounce — o snapshot da semana depende disso. */
  async function flushPendingLoads() {
    const pending = pendingLoads.current;
    if (pending.size === 0) return;

    const entries = [...pending.entries()];
    pending.clear();
    for (const [, item] of entries) clearTimeout(item.timer);

    await Promise.all(entries.map(([id, item]) => saveLoad(id, item.value)));
  }

  async function resetWeek() {
    setConfirmingReset(false);
    setIsResetting(true);
    await flushPendingLoads();

    const { data, error: rpcError } = await supabase.rpc("reset_week");

    if (rpcError) {
      setError("Não deu para fechar a semana.");
      setIsResetting(false);
      return;
    }

    setWeek(typeof data === "number" ? data : week + 1);
    patch(() => true, false);
    // Semana nova volta a abrir no primeiro treino.
    setOpenId(workouts[0]?.id ?? null);
    setIsResetting(false);
    router.refresh();
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-3 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-6">
      <header>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-muted text-[11px] tracking-[0.2em] uppercase">Semana</p>
            <p className="text-ink text-4xl leading-none font-semibold tracking-tight sm:text-5xl">
              {week}
            </p>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="border-control bg-surface text-muted hover:text-ink hover:border-muted flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs transition-colors"
            >
              <LogOut aria-hidden className="h-3.5 w-3.5" />
              Sair
            </button>
          </form>
        </div>

        <div className="mt-6">
          <div className="flex items-baseline justify-between text-sm">
            <span className={`flex items-center gap-1.5 ${allDone ? "text-done" : "text-muted"}`}>
              {allDone && <Trophy aria-hidden className="h-4 w-4" />}
              {allDone ? "Semana completa" : "Treinos concluídos"}
            </span>
            <span className="tabular text-ink font-semibold">
              {doneCount}
              <span className="text-muted font-normal">/{total}</span>
            </span>
          </div>
          <div
            className="bg-surface-2 mt-2 h-2 overflow-hidden rounded-full"
            role="progressbar"
            aria-valuenow={doneCount}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-label="Treinos concluídos na semana"
          >
            <div
              className={`h-full rounded-full transition-[width,background-color,box-shadow] duration-300 ${
                allDone ? "bg-done shadow-[0_0_12px_-1px_var(--color-done)]" : "bg-accent"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {total > 0 && (
        <WeightCard
          userId={userId}
          week={week}
          profile={profile}
          initialEntries={initialWeights}
          onError={setError}
        />
      )}

      {total === 0 ? (
        <p className="text-muted mt-10 text-sm">
          Nenhum treino cadastrado ainda. Recarregue a página para criar o programa padrão.
        </p>
      ) : (
        <section className="mt-3 flex flex-col gap-3">
          {workouts.map((workout) => (
            <WorkoutCardView
              key={workout.id}
              workout={workout}
              open={openId === workout.id}
              onToggleOpen={() => setOpenId(openId === workout.id ? null : workout.id)}
              onToggleWorkout={() => void toggleWorkout(workout.id)}
              onToggleExercise={(exerciseId, next) => void toggleExercise(exerciseId, next)}
              onChangeLoad={changeLoad}
            />
          ))}
        </section>
      )}

      <div className="mt-8 flex justify-center">
        {confirmingReset ? (
          <div className="border-line bg-surface flex w-full flex-col gap-3 rounded-2xl border p-4 sm:w-auto sm:flex-row sm:items-center">
            <p className="text-muted text-sm">
              Fechar a semana {week} e começar a {week + 1}? As cargas continuam preenchidas.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmingReset(false)}
                className="border-control bg-surface text-muted hover:text-ink h-10 flex-1 rounded-xl border px-4 text-sm sm:flex-none"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void resetWeek()}
                className="bg-accent text-accent-ink h-10 flex-1 rounded-xl px-4 text-sm font-semibold sm:flex-none"
              >
                Confirmar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingReset(true)}
            disabled={isResetting}
            className="border-control bg-surface text-muted hover:text-ink hover:border-muted flex h-11 items-center gap-2 rounded-xl border px-6 text-sm transition-colors disabled:opacity-60"
          >
            <RotateCcw
              aria-hidden
              className={`h-4 w-4 ${isResetting ? "animate-spin [animation-direction:reverse]" : ""}`}
            />
            {isResetting ? "Fechando semana..." : "Resetar semana"}
          </button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="border-danger/30 bg-danger/10 text-danger fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] mx-auto flex max-w-sm items-center gap-3 rounded-xl border px-4 py-3 text-sm backdrop-blur"
        >
          <CircleAlert aria-hidden className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Fechar aviso"
            className="hover:bg-danger/20 -m-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg p-1 transition-colors"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>
      )}
    </main>
  );
}
