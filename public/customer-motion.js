(() => {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (preference.matches || !('IntersectionObserver' in window)) return;
  const running = new Set();
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
    if (!preference.matches) return;
    observer.disconnect();
    running.forEach(animation => animation.cancel());
    running.clear();
  });
})();
