// ---------- Page 2: load the combined ranking (made by prep/prepare_data.py) ----------

d3.csv("data/states-vs-countries.csv", d => ({
  name: d.name,
  type: d.type,          // "state", "country" or "us"
  rate: +d.rate,
  year: +d.year,
  source: d.source
})).then(data => {
  console.log(data);

  data.sort((a, b) => b.rate - a.rate);
  drawStateRanking(data);

  resizeCharts();                       // resize.js: work out the text scale
  updateRanking(false);                 // then lay out the rows at that scale
  onResize(() => updateRanking(false)); // and again whenever the window size changes
});
