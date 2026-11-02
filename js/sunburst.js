// ---------- Page 3: half sunburst (nested donut) of women held in U.S. jails ----------
// Rings from the centre out: all women in jails -> who they are held for -> convicted or not
// -> type of offence -> specific offence. Arc ANGLE shows how many women (Week 5 arcs, d3.arc).

let sunSvg, sunInner, sunDefs, sunRoot, focusNode, sunTooltip;

// a clockwise arc at radius r from angle a0 to a1 (0 = straight up): text on it reads left to right
const arcLine = (r, a0, a1) => {
  const point = a => [r * Math.sin(a), -r * Math.cos(a)];
  const [x0, y0] = point(a0);
  const [x1, y1] = point(a1);
  return `M${x0},${y0} A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1},${y1}`;
};

// x0/x1 are 0..1 across the half circle; y0/y1 are ring numbers (0 = centre)
const sunArc = d3.arc()
  .startAngle(d => -Math.PI / 2 + d.x0 * Math.PI)
  .endAngle(d => -Math.PI / 2 + d.x1 * Math.PI)
  .padAngle(d => Math.min((d.x1 - d.x0) * Math.PI / 2, 0.004))
  .padRadius(ringRadius(2.5))
  .innerRadius(d => ringRadius(d.y0))
  .outerRadius(d => Math.max(ringRadius(d.y0), ringRadius(d.y1) - 2));   // 2px white gap between rings

const arcVisible = d => d.y1 <= 5 && d.y0 >= 0 && d.y1 > d.y0 && d.x1 - d.x0 > 0.0005;

// Leaves show PPI's exact number; groups show the sum rounded to the nearest 100
const roundedValue = d => d.children ? Math.round(d.value / 100) * 100 : d.value;
const formatWomen = d => `${d.children ? "About " : ""}${formatNumber(roundedValue(d))} women`;

const drawSunburst = (rows) => {

  // 1. Build the hierarchy from the id / parent table (d3.stratify), add up the leaves (sum)
  //    and lay it out as a partition: each node gets x0..x1 (share of the half circle) and y0..y1 (ring)
  sunRoot = d3.stratify()
    .id(d => d.id)
    .parentId(d => d.parent || null)(rows.filter(d => d.value !== 0 || !d.isLeaf))
    .sum(d => d.value);

  d3.partition().size([1, sunRoot.height + 1])(sunRoot);
  sunRoot.each(d => { d.current = { x0: d.x0, x1: d.x1, y0: d.y0, y1: d.y1 }; });
  focusNode = sunRoot;

  // 2. SVG with an accessible name and a data-driven description (Week 8)
  sunSvg = d3.select("#sunburst")
    .append("svg")
      .attr("viewBox", `0 0 ${sunWidth} ${sunHeight}`)
      .attr("role", "img")
      .attr("aria-labelledby", "sun-title sun-desc");

  sunSvg.append("title").attr("id", "sun-title").text("Half sunburst chart: women held in U.S. local jails");
  sunSvg.append("desc").attr("id", "sun-desc").text(generateSunburstDescription());

  sunInner = sunSvg.append("g")
    .attr("transform", `translate(${sunCentre.x}, ${sunCentre.y})`);
  sunDefs = sunInner.append("defs");   // invisible curves the arc labels follow

  // 3. Arcs: one path per node, coloured by branch (not convicted / convicted / other agency) and ring
  sunInner.append("g")
    .attr("class", "arcs")
    .selectAll("path")
    .data(sunRoot.descendants())
    .join("path")
      .attr("class", d => d.children ? "arc" : "arc leaf")
      .attr("fill", d => branchColours[d.data.branch][Math.min(d.depth, branchColours[d.data.branch].length - 1)])
      .attr("stroke-width", 1)
      .attr("d", d => sunArc(d.current))
      .attr("aria-label", d => describeNode(d));

  // 4. Labels
  sunInner.append("g")
    .attr("class", "arc-labels")
    .attr("aria-hidden", "true")
    .selectAll("text")
    .data(sunRoot.descendants())
    .join("text")
      .attr("class", "arc-label")
      .attr("text-anchor", "middle");

  sunTooltip = createTooltip(sunSvg);

  // 5. Interaction: hover / focus = details, click / Enter = zoom in, arrow keys = move around
  sunInner.selectAll(".arc")
    .on("mouseenter focus", (e, d) => showArcDetails(d))
    .on("mouseleave blur", () => {
      hideTooltip(sunTooltip);
      sunInner.selectAll(".arc").classed("dim", false);
    })
    .on("click", (e, d) => zoomFromNode(d))
    .on("keydown", (e, d) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        zoomFromNode(d);
        return;
      }
      const siblings = d.parent ? d.parent.children.filter(n => arcVisible(n.current)) : [d];
      const i = siblings.indexOf(d);
      const moves = {
        ArrowRight: siblings[i + 1],
        ArrowLeft: siblings[i - 1],
        ArrowDown: d.children ? d.children.find(n => arcVisible(n.current)) : null,   // out, to the next ring
        ArrowUp: d.parent && d !== focusNode ? d.parent : null                       // in, towards the centre
      };
      if (!(e.key in moves)) return;
      e.preventDefault();
      if (moves[e.key]) focusArc(moves[e.key]);
    });

  updateArcAccess();
  updateBreadcrumb();
  drawSunburstTable();
};

// Week 8: a text summary for screen readers, built from the data
const generateSunburstDescription = () => {
  const local = sunRoot.children.find(d => d.id === "local");
  const nc = local.children.find(d => d.id === "nc");
  return `Half circle split into rings. Centre: about ${formatNumber(roundedValue(sunRoot))} women in local jails. ` +
    `Next ring: about ${formatNumber(roundedValue(local))} held for local authorities and ` +
    `${formatNumber(roundedValue(sunRoot.children.find(d => d.id === "other")))} held for other agencies. ` +
    `Next ring: of those held for local authorities, about ${formatNumber(roundedValue(nc))} (${formatPercent0(nc.value / local.value)}) have not been convicted. ` +
    `Outer rings break each group down by offence. All numbers are in the table below the chart.`;
};

const describeNode = d => {
  const share = d.parent ? `, ${formatPercent0(d.value / d.parent.value)} of ${d.parent.data.name}` : "";
  return `${d.data.name}: ${formatWomen(d)}${share}`;
};

// ---------- Hover / focus details ----------
const showArcDetails = (d) => {
  // dim everything that is not on the path to this arc or inside it
  const path = new Set(d.ancestors());
  d.descendants().forEach(n => path.add(n));
  sunInner.selectAll(".arc").classed("dim", n => !path.has(n));

  const lines = [formatWomen(d)];
  if (d.parent) lines.push(`${formatPercent0(d.value / d.parent.value)} of "${d.parent.data.name}"`);
  if (d !== sunRoot) lines.push(`${formatPercent(d.value / sunRoot.value)} of all women in jails`);
  if (d === focusNode && d.parent) lines.push("Click or press Enter to zoom out");
  else if (d.children && d !== focusNode) lines.push("Click or press Enter to zoom in");

  const [cx, cy] = d.current.y0 === 0 ? [0, -ringRadius(1) * 0.5] : sunArc.centroid(d.current);
  showTooltip(sunTooltip, {
    title: d.ancestors().reverse().slice(1).map(n => n.data.name).join(" › ") || d.data.name,
    lines,
    anchor: { x: sunCentre.x + cx, top: sunCentre.y + cy - 12, bottom: sunCentre.y + cy + 12 },
    bounds: [sunWidth, sunHeight]
  });
};

// ---------- Zoom ----------
const zoomFromNode = (d) => {
  if (d === focusNode) {
    if (d.parent) zoomTo(d.parent);   // clicking the centre goes back out
  } else if (d.children) {
    zoomTo(d);
  }
};

const zoomTo = (p) => {
  focusNode = p;
  hideTooltip(sunTooltip);
  sunInner.selectAll(".arc").classed("dim", false);

  // where every node should end up: p fills the whole half circle and becomes the centre
  sunRoot.each(d => {
    d.target = {
      x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))),
      x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))),
      y0: Math.max(0, d.y0 - p.depth),
      y1: Math.max(0, d.y1 - p.depth)
    };
  });

  sunInner.selectAll(".arc-label").attr("opacity", 0);
  // arcs that are on screen before OR after the zoom take part in the animation
  sunInner.selectAll(".arc")
    .attr("visibility", d => arcVisible(d.current) || arcVisible(d.target) ? null : "hidden");

  const t = sunInner.transition().duration(dur(750));

  sunInner.selectAll(".arc")
    .transition(t)
    .tween("data", d => {
      const i = d3.interpolate(d.current, d.target);
      return time => { d.current = i(time); };
    })
    .attrTween("d", d => () => sunArc(d.current));

  t.end().catch(() => {}).then(() => {
    sunRoot.each(d => { d.current = d.target; });
    sunInner.selectAll(".arc").attr("d", d => sunArc(d.current));
    updateArcAccess();
    updateSunLabels();
    sunInner.selectAll(".arc-label").attr("opacity", 1);
  });

  updateBreadcrumb();
  announce(`Showing ${p.data.name}: ${formatWomen(p)}.`);
  focusArc(p);
};

// visible arcs can be hovered; one of them is the single tab stop (roving tabindex, Week 8)
const updateArcAccess = () => {
  sunInner.selectAll(".arc")
    .attr("pointer-events", d => arcVisible(d.target || d.current) ? null : "none")
    .attr("visibility", d => arcVisible(d.target || d.current) ? null : "hidden")
    .attr("tabindex", d => d === focusNode ? 0 : (arcVisible(d.target || d.current) ? -1 : null));
};

const focusArc = (d) => {
  sunInner.selectAll(".arc")
    .attr("tabindex", n => n === d ? 0 : (arcVisible(n.target || n.current) ? -1 : null));
  const node = sunInner.selectAll(".arc").filter(n => n === d).node();
  if (node) node.focus({ preventScroll: true });
};

// ---------- Labels: shown only when they fit inside their arc ----------
const updateSunLabels = () => {
  const k = textScale(sunSvg.node());   // resize.js
  const lineHeight = 16 * k;

  sunInner.selectAll(".arc-label").each(function (d) {
    const label = d3.select(this);
    const c = d.current;
    label.selectAll("tspan, textPath").remove();
    label.attr("display", "none").attr("transform", null).attr("class", "arc-label");
    if (!arcVisible(c)) return;

    const name = d.data.name;
    const value = formatNumber(roundedValue(d));

    // centre: large two-line label
    if (c.y0 === 0) {
      // anchored from the bottom so the number never drops below the chart's base line
      label.attr("class", "arc-label big").attr("display", null)
        .attr("transform", "translate(0, -14)");
      label.append("tspan").attr("x", 0).attr("dy", "-1.1em").text(name);
      label.append("tspan").attr("class", "value").attr("x", 0).attr("dy", "1.1em").text(value);
      return;
    }

    const r0 = ringRadius(c.y0);
    const r1 = ringRadius(c.y1);
    const rMid = (r0 + r1) / 2;
    const thickness = r1 - r0;
    const angle = -Math.PI / 2 + (c.x0 + c.x1) / 2 * Math.PI;   // 0 = straight up
    const arcLength = (c.x1 - c.x0) * Math.PI * rMid;
    const x = rMid * Math.sin(angle);
    const y = -rMid * Math.cos(angle);
    const charWidth = 7.2 * k;
    const textWidth = Math.max(name.length, value.length) * charWidth;
    const isMid = c.y0 === 1;

    // a) two horizontal lines (name + number) if the box fits inside the arc
    const boxW = textWidth + 8;
    const boxH = lineHeight * 2 + 4;
    const along = boxW * Math.abs(Math.cos(angle)) + boxH * Math.abs(Math.sin(angle));
    const across = boxW * Math.abs(Math.sin(angle)) + boxH * Math.abs(Math.cos(angle));
    if (along <= arcLength && across <= thickness) {
      label.attr("display", null).attr("class", isMid ? "arc-label mid" : "arc-label")
        .attr("transform", `translate(${x}, ${y})`);
      label.append("tspan").attr("x", 0).attr("dy", "-0.25em").text(name);
      label.append("tspan").attr("class", "value").attr("x", 0).attr("dy", "1.2em").text(value);
      return;
    }

    // b) two lines that follow the curve of the arc (SVG textPath), like the reference chart
    if (thickness >= lineHeight * 2.2 && (c.x1 - c.x0) * Math.PI * (rMid - lineHeight * 0.6) >= textWidth + 16) {
      const a0 = -Math.PI / 2 + c.x0 * Math.PI;
      const a1 = -Math.PI / 2 + c.x1 * Math.PI;
      const outer = rMid + lineHeight * 0.25;
      const inner = rMid - lineHeight * 0.95;
      label.attr("display", null).attr("class", isMid ? "arc-label mid" : "arc-label");
      [[outer, name, "name"], [inner, value, "value"]].forEach(([r, text, cls]) => {
        const id = `sun-path-${d.id}-${cls}`;
        sunDefs.selectAll(`#${CSS.escape(id)}`).data([null]).join("path").attr("id", id).attr("d", arcLine(r, a0, a1));
        label.append("textPath")
          .attr("class", cls)
          .attr("href", `#${id}`)
          .attr("startOffset", "50%")
          .text(text);
      });
      return;
    }

    // c) one line along the radius (name only) if the ring is deep enough
    const nameWidth = name.length * charWidth;
    if (nameWidth + 10 <= thickness && arcLength >= lineHeight) {
      let rotate = angle * 180 / Math.PI - 90;
      if (angle < 0) rotate += 180;   // keep text the right way up on the left side
      label.attr("display", null)
        .attr("transform", `translate(${x}, ${y}) rotate(${rotate})`);
      label.append("tspan").attr("x", 0).attr("dy", "0.35em").text(name);
    }
  });
};

// ---------- Breadcrumb: shows where you are and lets you zoom back out ----------
const updateBreadcrumb = () => {
  const trail = focusNode.ancestors().reverse();
  const items = d3.select("#sun-breadcrumb ol")
    .selectAll("li")
    .data(trail, d => d.id)
    .join("li");

  items.selectAll("*").remove();
  items.each(function (d) {
    const li = d3.select(this);
    if (d === focusNode) {
      li.append("span").attr("aria-current", "true").text(`${d.data.name} (${formatNumber(roundedValue(d))})`);
    } else {
      li.append("button").attr("type", "button").text(d.data.name).on("click", () => zoomTo(d));
    }
  });
};

// ---------- Week 8 / Chartability: every number as a table ----------
const drawSunburstTable = () => {
  const nodes = [];
  sunRoot.eachBefore(d => nodes.push(d));   // same order as reading the chart, ring by ring within each group

  const rows = d3.select("#sunburst-table tbody")
    .selectAll("tr")
    .data(nodes)
    .join("tr");

  rows.append("th")
    .attr("scope", "row")
    .attr("class", d => `depth-${d.depth}`)   // indentation in CSS, not inline style (Week 8)
    .text(d => d.data.name);
  rows.append("td").text(d => d.ancestors().reverse().slice(1, -1).map(n => n.data.name).join(" › ") || "—");
  rows.append("td").attr("class", "num").text(d => formatNumber(roundedValue(d)));
  rows.append("td").attr("class", "num").text(d => formatPercent(d.value / sunRoot.value));
};
