/* Reveals pay buttons for items the server says are for sale, then starts Stripe Checkout.
   Prices are never read from the page. If /api/catalog is unreachable or empty, nothing shows
   and the email path on the page keeps working. */
(function () {
  var blocks = document.querySelectorAll('[data-pay]');
  if (!blocks.length || !window.fetch) return;

  function money(c) { return '$' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: c % 100 ? 2 : 0 }); }

  fetch('/api/catalog', { headers: { Accept: 'application/json' } })
    .then(function (r) { return r.ok ? r.json() : { items: [] }; })
    .then(function (data) {
      var live = {};
      (data.items || []).forEach(function (i) { live[i.id] = i; });
      blocks.forEach(function (el) {
        var item = live[el.getAttribute('data-pay')];
        if (!item) return;
        var btn = el.querySelector('.pay__btn'), msg = el.querySelector('.pay__msg');
        var agree = el.querySelector('.pay__agree input'), qty = el.querySelector('.pay__qty');
        var label = el.getAttribute('data-label') || 'Pay';
        btn.textContent = label + ' ' + money(item.amount);
        el.hidden = false;
        btn.addEventListener('click', function () {
          msg.textContent = '';
          if (agree && !agree.checked) { msg.textContent = 'Please tick the box to continue.'; return; }
          btn.disabled = true;
          fetch('/api/checkout', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item: item.id, qty: qty ? parseInt(qty.value, 10) : 1, agree: agree ? agree.checked : undefined })
          }).then(function (r) { return r.json(); }).then(function (d) {
            if (d && d.url) { window.location.assign(d.url); return; }
            throw new Error('no url');
          }).catch(function () {
            btn.disabled = false;
            msg.textContent = 'Could not start checkout. Please email us instead.';
          });
        });
      });
    })
    .catch(function () { /* stay hidden */ });
})();
