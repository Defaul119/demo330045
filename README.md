# COS30045 Demo 3 — Incarceration in developed countries

Three linked pages built with D3 v7 and SVG, following the patterns from the Week 4–8 labs, and checked against the Week 8 accessibility standards.

| Page | Based on | What it shows | Interaction |
|---|---|---|---|
| `index.html` | Reference Visualisation 1 (Metrocosm bubble map) | Bubble map of the prison population of the 40 developed economies, with a side bar chart of the U.S. vs all others combined | Hover/Tab tooltips on bubbles and bars, arrow keys between bubbles, linked highlighting between map and bars, zoom (scroll, drag, + / − / Reset, World / Europe / East Asia presets) |
| `states.html` | Reference Visualisation 4 (Prison Policy Initiative ranking) | Horizontal bar chart ranking the 50 U.S. states, the U.S. national rate and the 39 other developed countries by incarceration rate | Hover tooltips, "Show all 90 / Show top 60" toggle, "Find a state" dropdown with a live summary, one tab stop + ↑ / ↓ / Home / End keys |
| `women.html` | Reference Visualisation 6 (Prison Policy Initiative half sunburst) | Half sunburst of the 93,000 women held in U.S. local jails: who they are held for → convicted or not → offence type → offence | Hover/Tab tooltips with path highlighting, click or Enter to zoom into a branch, breadcrumb and centre click to zoom out, arrow keys move around the rings |

## Run it

D3 loads CSV/JSON with `fetch`, so the pages must be served (opening the file directly will not load the data):

```bash
cd demo3
python3 -m http.server 8000
# open http://localhost:8000
```

(or use VS Code Live Server, as in the labs)

## Folder structure

```
demo3/
├── index.html, states.html, women.html
├── css/base.css, css/visualisation.css
├── js/
│   ├── vendor/d3.v7.min.js, vendor/topojson-client.min.js
│   ├── shared-constants.js   sizes, colours, scales, formats (Week 6 pattern)
│   ├── tooltip.js            reusable SVG tooltip (Week 6 tooltip)
│   ├── bubble-map.js         map, bubbles, labels, d3.zoom
│   ├── prison-bar.js         U.S. vs all-others stacked bar
│   ├── load-data-map.js      Promise.all(d3.json, d3.csv) for index.html
│   ├── state-ranking.js      ranked bar chart + controls
│   ├── load-data-states.js   d3.csv for states.html
│   ├── sunburst.js           half sunburst: d3.stratify, d3.partition, d3.arc, zoom
│   ├── load-data-women.js    d3.csv for women.html
│   └── resize.js             Week 8 rule-of-three text scaling
├── data/
│   ├── developed-prison-population.csv   ← made by prep/prepare_data.py
│   ├── states-vs-countries.csv           ← made by prep/prepare_data.py
│   ├── women-in-jails-2024.csv           hierarchy (id, parent, name, value, branch) for women.html
│   ├── countries-110m.json               world map (TopoJSON)
│   └── raw/                              original downloads (see below)
└── prep/prepare_data.py   the "KNIME step": joins, filters and aggregates the raw data
```

Re-create the two CSVs with `python3 prep/prepare_data.py`.

## Data sources

| File | Source |
|---|---|
| `data/raw/prison-population-rate.csv` | World Prison Brief via Our World in Data, prisoners per 100,000 people (provided) |
| `data/raw/owid-population.csv` | Our World in Data, population by country and year — https://ourworldindata.org/grapher/population |
| `data/raw/ppi-state-incarceration-rates-2024.csv` | Prison Policy Initiative, *States of Incarceration: The Global Context 2024* — https://www.prisonpolicy.org/global/2024.html (state rates taken from the page's chart data) |
| `data/raw/developed-countries.csv` | IMF "advanced economies" list (Puerto Rico excluded as a U.S. territory), with ISO codes and hand-entered bubble positions (latitude/longitude) |
| `data/women-in-jails-2024.csv` | Prison Policy Initiative, *Women's Mass Incarceration: The Whole Pie 2024* — https://www.prisonpolicy.org/reports/pie2024women.html (numbers copied from the report's chart of women in jails) |
| `data/countries-110m.json` | Natural Earth 1:110m via world-atlas — https://github.com/topojson/world-atlas |

## Method notes

- **People in prison** = latest rate × population ÷ 100,000. Population is for the rate's year, or 2023 (the latest available) when the rate is from 2024–2026. These are estimates.
- **Bubble area** (not radius) is proportional to the number of prisoners (`d3.scaleSqrt`, Week 2). Bubbles keep their on-screen size while zooming so overlapping European bubbles separate. Tiny countries get a 3 px minimum radius so they can be hovered.
- **States page:** state rates and the U.S. national rate (614) are from the Prison Policy Initiative and count all forms of confinement. Country rates are from the World Prison Brief. The World Prison Brief's own U.S. figure is 542 (2023). The page uses 614 so the U.S. is measured the same way as its states.

- **Women in jails:** each group's number is the sum of the offences inside it, rounded to the nearest 100, so a few totals differ slightly from the report's rounded figures (e.g. 84,500 vs 84,000). Two offences with 0 women are not drawn.

## Week 8 accessibility checklist

| Week 8 item | How it is done here |
|---|---|
| Purpose and how to read the chart | Every page has a headline, a short lede and an `.instructions` box ("How to read it / How to use it") |
| Reading level ≤ grade 9 | Short sentences and plain words in all page text |
| Text size: chart ≥ 12px, other ≥ 16px | All page text is ≥ 1rem. `js/resize.js` applies the rule of three (`k = viewBox width ÷ shown width`), and the CSS sizes chart text as `calc(12px * var(--k))`, so chart text never shows below 12px on small screens |
| Contrast: text ≥ 4.5:1, shapes ≥ 3:1 | Every colour was checked (values noted in `css/base.css`, `css/visualisation.css`, `js/shared-constants.js`). Bubbles have a dark outline (11:1) |
| Colour is not the only cue | Legends, bold country names on the ranking, text labels and tooltips name every group |
| Semantic markup | One `<h1>`, then `<h2>`; `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`; nav links in a `<ul>`; `aria-current="page"`; skip link |
| Buttons | `type="button"`, button groups have `role="group"` + `aria-label`, toggles use `aria-pressed` / `aria-expanded` |
| SVG for screen readers | `role="img"` on each main `<svg>`, `aria-labelledby` pointing at a `<title>` and a data-driven `<desc>` |
| Keyboard access to tooltips | Marks have `tabindex` and `aria-label`; tooltips open on `focus` as well as `mouseenter`; arrow keys move between marks; tooltip text is copied to an `aria-live="polite"` `.sr-only` announcer |
| Table alternative (Chartability) | "Show the data as a table" on every page, with `<caption>` and `scope` on headers |
| Respect user styles / motion | No inline `.style()` for colours or fonts; transitions switch off with `prefers-reduced-motion` |
| No flashing | Nothing flashes |

## Course techniques used

SVG shapes, groups and `transform` (W4) · `d3.csv` row conversion with `+`, `.data().join()`, `scaleLinear` / `scaleBand` / `scaleSqrt` (W4–5) · margin convention and `innerChart`, `d3.axisTop` (W5) · shared-constants file, transitions, SVG tooltips on `mouseenter` / `mouseleave` (W6) · pre-attentive colour highlight (orange "not convicted" branch), one hue on the map (W7) · `role="img"`, `<title>`/`<desc>`, `aria-labelledby`, `tabindex`, focus/blur tooltips, arrow-key navigation, `aria-live`, data-table alternative, 3:1 contrast (W8) · overview first, zoom, details on demand and linked highlighting (W10).
