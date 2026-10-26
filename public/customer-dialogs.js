(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root.document) {
    const start = () => api.install(root.document, root);
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
  }
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';

  const definitions = [
    ['#packageDetailModal', '.brand-detail-close'],
    ['#consultModal', '.brand-consult-close'],
    ['#commerceProductModal', '.commerce-product-modal-close'],
    ['#subscriptionConsultationModal', '.subscription-consultation-close'],
    ['.option-modal', '.option-close'],
    ['#privacyPolicyModal', '.privacy-policy-close'],
    ['#privacyConsentModal', '#cancelConsentBtn'],
    ['#bidSelectConfirmModal', '#cancelBidSelectBtn'],
    ['#quoteCloseConfirmModal', '[data-quote-close-cancel]'],
    ['#sellerRegisterCompleteModal', '#closeSellerRegisterCompleteModal'],
    ['#quoteImageModal', '#closeQuoteImageModal'],
    ['#sellerAccountModal', '#closeSellerAccountModal'],
    ['#managerReviewModal', '#closeManagerReviewModal'],
    ['#anonymousConsultationModal', '[data-anonymous-close]'],
    ['#pageGuideModal', 'button[data-guide-close]'],
  ];
  const modalSelector = definitions.map(([selector]) => selector).join(',');
  const focusSelector = 'a[href],area[href],button,input,select,textarea,[tabindex],[contenteditable="true"],audio[controls],video[controls],summary';
  const installed = new WeakMap();

  function visible(element, win, includeInert = true) {
    if (!element || !element.isConnected) return false;
    for (let node = element; node; node = node.parentElement) {
      if (node.hidden || (includeInert && node.hasAttribute('inert'))) return false;
      const style = win.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
    }
    return element.getClientRects().length > 0;
  }

  function usable(element, win) {
    return visible(element, win) && !element.matches(':disabled,[aria-disabled="true"],input[type="hidden"]');
  }

  function focusables(panel, win) {
    const elements = Array.from(panel.querySelectorAll(focusSelector)).filter(element => usable(element, win) && element.tabIndex >= 0);
    // Native radio groups contribute one tab stop, not every unchecked option.
    return elements.filter(element => {
      if (!element.matches('input[type="radio"]') || !element.name) return true;
      const group = elements.filter(other => other.matches('input[type="radio"]') && other.name === element.name && other.form === element.form);
      return element === (group.find(other => other.checked) || group[0]);
    }).sort((a, b) => (a.tabIndex > 0 ? a.tabIndex : Infinity) - (b.tabIndex > 0 ? b.tabIndex : Infinity));
  }

  function install(doc, win) {
    if (!doc.body || installed.has(doc)) return installed.get(doc);
    let stack = [];
    let lastFocused = doc.activeElement;
    let interaction = null;
    let syncing = false;
    let focusing = false;
    let stopped = false;
    const inert = new Map();
    const temporaryTabindex = new Set();

    function focus(element, preventScroll = true) {
      if (!usable(element, win)) return false;
      focusing = true;
      try { element.focus({ preventScroll }); }
      finally { focusing = false; }
      return doc.activeElement === element;
    }

    function safeFocus(record) {
      const close = record.panel.querySelector(record.close);
      if (focus(close)) return;
      const heading = Array.from(record.panel.querySelectorAll('h1,h2,h3,[role="heading"]')).find(element => visible(element, win));
      const target = heading || record.panel;
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
        temporaryTabindex.add(target);
      }
      focus(target);
    }

    function setBackground(top) {
      const desired = new Set();
      if (top) {
        // Isolate siblings at every level, including overlays nested in a page shell.
        for (let branch = top.overlay; branch && branch !== doc.body; branch = branch.parentElement) {
          if (!branch.parentElement) break;
          for (const sibling of branch.parentElement.children) if (sibling !== branch) desired.add(sibling);
        }
      }
      for (const [element, original] of inert) {
        if (desired.has(element)) continue;
        if (original === null) element.removeAttribute('inert');
        else element.setAttribute('inert', original);
        inert.delete(element);
      }
      for (const element of desired) {
        if (!inert.has(element)) inert.set(element, element.getAttribute('inert'));
        if (!element.hasAttribute('inert')) element.setAttribute('inert', '');
      }
    }

    function triggerFor(overlay, previous) {
      for (const candidate of [interaction, lastFocused, previous && previous.trigger]) {
        if (!candidate || candidate === doc.body || overlay.contains(candidate)) continue;
        if (visible(candidate, win, false)) return candidate;
      }
      return null;
    }

    function sync() {
      if (syncing || stopped) return;
      syncing = true;
      try {
        const previous = stack[stack.length - 1];
        // Only enumerate the explicit, small set of app overlays; never scan all elements.
        const open = Array.from(doc.querySelectorAll(modalSelector)).filter(element => visible(element, win, false));
        stack = stack.filter(record => open.includes(record.overlay));
        let added = false;
        for (const overlay of open) {
          if (stack.some(record => record.overlay === overlay)) continue;
          const definition = definitions.find(([selector]) => overlay.matches(selector));
          const panel = overlay.querySelector('[role="dialog"]');
          if (!panel) continue;
          stack.push({ overlay, panel, close: definition[1], trigger: triggerFor(overlay, previous), opened: Date.now(), interacted: false });
          added = true;
        }
        const top = stack[stack.length - 1];
        // A rerender may replace the panel itself without replacing its overlay.
        if (top) top.panel = top.overlay.querySelector('[role="dialog"]') || top.overlay;
        setBackground(top);
        for (const element of temporaryTabindex) {
          if (stack.some(record => record.overlay.contains(element))) continue;
          if (element.getAttribute('tabindex') === '-1') element.removeAttribute('tabindex');
          temporaryTabindex.delete(element);
        }
        if (added) {
          interaction = null;
          safeFocus(top);
        } else if (previous && previous !== top) {
          if (!(previous.trigger && (!top || top.panel.contains(previous.trigger)) && focus(previous.trigger)) && top) safeFocus(top);
        } else if (top && (!top.panel.contains(doc.activeElement) || !usable(doc.activeElement, win))) safeFocus(top);
      } finally { syncing = false; }
    }

    function remember(event) {
      const target = event.target && event.target.closest(focusSelector);
      interaction = target || doc.activeElement;
      const top = stack[stack.length - 1];
      if (top && top.panel.contains(event.target)) top.interacted = true;
    }

    function onFocus(event) {
      if (focusing) return;
      sync();
      const top = stack[stack.length - 1];
      if (top) {
        const editable = event.target.matches('input,textarea,select,[contenteditable="true"]');
        // Existing apps also schedule input autofocus after opening. Keep the initial
        // landing non-editable until a user interacts, without blocking later validation.
        if (!top.panel.contains(event.target) || (editable && !top.interacted && Date.now() - top.opened < 250)) safeFocus(top);
      }
      lastFocused = doc.activeElement;
    }

    function onKey(event) {
      sync();
      const top = stack[stack.length - 1];
      if (!top) { interaction = doc.activeElement; return; }
      if (event.key === 'Escape') {
        const close = top.panel.querySelector(top.close);
        if (!usable(close, win)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        close.click();
        sync();
      } else if (event.key === 'Tab') {
        top.interacted = true;
        const items = focusables(top.panel, win);
        const index = items.indexOf(doc.activeElement);
        if (!items.length) { event.preventDefault(); safeFocus(top); }
        else if (index < 0 || (event.shiftKey ? index === 0 : index === items.length - 1)) {
          event.preventDefault();
          focus(items[event.shiftKey ? items.length - 1 : 0], false);
        }
      } else interaction = doc.activeElement;
    }

    const observer = new win.MutationObserver(sync);
    observer.observe(doc.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'class'] });
    doc.addEventListener('pointerdown', remember, true);
    doc.addEventListener('click', remember, true);
    doc.addEventListener('focusin', onFocus, true);
    doc.addEventListener('keydown', onKey, true);
    const controller = {
      sync,
      disconnect() {
        stopped = true;
        observer.disconnect();
        doc.removeEventListener('pointerdown', remember, true);
        doc.removeEventListener('click', remember, true);
        doc.removeEventListener('focusin', onFocus, true);
        doc.removeEventListener('keydown', onKey, true);
        stack = [];
        setBackground(null);
        for (const element of temporaryTabindex) if (element.getAttribute('tabindex') === '-1') element.removeAttribute('tabindex');
        temporaryTabindex.clear();
        installed.delete(doc);
      },
    };
    installed.set(doc, controller);
    sync();
    return controller;
  }

  return { install, visible, focusables };
});
