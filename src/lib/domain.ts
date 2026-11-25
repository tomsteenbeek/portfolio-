/** Gedeelde domeinwaarden (gelijk aan de CHECK-constraints in de database). */

export const TOPIC_STATUSES = ["Te valideren", "In beoordeling", "Gevalideerd", "Niet relevant", "Samengevoegd", "Gesplitst", "Omgezet naar project"] as const;

export const WORK_TYPES = ["Regulier beheer", "Wettelijke verplichting", "Risicobeheersing", "Randvoorwaardelijk", "Optimalisatie", "Innovatie"] as const;

export const SOURCE_TYPES = ["Medewerkersinput", "Managementvoorstel", "Wettelijke verplichting", "Externe ontwikkeling", "Directiebesluit", "Overige bron", "Nog te valideren"] as const;

export const PROJECT_STATUSES = ["Idee", "Te onderzoeken", "In voorbereiding", "Ter besluitvorming", "Goedgekeurd", "Gepland", "In uitvoering",
  "Geblokkeerd", "Gepauzeerd", "Afgerond", "Geannuleerd"] as const;

export const RAG = ["groen", "oranje", "rood"] as const;
export const RAG_DIMENSIONS = [
  { key: "rag_time", label: "Tijd" },
  { key: "rag_money", label: "Geld" },
  { key: "rag_scope", label: "Scope" },
  { key: "rag_quality", label: "Kwaliteit" },
  { key: "rag_capacity", label: "Capaciteit" },
  { key: "rag_risk", label: "Risico" },
] as const;

export const PROGRAM_STATUSES = ["Concept", "Actief", "Gepauzeerd", "Afgerond", "Geannuleerd"] as const;
export const SESSION_STATUSES = ["Concept", "Open voor beoordeling", "Bespreking", "Afgerond"] as const;
export const ANNUAL_PLAN_STATUSES = ["Concept", "In bespreking", "Ter besluitvorming", "Vastgesteld", "In uitvoering", "Geëvalueerd"] as const;

export const RISK_CATEGORIES = ["Informatiebeveiliging", "Privacy", "Continuïteit", "Financieel", "Personeel", "Leveranciers", "Technisch",
  "Wet- en regelgeving", "Dienstverlening", "Reputatie"] as const;
export const RISK_STAGES = ["Signaal", "Gevalideerd", "Geaccepteerd", "Gesloten"] as const;
export const ESCALATION = ["Team", "Afdeling", "Directie", "Bestuur"] as const;

export const DECISION_BODIES = ["Teamleider", "MT", "Directie", "College van B&W", "Gemeenteraad", "Stuurgroep", "Overig"] as const;
export const DECISION_OUTCOMES = ["Openstaand", "Akkoord", "Akkoord met wijzigingen", "Uitgesteld", "Afgewezen", "Ingetrokken"] as const;

export const FREQUENCIES = ["Dagelijks", "Wekelijks", "Maandelijks", "Per kwartaal", "Halfjaarlijks", "Jaarlijks", "Doorlopend", "Ad hoc"] as const;
export const CRITICALITY = ["Laag", "Midden", "Hoog", "Kritiek"] as const;
export const POTENTIAL = ["Geen", "Beperkt", "Gemiddeld", "Groot"] as const;

export const MATURITY_LEVELS = [
  { level: 1, label: "Ad hoc", description: "Werk gebeurt incidenteel en persoonsafhankelijk; geen vaste afspraken." },
  { level: 2, label: "Reactief", description: "Er wordt gehandeld als er iets misgaat; beperkte documentatie." },
  { level: 3, label: "Gestandaardiseerd", description: "Processen en verantwoordelijkheden zijn beschreven en worden gevolgd." },
  { level: 4, label: "Beheerst", description: "Er wordt gestuurd op meetbare resultaten; risico's zijn beheerst." },
  { level: 5, label: "Geoptimaliseerd", description: "Continu verbeteren op basis van data; proactief en toekomstgericht." },
] as const;

export const DEEPDIVE_QUESTIONS = [
  { key: "q1", label: "Is dit onderwerp relevant voor onze gemeente?", hint: "Begin met 'Ja' of 'Nee' en licht kort toe." },
  { key: "q2", label: "Wat is de huidige situatie?" },
  { key: "q3", label: "Wat gaat goed?" },
  { key: "q4", label: "Welke knelpunten bestaan er?" },
  { key: "q5", label: "Wat is de gewenste situatie?" },
  { key: "q6", label: "Wat willen we eind 2027 hebben gerealiseerd?" },
  { key: "q7", label: "Wat willen we op langere termijn realiseren?" },
  { key: "q8", label: "Welke concrete resultaten zijn nodig?" },
  { key: "q9", label: "Welke acties of projecten zijn nodig?" },
  { key: "q10", label: "Wat gebeurt er als we niets doen?" },
  { key: "q11", label: "Welke afhankelijkheden zijn er?" },
  { key: "q12", label: "Welke expertise is nodig?" },
  { key: "q13", label: "Hoeveel capaciteit is nodig?", hint: "Indicatie in uren of fte; vul het exacte getal in bij 'Benodigde capaciteit'." },
  { key: "q14", label: "Welke vakafdelingen moeten betrokken worden?" },
  { key: "q15", label: "Wie is eigenaar?" },
] as const;
