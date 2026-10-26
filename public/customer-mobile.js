(() => {
  const touch = window.matchMedia('(max-width: 760px) and (pointer: coarse)');
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
    const obscured = Math.max(baseline, window.innerHeight) - viewport.height;
    const open = touch.matches && focused && viewport.scale === 1 && obscured > 150;
    document.body.classList.toggle('mobile-keyboard-open', open);
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  viewport.addEventListener('resize', schedule, { passive: true });
  viewport.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  document.addEventListener('focusin', schedule);
  document.addEventListener('focusout', schedule);
  touch.addEventListener('change', schedule);
  schedule();
})();
