(() => {
  'use strict';

  const initialize = () => {
    const figure = document.getElementById('cel-sources');
    if (!figure || figure.dataset.celSourcesReady === 'true') return;

    const details = {
      demonstrations: {
        title: 'Human demonstrations.',
        copy: 'Experts provide action trajectories for supervised fine-tuning.'
      },
      corrections: {
        title: 'Human corrections.',
        copy: 'Experts take over during robot execution and provide corrective actions for policy updates.'
      },
      collective: {
        title: 'Fleet experience.',
        copy: 'Successful robot actions supply supervision; failure contexts guide which experience to revisit.'
      }
    };

    const cards = Array.from(figure.querySelectorAll('.cel-source-card[data-cel-source]'))
      .filter(card => Object.hasOwn(details, card.dataset.celSource));
    if (!cards.length) return;
    figure.dataset.celSourcesReady = 'true';

    const title = figure.querySelector('[data-cel-detail-title]');
    const copy = figure.querySelector('[data-cel-detail-copy]');
    const motion = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : { matches: false };
    const visible = new Map(cards.map(card => [card, !('IntersectionObserver' in window)]));
    let pinned = cards.find(card => card.getAttribute('aria-pressed') === 'true')
      || cards.find(card => card.dataset.celSource === 'collective') || cards[0];
    let hovered = null;
    let focused = null;
    let preview = null;
    let flowFrame = null;

    const current = () => preview || pinned;
    const canAnimate = card => !motion.matches && !document.hidden && visible.get(card);

    const updateFlow = (restart = false) => {
      if (flowFrame !== null) {
        window.cancelAnimationFrame(flowFrame);
        flowFrame = null;
      }
      const displayed = current();
      cards.forEach(card => {
        if (card !== displayed || restart || !canAnimate(card)) card.classList.remove('is-flowing');
      });
      if (!canAnimate(displayed) || displayed.classList.contains('is-flowing')) return;

      // Restart only after a new interaction or when the card enters view.
      // The CSS animation runs twice and then rests until the next trigger.
      flowFrame = window.requestAnimationFrame(() => {
        flowFrame = window.requestAnimationFrame(() => {
        // Leave one frame without the class so repeated clicks restart in Safari too.
        flowFrame = window.requestAnimationFrame(() => {
          flowFrame = null;
          if (displayed === current() && canAnimate(displayed)) displayed.classList.add('is-flowing');
        });
        });
      });
    };

    const render = (restartFlow = true) => {
      const displayed = current();
      cards.forEach(card => {
        const selected = card === pinned;
        card.setAttribute('aria-pressed', String(selected));
        card.classList.toggle('is-active', selected);
        card.classList.toggle('is-preview', card === displayed && !selected);
      });
      const detail = details[displayed.dataset.celSource];
      // Avoid repeating the same announcement when focus and click coincide.
      if (title && title.textContent !== detail.title) title.textContent = detail.title;
      if (copy && copy.textContent !== detail.copy) copy.textContent = detail.copy;
      updateFlow(restartFlow);
    };

    cards.forEach((card, index) => {
      card.addEventListener('pointerenter', event => {
        if (event.pointerType === 'touch') return;
        hovered = card;
        preview = card;
        render();
      });

      card.addEventListener('pointerleave', event => {
        if (event.pointerType === 'touch') return;
        if (hovered === card) hovered = null;
        if (preview === card) preview = focused;
        render();
      });

      card.addEventListener('focus', () => {
        focused = card;
        preview = card;
        render();
      });

      card.addEventListener('blur', () => {
        if (focused === card) focused = null;
        if (preview === card) preview = hovered;
        render();
      });

      // Native buttons supply click for pointer, Enter and Space activation.
      card.addEventListener('click', () => {
        pinned = card;
        preview = card;
        render();
      });

      card.addEventListener('keydown', event => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        let next;
        switch (event.key) {
          case 'ArrowRight':
          case 'ArrowDown': next = (index + 1) % cards.length; break;
          case 'ArrowLeft':
          case 'ArrowUp': next = (index + cards.length - 1) % cards.length; break;
          case 'Home': next = 0; break;
          case 'End': next = cards.length - 1; break;
          default: return;
        }
        event.preventDefault();
        hovered = null;
        pinned = cards[next];
        preview = pinned;
        pinned.focus({ preventScroll: true });
        pinned.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: motion.matches ? 'auto' : 'smooth' });
        render();
      });
    });

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        let entered = false;
        entries.forEach(entry => {
          const inView = entry.isIntersecting && entry.intersectionRatio >= .12;
          if (entry.target === current() && inView && !visible.get(entry.target)) entered = true;
          visible.set(entry.target, inView);
        });
        updateFlow(entered);
      }, { threshold: [0, .12] });
      cards.forEach(card => observer.observe(card));
    }

    const onMotionChange = () => updateFlow(true);
    if (typeof motion.addEventListener === 'function') motion.addEventListener('change', onMotionChange);
    else if (typeof motion.addListener === 'function') motion.addListener(onMotionChange);
    document.addEventListener('visibilitychange', () => updateFlow(!document.hidden));
    render();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
