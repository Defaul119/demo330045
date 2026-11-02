// ---------- SVG tooltip (Week 6) made accessible (Week 8) ----------
// The tooltip is a <g> inside the chart's own SVG. Everything it shows is also written to an
// aria-live region (#tooltip-announcer) so screen-reader users hear it when a mark gets focus.

const createTooltip = (svg) => {
  const tooltip = svg
    .append("g")
      .attr("class", "tooltip")
      .attr("aria-hidden", "true")
      .attr("opacity", 0);

  tooltip
    .append("rect")
      .attr("rx", 4)
      .attr("ry", 4);

  tooltip.append("text");

  return tooltip;
};

const announce = (message) => {
  d3.select("#tooltip-announcer").text(message);
};

// anchor: { x, top, bottom } puts the box above the mark (below if there is no room)
//         { y, left, right } puts the box to the right of the mark (left if there is no room)
const showTooltip = (tooltip, { title, lines, anchor, bounds }) => {
  const k = textScale(tooltip.node().ownerSVGElement);   // grow spacing with the text (resize.js)
  const lineHeight = 20 * k;
  const padding = 10 * k;

  tooltip
    .select("text")
    .selectAll("tspan")
    .data([title, ...lines])
    .join("tspan")
      .attr("class", (d, i) => i === 0 ? "tooltip-title" : "tooltip-detail")
      .attr("x", padding)
      .attr("y", (d, i) => padding + 15 * k + i * lineHeight)
      .text(d => d);

  const boxWidth = tooltip.select("text").node().getBBox().width + padding * 2;
  const boxHeight = (lines.length + 1) * lineHeight + padding * 1.2;

  tooltip.select("rect")
    .attr("width", boxWidth)
    .attr("height", boxHeight);

  const [maxX, maxY] = bounds;
  let x, y;

  if (anchor.x !== undefined) {
    x = anchor.x - boxWidth / 2;
    y = anchor.top - boxHeight - 8;
    if (y < 4) y = anchor.bottom + 8;
  } else {
    x = anchor.right + 10;
    if (x + boxWidth > maxX - 4) x = anchor.left - boxWidth - 10;
    y = anchor.y - boxHeight / 2;
  }

  // keep the whole box inside the SVG
  x = Math.max(4, Math.min(x, maxX - boxWidth - 4));
  y = Math.max(4, Math.min(y, maxY - boxHeight - 4));

  tooltip
    .raise()
    .attr("transform", `translate(${x}, ${y})`)
    .interrupt()
    .transition()
      .duration(dur(150))
      .attr("opacity", 1);

  announce(`${title}. ${lines.join(". ")}.`);
};

const hideTooltip = (tooltip) => {
  tooltip
    .interrupt()
    .attr("opacity", 0)
    .attr("transform", "translate(-1000, -1000)");
};

// Week 8 keyboard pattern: arrow keys move focus to the next / previous mark
const arrowKeyNavigation = (e) => {
  const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
  if (!(e.key in keys)) return;
  e.preventDefault();
  const step = keys[e.key];
  let next = step > 0 ? e.currentTarget.nextElementSibling : e.currentTarget.previousElementSibling;
  while (next && !next.hasAttribute("tabindex")) {
    next = step > 0 ? next.nextElementSibling : next.previousElementSibling;
  }
  if (next) next.focus();
};
