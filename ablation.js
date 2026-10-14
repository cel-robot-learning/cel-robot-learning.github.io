'use strict';

(() => {
  const root = document.getElementById('fert-ablations');
  const cards = document.getElementById('ablation-cards');
  const readout = document.getElementById('ablation-readout');
  const data = window.ABLATION_DATA;
  if (!root || !cards || !readout || !data) return;
  readout.setAttribute('aria-atomic', 'true');

  const {groups, trials} = data;
  // Exact ablation fills match the paper and the other experiment figures.
  const colors = {baseline:'#b76549', alternative:'#aab7c4'};
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const rate = count => 100 * count / trials;
  const percent = count => rate(count).toFixed(1);
  const escape = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));
  let selected;
  let observer;
  let tooltipMark;
  let pinnedMark;
  let dismissedMark;

  function wilson(count) {
    const p = count / trials, z = 1.959963984540054;
    const denominator = 1 + z * z / trials;
    const midpoint = (p + z * z / (2 * trials)) / denominator;
    const half = z * Math.sqrt(p * (1 - p) / trials + z * z / (4 * trials * trials)) / denominator;
    return [100 * (midpoint - half), 100 * (midpoint + half)];
  }

  function accessibleLabel(group, setting) {
    const [low, high] = wilson(setting.successes);
    return `${group.title}. ${setting.description}${setting.baseline ? ', full FERT setting' : ''}. ${percent(setting.successes)} percent success; ${setting.successes} successful trials out of ${trials}; 95 percent Wilson interval ${low.toFixed(1)} to ${high.toFixed(1)} percent.`;
  }

  function chart(group) {
    const width = 440, height = 285, left = 42, right = 428, top = 32, bottom = 225;
    const y = value => bottom - value * (bottom - top) / 100;
    const spacing = (right - left) / group.settings.length;
    const barWidth = Math.min(75, spacing * .58);
    const grid = [0,25,50,75,100].map(value => `<line class="ablation-grid" x1="${left}" x2="${right}" y1="${y(value)}" y2="${y(value)}"/><text class="ablation-tick" x="${left-10}" y="${y(value)+4}" text-anchor="end">${value}</text>`).join('');
    const marks = group.settings.map((setting,index) => {
      const x = left + spacing * (index+.5);
      const [low, high] = wilson(setting.successes);
      const color = setting.baseline ? colors.baseline : colors.alternative;
      const barTop = y(rate(setting.successes));
      return `<g class="ablation-mark${setting.baseline ? ' ablation-baseline' : ''}" data-ablation-group="${group.key}" data-ablation-setting="${setting.key}" style="--ablation-color:${color};--ablation-order:${index}" tabindex="0" role="button" aria-pressed="false" aria-controls="ablation-readout" aria-label="${escape(accessibleLabel(group,setting))}"><rect class="ablation-hit" x="${x-spacing/2+5}" y="${top-12}" width="${spacing-10}" height="${bottom-top+49}" rx="7"/><rect class="ablation-bar" x="${x-barWidth/2}" y="${barTop}" width="${barWidth}" height="${bottom-barTop}" rx="3" fill="${color}"/><g class="ablation-interval" stroke="#243746" stroke-width="1.35"><line x1="${x}" x2="${x}" y1="${y(high)}" y2="${y(low)}"/><line x1="${x-5}" x2="${x+5}" y1="${y(high)}" y2="${y(high)}"/><line x1="${x-5}" x2="${x+5}" y1="${y(low)}" y2="${y(low)}"/></g><text class="ablation-value" x="${x}" y="${y(high)-10}" text-anchor="middle">${percent(setting.successes)}%</text><text class="ablation-setting-label" x="${x}" y="${bottom+22}" text-anchor="middle">${escape(setting.label)}</text></g>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="group" aria-label="${escape(group.title)}: success rate by setting"><text class="ablation-axis" x="${left}" y="14">Success rate (%)</text>${grid}${marks}<text class="ablation-axis ablation-x-axis" x="${(left+right)/2}" y="${height-9}" text-anchor="middle">${escape(group.axis)}</text></svg>`;
  }

  cards.innerHTML = groups.map(group => `<section class="ablation-card" aria-labelledby="ablation-title-${group.key}"><h4 id="ablation-title-${group.key}">${escape(group.title)}</h4>${chart(group)}</section>`).join('');
  const marks = [...cards.querySelectorAll('.ablation-mark')];
  const tooltip = document.createElement('div');
  tooltip.className = 'ablation-tooltip';
  tooltip.setAttribute('aria-hidden', 'true');
  tooltip.hidden = true;
  root.append(tooltip);

  function positionTooltip() {
    if (!tooltipMark || tooltip.hidden) return;
    const bounds = root.getBoundingClientRect();
    const anchor = tooltipMark.querySelector('.ablation-value').getBoundingClientRect();
    const gap = 10;
    const left = Math.max(8, Math.min(anchor.left + anchor.width / 2 - bounds.left - tooltip.offsetWidth / 2, root.clientWidth - tooltip.offsetWidth - 8));
    let top = anchor.top - bounds.top - tooltip.offsetHeight - gap;
    if (top < 8) top = anchor.bottom - bounds.top + gap;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${Math.max(8, Math.min(top, root.clientHeight - tooltip.offsetHeight - 8))}px`;
  }

  function showTooltip(mark) {
    if (dismissedMark === mark) return;
    tooltipMark = mark;
    const group = groups.find(item => item.key === mark.dataset.ablationGroup);
    const setting = group.settings.find(item => item.key === mark.dataset.ablationSetting);
    const [low, high] = wilson(setting.successes);
    tooltip.innerHTML = `<strong>${escape(setting.description)}</strong><span>${percent(setting.successes)}% · ${setting.successes}/${trials} successful trials</span><span>95% Wilson interval: ${low.toFixed(1)}–${high.toFixed(1)}%</span>`;
    tooltip.hidden = false;
    positionTooltip();
  }

  function hideTooltip() {
    tooltip.hidden = true;
    tooltipMark = undefined;
    pinnedMark = undefined;
  }

  function select(mark) {
    const group = groups.find(item => item.key === mark.dataset.ablationGroup);
    const setting = group.settings.find(item => item.key === mark.dataset.ablationSetting);
    if (selected === mark) return;
    selected = mark;
    marks.forEach(item => item.setAttribute('aria-pressed', String(item === mark)));
    readout.style.setProperty('--ablation-selected-color', setting.baseline ? '#944a35' : '#243746');
    const [low, high] = wilson(setting.successes);
    readout.innerHTML = `<div class="ablation-selection"><span>${escape(group.title)}</span><strong>${escape(setting.description)}</strong></div><div class="ablation-stat"><strong>${percent(setting.successes)}<span>%</span></strong><span>${setting.successes} / ${trials} successful trials</span></div><div class="ablation-uncertainty"><span>95% Wilson interval</span><strong>${low.toFixed(1)}–${high.toFixed(1)}%</strong></div>`;
  }

  function reveal(card) {
    if (card.dataset.ablationMotion !== 'pending') return;
    card.dataset.ablationMotion = 'played';
    observer?.unobserve(card);
  }

  marks.forEach(mark => {
    mark.addEventListener('pointerenter', event => {
      if (event.pointerType === 'touch') return;
      dismissedMark = undefined;
      showTooltip(mark);
    });
    mark.addEventListener('pointerleave', () => {
      if (pinnedMark) showTooltip(pinnedMark);
      else if (document.activeElement === mark) showTooltip(mark);
      else hideTooltip();
    });
    mark.addEventListener('click', () => {
      select(mark);
      dismissedMark = undefined;
      pinnedMark = mark;
      showTooltip(mark);
    });
    mark.addEventListener('focus', () => {
      pinnedMark = undefined;
      dismissedMark = undefined;
      reveal(mark.closest('.ablation-card'));
      select(mark);
      showTooltip(mark);
    });
    mark.addEventListener('blur', hideTooltip);
    mark.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select(mark);
        dismissedMark = undefined;
        pinnedMark = mark;
        showTooltip(mark);
        return;
      }
      if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)) return;
      event.preventDefault();
      const siblings = [...mark.closest('svg').querySelectorAll('.ablation-mark')];
      const index = siblings.indexOf(mark);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? siblings.length-1 : (index + (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1) + siblings.length) % siblings.length;
      siblings[next].focus();
    });
  });
  document.addEventListener('click', event => {if (!event.target.closest('.ablation-mark')) hideTooltip();});
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || tooltip.hidden) return;
    dismissedMark = tooltipMark;
    hideTooltip();
  });
  window.addEventListener('resize', positionTooltip);
  select(marks.find(mark => mark.dataset.ablationGroup === 'retrieval' && mark.classList.contains('ablation-baseline')));

  if (!motion.matches && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {if (entry.isIntersecting) reveal(entry.target);});
    }, {threshold:.2});
    cards.querySelectorAll('.ablation-card').forEach(card => {
      const rect = card.getBoundingClientRect();
      card.dataset.ablationMotion = rect.top < innerHeight && rect.bottom > 0 ? 'played' : 'pending';
      if (card.dataset.ablationMotion === 'pending') observer.observe(card);
    });
  }
  motion.addEventListener('change', () => {
    if (!motion.matches) return;
    observer?.disconnect();
    cards.querySelectorAll('.ablation-card').forEach(card => {card.dataset.ablationMotion = 'played';});
  });
})();
