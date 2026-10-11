'use strict';

(() => {
  const {tasks, trials} = window.RESEARCH_DATA;
  const order = ['flowers', 'folding', 'charging', 'stool', 'packaging'];
  const methods = ['human', 'sft', 'dagger', 'rlt', 'recap', 'fert'];
  const labels = {human:'人工', sft:'SFT', dagger:'(M)HG-DAgger', rlt:'RLT', recap:'RECAP', fert:'FERT'};
  const scalingLabels = {dagger:'HG-DAgger', fert:'FERT', sft:'SFT 初始策略', initial:'(M)HG-DAgger 初始策略'};
  // Each figure retains its own palette from the latest manuscript PDFs.
  const colors = {human:'#dedce1', sft:'#b7bfcb', dagger:'#7b8fa5', rlt:'#c7bdb7', recap:'#b1a4bf', fert:'#956c8e'};
  const scalingColors = {dagger:'#486fb8', fert:'#c70272', sft:'#486fb8', initial:'#c70272'};
  const resultLabel = result => (result.group === 'scaling' ? scalingLabels : labels)[result.method];
  const resultColor = result => (result.group === 'scaling' ? scalingColors : colors)[result.method];
  const byId = id => document.getElementById(id);
  const rate = count => 100 * count / trials;
  const percent = count => rate(count).toFixed(1);
  const fleetLabel = robots => `${robots} 台训练机器人`;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const chartObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) revealChart(entry.target);
    });
  }, {threshold:.16});

  function revealChart(card) {
    if (!card.classList.contains('chart-motion-pending')) return;
    card.classList.remove('chart-motion-pending');
    card.classList.add('chart-motion-in');
    chartObserver.unobserve(card);
    // Finish before a later resize or series filter redraws the SVG.
    setTimeout(() => card.classList.remove('chart-motion-in'), 1400);
  }

  function prepareChartMotion(root) {
    if (reducedMotion.matches) return;
    root.querySelectorAll('.result-chart-card').forEach(card => {
      card.classList.add('chart-motion-pending');
      chartObserver.observe(card);
      card.addEventListener('focusin', () => revealChart(card));
    });
  }
  reducedMotion.addEventListener('change', () => {
    if (!reducedMotion.matches) return;
    document.querySelectorAll('.chart-motion-pending,.chart-motion-in').forEach(card => {
      card.classList.remove('chart-motion-pending','chart-motion-in');
      chartObserver.unobserve(card);
    });
  });

  function wilson(count) {
    const p = count / trials;
    const z = 1.959963984540054;
    const denominator = 1 + z * z / trials;
    const midpoint = (p + z * z / (2 * trials)) / denominator;
    const half = z * Math.sqrt(p * (1 - p) / trials + z * z / (4 * trials * trials)) / denominator;
    return [100 * (midpoint - half), 100 * (midpoint + half)];
  }

  function comparisonResult(key, method) {
    const task = tasks[key];
    const robots = method === 'fert' ? task.mainFertRobots : method === 'dagger' ? task.initialRobots : undefined;
    const count = method === 'fert' ? task.fert.find(point => point[0] === robots)[1] : method === 'dagger' ? task.initial : task[method];
    const context = method === 'human' ? '6 名操作员 · 每人 20 次试验' : method === 'fert' ? fleetLabel(robots) : method === 'dagger' ? task.initialLabel : '论文报告的模型检查点';
    return {key, method, count, robots, context, group:'comparison'};
  }

  function scalingResult(key, method, robots) {
    const task = tasks[key];
    const count = method === 'sft' ? task.sft : method === 'initial' ? task.initial : task[method].find(point => point[0] === robots)[1];
    const context = method === 'sft' ? 'HG-DAgger 的初始模型' : method === 'initial' ? `${task.initialLabel} · FERT 的初始模型` : fleetLabel(robots);
    return {key, method, count, robots, context, group:'scaling'};
  }

  function attributes(result, group) {
    const point = result.robots === undefined ? '' : ` data-robots="${result.robots}"`;
    return `data-result="${group}" data-task="${result.key}" data-method="${result.method}"${point}`;
  }

  function accessibleLabel(result) {
    const [low, high] = wilson(result.count);
    return `${tasks[result.key].title}，${resultLabel(result)}，${result.context}：成功率 ${percent(result.count)}%，${trials} 次试验中成功 ${result.count} 次，95% Wilson 置信区间 ${low.toFixed(1)}% 至 ${high.toFixed(1)}%`;
  }

  function errorBar(x, count, y, color, cap = 3) {
    const [low, high] = wilson(count);
    return `<g class="error-bar" stroke="${color}" stroke-width="1.25"><line x1="${x}" x2="${x}" y1="${y(high)}" y2="${y(low)}"/><line x1="${x-cap}" x2="${x+cap}" y1="${y(high)}" y2="${y(high)}"/><line x1="${x-cap}" x2="${x+cap}" y1="${y(low)}" y2="${y(low)}"/></g>`;
  }

  function grid(left, right, y, ticks = [0,25,50,75,100]) {
    return ticks.map(value => `<line class="plot-grid" x1="${left}" x2="${right}" y1="${y(value)}" y2="${y(value)}"/><text class="plot-tick" x="${left-10}" y="${y(value)+4}" text-anchor="end">${value}</text>`).join('');
  }

  function resultDetails(result) {
    const [low, high] = wilson(result.count);
    return `<span class="result-method" style="--method-color:${resultColor(result)}">${resultLabel(result)}</span><span class="result-task-name">${tasks[result.key].title}</span><strong>${percent(result.count)}<span>%</span></strong><span>${result.context}</span><div class="result-detail-line"><span>成功次数</span><b>${result.count} / ${trials}</b></div><div class="result-detail-line"><span>95% Wilson 置信区间</span><b>${low.toFixed(1)}–${high.toFixed(1)}%</b></div>`;
  }

  function comparisonSVG(key) {
    const width = 420, height = 270, left = 33, right = 412, top = 23, bottom = 225;
    const y = value => bottom - value / 100 * (bottom - top);
    const step = (right - left) / methods.length;
    const bars = methods.map((method, index) => {
      const result = comparisonResult(key, method);
      const x = left + step * (index + .5), barWidth = step * .66;
      const barHeight = bottom - y(rate(result.count));
      const textY = y(wilson(result.count)[1]) - 9;
      const textColor = method === 'fert' ? '#713f64' : '#243746';
      const methodText = method === 'dagger' ? `<tspan x="${x}" dy="0">(M)HG-</tspan><tspan x="${x}" dy="13">DAgger</tspan>` : labels[method];
      return `<g class="result-mark comparison-mark" style="--mark-index:${index};--method-color:${colors[method]}" ${attributes(result, 'comparison')} tabindex="0" role="button" aria-pressed="false" aria-label="${accessibleLabel(result)}"><rect class="bar-glow" x="${x-step/2+3}" y="${top-5}" width="${step-6}" height="${bottom-top+10}" rx="5"/><rect class="result-bar" x="${x-barWidth/2}" y="${y(rate(result.count))}" width="${barWidth}" height="${barHeight}" rx="3" fill="${colors[method]}"/>${errorBar(x,result.count,y,'#243746')}<text class="bar-value" x="${x}" y="${textY}" fill="${textColor}" font-weight="${method === 'fert' ? '700' : '400'}" text-anchor="middle">${percent(result.count)}</text><text class="plot-method" x="${x}" y="${bottom+23}" text-anchor="middle">${methodText}</text></g>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="group" aria-label="${tasks[key].title}：各方法的成功率"><text class="plot-caption" x="${left}" y="12">成功率（%）</text>${grid(left,right,y)}${bars}</svg>`;
  }

  const comparisonRoot = byId('main-results');
  let pinnedComparison = comparisonResult('packaging', 'fert');
  let highlightedMethod = null;
  byId('comparison-legend').innerHTML = methods.map(method => `<button class="legend-chip" data-highlight="${method}" aria-label="高亮 ${labels[method]}" aria-pressed="false" style="--method-color:${colors[method]}"><i></i>${labels[method]}</button>`).join('');
  byId('comparison-cards').innerHTML = order.map((key,index) => `<div class="result-chart-card" data-card="${key}"><div class="result-card-heading"><span class="small-mono">0${index+1}</span><h4>${tasks[key].title}</h4></div>${comparisonSVG(key)}<p class="checkpoint-note">${tasks[key].initialLabel} · FERT：${tasks[key].mainFertRobots} 台机器人</p></div>`).join('') + '<div class="comparison-insight" id="comparison-readout" aria-live="polite" aria-atomic="true"></div>';

  function renderComparisonTable() {
    const sorting = byId('comparison-sort').value;
    const keys = [...order];
    if (sorting !== 'paper') keys.sort((a,b) => {
      const value = key => sorting === 'fert' ? comparisonResult(key,'fert').count : comparisonResult(key,'fert').count - tasks[key].initial;
      return value(b) - value(a);
    });
    byId('results-table').innerHTML = keys.map(key => `<tr><th scope="row">${tasks[key].title}</th>${methods.map(method => {
      const result = comparisonResult(key,method);
      return `<td><button class="result-cell" ${attributes(result,'comparison')} aria-pressed="false" aria-label="${accessibleLabel(result)}" style="--score:${rate(result.count)}%;--method-color:${colors[method]}"><span>${percent(result.count)}<small>%</small></span></button></td>`;
    }).join('')}</tr>`).join('');
    updateComparison(pinnedComparison);
    applyMethodHighlight();
  }

  function sameResult(a,b) {
    return a.key === b.key && a.method === b.method && a.robots === b.robots;
  }

  function updateComparison(result) {
    comparisonRoot.style.setProperty('--selected-color',colors[result.method]);
    comparisonRoot.style.setProperty('--selected-ink',result.method === 'fert' ? '#713f64' : '#243746');
    byId('comparison-readout').innerHTML = `<span class="small-mono">当前结果</span>${resultDetails(result)}`;
    comparisonRoot.querySelectorAll('[data-result]').forEach(element => {
      const current = comparisonResult(element.dataset.task,element.dataset.method);
      element.classList.toggle('is-selected',sameResult(current,result));
      element.setAttribute('aria-pressed',String(sameResult(current,pinnedComparison)));
    });
    comparisonRoot.querySelectorAll('[data-card]').forEach(card => card.classList.toggle('is-active',card.dataset.card === result.key));
  }

  function applyMethodHighlight() {
    comparisonRoot.querySelectorAll('[data-result]').forEach(element => element.classList.toggle('is-dimmed', Boolean(highlightedMethod && element.dataset.method !== highlightedMethod)));
    byId('comparison-legend').querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.highlight === highlightedMethod)));
  }

  byId('comparison-sort').addEventListener('change',renderComparisonTable);
  byId('comparison-legend').addEventListener('click',event => {
    const button = event.target.closest('button');
    if (!button) return;
    highlightedMethod = highlightedMethod === button.dataset.highlight ? null : button.dataset.highlight;
    applyMethodHighlight();
  });
  renderComparisonTable();
  prepareChartMotion(comparisonRoot);

  const scalingRoot = byId('fleet-scaling');
  const visible = {dagger:true, fert:true, sft:true, initial:true};
  let pinnedScaling = scalingResult('packaging','fert',96);
  let scalingSort = {field:'robots',direction:1};
  const scalingMethods = ['dagger','fert','sft','initial'];
  byId('scaling-legend').innerHTML = scalingMethods.map(method => `<button class="legend-chip series-chip" data-series="${method}" aria-label="显示 ${scalingLabels[method]}" aria-pressed="true" style="--method-color:${scalingColors[method]}"><i class="${['sft','initial'].includes(method) ? 'dashed' : 'solid'}"></i>${scalingLabels[method]}</button>`).join('');
  byId('scaling-cards').innerHTML = order.map((key,index) => `<div class="result-chart-card scaling-card ${key === 'packaging' ? 'scaling-card-wide' : ''}" data-card="${key}"><div class="result-card-heading"><span class="small-mono">0${index+1}</span><h4>${tasks[key].title}</h4><span class="fleet-range">最多 ${tasks[key].fert.at(-1)[0]} 台机器人</span></div><div class="scaling-plot" id="scale-${key}"></div></div>`).join('');

  function renderScalingPlot(key) {
    const task = tasks[key], host = byId(`scale-${key}`);
    const width = Math.max(260,host.clientWidth), height = width > 750 ? 330 : 280;
    const left = 38, right = width - 19, top = 24, bottom = height - 53;
    const maxRobots = task.fert.at(-1)[0];
    const x = n => left + n / (maxRobots * 1.045) * (right - left);
    const minSuccess = key === 'flowers' ? 30 : key === 'folding' ? 60 : 0;
    const y = value => bottom - (value - minSuccess) / (100 - minSuccess) * (bottom - top);
    const yTicks = minSuccess ? Array.from({length:(100-minSuccess)/10+1}, (_,i) => minSuccess+i*10) : [0,20,40,60,80,100];
    const ticks = key === 'packaging' ? [4,16,32,64,96] : key === 'stool' ? [1,4,8,16,32] : key === 'charging' ? [1,2,4,8,16] : [1,4,8,16];
    const baselines = ['sft','initial'].filter(method => visible[method]).map(method => {
      const result = scalingResult(key,method);
      const py = y(rate(result.count));
      return `<g class="result-mark baseline-mark" ${attributes(result,'scaling')} tabindex="0" role="button" aria-label="${accessibleLabel(result)}"><line x1="${left}" x2="${right}" y1="${py}" y2="${py}" stroke="${scalingColors[method]}" stroke-width="1.5" stroke-dasharray="6 5"/><line class="baseline-hit" x1="${left}" x2="${right}" y1="${py}" y2="${py}" stroke="transparent" stroke-width="12"/></g>`;
    }).join('');
    const curves = ['dagger','fert'].filter(method => visible[method]).map(method => {
      const path = task[method].map(([n,count],index) => `${index ? 'L' : 'M'} ${x(n)} ${y(rate(count))}`).join(' ');
      const points = task[method].map(([n,count]) => {
        const result = scalingResult(key,method,n), px = x(n), py = y(rate(count));
        return `<g class="result-mark scaling-mark" data-x="${px}" data-y="${py}" ${attributes(result,'scaling')} tabindex="0" role="button" aria-pressed="false" aria-label="${accessibleLabel(result)}"><circle class="point-halo" cx="${px}" cy="${py}" r="12" fill="${scalingColors[method]}"/>${errorBar(px,count,y,scalingColors[method],4)}<circle class="point-dot" cx="${px}" cy="${py}" r="4.5" fill="${scalingColors[method]}" stroke="white" stroke-width="1.5"/><circle class="point-hit" cx="${px}" cy="${py}" r="13" fill="transparent"/></g>`;
      }).join('');
      return `<g class="plot-series"><path d="${path}" fill="none" stroke="${scalingColors[method]}" stroke-width="2.5" stroke-linejoin="round"/>${points}</g>`;
    }).join('');
    host.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" data-left="${left}" data-right="${right}" data-top="${top}" data-bottom="${bottom}" role="group" aria-label="${task.title}：HG-DAgger 与 FERT 的规模扩展结果"><text class="plot-caption" x="${left}" y="12">成功率（%）</text>${grid(left,right,y,yTicks)}${baselines}${curves}<line class="plot-guide" x1="${left}" x2="${left}" y1="${top}" y2="${bottom}" aria-hidden="true"/>${ticks.map(n => `<text class="plot-tick" x="${x(n)}" y="${bottom+22}" text-anchor="middle">${n}</text>`).join('')}<text class="plot-caption" x="${(left+right)/2}" y="${height-7}" text-anchor="middle">训练机器人数量</text></svg>`;
  }

  function updateScaling(result) {
    const [low,high] = wilson(result.count);
    const gain = rate(result.count) - rate(tasks[result.key].initial);
    const gainText = result.method === 'fert' ? `相对初始 HG-DAgger ${gain >= 0 ? '+' : ''}${gain.toFixed(1)} 个百分点` : result.context;
    byId('scaling-readout').innerHTML = `<div><span class="result-method" style="--method-color:${resultColor(result)}">${resultLabel(result)}</span><h4>${tasks[result.key].title}</h4><span class="selection-context">${result.context}</span></div><div><strong>${percent(result.count)}<span>%</span></strong><span>${trials} 次试验中成功 ${result.count} 次</span></div><div><span class="small-mono">95% Wilson 置信区间</span><b>${low.toFixed(1)}–${high.toFixed(1)}%</b><span>${gainText}</span></div>`;
    scalingRoot.querySelectorAll('[data-result]').forEach(element => {
      const current = scalingResult(element.dataset.task,element.dataset.method,element.dataset.robots === undefined ? undefined : Number(element.dataset.robots));
      element.classList.toggle('is-selected',sameResult(current,result));
      const control = element.matches('tr') ? element.querySelector('button') : element;
      control.setAttribute('aria-pressed',String(sameResult(current,pinnedScaling)));
    });
    scalingRoot.querySelectorAll('[data-card]').forEach(card => card.classList.toggle('is-active',card.dataset.card === result.key));
    scalingRoot.querySelectorAll('.scaling-mark').forEach(mark => {
      mark.classList.toggle('is-linked',mark.dataset.task === result.key && Number(mark.dataset.robots) === result.robots);
    });
    scalingRoot.querySelectorAll('.plot-guide').forEach(guide => {
      const mark = guide.closest('.scaling-plot').querySelector('.scaling-mark.is-selected');
      guide.classList.toggle('is-visible', Boolean(mark));
      if (mark) {
        guide.setAttribute('x1', mark.dataset.x);
        guide.setAttribute('x2', mark.dataset.x);
      }
    });
  }

  function drawAllScaling() {
    order.forEach(renderScalingPlot);
    updateScaling(pinnedScaling);
  }

  function renderScalingTable() {
    const key = byId('scaling-table-task').value;
    const rows = ['dagger','fert'].flatMap(method => tasks[key][method].map(([n]) => scalingResult(key,method,n)));
    rows.sort((a,b) => scalingSort.direction * (scalingSort.field === 'robots' ? a.robots - b.robots : a.count - b.count) || a.method.localeCompare(b.method));
    byId('scaling-data-table').innerHTML = rows.map(result => {
      const [low,high] = wilson(result.count);
      return `<tr ${attributes(result,'scaling')}><th scope="row"><span class="result-method" style="--method-color:${resultColor(result)}">${resultLabel(result)}</span></th><td>${result.robots}</td><td><button class="scaling-table-result" aria-label="${accessibleLabel(result)}" aria-pressed="false">${percent(result.count)}%</button></td><td>${result.count} / ${trials}</td><td>${low.toFixed(1)}–${high.toFixed(1)}%</td></tr>`;
    }).join('');
    ['robots','rate'].forEach(field => byId(`scaling-${field}-heading`).setAttribute('aria-sort',field === scalingSort.field ? scalingSort.direction === 1 ? 'ascending' : 'descending' : 'none'));
    updateScaling(pinnedScaling);
  }

  byId('scaling-table-task').addEventListener('change',renderScalingTable);
  scalingRoot.querySelectorAll('[data-scaling-sort]').forEach(button => button.addEventListener('click',() => {
    const field = button.dataset.scalingSort;
    scalingSort.direction = scalingSort.field === field ? -scalingSort.direction : 1;
    scalingSort.field = field;
    renderScalingTable();
  }));
  byId('scaling-legend').addEventListener('click',event => {
    const button = event.target.closest('button');
    if (!button) return;
    const method = button.dataset.series;
    visible[method] = !visible[method];
    button.setAttribute('aria-pressed',String(visible[method]));
    byId('scaling-tooltip').hidden = true;
    drawAllScaling();
  });
  drawAllScaling();
  renderScalingTable();
  let resizeFrame;
  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(drawAllScaling);
  });
  order.forEach(key => observer.observe(byId(`scale-${key}`)));

  prepareChartMotion(scalingRoot);

  function bindExploration(root,tooltip,getResult,preview,pin,restore) {
    let tooltipTarget;
    function nearestScalingPoint(event) {
      const host = event.target.closest('.scaling-plot');
      if (!host) return;
      const svg = host.querySelector('svg');
      const bounds = svg.getBoundingClientRect();
      const x = (event.clientX - bounds.left) * svg.viewBox.baseVal.width / bounds.width;
      const y = (event.clientY - bounds.top) * svg.viewBox.baseVal.height / bounds.height;
      if (x < Number(svg.dataset.left) || x > Number(svg.dataset.right) || y < Number(svg.dataset.top) || y > Number(svg.dataset.bottom)) return;
      const points = Array.from(host.querySelectorAll('.scaling-mark'));
      return points.reduce((nearest,point) => {
        if (!nearest) return point;
        const dx = Math.abs(Number(point.dataset.x) - x), otherDx = Math.abs(Number(nearest.dataset.x) - x);
        return dx < otherDx - .01 || Math.abs(dx - otherDx) < .01 && Math.abs(Number(point.dataset.y) - y) < Math.abs(Number(nearest.dataset.y) - y) ? point : nearest;
      },undefined);
    }
    function position(target,event) {
      const bounds = root.getBoundingClientRect();
      const mark = target.getBoundingClientRect();
      const clientX = event?.clientX ?? mark.left + mark.width / 2;
      const clientY = event?.clientY ?? mark.bottom;
      const tipWidth = tooltip.offsetWidth, tipHeight = tooltip.offsetHeight;
      const x = Math.max(8,Math.min(bounds.width-tipWidth-8,clientX-bounds.left+14));
      let y = clientY-bounds.top+15;
      if (clientY+15+tipHeight > window.innerHeight-8) y = clientY-bounds.top-tipHeight-15;
      tooltip.style.left = `${x}px`;
      tooltip.style.top = `${Math.max(8,y)}px`;
    }
    function show(target,event) {
      const result = getResult(target);
      if (tooltipTarget) tooltipTarget.removeAttribute('aria-describedby');
      tooltipTarget = target;
      tooltip.innerHTML = resultDetails(result);
      tooltip.hidden = false;
      target.setAttribute('aria-describedby',tooltip.id);
      preview(result);
      position(target,event);
    }
    function hide() {
      tooltip.hidden = true;
      if (tooltipTarget) tooltipTarget.removeAttribute('aria-describedby');
      tooltipTarget = undefined;
      restore();
    }
    root.addEventListener('pointerover',event => {
      const target = event.target.closest('[data-result]');
      if (target && !target.contains(event.relatedTarget)) show(target,event);
    });
    root.addEventListener('pointermove',event => {
      if (event.pointerType !== 'touch' && event.target.closest('.scaling-plot')) {
        const target = event.target.closest('[data-result]') || nearestScalingPoint(event);
        if (target && target !== tooltipTarget) show(target,event);
        else if (!target && tooltipTarget) hide();
      }
      if (tooltipTarget && !tooltip.hidden) position(tooltipTarget,event);
    });
    root.addEventListener('pointerout',event => {
      const target = event.target.closest('[data-result]');
      if (target && !target.contains(event.relatedTarget) && !event.relatedTarget?.closest?.('.scaling-plot')) hide();
    });
    root.addEventListener('pointerleave',hide);
    root.querySelectorAll('.scaling-plot').forEach(plot => plot.addEventListener('pointerleave',hide));
    root.addEventListener('focusin',event => {
      const target = event.target.closest('[data-result]');
      if (target) show(target);
    });
    root.addEventListener('focusout',event => {
      if (event.target.closest('[data-result]')) hide();
    });
    root.addEventListener('click',event => {
      const target = event.target.closest('[data-result]') || nearestScalingPoint(event);
      if (target) { pin(getResult(target)); preview(getResult(target)); }
    });
    root.addEventListener('keydown',event => {
      if (event.key === 'Escape') { hide(); return; }
      if (!['Enter',' '].includes(event.key) || !event.target.matches('g[data-result]')) return;
      event.preventDefault();
      pin(getResult(event.target));
      preview(getResult(event.target));
    });
  }

  bindExploration(comparisonRoot,byId('comparison-tooltip'),element => comparisonResult(element.dataset.task,element.dataset.method),updateComparison,result => { pinnedComparison = result; },() => updateComparison(pinnedComparison));
  bindExploration(scalingRoot,byId('scaling-tooltip'),element => scalingResult(element.dataset.task,element.dataset.method,element.dataset.robots === undefined ? undefined : Number(element.dataset.robots)),updateScaling,result => { pinnedScaling = result; },() => updateScaling(pinnedScaling));
})();
