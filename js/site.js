/* Mobile menu toggle. The page is fully usable without this file: with no JS the nav is always visible. */
(function () {
  var root = document.documentElement;
  var btn = document.querySelector('[data-menu-btn]');
  var nav = document.getElementById('site-nav');
  if (!btn || !nav) return;
  function set(open) {
    root.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { set(false); btn.focus(); } });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
})();
