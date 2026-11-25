# Implementatieplan

## Fasering en status

### Fase 1 – Fundament ✅
- Analyse: lege projectdirectory; geen bestaande architectuur of huisstijlbestanden.
- Next.js 15 + TypeScript + Tailwind v4, PostgreSQL-schema met migraties, RLS, audit, seed.
- Ontwikkel-login (fictieve gebruikers per rol), Entra ID-voorbereiding (OIDC).
- Inklapbare sidebar conform navigatiestructuur, breadcrumbs, globale zoekfunctie, herbruikbare componenten.

### Fase 2 – Strategische inventarisatie ✅
- Managementdashboard (KPI-kaarten, 7 pijlerkaarten, grafieken, risico's, deadlines, besluiten, tekorten) + directieweergave.
- Pijlerdetail met alle gevraagde onderdelen (tabbladen), bewerkbaar.
- Totale inventarisatie: zoeken, sorteren, filteren, groeperen, kolommen, inline bewerken, bulkacties, toevoegen,
  dupliceren, archiveren, export, opgeslagen weergaven, paginering.
- Onderwerpdetail: bewerken, deepdive (15 vragen), volwassenheid (met historie), markeringen, bronnen/oorspronkelijke
  input, opmerkingen, historie; samenvoegen, splitsen, bundelen, omzetten naar project.
- Deepdive-module per pijler: doorlopen, autosave, snel toevoegen, goedkeuren, niet-relevant, maturity gap, hervatten,
  presentatiemodus.
- Import (Excel/CSV/JSON) met preview, kolomkoppeling, duplicaatdetectie en bevestiging.

### Fase 3 – Gezamenlijke prioritering ✅
- Configureerbaar model met specifieke rubric per criterium, versiebeheer, som = 100% (UI + database).
- Sessies (naam, omschrijving, items, deelnemers, periode, status, modelversie), blind individueel beoordelen (in database
  afgedwongen), revisies, resultaten (gemiddelde, mediaan, min/max, spreiding, n, onderbouwingen, verschillen per
  discipline, mate van overeenstemming), consensus, definitieve vaststelling met verplichte motivering, presentatiemodus.
- Markeringen verplicht/urgent met onderbouwing; beschermd tegen uitsluiten op score.
- Haalbaarheidsbeoordeling (7 dimensies, blokkerende tekorten) en interactieve matrix.
- Besluitenregister met koppelingen; uitgestelde/afgewezen initiatieven zichtbaar.

### Fase 4 – Projectportfolio en jaarplan (basis werkend)
Gereed: programma's, projecten met tabbladen (overzicht, planning, team, financiën, risico's, acties, besluiten, voortgang),
stoplichten, kanban (drag-and-drop + toetsenbord), afhankelijkheden (cyclusdetectie, conflictsignalering), jaarplan
(configureerbaar jaar, statussen, versies, initiatieven toevoegen, print), Gantt-roadmap (drag-and-drop, filters,
mijlpalen, wettelijke deadlines, gepland vs vastgesteld).
Vervolg: afhankelijkheidspijlen in de Gantt, programma-mijlpalen in roadmap, rapportagetemplates in gemeentelijke opmaak.

### Fase 5 – Formatie en capaciteit (basis werkend)
Gereed: posities (formatie, bezetting, vacature, inhuur), scenario's (FTE, kosten, verschillen, ontbrekende expertise,
kwetsbaarheden), organogram, reguliere werkzaamheden, configureerbare rekenaannames, vastgestelde capaciteitsplanning,
heatmap per kwartaal × discipline, scenario-doorrekening, uitvoerbaarheid initiatieven.
Vervolg: capaciteit per medewerker en per pijler, competentieniveaus per positie (UI voor `position_skills`), budgetregels-UI.

### Fase 6 – Verdere professionalisering (basis werkend)
Gereed: risicoregister met 5×5-matrix (configureerbare drempels), KPI's met metingen en trend, leveranciers, wet- en
regelgeving, exports (Excel/CSV/JSON/print-PDF) voor alle gevraagde rapportages, directieweergave.
Vervolg: risicomaatregelen-UI, notificaties per e-mail/Teams, nonce-CSP, rate limiting, toegankelijkheidsaudit,
Playwright-testsuite in CI, opschoontaken bewaartermijnen.

## Testen

- Unit: prioriteit, statistiek, haalbaarheid, capaciteit (`tests/*.test.ts`).
- Integratie (database): RLS per rol, blind stemmen, constraints, audit, onveranderlijke input (`tests/rls.integration.test.ts`).
- Handmatig/E2E uitgevoerd tijdens ontwikkeling: alle pagina's per rol; volledige prioriteringsflow; deepdive-autosave;
  inline bewerken; import medewerkersinput; export; project → kanban → roadmap.

## Openstaande keuzes voor de opdrachtgever

1. Huisstijl verifiëren bij Communicatie: officiële kleurcodes, lettertype, vectorlogo en gebruiksregels (nu afgeleid uit het presentatiesjabloon).
2. Hostingomgeving en toetsing (CISO/FG) vóór gebruik met echte gegevens.
3. Bevestigen of de 122 onderwerpen (i.p.v. 120) correct zijn.
4. Excel met oorspronkelijke medewerkersinput importeren (Beheer → Import en export).
5. Vaststellen bewaartermijnen voor auditlog en gearchiveerde gegevens.
