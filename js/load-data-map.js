// ---------- Page 1: load the world map and the prison data, then draw ----------
// Find -> Load -> Format -> Bind -> Scale (Week 4). d3.csv reads every value as a string,
// so the row converter turns numbers into numbers with "+".

Promise.all([
  d3.json("data/countries-110m.json"),
  d3.csv("data/developed-prison-population.csv", d => ({
    country: d.country,
    iso3: d.iso3,
    isoNumeric: d.isoNumeric,
    lat: +d.lat,
    lon: +d.lon,
    year: +d.year,
    rate: +d.rate,
    population: +d.population,
    prisoners: +d.prisoners
  }))
]).then(([world, data]) => {
  console.log(world, data);

  data.sort((a, b) => b.prisoners - a.prisoners);

  drawBubbleMap(world, data);
  drawPrisonBar(data);
  drawMapTable(data);

  onResize(placeLabels);   // labels must be re-fitted when the text size changes
  resizeCharts();          // resize.js: set the text scale once at draw time
});

// Week 8 / Chartability: the same numbers as a table
const drawMapTable = (data) => {
  const rows = d3.select("#map-table tbody")
    .selectAll("tr")
    .data(data)
    .join("tr");

  rows.append("th").attr("scope", "row").text(d => d.country);
  rows.append("td").attr("class", "num").text(d => formatNumber(d.prisoners));
  rows.append("td").attr("class", "num").text(d => d.rate);
  rows.append("td").attr("class", "num").text(d => d.year);
};
