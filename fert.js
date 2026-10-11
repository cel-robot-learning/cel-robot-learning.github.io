(() => {
  'use strict';
  const framework = document.getElementById('fert-framework');
  const model = window.FertModel;
  if (!framework || !model) return;
  const zh = framework.dataset.locale === 'zh';
  const tabs = [...framework.querySelectorAll('[role="tab"]')];
  const panels = [...framework.querySelectorAll('[role="tabpanel"]')];
  const matches = model.trajectories.map(trajectory => model.align(model.query, trajectory));
  const selected = matches.map((match, trajectory) => ({...match, trajectory})).sort((a,b) => a.cost - b.cost).slice(0,2);
  const intervals = selected.map(match => ({trajectory:match.trajectory, start:match.interval[0], end:match.interval[1]}));
  // Reduced-size example; the retention factor uses the manuscript's default.
  const before = model.probabilities(model.priorities);
  const after = model.probabilities(model.updatePriorities(model.priorities, intervals, .88, 2));
  const maxProbability = Math.max(...before.flat(), ...after.flat());
  const overlaps = (trajectory, chunk) => intervals.some(interval => interval.trajectory === trajectory && chunk < interval.end && chunk + 2 > interval.start);
  const share = probabilities => probabilities.reduce((sum,row,t) => sum + row.reduce((part,p,c) => part + (overlaps(t,c) ? p : 0),0),0);
  const percentage = value => `${(value * 100).toFixed(1)}%`;
  let step = 1;
  let mode = 'before';
  let inspectedChunk = null;
  let visible = false;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const previous = document.getElementById('fert-prev');
  const next = document.getElementById('fert-next');

  function selectStep(value) {
    step = Number(value);
    tabs.forEach((tab,i) => { tab.setAttribute('aria-selected', String(i + 1 === step)); tab.tabIndex = i + 1 === step ? 0 : -1; });
    panels.forEach((panel,i) => { panel.hidden = i + 1 !== step; });
    previous.disabled = step === 1;
    next.innerHTML = `${step === 4 ? next.dataset.replay : next.dataset.next} <span aria-hidden="true">${step === 4 ? '↺' : '→'}</span>`;
    document.getElementById('fert-focus-status').textContent = `0${step} / 04`;
    // No automatic page scroll, zoom, crop, or canvas reflow when a step changes.
  }
  tabs.forEach((tab,index) => {
    tab.addEventListener('click', () => selectStep(index + 1));
    tab.addEventListener('keydown', event => {
      let target;
      if (event.key === 'ArrowRight') target = (index + 1) % 4;
      if (event.key === 'ArrowLeft') target = (index + 3) % 4;
      if (event.key === 'Home') target = 0;
      if (event.key === 'End') target = 3;
      if (target === undefined) return;
      event.preventDefault();
      selectStep(target + 1);
      tabs[target].focus({preventScroll:true});
    });
  });
  previous.addEventListener('click', () => selectStep(Math.max(1,step - 1)));
  next.addEventListener('click', () => selectStep(step % 4 + 1));

  matches.forEach((match,trajectory) => {
    const chosen = selected.some(item => item.trajectory === trajectory);
    framework.querySelector(`[data-match-row="${trajectory}"]`).classList.toggle('is-selected',chosen);
    const cost = framework.querySelector(`[data-cost="${trajectory}"]`);
    cost.textContent = match.cost.toFixed(2);
    cost.classList.toggle('is-selected',chosen);
    const range = framework.querySelector(`[data-interval="${trajectory}"]`);
    range.setAttribute('x',String(137 + match.interval[0] * 44));
    range.setAttribute('width',String((match.interval[1] - match.interval[0]) * 44 + 1));
    range.style.opacity = chosen ? '1' : '.35';
    for (let frame = 0; frame < model.trajectories[trajectory].length; frame++) {
      framework.querySelector(`[data-candidate="${trajectory}-${frame}"]`).classList.toggle('is-matched',frame >= match.interval[0] && frame < match.interval[1]);
    }
  });
  function selectFrame(frame) {
    framework.querySelectorAll('[data-frame]').forEach(button => button.setAttribute('aria-pressed',String(Number(button.dataset.frame) === frame)));
    framework.querySelectorAll('[data-query]').forEach(token => token.classList.toggle('is-current',Number(token.dataset.query) === frame));
    matches.forEach((match,trajectory) => {
      for (let i = 0; i < model.trajectories[trajectory].length; i++) {
        framework.querySelector(`[data-candidate="${trajectory}-${i}"]`).classList.toggle('is-current',i === match.path[frame]);
      }
    });
    const positions = selected.map(match => `#${match.trajectory + 1} → ${match.path[frame] + 1}`).join(' · ');
    document.getElementById('fert-match-readout').textContent = zh ? `查询帧 ${frame + 1} 对齐到成功轨迹的位置：${positions}。紫色方块标出对应帧。` : `Query frame ${frame + 1} maps to positions ${positions}. Purple blocks mark the corresponding frames.`;
  }
  framework.querySelectorAll('[data-frame]').forEach(button => button.addEventListener('click',() => selectFrame(Number(button.dataset.frame))));

  function inspectChunk(key) {
    inspectedChunk = key;
    const [trajectory,chunk] = key.split('-').map(Number);
    const p = (mode === 'after' ? after : before)[trajectory][chunk];
    framework.querySelectorAll('[data-chunk]').forEach(mark => mark.classList.toggle('is-selected',mark.dataset.chunk === key));
    const label = zh ? `轨迹 #${trajectory+1} · 动作块 ${chunk+1}：${percentage(before[trajectory][chunk])} → ${percentage(p)}${overlaps(trajectory,chunk) ? '，与检索片段重叠。' : '。'}` : `Trajectory #${trajectory+1} · chunk ${chunk+1}: ${percentage(before[trajectory][chunk])} → ${percentage(p)}${overlaps(trajectory,chunk) ? ' · overlaps a retrieved interval.' : '.'}`;
    document.getElementById('fert-chunk-readout').textContent = label;
  }
  function selectPriority(value) {
    mode = value;
    const probabilities = mode === 'after' ? after : before;
    framework.querySelectorAll('[data-priority]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.priority === mode)));
    probabilities.forEach((row,trajectory) => row.forEach((p,chunk) => {
      const key = `${trajectory}-${chunk}`;
      const bar = framework.querySelector(`[data-weight="${key}"]`);
      const height = p / maxProbability * 50;
      const y = Number(bar.dataset.baseline) - height;
      bar.setAttribute('y',y.toFixed(2));
      bar.setAttribute('height',height.toFixed(2));
      bar.classList.toggle('is-retrieved',overlaps(trajectory,chunk));
      const label = framework.querySelector(`[data-bar-value="${key}"]`);
      label.textContent = percentage(p);
      label.setAttribute('y',(y - 7).toFixed(2));
      framework.querySelector(`[data-chunk="${key}"]`).setAttribute('aria-label',zh ? `轨迹 ${trajectory+1}，动作块 ${chunk+1}，采样概率 ${percentage(p)}` : `Trajectory ${trajectory+1}, chunk ${chunk+1}, sampling probability ${percentage(p)}`);
    }));
    document.getElementById('fert-share-before').textContent = percentage(share(before));
    document.getElementById('fert-share-now').textContent = percentage(share(probabilities));
    document.getElementById('fert-share-meter').style.width = percentage(share(probabilities));
    const count = model.priorities.flatMap((row,t) => row.map((_,c) => overlaps(t,c))).filter(Boolean).length;
    document.getElementById('fert-sampling-readout').textContent = zh
      ? `${count} 个粉色动作块，共 32 个。${mode === 'after' ? '检索提高了这些相关动作被抽入训练的总概率。' : '当前显示检索更新前的采样分布。点击“检索加权后”查看变化。'}`
      : `${count} pink chunks out of 32. ${mode === 'after' ? 'Retrieval raises their combined probability of being sampled for training.' : 'This is the existing sampling distribution. Select “After retrieval” to see the change.'}`;
    if (inspectedChunk) inspectChunk(inspectedChunk);
  }
  framework.querySelectorAll('[data-priority]').forEach(button => button.addEventListener('click',() => selectPriority(button.dataset.priority)));
  framework.querySelectorAll('[data-chunk]').forEach(mark => {
    mark.addEventListener('click',() => inspectChunk(mark.dataset.chunk));
    mark.addEventListener('keydown',event => {
      if (!['Enter',' '].includes(event.key)) return;
      event.preventDefault(); inspectChunk(mark.dataset.chunk);
    });
  });
  // Keep the mobile controls beside the drawing they change.
  const compact = matchMedia('(max-width:760px)');
  const controlPositions = [...framework.querySelectorAll('.fert-controls')].map(control => ({
    control, parent:control.parentNode, next:control.nextSibling,
    scene:control.closest('.fert-panel').querySelector('.fert-scene')
  }));
  function placeControls() {
    controlPositions.forEach(({control,parent,next,scene}) => {
      if (compact.matches) scene.before(control);
      else parent.insertBefore(control,next);
    });
  }
  compact.addEventListener('change',placeControls);
  placeControls();
  const syncMotion = () => framework.classList.toggle('is-live',visible && !document.hidden && !motion.matches);
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => { visible=entries[0].isIntersecting; syncMotion(); },{threshold:.05}).observe(framework);
  else { visible=true; syncMotion(); }
  document.addEventListener('visibilitychange',syncMotion);
  motion.addEventListener('change',syncMotion);
  selectFrame(0);
  selectPriority('before');
  selectStep(1);
})();
