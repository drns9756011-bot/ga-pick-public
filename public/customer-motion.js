(() => {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (preference.matches || !('IntersectionObserver' in window)) return;
  const running = new Set();
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
    // Overscan keeps the image edges covered throughout the small parallax range.
    const offset = Math.max(0, Math.min(rect.height, -rect.top)) * (compact.matches ? 0.025 : 0.055);
    scene.style.transform = `translateY(${offset}px) scale(1.12)`;
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
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      if (preference.matches || !entry.target.animate) continue;
      const animation = entry.target.animate([
        { opacity: 0.65, transform: 'translateY(14px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: 420, easing: 'cubic-bezier(.2,.7,.2,1)' });
      running.add(animation);
      animation.finished.catch(() => {}).finally(() => running.delete(animation));
    }
  }, { threshold: 0.12 });
  // Content is visible by default, including when JavaScript or motion is disabled.
  document.querySelectorAll('#homePage .pq-section-head, #homePage .pq-entry-grid, #homePage .pq-process-grid, #homePage .pq-partner, #homePage .pick-case-content, #homePage .pick-review-grid, #homePage .pq-faq-list, .pq-catalog-head, .pq-brand-selectors, .commerce-tools').forEach(element => observer.observe(element));
  preference.addEventListener('change', () => {
    scheduleScroll();
    if (!preference.matches) return;
    observer.disconnect();
    running.forEach(animation => animation.cancel());
    running.clear();
  });
})();
