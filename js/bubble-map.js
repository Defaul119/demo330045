// ---------- Page 1: proportional symbol (bubble) map with zoom ----------

let mapSvg, zoomLayer, mapTooltip, mapZoom;
let currentZoom = 1;
let bubbleRadius;

const drawBubbleMap = (world, data) => {

  // 1. Geography: TopoJSON -> GeoJSON features (drop Antarctica, id 010)
  const countries = topojson
    .feature(world, world.objects.countries)
    .features
    .filter(d => d.id !== "010");

  projection.fitExtent([[8, 8], [mapWidth - 8, mapHeight - 8]], { type: "FeatureCollection", features: countries });

  const developedIds = new Set(data.map(d => d.isoNumeric));
  const totalPrisoners = d3.sum(data, d => d.prisoners);

  // 2. Scale: bubble AREA is proportional to the number of people in prison
  radiusScale
    .domain([0, d3.max(data, d => d.prisoners)])
    .range([0, maxBubbleRadius]);

  bubbleRadius = d => Math.max(minBubbleRadius, radiusScale(d.prisoners));

  data.forEach(d => {
    [d.x, d.y] = projection([d.lon, d.lat]);
    d.share = d.prisoners / totalPrisoners;
  });

  // 3. SVG with an accessible name and a data-driven description (Week 8)
  mapSvg = d3.select("#bubble-map")
    .append("svg")
      .attr("viewBox", `0 0 ${mapWidth} ${mapHeight}`)
      .attr("role", "img")
      .attr("aria-labelledby", "map-title map-desc");

  mapSvg.append("title").attr("id", "map-title").text("Map: prison populations of 40 developed countries");
  mapSvg.append("desc").attr("id", "map-desc").text(generateMapDescription(data));

  zoomLayer = mapSvg.append("g").attr("class", "zoom-layer");

  zoomLayer.append("rect")
    .attr("class", "sphere")
    .attr("width", mapWidth)
    .attr("height", mapHeight);

  zoomLayer.append("g")
    .attr("class", "countries")
    .attr("aria-hidden", "true")
    .selectAll("path")
    .data(countries)
    .join("path")
      .attr("class", d => developedIds.has(d.id) ? "land developed" : "land")
      .attr("d", geoPath)
      .attr("stroke-width", 0.5);

  // 4. Bubbles: biggest first so small ones sit on top. Each one can be reached with Tab,
  //    and the arrow keys move between them (Week 8).
  const bubbles = zoomLayer.append("g")
    .attr("class", "bubbles")
    .selectAll("circle")
    .data([...data].sort((a, b) => b.prisoners - a.prisoners))
    .join("circle")
      .attr("class", "bubble")
      .attr("data-iso", d => d.iso3)
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", bubbleRadius)
      .attr("stroke-width", 1)
      .attr("tabindex", 0)
      .attr("aria-label", d => `${d.country}: about ${formatNumber(d.prisoners)} people in prison`);

  // 5. Labels (which ones fit depends on the zoom level, see placeLabels)
  zoomLayer.append("g")
    .attr("class", "labels")
    .attr("aria-hidden", "true")
    .selectAll("text")
    .data(data)
    .join("text")
      .attr("class", "bubble-label")
      .attr("text-anchor", "middle")
      .text(d => d.country);

  // 6. Tooltip sits OUTSIDE the zoom layer so it never scales
  mapTooltip = createTooltip(mapSvg);

  const showBubbleTooltip = (d) => {
    const t = d3.zoomTransform(mapSvg.node());
    const [sx, sy] = t.apply([d.x, d.y]);
    const r = bubbleRadius(d);   // bubbles keep the same on-screen size while zooming
    showTooltip(mapTooltip, {
      title: d.country,
      lines: [
        `About ${formatNumber(d.prisoners)} people in prison`,
        `${d.rate} in prison per 100,000 people (${d.year})`,
        `${formatPercent(d.share)} of all prisoners in these 40 countries`
      ],
      anchor: { x: sx, top: sy - r, bottom: sy + r },
      bounds: [mapWidth, mapHeight]
    });
  };

  bubbles
    .on("mouseenter focus", (e, d) => {
      showBubbleTooltip(d);
      highlightCountry(d.iso3, true);
    })
    .on("mouseleave blur", (e, d) => {
      hideTooltip(mapTooltip);
      highlightCountry(d.iso3, false);
    })
    .on("keydown", arrowKeyNavigation);

  // 7. Zoom and pan (d3.zoom). Bubbles are divided by k so they keep their on-screen size:
  //    zooming in pulls the overlapping European bubbles apart.
  mapZoom = d3.zoom()
    .scaleExtent([1, 12])
    .translateExtent([[0, 0], [mapWidth, mapHeight]])
    .on("zoom", (e) => {
      currentZoom = e.transform.k;
      zoomLayer.attr("transform", e.transform);
      mapSvg.node().style.setProperty("--zoom", currentZoom);   // label size in CSS
      zoomLayer.selectAll(".land").attr("stroke-width", 0.5 / currentZoom);
      zoomLayer.selectAll(".bubble")
        .attr("r", d => bubbleRadius(d) / currentZoom)
        .attr("stroke-width", 1 / currentZoom);
      placeLabels();
      if (e.sourceEvent) {
        hideTooltip(mapTooltip);
        setActivePreset(currentZoom === 1 ? "world" : null);   // dragged or scrolled by hand
      }
    });

  mapSvg.call(mapZoom);
  addZoomControls();
};

// Week 8: a text summary of the chart for screen readers (built from the data)
const generateMapDescription = (data) => {
  const us = data.find(d => d.iso3 === "USA");
  const others = data.filter(d => d.iso3 !== "USA");
  const top = others.slice(0, 5).map(d => `${d.country} ${formatNumber(d.prisoners)}`).join(", ");
  return `World map with one bubble per country; bubble area shows the number of people in prison. ` +
    `The United States bubble is by far the largest: about ${formatNumber(us.prisoners)} people, ` +
    `more than all ${others.length} other developed countries combined (${formatNumber(d3.sum(others, d => d.prisoners))}). ` +
    `Next largest: ${top}. Full numbers are in the data table below the map.`;
};

// ---------- Labels: biggest country first; skip any label that would overlap one already placed ----------
const placeLabels = () => {
  if (!zoomLayer) return;
  const t = d3.zoomTransform(mapSvg.node());
  const k = t.k;
  const kText = textScale(mapSvg.node());   // resize.js
  const placed = [];

  zoomLayer.selectAll(".bubble-label")
    .sort((a, b) => b.prisoners - a.prisoners)
    .each(function (d) {
      const r = bubbleRadius(d);                 // on-screen radius (bubbles do not grow with zoom)
      // the U.S. label sits inside its bubble only if it fits there
      const inside = d.iso3 === "USA" && d.country.length * 8.2 * kText < 2 * r * 0.95;
      const size = (inside ? 17 : 13) * kText;
      const w = d.country.length * (inside ? 8.2 : 7) * kText;

      // work in screen units, then convert back to map units
      const [sx, sy] = t.apply([d.x, d.y]);
      const labelX = Math.max(w / 2 + 2, Math.min(mapWidth - w / 2 - 2, sx));   // keep inside the map
      const labelY = inside ? sy + size / 3 : sy - r - 3;

      const box = { x0: labelX - w / 2, x1: labelX + w / 2, y0: labelY - size, y1: labelY + 2 };
      const collides = placed.some(p => box.x0 < p.x1 && box.x1 > p.x0 && box.y0 < p.y1 && box.y1 > p.y0)
        || box.y0 < 0;
      if (!collides) placed.push(box);

      d3.select(this)
        .classed("us", inside)
        .attr("x", t.invertX(labelX))
        .attr("y", t.invertY(labelY))
        .attr("display", collides ? "none" : null);
    });
};

// ---------- Zoom buttons: +, -, reset, and region presets ----------
const addZoomControls = () => {
  const zoomBy = (factor) => {
    mapSvg.transition().duration(dur(400)).call(mapZoom.scaleBy, factor);
    setActivePreset(null);
  };

  d3.select("#zoom-in").on("click", () => { zoomBy(1.6); announce("Zoomed in"); });
  d3.select("#zoom-out").on("click", () => { zoomBy(1 / 1.6); announce("Zoomed out"); });
  d3.select("#zoom-reset").on("click", () => zoomToPreset(zoomPresets[0]));

  // Week 8 button pattern: role="group" on the container, type="button" and aria-pressed on each
  d3.select("#zoom-presets")
    .selectAll("button")
    .data(zoomPresets)
    .join("button")
      .attr("type", "button")
      .attr("aria-pressed", d => d.isActive)
      .text(d => d.label)
      .on("click", (e, d) => zoomToPreset(d));
};

const setActivePreset = (id) => {
  zoomPresets.forEach(p => { p.isActive = p.id === id; });
  d3.selectAll("#zoom-presets button").attr("aria-pressed", d => d.isActive);
};

const zoomToPreset = (preset) => {
  hideTooltip(mapTooltip);
  setActivePreset(preset.id);
  announce(`Map zoomed to ${preset.label}`);

  if (!preset.bounds) {
    mapSvg.transition().duration(dur(750)).call(mapZoom.transform, d3.zoomIdentity);
    return;
  }
  // project the region's corners, then scale so the region fills the map
  const [[x0, y1], [x1, y0]] = preset.bounds.map(projection);
  const k = Math.min(12, 0.9 / Math.max((x1 - x0) / mapWidth, (y1 - y0) / mapHeight));
  const tx = mapWidth / 2 - k * (x0 + x1) / 2;
  const ty = mapHeight / 2 - k * (y0 + y1) / 2;
  mapSvg.transition().duration(dur(750))
    .call(mapZoom.transform, d3.zoomIdentity.translate(tx, ty).scale(k));
};

// ---------- Linked highlighting between the map and the bar chart (Week 10) ----------
// Hovering a country other than the U.S. also lights up the "All others" bar it belongs to.
// Hovering the "All others" bar lights up all 39 of those bubbles.
const highlightCountry = (iso3, on) => {
  if (iso3 === "OTHERS") {
    d3.selectAll(".bubble").filter(d => d.iso3 !== "USA").classed("highlight", on);
    d3.select(".bar.others").classed("highlight", on);
    return;
  }
  d3.selectAll(`.bubble[data-iso="${iso3}"]`).classed("highlight", on);
  d3.select(iso3 === "USA" ? ".bar.us" : ".bar.others").classed("highlight", on);
};
