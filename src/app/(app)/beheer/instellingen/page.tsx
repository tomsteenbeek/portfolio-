"use client";
import { AsyncPage } from "@/components/async-page";
import { db, requirePermission } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { SettingForm } from "@/components/admin/forms";
import { BRAND } from "@/config/brand";

export default function SettingsPage() {
  return <AsyncPage render={async () => {

  await requirePermission("settings.edit");
  const rows = await db((x) => x.query<{ key: string; value: unknown; description: string | null }>(`select key, value, description from settings where key <> 'capaciteit.aannames' order by key`));
  return (
    <>
      <PageHeader title="Instellingen" crumbs={[{ label: "Beheer" }, { label: "Instellingen" }]}
        description="Configureerbare waarden. Rekenaannames voor capaciteit wijzigt u via Capaciteitsplanning; het prioriteringsmodel via Prioriteringsmodel." />
      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((r) => <Card key={r.key}><CardBody><SettingForm k={r.key} value={r.value} description={r.description} /></CardBody></Card>)}
        <Card><CardBody className="text-sm">
          <h2 className="font-semibold">Huisstijl</h2>
          <p className="mt-1 text-muted">Kleuren en typografie zijn design tokens in <code>src/app/globals.css</code>; logo via <code>NEXT_PUBLIC_BRAND_LOGO</code>. Huidig logo: {BRAND.logoUrl ?? "niet ingesteld (tekstlogo)"}. Zie DESIGN_SYSTEM.md voor de gemaakte aannames.</p>
        </CardBody></Card>
      </div>
    </>
  );

  }} />;
}
