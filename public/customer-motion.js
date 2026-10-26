(() => {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (preference.matches || !('IntersectionObserver' in window)) return;
  const running = new Set();
  const active = new Map();
  const pending = new Map();
  function restore(element) {
    const original = pending.get(element);
    if (!original) return;
    if (original.value) element.style.setProperty('opacity', original.value, original.priority);
    else element.style.removeProperty('opacity');
    pending.delete(element);
  }
  const home = document.querySelector('#homePage');
  const hero = home?.querySelector('.pq-hero');
  const scene = hero?.querySelector('.pq-hero-scene');
  const header = document.querySelector('.topbar');
  const compact = window.matchMedia('(max-width: 700px)');
  let frame = 0;
  let progress;
  if (hero && scene && header) {
    progress = document.createElement('span');
    progress.className = 'pq-scroll-progress';
    progress.setAttribute('aria-hidden', 'true');
    header.append(progress);
    scene.classList.add('pq-scroll-scene');
  }
  function updateScroll() {
    frame = 0;
    if (!progress) return;
    const active = !preference.matches && home.classList.contains('is-active') && home.getClientRects().length > 0;
    progress.hidden = !active;
    if (!active) {
      scene.style.removeProperty('transform');
      return;
    }
    const rect = hero.getBoundingClientRect();
    const distance = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const ratio = Math.max(0, Math.min(1, window.scrollY / distance));
    progress.style.transform = `scaleX(${ratio})`;
    if (home.querySelector('.pq-launch')) {
      const phase = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height)));
      scene.style.transform = `scale(${1 + phase * 0.04})`;
    } else {
      // Overscan keeps the original full-bleed image covered during parallax.
      const offset = Math.max(0, Math.min(rect.height, -rect.top)) * (compact.matches ? 0.025 : 0.055);
      scene.style.transform = `translateY(${offset}px) scale(1.12)`;
    }
  }
  function scheduleScroll() {
    if (!frame) frame = requestAnimationFrame(updateScroll);
  }
  if (progress) {
    window.addEventListener('scroll', scheduleScroll, { passive: true });
    window.addEventListener('resize', scheduleScroll, { passive: true });
    new MutationObserver(scheduleScroll).observe(home, { attributes: true, attributeFilter: ['class', 'hidden'] });
    if ('ResizeObserver' in window) new ResizeObserver(scheduleScroll).observe(home);
    scheduleScroll();
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.08 || !pending.has(entry.target) || active.has(entry.target)) continue;
      observer.unobserve(entry.target);
      if (preference.matches || !entry.target.animate) { restore(entry.target); continue; }
      let animation;
      try {
        animation = entry.target.animate([
        { opacity: 0, transform: 'translateY(56px)' },
        { opacity: 1, transform: 'translateY(0)' },
        ], { duration: compact.matches ? 1800 : 2000, easing: 'cubic-bezier(.25,.1,.25,1)', fill: 'both' });
      } catch { restore(entry.target); continue; }
      running.add(animation);
      active.set(entry.target, animation);
      animation.finished.catch(() => {}).finally(() => {
        restore(entry.target);
        running.delete(animation);
        active.delete(entry.target);
        animation.cancel();
      });
    }
  }, { threshold: 0.08, rootMargin: '-88px 0px -80px 0px' });
  // Only supported reveals are hidden; disabled motion leaves content untouched.
  const observed = new WeakSet();
  function observeContent() {
    document.querySelectorAll('#homePage .pq-section-head, #homePage .pq-entry, #homePage .pq-process-grid > article, #homePage .pq-partner, #homePage .pick-case-content > article, #homePage .pick-review-grid > article, #homePage .pq-faq-list > details, .pq-catalog-head, .pq-brand-selectors').forEach(element => {
      if (observed.has(element)) return;
      observed.add(element);
      if (!element.animate) return;
      pending.set(element, { value: element.style.getPropertyValue('opacity'), priority: element.style.getPropertyPriority('opacity') });
      element.style.setProperty('opacity', '0');
      observer.observe(element);
    });
  }
  observeContent();
  const contentObserver = home && new MutationObserver(observeContent);
  contentObserver?.observe(home, { childList: true, subtree: true });
  document.addEventListener('focusin', event => {
    for (const element of pending.keys()) {
      if (!element.contains(event.target)) continue;
      observer.unobserve(element);
      active.get(element)?.cancel();
      restore(element);
    }
  });
  preference.addEventListener('change', () => {
    scheduleScroll();
    if (!preference.matches) return;
    observer.disconnect();
    contentObserver?.disconnect();
    running.forEach(animation => animation.cancel());
    running.clear();
    active.clear();
    for (const element of pending.keys()) restore(element);
  });
})();
