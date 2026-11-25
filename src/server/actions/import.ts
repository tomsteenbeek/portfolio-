import ExcelJS from "exceljs";
import Papa from "papaparse";
import { z } from "zod";
import { withUser, type Db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { run, type ActionResult } from "@/server/action";
import { IMPORT_KINDS } from "@/lib/import-config";
import { CRITICALITY, FREQUENCIES, PROJECT_STATUSES, RISK_CATEGORIES, SOURCE_TYPES } from "@/lib/domain";

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_ROWS = 5000;
type Row = Record<string, string>;

async function parseFile(file: File): Promise<{ headers: string[]; rows: Row[] }> {
  if (file.size > MAX_BYTES) throw Object.assign(new Error("Bestand is groter dan 10 MB."), { code: "P0001" });
  const name = file.name.toLowerCase();
  const buf = await file.arrayBuffer();
  let rows: Row[] = [];
  if (name.endsWith(".xlsx")) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.worksheets[0];
    if (!ws) throw Object.assign(new Error("Geen werkblad gevonden."), { code: "P0001" });
    const headers: string[] = [];
    ws.getRow(1).eachCell({ includeEmpty: true }, (c, i) => { headers[i - 1] = String(c.text ?? "").trim() || `Kolom ${i}`; });
    ws.eachRow((r, n) => {
      if (n === 1) return;
      const o: Row = {};
      headers.forEach((h, i) => { const c = r.getCell(i + 1); const v = c.value instanceof Date ? c.value.toISOString().slice(0, 10) : c.text; o[h] = String(v ?? "").trim(); });
      if (Object.values(o).some(Boolean)) rows.push(o);
    });
  } else if (name.endsWith(".csv")) {
    const text = new TextDecoder("utf-8").decode(buf).replace(/^\uFEFF/, "");
    const res = Papa.parse<Row>(text, { header: true, skipEmptyLines: true, delimiter: "", transformHeader: (h) => h.trim() });
    rows = res.data.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v ?? "").trim()])));
  } else if (name.endsWith(".json")) {
    const data = JSON.parse(new TextDecoder("utf-8").decode(buf));
    const arr = Array.isArray(data) ? data : Array.isArray(data?.rows) ? data.rows : null;
    if (!arr) throw Object.assign(new Error("JSON moet een lijst van objecten zijn."), { code: "P0001" });
    rows = arr.map((r: Record<string, unknown>) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v)])));
  } else {
    throw Object.assign(new Error("Alleen .xlsx, .csv en .json worden ondersteund."), { code: "P0001" });
  }
  if (rows.length > MAX_ROWS) throw Object.assign(new Error(`Maximaal ${MAX_ROWS} rijen per import.`), { code: "P0001" });
  const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  return { headers, rows };
}

export async function uploadImport(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("import.run");
    const kind = z.enum(Object.keys(IMPORT_KINDS) as [string, ...string[]]).parse(fd.get("kind"));
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Kies een bestand." };
    const { headers, rows } = await parseFile(file);
    if (!rows.length) return { ok: false, error: "Het bestand bevat geen gegevensrijen." };
    const id = await withUser(user.id, async (db) => (await db.one<{ id: string }>(
      `insert into import_batches(kind, file_name, row_count, status, payload, headers) values ($1,$2,$3,'Preview',$4,$5) returning id`,
      [kind, file.name.slice(0, 200), rows.length, JSON.stringify(rows), headers]))!.id);
    return { ok: true, message: `${rows.length} rijen ingelezen – koppel nu de kolommen`, redirect: `/beheer/import-export?batch=${id}` };
  });
}

type Lk = { pillars: Map<string, string>; disciplines: Map<string, string>; topicsByCode: Map<string, string>; topicsByTitle: Map<string, string> };
async function lookups(db: Db): Promise<Lk> {
  const p = await db.query<{ id: string; number: number }>(`select id, number from pillars`);
  const d = await db.query<{ id: string; code: string; name: string }>(`select id, code, name from disciplines`);
  const t = await db.query<{ id: string; code: string; title: string }>(`select id, code, title from topics where archived_at is null`);
  return {
    pillars: new Map(p.map((x) => [String(x.number), x.id])),
    disciplines: new Map(d.flatMap((x) => [[x.code.toLowerCase(), x.id], [x.name.toLowerCase(), x.id]] as [string, string][])),
    topicsByCode: new Map(t.map((x) => [x.code, x.id])),
    topicsByTitle: new Map(t.map((x) => [x.title.toLowerCase(), x.id])),
  };
}

const num = (v: string | undefined) => { if (!v) return null; const n = Number(v.replace(/\./g, "").replace(",", ".")); return Number.isFinite(n) ? n : NaN; };
const date = (v: string | undefined) => { if (!v) return null; const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/) ?? null; if (m) return `${m[1]}-${m[2]}-${m[3]}`; const n = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/); return n ? `${n[3]}-${n[2].padStart(2, "0")}-${n[1].padStart(2, "0")}` : "INVALID"; };
const pick = <T extends string>(v: string | undefined, list: readonly T[]) => (v ? list.find((x) => x.toLowerCase() === v.toLowerCase()) ?? "INVALID" : null);

/** Valideert en mapt één rij; retourneert waarden of fouten (niets wordt opgeslagen). */
function mapRow(kind: string, r: Row, mapping: Record<string, string>, lk: Lk) {
  const g = (k: string) => (mapping[k] ? r[mapping[k]]?.trim() || undefined : undefined);
  const errors: string[] = [];
  const v: Record<string, unknown> = {};
  const need = (k: string, label: string) => { if (!g(k)) errors.push(`${label} ontbreekt`); };
  const pillar = (req: boolean) => { const p = g("pillar"); if (!p) { if (req) errors.push("Pijler ontbreekt"); return null; } const id = lk.pillars.get(p.replace(/\D/g, "")); if (!id) errors.push(`Onbekende pijler '${p}'`); return id ?? null; };
  const n = (k: string, label: string) => { const x = num(g(k)); if (Number.isNaN(x)) errors.push(`${label}: geen getal`); return Number.isNaN(x) ? null : x; };
  const dt = (k: string, label: string) => { const x = date(g(k)); if (x === "INVALID") errors.push(`${label}: ongeldige datum`); return x === "INVALID" ? null : x; };
  switch (kind) {
    case "medewerkersinput": {
      need("summary", "Reactie");
      v.summary = g("summary")?.slice(0, 2000);
      const t = g("topic");
      if (t) { const id = lk.topicsByCode.get(t) ?? lk.topicsByTitle.get(t.toLowerCase()); if (!id) errors.push(`Onderwerp '${t}' niet gevonden (rij wordt zonder koppeling bewaard)`); v.topic_id = id ?? null; }
      break;
    }
    case "onderwerpen": {
      need("title", "Titel"); v.title = g("title")?.slice(0, 300); v.pillar_id = pillar(true);
      for (const k of ["description", "reason", "legal_basis", "remarks"]) v[k] = g(k) ?? null;
      v.legal_deadline = dt("legal_deadline", "Deadline");
      const s = pick(g("source_type"), SOURCE_TYPES); if (s === "INVALID") errors.push("Onbekende bron"); v.source_type = s === "INVALID" || !s ? "Nog te valideren" : s;
      break;
    }
    case "projecten": {
      need("name", "Projectnaam"); v.name = g("name")?.slice(0, 200); v.primary_pillar_id = pillar(true);
      const s = pick(g("status"), PROJECT_STATUSES); if (s === "INVALID") errors.push("Onbekende status"); v.status = s === "INVALID" || !s ? "Idee" : s;
      v.start_date = dt("start_date", "Startdatum"); v.end_date = dt("end_date", "Einddatum");
      if (v.start_date && v.end_date && String(v.end_date) < String(v.start_date)) errors.push("Einddatum vóór startdatum");
      v.hours_required = n("hours_required", "Uren"); v.budget = n("budget", "Budget"); v.objective = g("objective") ?? null;
      break;
    }
    case "formatie": {
      need("title", "Functie"); v.title = g("title");
      const dsc = g("discipline"); v.discipline_id = dsc ? lk.disciplines.get(dsc.toLowerCase()) ?? null : null; if (dsc && !v.discipline_id) errors.push(`Onbekende discipline '${dsc}'`); if (!dsc) errors.push("Discipline ontbreekt");
      v.fte = n("fte", "FTE"); if (!v.fte || (v.fte as number) <= 0 || (v.fte as number) > 1.5) errors.push("FTE moet tussen 0 en 1,5 liggen");
      const k = g("kind")?.toLowerCase(); v.kind = !k ? "Vastgestelde formatie" : k.includes("tijdelijk") ? "Tijdelijke inhuur" : k.includes("inhuur") ? "Structurele inhuur" : "Vastgestelde formatie";
      const o = g("occupancy")?.toLowerCase(); v.occupancy = o?.startsWith("bezet") ? "Bezet" : "Vacature";
      v.occupied_fte = v.occupancy === "Bezet" ? v.fte : 0; v.subteam = g("subteam") ?? null; v.annual_cost = n("annual_cost", "Jaarkosten");
      break;
    }
    case "regulier": {
      need("name", "Werkzaamheid"); v.name = g("name"); v.pillar_id = pillar(false);
      const dsc = g("discipline"); v.discipline_id = dsc ? lk.disciplines.get(dsc.toLowerCase()) ?? null : null; if (dsc && !v.discipline_id) errors.push(`Onbekende discipline '${dsc}'`);
      const f = pick(g("frequency"), FREQUENCIES); if (f === "INVALID") errors.push("Onbekende frequentie"); v.frequency = f === "INVALID" ? null : f;
      v.hours_per_occurrence = n("hours_per_occurrence", "Uren per uitvoering"); v.hours_per_year = n("hours_per_year", "Uren per jaar");
      const c = pick(g("criticality"), CRITICALITY); if (c === "INVALID") errors.push("Onbekende kritikaliteit"); v.criticality = c === "INVALID" ? null : c;
      v.responsible_role = g("responsible_role") ?? null; v.backup_role = g("backup_role") ?? null;
      break;
    }
    case "risicos": {
      need("title", "Titel"); v.title = g("title");
      const c = pick(g("category"), RISK_CATEGORIES); if (!c || c === "INVALID") errors.push("Onbekende of ontbrekende categorie"); v.category = c === "INVALID" ? null : c;
      v.description = g("description") ?? null; v.pillar_id = pillar(false);
      for (const k of ["likelihood", "impact"] as const) { const x = n(k, k === "likelihood" ? "Kans" : "Impact"); if (x !== null && (x < 1 || x > 5 || !Number.isInteger(x))) errors.push(`${k === "likelihood" ? "Kans" : "Impact"} moet 1–5 zijn`); v[k] = x; }
      break;
    }
  }
  return { v, errors };
}

async function duplicates(db: Db, kind: string, mapped: { v: Record<string, unknown> }[], raw: Row[]) {
  const set = async (sql: string) => new Set((await db.query<{ k: string }>(sql)).map((r) => r.k));
  let existing: Set<string>; let key: (i: number) => string;
  switch (kind) {
    case "onderwerpen": existing = await set(`select pillar_id || '|' || lower(title) as k from topics where archived_at is null`); key = (i) => `${mapped[i].v.pillar_id}|${String(mapped[i].v.title ?? "").toLowerCase()}`; break;
    case "projecten": existing = await set(`select lower(name) as k from projects where archived_at is null`); key = (i) => String(mapped[i].v.name ?? "").toLowerCase(); break;
    case "formatie": existing = await set(`select discipline_id || '|' || lower(title) as k from staffing_positions where archived_at is null`); key = (i) => `${mapped[i].v.discipline_id}|${String(mapped[i].v.title ?? "").toLowerCase()}`; break;
    case "regulier": existing = await set(`select lower(name) as k from recurring_activities where archived_at is null`); key = (i) => String(mapped[i].v.name ?? "").toLowerCase(); break;
    case "risicos": existing = await set(`select lower(title) as k from risks where archived_at is null`); key = (i) => String(mapped[i].v.title ?? "").toLowerCase(); break;
    default: existing = new Set((await db.query<{ raw: Row }>(`select raw from source_inputs`)).map((x) => canon(x.raw))); key = (i) => canon(raw[i]);
  }
  const seen = new Set<string>();
  return mapped.map((_, i) => { const k = key(i); const dup = existing.has(k) ? "Bestaat al" : seen.has(k) ? "Dubbel in bestand" : null; seen.add(k); return dup; });
}
/** Canonieke vorm van een ruwe rij (gesorteerde sleutels) voor duplicaatdetectie. */
function canon(r: Row) { return JSON.stringify(Object.keys(r).sort().map((k) => [k, String(r[k] ?? "")])); }

export async function previewImport(batchId: string, mapping: Record<string, string>) {
  const user = await requirePermission("import.run");
  return withUser(user.id, async (db) => {
    const b = await db.one<{ kind: string; payload: Row[]; status: string }>(`select kind, payload, status from import_batches where id = $1`, [z.string().uuid().parse(batchId)]);
    if (!b || b.status !== "Preview") return { ok: false as const, error: "Batch niet (meer) beschikbaar." };
    const lk = await lookups(db);
    const mapped = b.payload.map((r) => mapRow(b.kind, r, mapping, lk));
    const dups = await duplicates(db, b.kind, mapped, b.payload);
    await db.query(`update import_batches set mapping = $2 where id = $1`, [batchId, JSON.stringify(mapping)]);
    return { ok: true as const, rows: mapped.slice(0, 200).map((m, i) => ({ ...m, duplicate: dups[i] })), total: mapped.length,
      errors: mapped.filter((m) => m.errors.length && !(b.kind === "medewerkersinput" && m.errors.every((e) => e.includes("niet gevonden")))).length,
      duplicates: dups.filter(Boolean).length };
  });
}

export async function commitImport(batchId: string, mapping: Record<string, string>, skipDuplicates: boolean): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("import.run");
    return withUser(user.id, async (db) => {
      const b = await db.one<{ kind: string; payload: Row[]; status: string; file_name: string }>(`select kind, payload, status, file_name from import_batches where id = $1`, [z.string().uuid().parse(batchId)]);
      if (!b || b.status !== "Preview") return { ok: false, error: "Batch is al verwerkt of geannuleerd." };
      const lk = await lookups(db);
      const mapped = b.payload.map((r) => mapRow(b.kind, r, mapping, lk));
      const dups = await duplicates(db, b.kind, mapped, b.payload);
      const blocking = mapped.filter((m) => m.errors.length && !(b.kind === "medewerkersinput" && m.errors.every((e) => e.includes("niet gevonden"))));
      if (blocking.length) return { ok: false, error: `${blocking.length} rij(en) bevatten fouten. Corrigeer het bestand of de koppeling.` };
      let n = 0, linked = 0;
      const ins = async (table: string, v: Record<string, unknown>) => {
        const cols = Object.keys(v);
        return db.one<{ id: string }>(`insert into ${table}(${cols.join(",")}) values (${cols.map((_, i) => `$${i + 1}`).join(",")}) returning id`, cols.map((c) => v[c]));
      };
      for (const [i, m] of mapped.entries()) {
        if (skipDuplicates && dups[i]) continue;
        const v = { ...m.v };
        switch (b.kind) {
          case "medewerkersinput": {
            const s = await db.one<{ id: string }>(`insert into source_inputs(batch_id, row_number, raw, summary) values ($1,$2,$3,$4) returning id`, [batchId, i + 2, JSON.stringify(b.payload[i]), v.summary]);
            if (v.topic_id) { await db.query(`insert into topic_sources(topic_id, source_type, source_input_id, reference) values ($1,'Medewerkersinput',$2,$3)`, [v.topic_id, s!.id, `${b.file_name}, rij ${i + 2}`]); linked++; }
            break;
          }
          case "onderwerpen": {
            const src = v.source_type; delete v.source_type;
            const code = await db.one<{ code: string }>(`select p.number || '.' || lpad((coalesce(max(split_part(t.code,'.',2)::int),0) + 1)::text, 2, '0') as code from pillars p left join topics t on t.pillar_id = p.id where p.id = $1 group by p.number`, [v.pillar_id]);
            const t = await ins("topics", { ...v, code: code!.code, status: "Te valideren" });
            await db.query(`insert into topic_sources(topic_id, source_type, reference) values ($1,$2,$3)`, [t!.id, src, `Import ${b.file_name}, rij ${i + 2}`]);
            break;
          }
          case "projecten": await ins("projects", v); break;
          case "formatie": await ins("staffing_positions", v); break;
          case "regulier": await ins("recurring_activities", v); break;
          case "risicos": await ins("risks", { ...v, stage: "Signaal" }); break;
        }
        n++;
      }
      await db.query(`update import_batches set status = 'Bevestigd', payload = null, committed_rows = $2, mapping = $3 where id = $1`, [batchId, n, JSON.stringify(mapping)]);
      return { ok: true, message: `${n} rij(en) geïmporteerd${b.kind === "medewerkersinput" ? `, ${linked} gekoppeld aan onderwerpen` : ""}.`, redirect: "/beheer/import-export" };
    });
  });
}

export async function cancelImport(batchId: string): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("import.run");
    await withUser(user.id, (db) => db.query(`update import_batches set status = 'Geannuleerd', payload = null where id = $1 and status = 'Preview'`, [z.string().uuid().parse(batchId)]));
    return { ok: true, message: "Import geannuleerd; er is niets opgeslagen.", redirect: "/beheer/import-export" };
  });
}
