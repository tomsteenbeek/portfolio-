import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { withUser } from "@/lib/db";
import { listTopics } from "@/server/queries/topics";
import { respond } from "@/server/export";

const LABELS: Record<string, string> = {
  code: "ID", title: "Titel", pillar: "Pijler", subcategory: "Subcategorie", program_name: "Programma", description: "Omschrijving",
  reason: "Aanleiding", current_situation: "Huidige situatie", desired_situation: "Gewenste situatie", problem_statement: "Probleemstelling",
  intended_result: "Beoogd resultaat", sources: "Bron", classifications: "Type werkzaamheden", owner_name: "Verantwoordelijke",
  disciplines: "Betrokken disciplines", strategic_contribution: "Strategische bijdrage", legal_basis: "Wettelijke grondslag",
  legal_deadline: "Wettelijke deadline", risk_if_not_done: "Risico bij niet uitvoeren", service_impact: "Impact op dienstverlening",
  dependencies_text: "Afhankelijkheden", maturity_current: "Volwassenheid (huidig)", maturity_target: "Volwassenheid (gewenst)",
  priority_category: "Prioriteit", priority_score: "Prioriteitsscore", flags: "Markeringen", required_capacity_hours: "Benodigde capaciteit (uur)",
  required_budget: "Benodigd budget (EUR)", status: "Status", remarks: "Opmerkingen", updated_at: "Laatst gewijzigd",
};

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Niet ingelogd", { status: 401 });
  const fd = await req.formData();
  const format = z.enum(["xlsx", "csv", "json", "html"]).catch("xlsx").parse(fd.get("format"));
  const ids = new Set(String(fd.get("ids") ?? "").split(",").filter(Boolean));
  let cols = String(fd.get("cols") ?? "").split(",").filter((c) => c in LABELS);
  if (!cols.length) cols = Object.keys(LABELS);
  if (cols.includes("maturity_current")) cols.splice(cols.indexOf("maturity_current") + 1, 0, "maturity_target");
  if (cols.includes("priority_category")) cols.splice(cols.indexOf("priority_category") + 1, 0, "priority_score");
  const rows = await withUser(user.id, (db) => listTopics(db, { includeArchived: true }));
  const data = rows.filter((r) => ids.size === 0 || ids.has(r.id)).map((r) => ({ ...r, pillar: `${r.pillar_number}. ${r.pillar_title}` }));
  return respond(format, "inventarisatie", "Totale inventarisatie onderwerpen", [
    { name: "Onderwerpen", columns: cols.map((k) => ({ key: k, label: LABELS[k], width: ["title", "description"].includes(k) ? 50 : undefined })), rows: data },
  ]);
}
