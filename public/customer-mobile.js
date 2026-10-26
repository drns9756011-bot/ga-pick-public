(() => {
  const compact = window.matchMedia('(max-width: 1100px)');
  const contact = document.querySelector('.kakao-floating-btn');
  const headerNav = document.querySelector('.topbar > .nav');
  if (contact && headerNav) {
    const home = document.createComment('customer contact position');
    contact.before(home);
    function placeContact() {
      if (compact.matches) headerNav.before(contact);
      else home.after(contact);
    }
    compact.addEventListener('change', placeContact);
    placeContact();
  }
  const viewport = window.visualViewport;
  if (!viewport) return;
  let baseline = window.innerHeight;
  let width = window.innerWidth;
  let frame = 0;
  function editable(element) {
    return !!element && (element.tagName === 'TEXTAREA' || (element.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit', 'file', 'hidden'].includes(element.type)));
  }
  function update() {
    frame = 0;
    const focused = editable(document.activeElement);
    if (window.innerWidth !== width) {
      width = window.innerWidth;
      baseline = window.innerHeight;
    }
    if (!focused) baseline = window.innerHeight;
    const scale = Math.max(0.1, Number(viewport.scale) || 1);
    const obscured = Math.max(baseline, window.innerHeight) - viewport.height * scale;
    const open = focused && obscured > 150;
    document.body.classList.toggle('mobile-keyboard-open', open);
    document.documentElement.style.setProperty('--customer-viewport-height', `${viewport.height}px`);
    document.documentElement.style.setProperty('--customer-viewport-top', `${viewport.offsetTop || 0}px`);
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  viewport.addEventListener('resize', schedule, { passive: true });
  viewport.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  document.addEventListener('focusin', schedule);
  document.addEventListener('focusout', schedule);
  compact.addEventListener('change', schedule);
  schedule();
})();
