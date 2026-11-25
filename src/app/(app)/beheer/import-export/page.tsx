import { z } from "zod";
import { db } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { MappingStep, UploadForm } from "@/components/import/import-wizard";
import { IMPORT_KINDS } from "@/lib/import-config";
import { fmtDateTime } from "@/lib/format";

export const metadata = { title: "Import en export" };

const REPORTS = [
  { key: "jaarplan", label: "Jaarplan (actief jaar)" }, { key: "directie", label: "Directierapportage" }, { key: "portfolio", label: "Projectportfolio" },
  { key: "inventarisatie", label: "Totale inventarisatie" }, { key: "prioritering", label: "Prioriteringsresultaten" }, { key: "formatie", label: "Formatieanalyse" },
  { key: "capaciteit", label: "Capaciteitsplanning" }, { key: "risicos", label: "Risicoregister" }, { key: "roadmap", label: "Meerjarenroadmap" },
];

export default async function ImportExportPage({ searchParams }: { searchParams: Promise<{ batch?: string }> }) {
  const { batch } = await searchParams;
  const d = await db(async (x, user) => ({
    user,
    batch: batch && z.string().uuid().safeParse(batch).success ? await x.one<{ id: string; kind: string; file_name: string; row_count: number; headers: string[]; mapping: Record<string, string> | null; status: string }>(
      `select id, kind, file_name, row_count, headers, mapping, status from import_batches where id = $1`, [batch]) : null,
    history: await x.query<{ id: string; kind: string; file_name: string; row_count: number; committed_rows: number | null; status: string; created_at: string; by: string | null }>(
      `select b.id, b.kind, b.file_name, b.row_count, b.committed_rows, b.status, b.created_at, u.display_name as by from import_batches b left join users u on u.id = b.created_by order by b.created_at desc limit 20`),
  }));
  const canImport = can(d.user.roles, "import.run");
  return (
    <>
      <PageHeader title="Import en export" crumbs={[{ label: "Beheer" }, { label: "Import en export" }]}
        description="Importeer Excel, CSV of JSON met voorbeeld, kolomkoppeling en duplicaatdetectie. Er wordt niets opgeslagen zonder bevestiging." />
      <div className="space-y-4">
        {canImport && (
          <Card><CardHeader title={d.batch?.status === "Preview" ? "Stap 2 – kolommen koppelen en controleren" : "Stap 1 – bestand inlezen"} /><CardBody>
            {d.batch?.status === "Preview" ? <MappingStep batch={d.batch} /> : <UploadForm />}
          </CardBody></Card>
        )}
        <Card><CardHeader title="Exports en rapportages" description="Gegevens worden geëxporteerd met uw rechten; afgeschermde gegevens worden niet meegenomen." /><CardBody>
          <ul className="divide-y divide-line">
            {REPORTS.map((r) => (
              <li key={r.key} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="font-medium">{r.label}</span>
                <form method="post" action="/api/export/report" target="_blank" className="flex gap-1">
                  <input type="hidden" name="report" value={r.key} />
                  {[["xlsx", "Excel"], ["csv", "CSV"], ["json", "JSON"], ["html", "Print / PDF"]].map(([f, l]) => <button key={f} name="format" value={f} className="h-8 rounded-md border border-line-strong bg-surface px-2.5 text-[13px] hover:bg-surface-muted">{l}</button>)}
                </form>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] text-muted">PDF: kies &apos;Print / PDF&apos; en gebruik &apos;Opslaan als PDF&apos; in het afdrukvenster.</p>
        </CardBody></Card>
        <Card><CardHeader title="Importhistorie" />
          <table className="w-full text-[13px]"><caption className="sr-only">Importhistorie</caption>
            <thead className="bg-surface-muted text-left text-[12px] text-muted"><tr>{["Datum", "Soort", "Bestand", "Rijen", "Geïmporteerd", "Status", "Door"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>{d.history.map((h) => <tr key={h.id} className="border-t border-line"><td className="px-3 py-2">{fmtDateTime(h.created_at)}</td><td className="px-3">{IMPORT_KINDS[h.kind]?.label ?? h.kind}</td><td className="px-3">{h.status === "Preview" ? <a className="text-primary hover:underline" href={`/beheer/import-export?batch=${h.id}`}>{h.file_name}</a> : h.file_name}</td><td className="num px-3">{h.row_count}</td><td className="num px-3">{h.committed_rows ?? "—"}</td><td className="px-3"><StatusBadge status={h.status === "Bevestigd" ? "Afgerond" : h.status === "Preview" ? "Concept" : "Geannuleerd"} /></td><td className="px-3">{h.by}</td></tr>)}
              {!d.history.length && <tr><td className="px-3 py-3 text-muted" colSpan={7}>Nog geen imports.</td></tr>}</tbody></table>
        </Card>
      </div>
    </>
  );
}
