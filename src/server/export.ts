/** Exports in de browser: Excel, CSV, JSON en printvriendelijke HTML (→ PDF via afdrukken). */
export type Sheet = { name: string; columns: { key: string; label: string; width?: number }[]; rows: Record<string, unknown>[] };
export type ExportFormat = "xlsx" | "csv" | "json" | "html";

const cell = (v: unknown): string | number | null => {
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "boolean") return v ? "Ja" : "Nee";
  if (typeof v === "number") return v;
  if (v instanceof Date) return v.toISOString();
  return String(v);
};

/** Voorkomt formule-injectie in spreadsheetprogramma's (CSV/Excel). */
const safe = (v: string | number | null) => (typeof v === "string" && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v);

export function toCsv(sheet: Sheet) {
  const esc = (v: string | number | null) => {
    const s = v === null ? "" : String(safe(v));
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [sheet.columns.map((c) => esc(c.label)).join(";")];
  for (const r of sheet.rows) lines.push(sheet.columns.map((c) => esc(cell(r[c.key]))).join(";"));
  return "﻿" + lines.join("\r\n");
}

export async function toXlsx(sheets: Sheet[]) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Digitale Informatie | Strategie & Portfolio";
  wb.created = new Date();
  for (const s of sheets) {
    const ws = wb.addWorksheet(s.name.slice(0, 31));
    ws.columns = s.columns.map((c) => ({ header: c.label, key: c.key, width: c.width ?? Math.min(60, Math.max(12, c.label.length + 4)) }));
    for (const r of s.rows) ws.addRow(Object.fromEntries(s.columns.map((c) => [c.key, safe(cell(r[c.key]))])));
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];
    if (s.columns.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: s.columns.length } };
  }
  return new Blob([await wb.xlsx.writeBuffer()], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

const escHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function toHtml(title: string, sheets: Sheet[], intro?: string) {
  const date = new Intl.DateTimeFormat("nl-NL", { dateStyle: "long", timeStyle: "short" }).format(new Date());
  const tables = sheets.map((s) => `
    <h2>${escHtml(s.name)}</h2>
    <table><thead><tr>${s.columns.map((c) => `<th>${escHtml(c.label)}</th>`).join("")}</tr></thead>
    <tbody>${s.rows.map((r) => `<tr>${s.columns.map((c) => { const v = cell(r[c.key]); return `<td>${v === null ? '<span class="u">—</span>' : escHtml(String(v))}</td>`; }).join("")}</tr>`).join("")}</tbody></table>`).join("");
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>${escHtml(title)}</title>
<style>
body{font-family:"Segoe UI",system-ui,Arial,sans-serif;color:#1a2a3a;margin:32px;font-size:12px}
h1{font-size:22px;margin:0 0 4px}h2{font-size:15px;margin:24px 0 8px}
.meta{color:#506070;margin-bottom:16px}table{border-collapse:collapse;width:100%}
th,td{border:1px solid #dbe2ea;padding:4px 6px;text-align:left;vertical-align:top}th{background:#f0f3f7}
.u{color:#66768a}.bar{margin-bottom:16px}@media print{.bar{display:none}body{margin:12mm}}
</style></head><body>
<div class="bar"><button onclick="window.print()">Afdrukken / opslaan als PDF</button></div>
<h1>${escHtml(title)}</h1><div class="meta">Gemeente Bodegraven-Reeuwijk · team Digitale Informatie · gegenereerd ${date}</div>
${intro ? `<p>${escHtml(intro)}</p>` : ""}${tables}</body></html>`;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Maakt het bestand en start de download (of opent een afdrukweergave bij 'html'). */
export async function respond(format: ExportFormat, base: string, title: string, sheets: Sheet[]) {
  const stamp = new Date().toISOString().slice(0, 10);
  switch (format) {
    case "xlsx": return download(await toXlsx(sheets), `${base}-${stamp}.xlsx`);
    case "csv": return download(new Blob([toCsv(sheets[0])], { type: "text/csv;charset=utf-8" }), `${base}-${stamp}.csv`);
    case "json": return download(new Blob([JSON.stringify(Object.fromEntries(sheets.map((s) => [s.name, s.rows])), null, 2)], { type: "application/json" }), `${base}-${stamp}.json`);
    default: {
      const w = window.open("", "_blank");
      if (!w) throw new Error("De afdrukweergave werd geblokkeerd door de pop-upblokkering van je browser.");
      w.document.write(toHtml(title, sheets));
      w.document.close();
    }
  }
}
