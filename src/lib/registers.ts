/**
 * Configuratie van generieke registers (besluiten, risico's, KPI's, enz.).
 * Eén definitie stuurt databasekolommen, validatie, formulieren en tabellen.
 * Kolomnamen komen uitsluitend uit deze configuratie (nooit uit invoer).
 */
import type { Permission } from "@/lib/auth/permissions";
import {
  CRITICALITY, DECISION_BODIES, DECISION_OUTCOMES, ESCALATION, FREQUENCIES, POTENTIAL, PROGRAM_STATUSES, RISK_CATEGORIES, RISK_STAGES,
} from "@/lib/domain";

export type RefKind = "pillars" | "users" | "disciplines" | "projects" | "programs" | "topics" | "scenarios";
export type FieldDef = {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "date" | "select" | "bool" | "ref" | "url" | "score";
  options?: readonly string[];
  ref?: RefKind;
  required?: boolean;
  min?: number;
  max?: number;
  hint?: string;
  list?: boolean;
  wide?: boolean;
  section?: string;
};
export type RegisterDef = {
  key: string;
  table: string;
  title: string;
  singular: string;
  description: string;
  path: string;
  group: string;
  editPerm: Permission;
  createPerm?: Permission;
  viewPerm?: Permission;
  titleField: string;
  numberField?: string;
  orderBy: string;
  archivable: boolean;
  fields: FieldDef[];
  emptyText?: string;
};

export const REGISTERS: Record<string, RegisterDef> = {
  decisions: {
    key: "decisions", table: "decisions", title: "Besluitenregister", singular: "besluit", group: "Portfolio",
    description: "Transparante, herleidbare besluitvorming – inclusief bewust uitgestelde of afgewezen initiatieven en waarom.",
    path: "/besluiten", editPerm: "decisions.edit", titleField: "subject", numberField: "number", orderBy: "created_at desc", archivable: true,
    fields: [
      { name: "subject", label: "Onderwerp", type: "text", required: true, list: true, wide: true },
      { name: "outcome", label: "Status / besluit", type: "select", options: DECISION_OUTCOMES, required: true, list: true },
      { name: "decision_body", label: "Besluitvormend orgaan", type: "select", options: DECISION_BODIES, list: true },
      { name: "decision_date", label: "Besluitdatum", type: "date", list: true, hint: "Verplicht zodra het besluit niet meer openstaat." },
      { name: "responsible_user_id", label: "Verantwoordelijke", type: "ref", ref: "users", list: true },
      { name: "reason", label: "Aanleiding", type: "textarea", section: "Voorstel" },
      { name: "proposed_decision", label: "Voorgestelde beslissing", type: "textarea", section: "Voorstel" },
      { name: "alternatives", label: "Alternatieven", type: "textarea", section: "Voorstel" },
      { name: "financial_consequences", label: "Financiële consequenties", type: "textarea", section: "Consequenties" },
      { name: "capacity_consequences", label: "Capaciteitsconsequenties", type: "textarea", section: "Consequenties" },
      { name: "risks", label: "Risico's", type: "textarea", section: "Consequenties" },
      { name: "decision_text", label: "Besluit", type: "textarea", section: "Besluit" },
      { name: "rationale", label: "Onderbouwing", type: "textarea", section: "Besluit" },
      { name: "follow_up", label: "Vervolgacties", type: "textarea", section: "Besluit" },
      { name: "pillar_id", label: "Strategische pijler", type: "ref", ref: "pillars", section: "Koppelingen", list: true },
      { name: "program_id", label: "Programma", type: "ref", ref: "programs", section: "Koppelingen" },
      { name: "project_id", label: "Project", type: "ref", ref: "projects", section: "Koppelingen" },
      { name: "topic_id", label: "Onderwerp (initiatief)", type: "ref", ref: "topics", section: "Koppelingen" },
      { name: "scenario_id", label: "Formatievoorstel / scenario", type: "ref", ref: "scenarios", section: "Koppelingen" },
    ],
  },
  risks: {
    key: "risks", table: "risks", title: "Risicoregister", singular: "risico", group: "Governance",
    description: "Centraal risicoregister met 5×5-matrix. Onderscheid tussen signalen, gevalideerde en geaccepteerde risico's.",
    path: "/risicos", editPerm: "risks.create", titleField: "title", numberField: "number", orderBy: "coalesce(residual_score, gross_score) desc nulls last, created_at desc", archivable: true,
    fields: [
      { name: "title", label: "Titel", type: "text", required: true, list: true, wide: true },
      { name: "category", label: "Risicocategorie", type: "select", options: RISK_CATEGORIES, required: true, list: true },
      { name: "stage", label: "Status", type: "select", options: RISK_STAGES, required: true, list: true },
      { name: "pillar_id", label: "Pijler", type: "ref", ref: "pillars", list: true },
      { name: "project_id", label: "Project", type: "ref", ref: "projects" },
      { name: "process", label: "Proces", type: "text" },
      { name: "description", label: "Omschrijving", type: "textarea", wide: true },
      { name: "cause", label: "Oorzaak", type: "textarea", section: "Analyse" },
      { name: "consequence", label: "Gevolg", type: "textarea", section: "Analyse" },
      { name: "likelihood", label: "Kans (1–5)", type: "score", min: 1, max: 5, section: "Bruto", list: true },
      { name: "impact", label: "Impact (1–5)", type: "score", min: 1, max: 5, section: "Bruto", list: true },
      { name: "existing_controls", label: "Bestaande beheersmaatregelen", type: "textarea", section: "Netto" },
      { name: "residual_likelihood", label: "Restkans (1–5)", type: "score", min: 1, max: 5, section: "Netto" },
      { name: "residual_impact", label: "Restimpact (1–5)", type: "score", min: 1, max: 5, section: "Netto" },
      { name: "proposed_measures", label: "Voorgestelde maatregelen", type: "textarea", section: "Netto" },
      { name: "owner_user_id", label: "Risico-eigenaar", type: "ref", ref: "users", section: "Opvolging", list: true },
      { name: "deadline", label: "Deadline", type: "date", section: "Opvolging" },
      { name: "escalation_level", label: "Escalatieniveau", type: "select", options: ESCALATION, section: "Opvolging" },
      { name: "is_confidential", label: "Vertrouwelijk (alleen zichtbaar voor teamleider, management, eigenaar)", type: "bool", section: "Opvolging",
        hint: "Gebruik voor gevoelige beveiligingsinformatie." },
    ],
  },
  kpis: {
    key: "kpis", table: "kpis", title: "KPI's", singular: "KPI", group: "Overzicht",
    description: "KPI's gekoppeld aan pijlers en onderwerpen. Er zijn geen waarden of nulmetingen verzonnen; vul ze in zodra ze bekend zijn.",
    path: "/kpis", editPerm: "registers.edit", titleField: "name", orderBy: "name", archivable: true,
    fields: [
      { name: "name", label: "KPI-naam", type: "text", required: true, list: true, wide: true },
      { name: "pillar_id", label: "Pijler", type: "ref", ref: "pillars", list: true },
      { name: "topic_id", label: "Onderwerp", type: "ref", ref: "topics", list: true, hint: "Optioneel: koppel de KPI aan een specifiek onderwerp." },
      { name: "owner_name", label: "Eigenaar", type: "text", list: true },
      { name: "unit", label: "Eenheid", type: "text", list: true },
      { name: "direction", label: "Richting", type: "select", options: ["Hoger is beter", "Lager is beter"], required: true },
      { name: "description", label: "Omschrijving", type: "textarea", wide: true },
      { name: "definition", label: "Definitie", type: "textarea", section: "Meting" },
      { name: "measurement_method", label: "Meetmethode", type: "textarea", section: "Meting" },
      { name: "baseline_value", label: "Nulmeting", type: "number", section: "Meting", hint: "Leeg laten tot er een echte nulmeting is." },
      { name: "baseline_date", label: "Datum nulmeting", type: "date", section: "Meting" },
      { name: "target_value", label: "Streefwaarde", type: "number", section: "Meting", list: true },
      { name: "frequency", label: "Meetfrequentie", type: "select", options: ["Maandelijks", "Per kwartaal", "Halfjaarlijks", "Jaarlijks"], section: "Meting" },
    ],
  },
  recurring: {
    key: "recurring", table: "recurring_activities", title: "Reguliere werkzaamheden", singular: "werkzaamheid", group: "Organisatie",
    description: "Het basispakket aan structurele werkzaamheden. Dit vormt de basis van de capaciteitsberekening en wordt niet geprioriteerd als veranderinitiatief.",
    path: "/reguliere-werkzaamheden", editPerm: "registers.edit", titleField: "name", orderBy: "name", archivable: true,
    fields: [
      { name: "name", label: "Werkzaamheid", type: "text", required: true, list: true, wide: true },
      { name: "pillar_id", label: "Pijler", type: "ref", ref: "pillars", list: true },
      { name: "discipline_id", label: "Discipline", type: "ref", ref: "disciplines", list: true },
      { name: "description", label: "Omschrijving", type: "textarea", wide: true },
      { name: "frequency", label: "Frequentie", type: "select", options: FREQUENCIES, section: "Uren", list: true },
      { name: "hours_per_occurrence", label: "Geschatte uren per uitvoering", type: "number", section: "Uren" },
      { name: "occurrences_per_year", label: "Aantal uitvoeringen per jaar", type: "number", section: "Uren", hint: "Wordt voorgesteld op basis van de frequentie." },
      { name: "hours_per_year", label: "Geschatte uren per jaar", type: "number", section: "Uren", list: true, hint: "Leeg = uren per uitvoering × aantal per jaar." },
      { name: "responsible_role", label: "Verantwoordelijke rol", type: "text", section: "Borging", list: true },
      { name: "backup_role", label: "Achtervang", type: "text", section: "Borging", list: true },
      { name: "criticality", label: "Kritikaliteit", type: "select", options: CRITICALITY, section: "Borging", list: true },
      { name: "is_legal_obligation", label: "Wettelijke verplichting", type: "bool", section: "Borging" },
      { name: "dependencies", label: "Afhankelijkheden", type: "textarea", section: "Borging" },
      { name: "automation_potential", label: "Mogelijkheid tot automatisering", type: "select", options: POTENTIAL, section: "Verbeterpotentieel" },
      { name: "outsourcing_potential", label: "Mogelijkheid tot uitbesteding", type: "select", options: POTENTIAL, section: "Verbeterpotentieel" },
      { name: "quality_indicators", label: "Kwaliteitsindicatoren", type: "textarea", section: "Verbeterpotentieel" },
    ],
  },
  suppliers: {
    key: "suppliers", table: "suppliers", title: "Leveranciers", singular: "leverancier", group: "Governance",
    description: "Leveranciers, contracten en securitybeoordeling (leveranciersregie).",
    path: "/leveranciers", editPerm: "registers.edit", titleField: "name", orderBy: "name", archivable: true,
    fields: [
      { name: "name", label: "Naam", type: "text", required: true, list: true },
      { name: "services", label: "Diensten / applicaties", type: "textarea", list: true, wide: true },
      { name: "contract_owner", label: "Contracteigenaar", type: "text", list: true },
      { name: "contract_end", label: "Einde contract", type: "date", list: true },
      { name: "criticality", label: "Kritikaliteit", type: "select", options: CRITICALITY, list: true },
      { name: "has_processing_agreement", label: "Verwerkersovereenkomst aanwezig", type: "bool" },
      { name: "security_assessment", label: "Securitybeoordeling", type: "textarea" },
      { name: "notes", label: "Opmerkingen", type: "textarea" },
    ],
  },
  regulations: {
    key: "regulations", table: "regulatory_requirements", title: "Wet- en regelgeving", singular: "verplichting", group: "Governance",
    description: "Relevante wet- en regelgeving en normenkaders met deadlines. Registratie betekent niet dat de gemeente aantoonbaar voldoet.",
    path: "/wetgeving", editPerm: "registers.edit", titleField: "name", orderBy: "deadline nulls last, name", archivable: false,
    fields: [
      { name: "name", label: "Naam", type: "text", required: true, list: true, wide: true },
      { name: "authority", label: "Toezichthouder / bron", type: "text", list: true },
      { name: "pillar_id", label: "Pijler", type: "ref", ref: "pillars", list: true },
      { name: "status", label: "Status", type: "select", options: ["Te analyseren", "In uitvoering", "Geïmplementeerd", "Niet van toepassing"], list: true },
      { name: "effective_date", label: "Inwerkingtreding", type: "date" },
      { name: "deadline", label: "Deadline", type: "date", list: true },
      { name: "reference_url", label: "Referentie (URL)", type: "url" },
      { name: "description", label: "Omschrijving", type: "textarea", wide: true },
      { name: "notes", label: "Opmerkingen", type: "textarea", wide: true },
    ],
  },
  programs: {
    key: "programs", table: "programs", title: "Programma's", singular: "programma", group: "Portfolio",
    description: "Programma's bundelen samenhangende onderwerpen en projecten binnen een pijler.",
    path: "/programmas", editPerm: "programs.edit", titleField: "name", numberField: "code", orderBy: "code", archivable: true,
    fields: [
      { name: "code", label: "Code", type: "text", required: true, list: true },
      { name: "name", label: "Naam", type: "text", required: true, list: true, wide: true },
      { name: "pillar_id", label: "Pijler", type: "ref", ref: "pillars", required: true, list: true },
      { name: "status", label: "Status", type: "select", options: PROGRAM_STATUSES, required: true, list: true },
      { name: "owner_user_id", label: "Eigenaar", type: "ref", ref: "users", list: true },
      { name: "start_date", label: "Startdatum", type: "date" },
      { name: "end_date", label: "Einddatum", type: "date" },
      { name: "description", label: "Omschrijving", type: "textarea", wide: true },
      { name: "objective", label: "Doelstelling", type: "textarea", wide: true },
    ],
  },
  skills: {
    key: "skills", table: "skills", title: "Expertise en competenties", singular: "competentie", group: "Organisatie",
    description: "Benodigde expertise per discipline. Kritische competenties zonder borging zijn een kwetsbaarheid.",
    path: "/expertise", editPerm: "staffing.edit", titleField: "name", orderBy: "name", archivable: false,
    fields: [
      { name: "name", label: "Competentie / expertise", type: "text", required: true, list: true, wide: true },
      { name: "discipline_id", label: "Discipline", type: "ref", ref: "disciplines", list: true },
      { name: "is_critical", label: "Kritische expertise", type: "bool", list: true },
      { name: "description", label: "Omschrijving", type: "textarea", wide: true },
    ],
  },
};

export function getRegister(key: string): RegisterDef {
  const r = REGISTERS[key];
  if (!r) throw new Error(`Onbekend register: ${key}`);
  return r;
}
