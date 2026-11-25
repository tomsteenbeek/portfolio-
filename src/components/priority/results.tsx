import type { SessionData } from "@/server/queries/priority";
import { summarize } from "@/lib/stats";
import { categorize } from "@/lib/priority";
import { Badge, PriorityBadge } from "@/components/ui/badge";

const f1 = (v: number | null) => (v === null ? "—" : v.toFixed(1).replace(".", ","));
const tone = (a: string) => (a === "Sterk eens" ? "ok" : a === "Redelijk eens" ? "info" : a === "Verdeeld" ? "warn" : a === "Sterk oneens" ? "bad" : "neutral") as "ok";

export function medianScores(data: SessionData) {
  const out: Record<string, Record<string, number>> = {};
  for (const item of data.items) {
    const ind = data.assessments.filter((a) => a.session_item_id === item.id && !a.is_consensus);
    out[item.id] = {};
    for (const c of data.criteria) {
      const v = ind.map((a) => a.scores[c.id]).filter((x) => x !== undefined).sort((a, b) => a - b);
      if (v.length) out[item.id][c.id] = Math.round(v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2);
    }
  }
  return out;
}

/** Resultatenoverzicht: statistiek, overeenstemming, verschillen tussen disciplines en onderbouwingen. */
export function Results({ data, visible, large }: { data: SessionData; visible: boolean; large?: boolean }) {
  if (!visible) {
    return (
      <div className="space-y-3">
        <p className="rounded-md bg-info-bg px-3 py-2 text-sm text-info">Individuele beoordelingen zijn verborgen tot de bespreking start, om beïnvloeding te voorkomen. Hieronder alleen de voortgang.</p>
        <table className="w-full text-sm"><caption className="sr-only">Voortgang</caption>
          <thead className="text-left text-muted"><tr><th className="py-1">Item</th><th>Ingediend</th></tr></thead>
          <tbody>{data.items.map((i) => <tr key={i.id} className="border-t border-line"><td className="py-1.5">{i.code} {i.label}</td><td className="num">{i.submitted} / {data.members.length}</td></tr>)}</tbody>
        </table>
      </div>
    );
  }
  const rows = data.items.map((item) => {
    const ind = data.assessments.filter((a) => a.session_item_id === item.id && !a.is_consensus);
    const s = summarize(ind.map((a) => a.total_score));
    const byDisc = new Map<string, number[]>();
    for (const a of ind) byDisc.set(a.discipline ?? "Onbekend", [...(byDisc.get(a.discipline ?? "Onbekend") ?? []), a.total_score]);
    return { item, ind, s, byDisc };
  }).sort((a, b) => (b.s.mean ?? -1) - (a.s.mean ?? -1));
  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <table className={large ? "w-full text-[16px]" : "w-full text-[13px]"}>
          <caption className="mb-2 text-left text-sm font-semibold">Voorlopige rangorde (op gemiddelde score)</caption>
          <thead className="bg-surface-muted text-left text-muted">
            <tr>{["#", "Item", "Gem.", "Mediaan", "Hoogste", "Laagste", "Spreiding (sd)", "n", "Overeenstemming", "Categorie (gem.)", "Consensus"].map((h) => <th key={h} className="p-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map(({ item, s }, i) => (
              <tr key={item.id} className="border-t border-line">
                <td className="num p-2 text-muted">{i + 1}</td>
                <td className="p-2"><span className="num text-muted">{item.code}</span> {item.label}{item.flags.length > 0 && <Badge tone="accent" className="ml-1">Verplicht/urgent</Badge>}</td>
                <td className="num p-2 font-semibold">{f1(s.mean)}</td><td className="num p-2">{f1(s.median)}</td>
                <td className="num p-2">{f1(s.max)}</td><td className="num p-2">{f1(s.min)}</td><td className="num p-2">{f1(s.stdev)}</td>
                <td className="num p-2">{s.n}</td>
                <td className="p-2"><Badge tone={tone(s.agreement)}>{s.agreement}</Badge></td>
                <td className="p-2">{s.mean === null ? "—" : <PriorityBadge category={categorize(s.mean)} />}</td>
                <td className="p-2">{item.consensus_category ? <PriorityBadge category={item.consensus_category} /> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.map(({ item, ind, byDisc }) => ind.length > 0 && (
        <details key={item.id} className="rounded-lg border border-line">
          <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium">{item.code} {item.label} – details per criterium, discipline en onderbouwingen</summary>
          <div className="grid gap-4 border-t border-line p-4 lg:grid-cols-3">
            <div>
              <h4 className="mb-1 text-[13px] font-semibold">Per criterium (0–5)</h4>
              <table className="w-full text-[13px]"><tbody>
                {data.criteria.map((c) => { const st = summarize(ind.map((a) => a.scores[c.id]).filter((v) => v !== undefined)); return (
                  <tr key={c.id} className="border-t border-line"><td className="py-1">{c.name}</td><td className="num">gem. {f1(st.mean)}</td><td className="num text-muted">{f1(st.min)}–{f1(st.max)}</td></tr>); })}
              </tbody></table>
            </div>
            <div>
              <h4 className="mb-1 text-[13px] font-semibold">Verschillen tussen disciplines</h4>
              <table className="w-full text-[13px]"><tbody>
                {[...byDisc.entries()].map(([d, v]) => <tr key={d} className="border-t border-line"><td className="py-1">{d}</td><td className="num">{f1(summarize(v).mean)}</td><td className="num text-muted">n={v.length}</td></tr>)}
              </tbody></table>
            </div>
            <div>
              <h4 className="mb-1 text-[13px] font-semibold">Onderbouwingen</h4>
              <ul className="space-y-1.5 text-[13px]">
                {ind.map((a) => <li key={a.id}><span className="text-muted">{a.display_name} ({f1(a.total_score)}):</span> {a.rationale ?? <span className="text-subtle">geen onderbouwing</span>}</li>)}
              </ul>
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}
