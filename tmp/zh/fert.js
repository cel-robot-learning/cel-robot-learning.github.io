(() => {
  'use strict';
  const framework = document.getElementById('fert-framework');
  const model = window.FertModel;
  if (!framework || !model) return;
  const svg = document.getElementById('fert-diagram');
  const scene = document.getElementById('fert-scene');
  const buttons = [...framework.querySelectorAll('.fert-step-button')];
  const modules = [...svg.querySelectorAll('.fert-module')];
  const panels = [...framework.querySelectorAll('.fert-step-content')];
  const queryInput = document.getElementById('fert-query-frame');
  const retentionInput = document.getElementById('fert-retention');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const views = {
    all:[-12,-10,1024,940],
    1:[-12,-10,424,268],
    2:[398,-10,615,268],
    3:[-12,248,1024,268],
    4:[-12,503,1024,420]
  };
  const matches = model.trajectories.map(trajectory => model.align(model.query, trajectory));
  const selected = matches.map((match, trajectory) => ({...match, trajectory})).sort((a, b) => a.cost - b.cost).slice(0, 2);
  const intervals = selected.map(match => ({trajectory:match.trajectory, start:match.interval[0], end:match.interval[1]}));
  let activeStep = 1;
  let currentView = [...views.all];
  let baseView = 'all';
  let zoom = 1;
  let viewAnimation = 0;
  let visible = false;
  let queryPinned = false;
  let probability = [];
  let seed = 21;
  let drag = null;
  let suppressClick = false;

  function setView(view, animate = true) {
    cancelAnimationFrame(viewAnimation);
    const from = [...currentView];
    const begin = performance.now();
    function draw(now) {
      const t = animate && !reduced.matches ? Math.min(1, (now - begin) / 650) : 1;
      const ease = 1 - (1 - t) ** 3;
      currentView = from.map((start, index) => start + (view[index] - start) * ease);
      svg.setAttribute('viewBox', currentView.join(' '));
      if (t < 1) viewAnimation = requestAnimationFrame(draw);
    }
    draw(begin);
    scene.classList.toggle('is-pannable', zoom > 1);
    document.getElementById('fert-zoom-out').disabled = zoom <= 1;
    document.getElementById('fert-zoom-in').disabled = zoom >= 2.5;
  }

  function focusedView() {
    const [x,y,width,height] = views[baseView];
    return [x + width * (1 - 1 / zoom) / 2, y + height * (1 - 1 / zoom) / 2, width / zoom, height / zoom];
  }

  function selectStep(step, focus = true) {
    activeStep = Number(step);
    buttons.forEach(button => button.setAttribute('aria-expanded', String(Number(button.dataset.step) === activeStep)));
    panels.forEach(panel => { panel.hidden = Number(panel.dataset.step) !== activeStep; });
    modules.forEach(module => {
      const selected = Number(module.dataset.step) === activeStep;
      module.classList.toggle('is-active', selected);
      module.setAttribute('aria-pressed', String(selected));
    });
    if (focus) {
      baseView = activeStep;
      zoom = 1;
      scene.classList.add('is-focused');
      modules.forEach(module => { module.setAttribute('aria-hidden', String(Number(module.dataset.step) !== activeStep)); module.setAttribute('tabindex', Number(module.dataset.step) === activeStep ? '0' : '-1'); });
      setView(focusedView());
      document.getElementById('fert-focus-status').textContent = `步骤 ${activeStep} / 4`;
      const position = framework.getBoundingClientRect().top;
      if (position < 24 || position > 120) framework.scrollIntoView({behavior:reduced.matches ? 'auto' : 'smooth', block:'start'});
    }
  }

  modules.forEach(module => {
    module.addEventListener('click', () => {
      if (suppressClick) { suppressClick = false; return; }
      selectStep(module.dataset.step);
    });
    module.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectStep(module.dataset.step);
      }
    });
  });
  buttons.forEach(button => {
    button.addEventListener('click', () => selectStep(button.dataset.step));
    button.addEventListener('keydown', event => {
      const direction = ['ArrowDown','ArrowRight'].includes(event.key) ? 1 : ['ArrowUp','ArrowLeft'].includes(event.key) ? -1 : 0;
      if (!direction) return;
      event.preventDefault();
      const next = (Number(button.dataset.step) - 1 + direction + 4) % 4;
      buttons[next].focus({preventScroll:true});
      selectStep(next + 1);
    });
  });
  document.getElementById('fert-overview').addEventListener('click', () => {
    baseView = 'all';
    zoom = 1;
    scene.classList.remove('is-focused');
    modules.forEach(module => { module.removeAttribute('aria-hidden'); module.setAttribute('tabindex','0'); });
    setView(views.all);
    document.getElementById('fert-focus-status').textContent = '完整流程';
  });
  function changeZoom(direction) {
    if (baseView === 'all' && direction > 0) selectStep(activeStep);
    zoom = Math.min(2.5, Math.max(1, zoom + direction * .35));
    setView(focusedView());
    document.getElementById('fert-focus-status').textContent = `步骤 ${activeStep} / 4${zoom > 1 ? ` · ${Math.round(zoom * 100)}%` : ''}`;
  }
  document.getElementById('fert-zoom-in').addEventListener('click', () => changeZoom(1));
  document.getElementById('fert-zoom-out').addEventListener('click', () => changeZoom(-1));

  scene.addEventListener('pointerdown', event => {
    if (zoom <= 1 || event.button !== 0) return;
    cancelAnimationFrame(viewAnimation);
    drag = {id:event.pointerId, x:event.clientX, y:event.clientY, view:[...currentView], moved:false};
    scene.setPointerCapture(event.pointerId);
    scene.classList.add('is-dragging');
  });
  scene.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const scale = Math.min(scene.clientWidth / drag.view[2], scene.clientHeight / drag.view[3]);
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.hypot(dx, dy) > 4) drag.moved = true;
    const limit = views[baseView];
    const x = Math.max(limit[0] - currentView[2] * .2, Math.min(limit[0] + limit[2] - currentView[2] * .8, drag.view[0] - dx / scale));
    const y = Math.max(limit[1] - currentView[3] * .2, Math.min(limit[1] + limit[3] - currentView[3] * .8, drag.view[1] - dy / scale));
    currentView = [x,y,drag.view[2],drag.view[3]];
    svg.setAttribute('viewBox', currentView.join(' '));
  });
  function finishDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    suppressClick = drag.moved;
    setTimeout(() => { suppressClick = false; }, 0);
    drag = null;
    scene.classList.remove('is-dragging');
  }
  scene.addEventListener('pointerup', finishDrag);
  scene.addEventListener('pointercancel', finishDrag);
  scene.addEventListener('lostpointercapture', () => { drag = null; scene.classList.remove('is-dragging'); });

  const namespace = 'http://www.w3.org/2000/svg';
  const lines = document.getElementById('fert-alignments');
  matches.forEach((match, trajectory) => {
    match.path.forEach((candidateFrame, queryFrame) => {
      const startX = 807.5 + queryFrame * 26;
      const endX = 648.5 + trajectory % 2 * 184 + candidateFrame * 21;
      const endY = 388 + Math.floor(trajectory / 2) * 59;
      const line = document.createElementNS(namespace, 'path');
      line.setAttribute('d', `M${startX} 356C${startX} ${endY - 20} ${endX} ${endY - 25} ${endX} ${endY}`);
      line.setAttribute('class', 'fert-alignment');
      line.dataset.queryFrame = queryFrame;
      lines.append(line);
    });
    const maxCost = Math.max(...matches.map(item => item.cost));
    const bar = document.getElementById(`fert-cost-${trajectory}`);
    bar.setAttribute('width', Math.max(8, match.cost / maxCost * 173));
    bar.classList.toggle('is-selected', selected.some(item => item.trajectory === trajectory));
    document.getElementById(`fert-cost-value-${trajectory}`).textContent = match.cost.toFixed(2);
    const outline = document.getElementById(`fert-interval-${trajectory}`);
    outline.setAttribute('x', 639 + trajectory % 2 * 184 + match.interval[0] * 21);
    outline.setAttribute('y', 387 + Math.floor(trajectory / 2) * 59);
    outline.setAttribute('width', (match.interval[1] - match.interval[0]) * 21 - 2);
    outline.setAttribute('height', 19);
    for (let frame = 0; frame < model.trajectories[trajectory].length; frame++) {
      const matched = frame >= match.interval[0] && frame < match.interval[1];
      document.getElementById(`fert-candidate-${trajectory}-${frame}`).classList.toggle('is-matched', matched);
      document.getElementById(`fert-retrieved-${trajectory}-${frame}`)?.classList.toggle('is-matched', matched);
    }
  });
  document.getElementById('fert-retrieval-readout').textContent = `代价最低的候选：${selected.map(item => `#${item.trajectory + 1}`).join(' 和 ')}`;

  function showQueryFrame() {
    const frame = Number(queryInput.value) - 1;
    document.getElementById('fert-query-readout').textContent = `${frame + 1} / 3`;
    svg.querySelectorAll('.fert-query-token').forEach((token, index) => token.classList.toggle('is-current', index === frame));
    lines.querySelectorAll('path').forEach(line => line.classList.toggle('is-current', Number(line.dataset.queryFrame) === frame));
    matches.forEach((match, trajectory) => {
      for (let index = 0; index < model.trajectories[trajectory].length; index++) {
        document.getElementById(`fert-candidate-${trajectory}-${index}`).classList.toggle('is-current', index === match.path[frame]);
      }
    });
  }
  queryInput.addEventListener('input', () => { queryPinned = true; showQueryFrame(); });

  function showPriorities() {
    const retention = Number(retentionInput.value);
    const weights = model.updatePriorities(model.priorities, intervals, retention, 2);
    probability = model.probabilities(weights);
    const max = Math.max(...model.priorities.flat(), ...weights.flat());
    model.priorities.forEach((row, trajectory) => row.forEach((weight, chunk) => {
      for (const [prefix, value, maxHeight] of [['fert-current',weight,29],['fert-updated',weights[trajectory][chunk],29],['fert-buffer-weight',weights[trajectory][chunk],29]]) {
        const bar = document.getElementById(`${prefix}-${trajectory}-${chunk}`);
        const height = value / max * maxHeight;
        bar.setAttribute('height', height.toFixed(2));
        bar.setAttribute('y', (Number(bar.dataset.baseline) - height).toFixed(2));
        const overlap = intervals.some(interval => interval.trajectory === trajectory && chunk < interval.end && chunk + 2 > interval.start);
        bar.classList.toggle('is-retrieved', prefix !== 'fert-current' && overlap);
      }
    }));
    const retrievedMass = probability.reduce((sum, row, trajectory) => sum + row.reduce((total, value, chunk) => total + (intervals.some(interval => interval.trajectory === trajectory && chunk < interval.end && chunk + 2 > interval.start) ? value : 0), 0), 0);
    document.getElementById('fert-retention-readout').textContent = retention.toFixed(2);
    document.getElementById('fert-sampling-readout').textContent = `与检索区间重叠的动作块占示意采样概率的 ${(retrievedMass * 100).toFixed(1)}%。`;
    showBatch();
  }

  function showBatch() {
    svg.querySelectorAll('.fert-buffer-token-sampled').forEach(token => { token.classList.remove('fert-buffer-token-sampled'); token.removeAttribute('stroke'); token.removeAttribute('stroke-width'); });
    for (let index = 0; index < 9; index++) {
      seed = (1664525 * seed + 1013904223) >>> 0;
      const sample = model.sample(probability, seed / 4294967296);
      if (!sample) continue;
      const source = document.getElementById(`fert-buffer-${sample.trajectory}-${sample.chunk}`);
      source.classList.add('fert-buffer-token-sampled');
      source.setAttribute('stroke','#b57aa8');
      source.setAttribute('stroke-width','2');
      const token = document.getElementById(`fert-batch-${index}`);
      token.setAttribute('fill', ['#79abc5','#8aafc3','#709d83','#a0bfae'][sample.trajectory]);
      token.setAttribute('aria-label', `轨迹 ${sample.trajectory + 1}，动作块 ${sample.chunk + 1}`);
    }
  }
  retentionInput.addEventListener('input', showPriorities);

  function syncMotion() { framework.classList.toggle('is-live', visible && !document.hidden && !reduced.matches); }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; syncMotion(); }, {threshold:.08}).observe(framework);
  } else { visible = true; syncMotion(); }
  document.addEventListener('visibilitychange', syncMotion);
  reduced.addEventListener('change', () => { cancelAnimationFrame(viewAnimation); setView(focusedView(), false); syncMotion(); });
  const clock = setInterval(() => {
    if (!visible || document.hidden || reduced.matches) return;
    if (!queryPinned) { queryInput.value = Number(queryInput.value) % 3 + 1; showQueryFrame(); }
    showBatch();
  }, 3200);
  window.addEventListener('pagehide', event => { if (!event.persisted) clearInterval(clock); });

  showQueryFrame();
  showPriorities();
  selectStep(1, false);
  if (matchMedia('(max-width:760px)').matches) {
    baseView = 1;
    scene.classList.add('is-focused');
    modules.forEach(module => { module.setAttribute('aria-hidden', String(Number(module.dataset.step) !== 1)); module.setAttribute('tabindex', Number(module.dataset.step) === 1 ? '0' : '-1'); });
    setView(views[1], false);
    document.getElementById('fert-focus-status').textContent = '步骤 1 / 4';
  } else { setView(views.all, false); }
})();
