(function () {
  'use strict';

  /* Block-selection page for the individual subject edit flow.
   * Static prototype only — no backend, no persistence. The page collects
   * the chosen logical blocks and forwards them to the edit page via the
   * ?blocks= query string. */

  if (document.body.getAttribute('data-page') !== 'subject-edit-select') return;

  var root = document.querySelector('.crm-edit-select-page');
  if (!root) return;

  /* Canonical block order — also the order cards appear in the markup. */
  var BLOCK_ORDER = ['contact', 'personal', 'passport', 'compliance', 'bank', 'documents'];

  var cards = Array.prototype.slice.call(root.querySelectorAll('[data-edit-block-card]'));
  var countEl = root.querySelector('[data-role="selected-count"]');
  var validationEl = root.querySelector('[data-role="select-validation"]');
  var submitBtn = root.querySelector('[data-action="go-to-edit"]');

  /* ── Helpers ──────────────────────────────────────────────────────── */

  function getParam(name) {
    try {
      return new URLSearchParams(window.location.search).get(name);
    } catch (e) {
      return null;
    }
  }

  function getSubjectId() {
    return getParam('subject') || root.getAttribute('data-subject') || 'i-014';
  }

  function cardInput(card) {
    return card.querySelector('[data-block-input]');
  }

  /** Selected block ids in canonical order. */
  function selectedBlocks() {
    var chosen = cards
      .filter(function (card) {
        var input = cardInput(card);
        return input && input.checked;
      })
      .map(function (card) {
        return card.getAttribute('data-block-id');
      });
    return BLOCK_ORDER.filter(function (id) {
      return chosen.indexOf(id) !== -1;
    });
  }

  /* ── State sync ───────────────────────────────────────────────────── */

  function refresh() {
    var selected = selectedBlocks();
    var count = selected.length;

    cards.forEach(function (card) {
      var input = cardInput(card);
      card.classList.toggle('is-selected', !!(input && input.checked));
    });

    if (countEl) countEl.textContent = 'Выбрано разделов: ' + count;

    if (submitBtn) {
      var disabled = count === 0;
      submitBtn.classList.toggle('is-disabled', disabled);
      submitBtn.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    }

    /* Hide the validation hint as soon as something is selected. */
    if (validationEl && count > 0) validationEl.hidden = true;
  }

  /* ── Preselect from ?blocks= ──────────────────────────────────────── */

  function applyInitialSelection() {
    var raw = getParam('blocks');
    if (!raw) return;
    var wanted = raw.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    if (!wanted.length) return;
    cards.forEach(function (card) {
      var id = card.getAttribute('data-block-id');
      var input = cardInput(card);
      if (input) input.checked = wanted.indexOf(id) !== -1;
    });
  }

  /* ── Events ───────────────────────────────────────────────────────── */

  /* Each card is a <label> wrapping its checkbox, so a click anywhere on the
   * card toggles the input natively; we only react to the resulting change. */
  cards.forEach(function (card) {
    var input = cardInput(card);
    if (input) input.addEventListener('change', refresh);
  });

  root.addEventListener('click', function (e) {
    var actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    var action = actionEl.getAttribute('data-action');

    if (action === 'select-all-blocks') {
      e.preventDefault();
      cards.forEach(function (card) {
        var input = cardInput(card);
        if (input) input.checked = true;
      });
      refresh();
    }

    if (action === 'clear-blocks') {
      e.preventDefault();
      cards.forEach(function (card) {
        var input = cardInput(card);
        if (input) input.checked = false;
      });
      refresh();
    }

    if (action === 'go-to-edit') {
      e.preventDefault();
      var selected = selectedBlocks();
      if (!selected.length) {
        if (validationEl) validationEl.hidden = false;
        return;
      }
      var target = actionEl.getAttribute('data-target') || 'subject-edit-individual.html';
      var url = target +
        '?subject=' + encodeURIComponent(getSubjectId()) +
        '&blocks=' + selected.join(',');
      window.location.href = url;
    }
  });

  applyInitialSelection();
  refresh();
}());
