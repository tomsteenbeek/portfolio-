# Beveiliging en privacy

> Dit document beschrijft **technische maatregelen**. Het is geen verklaring van naleving. De applicatie voldoet niet
> automatisch aan AVG, BIO2, NIS2/Cyberbeveiligingswet of andere kaders; dat vraagt een formele toetsing (o.a. DPIA,
> BIV-classificatie, risicoanalyse, verwerkersafspraken) door de gemeentelijke CISO, FG/privacy officer en architectuur.

## Technische maatregelen

| Maatregel | Implementatie |
|---|---|
| Authenticatie | Productie: Microsoft Entra ID (OIDC, authorization code + PKCE, nonce, state, ID-tokenvalidatie via JWKS). Ontwikkeling: fictieve gebruikers, uitgeschakeld bij `NODE_ENV=production` |
| Sessies | Ondertekende JWT (HS256) in `httpOnly`, `SameSite=Lax`, `Secure` (productie) cookie; 8 uur geldig |
| Toegang | Alleen vooraf geregistreerde, actieve gebruikers; geen automatische accountaanmaak |
| Autorisatie | Rechtenmatrix in server actions **en** Row Level Security in PostgreSQL (zie DATABASE_SCHEMA.md) |
| Least privilege DB | App-login neemt per transactie rol `app_user` aan; geen superuser/service-role key in de app |
| Invoervalidatie | Zod op alle server actions; database-constraints als tweede laag; geparametriseerde queries (geen SQL-injectie); kolomnamen uitsluitend uit configuratie |
| CSRF | Server actions met origin-controle (Next.js); cookies `SameSite=Lax` |
| Headers | CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS (productie), `poweredByHeader` uit |
| Exports | Met rechten van de gebruiker (RLS); formule-injectie in CSV/Excel geneutraliseerd |
| Import | Max. 10 MB / 5.000 rijen, alleen xlsx/csv/json, preview zonder opslag, expliciete bevestiging |
| Bijlagen | Geen bestandsopslag in de app; alleen verwijzingen (https) naar goedgekeurde documentopslag |
| Logging | Auditlog van inhoudelijke wijzigingen, statuswijzigingen, prioriteringsbesluiten en autorisatiewijzigingen; niet wijzigbaar via de app |
| Geheimen | Alleen server-side omgevingsvariabelen; niets met `NEXT_PUBLIC_` behalve het logo-pad |

## Privacy

- **Dataminimalisatie**: gebruikers hebben alleen naam, e-mail, discipline en functie. Formatieposities kunnen zonder
  persoonskoppeling worden vastgelegd; koppelen is optioneel en alleen zinvol als het noodzakelijk is.
- **Afscherming**: individuele formatie- en kostengegevens alleen voor teamleider, admin en management.
- **Medewerkersinput**: wordt ongewijzigd bewaard voor herleidbaarheid; neem geen namen van respondenten op in importbestanden
  tenzij daar een grondslag voor is.
- **Bewaartermijnen**: nog vast te stellen (bv. auditlog, gearchiveerde onderwerpen, importbatches). Aanbevolen: periodieke
  opschoontaak na vaststelling door informatiebeheer.
- Ontwikkelomgeving bevat uitsluitend fictieve gebruikers (`@voorbeeld.test`) en niet-gevoelige gegevens.

## Hosting en leveranciersafhankelijkheid

De applicatie is hostingonafhankelijk (Node.js-proces of container + PostgreSQL). **Supabase is alleen een technische
ontwikkelkeuze** en niet vereist. Gebruik van externe hosting of verwerking van gemeentelijke gegevens is niet
automatisch toegestaan.

Aanbevolen productiealternatief (na toetsing):
- **Azure Container Apps of App Service (Linux, container)** in een Nederlandse/EU-regio (West Europe), privé-netwerk/VNet.
- **Azure Database for PostgreSQL – Flexible Server** met private endpoint, TLS verplicht, geautomatiseerde back-ups
  (point-in-time restore) en geo-redundantie volgens BIA.
- **Azure Key Vault** voor `SESSION_SECRET`, `ENTRA_CLIENT_SECRET` en databasewachtwoord.
- **Entra ID**: app-registratie, redirect-URI `https://<host>/api/auth/entra/callback`, optioneel Conditional Access/MFA.
- Logging naar de gemeentelijke SIEM (applicatie- en databaselogs).

### Database-account in productie

```sql
create role di_app_login login password '<uit secret store>';
grant app_user to di_app_login;   -- mag uitsluitend app_user aannemen
```

Migraties draaien met een apart beheeraccount (eigenaar van het schema), niet met het applicatie-account.
Migratie 0004 geeft het verbindingsaccount zelf het recht om `app_user` aan te nemen (PostgreSQL 16 vereist daarvoor
expliciet SET-recht); lukt dat niet, dan stopt de migratie met de exacte `GRANT` die een beheerder moet uitvoeren.

### Lokale Docker-installatie

`docker-compose.yml` publiceert de app alleen op `127.0.0.1` (niet bereikbaar vanaf het netwerk) en de database helemaal
niet. De ontwikkel-login met fictieve gebruikers staat daar bewust aan (`ALLOW_DEV_LOGIN=true`); gebruik deze opzet dus
niet ongewijzigd op een server die voor anderen bereikbaar is.

## Back-up en herstel

- Productie: platform-back-ups (PITR) + periodieke `pg_dump` naar gemeentelijke opslag; hersteltest minimaal jaarlijks.
- Ontwikkeling: `pg_dump di_portfolio_dev > backup.sql`.

## Entra ID instellen

1. App-registratie in de gemeentelijke tenant (single tenant), platform *Web*, redirect-URI zoals hierboven.
2. Client secret aanmaken (in Key Vault), scopes `openid profile email`.
3. Omgevingsvariabelen: `AUTH_MODE=entra`, `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET`, `APP_BASE_URL`.
4. Registreer gebruikers (Beheer → Gebruikers) met hun gemeentelijk e-mailadres; bij eerste login wordt de Entra object-id gekoppeld.

## Bekende beperkingen / vervolg

- Geen rate limiting op applicatieniveau (adviseer via reverse proxy/WAF).
- CSP staat `'unsafe-inline'` toe voor scripts/styles (Next.js-hydratie); nonce-gebaseerde CSP is een vervolgstap.
- Geen automatische virusscan van imports (bestanden worden niet opgeslagen, alleen geparsed).
- Penetratietest en formele toetsing nog uit te voeren vóór productiegebruik.
