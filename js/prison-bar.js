// ---------- Page 1: side bar chart — the U.S. vs all other developed countries combined ----------

const drawPrisonBar = (data) => {

  const us = data.find(d => d.iso3 === "USA");
  const others = data.filter(d => d.iso3 !== "USA");
  const othersTotal = d3.sum(others, d => d.prisoners);
  const largestOther = d3.greatest(others, d => d.prisoners);

  const bars = [
    { key: "us", iso3: "USA", label: "United States", prisoners: us.prisoners, y: 26 },
    { key: "others", iso3: "OTHERS", label: `All other ${others.length} countries`, prisoners: othersTotal, y: 112 }
  ];

  // the same x scale for both bars, so their lengths can be compared directly
  const xScale = d3.scaleLinear()
    .domain([0, us.prisoners])
    .range([0, barInnerWidth]);

  const svg = d3.select("#prison-bar")
    .append("svg")
      .attr("viewBox", `0 0 ${barWidth} ${barHeight}`)
      .attr("role", "img")
      .attr("aria-labelledby", "bar-title bar-desc");

  svg.append("title").attr("id", "bar-title").text("Bar chart: the U.S. compared with all other developed countries");
  svg.append("desc").attr("id", "bar-desc")
    .text(`United States: about ${formatNumber(us.prisoners)} people in prison. ` +
      `All ${others.length} other developed countries combined: about ${formatNumber(othersTotal)}.`);

  const innerChart = svg.append("g")
    .attr("transform", `translate(${barMargin.left}, ${barMargin.top})`);

  // labels above each bar
  innerChart.selectAll(".bar-label")
    .data(bars)
    .join("text")
      .attr("class", "bar-label")
      .attr("x", 0)
      .attr("y", d => d.y - 8)
      .text(d => d.label);

  // one solid bar each
  const barGroup = innerChart.append("g");
  barGroup.selectAll("rect")
    .data(bars)
    .join("rect")
      .attr("class", d => `bar ${d.key}`)
      .attr("x", 0)
      .attr("y", d => d.y)
      .attr("width", d => xScale(d.prisoners))
      .attr("height", barThickness)
      .attr("rx", 3)
      .attr("tabindex", 0)
      .attr("aria-label", d => `${d.label}: about ${formatNumber(d.prisoners)} people in prison`);

  // totals: inside the long U.S. bar (white), just after the end of the shorter bar
  innerChart.append("text")
    .attr("class", "bar-value inside")
    .attr("aria-hidden", "true")
    .attr("x", xScale(us.prisoners) - 8)
    .attr("y", bars[0].y + barThickness / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", "end")
    .text(formatNumber(us.prisoners));

  innerChart.append("text")
    .attr("class", "bar-value")
    .attr("aria-hidden", "true")
    .attr("x", xScale(othersTotal) + 6)
    .attr("y", bars[1].y + barThickness / 2)
    .attr("dy", "0.35em")
    .text(formatNumber(othersTotal));

  // the takeaway as real HTML text (resizable, read by screen readers)
  d3.select("#bar-ratio")
    .text(`The U.S. holds ${d3.format(".1f")(us.prisoners / othersTotal)} times as many people in prison as the other ${others.length} countries put together.`);

  // tooltip + linked highlight with the map
  const barTooltip = createTooltip(svg);

  barGroup.selectAll(".bar")
    .on("mouseenter focus", (e, d) => {
      const lines = d.key === "us"
        ? [`About ${formatNumber(d.prisoners)} people in prison`, `${us.rate} in prison per 100,000 people (${us.year})`]
        : [`About ${formatNumber(d.prisoners)} people in prison combined`,
           `Largest: ${largestOther.country} (about ${formatNumber(largestOther.prisoners)})`];
      showTooltip(barTooltip, {
        title: d.label,
        lines,
        anchor: { x: barMargin.left + xScale(d.prisoners) / 2, top: barMargin.top + d.y, bottom: barMargin.top + d.y + barThickness },
        bounds: [barWidth, barHeight]
      });
      highlightCountry(d.iso3, true);
    })
    .on("mouseleave blur", (e, d) => {
      hideTooltip(barTooltip);
      highlightCountry(d.iso3, false);
    })
    .on("keydown", arrowKeyNavigation);
};
