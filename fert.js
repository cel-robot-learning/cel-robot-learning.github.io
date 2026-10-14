/* The v5 drawing stays in place. Every control changes only its corresponding data. */
(() => {
  'use strict';
  const root = document.getElementById('fert-framework');
  const model = window.FertModel;
  if (!root || !model) return;
  const zh = root.dataset.locale === 'zh';
  const tr = (en, cn) => zh ? cn : en;
  const svg = root.querySelector('#fert-diagram');
  const steps = [...root.querySelectorAll('.fert-step-button')];
  const modules = [...svg.querySelectorAll('.fert-module')];
  const panels = [...root.querySelectorAll('.fert-step-content')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const matches = model.trajectories.map(t => model.align(model.query, t));
  const selected = matches.map((m,t) => ({...m,trajectory:t})).sort((a,b) => a.cost-b.cost).slice(0,2);
  const intervals = selected.map(m => ({trajectory:m.trajectory,start:m.interval[0],end:m.interval[1]}));
  const updated = model.updatePriorities(model.priorities, intervals, .88, 2);
  const overlaps = (t,c) => intervals.some(i => i.trajectory===t && c<i.end && c+2>i.start);
  let probability, active = 1, after = true, visible = false, seed = 21, batch = 0;
  const get = id => root.querySelector('#'+id);
  const panelAnimations = new Map();
  panels.forEach(panel => {
    const body = document.createElement('div');
    body.className = 'fert-step-body';
    body.append(...panel.childNodes);
    panel.append(body);
  });

  function settlePanel(panel, open) {
    const running = panelAnimations.get(panel);
    if (running) {
      running.onfinish = null;
      running.cancel();
      panelAnimations.delete(panel);
    }
    panel.hidden = !open;
    panel.inert = !open;
    panel.setAttribute('aria-hidden', String(!open));
    panel.style.removeProperty('height');
    panel.style.removeProperty('opacity');
  }
  function setPanelOpen(panel, open, animate) {
    const running = panelAnimations.get(panel);
    const wasHidden = panel.hidden;
    if (!animate || reduced.matches || !panel.animate) {
      settlePanel(panel, open);
      return;
    }
    if (!running && open === !wasHidden) return;
    const height = wasHidden ? 0 : panel.getBoundingClientRect().height;
    const opacity = wasHidden ? 0 : Number(getComputedStyle(panel).opacity);
    if (running) {
      // Freeze the current frame before canceling so rapid clicks can reverse smoothly.
      panel.style.height = `${height}px`;
      panel.style.opacity = String(opacity);
      running.onfinish = null;
      running.cancel();
    }
    if (!open && panel.contains(document.activeElement)) {
      steps.find(button => button.dataset.step === panel.dataset.step)?.focus({preventScroll:true});
    }
    panel.hidden = false;
    panel.inert = !open;
    panel.setAttribute('aria-hidden', String(!open));
    panel.style.height = `${height}px`;
    panel.style.opacity = String(opacity);
    const targetHeight = open ? panel.firstElementChild.getBoundingClientRect().height : 0;
    const animation = panel.animate([
      {height:`${height}px`, opacity},
      {height:`${targetHeight}px`, opacity:open ? 1 : 0}
    ], {duration:380, easing:'cubic-bezier(.22,.61,.36,1)', fill:'forwards'});
    panelAnimations.set(panel, animation);
    animation.onfinish = () => {
      if (panelAnimations.get(panel) === animation) settlePanel(panel, open);
    };
  }
  function selectStep(value, {toggle = false, animate = true} = {}) {
    const requested = Number(value);
    active = toggle && active === requested ? null : requested;
    steps.forEach(b => b.setAttribute('aria-expanded',String(+b.dataset.step===active)));
    panels.forEach(p => setPanelOpen(p, +p.dataset.step===active, animate));
    modules.forEach(m => {const on = +m.dataset.step===active; m.classList.toggle('is-active',on); m.setAttribute('aria-pressed',String(on));});
    get('fert-focus-status').textContent = active === null
      ? tr('All step explanations collapsed','所有步骤说明已收起')
      : tr(`Step ${active} / 4`,`第 ${active} / 4 步`);
  }
  [...steps,...modules].forEach(el => {
    el.addEventListener('click',()=>selectStep(el.dataset.step, {toggle:el.matches('.fert-step-button')}));
    el.addEventListener('keydown',event=>{
      if (['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End'].includes(event.key)) {
        event.preventDefault();
        const current = Number(el.dataset.step);
        const next = event.key==='Home'?1:event.key==='End'?4:(current-1+(['ArrowRight','ArrowDown'].includes(event.key)?1:3))%4+1;
        selectStep(next); steps[next-1].focus({preventScroll:true});
      } else if (el.matches('.fert-module') && ['Enter',' '].includes(event.key)) {event.preventDefault();selectStep(el.dataset.step);}
    });
  });

  const ns = 'http://www.w3.org/2000/svg';
  const lines = get('fert-alignments');
  matches.forEach((match,t)=>{
    match.path.forEach((candidate,q)=>{
      const x1=807.5+q*26, x2=648.5+t%2*184+candidate*21, y2=388+Math.floor(t/2)*59;
      const path=document.createElementNS(ns,'path');
      path.setAttribute('d',`M${x1} 356C${x1} ${y2-20} ${x2} ${y2-25} ${x2} ${y2}`);
      path.setAttribute('class','fert-alignment'); path.dataset.queryFrame=q; lines.append(path);
    });
    get(`fert-cost-${t}`).setAttribute('width',Math.max(8,match.cost/Math.max(...matches.map(m=>m.cost))*173));
    get(`fert-cost-${t}`).classList.toggle('is-selected',selected.some(m=>m.trajectory===t));
    get(`fert-cost-value-${t}`).textContent=match.cost.toFixed(2);
    const outline=get(`fert-interval-${t}`);
    Object.entries({x:639+t%2*184+match.interval[0]*21,y:387+Math.floor(t/2)*59,width:(match.interval[1]-match.interval[0])*21-2,height:19}).forEach(([k,v])=>outline.setAttribute(k,v));
    model.trajectories[t].forEach((_,f)=>{
      const on=f>=match.interval[0]&&f<match.interval[1];
      get(`fert-candidate-${t}-${f}`).classList.toggle('is-matched',on);
      get(`fert-retrieved-${t}-${f}`)?.classList.toggle('is-matched',on);
    });
  });
  get('fert-retrieval-readout').textContent=tr('Lowest-cost candidates: #4 and #1','检索代价最低的候选：#4 和 #1');
  function showQuery(q) {
    root.querySelectorAll('[data-query-frame]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.queryFrame===q)));
    svg.querySelectorAll('.fert-query-token').forEach((token,i)=>token.classList.toggle('is-current',i===q));
    lines.querySelectorAll('path').forEach(line=>line.classList.toggle('is-current',+line.dataset.queryFrame===q));
    matches.forEach((match,t)=>model.trajectories[t].forEach((_,f)=>get(`fert-candidate-${t}-${f}`).classList.toggle('is-current',f===match.path[q])));
    const target=selected.map(m=>`#${m.trajectory+1}: ${m.path[q]+1}`).join(' · ');
    get('fert-query-readout').textContent=tr(`Frame ${q+1} → matched positions ${target}`,`第 ${q+1} 帧 → 匹配位置 ${target}`);
  }
  root.querySelectorAll('[data-query-frame]').forEach(b=>b.addEventListener('click',()=>showQuery(+b.dataset.queryFrame)));
  svg.querySelectorAll('.fert-query-token').forEach((b,q)=>b.addEventListener('click',event=>{event.stopPropagation(); selectStep(3);showQuery(q);}));

  function showPriorities() {
    const weights=after?updated:model.priorities;
    probability=model.probabilities(weights);
    const max=Math.max(...model.priorities.flat(),...updated.flat());
    model.priorities.forEach((row,t)=>row.forEach((weight,c)=>{
      for (const [prefix,value] of [['fert-current',weight],['fert-updated',weights[t][c]],['fert-buffer-weight',weights[t][c]]]) {
        const bar=get(`${prefix}-${t}-${c}`), height=value/max*29;
        bar.setAttribute('height',height.toFixed(2)); bar.setAttribute('y',(+bar.dataset.baseline-height).toFixed(2));
        bar.classList.toggle('is-retrieved',prefix!=='fert-current'&&overlaps(t,c));
        let title=bar.querySelector('title');if(!title){title=document.createElementNS(ns,'title');bar.append(title);}
        title.textContent=tr(`Trajectory ${t+1}, chunk ${c+1}: weight ${value.toFixed(2)}`,`轨迹 ${t+1}，动作块 ${c+1}：权重 ${value.toFixed(2)}`);
      }
    }));
    const mass=probability.reduce((s,row,t)=>s+row.reduce((v,p,c)=>v+(overlaps(t,c)?p:0),0),0);
    get('fert-sampling-readout').textContent=tr(`Overlapping chunks: ${(mass*100).toFixed(1)}% of illustrative sampling probability.`,`重叠动作块的示例采样概率合计 ${(mass*100).toFixed(1)}%。`);
    root.querySelectorAll('[data-priority]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.priority==='after')===after)));
    showBatch();
  }
  function showBatch() {
    svg.querySelectorAll('.fert-buffer-token-sampled').forEach(t=>{t.classList.remove('fert-buffer-token-sampled');t.removeAttribute('stroke');t.removeAttribute('stroke-width');});
    const counts=[0,0,0,0];
    for(let i=0;i<9;i++) {
      seed=(1664525*seed+1013904223)>>>0;
      const sample=model.sample(probability,seed/4294967296);if(!sample)continue;
      counts[sample.trajectory]++;
      const source=get(`fert-buffer-${sample.trajectory}-${sample.chunk}`);
      source.classList.add('fert-buffer-token-sampled');source.setAttribute('stroke','#805b84');source.setAttribute('stroke-width','2.5');
      const token=get(`fert-batch-${i}`);token.setAttribute('fill',['#79abc5','#8aafc3','#709d83','#a0bfae'][sample.trajectory]);
    }
    batch++;
    get('fert-batch-readout').textContent=tr(`Batch ${batch} · 9 chunks. Sources: `,`第 ${batch} 组 · 9 个动作块。来源：`)+counts.map((n,t)=>`#${t+1} × ${n}`).join(' · ');
  }
  root.querySelectorAll('[data-priority]').forEach(b=>b.addEventListener('click',()=>{after=b.dataset.priority==='after';showPriorities();}));
  get('fert-sample').addEventListener('click',showBatch);
  function motion(){root.classList.toggle('is-live',visible&&!document.hidden&&!reduced.matches);}
  if('IntersectionObserver' in window)new IntersectionObserver(e=>{visible=e[0].isIntersecting;motion();},{threshold:.08}).observe(root);
  else{visible=true;motion();}
  document.addEventListener('visibilitychange',motion);
  reduced.addEventListener('change',()=>{
    motion();
    panels.forEach(panel => settlePanel(panel, +panel.dataset.step === active));
  });
  const mobile=matchMedia('(max-width:760px)');
  const hosts=steps.map(b=>b.parentElement);
  const mobileNav=document.createElement('div');mobileNav.className='fert-mobile-nav';mobileNav.setAttribute('aria-label',tr('Algorithm steps','算法步骤'));
  root.querySelector('.fert-visual').before(mobileNav);
  function arrange(){
    panels.forEach(panel => settlePanel(panel, +panel.dataset.step === active));
    steps.forEach((b,i)=>mobile.matches?mobileNav.append(b):hosts[i].prepend(b));
  }
  mobile.addEventListener('change',arrange);arrange();
  // Retarget an opening panel if text wraps differently or a webfont loads mid-animation.
  if ('ResizeObserver' in window) {
    const panelResize = new ResizeObserver(entries => entries.forEach(entry => {
      const panel = entry.target.parentElement;
      if (panelAnimations.has(panel) && +panel.dataset.step === active) setPanelOpen(panel, true, true);
    }));
    panels.forEach(panel => panelResize.observe(panel.firstElementChild));
  }
  showQuery(0);showPriorities();selectStep(1, {animate:false});
})();
