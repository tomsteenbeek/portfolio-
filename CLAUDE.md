# CLAUDE.md – ontwikkelregels

Lees eerst: PROJECT_CONTEXT.md, ARCHITECTURE.md, DATABASE_SCHEMA.md, SECURITY.md, DESIGN_SYSTEM.md.

## Functionele uitgangspunten (niet schenden)
- Onbekend is **nooit 0**: gebruik `NULL` en toon "Onbekend"/"Nog niet beoordeeld" (`src/lib/format.ts`).
- Verzin geen eigenaren, budgetten, capaciteit, prioriteiten, voortgang, KPI-waarden of huisstijlwaarden.
- Onderwerp ≠ project. Bundelen/omzetten is altijd een expliciete gebruikershandeling; onderwerpen blijven herleidbaar.
- Inhoudelijke prioriteit staat los van haalbaarheid/capaciteit. Verplichte/urgente initiatieven nooit wegfilteren op score of haalbaarheid.
- Reguliere werkzaamheden worden niet geprioriteerd als veranderinitiatief.
- Oorspronkelijke input en beoordelingen nooit overschrijven of verwijderen; gebruik revisies/archivering.
- Alle UI-teksten in het Nederlands; datums/getallen in `nl-NL`, bedragen in euro.
- Geen decoratieve knoppen: elke knop moet werken.

## Technische regels
- Data lezen/schrijven **alleen** via `db()` / `withUser()` (RLS actief). `asSystem()` uitsluitend voor authenticatie.
- Schrijven via server actions met Zod-validatie, `requirePermission()` en `run()` voor foutvertaling.
- Kolom- en tabelnamen in dynamische SQL alleen uit configuratie (`src/lib/registers.ts`), nooit uit invoer.
- Schemawijziging = nieuwe genummerde migratie in `db/migrations` (bestaande migraties niet aanpassen) + RLS-policy + eventueel audittrigger.
- Domeinwaarden synchroon houden tussen `src/lib/domain.ts` en database-`CHECK`s.
- Rekenlogica als pure functie in `src/lib` met unit-tests.
- Gebruik design tokens (Tailwind-klassen `bg-primary`, `text-muted`, …), geen losse hexkleuren in componenten.
- Toegankelijkheid: labels bij velden, focus zichtbaar, toetsenbordalternatief voor drag-and-drop, tabel bij grafieken.
- Geen secrets in code of `NEXT_PUBLIC_*`. Geen externe scripts/fonts (CSP).

## Commando's
`npm run dev` · `npm run db:setup` · `npm test` · `npm run typecheck` · `npm run lint`

## Veiligheid
Geen productie-implementatie, externe gegevensoverdracht of destructieve databasewijziging zonder expliciete toestemming.
