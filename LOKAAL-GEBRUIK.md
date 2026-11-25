# Lokaal gebruiken op je eigen computer (Windows)

Met deze opzet draait het dashboard én de database op je eigen laptop. Er gaat niets naar een externe clouddienst.
De code komt van GitHub; nieuwe versies haal je op door opnieuw te starten.

## Eenmalig installeren

1. **Docker Desktop** – https://www.docker.com/products/docker-desktop/
   Installeren, opnieuw opstarten als daarom wordt gevraagd en Docker Desktop één keer openen.
   *Op een gemeentelijke laptop heb je hiervoor mogelijk de ICT-servicedesk nodig (beheerrechten, WSL 2).*
2. **GitHub Desktop** – https://desktop.github.com/ (of Git voor Windows)
   Log in met je GitHub-account.
3. **Repository ophalen**: in GitHub Desktop: *File → Clone repository →* `tomsteenbeek/portfolio-`.
   Kies een map, bijvoorbeeld `Documenten\GitHub\portfolio-`.

## Dagelijks gebruik

| Wat | Hoe |
|---|---|
| **Starten** | Start Docker Desktop. Dubbelklik daarna op **`start.bat`** in de projectmap. Het dashboard opent vanzelf op http://localhost:3000 |
| **Inloggen** | Kies een fictieve gebruiker, bijvoorbeeld *Robin Teamleider* (alle rechten van de teamleider) |
| **Stoppen** | Dubbelklik op **`stop.bat`**. Je gegevens blijven bewaard |
| **Back-up maken** | Dubbelklik op **`backup.bat`**. Er komt een bestand in de map `backups` |
| **Back-up terugzetten** | Dubbelklik op **`herstel.bat`** (zet de nieuwste back-up terug, na bevestiging met JA) |

- De **eerste start** duurt enkele minuten: de app wordt gebouwd en de database ingericht met de 7 pijlers en 122 onderwerpen.
- **Nieuwe versie**: `start.bat` haalt bij elke start automatisch de nieuwste versie van GitHub op en werkt de database bij.
  Je eigen gegevens blijven daarbij behouden.
- Het dashboard is **alleen bereikbaar vanaf je eigen computer** (niet vanaf het netwerk).

## Veelgestelde vragen

**"Docker Desktop draait nog niet."** Open Docker Desktop en wacht tot het opgestart is; dubbelklik daarna opnieuw op `start.bat`.

**Poort 3000 is bezet.** Een ander programma gebruikt poort 3000. Stop dat programma, of wijzig in `docker-compose.yml`
`"127.0.0.1:3000:3000"` naar bijvoorbeeld `"127.0.0.1:3001:3000"` en open dan http://localhost:3001.

**Helemaal opnieuw beginnen (alle gegevens wissen).** Maak eerst een back-up. Voer daarna in een opdrachtvenster in de
projectmap uit: `docker compose down -v` en start opnieuw met `start.bat`.

**Waar staan mijn gegevens?** In een Docker-volume (`di-portfolio_dbdata`) op je computer. Maak regelmatig een back-up
en bewaar die op een veilige plek, bijvoorbeeld je gemeentelijke OneDrive.

**macOS of Linux?** Gebruik `./start.sh` in plaats van `start.bat`; stoppen met `docker compose stop`.

## Let op

- Dit is een lokale werkomgeving met **fictieve gebruikers** en zonder echte authenticatie. Gebruik geen persoonsgegevens of
  vertrouwelijke beveiligingsinformatie zolang de omgeving niet formeel is getoetst (zie SECURITY.md).
- Voor gebruik door meerdere collega's hoort de applicatie op een server binnen het gemeentelijk netwerk of een goedgekeurde
  cloudomgeving, met inloggen via Microsoft Entra ID. Dezelfde Docker-opzet is daarvoor de basis.
