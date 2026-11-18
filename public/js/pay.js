// BITS pay buttons. Loads only on pages that can sell something, asks the server what is on offer, and adds
// buttons ONLY for items an admin has switched on. With nothing enabled the page is exactly the flat site.
// Prices and amounts always come from the server; this file never decides a price.
(function () {
  'use strict';
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; }
  function money(c) { return '$' + (c / 100).toFixed(c % 100 ? 2 : 0); }
  function post(body) {
    return fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok || !j.url) throw new Error(j.error || 'Something went wrong. Please try again.'); return j.url; }); });
  }
  var OFFERS = { 'discovery session': 'discovery', 'event ops support': 'event-ops', 'residency / cultural exchange build': 'residency' };

  fetch('/api/catalog', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (cat) {
    if (!cat || !cat.paymentsOpen) return;

    var deposits = {}; (cat.deposits || []).forEach(function (d) { deposits[d.key] = d; });
    document.querySelectorAll('#start-a-project .pkg').forEach(function (pkg) {
      var h = pkg.querySelector('.pkg__name'); var key = h && OFFERS[h.textContent.trim().toLowerCase()]; var d = key && deposits[key];
      if (!d) return;
      var box = el('div', 'pay'); var id = 'agree-' + key;
      var row = el('p', 'pay__agree'); var cb = el('input'); cb.type = 'checkbox'; cb.id = id;
      var lab = el('label'); lab.htmlFor = id; lab.appendChild(document.createTextNode('I agree to the deposit terms: non-refundable once work begins, fully applied to my package. '));
      var a = el('a', 'inline-link', 'Read the terms'); a.href = '/terms'; a.target = '_blank'; a.rel = 'noopener'; lab.appendChild(a);
      row.appendChild(cb); row.appendChild(lab);
      var btn = el('button', 'btn btn--project', 'Pay ' + money(d.amountCents) + ' deposit'); btn.type = 'button';
      var msg = el('p', 'pay__msg'); msg.setAttribute('role', 'alert');
      btn.addEventListener('click', function () {
        msg.textContent = '';
        if (!cb.checked) { msg.textContent = 'Please tick the box to agree to the deposit terms.'; return; }
        btn.disabled = true; btn.textContent = 'Opening secure checkout...';
        post({ kind: 'deposit', offer: key, agree: true }).then(function (u) { location.href = u; })
          .catch(function (e) { msg.textContent = e.message; btn.disabled = false; btn.textContent = 'Pay ' + money(d.amountCents) + ' deposit'; });
      });
      box.appendChild(row); box.appendChild(btn); box.appendChild(msg); pkg.appendChild(box);
    });

    if (/^\/programming-events/i.test(location.pathname)) {
      var main = document.getElementById('main'); var evs = cat.events || [];
      if (main && evs.length) {
        var sec = el('section', 'pay-events'); sec.appendChild(el('h2', 'section-head', 'Tickets'));
        var ul = el('ul', 'pay-events__list');
        evs.forEach(function (e) { var li = el('li'); var a = el('a', 'btn', e.title); a.href = '/events/' + e.slug; li.appendChild(a); ul.appendChild(li); });
        sec.appendChild(ul); main.insertBefore(sec, main.firstChild);
      }
    }
  }).catch(function () { /* the site works without payments */ });
})();
