/** Importsoorten en doelvelden. '*' = verplicht. */
export type ImportField = { key: string; label: string; required?: boolean; hint?: string };
export const IMPORT_KINDS: Record<string, { label: string; description: string; fields: ImportField[] }> = {
  medewerkersinput: {
    label: "Medewerkersinput",
    description: "Oorspronkelijke reacties worden ongewijzigd bewaard. Koppel optioneel per rij aan een onderwerp (ID zoals 2.01 of exacte titel). Meerdere reacties kunnen aan hetzelfde onderwerp gekoppeld worden.",
    fields: [
      { key: "summary", label: "Samenvatting / reactie", required: true },
      { key: "topic", label: "Onderwerp (ID of exacte titel)", hint: "Leeg = later koppelen" },
      { key: "pillar", label: "Pijler (nummer)", hint: "Alleen ter controle" },
    ],
  },
  onderwerpen: {
    label: "Strategische onderwerpen",
    description: "Nieuwe onderwerpen krijgen status 'Te valideren' en een automatisch ID binnen de pijler.",
    fields: [
      { key: "title", label: "Titel", required: true }, { key: "pillar", label: "Pijler (nummer 1–7)", required: true },
      { key: "description", label: "Omschrijving" }, { key: "reason", label: "Aanleiding" }, { key: "source_type", label: "Bron" },
      { key: "legal_basis", label: "Wettelijke grondslag" }, { key: "legal_deadline", label: "Wettelijke deadline (datum)" }, { key: "remarks", label: "Opmerkingen" },
    ],
  },
  projecten: {
    label: "Projectportfolio",
    description: "Projecten met primaire pijler; nieuwe projecten krijgen een projectnummer.",
    fields: [
      { key: "name", label: "Projectnaam", required: true }, { key: "pillar", label: "Primaire pijler (nummer)", required: true },
      { key: "status", label: "Status" }, { key: "start_date", label: "Startdatum" }, { key: "end_date", label: "Einddatum" },
      { key: "hours_required", label: "Benodigde uren" }, { key: "budget", label: "Budget" }, { key: "objective", label: "Doelstelling" },
    ],
  },
  formatie: {
    label: "Formatie en bezetting",
    description: "Posities per discipline. Neem alleen persoonsgegevens op als dat noodzakelijk is.",
    fields: [
      { key: "title", label: "Functie", required: true }, { key: "discipline", label: "Discipline (naam of code)", required: true },
      { key: "fte", label: "FTE", required: true }, { key: "kind", label: "Soort (formatie/inhuur)" }, { key: "occupancy", label: "Bezetting (Bezet/Vacature)" },
      { key: "subteam", label: "Subteam" }, { key: "annual_cost", label: "Jaarkosten" },
    ],
  },
  regulier: {
    label: "Reguliere werkzaamheden",
    description: "Structurele werkzaamheden als basis voor de capaciteitsberekening.",
    fields: [
      { key: "name", label: "Werkzaamheid", required: true }, { key: "pillar", label: "Pijler (nummer)" }, { key: "discipline", label: "Discipline" },
      { key: "frequency", label: "Frequentie" }, { key: "hours_per_occurrence", label: "Uren per uitvoering" }, { key: "hours_per_year", label: "Uren per jaar" },
      { key: "criticality", label: "Kritikaliteit" }, { key: "responsible_role", label: "Verantwoordelijke rol" }, { key: "backup_role", label: "Achtervang" },
    ],
  },
  risicos: {
    label: "Risico's",
    description: "Risico's komen binnen als 'Signaal' tenzij anders aangegeven.",
    fields: [
      { key: "title", label: "Titel", required: true }, { key: "category", label: "Categorie", required: true }, { key: "description", label: "Omschrijving" },
      { key: "likelihood", label: "Kans (1–5)" }, { key: "impact", label: "Impact (1–5)" }, { key: "pillar", label: "Pijler (nummer)" },
    ],
  },
};
