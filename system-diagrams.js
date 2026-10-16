(() => {
  'use strict';

  const configurations = {
    architecture: {
      overview: {
        title: 'FATS keeps the fleet learning.',
        copy: 'Robot workers execute locally; inference, trajectory assembly and training run in the cloud. HotSwarm recovers failed workers while the others continue.'
      },
      details: {
        control: {
          title: 'HotSwarm control plane.',
          copy: 'HotSwarm manages worker membership and identities, detects failures and rebuilds the affected connections.'
        },
        robots: {
          title: 'Robot fleet.',
          copy: 'Environment workers acquire observations, execute action chunks from cloud inference and stream execution records and outcomes.'
        },
        interaction: {
          title: 'Shared cloud inference.',
          copy: 'Available cloud workers batch ready observations and return action chunks to the sending robot. They dispatch at a batch target or timeout, so slower robots do not hold up the others.'
        },
        experience: {
          title: 'Trajectory assembly in the cloud.',
          copy: 'The collector reuses inference observations and outputs, joins them with robot records, and releases an episode only after its required data and outcome arrive.'
        },
        policy: {
          title: 'Policy updates within the cloud.',
          copy: 'Training workers improve the policy from complete experience and send updates to cloud inference workers.'
        }
      },
      routes: {
        control: ['control'],
        robots: ['control', 'interaction', 'experience'],
        interaction: ['interaction'],
        experience: ['experience'],
        policy: ['policy']
      }
    },
    streaming: {
      overview: {
        title: 'Experience arrives as robots work.',
        copy: 'The cloud collector combines inference data with robot records and releases complete episodes for training.'
      },
      details: {
        reuse: {
          title: 'Reuse inference data.',
          copy: 'Observations and policy outputs already present in the cloud enter the collector without a second upload of those observations.'
        },
        records: {
          title: 'Stream robot records.',
          copy: 'Environment workers send execution records, task outcomes and any additional frames while the robot continues operating.'
        },
        join: {
          title: 'Join the corresponding records.',
          copy: 'Worker, episode and step identifiers associate the fields even when different inference workers serve successive requests.'
        },
        complete: {
          title: 'Train on complete episodes.',
          copy: 'The collector releases an episode only after every required field and its outcome have arrived.'
        }
      },
      routes: {
        reuse: ['inference'],
        records: ['records'],
        join: ['inference', 'records'],
        complete: ['complete']
      }
    },
    recovery: {
      overview: {
        title: 'Recovery without a fleet-wide pause.',
        copy: 'Other robots keep collecting while a failed worker restarts in place with a new identity.'
      },
      details: {
        continuity: {
          title: 'Other robots keep collecting.',
          copy: 'A local worker failure leaves the rest of the fleet collecting new experience.'
        },
        restart: {
          title: 'Restart with a new identity.',
          copy: 'The failed control process restarts at the same workstation and reconnects as a new worker.'
        },
        discard: {
          title: 'Discard stale actions.',
          copy: 'Late actions for the previous worker are discarded, so they cannot cross the restart boundary.'
        },
        execute: {
          title: 'Execute fresh actions.',
          copy: 'The restarted worker accepts actions addressed to its new identity and resumes execution.'
        }
      },
      routes: {
        continuity: ['continuity'],
        restart: ['restart'],
        discard: ['discard'],
        execute: ['execute']
      }
    }
  };

  const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

  const initializeFigure = figure => {
    if (figure.dataset.systemDiagramReady === 'true') return;
    const config = configurations[figure.dataset.systemDiagram];
    if (!config) return;

    const controls = Array.from(figure.querySelectorAll('.system-hotspot[data-system-focus]'))
      .filter(control => hasOwn(config.details, control.dataset.systemFocus));
    if (!controls.length) return;
    figure.dataset.systemDiagramReady = 'true';

    const flows = Array.from(figure.querySelectorAll('.system-flow[data-system-route]'));
    const title = figure.querySelector('[data-system-title]');
    const copy = figure.querySelector('[data-system-copy]');
    const overview = {
      title: title && title.textContent.trim() ? title.textContent : config.overview.title,
      copy: copy && copy.textContent.trim() ? copy.textContent : config.overview.copy
    };
    const motion = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : { matches: false };
    let visible = !('IntersectionObserver' in window);
    let pinned = controls.find(control => control.getAttribute('aria-pressed') === 'true')?.dataset.systemFocus || null;
    let hovered = null;
    let focused = null;
    let preview = null;
    let flowFrame = null;

    const current = () => preview ? preview.dataset.systemFocus : pinned;
    const canAnimate = () => visible && !motion.matches && !document.hidden;
    const currentRoutes = () => {
      const key = current();
      return key ? new Set(config.routes[key]) : null;
    };
    const isCurrentFlow = (flow, routes) => !routes || routes.has(flow.dataset.systemRoute);

    const stopFlow = () => {
      if (flowFrame !== null) {
        window.cancelAnimationFrame(flowFrame);
        flowFrame = null;
      }
      flows.forEach(flow => flow.classList.remove('is-flowing'));
    };

    const updateFlow = (restart = false) => {
      if (!canAnimate()) {
        stopFlow();
        return;
      }
      if (!restart) return;
      stopFlow();
      const displayed = current();
      // Keep a painted frame without the class so Safari restarts repeated selections.
      flowFrame = window.requestAnimationFrame(() => {
        flowFrame = window.requestAnimationFrame(() => {
          flowFrame = null;
          if (displayed !== current() || !canAnimate()) return;
          const routes = currentRoutes();
          flows.forEach(flow => {
            if (isCurrentFlow(flow, routes)) flow.classList.add('is-flowing');
          });
        });
      });
    };

    const render = (restartFlow = true) => {
      const key = current();
      controls.forEach(control => {
        const selected = control.dataset.systemFocus === pinned;
        const displayed = control.dataset.systemFocus === key;
        control.setAttribute('aria-pressed', String(selected));
        control.classList.toggle('is-active', selected);
        control.classList.toggle('is-preview', displayed && !selected);
        control.classList.toggle('is-displayed', displayed);
      });
      const detail = key ? config.details[key] : overview;
      if (title && title.textContent !== detail.title) title.textContent = detail.title;
      if (copy && copy.textContent !== detail.copy) copy.textContent = detail.copy;
      const routes = currentRoutes();
      flows.forEach(flow => flow.classList.toggle('is-highlighted', Boolean(key) && isCurrentFlow(flow, routes)));
      updateFlow(restartFlow);
    };

    const pin = control => {
      pinned = control.dataset.systemFocus;
      preview = control;
      render();
    };

    controls.forEach((control, index) => {
      control.addEventListener('pointerenter', event => {
        if (event.pointerType === 'touch') return;
        hovered = control;
        preview = control;
        render();
      });

      control.addEventListener('pointerleave', event => {
        if (event.pointerType === 'touch') return;
        if (hovered === control) hovered = null;
        if (preview === control) preview = focused;
        render();
      });

      control.addEventListener('focus', () => {
        focused = control;
        preview = control;
        render();
      });

      control.addEventListener('blur', () => {
        if (focused === control) focused = null;
        if (preview === control) preview = hovered;
        render();
      });

      control.addEventListener('click', () => pin(control));

      control.addEventListener('keydown', event => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
          event.preventDefault();
          if (!event.repeat) pin(control);
          return;
        }
        let next;
        switch (event.key) {
          case 'ArrowRight':
          case 'ArrowDown': next = (index + 1) % controls.length; break;
          case 'ArrowLeft':
          case 'ArrowUp': next = (index + controls.length - 1) % controls.length; break;
          case 'Home': next = 0; break;
          case 'End': next = controls.length - 1; break;
          default: return;
        }
        event.preventDefault();
        hovered = null;
        pinned = controls[next].dataset.systemFocus;
        preview = controls[next];
        controls[next].focus({ preventScroll: true });
        controls[next].scrollIntoView({
          block: 'nearest',
          inline: 'nearest',
          behavior: motion.matches ? 'auto' : 'smooth'
        });
        render();
      });
    });

    // Restore each path's original stroke after the two-pass animation finishes.
    figure.addEventListener('animationend', event => {
      if (event.animationName === 'system-diagram-flow' && flows.includes(event.target)) {
        event.target.classList.remove('is-flowing');
      }
    });

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.target !== figure) return;
          const inView = entry.isIntersecting && entry.intersectionRatio >= .12;
          const entered = inView && !visible;
          visible = inView;
          updateFlow(entered);
        });
      }, { threshold: [0, .12] });
      observer.observe(figure);
    }

    const onMotionChange = () => updateFlow(true);
    if (typeof motion.addEventListener === 'function') motion.addEventListener('change', onMotionChange);
    else if (typeof motion.addListener === 'function') motion.addListener(onMotionChange);
    document.addEventListener('visibilitychange', () => updateFlow(!document.hidden));
    render();
  };

  const initialize = () => {
    document.querySelectorAll('.system-diagram[data-system-diagram]').forEach(initializeFigure);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
