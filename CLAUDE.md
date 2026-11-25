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
- Variant op `main`: **statische site (GitHub Pages) + Supabase, zonder login**. Geen servercode, API-routes, middleware
  of `"use server"`; alles draait in de browser. Serverversie: branch `server-versie`.
- Data lezen/schrijven **alleen** via `db()` / `withUser()` uit `@/lib/auth/current-user` en `@/lib/db` (→ `public.di_sql`,
  uitgevoerd als `app_user`, RLS actief). Meerdere opdrachten die samen moeten slagen: `d.batch()`.
- Schermen: `"use client"` + `<AsyncPage render={async (sp) => …} />`; detailpagina's via zoekparameters
  (`/onderwerpen/detail/?id=…`, `/pijlers/detail/?nr=…`). Na een wijziging `refreshData()`.
- Interne links via `next/link` of `router.push` (houden rekening met het basispad); afbeeldingen via `asset()`.
- Schrijfacties: Zod-validatie, `requirePermission()` (demorol) en `run()` voor foutvertaling.
- Kolom- en tabelnamen in dynamische SQL alleen uit configuratie (`src/lib/registers.ts`), nooit uit invoer.
- Schemawijziging = nieuwe genummerde migratie in `db/migrations` (bestaande niet aanpassen) + RLS-policy + audittrigger.
  De publicatieworkflow voert migraties automatisch uit op Supabase.
- Domeinwaarden synchroon houden tussen `src/lib/domain.ts` en database-`CHECK`s.
- Rekenlogica als pure functie in `src/lib` met unit-tests.
- Design tokens gebruiken (Tailwind-klassen), geen losse hexkleuren in componenten.
- Toegankelijkheid: labels bij velden, zichtbare focus, toetsenbordalternatief voor drag-and-drop, tabel bij grafieken.
- Nooit het databasewachtwoord of een Supabase service-role key in de code of in `NEXT_PUBLIC_*`.

## Commando's
`npm run dev` · `npm run dev:gateway` · `npm run db:setup` · `npm test` · `npm run typecheck` · `npm run lint` · `npm run build`

## Veiligheid
Geen productie-implementatie, externe gegevensoverdracht of destructieve databasewijziging zonder expliciete toestemming.
