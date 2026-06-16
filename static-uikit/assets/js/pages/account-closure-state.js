// Account / contract closure — shared demo state store + cross-page rendering.
//
// This is a STATIC DEMO ONLY. There is no backend: workflow state lives in
// localStorage under `crmAccountClosureDemoState` so that actions taken on one
// page (accept / return / final close / wizard create) are reflected on every
// other entry point that shares the same request id.
//
// Loaded BEFORE the page-specific scripts (account-closure-request.js,
// document-wizard.js) so they can consume `window.CrmClosureDemo`.
//
// Responsibilities:
//   1. Seed + load + save the demo state (with safe fallbacks).
//   2. Expose domain actions: accept / returnForClarification / finalClose /
//      upsertFromWizard.
//   3. Auto-render closure surfaces that have no dedicated page script:
//        - depository / middle-office task queues  ([data-role="closure-queue"])
//        - subject-card banner                     ([data-role="closure-banner"])
//        - subject-card contract badges            (.crm-contract-close-action)
//        - requests journal rows                   (tr[data-entity="request"])
//
// Keep this file simple and readable — no framework, no build step.

(function () {
  'use strict';

  var STORAGE_KEY = 'crmAccountClosureDemoState';
  var STATE_VERSION = 2;

  // ── Role configuration ──────────────────────────────────────────────────────
  // Keyed by the URL `role` parameter; `approval` is the internal approvals key.
  var ROLES = {
    manager: {
      param: 'manager', approval: 'manager',
      label: 'Клиентский менеджер', user: 'Иванов И.И.', initials: 'ИИ', topbarRole: 'менеджер'
    },
    depository: {
      param: 'depository', approval: 'depository',
      label: 'Депозитарий', user: 'Петров П.П.', initials: 'ПП', topbarRole: 'депозитарий'
    },
    'middle-office': {
      param: 'middle-office', approval: 'middleOffice',
      label: 'Мидл-офис', user: 'Сидорова А.А.', initials: 'СА', topbarRole: 'мидл-офис'
    }
  };

  var APPROVAL_LABEL = {
    depository: 'Депозитарий',
    middleOffice: 'Мидл-офис',
    manager: 'Клиентский менеджер'
  };

  // Request-level status → display label + badge variant.
  var STATUS = {
    pending:  { label: 'Ожидает акцепта',         badge: 'warning' },
    returned: { label: 'Возвращена на уточнение',  badge: 'danger'  },
    ready:    { label: 'Готова к закрытию',        badge: 'info'    },
    closed:   { label: 'Закрыта',                  badge: 'success' }
  };

  // Per-approval status → display label + badge variant.
  var APPROVAL = {
    pending:  { label: 'Ожидает',     badge: 'warning' },
    accepted: { label: 'Акцептовано', badge: 'success' },
    returned: { label: 'Возвращено',  badge: 'danger'  },
    locked:   { label: 'Недоступно',  badge: 'muted'   },
    closed:   { label: 'Закрыто',     badge: 'success' }
  };

  // ── Default seed state ──────────────────────────────────────────────────────

  function defaultState() {
    return {
      version: STATE_VERSION,
      requests: {
        'CL-2026-00017': {
          id: 'CL-2026-00017',
          type: 'Заявка на закрытие договора/счёта',
          client: 'АО «Восток Майнинг Системс»',
          clientCode: 'INV-1011',
          subjectId: 'c-011',
          manager: 'Иванов И.И.',
          status: 'pending',
          source: 'Личный кабинет',
          basisType: 'Заявление клиента',
          createdAt: '15.06.2026 10:42',
          managerComment: 'По инициативе клиента',
          attachmentName: 'Заявление_на_закрытие.pdf',
          requires: ['depository', 'middleOffice'],
          contracts: [
            { number: 'BR-2026/00444', type: 'Брокерский договор', account: '30601-000-4401' },
            { number: 'DP-2026/00445', type: 'Депозитарный договор', account: '30-016-00041-DP' }
          ],
          approvals: {
            depository:   { status: 'pending' },
            middleOffice: { status: 'pending' },
            manager:      { status: 'locked', user: 'Иванов И.И.' }
          },
          returnReason: '',
          returnedBy: '',
          history: [
            { at: '15.06.2026 10:42', text: 'Заявка получена из Личного кабинета' },
            { at: '15.06.2026 10:43', text: 'Создана карточка заявки CL-2026-00017' }
          ]
        },
        'CL-2026-00018': {
          id: 'CL-2026-00018',
          type: 'Заявка на закрытие договора/счёта',
          client: 'ООО «Северный Альянс»',
          clientCode: 'INV-1018',
          subjectId: '',
          manager: 'Иванов И.И.',
          status: 'pending',
          source: 'Email',
          basisType: 'Заявление клиента',
          createdAt: '15.06.2026 11:20',
          managerComment: 'Закрытие брокерского договора по заявлению клиента',
          attachmentName: 'Заявление_Северный_Альянс.pdf',
          requires: ['middleOffice'],
          contracts: [
            { number: 'BR-2026/00451', type: 'Брокерский договор', account: '30601-000-4451' }
          ],
          approvals: {
            middleOffice: { status: 'pending' },
            manager:      { status: 'locked', user: 'Иванов И.И.' }
          },
          returnReason: '',
          returnedBy: '',
          history: [
            { at: '15.06.2026 11:20', text: 'Заявка получена из Email' },
            { at: '15.06.2026 11:21', text: 'Создана карточка заявки CL-2026-00018' }
          ]
        },
        'CL-2026-00019': {
          id: 'CL-2026-00019',
          type: 'Заявка на закрытие договора/счёта',
          client: 'АО «Полярные Активы»',
          clientCode: 'INV-1019',
          subjectId: '',
          manager: 'Иванов И.И.',
          status: 'pending',
          source: 'Офис / бумажное заявление',
          basisType: 'Заявление клиента',
          createdAt: '15.06.2026 12:05',
          managerComment: 'Закрытие депозитарного счёта',
          attachmentName: 'Заявление_Полярные_Активы.pdf',
          requires: ['depository'],
          contracts: [
            { number: 'DP-2026/00452', type: 'Депозитарный договор', account: '30-016-00052-DP' }
          ],
          approvals: {
            depository: { status: 'pending' },
            manager:    { status: 'locked', user: 'Иванов И.И.' }
          },
          returnReason: '',
          returnedBy: '',
          history: [
            { at: '15.06.2026 12:05', text: 'Заявка получена из офиса (бумажное заявление)' },
            { at: '15.06.2026 12:06', text: 'Создана карточка заявки CL-2026-00019' }
          ]
        }
      }
    };
  }

  // ── Persistence ─────────────────────────────────────────────────────────────

  function load() {
    var raw;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return defaultState(); // localStorage unavailable (file://, privacy mode)
    }
    if (!raw) {
      var seeded = defaultState();
      save(seeded);
      return seeded;
    }
    try {
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== STATE_VERSION || !parsed.requests) {
        var fresh = defaultState();
        save(fresh);
        return fresh;
      }
      return parsed;
    } catch (e) {
      var fallback = defaultState();
      save(fallback);
      return fallback;
    }
  }

  function save(state) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // Non-fatal in demo; ignore quota / availability errors.
    }
  }

  function reset() {
    var fresh = defaultState();
    save(fresh);
    return fresh;
  }

  function get(id) {
    return load().requests[id] || null;
  }

  function getAll() {
    var requests = load().requests;
    return Object.keys(requests).sort().map(function (id) { return requests[id]; });
  }

  // Apply `mutator(request)` to a single request and persist the whole state.
  function update(id, mutator) {
    var state = load();
    var req = state.requests[id];
    if (!req) return null;
    mutator(req);
    save(state);
    return req;
  }

  // ── Domain helpers ──────────────────────────────────────────────────────────

  function requiredKeys(req) {
    return Array.isArray(req.requires) && req.requires.length
      ? req.requires.slice()
      : ['depository', 'middleOffice'];
  }

  function approvalStatus(req, key) {
    return req.approvals && req.approvals[key] ? req.approvals[key].status : 'pending';
  }

  // Ready = every required approval is accepted (and nothing was returned).
  function isReady(req) {
    var keys = requiredKeys(req);
    for (var i = 0; i < keys.length; i++) {
      if (approvalStatus(req, keys[i]) !== 'accepted') return false;
    }
    return true;
  }

  function hasReturn(req) {
    var keys = requiredKeys(req);
    for (var i = 0; i < keys.length; i++) {
      if (approvalStatus(req, keys[i]) === 'returned') return true;
    }
    return false;
  }

  // Recompute the request-level status from approvals (never un-closes).
  function recomputeStatus(req) {
    if (req.status === 'closed') return;
    if (hasReturn(req)) { req.status = 'returned'; return; }
    req.status = isReady(req) ? 'ready' : 'pending';
  }

  function statusMeta(req) {
    return STATUS[req.status] || STATUS.pending;
  }

  function approvalMeta(status) {
    return APPROVAL[status] || APPROVAL.pending;
  }

  // Short human label describing where the request is in the workflow.
  function currentStageLabel(req) {
    if (req.status === 'closed') return 'Закрыта';
    if (req.status === 'returned') {
      return 'Возвращена на уточнение' + (req.returnedBy ? ' · ' + req.returnedBy : '');
    }
    if (isReady(req)) return 'Готова к финальному закрытию';
    var pending = requiredKeys(req)
      .filter(function (k) { return approvalStatus(req, k) !== 'accepted'; })
      .map(function (k) { return APPROVAL_LABEL[k]; });
    return pending.length ? 'Ожидает: ' + pending.join(', ') : 'В работе';
  }

  function pushHistory(req, text) {
    if (!Array.isArray(req.history)) req.history = [];
    req.history.push({ at: nowStamp(), text: text });
  }

  // ── Domain actions ──────────────────────────────────────────────────────────

  function accept(id, approvalKey, user, comment) {
    return update(id, function (req) {
      var ap = req.approvals[approvalKey] || (req.approvals[approvalKey] = {});
      ap.status = 'accepted';
      ap.user = user;
      ap.datetime = nowStamp();
      ap.comment = comment || '';
      pushHistory(req, (APPROVAL_LABEL[approvalKey] || 'Подразделение') +
        ': закрытие акцептовано (' + user + ')');
      recomputeStatus(req);
    });
  }

  function returnForClarification(id, approvalKey, user, reason) {
    return update(id, function (req) {
      var ap = req.approvals[approvalKey] || (req.approvals[approvalKey] = {});
      ap.status = 'returned';
      ap.user = user;
      ap.datetime = nowStamp();
      ap.comment = reason || '';
      req.returnReason = reason || '';
      req.returnedBy = APPROVAL_LABEL[approvalKey] || 'Подразделение';
      req.returnedByKey = approvalKey;
      req.status = 'returned';
      pushHistory(req, req.returnedBy + ': возврат на уточнение — ' + reason + ' (' + user + ')');
    });
  }

  function finalClose(id, user) {
    return update(id, function (req) {
      if (!isReady(req) || req.status === 'closed') return;
      req.status = 'closed';
      req.approvals.manager = { status: 'closed', user: user, datetime: nowStamp() };
      pushHistory(req, 'Клиентский менеджер: выполнено финальное закрытие (' + user + ')');
    });
  }

  // Derive which approvals are required from the selected contracts.
  // Brokerage contracts → middle-office; depository contracts → depository.
  function deriveRequires(contracts) {
    var requires = [];
    (contracts || []).forEach(function (c) {
      var hint = String(c.type || '') + ' ' + String(c.number || '');
      if (/депозит|^DP|\bDP-/i.test(hint) && requires.indexOf('depository') === -1) {
        requires.push('depository');
      }
      if (/брокер|^BR|\bBR-/i.test(hint) && requires.indexOf('middleOffice') === -1) {
        requires.push('middleOffice');
      }
    });
    if (!requires.length) requires.push('middleOffice');
    return requires;
  }

  // Create / replace the request produced by the document wizard.
  // Static demo: the wizard always feeds the canonical subject-c-011 request.
  function upsertFromWizard(data) {
    data = data || {};
    var id = data.requestId || 'CL-2026-00017';
    var seed = defaultState().requests[id];
    var contracts = (data.contracts && data.contracts.length) ? data.contracts
      : (seed ? seed.contracts : []);
    var requires = deriveRequires(contracts);

    var state = load();
    var approvals = { manager: { status: 'locked', user: data.manager || 'Иванов И.И.' } };
    requires.forEach(function (k) { approvals[k] = { status: 'pending' }; });

    var req = {
      id: id,
      type: 'Заявка на закрытие договора/счёта',
      client: data.client || (seed ? seed.client : '—'),
      clientCode: data.clientCode || (seed ? seed.clientCode : '—'),
      subjectId: data.subjectId || (seed ? seed.subjectId : ''),
      manager: data.manager || 'Иванов И.И.',
      status: 'pending',
      source: data.source || 'Личный кабинет',
      basisType: data.basisType || 'Заявление клиента',
      createdAt: nowStamp(),
      managerComment: data.managerComment || '',
      attachmentName: data.attachmentName || '',
      requires: requires,
      contracts: contracts,
      approvals: approvals,
      returnReason: '',
      returnedBy: '',
      history: [
        { at: nowStamp(), text: 'Заявка создана из мастера документов (источник: ' + (data.source || 'Личный кабинет') + ')' }
      ]
    };

    state.requests[id] = req;
    save(state);
    return id;
  }

  // ── Utilities ───────────────────────────────────────────────────────────────

  function nowStamp() {
    var d = new Date();
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear() +
           ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function buildHref(roleParam, id) {
    return 'account-closure-request.html?role=' + encodeURIComponent(roleParam) +
           '&request=' + encodeURIComponent(id);
  }

  // ── Cross-page rendering (queues / banner / journal) ────────────────────────

  function queueCardHtml(req, roleParam) {
    var sm = statusMeta(req);
    var stage = currentStageLabel(req);
    var chips = (req.contracts || []).map(function (c) {
      return '<span class="crm-closure-chip">' + escapeHtml(c.number) + '</span>';
    }).join('');
    var stateClass = '';
    if (req.status === 'returned') stateClass = ' is-returned';
    else if (req.status === 'closed') stateClass = ' is-closed';
    else if (isReady(req)) stateClass = ' is-ready';

    return '' +
      '<article class="crm-closure-task-card' + stateClass + '">' +
        '<div class="crm-closure-task-main">' +
          '<span class="crm-closure-task-id">' + escapeHtml(req.id) + '</span>' +
          '<strong class="crm-closure-task-client">' + escapeHtml(req.client) + '</strong>' +
          '<span class="crm-closure-task-code">' + escapeHtml(req.clientCode) + '</span>' +
        '</div>' +
        '<div class="crm-closure-task-meta">' +
          '<div class="crm-closure-task-chips">' + chips + '</div>' +
          '<span class="crm-closure-task-stage">' + escapeHtml(stage) + '</span>' +
        '</div>' +
        '<div class="crm-closure-task-aside">' +
          '<span class="crm-badge ' + sm.badge + '">' + escapeHtml(sm.label) + '</span>' +
          '<a class="uk-button crm-button-primary crm-button crm-closure-task-open" href="' +
            buildHref(roleParam, req.id) + '">Открыть</a>' +
        '</div>' +
      '</article>';
  }

  function renderQueue(listEl) {
    var roleParam = listEl.getAttribute('data-queue') || 'depository';
    var role = ROLES[roleParam] || ROLES.depository;
    var approvalKey = role.approval;

    var requests = getAll().filter(function (req) {
      return requiredKeys(req).indexOf(approvalKey) !== -1 && req.status !== 'closed';
    });

    if (requests.length) {
      listEl.innerHTML = requests.map(function (req) {
        return queueCardHtml(req, roleParam);
      }).join('');
    } else {
      listEl.innerHTML = '<p class="crm-closure-empty">Нет активных задач на акцепт закрытия.</p>';
    }

    // Update the count badge in the section head, if present.
    var section = listEl.closest('.crm-closure-tasks');
    var countEl = section ? section.querySelector('[data-role="closure-queue-count"]') : null;
    if (countEl) {
      countEl.textContent = String(requests.length);
      countEl.className = 'crm-badge ' + (requests.length ? 'warning' : 'muted');
    }
  }

  function renderBanner(bannerEl) {
    var id = bannerEl.getAttribute('data-request');
    var req = id ? get(id) : null;
    if (!req) { bannerEl.hidden = true; return; }
    bannerEl.hidden = false;

    var sm = statusMeta(req);
    var isClosed = req.status === 'closed';
    bannerEl.classList.toggle('is-closed', isClosed);
    bannerEl.classList.toggle('is-returned', req.status === 'returned');

    var labelEl = bannerEl.querySelector('[data-role="closure-banner-label"]');
    var titleEl = bannerEl.querySelector('[data-role="closure-banner-title"]');
    var badgeEl = bannerEl.querySelector('[data-role="closure-banner-badge"]');
    var linkEl  = bannerEl.querySelector('[data-role="closure-banner-link"]');

    if (labelEl) labelEl.textContent = isClosed ? 'Заявка на закрытие закрыта' : 'Активная заявка на закрытие';
    if (titleEl) titleEl.textContent = req.id;
    if (badgeEl) { badgeEl.className = 'crm-badge ' + sm.badge; badgeEl.textContent = sm.label; }
    if (linkEl)  linkEl.href = buildHref('manager', req.id);
  }

  function buildContractStatusMap() {
    var map = {};
    getAll().forEach(function (req) {
      (req.contracts || []).forEach(function (c) {
        if (req.status === 'closed') map[c.number] = 'closed';
        else if (!map[c.number]) map[c.number] = 'active';
      });
    });
    return map;
  }

  function renderContractBadges() {
    var links = document.querySelectorAll('.crm-contract-close-action');
    if (!links.length) return;
    var map = buildContractStatusMap();

    Array.prototype.forEach.call(links, function (link) {
      var href = link.getAttribute('href') || '';
      var m = href.match(/[?&]contract=([^&]+)/);
      if (!m) return;
      var number = decodeURIComponent(m[1].replace(/&amp;/g, '&'));
      var state = map[number];
      var cell = link.parentNode;
      if (!cell) return;

      var badge = cell.querySelector('[data-role="closure-contract-badge"]');
      if (!state) { if (badge) badge.remove(); return; }

      if (!badge) {
        badge = document.createElement('span');
        badge.setAttribute('data-role', 'closure-contract-badge');
        badge.className = 'crm-badge crm-contract-closure-flag';
        cell.insertBefore(badge, link);
      }
      if (state === 'closed') {
        badge.classList.remove('info');
        badge.classList.add('success');
        badge.textContent = 'Закрыта';
      } else {
        badge.classList.remove('success');
        badge.classList.add('info');
        badge.textContent = 'В заявке';
      }
    });
  }

  function renderJournalRows() {
    var rows = document.querySelectorAll('tr[data-entity="request"][data-closure-request]');
    if (!rows.length) return;

    Array.prototype.forEach.call(rows, function (row) {
      var id = row.getAttribute('data-id');
      var req = id ? get(id) : null;
      if (!req) return;
      var sm = statusMeta(req);

      var badge = row.querySelector('[data-role="closure-row-status"]');
      if (badge) { badge.className = 'crm-badge ' + sm.badge; badge.textContent = sm.label; }

      var href = buildHref('manager', req.id);
      row.setAttribute('data-href', href);
      var openLink = row.querySelector('[data-role="closure-row-open"]');
      if (openLink) openLink.setAttribute('href', href);
    });
  }

  function autoRender() {
    Array.prototype.forEach.call(
      document.querySelectorAll('[data-role="closure-queue"]'), renderQueue);
    Array.prototype.forEach.call(
      document.querySelectorAll('[data-role="closure-banner"]'), renderBanner);
    renderContractBadges();
    renderJournalRows();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  window.CrmClosureDemo = {
    STORAGE_KEY: STORAGE_KEY,
    ROLES: ROLES,
    STATUS: STATUS,
    APPROVAL: APPROVAL,
    APPROVAL_LABEL: APPROVAL_LABEL,
    defaultState: defaultState,
    load: load,
    save: save,
    reset: reset,
    get: get,
    getAll: getAll,
    update: update,
    accept: accept,
    returnForClarification: returnForClarification,
    finalClose: finalClose,
    upsertFromWizard: upsertFromWizard,
    requiredKeys: requiredKeys,
    approvalStatus: approvalStatus,
    isReady: isReady,
    recomputeStatus: recomputeStatus,
    statusMeta: statusMeta,
    approvalMeta: approvalMeta,
    currentStageLabel: currentStageLabel,
    nowStamp: nowStamp,
    escapeHtml: escapeHtml,
    buildHref: buildHref,
    roleByParam: function (param) { return ROLES[param] || ROLES.manager; },
    autoRender: autoRender
  };

  // ── Boot ────────────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoRender);
  } else {
    autoRender();
  }

}());
