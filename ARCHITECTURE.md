# Architectuur

## Overzicht

```
Browser ──HTTPS──> Next.js 15 (App Router, React 19, TypeScript)
                    ├─ middleware.ts        sessiecontrole + securityheaders
                    ├─ Server Components    lezen data (per verzoek, RLS actief)
                    ├─ Server Actions       schrijven data (Zod-validatie + rechtencheck)
                    └─ Route handlers       export, auth (Entra OIDC), health
                          │  pg (node-postgres), één transactie per verzoek:
                          │  SET LOCAL ROLE app_user; set_config('app.user_id', …)
                          ▼
                    PostgreSQL 14+          RLS-policies, constraints, triggers (audit), migraties in SQL
```

## Keuzes en afwegingen

| Onderwerp | Keuze | Motivering |
|---|---|---|
| Framework | Next.js 15 + TypeScript + React 19 | Voorkeursstack; server components houden data en geheimen server-side |
| Styling | Tailwind CSS v4 met CSS-variabelen als design tokens | Configureerbare huisstijl zonder codewijzigingen in componenten |
| UI-componenten | Eigen lichte componentset in `src/components/ui` (shadcn-stijl) | Minder afhankelijkheden; volledig toegankelijk afgestemd (native `<dialog>`, echte formulieren) |
| Grafieken | Recharts + eigen SVG (matrix, maturity gap, Gantt) | Recharts waar het past; specifieke visualisaties vragen eigen, toetsenbordbedienbare SVG |
| Iconen | Lucide | Voorkeursstack |
| Validatie | Zod (server), database-constraints (laatste verdedigingslinie) | Dubbele borging |
| Database | **PostgreSQL via `pg`, niet via de Supabase-client** | Zie hieronder |
| Autorisatie | Rechtenmatrix in TS + **RLS in PostgreSQL** | Ook bij fouten in servercode lekt geen data |
| Auth (ontwikkeling) | Fictieve gebruikers + ondertekende sessiecookie (JWT HS256, httpOnly) | Snel testen per rol; uitgeschakeld in productie |
| Auth (productie) | Microsoft Entra ID via OIDC (authorization code + PKCE) | Gemeentelijke accounts; geen wachtwoorden in de app |
| Hosting | `output: "standalone"` + Dockerfile | Draait op Azure, on-premises of elk containerplatform |

### Waarom geen Supabase-client/-auth?

De opdracht noemt Supabase als voorkeur, maar ook *hostingonafhankelijkheid*, *Entra ID* en het uitgangspunt dat
externe hosting niet automatisch is toegestaan. Daarom:

- De app spreekt **standaard PostgreSQL**. Een Supabase-project kan als Postgres-host dienen (gebruik de
  connection string), maar ook Azure Database for PostgreSQL of een on-premises cluster.
- RLS gebruikt `app.uid()` (gezet per transactie) in plaats van `auth.uid()`. Bij gebruik van Supabase Auth kan
  `app.uid()` worden herschreven naar `auth.uid()`; de policies blijven gelijk.
- Er staat geen service-role key in de applicatie; de database-login heeft alleen het recht om `app_user` aan te nemen.

## Mappenstructuur

```
db/migrations/        SQL-migraties (schema, RLS, audit)
db/seed/data.ts       initiële inhoud (pijlers, onderwerpen, model, instellingen)
scripts/              migratie- en seedrunner
src/app/(app)/        schermen met navigatie (per module een map)
src/app/(present)/    presentatiemodus zonder navigatie (werksessies)
src/app/api/          export, Entra-auth, health
src/components/       UI-componenten per domein (ui, topics, priority, projects, …)
src/lib/              domeinlogica zonder I/O (prioriteit, capaciteit, haalbaarheid, statistiek), auth, db
src/server/actions/   server actions (schrijven)
src/server/queries/   leesqueries
tests/                unit- en database-integratietests
```

## Data- en autorisatiestroom

1. `middleware.ts` controleert de sessiecookie (anders → `/login`).
2. Een pagina roept `db((d, user) => …)` aan: één transactie als `app_user` met `app.user_id = user.id`.
3. RLS filtert/blokkeert; triggers zetten `created_by/updated_by` en schrijven de auditlog.
4. Server actions valideren met Zod en controleren `requirePermission(...)`; de database controleert opnieuw.
5. Databasefouten worden vertaald naar Nederlandse meldingen (`src/server/action.ts`).

## Rekenlogica (reproduceerbaar)

Pure functies in `src/lib` met unit-tests:
- `priority.ts` – score = Σ(score/5 × gewicht), classificatie op ongeronde score, bescherming verplichte initiatieven.
- `stats.ts` – gemiddelde, mediaan, spreiding, mate van overeenstemming.
- `feasibility.ts` – haalbaarheid (gemiddelde × 20) en kwadranten; beschermde initiatieven nooit in "uitstellen".
- `capacity.ts` – netto/verandercapaciteit, tekort, extra FTE; percentages één keer afgetrokken.

## Uitbreidbaarheid

- Nieuwe registers: één definitie in `src/lib/registers.ts` levert lijst, detail, formulier en validatie.
- Nieuwe importsoort: veld in `src/lib/import-config.ts` + mapping in `server/actions/import.ts`.
- Nieuwe rapportage: case in `src/app/api/export/report/route.ts`.
