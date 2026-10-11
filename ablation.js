// Reveal each comparison once; retain the exact numerical labels throughout.
(() => {
  const charts = [...document.querySelectorAll('.ablation-chart')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!charts.length || reduced.matches || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(({target,isIntersecting}) => {
      if (!isIntersecting) return;
      target.dataset.ablationMotion = 'played';
      observer.unobserve(target);
    });
  },{threshold:.35});
  for (const chart of charts) {
    const rect = chart.getBoundingClientRect();
    // Avoid briefly showing full bars then resetting when opening a deep link.
    chart.dataset.ablationMotion = rect.top < innerHeight && rect.bottom > 0 ? 'played' : 'pending';
    if (chart.dataset.ablationMotion === 'pending') observer.observe(chart);
  }
  reduced.addEventListener('change', () => {
    if (!reduced.matches) return;
    observer.disconnect();
    charts.forEach(chart => { chart.dataset.ablationMotion = 'played'; });
  });
})();
