# Digitale Informatie | Strategie & Portfolio

Databasegestuurde managementapplicatie voor team Digitale Informatie van de gemeente Bodegraven-Reeuwijk:
strategische planning, jaarplan, gezamenlijke prioritering, portfolio-, project- en capaciteitsmanagement.

> Centraal thema 2027: **Van reactief beheer naar proactieve regie – een betrouwbare digitale basis voor een toekomstbestendige gemeente.**

## Status

| Fase | Inhoud | Status |
|---|---|---|
| 1 Fundament | Architectuur, design tokens, database + RLS + audit, authenticatie, navigatie, componenten, seed | Gereed |
| 2 Strategische inventarisatie | Dashboard, 7 pijlers, alle onderwerpen, detailpagina's, bewerken/toevoegen, import, volwassenheidsmodel, deepdive | Gereed |
| 3 Gezamenlijke prioritering | Model (versiebeheer), sessies, blind stemmen, resultaten, consensus, vaststelling, haalbaarheidsmatrix, besluitenregister | Gereed |
| 4 Portfolio & jaarplan | Programma's, projecten (tabbladen), kanban, afhankelijkheden, jaarplan met versies, Gantt-roadmap | Werkend, basis |
| 5 Formatie & capaciteit | Posities, scenario's, organogram, reguliere werkzaamheden, capaciteitsmodel en heatmap | Werkend, basis |
| 6 Professionalisering | Risico's (5×5), KPI's met metingen, leveranciers, wetgeving, exports, directieweergave | Werkend, basis |

Zie [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) voor vervolgstappen.

## Snel starten (ontwikkeling)

Vereisten: Node.js 20+ (getest met 22) en PostgreSQL 14+ (getest met 16).

```bash
npm install
```

```bash
cp .env.example .env.local
```

Start een database (één van beide):

```bash
docker compose up -d db
```

of gebruik een lokale PostgreSQL en maak de database aan:

```bash
createdb di_portfolio_dev
```

Pas `DATABASE_URL` in `.env.local` aan (bij Docker: `postgres://postgres:ontwikkel@localhost:5432/di_portfolio_dev`) en zet een `SESSION_SECRET` van minimaal 32 tekens. Daarna:

```bash
npm run db:setup
```

```bash
npm run dev
```

Open http://localhost:3000 en kies op het inlogscherm een **fictieve gebruiker** (één per rol). Deze ontwikkel-login is in productie uitgeschakeld.

## Scripts

| Script | Doel |
|---|---|
| `npm run dev` | Ontwikkelserver |
| `npm run build` / `npm start` | Productiebuild / starten (output `standalone`) |
| `npm run db:migrate` | SQL-migraties uit `db/migrations` uitvoeren (idempotent, geregistreerd in `schema_migrations`) |
| `npm run db:seed` | Idempotente seed: pijlers, onderwerpen, rollen, model, instellingen, voorbeelddefinities |
| `npm run db:setup` | Migreren + seeden |
| `npm test` | Unit- en integratietests (integratie alleen met `TEST_DATABASE_URL`) |
| `npm run test:db:setup` | Testdatabase (`.env.test`) migreren en seeden |
| `npm run test:integration` | Databasetests voor RLS, constraints en audit |
| `npm run typecheck` / `npm run lint` | Statische controles |

Testdatabase eenmalig aanmaken:

```bash
createdb di_portfolio_test && npm run test:db:setup
```

```bash
TEST_DATABASE_URL=postgres://postgres@localhost:5432/di_portfolio_test npm test
```

## Configuratie per omgeving

- **Ontwikkeling**: `.env.local` (op basis van `.env.example`), `AUTH_MODE=dev`, fictieve gebruikers.
- **Test**: `.env.test` (in git, zonder geheimen), eigen database `di_portfolio_test`.
- **Productie**: zie `.env.production.example`; geheimen uitsluitend via de secret store van het platform. `AUTH_MODE=entra`, `SEED_DEV_USERS=false`.

## Documentatie

| Document | Inhoud |
|---|---|
| [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) | Organisatorische context, uitgangspunten, terminologie |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Architectuur, keuzes en afwijkingen van de voorkeursstack |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | Datamodel, ERD, RLS, audit en rekenregels |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | Design tokens, huisstijl-aannames, toegankelijkheid |
| [SECURITY.md](SECURITY.md) | Beveiliging, privacy, hosting, Entra ID, compliance-afbakening |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | Fasering, status, backlog |
| [CLAUDE.md](CLAUDE.md) | Ontwikkelregels voor (AI-)ontwikkelaars |

## Belangrijke opmerkingen

- **Aantal onderwerpen**: de opdracht noemt 120 onderwerpen, maar de opsomming bevat er **122** (13+18+19+20+15+17+20). Alle 122 zijn opgenomen.
- **Huisstijl**: logo, golfvormen en merkkleuren zijn afgeleid uit het officiële presentatiesjabloon (`Huisstijl_.pdf`). Officiële kleurcodes, lettertype en logogebruiksregels zijn nog te verifiëren bij Communicatie (zie DESIGN_SYSTEM.md).
- **Geen fictieve inhoud**: er zijn geen eigenaren, budgetten, capaciteit, prioriteiten, voortgang of KPI-waarden verzonnen. Onbekend wordt als "Onbekend" / "Nog niet beoordeeld" getoond, nooit als 0.
- **Medewerkersinput**: er was geen Excel-bestand met oorspronkelijke input aanwezig. De importfunctie (Beheer → Import en export → Medewerkersinput) bewaart rijen ongewijzigd en koppelt ze herleidbaar aan onderwerpen.
