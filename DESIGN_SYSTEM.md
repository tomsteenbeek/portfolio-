# Design system

## Huisstijlonderzoek en bronnen

Gevraagd was de officiële huisstijl van https://gemeente.bodegraven-reeuwijk.nl/ te analyseren. **Vanuit de
ontwikkelomgeving was de website niet bereikbaar** (uitgaand netwerkverkeer naar dit domein werd door het netwerkbeleid
van de omgeving geweigerd). Er waren geen huisstijlbestanden in de projectdirectory.

Daarom zijn **geen officiële kleurcodes, lettertypen of logo's overgenomen of verzonnen**. Alle merkwaarden zijn
**neutrale aannames**, centraal configureerbaar:

| Wat | Waar | Aanname |
|---|---|---|
| Kleuren | `src/app/globals.css` (`:root`, blok *Merk*) | Rustig donker petrol als primaire kleur, leisteen als secundair, terracotta als spaarzaam accent |
| Typografie | `--font-sans` in `globals.css` | Systeemlettertype-stack met *Segoe UI* (standaard op gemeentelijke Windows-werkplekken); geen externe webfonts |
| Logo | `NEXT_PUBLIC_BRAND_LOGO` + `src/config/brand.ts` | Tekstlogo "DI" totdat Communicatie een goedgekeurd logobestand aanlevert |
| Teksten | `src/config/brand.ts` | Applicatienaam, organisatienaam |

**Actie voor de opdrachtgever:** vraag bij Communicatie de huisstijlhandleiding (kleurcodes, lettertype, logo-bestanden en
gebruiksregels) op en vervang de waarden in het blok *Merk*. Componenten hoeven daarvoor niet te worden aangepast.
Controleer na vervanging het contrast (WCAG AA, 4,5:1 voor tekst).

## Tokens

| Groep | Tokens |
|---|---|
| Merk | `--brand-primary`, `--brand-primary-hover`, `--brand-primary-soft`, `--brand-secondary`, `--brand-accent`, `--brand-accent-soft` |
| Achtergrond | `--bg`, `--surface`, `--surface-muted`, `--sidebar-bg` |
| Tekst | `--text`, `--text-muted` (≥ 4,5:1 op wit), `--text-subtle` |
| Randen | `--border`, `--border-strong` |
| Status | `--status-{green,amber,red,blue,gray}` + `-bg`; tekstkleuren getoetst op AA |
| Prioriteit | `--p1` … `--p4`: één tint, donker → licht (ordinale schaal); label P1–P4 altijd zichtbaar |
| Grafiek | `--chart-1`, `--chart-2` (gevalideerd op kleurenblindheid en contrast), `--chart-grid` |
| Typografie | `--font-sans`, `--font-heading`, `--font-mono`; cijfers met `tabular-nums` (`.num`) |
| Vorm | `--radius-sm` 4px, `--radius` 6px, `--radius-lg` 10px, `--shadow-card` |
| Spacing | Tailwind-schaal (4px-basis) |
| Focus | `--focus-ring` (2px outline, offset 2px) |

Tokens worden via `@theme inline` als Tailwind-klassen beschikbaar (`bg-primary`, `text-muted`, `border-line`, `bg-p1`, …).

## Vormgevingsprincipes

- Zakelijk en rustig: veel wit, één primaire kleur, accentkleur alleen voor markeringen (verplicht/urgent).
- Informatiehiërarchie: paginatitel 26px semibold, kaarttitels 15px, labels in kleine kapitalen voor kerncijfers.
- Statuskleuren altijd met tekst; nooit kleur als enige drager van betekenis.
- Onbekende waarden in gedempte tekst ("Onbekend", "Nog niet beoordeeld"), nooit 0.
- Presentatiemodus (`/presentatie/...`): geen navigatie, grotere typografie, voor beamer en directie.
- Printweergave: navigatie verborgen, tabellen volledig, pagina-afbreking waar nodig.

## Toegankelijkheid (WCAG 2.2 AA als ontwerpdoel)

Geïmplementeerd: semantische landmarks en kopstructuur, skip-link, zichtbare focus, toetsenbordbediening (ook kanban via
statusmenu en Gantt via pijltjestoetsen), labels en foutmeldingen gekoppeld aan velden, `aria-live` voor meldingen en
autosave, `aria-sort` in tabellen, tabelweergave bij grafieken, `prefers-reduced-motion`, native `<dialog>` (focus trap, Esc).

Nog uit te voeren: formele audit met screenreaders (NVDA/JAWS) en toegankelijkheidsverklaring; contrastcontrole na
invoering van de officiële huisstijl.
