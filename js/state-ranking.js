// ---------- Page 2: U.S. states ranked against developed countries (horizontal bar chart) ----------

let rankSvg, rankInner, rankTooltip, rankData;
let showAll = false;
const xScaleR = d3.scaleLinear();
const yScaleR = d3.scaleBand();

const typeLabel = {
  state: "U.S. state",
  country: "Developed country",
  us: "United States (whole country)"
};

const drawStateRanking = (data) => {
  rankData = data;
  const countries = data.filter(d => d.type === "country");
  const states = data.filter(d => d.type === "state");

  // rank (1 = highest rate) and how each row compares with the other group
  data.forEach((d, i) => {
    d.rank = i + 1;
    d.countriesBelow = countries.filter(c => c.rate < d.rate).length;
    d.statesAbove = states.filter(s => s.rate > d.rate).length;
  });

  xScaleR.domain([0, d3.max(data, d => d.rate)]).nice();

  rankSvg = d3.select("#ranking-chart")
    .append("svg")
      .attr("viewBox", `0 0 ${rankWidth} 100`)   // height is set in updateRanking
      .attr("role", "img")
      .attr("aria-labelledby", "rank-title rank-desc");

  rankSvg.append("title").attr("id", "rank-title").text("Bar chart: incarceration rates of U.S. states and developed countries");
  rankSvg.append("desc").attr("id", "rank-desc").text(generateRankingDescription(data));

  rankInner = rankSvg.append("g");
  rankInner.append("g").attr("class", "axis axis-x").attr("aria-hidden", "true");
  rankInner.append("text").attr("class", "axis-label").attr("aria-hidden", "true")
    .text("People locked up per 100,000 residents");
  rankInner.append("g").attr("class", "rows");

  rankTooltip = createTooltip(rankSvg);

  addRankingControls(data);
  drawRankingTable(data);
};

// Week 8: a text summary for screen readers, built from the data
const generateRankingDescription = (data) => {
  const states = data.filter(d => d.type === "state");
  const countries = data.filter(d => d.type === "country");
  const top = states.slice(0, 3).map(d => `${d.name} ${d.rate}`).join(", ");
  const lowState = states[states.length - 1];
  const topCountry = countries[0];
  return `Bars sorted from highest to lowest rate. Grey bars are U.S. states, orange bars are developed countries, ` +
    `and the purple bar is the whole United States. Highest: ${top}. ` +
    `The lowest state is ${lowState.name} at ${lowState.rate}. The highest developed country is ${topCountry.name} at ${topCountry.rate}. ` +
    `Every state is above every developed country except ${topCountry.name}. The full list is in the table below the chart.`;
};

const updateRanking = (animate = true) => {
  const data = rankData;
  const k = textScale(rankSvg.node());   // resize.js: grow spacing with the text on small screens
  const margin = {
    top: rankMarginBase.top * k,
    right: rankMarginBase.right * k,
    bottom: rankMarginBase.bottom,
    left: rankMarginBase.left * k
  };
  const rowHeight = rowHeightBase * k;
  const innerWidth = rankWidth - margin.left - margin.right;
  const visible = showAll ? data : data.slice(0, rowsWhenCollapsed);
  const innerHeight = visible.length * rowHeight;
  const duration = animate ? dur(600) : 0;

  xScaleR.range([0, innerWidth]);
  yScaleR
    .domain(visible.map(d => d.name))
    .range([0, innerHeight])
    .paddingInner(0.2);

  // set the size straight away (not in a transition) so rows are never clipped
  rankSvg.attr("viewBox", `0 0 ${rankWidth} ${innerHeight + margin.top + margin.bottom}`);
  rankInner.attr("transform", `translate(${margin.left}, ${margin.top})`);

  rankInner.select(".axis-x")
    .call(d3.axisTop(xScaleR).ticks(6).tickSize(-innerHeight).tickFormat(d3.format(",")));
  rankInner.select(".axis-label")
    .attr("y", -34 * k);

  // one <g> per row: bar + name + value
  const rows = rankInner.select(".rows")
    .selectAll(".rank-row")
    .data(visible, d => d.name)
    .join(
      enter => {
        const row = enter.append("g")
          .attr("class", d => `rank-row ${d.type}`)
          .attr("data-name", d => d.name)
          .attr("opacity", 0);
        row.append("rect").attr("class", d => `rank-bar ${d.type}`).attr("rx", 2).attr("width", 0);
        row.append("text").attr("class", d => `rank-name ${d.type}`).attr("text-anchor", "end").attr("dy", "0.35em").text(d => d.name);
        row.append("text").attr("class", "rank-value").attr("dy", "0.35em").text(d => formatNumber(d.rate));
        row.transition().duration(duration).attr("opacity", 1);
        return row;
      },
      update => update,
      exit => exit.remove()
    );

  // position everything (also re-run when the text size changes)
  rows.attr("transform", d => `translate(0, ${yScaleR(d.name)})`);
  rows.select(".rank-bar")
    .attr("height", yScaleR.bandwidth())
    .transition().duration(duration)
      .attr("width", d => xScaleR(d.rate));
  rows.select(".rank-name")
    .attr("x", -8 * k)
    .attr("y", yScaleR.bandwidth() / 2);
  rows.select(".rank-value")
    .attr("x", d => xScaleR(d.rate) + 5 * k)
    .attr("y", yScaleR.bandwidth() / 2);

  // keyboard: ONE tab stop for the chart; the arrow keys move between rows (Week 8)
  rows
    .attr("tabindex", (d, i) => i === 0 ? 0 : -1)
    .attr("aria-label", d => `${d.name}, ${typeLabel[d.type]}: ${formatNumber(d.rate)} per 100,000, rank ${d.rank} of ${data.length}`);

  attachRowEvents();
};

const comparisonLine = (d, countryCount) => {
  if (d.type === "country") return `${d.statesAbove} of 50 U.S. states have a higher rate`;
  if (d.countriesBelow === countryCount) return `Higher than all ${countryCount} other developed countries`;
  return `Higher than ${d.countriesBelow} of the ${countryCount} other developed countries`;
};

const attachRowEvents = () => {
  const data = rankData;
  const countryCount = data.filter(d => d.type === "country").length;

  const show = (d) => {
    const k = textScale(rankSvg.node());
    const [, , , svgHeight] = rankSvg.attr("viewBox").split(" ").map(Number);
    const top = rankMarginBase.top * k + yScaleR(d.name);
    const xEnd = rankMarginBase.left * k + xScaleR(d.rate);
    showTooltip(rankTooltip, {
      title: d.name,
      lines: [
        typeLabel[d.type],
        `${formatNumber(d.rate)} locked up per 100,000 residents (${d.year})`,
        `Rank ${d.rank} of ${data.length}`,
        comparisonLine(d, countryCount)
      ],
      // above the row (below if there is no room), centred on the end of its bar
      anchor: { x: xEnd, top, bottom: top + yScaleR.bandwidth() },
      bounds: [rankWidth, svgHeight]
    });
  };

  rankInner.selectAll(".rank-row")
    .on("mouseenter focus", (e, d) => {
      d3.select(e.currentTarget).classed("highlight", true);
      show(d);
    })
    .on("mouseleave blur", (e, d) => {
      const selected = d3.select("#state-select").property("value");
      d3.select(e.currentTarget).classed("highlight", d.name === selected);
      hideTooltip(rankTooltip);
    })
    .on("keydown", (e) => {
      const rows = rankInner.selectAll(".rank-row").nodes();
      const i = rows.indexOf(e.currentTarget);
      const moves = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: rows.length - 1 };
      if (!(e.key in moves)) return;
      e.preventDefault();
      const next = rows[Math.max(0, Math.min(rows.length - 1, moves[e.key]))];
      rows.forEach(r => r.setAttribute("tabindex", -1));
      next.setAttribute("tabindex", 0);
      next.focus();
    });
};

// ---------- Controls: "Show all" toggle and "Find a state" dropdown ----------
const addRankingControls = (data) => {
  const button = d3.select("#show-all");
  const label = () => showAll ? `Show the top ${rowsWhenCollapsed} only` : `Show all ${data.length}`;
  button.attr("type", "button").text(label()).attr("aria-expanded", showAll);

  button.on("click", () => {
    showAll = !showAll;
    button.text(label()).attr("aria-expanded", showAll);
    updateRanking();
    highlightState(d3.select("#state-select").property("value"), false);
    announce(showAll ? `Showing all ${data.length} rows` : `Showing the top ${rowsWhenCollapsed} rows`);
  });

  const states = data.filter(d => d.type === "state").sort((a, b) => d3.ascending(a.name, b.name));
  const select = d3.select("#state-select");
  select.selectAll("option.state")
    .data(states)
    .join("option")
      .attr("class", "state")
      .attr("value", d => d.name)
      .text(d => d.name);

  select.on("change", (e) => highlightState(e.target.value, true));
};

const highlightState = (name, scroll) => {
  const data = rankData;
  rankInner.selectAll(".rank-row").classed("highlight", d => d.name === name);
  const summary = d3.select("#state-summary");
  if (!name) { summary.text(""); return; }

  const d = data.find(r => r.name === name);
  const countryCount = data.filter(r => r.type === "country").length;
  const above = data.filter(r => r.type === "country" && r.rate > d.rate).map(r => r.name);
  summary.text(
    `${d.name} is number ${d.rank} of ${data.length}, with ${formatNumber(d.rate)} people locked up per 100,000. ` +
    (above.length === 0
      ? `That is higher than all ${countryCount} other developed countries.`
      : `Only ${above.join(", ")} ${above.length === 1 ? "has" : "have"} a higher rate.`)
  );

  if (scroll) {
    const node = rankInner.select(`.rank-row[data-name="${CSS.escape(name)}"]`).node();
    if (node) node.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
  }
};

// Week 8 / Chartability: the full ranking as a table
const drawRankingTable = (data) => {
  const rows = d3.select("#ranking-table tbody")
    .selectAll("tr")
    .data(data)
    .join("tr");

  rows.append("td").attr("class", "num").text(d => d.rank);
  rows.append("th").attr("scope", "row").text(d => d.name);
  rows.append("td").text(d => typeLabel[d.type]);
  rows.append("td").attr("class", "num").text(d => formatNumber(d.rate));
  rows.append("td").attr("class", "num").text(d => d.year);
};
