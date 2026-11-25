# Digitale Informatie | Strategie & Portfolio

Dashboard voor strategie, eigenaarschap, projecten/initiatieven, jaarplan en roadmap van team
Digitale Informatie (gemeente Bodegraven-Reeuwijk).

> Centraal thema 2027: **Van reactief beheer naar proactieve regie – een betrouwbare digitale basis voor een toekomstbestendige gemeente.**

## Opzet: GitHub Pages + Supabase (demo zonder login)

| Onderdeel | Rol |
|---|---|
| **GitHub** | Code; bij elke wijziging op `main` publiceert GitHub Actions de site automatisch |
| **GitHub Pages** | Toont het dashboard (statische pagina's) op `https://<gebruikersnaam>.github.io/<repository>/` |
| **Supabase** | PostgreSQL-database; de browser leest en schrijft via twee beveiligde databasefuncties |

**Wat erin zit:** de 7 strategische pijlers met per pijler de onderwerpen (werk in uitvoering, met één eigenaar),
ambities 2027 per kwartaal, KPI's, en projecten/initiatieven die op het I&A-bord in Planner worden bijgehouden maar hier
aan pijlers en onderwerpen worden gekoppeld. Daarnaast Team (eigenaren/trekkers en hun belasting), Jaarplan en Roadmap.

Er is **geen login en geen rollen**: iedereen werkt als *Team Digitale Informatie*.

> ⚠️ **Alleen voor demo en eigen gebruik met fictieve of niet-gevoelige gegevens.** Zonder login kan iedereen met de
> link gegevens bekijken en wijzigen. Zie [SECURITY.md](SECURITY.md). De volledige serverversie (met Entra ID-voorbereiding,
> geschikt voor gemeentelijke hosting) staat op de branch **`server-versie`**.

## Eenmalig instellen (± 15 minuten)

### 1. Supabase-project
1. Ga naar https://supabase.com, log in en kies **New project**.
2. Naam bijvoorbeeld `portfolio`, regio **Central EU (Frankfurt)**, kies een databasewachtwoord en **bewaar dat**.
3. Noteer, als het project klaar is:
   - **Project URL** en **publishable key** (of *anon key*): *Project Settings → API Keys* (de URL ook via *Connect*).
   - **Connection string**: knop **Connect** → **Session pooler** → kopieer de URI en vervang `[YOUR-PASSWORD]` door je wachtwoord.

### 2. GitHub Pages aanzetten
1. GitHub Pages voor een **privé**-repository vraagt een betaald account (GitHub Pro). Met een gratis account maak je de
   repository **openbaar**: *Settings → General → Danger Zone → Change visibility*. De code bevat geen wachtwoorden.
2. *Settings → Pages → Build and deployment → Source*: kies **GitHub Actions**.

### 3. Gegevens van Supabase aan GitHub geven
*Settings → Secrets and variables → Actions*:

| Tabblad | Naam | Waarde |
|---|---|---|
| **Variables** | `SUPABASE_URL` | Project URL, bv. `https://abcd1234.supabase.co` |
| **Variables** | `SUPABASE_ANON_KEY` | publishable key (`sb_publishable_…`) of anon key |
| **Secrets** | `SUPABASE_DB_URL` | de Session pooler connection string mét wachtwoord |

### 4. Publiceren
*Actions → Publiceren op GitHub Pages → Run workflow*. Na enkele minuten staat het dashboard op
`https://<gebruikersnaam>.github.io/<repository>/` (de link staat ook bij de afgeronde workflow).

De eerste keer richt de workflow de database in: tabellen, rechtenregels, de 7 pijlers, 122 onderwerpen en de fictieve
demogebruikers. Bij volgende publicaties wordt de database alleen bijgewerkt; jouw gegevens blijven behouden.

## Dagelijks gebruik
- Open de link: het dashboard toont de pijlers; klik door naar een pijler, onderwerp, KPI of project en pas aan.
  Alles wordt direct opgeslagen in Supabase.
- **Team**: voeg teamleden (vast of inhuur) toe onder *Team*. Zij verschijnen als keuze bij eigenaar en trekker.
- **Eigenaar** van een onderwerp: klik in *Onderwerpen* op de eigenaar, of selecteer meerdere onderwerpen en kies een eigenaar.
  Naast teamleden kun je kiezen voor *Geen persoon beschikbaar* of *Geen capaciteit (nog niet toe te wijzen)*.
- **Ambities 2027 per kwartaal**: open een pijler → *Pijler bewerken* → Q1 t/m Q4. Het dashboard toont ze als matrix.
- **Projecten & initiatieven**: plak de link naar Planner; koppel pijlers en onderwerpen.
- **Exports** (Excel, CSV, JSON, Print/PDF) worden in je browser gemaakt.
- **Back-up**: Supabase maakt dagelijks back-ups (gratis plan: beperkte bewaartijd). Extra zekerheid: exports, of
  `pg_dump` met de connection string.
- **Gratis Supabase pauzeert** na een week zonder gebruik. Het dashboard meldt dan dat de database niet bereikbaar is;
  zet het project in Supabase weer aan (*Restore project*). Je gegevens blijven bewaard.

## Teamleden en projecten uit het I&A-bord laden
Namen staan bewust **niet** in deze (openbare) repository. Ze worden eenmalig in Supabase gezet met een SQL-script
(*SQL Editor → New query → plakken → Run*). Het script is herhaalbaar: teamleden worden op naam en projecten op
Planner-taak-id bijgewerkt in plaats van dubbel aangemaakt. Teamleden kun je daarna ook in het scherm *Team* beheren.

> Let op: wat in de database staat is zonder login zichtbaar voor iedereen met de link van de site.

## Lokaal ontwikkelen
Vereisten: Node.js 22 en PostgreSQL (lokaal of Supabase).

```bash
npm install
```

Met een lokale PostgreSQL (database `di_portfolio_dev`) en een nabootsing van de Supabase-API:

```bash
npm run db:setup
```

```bash
npm run dev:gateway
```

```bash
npm run dev
```

Zet in `.env.local`: `DATABASE_URL=postgres://postgres@localhost:5432/di_portfolio_dev`,
`NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321` en `NEXT_PUBLIC_SUPABASE_ANON_KEY=lokaal`. Zie `.env.example`.

## Scripts

| Script | Doel |
|---|---|
| `npm run dev` | Ontwikkelserver (http://localhost:3000) |
| `npm run build` | Statische site bouwen in `out/` |
| `npm run db:migrate` / `db:seed` / `db:setup` | Migraties, seed (idempotent), of beide |
| `npm run dev:gateway` | Lokale nabootsing van de Supabase-API (poort 54321) |
| `npm test` | Unit- en database-integratietests (integratie met `TEST_DATABASE_URL`) |
| `npm run test:e2e` | Rooktest van alle schermen per rol (Playwright) |
| `npm run typecheck` / `npm run lint` | Statische controles |

## Documentatie

| Document | Inhoud |
|---|---|
| [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) | Organisatorische context, uitgangspunten, terminologie |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Architectuur en keuzes |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | Datamodel, ERD, rechtenregels, audit |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | Huisstijl (afgeleid uit het sjabloon), tokens, toegankelijkheid |
| [SECURITY.md](SECURITY.md) | Beveiliging, demo-risico's, weg naar gemeentelijke hosting |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | Fasering en vervolg |
| [CLAUDE.md](CLAUDE.md) | Ontwikkelregels |

## Opmerkingen
- De opdracht noemt 120 onderwerpen; de opsomming bevat er **122**. Alle 122 zijn opgenomen.
- Er zijn geen eigenaren, budgetten, capaciteit, prioriteiten, voortgang of KPI-waarden verzonnen. Onbekend wordt als
  "Onbekend" of "Nog niet beoordeeld" getoond, nooit als 0.
