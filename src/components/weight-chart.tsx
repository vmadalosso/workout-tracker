"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { WeightEntry } from "@/lib/database.types";

/*
 * Cores literais, e não var(--…): atributos de apresentação em SVG não
 * resolvem custom properties do CSS — só declarações CSS resolvem.
 *
 * A linha é o Pink do Dracula, escolhida por validação e não por gosto:
 * contra a banda verde ela dá ΔE 17.4 (deuteranopia) e 35.0 (tritanopia).
 * Laranja e amarelo pareciam ótimos a olho e davam ΔE ~3 — indistinguíveis
 * da banda para quem tem deuteranopia ou protanopia.
 */
const LINE = "#ff79c6";
const GOAL = "#50fa7b";
const GRID = "#44475a";
const AXIS = "#9aa4cf";
const SURFACE = "#343746";

type Point = { week: number; weight: number };

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: Point }[];
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className="border-line bg-bg rounded-lg border px-3 py-2 text-xs shadow-lg">
      <p className="text-muted">Semana {point.week}</p>
      <p className="text-ink font-semibold">{point.weight.toFixed(1)} kg</p>
    </div>
  );
}

export function WeightChart({
  entries,
  goalMin,
  goalMax,
}: {
  entries: WeightEntry[];
  goalMin: number | null;
  goalMax: number | null;
}) {
  const data: Point[] = entries
    .map((entry) => ({ week: entry.week_number, weight: Number(entry.weight_kg) }))
    .sort((a, b) => a.week - b.week);

  const values = [
    ...data.map((point) => point.weight),
    ...(goalMin === null ? [] : [goalMin]),
    ...(goalMax === null ? [] : [goalMax]),
  ];
  // 2 kg de folga dos dois lados: com 1, a banda de meta encostava no piso do
  // eixo e lia como cortada em vez de flutuando.
  const low = Math.floor(Math.min(...values) - 2);
  const high = Math.ceil(Math.max(...values) + 2);

  return (
    // A altura acomoda o plot mais a faixa dos rótulos do eixo x, para o card
    // não criar um scroll vertical interno.
    <ResponsiveContainer width="100%" height={230}>
      <LineChart data={data} margin={{ top: 10, right: 8, bottom: 4, left: -18 }}>
        {/* Grade sólida e fina: tracejado leria como "limiar", que é o papel
            reservado às linhas da meta abaixo. */}
        <CartesianGrid stroke={GRID} strokeOpacity={0.45} vertical={false} />
        <XAxis
          dataKey="week"
          type="number"
          domain={["dataMin", "dataMax"]}
          tickFormatter={(week: number) => `S${week}`}
          tick={{ fill: AXIS, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <YAxis
          domain={[low, high]}
          tick={{ fill: AXIS, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={46}
          tickFormatter={(value: number) => `${value}`}
        />
        {goalMin !== null && goalMax !== null && (
          <>
            <ReferenceArea y1={goalMin} y2={goalMax} fill={GOAL} fillOpacity={0.1} />
            <ReferenceLine y={goalMin} stroke={GOAL} strokeOpacity={0.55} strokeDasharray="4 4" />
            <ReferenceLine y={goalMax} stroke={GOAL} strokeOpacity={0.55} strokeDasharray="4 4" />
          </>
        )}
        <Tooltip
          content={<ChartTooltip />}
          cursor={{ stroke: GRID, strokeWidth: 1 }}
        />
        <Line
          type="monotone"
          dataKey="weight"
          stroke={LINE}
          strokeWidth={2}
          /* Anel de 2px na cor da superfície separa o ponto da banda sem
             precisar de contorno escuro. */
          dot={{ r: 4, fill: LINE, stroke: SURFACE, strokeWidth: 2 }}
          activeDot={{ r: 6, fill: LINE, stroke: SURFACE, strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
