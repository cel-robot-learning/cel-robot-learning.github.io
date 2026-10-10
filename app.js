'use strict';

const {tasks, trials} = window.RESEARCH_DATA;
const percent = count => (100 * count / trials).toFixed(1);
const byId = id => document.getElementById(id);

const titleVideo = byId('title-video');
if (titleVideo.dataset.src) {
  const frame = titleVideo.closest('.title-video-frame');
  titleVideo.muted = true;
  titleVideo.src = titleVideo.dataset.src;
  titleVideo.hidden = false;
  titleVideo.addEventListener('loadeddata', () => {
    frame.dataset.ready = 'true';
  }, {once: true});
  titleVideo.addEventListener('error', () => {
    titleVideo.hidden = true;
    frame.dataset.ready = 'false';
  });
  titleVideo.load();
}

const taskViewport = byId('task-frame');
const taskSlides = Array.from(document.querySelectorAll('[data-task-slide]'));
const taskVideos = taskSlides.map(slide => slide.querySelector('video'));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let activeTask = 0;
let navigationTarget = null;
let taskVideosVisible = false;
let scrollFrame = 0;
let scrollTimer = 0;

function syncTaskPlayback() {
  taskVideos.forEach((video, index) => {
    video.inert = index !== activeTask;
    if (index === activeTask && taskVideosVisible && !document.hidden && video.getAttribute('src')) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  });
}

function showTask(index) {
  activeTask = index;
  const key = taskSlides[index].dataset.taskSlide;
  const task = tasks[key];
  const [robots, successes] = task.fert.at(-1);
  byId('task-title').textContent = task.title;
  byId('task-description').textContent = task.description;
  byId('task-rate').innerHTML = `${percent(successes)}<span>%</span>`;
  byId('task-trials').textContent = `${successes} successful trials out of ${trials}`;
  byId('task-robots').textContent = `${robots} training robots`;
  byId('task-position').textContent = `${index + 1} / ${taskSlides.length}`;
  byId('task-previous').disabled = index === 0;
  byId('task-next').disabled = index === taskSlides.length - 1;
  taskSlides.forEach((slide, position) => slide.classList.toggle('is-active', position === index));
  syncTaskPlayback();
}

function slideOffset(index) {
  return taskSlides[index].offsetLeft - taskSlides[0].offsetLeft;
}

function nearestTask() {
  return taskSlides.reduce((nearest, slide, index) =>
    Math.abs(slideOffset(index) - taskViewport.scrollLeft) < Math.abs(slideOffset(nearest) - taskViewport.scrollLeft) ? index : nearest, 0);
}

function goToTask(index, animate = true) {
  index = Math.max(0, Math.min(taskSlides.length - 1, index));
  navigationTarget = index;
  showTask(index);
  const left = slideOffset(index);
  taskViewport.scrollTo({left, behavior: animate && !reducedMotion.matches ? 'smooth' : 'instant'});
  if (Math.abs(taskViewport.scrollLeft - left) < 1) navigationTarget = null;
}

byId('task-previous').addEventListener('click', () => goToTask(activeTask - 1));
byId('task-next').addEventListener('click', () => goToTask(activeTask + 1));
taskSlides.forEach((slide, index) => {
  slide.addEventListener('click', () => {
    if (index !== activeTask) goToTask(index);
  });
});
taskViewport.addEventListener('keydown', event => {
  if (event.target.closest('video')) return;
  const target = {ArrowLeft: activeTask - 1, ArrowRight: activeTask + 1, Home: 0, End: taskSlides.length - 1}[event.key];
  if (target === undefined) return;
  event.preventDefault();
  goToTask(target);
});
taskViewport.addEventListener('scroll', () => {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0;
    if (navigationTarget !== null && Math.abs(taskViewport.scrollLeft - slideOffset(navigationTarget)) < 1) navigationTarget = null;
    if (navigationTarget === null) {
      const index = nearestTask();
      if (index !== activeTask) showTask(index);
    }
  });
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    navigationTarget = null;
    const index = nearestTask();
    if (index !== activeTask) showTask(index);
  }, 160);
}, {passive: true});

taskVideos.forEach(video => {
  if (!video.dataset.src) return;
  const frame = video.closest('.task-video-frame');
  video.muted = true;
  video.src = video.dataset.src;
  video.hidden = false;
  video.addEventListener('loadeddata', () => {
    frame.dataset.ready = 'true';
    syncTaskPlayback();
  }, {once: true});
  video.addEventListener('error', () => {
    video.hidden = true;
    frame.dataset.ready = 'false';
    frame.querySelector('.task-video-placeholder p').textContent = 'Video unavailable';
  });
  video.load();
});
new IntersectionObserver(entries => {
  const visible = entries[0].isIntersecting;
  if (visible !== taskVideosVisible) {
    taskVideosVisible = visible;
    syncTaskPlayback();
  }
}, {threshold: 0.2}).observe(taskViewport);
new ResizeObserver(() => goToTask(activeTask, false)).observe(taskViewport);
document.addEventListener('visibilitychange', syncTaskPlayback);
showTask(0);

// Title background and fleet-video presentation.
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hero = document.querySelector('.research-hero');
  const canvas = document.getElementById('hero-field');
  const context = canvas.getContext('2d');
  let width = 0, height = 0, step = 26;
  let pointer = {x: -1000, y: -1000};
  let heroVisible = false, animationFrame = 0, lastDraw = 0;
  let elapsed = 0, lastTick = 0;

  // Decorative field only: it does not encode experiment data or robot counts.
  function drawField(time) {
    if (!context || !width || !height) return;
    context.clearRect(0, 0, width, height);
    const sweep = (time * .025) % (width + 300) - 150;
    for (let row = 0; row < Math.ceil(height / step); row++) {
      for (let col = 0; col < Math.ceil(width / step); col++) {
        const x = col * step + 4, y = row * step + 4;
        const seed = (Math.sin(col * 12.9898 + row * 78.233) * 43758.5453) % 1;
        const distance = Math.hypot(x - pointer.x, y - pointer.y);
        const hover = Math.max(0, 1 - distance / 155);
        const wave = Math.exp(-Math.pow((x - sweep) / 95, 2));
        const pulse = .5 + .5 * Math.sin(time * .0013 + seed * 6.28);
        // Keep the center light so the full manuscript title remains readable.
        const edge = .25 + .75 * Math.pow(Math.abs(x / width - .5) * 2, .8);
        const alpha = (.04 + .045 * Math.abs(seed) + .13 * wave * pulse + .32 * hover) * edge;
        context.fillStyle = `rgba(50,101,138,${alpha.toFixed(3)})`;
        context.fillRect(x, y, step - 8, step - 8);
      }
    }
  }

  function loop(now) {
    animationFrame = 0;
    if (!heroVisible || document.hidden || reduced.matches) { lastTick = 0; return; }
    if (lastTick) elapsed += Math.min(64, now - lastTick);
    lastTick = now;
    if (now - lastDraw > 32) { drawField(elapsed); lastDraw = now; }
    animationFrame = requestAnimationFrame(loop);
  }

  function syncField() {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    lastTick = 0;
    if (!heroVisible || document.hidden) return;
    if (reduced.matches) drawField(4000);
    else animationFrame = requestAnimationFrame(loop);
  }

  function sizeField() {
    if (!context) return;
    width = hero.clientWidth;
    height = hero.clientHeight;
    step = width < 600 ? 22 : 26;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawField(reduced.matches ? 4000 : elapsed);
  }

  if (context) {
    new ResizeObserver(sizeField).observe(hero);
    new IntersectionObserver(entries => {
      heroVisible = entries[0].isIntersecting;
      syncField();
    }).observe(hero);
    hero.addEventListener('pointermove', event => {
      if (reduced.matches || event.pointerType === 'touch') return;
      const bounds = hero.getBoundingClientRect();
      pointer = {x: event.clientX - bounds.left, y: event.clientY - bounds.top};
    }, {passive:true});
    hero.addEventListener('pointerleave', () => { pointer = {x:-1000, y:-1000}; });
  }

  const figure = document.querySelector('.title-video');
  const windowElement = document.getElementById('title-video-window');
  const toggle = document.getElementById('title-video-toggle');
  const video = document.getElementById('title-video');
  let videoVisible = false, folded = false;
  let autoPaused = false, manuallyPaused = false, changingPlayback = false;

  // Preserve a viewer's own pause when the video leaves the viewport or folds away.
  function syncVideo() {
    if (!video.getAttribute('src') || video.hidden) return;
    const shouldPlay = videoVisible && !folded && !document.hidden;
    if (!shouldPlay && !video.paused) {
      autoPaused = true;
      changingPlayback = true;
      video.pause();
    } else if (shouldPlay && !manuallyPaused && (autoPaused || !video.dataset.playbackStarted)) {
      autoPaused = false;
      video.dataset.playbackStarted = 'true';
      video.play().catch(() => {});
    }
  }
  video.addEventListener('pause', () => {
    if (changingPlayback) changingPlayback = false;
    else if (videoVisible && !folded && !document.hidden) manuallyPaused = true;
  });
  video.addEventListener('play', () => {
    manuallyPaused = false;
    video.dataset.playbackStarted = 'true';
    syncVideo();
  });
  video.addEventListener('loadeddata', syncVideo);
  new IntersectionObserver(entries => {
    videoVisible = entries[0].isIntersecting;
    syncVideo();
  }, {threshold:.1}).observe(windowElement);
  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    folded = !folded;
    figure.classList.toggle('is-folded', folded);
    windowElement.inert = folded;
    windowElement.setAttribute('aria-hidden', String(folded));
    toggle.setAttribute('aria-expanded', String(!folded));
    toggle.querySelector('span').textContent = folded ? 'Show video' : 'Hide video';
    syncVideo();
  });

  reduced.addEventListener('change', syncField);
  document.addEventListener('visibilitychange', () => { syncField(); syncVideo(); });
})();

// Start off-screen blocks transparent so entering view never restarts a visible frame.
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches || !('IntersectionObserver' in window)) return;

  const blocks = [...document.querySelectorAll([
    '.project-masthead > h1', '.project-masthead > .project-affiliations',
    '.section-heading > *', '.overview-highlights > div', '.project-details',
    '.task-showcase > .figure-header', '.task-carousel-caption > *',
    '.stages-figure > .figure-header', '.stages > div', '.stages-figure > figcaption',
    '.retrieval-figure', '.research-results > .results-heading',
    '.research-results > .results-legend', '.research-results > figcaption',
    '.research-results > details', '.research-results > .fault-analysis-intro',
    '.fault-analysis-figure > .paper-diagram', '.prose > h3', '.prose > p',
    '.prose > figure', '.prose > details', '.site-footer'
  ].join(','))];

  function finish(block) {
    block.dataset.contentReveal = 'revealed';
    block.classList.remove('content-reveal-in');
    observer.unobserve(block);
  }

  const observer = new IntersectionObserver(entries => {
    for (const {target, isIntersecting} of entries) {
      if (!isIntersecting || target.dataset.contentReveal !== 'pending') continue;
      target.dataset.contentReveal = 'revealed';
      observer.unobserve(target);
      target.classList.add('content-reveal-in');
    }
  }, {rootMargin: '0px 0px -64px 0px', threshold: 0});

  for (const block of blocks) {
    // Preserve anything already painted in the viewport, including restored scroll positions.
    if (block.getBoundingClientRect().top < window.innerHeight) {
      finish(block);
      continue;
    }
    const siblings = [...block.parentElement.children];
    const staggered = block.parentElement.matches(
      '.project-masthead, .section-heading, .overview-highlights, .stages, .task-carousel-caption'
    );
    block.style.setProperty('--content-reveal-delay', `${staggered ? Math.min(siblings.indexOf(block), 2) * 120 : 0}ms`);
    block.dataset.contentReveal = 'pending';
    block.addEventListener('animationend', event => {
      if (event.target === block && event.animationName === 'content-enter') finish(block);
    });
    observer.observe(block);
  }

  // Direct navigation and keyboard focus should be immediately readable.
  function showRelated(target) {
    for (const block of blocks) {
      if (block === target || block.contains(target) || target.contains(block)) finish(block);
    }
  }
  function showFragment() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (target && id !== 'top') showRelated(target);
  }
  document.addEventListener('focusin', event => showRelated(event.target));
  window.addEventListener('hashchange', showFragment);
  window.addEventListener('beforeprint', () => blocks.forEach(finish));
  reduced.addEventListener('change', () => {
    if (reduced.matches) blocks.forEach(finish);
  });
  showFragment();
})();
