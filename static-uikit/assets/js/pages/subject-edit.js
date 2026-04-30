(function () {
  'use strict';

  if (document.body.getAttribute('data-page') !== 'subject-edit') return;

  var toastEl = document.querySelector('[data-entity="edit-toast"]');
  var toastTimer = null;

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('is-visible');
    }, 2400);
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');

    if (action === 'save-edit') {
      e.preventDefault();
      showToast('Изменения сохранены');
      setTimeout(function () {
        window.location.href = 'subject-card.html';
      }, 1200);
    }

    if (action === 'save-draft-edit') {
      e.preventDefault();
      showToast('Черновик сохранён');
    }
  });
}());
