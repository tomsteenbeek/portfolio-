"use client";
import { AsyncPage } from "@/components/async-page";
import { RegisterDetailPage } from "@/components/registers/register-pages";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { KpiMeasurementForm } from "@/components/registers/kpi-measurement-form";
import { can } from "@/lib/auth/permissions";
import { fmtDate, fmtNumber } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export default function Page() {
  return <AsyncPage render={async (__sp) => {
    const params = Promise.resolve({ id: __sp.get("id") ?? "", nummer: __sp.get("nr") ?? "" });

  const { id } = await params;
  return (
    <RegisterDetailPage registerKey="kpis" id={id} extra={async (d, rec, user) => {
      const m = await d.query<{ id: string; measured_on: string; value: number; note: string | null }>(
        `select id, measured_on, value, note from kpi_measurements where kpi_id = $1 order by measured_on desc`, [id]);
      const latest = m[0]?.value ?? null;
      const prev = m[1]?.value ?? null;
      const better = rec.direction === "Hoger is beter";
      const trend = latest === null || prev === null ? null : latest === prev ? "Stabiel" : (latest > prev) === better ? "Verbeterend" : "Verslechterend";
      const unit = rec.unit ? ` ${rec.unit}` : "";
      return (
        <Card className="mb-4"><CardHeader title="Metingen en trend" description="Actuele waarde = laatste meting. Geen meting = onbekend." /><CardBody className="space-y-4">
          <div className="flex flex-wrap gap-8 text-sm">
            <div><div className="text-[12px] uppercase text-muted">Nulmeting</div><div className="num text-lg font-semibold">{rec.baseline_value == null ? <span className="text-subtle text-sm">Nog niet vastgesteld</span> : fmtNumber(Number(rec.baseline_value)) + unit}</div></div>
            <div><div className="text-[12px] uppercase text-muted">Actuele waarde</div><div className="num text-lg font-semibold">{latest === null ? <span className="text-subtle text-sm">Onbekend</span> : fmtNumber(latest) + unit}</div></div>
            <div><div className="text-[12px] uppercase text-muted">Streefwaarde</div><div className="num text-lg font-semibold">{rec.target_value == null ? <span className="text-subtle text-sm">Nog niet vastgesteld</span> : fmtNumber(Number(rec.target_value)) + unit}</div></div>
            <div><div className="text-[12px] uppercase text-muted">Trend</div><div className="mt-1">{trend ? <Badge tone={trend === "Verbeterend" ? "ok" : trend === "Verslechterend" ? "bad" : "neutral"}>{trend}</Badge> : <span className="text-subtle">Onvoldoende metingen</span>}</div></div>
          </div>
          {can(user.roles, "registers.edit") && <KpiMeasurementForm kpiId={id} />}
          {m.length > 0 && (
            <table className="w-full max-w-xl text-[13px]"><caption className="sr-only">Historische waarden</caption>
              <thead className="text-left text-muted"><tr><th className="py-1">Datum</th><th>Waarde</th><th>Toelichting</th></tr></thead>
              <tbody>{m.map((x) => <tr key={x.id} className="border-t border-line"><td className="py-1">{fmtDate(x.measured_on)}</td><td className="num">{fmtNumber(x.value)}{unit}</td><td>{x.note}</td></tr>)}</tbody>
            </table>
          )}
        </CardBody></Card>
      );
    }} />
  );

  }} />;
}
