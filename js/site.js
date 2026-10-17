/* Menu toggle + warp transition. Progressive enhancement: without this file every link is a normal link and the
   nav is always visible. The warp is skipped entirely for prefers-reduced-motion. */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* menu */
  var btn = document.querySelector('[data-menu-btn]');
  var nav = document.getElementById('site-nav');
  if (btn && nav) {
    var set = function (open) {
      root.classList.toggle('menu-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { set(false); btn.focus(); } });
  }

  /* arrival half of the transition (the class was set in <head> before first paint) */
  try { sessionStorage.removeItem('bits-warp'); } catch (e) {}
  if (root.classList.contains('is-arriving')) setTimeout(function () { root.classList.remove('is-arriving'); }, 260);

  /* leaving half: checker iris closes over the page, then navigate. Any key / tap / click skips it. */
  var leaving = false;
  function go(href) { window.location.href = href; }
  document.addEventListener('click', function (e) {
    if (reduce.matches || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    var u = new URL(a.href, window.location.href);
    if (u.origin !== window.location.origin || u.pathname === window.location.pathname) return;
    e.preventDefault();
    if (leaving) { go(u.href); return; }
    leaving = true;
    try { sessionStorage.setItem('bits-warp', '1'); } catch (x) {}
    root.classList.add('is-warping');
    var t = setTimeout(function () { go(u.href); }, 260);
    var skip = function () { clearTimeout(t); go(u.href); };
    ['keydown', 'pointerdown', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, skip, { once: true, capture: true }); });
  });
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) { root.classList.remove('is-warping', 'is-arriving'); leaving = false; }
  });
})();
