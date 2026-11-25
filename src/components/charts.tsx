"use client";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "@/components/ui/empty-state";

const C1 = "var(--chart-1)";
const C2 = "var(--chart-2)";
const nf = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 });

type Row = { label: string; value: number | null };

function TableView({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number | null)[][] }) {
  return (
    <details className="mt-2 text-[13px]">
      <summary className="cursor-pointer text-muted hover:text-ink">Toon als tabel</summary>
      <table className="mt-2 w-full">
        <caption className="sr-only">{caption}</caption>
        <thead><tr>{head.map((h) => <th key={h} className="py-1 text-left font-medium text-muted">{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line">
              {r.map((c, j) => <td key={j} className="num py-1">{c === null ? "Onbekend" : typeof c === "number" ? nf.format(c) : c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

const tooltipStyle = { fontSize: 13, borderRadius: 6, border: "1px solid var(--border)", boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)" };

/** Enkele reeks staafdiagram (magnitude). Titel benoemt de reeks; geen legenda. */
export function SimpleBars({ data, unit = "", height = 220, horizontal, emptyText = "Nog geen gegevens beschikbaar", caption }: {
  data: Row[]; unit?: string; height?: number; horizontal?: boolean; emptyText?: string; caption: string;
}) {
  const known = data.filter((d) => d.value !== null);
  if (known.length === 0 || known.every((d) => d.value === 0)) return <EmptyState title={emptyText} />;
  return (
    <div>
      <div style={{ height }} role="img" aria-label={`${caption}: ${data.map((d) => `${d.label} ${d.value ?? "onbekend"}${unit}`).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 8, right: 16, bottom: 4, left: horizontal ? 8 : -12 }} barCategoryGap={horizontal ? 6 : "22%"}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={!!horizontal} horizontal={!horizontal} />
            {horizontal ? (
              <>
                <XAxis type="number" tick={{ fontSize: 12, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 12, fill: "var(--text)" }} axisLine={false} tickLine={false} />
              </>
            ) : (
              <>
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--text)" }} axisLine={{ stroke: "var(--border-strong)" }} tickLine={false} interval={0} />
                <YAxis tick={{ fontSize: 12, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
              </>
            )}
            <Tooltip cursor={{ fill: "var(--surface-muted)" }} contentStyle={tooltipStyle} formatter={(v) => [`${nf.format(Number(v))}${unit}`, ""]} separator="" />
            <Bar dataKey="value" fill={C1} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={horizontal ? 18 : 36} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <TableView caption={caption} head={["Categorie", `Waarde${unit ? ` (${unit.trim()})` : ""}`]} rows={data.map((d) => [d.label, d.value])} />
    </div>
  );
}

/** Twee reeksen naast elkaar (bijv. benodigd vs beschikbaar), met legenda. */
export function PairBars({ data, aLabel, bLabel, unit = "", height = 240, caption, emptyText = "Nog geen gegevens beschikbaar" }: {
  data: { label: string; a: number | null; b: number | null }[]; aLabel: string; bLabel: string; unit?: string; height?: number; caption: string; emptyText?: string;
}) {
  if (!data.some((d) => (d.a ?? 0) > 0 || (d.b ?? 0) > 0)) return <EmptyState title={emptyText} />;
  return (
    <div>
      <div style={{ height }} role="img" aria-label={caption}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -8 }} barGap={2} barCategoryGap="24%">
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--text)" }} axisLine={{ stroke: "var(--border-strong)" }} tickLine={false} interval={0} angle={data.length > 6 ? -30 : 0} textAnchor={data.length > 6 ? "end" : "middle"} height={data.length > 6 ? 70 : 30} />
            <YAxis tick={{ fontSize: 12, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: "var(--surface-muted)" }} contentStyle={tooltipStyle} formatter={(v) => `${nf.format(Number(v))}${unit}`} />
            <Legend wrapperStyle={{ fontSize: 13 }} iconType="square" />
            <Bar name={aLabel} dataKey="a" fill={C1} radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar name={bLabel} dataKey="b" fill={C2} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <TableView caption={caption} head={["Categorie", aLabel, bLabel]} rows={data.map((d) => [d.label, d.a, d.b])} />
    </div>
  );
}
