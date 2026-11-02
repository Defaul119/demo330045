// ---------- Shared constants (Week 6 pattern: one place for sizes, colours and scales) ----------

// Number formats
const formatNumber = d3.format(",");          // 1861647 -> 1,861,647
const formatPercent = d3.format(".1%");       // 0.701   -> 70.1%
const formatPercent0 = d3.format(".0%");      // 0.61    -> 61%

// Week 8: respect "reduce motion" in the operating system — no animated transitions
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const dur = ms => reduceMotion ? 0 : ms;

// Colours. Every one is at least 3:1 against white (WCAG 1.4.11 non-text contrast);
// colours that sit behind white text are at least 4.5:1 (WCAG 1.4.3).
const colours = {
  us: "#6a51a3",        // purple: the United States, on every page (6.3:1)
  others: "#8471b8",    // light purple: all other developed countries combined (4.2:1)
  state: "#8a8f98",     // grey: U.S. states (3.3:1)
  country: "#c2620a"    // burnt orange: developed countries (4.2:1)
};

// ---------- Page 1: bubble map ----------
const mapWidth = 820;
const mapHeight = 430;
const maxBubbleRadius = 60;   // the U.S. bubble
const minBubbleRadius = 3;    // tiny countries (San Marino, Andorra) stay hoverable

const projection = d3.geoNaturalEarth1();
const geoPath = d3.geoPath(projection);
const radiusScale = d3.scaleSqrt();  // sqrt scale: bubble AREA, not diameter, encodes the count (Week 2)

// Quick-zoom presets: [[west, south], [east, north]] in longitude/latitude
const zoomPresets = [
  { id: "world", label: "World", bounds: null, isActive: true },
  { id: "europe", label: "Europe", bounds: [[-12, 34], [36, 66]], isActive: false },
  { id: "asia", label: "East Asia", bounds: [[100, 0], [146, 46]], isActive: false }
];

// ---------- Page 1: side bar chart ----------
const barWidth = 320;
const barHeight = 170;
const barMargin = { top: 8, right: 12, bottom: 8, left: 12 };
const barInnerWidth = barWidth - barMargin.left - barMargin.right;
const barThickness = 44;

// ---------- Page 2: ranked bar chart ----------
const rankWidth = 980;
const rankMarginBase = { top: 50, right: 60, bottom: 20, left: 150 };
const rowHeightBase = 20;
const rowsWhenCollapsed = 60;

// ---------- Page 3: half sunburst ----------
const sunWidth = 900;
const sunHeight = 470;
const sunCentre = { x: sunWidth / 2, y: 445 };
// ring edges (radius) for depth 0 (centre) to depth 4 (specific offence)
const ringRadius = d3.scaleLinear().domain([0, 1, 2, 3, 4, 5]).range([0, 115, 175, 250, 330, 435]);

// Fill colours by branch and depth. All are at least 5:1 against the white labels drawn on them.
const branchColours = {
  root: ["#1d2733"],
  local: ["#1d2733", "#3a4552"],
  notconv: ["#1d2733", "#3a4552", "#7a3703", "#974506", "#b25409"],   // not convicted: orange
  conv: ["#1d2733", "#3a4552", "#2c4565", "#3b5878", "#4b6a8c"],      // convicted: blue
  agency: ["#1d2733", "#525b65", "#646e79"]                            // held for other agencies: grey
};
