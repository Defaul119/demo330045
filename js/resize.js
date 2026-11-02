// ---------- Week 8: keep chart text readable when the SVG is shrunk (rule of three) ----------
// A viewBox SVG scales everything, text included:
//     shown size = font size × rendered width ÷ viewBox width
// e.g. 12px text in a 980-wide viewBox shown 490px wide appears at 6px.
// So we work out k = viewBox width ÷ rendered width (never below 1) and set it as the CSS
// variable --k on each chart. The CSS sizes chart text as calc(12px * var(--k)), so it is
// always shown at 12px or more (Week 8: chart text >= 12px).

const maxTextScale = 2.5;

const textScale = (svgNode) => {
  const viewBoxWidth = svgNode.viewBox.baseVal ? svgNode.viewBox.baseVal.width : 0;
  const renderedWidth = svgNode.getBoundingClientRect().width;
  if (!viewBoxWidth || !renderedWidth) return 1;
  return Math.min(maxTextScale, Math.max(1, viewBoxWidth / renderedWidth));
};

// charts that need to re-lay out labels when the text size changes register here
const resizeCallbacks = [];
const onResize = (callback) => resizeCallbacks.push(callback);

const resizeCharts = () => {
  d3.selectAll(".responsive-svg-container svg").each(function () {
    this.style.setProperty("--k", textScale(this));
  });
  resizeCallbacks.forEach(callback => callback());
};

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(resizeCharts, 150);
});
