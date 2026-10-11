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
    frame.dataset.ready = 'false';
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

// A short opening gesture eases into the page; scrolling below the cover stays native.
(() => {
  const hero = document.querySelector('.research-hero');
  const content = document.getElementById('project-content');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let scrollFrame = 0, paintFrame = 0, wheelDistance = 0, wheelTime = 0;
  let touchStart = null;

  function paintCover() {
    paintFrame = 0;
    const progress = Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / hero.offsetHeight));
    hero.style.setProperty('--hero-shift', `${progress * hero.offsetHeight * .12}px`);
    hero.style.setProperty('--hero-title-shift', `${progress * hero.offsetHeight * .18}px`);
    hero.style.setProperty('--hero-scale', 1 + progress * .06);
    hero.style.setProperty('--hero-opacity', Math.max(0, 1 - progress * 1.7));
  }

  function schedulePaint() {
    if (!paintFrame) paintFrame = requestAnimationFrame(paintCover);
  }

  function stopTransition() {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
    document.documentElement.classList.remove('hero-transition');
    wheelDistance = 0;
  }

  function atCoverStart() {
    return !reduced.matches && window.scrollY < hero.offsetHeight * .1;
  }

  function enterPage(fromKeyboard = false) {
    if (scrollFrame || !atCoverStart()) return;
    const startY = window.scrollY;
    const targetY = content.getBoundingClientRect().top + startY;
    const started = performance.now();
    document.documentElement.classList.add('hero-transition');
    function advance(now) {
      const progress = Math.min(1, (now - started) / 1100);
      const eased = progress < .5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
      window.scrollTo({top: startY + (targetY - startY) * eased, behavior: 'instant'});
      if (progress < 1) scrollFrame = requestAnimationFrame(advance);
      else {
        stopTransition();
        if (fromKeyboard) content.focus({preventScroll:true});
      }
    }
    scrollFrame = requestAnimationFrame(advance);
  }

  window.addEventListener('wheel', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    if (scrollFrame) {
      if (event.deltaY < 0) stopTransition();
      else event.preventDefault();
      return;
    }
    if (!atCoverStart() || !hero.contains(event.target) || event.deltaY <= 0) return;
    event.preventDefault();
    const now = performance.now();
    if (now - wheelTime > 180) wheelDistance = 0;
    wheelTime = now;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
    wheelDistance += event.deltaY * unit;
    if (wheelDistance >= 18) enterPage();
  }, {passive:false});

  hero.addEventListener('touchstart', event => {
    touchStart = event.touches.length === 1 && atCoverStart()
      ? {x:event.touches[0].clientX, y:event.touches[0].clientY} : null;
  }, {passive:true});
  hero.addEventListener('touchmove', event => {
    if (!touchStart || event.touches.length !== 1) return;
    const dx = touchStart.x - event.touches[0].clientX;
    const dy = touchStart.y - event.touches[0].clientY;
    if (Math.abs(dx) >= Math.abs(dy)) return;
    if (dy < 0) { stopTransition(); touchStart = null; return; }
    event.preventDefault();
    if (dy >= 32) enterPage();
  }, {passive:false});
  for (const name of ['touchend', 'touchcancel']) {
    hero.addEventListener(name, () => { touchStart = null; }, {passive:true});
  }

  window.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey ||
        event.target.closest('a,button,input,select,textarea,summary,video,[contenteditable]')) return;
    if (scrollFrame) {
      if (['Escape', 'ArrowUp', 'PageUp', 'Home', 'End'].includes(event.key)) stopTransition();
      else if (['ArrowDown', 'PageDown', ' '].includes(event.key)) event.preventDefault();
      return;
    }
    if (atCoverStart() && ['ArrowDown', 'PageDown', ' '].includes(event.key)) {
      event.preventDefault();
      enterPage(true);
    }
  });
  window.addEventListener('scroll', schedulePaint, {passive:true});
  window.addEventListener('resize', () => { stopTransition(); schedulePaint(); });
  window.addEventListener('hashchange', stopTransition);
  window.addEventListener('pagehide', stopTransition);
  window.addEventListener('pageshow', paintCover);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopTransition(); });
  reduced.addEventListener('change', () => { stopTransition(); schedulePaint(); });
  paintCover();
})();

// Keep fleet-video playback tied to visibility and the viewer's own pause.
(() => {
  const windowElement = document.getElementById('title-video-window');
  const video = document.getElementById('title-video');
  let videoVisible = false;
  let autoPaused = false, manuallyPaused = false, changingPlayback = false;

  // Preserve a viewer's own pause when the video leaves the viewport.
  function syncVideo() {
    if (!video.getAttribute('src') || video.hidden) return;
    const shouldPlay = videoVisible && !document.hidden;
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
    else if (videoVisible && !document.hidden) manuallyPaused = true;
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

  document.addEventListener('visibilitychange', syncVideo);
})();

// Start off-screen blocks transparent so entering view never restarts a visible frame.
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches || !('IntersectionObserver' in window)) return;

  const blocks = [...document.querySelectorAll([
    '.section-heading > *', '.overview-highlights > div', '.project-details',
    '.task-showcase > .figure-header', '.task-carousel-caption > *',
    '.stages-figure > .figure-header', '.stages > div', '.stages-figure > figcaption',
    '.retrieval-figure', '.fert-framework', '.research-results > .results-heading',
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
