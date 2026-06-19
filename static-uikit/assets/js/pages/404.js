// 404 — "Страница не найдена" (static demo).
// Scoped to body[data-page="404"].
//
// Wires the secondary "Назад" action: go back when browser history exists,
// otherwise fall back to the dashboard. The primary "На дашборд" action is a
// plain link and needs no script. No backend.

(function () {
  'use strict';

  if (!document.body || document.body.dataset.page !== '404') return;

  var FALLBACK_URL = 'dashboard.html';

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || typeof target.closest !== 'function') return;

    var backTrigger = target.closest('[data-role="error-back"]');
    if (!backTrigger) return;

    event.preventDefault();

    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.assign(FALLBACK_URL);
    }
  });
})();
