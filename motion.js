const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
let cleanup = () => {};
let firstRender = true;
let motionEnabled = preference.matches ? false : localStorage.getItem('pg-motion') !== 'off';

export function initMotion(root) {
  cleanup();
  const controller = new AbortController();
  const { signal } = controller;
  const animations = new Set();
  let frame = 0;
  let observer;
  const animate = (element, keyframes, options) => {
    const animation = element.animate(keyframes, options);
    animations.add(animation);
    animation.finished.then(() => animations.delete(animation)).catch(() => {});
  };

  document.documentElement.classList.toggle('motion-on', motionEnabled);
  const footer = root.querySelector('footer');
  const toggle = document.createElement('button');
  toggle.className = 'motion-toggle';
  toggle.type = 'button';
  toggle.textContent = `Анимация: ${motionEnabled ? 'вкл' : 'выкл'}`;
  toggle.setAttribute('aria-pressed', String(motionEnabled));
  toggle.disabled = preference.matches;
  if (preference.matches) {
    toggle.textContent = 'Анимация: выкл';
    toggle.title = 'Отключено системной настройкой уменьшенного движения';
  }
  toggle.addEventListener('click', () => {
    motionEnabled = !motionEnabled;
    localStorage.setItem('pg-motion', motionEnabled ? 'on' : 'off');
    initMotion(root);
  }, { signal });
  footer?.querySelector('.motion-toggle')?.remove();
  footer?.append(toggle);

  const progress = document.createElement('div');
  progress.className = 'reading-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.append(progress);
  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
    frame = 0;
  };
  window.addEventListener('scroll', () => {
    if (!frame) frame = requestAnimationFrame(updateProgress);
  }, { passive: true, signal });
  updateProgress();

  if (motionEnabled) {
    if (firstRender) {
      root.querySelectorAll('.hero-copy > *, .reference-star, .genre-stamps, .hero-create, .hero-watch').forEach((element, index) => {
        animate(element, [{ opacity: 0, translate: '0 18px' }, { opacity: 1, translate: '0 0' }], {
          duration: 650, delay: index * 65, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards',
        });
      });
    }
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        // Start only on entry: unrevealed content always remains accessible.
        const siblings = [...entry.target.parentElement.children];
        const delay = Math.min(3, siblings.indexOf(entry.target)) * 65;
        animate(entry.target, [{ opacity: .15, translate: '0 24px' }, { opacity: 1, translate: '0 0' }], {
          duration: 650, delay, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards',
        });
      });
    }, { threshold: .12 });
    root.querySelectorAll('.editorial-intro, .game-card, .step, .price-card, .section-top, .end-banner').forEach(el => observer.observe(el));

    if (finePointer.matches) {
      root.querySelectorAll('.game-card, .price-card').forEach(card => {
        card.addEventListener('pointermove', event => {
          const rect = card.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width - .5;
          const y = (event.clientY - rect.top) / rect.height - .5;
          card.style.setProperty('--tilt-x', `${-y * 5}deg`);
          card.style.setProperty('--tilt-y', `${x * 5}deg`);
        }, { signal });
        card.addEventListener('pointerleave', () => {
          card.style.removeProperty('--tilt-x');
          card.style.removeProperty('--tilt-y');
        }, { signal });
      });
    }
  }
  firstRender = false;
  const preferenceChanged = () => {
    motionEnabled = !preference.matches && localStorage.getItem('pg-motion') !== 'off';
    initMotion(root);
  };
  preference.addEventListener('change', preferenceChanged, { signal });
  cleanup = () => {
    controller.abort();
    observer?.disconnect();
    animations.forEach(a => a.cancel());
    if (frame) cancelAnimationFrame(frame);
    progress.remove();
    root.querySelectorAll('[style*="--tilt"]').forEach(el => {
      el.style.removeProperty('--tilt-x');
      el.style.removeProperty('--tilt-y');
    });
  };
}

export function celebrate() {
  if (!motionEnabled || preference.matches) return;
  const layer = document.createElement('div');
  layer.className = 'confetti';
  layer.setAttribute('aria-hidden', 'true');
  document.body.append(layer);
  for (let i = 0; i < 32; i++) {
    const piece = document.createElement('i');
    piece.style.background = ['#d0f437', '#9760eb', '#e3e3e3'][i % 3];
    piece.style.left = `${20 + Math.random() * 60}%`;
    layer.append(piece);
    piece.animate([
      { transform: `translateY(0) rotate(${i * 17}deg)`, opacity: 0 },
      { opacity: 1, offset: .1 },
      { transform: `translate(${(Math.random() - .5) * 250}px, 70vh) rotate(${i * 43}deg)`, opacity: 0 },
    ], { duration: 1500 + Math.random() * 500, delay: Math.random() * 180, easing: 'cubic-bezier(.15,.5,.4,1)', fill: 'both' });
  }
  setTimeout(() => layer.remove(), 2400);
}
