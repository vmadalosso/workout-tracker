"use client";

import { CheckBox, CheckButton } from "@/components/check";
import type { WorkoutCard as WorkoutCardData } from "@/lib/database.types";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`text-muted h-4 w-4 shrink-0 transition-transform duration-200 ${
        open ? "rotate-180" : ""
      }`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function WorkoutCard({
  workout,
  open,
  onToggleOpen,
  onToggleWorkout,
  onToggleExercise,
  onChangeLoad,
}: {
  workout: WorkoutCardData;
  open: boolean;
  onToggleOpen: () => void;
  onToggleWorkout: () => void;
  onToggleExercise: (exerciseId: string, next: boolean) => void;
  onChangeLoad: (exerciseId: string, value: string) => void;
}) {
  const total = workout.exercises.length;
  const done = workout.exercises.filter((exercise) => exercise.done).length;
  const complete = total > 0 && done === total;
  const panelId = `workout-${workout.id}`;

  return (
    <article
      className={`bg-surface rounded-2xl border p-3 transition-colors sm:p-4 ${
        complete ? "border-accent/45" : "border-line"
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="text-ink block truncate text-lg leading-tight font-semibold tracking-tight">
              {workout.title}
            </span>
            {workout.day_label && (
              <span className="text-muted mt-0.5 block text-xs">{workout.day_label}</span>
            )}
          </span>
          <span
            className={`tabular shrink-0 text-xs ${complete ? "text-done" : "text-muted"}`}
          >
            {done}/{total}
          </span>
          <Chevron open={open} />
        </button>
        <CheckButton
          checked={complete}
          onToggle={onToggleWorkout}
          label={`Marcar ${workout.title} inteiro`}
        />
      </div>

      {/* grid-rows 0fr -> 1fr anima a altura sem precisar medir o conteúdo. */}
      <div
        className={`grid transition-[grid-template-rows] duration-200 ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden" inert={!open}>
          <ul id={panelId} className="divide-line-soft mt-2 divide-y sm:mt-3">
            {workout.exercises.map((exercise) => (
              <li key={exercise.id} className="flex items-center gap-2">
                {/* O alvo de toque é a linha inteira, não só o quadradinho:
                    na academia o dedo erra um quadrado de 28px. */}
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={exercise.done}
                  onClick={() => onToggleExercise(exercise.id, !exercise.done)}
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
                  onChange={(event) => onChangeLoad(exercise.id, event.target.value)}
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
        </div>
      </div>
    </article>
  );
}
