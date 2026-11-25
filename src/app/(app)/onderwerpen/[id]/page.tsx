import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { auditFor, getTopic, lookups } from "@/server/queries/topics";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TabLinks } from "@/components/ui/tabs";
import { Badge, Maturity, PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { DescriptionList, Text } from "@/components/ui/dl";
import { TopicForm } from "@/components/topics/topic-form";
import { DeepdiveForm } from "@/components/topics/deepdive-form";
import { MaturityForm } from "@/components/topics/maturity-form";
import { FlagsForm } from "@/components/topics/flags-form";
import { SourcesPanel } from "@/components/topics/sources-panel";
import { TopicActions } from "@/components/topics/topic-actions";
import { FeasibilityForm } from "@/components/priority/feasibility-form";
import { Comments } from "@/components/common/comments";
import { History } from "@/components/common/history";
import { fmtDate, fmtDateTime, fmtEuro, fmtHours, fmtNumber } from "@/lib/format";
import { MATURITY_LABELS } from "@/components/ui/badge";

export default async function TopicPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab = "overzicht" } = await searchParams;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const data = await db(async (d, user) => {
    const t = await getTopic(d, id);
    if (!t) return null;
    const lk = await lookups(d);
    const history = can(user.roles, "audit.view")
      ? await auditFor(d, "topics", [id], 60)
      : [];
    return { ...t, lk, history, user };
  });
  if (!data) notFound();
  const { topic: t, user } = data;
  const canEdit = can(user.roles, "topics.edit");
  const canApprove = can(user.roles, "topics.approve");
  const base = `/onderwerpen/${id}`;

  return (
    <>
      <PageHeader
        title={<><span className="num text-muted font-normal">{t.code}</span> {t.title}</>}
        crumbs={[{ label: "Portfolio" }, { label: "Totale inventarisatie", href: "/inventarisatie" }, { label: `Pijler ${t.pillar_number}`, href: `/pijlers/${t.pillar_number}` }, { label: t.code }]}
        meta={<>
          <StatusBadge status={t.status} />
          <PriorityBadge category={t.priority_category} final={t.priority_category ? t.priority_is_final : undefined} />
          {[t.flag_legal && "Wettelijk verplicht", t.flag_hard_deadline && "Harde deadline", t.flag_acute_risk && "Acuut continuïteitsrisico",
            t.flag_admin_decided && "Bestuurlijk vastgesteld", t.flag_critical_dependency && "Kritische afhankelijkheid"].filter(Boolean).map((f) => <Badge key={String(f)} tone="accent">{f}</Badge>)}
          {t.archived_at && <Badge tone="neutral">Gearchiveerd</Badge>}
        </>}
        actions={canEdit && !t.archived_at ? <TopicActions topic={t} related={data.related} programs={data.lk.programs} /> : undefined}
      />
      {t.merged_into_id && (
        <p className="mb-4 rounded-md bg-info-bg px-3 py-2 text-sm text-info">Dit onderwerp is samengevoegd. <Link className="underline" href={`/onderwerpen/${t.merged_into_id}`}>Ga naar het samengevoegde onderwerp</Link>.</p>
      )}
      <TabLinks base={base} active={tab} tabs={[
        { key: "overzicht", label: "Overzicht" }, { key: "bewerken", label: "Bewerken" }, { key: "deepdive", label: "Deepdive" },
        { key: "volwassenheid", label: "Volwassenheid" }, { key: "prioriteit", label: "Prioriteit & haalbaarheid" },
        { key: "bronnen", label: "Bronnen", count: data.sources.length }, { key: "opmerkingen", label: "Opmerkingen", count: data.comments.length },
        { key: "historie", label: "Historie" },
      ]} />

      {tab === "overzicht" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2"><CardHeader title="Inhoud" /><CardBody>
            <DescriptionList items={[
              { label: "Omschrijving", value: <Text value={t.description} /> }, { label: "Aanleiding", value: <Text value={t.reason} /> },
              { label: "Probleemstelling", value: <Text value={t.problem_statement} /> }, { label: "Huidige situatie", value: <Text value={t.current_situation} /> },
              { label: "Gewenste situatie", value: <Text value={t.desired_situation} /> }, { label: "Beoogd resultaat", value: <Text value={t.intended_result} /> },
              { label: "Strategische bijdrage", value: <Text value={t.strategic_contribution} /> }, { label: "Risico bij niet uitvoeren", value: <Text value={t.risk_if_not_done} /> },
              { label: "Impact op dienstverlening", value: <Text value={t.service_impact} /> }, { label: "Afhankelijkheden", value: <Text value={t.dependencies_text} /> },
              { label: "Opmerkingen", value: <Text value={t.remarks} /> },
            ]} />
          </CardBody></Card>
          <div className="space-y-4">
            <Card><CardHeader title="Kenmerken" /><CardBody>
              <DescriptionList cols={1} items={[
                { label: "Pijler", value: <Link className="text-primary hover:underline" href={`/pijlers/${t.pillar_number}`}>{t.pillar_number}. {t.pillar_title}</Link> },
                { label: "Programma", value: t.program_id ? <Link className="text-primary hover:underline" href={`/programmas/${t.program_id}`}>{t.program_name}</Link> : <Text value={null} empty="Geen" /> },
                { label: "Subcategorie", value: <Text value={t.subcategory} /> },
                { label: "Verantwoordelijke", value: <Text value={t.owner_name} empty="Nog niet bepaald" /> },
                { label: "Type werkzaamheden", value: t.classifications.length ? t.classifications.join(", ") : <Text value={null} /> },
                { label: "Betrokken disciplines", value: t.disciplines.length ? data.lk.disciplines.filter((x) => t.disciplines.includes(x.id)).map((x) => x.name).join(", ") : <Text value={null} /> },
                { label: "Relevant", value: t.is_relevant === null ? <Text value={null} empty="Nog niet beoordeeld" /> : t.is_relevant ? "Ja" : "Nee" },
                { label: "Volwassenheid", value: <span className="flex flex-col gap-1"><Maturity level={t.maturity_current} />{t.maturity_target ? <span className="text-[12px] text-muted">Gewenst: {t.maturity_target} · {MATURITY_LABELS[t.maturity_target]}</span> : null}</span> },
                { label: "Wettelijke grondslag", value: <Text value={t.legal_basis} /> },
                { label: "Wettelijke deadline", value: fmtDate(t.legal_deadline, "Geen") },
                { label: "Benodigde capaciteit", value: fmtHours(t.required_capacity_hours, "Nog niet geraamd") },
                { label: "Benodigd budget", value: can(user.roles, "finance.view") || t.required_budget === null ? fmtEuro(t.required_budget, "Nog niet geraamd") : fmtEuro(t.required_budget) },
                { label: "Laatst gewijzigd", value: fmtDateTime(t.updated_at) },
              ]} />
            </CardBody></Card>
            {(data.projects.length > 0 || data.merged.length > 0 || data.splits.length > 0) && (
              <Card><CardHeader title="Relaties" /><CardBody className="space-y-2 text-sm">
                {data.projects.map((p) => <div key={p.id}>Project: <Link className="text-primary hover:underline" href={`/projecten/${p.id}`}>{p.number} {p.name}</Link> <StatusBadge status={p.status} /></div>)}
                {data.merged.map((m) => <div key={m.id}>Samengevoegd: <Link className="text-primary hover:underline" href={`/onderwerpen/${m.id}`}>{m.code} {m.title}</Link></div>)}
                {data.splits.map((m) => <div key={m.id}>Gesplitst naar: <Link className="text-primary hover:underline" href={`/onderwerpen/${m.id}`}>{m.code} {m.title}</Link></div>)}
              </CardBody></Card>
            )}
          </div>
        </div>
      )}

      {tab === "bewerken" && (
        <Card><CardBody>{canEdit ? <TopicForm topic={t as never} lookups={data.lk} /> : <p className="text-sm text-muted">U heeft alleen leesrechten.</p>}</CardBody></Card>
      )}

      {tab === "deepdive" && (
        <Card><CardHeader title="Inhoudelijke beoordeling (deepdive)" description="Antwoorden worden automatisch opgeslagen en waar mogelijk overgenomen in de onderwerpvelden." /><CardBody>
          <DeepdiveForm topicId={id} answers={data.assessment?.answers ?? {}} status={data.assessment?.status ?? null} canEdit={canEdit} canApprove={canApprove} />
          {data.assessment?.approved_at && <p className="mt-3 text-[13px] text-muted">Goedgekeurd door {data.assessment.approved_by_name} op {fmtDateTime(data.assessment.approved_at)}.</p>}
        </CardBody></Card>
      )}

      {tab === "volwassenheid" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <Card><CardHeader title="Volwassenheid vastleggen" /><CardBody>
            {canEdit ? <MaturityForm topicId={id} current={t.maturity_current} target={t.maturity_target} /> : <Maturity level={t.maturity_current} />}
          </CardBody></Card>
          <Card><CardHeader title="Eerdere metingen" /><CardBody>
            {data.maturity.length === 0 ? <p className="text-sm text-muted">Nog niet beoordeeld.</p> : (
              <ol className="space-y-3 text-[13px]">
                {data.maturity.map((m) => (
                  <li key={m.id} className="border-b border-line pb-2 last:border-0">
                    <div className="text-muted">{fmtDateTime(m.assessed_at)} · {m.by_name}</div>
                    <div><strong>{m.current_level}</strong> {MATURITY_LABELS[m.current_level]} → <strong>{m.target_level}</strong> {MATURITY_LABELS[m.target_level]} <span className="text-muted">(gap {m.target_level - m.current_level})</span></div>
                    {m.current_rationale && <p className="mt-0.5">Huidig: {m.current_rationale}</p>}
                    {m.target_rationale && <p>Gewenst: {m.target_rationale}</p>}
                  </li>
                ))}
              </ol>
            )}
          </CardBody></Card>
        </div>
      )}

      {tab === "prioriteit" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><CardHeader title="Markeringen verplicht en urgent" /><CardBody><FlagsForm topic={t as never} canEdit={canEdit} /></CardBody></Card>
          <Card><CardHeader title="Prioriteit" description="Wordt vastgesteld via prioriteringssessies" actions={<Link className="text-[13px] text-primary hover:underline" href="/prioritering">Naar prioritering</Link>} /><CardBody>
            <DescriptionList cols={2} items={[
              { label: "Categorie", value: <PriorityBadge category={t.priority_category} final={t.priority_category ? t.priority_is_final : undefined} /> },
              { label: "Score (ongerond)", value: fmtNumber(t.priority_score, "Nog niet beoordeeld") },
            ]} />
            {data.decisions.length > 0 && (
              <ul className="mt-4 space-y-2 text-[13px]">
                {data.decisions.map((d) => (
                  <li key={d.id} className="rounded border border-line p-2">
                    <div className="text-muted">{fmtDateTime(d.decided_at)} · {d.by_name}</div>
                    Definitief <strong>{d.final_category}</strong>{d.consensus_category ? ` (consensus ${d.consensus_category})` : ""}
                    {d.deviation_rationale && <p className="mt-1">Motivering: {d.deviation_rationale}</p>}
                  </li>
                ))}
              </ul>
            )}
          </CardBody></Card>
          <Card className="lg:col-span-2"><CardHeader title="Haalbaarheid" description="Los van de inhoudelijke prioriteit beoordeeld" /><CardBody>
            <FeasibilityForm topicId={id} latest={data.feasibility} canEdit={can(user.roles, "feasibility.edit")} />
          </CardBody></Card>
        </div>
      )}

      {tab === "bronnen" && <Card><CardHeader title="Bronnen en oorspronkelijke input" description="Meerdere reacties kunnen aan één onderwerp gekoppeld zijn. Oorspronkelijke input wordt nooit gewijzigd." /><CardBody><SourcesPanel topicId={id} sources={data.sources} canEdit={canEdit} /></CardBody></Card>}
      {tab === "opmerkingen" && <Card><CardBody><Comments entityType="topic" entityId={id} comments={data.comments} canAdd={can(user.roles, "comments.add")} /></CardBody></Card>}
      {tab === "historie" && <Card><CardHeader title="Wijzigingshistorie" /><CardBody><History entries={data.history} allowed={can(user.roles, "audit.view")} /></CardBody></Card>}
    </>
  );
}
