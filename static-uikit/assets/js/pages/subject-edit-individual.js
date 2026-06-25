(function () {
  'use strict';

  /* Individual subject edit page — selected-block rendering.
   *
   * Reads ?blocks=contact,passport,... and shows only the matching form
   * sections (each section is tagged with data-edit-block). Without a blocks
   * query it falls back to showing every section plus an info alert.
   *
   * Static prototype only — no backend, no persistence. The shared
   * subject-edit.js still owns save/draft/cancel and the address module;
   * this script only governs which sections are visible and the summary
   * chips at the top of the page. */

  if (document.body.getAttribute('data-page') !== 'subject-edit') return;
  if (document.body.getAttribute('data-subject-kind') !== 'individual') return;

  var BLOCK_ORDER = ['contact', 'personal', 'passport', 'compliance', 'bank', 'documents'];

  var BLOCK_LABELS = {
    contact: 'Контактные данные',
    personal: 'Персональная информация',
    passport: 'Паспортные данные',
    compliance: 'Идентификация и комплаенс',
    bank: 'Банковские реквизиты',
    documents: 'Документы'
  };

  var sections = Array.prototype.slice.call(
    document.querySelectorAll('[data-edit-block]')
  );
  var chipsEl = document.querySelector('[data-role="selected-block-chips"]');
  var alertEl = document.querySelector('[data-role="all-blocks-alert"]');
  var changeLinks = Array.prototype.slice.call(
    document.querySelectorAll('[data-role="change-blocks-link"], [data-role="change-blocks-link-alert"]')
  );

  /* ── Query parsing ────────────────────────────────────────────────── */

  function getParam(name) {
    try {
      return new URLSearchParams(window.location.search).get(name);
    } catch (e) {
      return null;
    }
  }

  var subjectId = getParam('subject') || 'i-014';

  var requested = (getParam('blocks') || '')
    .split(',')
    .map(function (s) { return s.trim(); })
    .filter(Boolean);

  /* Keep only known blocks, in canonical order. */
  var selected = BLOCK_ORDER.filter(function (id) {
    return requested.indexOf(id) !== -1;
  });

  var showAll = selected.length === 0;

  /* ── Section visibility ───────────────────────────────────────────── */

  sections.forEach(function (section) {
    var block = section.getAttribute('data-edit-block');
    var visible = showAll || selected.indexOf(block) !== -1;
    section.hidden = !visible;
  });

  /* ── Summary chips ────────────────────────────────────────────────── */

  function makeChip(text) {
    var chip = document.createElement('span');
    chip.className = 'crm-edit-summary-chip';
    chip.textContent = text;
    return chip;
  }

  if (chipsEl) {
    chipsEl.textContent = '';
    if (showAll) {
      chipsEl.appendChild(makeChip('Все разделы'));
    } else {
      selected.forEach(function (id) {
        chipsEl.appendChild(makeChip(BLOCK_LABELS[id] || id));
      });
    }
  }

  /* ── Info alert (fallback only) ───────────────────────────────────── */

  if (alertEl) alertEl.hidden = !showAll;

  /* ── "Изменить набор разделов" — preserve current blocks ──────────── */

  var backUrl = 'subject-edit-select.html?subject=' + encodeURIComponent(subjectId);
  if (!showAll) backUrl += '&blocks=' + selected.join(',');

  changeLinks.forEach(function (link) {
    link.setAttribute('href', backUrl);
  });
}());
