(function () {
  'use strict';

  /* Shared block-selection page for the subject edit flow (individual + legal).
   *
   * Renders the client summary and the grid of selectable data blocks based on
   * the subject type, then forwards the chosen blocks to the matching edit page
   * via the ?blocks= query string.
   *
   * Subject type is taken from ?type=individual|company, falling back to the
   * subject id prefix (i- / c-), then defaulting to individual.
   *
   * Static prototype only — no backend, no persistence. */

  if (document.body.getAttribute('data-page') !== 'subject-edit-select') return;

  var root = document.querySelector('.crm-edit-select-page');
  if (!root) return;

  /* ── Per-type configuration ───────────────────────────────────────── */

  var CONFIG = {
    individual: {
      defaultSubject: 'i-014',
      breadcrumbName: 'Иван Петров',
      backLink: 'subject-card-individual.html',
      targetEdit: 'subject-edit-individual.html',
      avatar: 'ИП',
      name: 'Петров Иван Сергеевич',
      code: 'INV-014',
      typeBadge: 'Физическое лицо',
      status: 'Активен',
      blocks: [
        {
          id: 'contact', title: 'Контактные данные',
          desc: 'Телефон, email, адрес регистрации и адрес проживания.'
        },
        {
          id: 'personal', title: 'Персональная информация',
          desc: 'ФИО, дата рождения, пол, гражданство и налоговое резидентство.'
        },
        {
          id: 'passport', title: 'Паспортные данные',
          desc: 'Серия, номер, дата выдачи, код подразделения и кем выдан.'
        },
        {
          id: 'compliance', title: 'Идентификация и комплаенс',
          desc: 'Статус идентификации, риск-профиль, KYC и сведения для проверки.'
        },
        {
          id: 'bank', title: 'Банковские реквизиты',
          desc: 'Банковские счета, БИК, банк получателя и реквизиты для выплат.'
        }
      ]
    },
    company: {
      defaultSubject: 'c-011',
      breadcrumbName: 'АО «Восток Майнинг Системс»',
      backLink: 'subject-card.html',
      targetEdit: 'subject-edit.html',
      avatar: 'ВМ',
      name: 'АО «Восток Майнинг Системс»',
      code: 'INV-1011',
      typeBadge: 'Юридическое лицо',
      status: 'Активен',
      blocks: [
        {
          id: 'company', title: 'Сведения о компании',
          desc: 'Наименование, организационно-правовая форма, ИНН, КПП и ОГРН.'
        },
        {
          id: 'registration', title: 'Регистрационные данные',
          desc: 'Дата регистрации, регистрирующий орган, юридический адрес и сведения ЕГРЮЛ.'
        },
        {
          id: 'contact', title: 'Контактные данные',
          desc: 'Телефон, email, фактический адрес и адрес для корреспонденции.'
        },
        {
          id: 'management', title: 'Руководитель и подписанты',
          desc: 'Руководитель, должность, основание полномочий и лица с правом подписи.'
        },
        {
          id: 'compliance', title: 'Комплаенс и идентификация',
          desc: 'Статус идентификации, риск-профиль, KYC и сведения для проверки.'
        },
        {
          id: 'bank', title: 'Банковские реквизиты',
          desc: 'Расчётные счета, БИК, банк получателя и реквизиты для выплат.'
        }
      ]
    }
  };

  /* ── Helpers ──────────────────────────────────────────────────────── */

  function getParam(name) {
    try {
      return new URLSearchParams(window.location.search).get(name);
    } catch (e) {
      return null;
    }
  }

  function resolveType(subjectId) {
    var typeParam = (getParam('type') || '').toLowerCase();
    if (typeParam === 'company' || typeParam === 'legal') return 'company';
    if (typeParam === 'individual') return 'individual';
    if (subjectId && subjectId.indexOf('c-') === 0) return 'company';
    if (subjectId && subjectId.indexOf('i-') === 0) return 'individual';
    return 'individual';
  }

  var subjectId = getParam('subject');
  var type = resolveType(subjectId);
  var cfg = CONFIG[type];
  if (!subjectId) subjectId = cfg.defaultSubject;

  /* Canonical block order for this subject type. */
  var BLOCK_ORDER = cfg.blocks.map(function (b) { return b.id; });

  /* ── DOM refs ─────────────────────────────────────────────────────── */

  var gridEl = root.querySelector('[data-role="block-grid"]');
  var countEl = root.querySelector('[data-role="selected-count"]');
  var validationEl = root.querySelector('[data-role="select-validation"]');
  var submitBtn = root.querySelector('[data-action="go-to-edit"]');

  /* ── Render: client summary + back/edit targets ───────────────────── */

  function setText(role, value) {
    var el = root.querySelector('[data-role="' + role + '"]');
    if (el) el.textContent = value;
  }

  function renderSummary() {
    root.setAttribute('data-subject-kind', type);
    root.setAttribute('data-subject', subjectId);
    setText('client-avatar', cfg.avatar);
    setText('client-name', cfg.name);
    setText('client-code', cfg.code);
    setText('client-type', cfg.typeBadge);
    setText('client-status', cfg.status);
    setText('breadcrumb-link', cfg.breadcrumbName);

    var breadcrumbLink = root.querySelector('[data-role="breadcrumb-link"]');
    if (breadcrumbLink) breadcrumbLink.setAttribute('href', cfg.backLink);

    var backLink = root.querySelector('[data-role="back-link"]');
    if (backLink) backLink.setAttribute('href', cfg.backLink);

    if (submitBtn) submitBtn.setAttribute('data-target', cfg.targetEdit);
  }

  /* ── Render: block cards ──────────────────────────────────────────── */

  function buildCard(block) {
    var label = document.createElement('label');
    label.className = 'crm-edit-block-card';
    label.setAttribute('data-edit-block-card', '');
    label.setAttribute('data-block-id', block.id);

    var check = document.createElement('span');
    check.className = 'crm-edit-block-check';

    var input = document.createElement('input');
    input.className = 'crm-edit-block-input';
    input.type = 'checkbox';
    input.name = 'block-' + block.id;
    input.value = block.id;
    input.setAttribute('data-block-input', '');

    var box = document.createElement('span');
    box.className = 'crm-edit-block-checkbox';
    box.setAttribute('aria-hidden', 'true');

    check.appendChild(input);
    check.appendChild(box);

    var body = document.createElement('span');
    body.className = 'crm-edit-block-body';

    var head = document.createElement('span');
    head.className = 'crm-edit-block-head';

    var title = document.createElement('span');
    title.className = 'crm-edit-block-title';
    title.textContent = block.title;

    head.appendChild(title);

    var desc = document.createElement('span');
    desc.className = 'crm-edit-block-desc';
    desc.textContent = block.desc;

    body.appendChild(head);
    body.appendChild(desc);

    label.appendChild(check);
    label.appendChild(body);
    return label;
  }

  function renderGrid() {
    if (!gridEl) return;
    gridEl.textContent = '';
    cfg.blocks.forEach(function (block) {
      gridEl.appendChild(buildCard(block));
    });
  }

  /* ── Selection state ──────────────────────────────────────────────── */

  function cards() {
    return Array.prototype.slice.call(gridEl.querySelectorAll('[data-edit-block-card]'));
  }

  function cardInput(card) {
    return card.querySelector('[data-block-input]');
  }

  /** Selected block ids in canonical order. */
  function selectedBlocks() {
    var chosen = cards()
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

  function refresh() {
    var count = selectedBlocks().length;

    cards().forEach(function (card) {
      var input = cardInput(card);
      card.classList.toggle('is-selected', !!(input && input.checked));
    });

    if (countEl) countEl.textContent = 'Выбрано разделов: ' + count;

    if (submitBtn) {
      var disabled = count === 0;
      submitBtn.classList.toggle('is-disabled', disabled);
      submitBtn.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    }

    if (validationEl && count > 0) validationEl.hidden = true;
  }

  function applyInitialSelection() {
    var raw = getParam('blocks');
    if (!raw) return;
    var wanted = raw.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    if (!wanted.length) return;
    cards().forEach(function (card) {
      var id = card.getAttribute('data-block-id');
      var input = cardInput(card);
      if (input) input.checked = wanted.indexOf(id) !== -1;
    });
  }

  /* ── Events ───────────────────────────────────────────────────────── */

  root.addEventListener('change', function (e) {
    if (e.target && e.target.hasAttribute && e.target.hasAttribute('data-block-input')) {
      refresh();
    }
  });

  root.addEventListener('click', function (e) {
    var actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    var action = actionEl.getAttribute('data-action');

    if (action === 'select-all-blocks') {
      e.preventDefault();
      cards().forEach(function (card) {
        var input = cardInput(card);
        if (input) input.checked = true;
      });
      refresh();
    }

    if (action === 'clear-blocks') {
      e.preventDefault();
      cards().forEach(function (card) {
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
      var target = actionEl.getAttribute('data-target') || cfg.targetEdit;
      var url = target +
        '?subject=' + encodeURIComponent(subjectId) +
        '&blocks=' + selected.join(',');
      window.location.href = url;
    }
  });

  /* ── Init ─────────────────────────────────────────────────────────── */

  renderSummary();
  renderGrid();
  applyInitialSelection();
  refresh();
}());
