# Beveiliging en privacy

> Dit document beschrijft technische maatregelen; het is geen verklaring van naleving van AVG, BIO2, NIS2 of andere
> kaders. Daarvoor is formele toetsing nodig (CISO, FG/privacy officer, architectuur).

## Huidige variant: demo zonder login (GitHub Pages + Supabase)

**Bewuste keuze van de opdrachtgever:** demo en eigen gebruik, geen login.

### Wat dat betekent
- Iedereen met de link kan het dashboard openen, **gegevens lezen en wijzigen**, en elke demorol kiezen.
- De Supabase publishable/anon key staat (zoals bij elke Supabase-site) in de JavaScript van de pagina.
- Gebruik daarom **uitsluitend fictieve of niet-gevoelige gegevens**: geen persoonsgegevens, geen vertrouwelijke
  beveiligingsinformatie, geen interne financiële gegevens.
- Deel de link alleen met mensen die hem nodig hebben.

### Wat wél is afgedwongen
| Maatregel | Hoe |
|---|---|
| Geen directe tabeltoegang via de Supabase-API | Rechten voor `anon`/`authenticated` op tabellen, reeksen en functies zijn ingetrokken (migratie 0005) |
| Alles draait als `app_user` | `di_sql`/`di_batch` zijn SECURITY DEFINER met eigenaar `app_user`; Row Level Security, constraints en triggers gelden volledig per demorol |
| Geen schema- of rolwijzigingen | `app_user` kan geen tabellen/functies/rollen aanmaken of wijzigen; `SET ROLE` is in een security-definer-functie onmogelijk |
| Auditlog | Alle wijzigingen worden gelogd met de gekozen demorol; de log is niet wijzigbaar |
| Geen SQL-injectie via invoer | Parameters worden in de database met `quote_literal` ingevuld |
| Tijdslimiet | 15 s per opdracht (60 s per batch) |
| Geheimen | Databasewachtwoord alleen als GitHub-secret voor de migratiestap; nooit in de site |

### Restrisico's (geaccepteerd voor deze demo)
- Kwaadwillenden met de link kunnen gegevens wijzigen of verwijderen binnen de rechten van een demorol, of de database
  belasten. Herstel: Supabase-back-up, of opnieuw seeden.
- De tijdslimiet kan binnen een opdracht worden aangepast; zware opdrachten kunnen het gratis project tijdelijk vertragen.
- De migratiestap verbindt versleuteld met Supabase, maar zonder certificaatcontrole (`DATABASE_SSL_VERIFY=false`);
  voor productie het Supabase-CA-bestand gebruiken.
- Supabase en GitHub draaien op Amerikaanse cloudinfrastructuur (data in EU-regio).

## Naar productie bij de gemeente
Gebruik de branch **`server-versie`**: Next.js-server, inloggen via Microsoft Entra ID, Row Level Security per echte
gebruiker, Docker-image voor Azure of on-premises, securityheaders (CSP, HSTS). Zie de SECURITY.md op die branch voor
hostingadvies (Azure Container Apps + Azure Database for PostgreSQL in West Europe, Key Vault), back-up en Entra-instelling.

## Privacy
- Alleen fictieve demogebruikers (`@voorbeeld.test`).
- Formatieposities kunnen zonder persoonskoppeling worden vastgelegd.
- Importbestanden met medewerkersinput: verwijder namen van respondenten zolang deze demo-omgeving wordt gebruikt.
