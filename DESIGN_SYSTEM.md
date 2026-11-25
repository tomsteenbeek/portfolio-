# Design system

## Huisstijl: bron en werkwijze

**Bron:** het officiële presentatiesjabloon van de gemeente (`Huisstijl_.pdf`, aangeleverd door de opdrachtgever op
25-11-2026). De gemeentelijke website was vanuit de ontwikkelomgeving niet bereikbaar.

Het sjabloon bevat het logo en de kenmerkende golfvormen, maar geen kleurcodes, lettertypen of gebruiksregels. De
beelden in de PDF zijn rasterafbeeldingen met een transparantiemasker. De kleuren zijn daarom **gemeten op de weergave
van het sjabloon** (render op 300 dpi, mediaan per tint):

| Kleur | Waarde | Gebruik in de applicatie |
|---|---|---|
| Blauw (woordmerk) | `#3e7ab4` | Logo, merkaccenten, prioriteit P2, volwassenheid 4. Contrast op wit 4,5:1 |
| Groen | `#52b67a` | Alleen decoratief (merklijn); te licht voor tekst |
| Geel | `#dee271` | Alleen decoratief; basis voor het lichtgele markeringsvlak |
| Lichtgroen | `#94c24d` | Alleen decoratief |
| Lichtblauw | `#399fd5` | Alleen decoratief |

Voor bedieningselementen en tekst worden **AA-veilige tinten uit dezelfde kleurfamilies** gebruikt: primair
`#2f6aa3` (5,7:1), donkerblauw `#1c4a7a`, donkergroen `#1f6b40` (6,5:1). Het merkblauw zelf haalt op lichte vlakken
(actieve tab, actief menu-item) geen 4,5:1, vandaar deze afleiding.

| Element | Bestand | Herkomst |
|---|---|---|
| Logo (beeldmerk + woordmerk) | `public/brand/logo.png` | Uitgesneden uit het sjabloon (raster, 900 px breed) |
| Beeldmerk (ingeklapte zijbalk) | `public/brand/logo-mark.png` | Uitsnede van het logo |
| Golfvormen | `public/brand/waves.jpg` | Achtergrond van het sjabloon, zonder logo (inlogscherm) |

**Nog te verifiëren bij Communicatie:** officiële kleurcodes (de gemeten waarden kunnen enkele tinten afwijken), het
lettertype van het woordmerk (voorlopig systeemlettertype *Segoe UI*), vectorversies van het logo (SVG/EPS) en de
gebruiksregels (vrije ruimte, minimale grootte, gebruik op gekleurde achtergronden). Vervang dan de bestanden in
`public/brand/` (zelfde namen) en de waarden in het blok *Merkpalet* in `src/app/globals.css`.

## Tokens

| Groep | Tokens |
|---|---|
| Merkpalet | `--brand-blue`, `--brand-green`, `--brand-yellow`, `--brand-lime`, `--brand-sky` (gemeten in sjabloon) |
| Toepassing | `--brand-primary` (+ `-hover`, `-soft`), `--brand-secondary`, `--brand-accent` (+ `-soft`, `-ring`) voor markering verplicht/urgent |
| Achtergrond | `--bg`, `--surface`, `--surface-muted`, `--sidebar-bg` |
| Tekst | `--text`, `--text-muted` (≥ 4,5:1 op wit), `--text-subtle` |
| Randen | `--border`, `--border-strong` |
| Status | `--status-{green,amber,red,blue,gray}` + `-bg`; tekstkleuren getoetst op AA |
| Prioriteit | `--p1` … `--p4`: merkblauw, donker → licht (ordinale schaal); label P1–P4 altijd zichtbaar |
| Grafiek | `--chart-1`, `--chart-2` (gevalideerd op kleurenblindheid en contrast), `--chart-grid` |
| Typografie | `--font-sans`, `--font-heading`, `--font-mono`; cijfers met `tabular-nums` (`.num`) |
| Vorm | `--radius-sm` 4px, `--radius` 6px, `--radius-lg` 10px, `--shadow-card` |
| Spacing | Tailwind-schaal (4px-basis) |
| Focus | `--focus-ring` (2px outline, offset 2px) |

Tokens worden via `@theme inline` als Tailwind-klassen beschikbaar (`bg-primary`, `text-muted`, `border-line`, `bg-p1`, …).

## Vormgevingsprincipes

- Zakelijk en rustig: veel wit, merkblauw als primaire kleur, lichte zijbalk met logo. De golfkleuren alleen decoratief (merklijn bovenaan, inlogscherm); het gele vlak alleen voor markeringen (verplicht/urgent).
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
