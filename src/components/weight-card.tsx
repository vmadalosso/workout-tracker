"use client";

import { useState, type FormEvent } from "react";
import { Scale } from "lucide-react";

import { WeightChart } from "@/components/weight-chart";
import { createClient } from "@/lib/supabase/client";
import type { ProfileRow, WeightEntry } from "@/lib/database.types";

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      {/* Figuras proporcionais: tabular-nums em número de destaque deixa
          valores curtos com aparência frouxa. */}
      <p className="text-ink text-xl font-semibold tracking-tight">{value}</p>
      <p className="text-muted mt-0.5 text-[11px] tracking-wide uppercase">{label}</p>
    </div>
  );
}

export function WeightCard({
  userId,
  week,
  profile,
  initialEntries,
  onError,
}: {
  userId: string;
  week: number;
  profile: ProfileRow | null;
  initialEntries: WeightEntry[];
  onError: (message: string) => void;
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const sorted = [...entries].sort((a, b) => a.week_number - b.week_number);
  const current = sorted.at(-1) ?? null;
  const thisWeek = entries.find((entry) => entry.week_number === week) ?? null;
  const start = profile?.start_weight ?? null;
  const delta = current && start !== null ? Number(current.weight_kg) - Number(start) : null;

  const goalMin = profile?.goal_min ?? null;
  const goalMax = profile?.goal_max ?? null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(draft.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0 || value >= 500) {
      onError("Peso inválido.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("weight_entries")
      .upsert(
        { user_id: userId, week_number: week, weight_kg: value },
        { onConflict: "user_id,week_number" },
      );
    setSaving(false);

    if (error) {
      onError("Não deu para salvar o peso.");
      return;
    }

    setEntries((previous) => [
      ...previous.filter((entry) => entry.week_number !== week),
      { week_number: week, weight_kg: value },
    ]);
    setDraft("");
  }

  return (
    <section className="border-line bg-surface mt-6 rounded-2xl border p-3 sm:p-4">
      <h2 className="text-ink flex items-center gap-2 text-lg leading-tight font-semibold tracking-tight">
        <Scale aria-hidden className="text-muted h-4 w-4" />
        Peso
      </h2>

      <div className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
        <Stat
          value={current ? `${Number(current.weight_kg).toFixed(1)} kg` : "—"}
          label="atual"
        />
        <Stat
          value={delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg`}
          label="variação"
        />
        {goalMin !== null && goalMax !== null && (
          <Stat value={`${goalMin}–${goalMax} kg`} label="meta" />
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          inputMode="decimal"
          placeholder={thisWeek ? `${Number(thisWeek.weight_kg).toFixed(1)}` : "ex: 74.5"}
          aria-label={`Peso da semana ${week}`}
          className="border-line bg-surface-2 text-ink placeholder:text-muted focus:border-accent h-11 min-w-0 flex-1 rounded-lg border px-3 text-base outline-none"
        />
        <button
          type="submit"
          disabled={saving || draft.trim() === ""}
          className="bg-accent text-accent-ink h-11 shrink-0 rounded-lg px-5 text-sm font-semibold disabled:opacity-50"
        >
          {saving ? "Salvando..." : thisWeek ? "Atualizar" : "Salvar"}
        </button>
      </form>
      <p className="text-muted mt-2 text-xs">
        {thisWeek
          ? `Semana ${week} registrada em ${Number(thisWeek.weight_kg).toFixed(1)} kg.`
          : `Ainda sem registro para a semana ${week}.`}
      </p>

      {/* Com menos de dois pontos não há curva: os números acima já dizem tudo
          que um gráfico diria. */}
      {sorted.length >= 2 ? (
        <>
          <div className="mt-4">
            <WeightChart entries={sorted} goalMin={goalMin} goalMax={goalMax} />
          </div>
          <button
            type="button"
            onClick={() => setShowTable((value) => !value)}
            className="text-muted hover:text-ink mt-1 text-xs underline underline-offset-4"
            aria-expanded={showTable}
          >
            {showTable ? "esconder números" : "ver números"}
          </button>
          {showTable && (
            <table className="mt-3 w-full text-sm">
              <caption className="text-muted mb-2 text-left text-xs">
                Peso registrado por semana
              </caption>
              <thead>
                <tr className="text-muted text-left text-xs">
                  <th scope="col" className="font-normal">
                    Semana
                  </th>
                  <th scope="col" className="text-right font-normal">
                    Peso
                  </th>
                </tr>
              </thead>
              <tbody className="divide-line-soft divide-y">
                {sorted.map((entry) => (
                  <tr key={entry.week_number}>
                    <td className="tabular py-1.5">S{entry.week_number}</td>
                    <td className="tabular py-1.5 text-right">
                      {Number(entry.weight_kg).toFixed(1)} kg
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      ) : (
        sorted.length === 1 && (
          <p className="text-muted mt-4 text-xs">
            Registre mais uma semana para a curva aparecer.
          </p>
        )
      )}
    </section>
  );
}
