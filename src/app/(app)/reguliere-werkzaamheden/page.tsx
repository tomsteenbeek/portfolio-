"use client";
import { AsyncPage } from "@/components/async-page";
import { RegisterListPage } from "@/components/registers/register-pages";
import { Stat } from "@/components/ui/stat";
import { fmtHours } from "@/lib/format";

export default function Page() {
  return <AsyncPage render={async () => {

  return (
    <RegisterListPage registerKey="recurring" above={async (d) => {
      const s = await d.one<{ total: number | null; n: number; known: number; legal: number; critical: number; nobackup: number }>(
        `select sum(coalesce(hours_per_year, hours_per_occurrence * occurrences_per_year)) as total, count(*)::int as n,
                count(coalesce(hours_per_year, hours_per_occurrence * occurrences_per_year))::int as known,
                count(*) filter (where is_legal_obligation)::int as legal,
                count(*) filter (where criticality in ('Hoog','Kritiek'))::int as critical,
                count(*) filter (where criticality in ('Hoog','Kritiek') and coalesce(backup_role,'') = '')::int as nobackup
           from recurring_activities where archived_at is null`);
      return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat label="Werkzaamheden" value={s!.n} />
          <Stat label="Uren per jaar (basispakket)" value={fmtHours(s!.total, "Nog niet geraamd")} unknown={s!.total === null} sub={`Raming bij ${s!.known} van ${s!.n}`} />
          <Stat label="Wettelijke verplichting" value={s!.legal} />
          <Stat label="Hoog/kritiek" value={s!.critical} />
          <Stat label="Kritiek zonder achtervang" value={s!.nobackup} tone={s!.nobackup ? "bad" : undefined} />
        </div>
      );
    }} />
  );

  }} />;
}
