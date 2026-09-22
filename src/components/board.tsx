"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { CheckBox, CheckButton } from "@/components/check";
import { createClient } from "@/lib/supabase/client";
import type { WorkoutCard } from "@/lib/database.types";

/** Quanto esperar depois da última tecla antes de gravar a carga. */
const SAVE_DELAY_MS = 600;

type PendingLoad = { value: string; timer: ReturnType<typeof setTimeout> };

function isDone(workout: WorkoutCard) {
  return workout.exercises.length > 0 && workout.exercises.every((ex) => ex.done);
}

export function Board({
  initialWeek,
  initialWorkouts,
}: {
  initialWeek: number;
  initialWorkouts: WorkoutCard[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [week, setWeek] = useState(initialWeek);
  const [workouts, setWorkouts] = useState(initialWorkouts);
  const [error, setError] = useState<string | null>(null);
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
    setIsResetting(false);
    router.refresh();
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-3 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-6">
      <header>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-muted text-[11px] tracking-[0.2em] uppercase">Semana</p>
            <p className="text-ink tabular text-4xl leading-none font-semibold tracking-tight sm:text-5xl">
              {week}
            </p>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-muted hover:text-ink text-xs underline underline-offset-4"
            >
              sair
            </button>
          </form>
        </div>

        <div className="mt-6">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted">
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
              className={`h-full rounded-full transition-[width,background-color] duration-300 ${
                allDone ? "bg-done" : "bg-accent"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {total === 0 ? (
        <p className="text-muted mt-10 text-sm">
          Nenhum treino cadastrado ainda. Recarregue a página para criar o programa padrão.
        </p>
      ) : (
        <section className="mt-6 grid items-start gap-3 md:grid-cols-2 md:gap-4">
          {workouts.map((workout) => {
            const workoutDone = isDone(workout);

            return (
              <article
                key={workout.id}
                className={`bg-surface rounded-2xl border p-3 transition-colors sm:p-4 ${
                  workoutDone ? "border-accent/45" : "border-line"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-ink truncate text-lg leading-tight font-semibold tracking-tight">
                      {workout.title}
                    </h2>
                    {workout.day_label && (
                      <p className="text-muted mt-1 text-xs">{workout.day_label}</p>
                    )}
                  </div>
                  <CheckButton
                    checked={workoutDone}
                    onToggle={() => void toggleWorkout(workout.id)}
                    label={`Marcar ${workout.title} inteiro`}
                  />
                </div>

                <ul className="divide-line-soft mt-2 divide-y sm:mt-3">
                  {workout.exercises.map((exercise) => (
                    <li key={exercise.id} className="flex items-center gap-2">
                      {/* O alvo de toque é a linha inteira, não só o quadradinho:
                          na academia o dedo erra um quadrado de 28px. */}
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={exercise.done}
                        onClick={() => void toggleExercise(exercise.id, !exercise.done)}
                        className="active:bg-bg/40 flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-lg py-1.5 text-left transition-colors"
                      >
                        <CheckBox checked={exercise.done} />
                        <span
                          className={`flex-1 text-sm leading-snug ${
                            exercise.done ? "text-muted line-through" : "text-ink"
                          }`}
                        >
                          {exercise.name}
                        </span>
                      </button>
                      <input
                        value={exercise.load_note}
                        onChange={(event) => changeLoad(exercise.id, event.target.value)}
                        placeholder={exercise.hint}
                        aria-label={`${exercise.name} (${exercise.hint})`}
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                        enterKeyHint="done"
                        className="border-line bg-surface-2 text-ink placeholder:text-muted focus:border-accent h-10 w-28 shrink-0 rounded-lg border px-2 text-center text-base placeholder:text-xs outline-none"
                      />
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
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
                className="border-line text-muted hover:text-ink h-10 flex-1 rounded-xl border px-4 text-sm sm:flex-none"
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
            className="border-line text-muted hover:text-ink hover:border-muted h-11 rounded-xl border px-6 text-sm transition-colors disabled:opacity-60"
          >
            {isResetting ? "Fechando semana..." : "Resetar semana"}
          </button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="border-danger/30 bg-danger/10 text-danger fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] mx-auto flex max-w-sm items-center gap-3 rounded-xl border px-4 py-3 text-sm backdrop-blur"
        >
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="underline underline-offset-4"
          >
            fechar
          </button>
        </div>
      )}
    </main>
  );
}
