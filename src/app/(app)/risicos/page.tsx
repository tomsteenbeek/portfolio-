"use client";
import { AsyncPage } from "@/components/async-page";
import { RegisterListPage } from "@/components/registers/register-pages";
import { RiskMatrix } from "@/components/registers/risk-matrix";
import { Card, CardBody } from "@/components/ui/card";
import { getSettings } from "@/server/queries/dashboard";

export default function Page() {
  return <AsyncPage render={async () => {

  return (
    <RegisterListPage registerKey="risks" above={async (d) => {
      const s = await getSettings(d);
      const th = s["risico.matrix"] as { laag_tot: number; midden_tot: number; hoog_tot: number; labels: string[] };
      const gross = await d.query<{ l: number; i: number; n: number }>(
        `select likelihood as l, impact as i, count(*)::int as n from risks where archived_at is null and stage in ('Signaal','Gevalideerd') and likelihood is not null and impact is not null group by 1,2`);
      const res = await d.query<{ l: number; i: number; n: number }>(
        `select residual_likelihood as l, residual_impact as i, count(*)::int as n from risks where archived_at is null and stage in ('Signaal','Gevalideerd') and residual_likelihood is not null and residual_impact is not null group by 1,2`);
      const stages = await d.query<{ stage: string; n: number }>(`select stage, count(*)::int as n from risks where archived_at is null group by stage`);
      return (
        <Card><CardBody className="flex flex-wrap gap-10">
          <RiskMatrix cells={gross} thresholds={th} />
          <RiskMatrix cells={res} thresholds={th} residual />
          <div className="text-sm">
            <h2 className="mb-2 text-[13px] font-semibold">Per fase</h2>
            <ul className="space-y-1">{["Signaal", "Gevalideerd", "Geaccepteerd", "Gesloten"].map((s) => <li key={s} className="flex justify-between gap-6"><span>{s}</span><span className="num">{stages.find((x) => x.stage === s)?.n ?? 0}</span></li>)}</ul>
            <p className="mt-3 max-w-xs text-[12px] text-muted">De matrix toont open risico&apos;s (signalen en gevalideerde risico&apos;s). Drempels zijn instelbaar in Beheer → Instellingen.</p>
          </div>
        </CardBody></Card>
      );
    }} />
  );

  }} />;
}
