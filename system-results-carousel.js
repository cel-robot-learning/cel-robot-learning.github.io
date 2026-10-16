(() => {
  'use strict';

  const initialise = figure => {
    if (!figure || figure.dataset.systemResultsReady === 'true') return;
    const viewport = figure.querySelector('[data-system-results-viewport]');
    const slides = Array.from(figure.querySelectorAll('[data-system-result-slide]'));
    const captions = Array.from(figure.querySelectorAll('[data-system-result-caption]'));
    const previous = figure.querySelector('[data-system-results-previous]');
    const next = figure.querySelector('[data-system-results-next]');
    const counter = figure.querySelector('[data-system-results-counter]');
    if (!viewport || !slides.length || !previous || !next || captions.length !== slides.length) return;
    figure.dataset.systemResultsReady = 'true';
    const motion = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    let active = 0;
    let target = null;
    let frame = null;
    let timer = null;
    const offset = index => slides[index].offsetLeft - slides[0].offsetLeft;
    const nearest = () => slides.reduce((best, slide, index) =>
      Math.abs(offset(index) - viewport.scrollLeft) < Math.abs(offset(best) - viewport.scrollLeft) ? index : best, 0);
    const show = index => {
      active = index;
      slides.forEach((slide, position) => {
        slide.classList.toggle('is-active', position === active);
        slide.setAttribute('aria-hidden', String(position !== active));
      });
      captions.forEach((caption, position) => { caption.hidden = position !== active; });
      previous.disabled = active === 0;
      next.disabled = active === slides.length - 1;
      if (counter) {
        counter.textContent = `${active + 1} / ${slides.length}`;
        counter.setAttribute('aria-label', `${active + 1} of ${slides.length}: ${slides[active].dataset.systemResultTitle}`);
      }
    };
    const goTo = (index, animate = true) => {
      const selected = Math.min(slides.length - 1, Math.max(0, index));
      target = selected;
      show(selected);
      viewport.scrollTo({ left: offset(selected), behavior: animate && !motion.matches ? 'smooth' : 'instant' });
      if (Math.abs(viewport.scrollLeft - offset(selected)) < 1) target = null;
    };
    const syncScroll = () => {
      frame = null;
      if (target !== null && Math.abs(viewport.scrollLeft - offset(target)) < 1) target = null;
      if (target === null) show(nearest());
    };
    previous.addEventListener('click', () => goTo(active - 1));
    next.addEventListener('click', () => goTo(active + 1));
    viewport.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const indices = { ArrowLeft: active - 1, ArrowRight: active + 1, Home: 0, End: slides.length - 1 };
      if (!(event.key in indices)) return;
      event.preventDefault();
      goTo(indices[event.key]);
    });
    viewport.addEventListener('scroll', () => {
      if (frame === null) frame = window.requestAnimationFrame(syncScroll);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { target = null; show(nearest()); }, 160);
    }, { passive: true });
    // A touch or pointer gesture takes over from an arrow-triggered smooth scroll.
    viewport.addEventListener('pointerdown', () => { target = null; }, { passive: true });
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(() => goTo(active, false));
      observer.observe(viewport);
    } else {
      window.addEventListener('resize', () => goTo(active, false), { passive: true });
    }
    show(0);
  };

  if (typeof module === 'object' && module.exports) module.exports = { initialise };
  if (typeof document === 'undefined') return;
  const initialiseAll = () => document.querySelectorAll('[data-system-results-carousel]').forEach(initialise);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialiseAll, { once: true });
  else initialiseAll();
})();
