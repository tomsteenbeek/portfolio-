/** 5×5-risicomatrix (kans × impact) met configureerbare drempels. Aantallen per cel. */
export function RiskMatrix({ cells, thresholds, residual }: {
  cells: { l: number; i: number; n: number }[]; thresholds: { laag_tot: number; midden_tot: number; hoog_tot: number; labels: string[] }; residual?: boolean;
}) {
  const level = (s: number) => (s <= thresholds.laag_tot ? 0 : s <= thresholds.midden_tot ? 1 : s <= thresholds.hoog_tot ? 2 : 3);
  const bg = ["var(--status-green-bg)", "var(--status-amber-bg)", "#f6d9c7", "var(--status-red-bg)"];
  const count = (l: number, i: number) => cells.find((c) => c.l === l && c.i === i)?.n ?? 0;
  return (
    <div>
      <table className="border-separate border-spacing-1 text-[12px]">
        <caption className="mb-1 text-left text-[13px] font-semibold">{residual ? "Restrisico" : "Brutorisico"} – kans × impact</caption>
        <tbody>
          {[5, 4, 3, 2, 1].map((l) => (
            <tr key={l}>
              <th scope="row" className="pr-1 text-right font-normal text-muted">Kans {l}</th>
              {[1, 2, 3, 4, 5].map((i) => {
                const n = count(l, i);
                const s = l * i;
                return (
                  <td key={i} className="h-11 w-14 rounded text-center align-middle" style={{ background: bg[level(s)] }} title={`Kans ${l} × impact ${i} = ${s} (${thresholds.labels[level(s)]}): ${n} risico's`}>
                    {n > 0 ? <span className="num text-[15px] font-semibold text-ink">{n}</span> : <span className="text-subtle" aria-label="geen">·</span>}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr><td />{[1, 2, 3, 4, 5].map((i) => <th key={i} scope="col" className="font-normal text-muted">Impact {i}</th>)}</tr>
        </tbody>
      </table>
      <div className="mt-2 flex flex-wrap gap-3 text-[12px] text-muted">
        {thresholds.labels.map((lab, k) => <span key={lab} className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded" style={{ background: bg[k] }} />{lab}</span>)}
      </div>
    </div>
  );
}
