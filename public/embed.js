/**
 * Oshibori Concept — Devis Portal embed
 * ---------------------------------------
 * Drop this in your Shopify theme:
 *
 *   <script src="https://devis-portal-vpmx.vercel.app/embed.js" defer></script>
 *
 * Then any element with [data-oshibori-devis] (button, link, etc.) opens the
 * wizard in a centered modal iframe. Example:
 *
 *   <button data-oshibori-devis>Demande de devis</button>
 *
 * The modal is closed via the embedded ✕ button (postMessage from the iframe)
 * or by pressing Escape / clicking outside the modal.
 */
(function () {
  'use strict';

  var ORIGIN = 'https://devis-portal-vpmx.vercel.app';
  var STYLE_ID = 'oshibori-devis-style';
  var WRAP_ID = 'oshibori-devis-wrap';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent =
      '#' + WRAP_ID + '{position:fixed;inset:0;z-index:2147483647;display:none;align-items:center;justify-content:center;background:rgba(20,20,20,.55);padding:0;animation:ocd-in .18s ease-out}' +
      '#' + WRAP_ID + '.is-open{display:flex}' +
      '#' + WRAP_ID + ' .ocd-modal{position:relative;width:100%;height:100%;max-width:1100px;max-height:calc(100vh - 48px);background:#fff;border-radius:0;overflow:hidden;box-shadow:0 24px 60px -12px rgba(0,0,0,.35);animation:ocd-pop .22s cubic-bezier(.16,1,.3,1)}' +
      '@media (min-width: 640px){#' + WRAP_ID + '{padding:24px}#' + WRAP_ID + ' .ocd-modal{border-radius:10px}}' +
      '#' + WRAP_ID + ' iframe{width:100%;height:100%;border:0;display:block}' +
      '#' + WRAP_ID + ' .ocd-close{position:absolute;top:10px;right:10px;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.92);border:1px solid rgba(0,0,0,.08);font-size:18px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#252525;box-shadow:0 1px 3px rgba(0,0,0,.08)}' +
      '#' + WRAP_ID + ' .ocd-close:hover{background:#fff}' +
      '@keyframes ocd-in{from{opacity:0}to{opacity:1}}' +
      '@keyframes ocd-pop{from{transform:translateY(8px);opacity:0}to{transform:none;opacity:1}}' +
      'html.ocd-locked,html.ocd-locked body{overflow:hidden!important}';
    document.head.appendChild(s);
  }

  function buildWrap() {
    var existing = document.getElementById(WRAP_ID);
    if (existing) return existing;
    var wrap = document.createElement('div');
    wrap.id = WRAP_ID;
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-label', 'Demande de devis Oshibori');
    wrap.innerHTML =
      '<div class="ocd-modal">' +
      '<button type="button" class="ocd-close" aria-label="Fermer">✕</button>' +
      '<iframe title="Devis Oshibori" allow="clipboard-write"></iframe>' +
      '</div>';
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap) close();
    });
    wrap
      .querySelector('.ocd-close')
      .addEventListener('click', close);
    document.body.appendChild(wrap);
    return wrap;
  }

  function open() {
    injectStyles();
    var wrap = buildWrap();
    var iframe = wrap.querySelector('iframe');
    // Re-load each time so the wizard starts fresh — avoids stale state.
    iframe.src = ORIGIN + '/?embed=1';
    wrap.classList.add('is-open');
    document.documentElement.classList.add('ocd-locked');
    document.addEventListener('keydown', onEscape, true);
  }

  function close() {
    var wrap = document.getElementById(WRAP_ID);
    if (!wrap) return;
    wrap.classList.remove('is-open');
    document.documentElement.classList.remove('ocd-locked');
    document.removeEventListener('keydown', onEscape, true);
    var iframe = wrap.querySelector('iframe');
    if (iframe) iframe.src = 'about:blank';
  }

  function onEscape(e) {
    if (e.key === 'Escape') close();
  }

  // Listen for messages from the iframe (e.g. submit success → close after a beat)
  window.addEventListener('message', function (e) {
    if (e.origin !== ORIGIN) return;
    var data = e.data || {};
    if (data.type === 'oshibori-devis:close') close();
  });

  function attach() {
    document.querySelectorAll('[data-oshibori-devis]').forEach(function (el) {
      if (el.dataset.ocdBound) return;
      el.dataset.ocdBound = '1';
      el.addEventListener('click', function (e) {
        e.preventDefault();
        open();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }

  // Re-attach if Shopify swaps the DOM (theme editor, AJAX cart, etc.)
  var mo = new MutationObserver(attach);
  mo.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
  });

  // Expose a programmatic API in case the host theme wants direct control.
  window.OshiboriDevis = { open: open, close: close };
})();
