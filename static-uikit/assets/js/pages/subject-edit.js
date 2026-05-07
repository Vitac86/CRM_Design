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

  /* ── Residency toggle: hide/show FIAS fill buttons when nonresident ── */
  (function () {
    var residencyEl = document.getElementById('ind-residency');
    if (!residencyEl) return;

    function applyResidency(value) {
      var isResident = value === 'resident';
      var moduleEl = document.querySelector('[data-address-module]');
      if (!moduleEl) return;

      if (isResident) {
        // Restore fill buttons respecting same-as checkbox state
        moduleEl.querySelectorAll('.crm-btn-fill-address[data-address-target]').forEach(function (btn) {
          var target = btn.getAttribute('data-address-target');
          var sameCheck = moduleEl.querySelector('[data-address-same-as][data-address-target="' + target + '"]');
          if (!sameCheck || !sameCheck.checked) {
            btn.hidden = false;
          }
        });
      } else {
        // Hide all fill buttons and close any open panels
        moduleEl.querySelectorAll('.crm-btn-fill-address').forEach(function (btn) {
          btn.hidden = true;
        });
        moduleEl.querySelectorAll('[data-fias-panel]').forEach(function (panel) {
          panel.hidden = true;
        });
      }
    }

    residencyEl.addEventListener('change', function () {
      applyResidency(residencyEl.value);
    });

    applyResidency(residencyEl.value);
  }());
}());
