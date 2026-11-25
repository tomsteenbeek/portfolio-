# Architectuur

> Huidige variant: **statische site (GitHub Pages) + Supabase**, demo zonder login.
> De serverversie (Next.js-server + PostgreSQL, Entra ID-voorbereiding, Docker) staat op de branch `server-versie`.

## Overzicht

```
Browser ──HTTPS──> GitHub Pages            statische HTML/JS (Next.js 15, output: export)
   │
   └──HTTPS──> Supabase REST (rol anon)    POST /rest/v1/rpc/di_sql | di_batch | di_demo_users
                     │
                     ▼
               public.di_sql(q, params, as_user)   SECURITY DEFINER, eigenaar app_user
                     │  set app.user_id = as_user (demorol)
                     ▼
               PostgreSQL                  RLS-policies, constraints, triggers, auditlog
```

## Keuzes

| Onderwerp | Keuze | Motivering |
|---|---|---|
| Hosting | GitHub Pages (statisch) | Gratis, gekoppeld aan GitHub, geen server nodig |
| Database | Supabase (PostgreSQL) | Wens opdrachtgever; zelfde schema als de serverversie |
| Datatoegang | Twee generieke databasefuncties die SQL uitvoeren **als `app_user`** | De bestaande queries, acties en alle rechtenregels (RLS) konden ongewijzigd blijven; directe tabeltoegang via de Supabase-API is afgesloten |
| Login | Geen; demorol in de browser (localStorage) | Expliciete wens: demo en eigen gebruik |
| Exports/import | In de browser (exceljs, papaparse) | Geen server beschikbaar |
| Publicatie | GitHub Actions: typecheck + unit-tests → migraties + seed op Supabase → build → Pages | Eén handeling (push) houdt site en database gelijk |
| Routes | Detailpagina's met zoekparameters (`/onderwerpen/detail/?id=…`) | Statische export kan geen dynamische paden voor later aangemaakte gegevens maken |

## Mappen

```
db/migrations/        SQL-migraties (0005: browsertoegang, 0006: uitgestelde controle)
db/seed/data.ts       initiële inhoud
scripts/              migratie, seed, lokale Supabase-nabootsing (dev-gateway.mjs)
src/app/(app)/        schermen (client-side geladen via <AsyncPage>)
src/app/(present)/    presentatiemodus
src/components/       UI per domein
src/lib/db.ts         databasekoppeling via Supabase REST
src/lib/auth/         demorol en rechtenmatrix
src/server/actions/   acties (draaien nu in de browser; naam historisch)
src/server/queries/   leesqueries
src/server/reports.ts rapportages en exports
.github/workflows/    publicatie naar GitHub Pages
```

## Hoe een scherm laadt
1. `UserGate` laadt de demorol (`di_demo_users`) – standaard de teamleider.
2. `AsyncPage` voert de laadfunctie van het scherm uit; die roept `db((d, user) => …)` aan.
3. `d.query(sql, params)` stuurt de SQL en parameters naar `di_sql`; de database vult parameters veilig in,
   voert uit als `app_user` met `app.user_id` = demorol en geeft de rijen als JSON terug.
4. Na een wijziging roept een actie `refreshData()` aan; het scherm wordt opnieuw opgehaald.
5. Acties die samen moeten slagen (nieuwe modelversie, capaciteit vaststellen) gebruiken `d.batch()` = één transactie.

## Rekenlogica
Ongewijzigd: pure functies in `src/lib` (prioriteit, statistiek, haalbaarheid, capaciteit) met unit-tests.

## Terug naar een servervariant
Voor gebruik met echte gemeentelijke gegevens: branch `server-versie` (Next.js-server, Entra ID, Docker/Azure).
Het databaseschema is gelijk; migraties 0005/0006 zijn daar niet nodig (maar ook niet schadelijk als de functies niet
worden blootgesteld).
