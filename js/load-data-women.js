// ---------- Page 3: load the hierarchy table (id, parent, name, value, branch) ----------

d3.csv("data/women-in-jails-2024.csv", d => ({
  id: d.id,
  parent: d.parent,
  name: d.name,
  value: d.value === "" ? 0 : +d.value,   // groups have no value of their own: d3 adds up their leaves
  isLeaf: d.value !== "",
  branch: d.branch
})).then(rows => {
  console.log(rows);

  drawSunburst(rows);

  resizeCharts();               // resize.js: work out the text scale
  updateSunLabels();            // then fit the labels at that scale
  onResize(updateSunLabels);
});
