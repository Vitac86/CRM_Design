// Account / contract closure request — standalone request page (static demo).
// Scoped to body[data-page="account-closure-request"].
//
// Reads role + request id from the URL, renders the whole card from the shared
// localStorage demo state (window.CrmClosureDemo), and applies accept / return /
// final-close actions back into that state so every other entry point stays in
// sync. No backend.
//
//   ?role=manager | depository | middle-office   (default: manager)
//   ?request=CL-2026-00017                        (default: CL-2026-00017)

(function () {
  'use strict';

  if (!document.body || document.body.dataset.page !== 'account-closure-request') return;

  var Demo = window.CrmClosureDemo;
  if (!Demo) return; // shared state module must load first

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function esc(s) { return Demo.escapeHtml(s); }

  var params    = new URLSearchParams(window.location.search);
  var roleParam = params.get('role') || 'manager';
  var role      = Demo.roleByParam(roleParam);
  var requestId = params.get('request') || 'CL-2026-00017';

  function currentReq() { return Demo.get(requestId); }

  // ── Topbar identity reflects the acting role ────────────────────────────────
  function applyTopbar() {
    var n = $('[data-role="topbar-user-name"]');
    var r = $('[data-role="topbar-user-role"]');
    var i = $('[data-role="topbar-user-initials"]');
    if (n) n.textContent = role.user;
    if (r) r.textContent = role.topbarRole;
    if (i) i.textContent = role.initials;
  }

  function setBadge(el, meta) {
    if (!el) return;
    el.className = 'crm-badge ' + meta.badge;
    el.textContent = meta.label;
  }

  // ── Hero ────────────────────────────────────────────────────────────────────
  function renderHero(req) {
    var sm = Demo.statusMeta(req);
    setText('[data-role="bc-id"]', 'Заявка на закрытие ' + req.id);
    setText('[data-role="hero-id"]', req.id);
    setBadge($('[data-role="request-status"]'), sm);
    var sourceEl = $('[data-role="hero-source"]');
    if (sourceEl) sourceEl.textContent = req.source;
    setText('[data-role="hero-created"]', req.createdAt);
    setText('[data-role="hero-client"]', req.client);
    setText('[data-role="hero-code"]', req.clientCode);
    setText('[data-role="hero-manager"]', req.manager);
    document.title = 'Заявка на закрытие ' + req.id;
  }

  function setText(sel, text) {
    var el = $(sel);
    if (el) el.textContent = text;
  }

  // ── Workflow strip ──────────────────────────────────────────────────────────
  function stepHtml(opts) {
    var idx = opts.state === 'is-done' ? '✓'
            : opts.state === 'is-returned' ? '!'
            : String(opts.index);
    return '' +
      '<div class="crm-account-closure-step ' + opts.state + '" data-step="' + opts.key + '">' +
        '<span class="crm-account-closure-step-index" aria-hidden="true">' + idx + '</span>' +
        '<span class="crm-account-closure-step-body">' +
          '<strong>' + esc(opts.label) + '</strong>' +
          '<span>' + esc(opts.stateText) + '</span>' +
        '</span>' +
      '</div>';
  }

  function renderWorkflow(req) {
    var host = $('[data-role="workflow"]');
    if (!host) return;

    var steps = [];
    steps.push(stepHtml({ key: 'created', label: 'Создана', state: 'is-done', stateText: 'Выполнено' }));

    var counter = 2;
    // Each role step reflects ITS OWN decision. A return by one role must not
    // stop the other still-pending role from being shown as the current step.
    var pendingMarked = false;
    var labels = { depository: 'Депозитарий', middleOffice: 'Мидл-офис' };

    Demo.requiredKeys(req).forEach(function (key) {
      var st = Demo.approvalStatus(req, key);
      var state = '', text = '';
      if (req.status === 'closed' || st === 'accepted') { state = 'is-done'; text = 'Акцептовано'; }
      else if (st === 'returned') { state = 'is-returned'; text = 'Возвращено'; }
      else if (!pendingMarked) { state = 'is-current'; text = 'Ожидает'; pendingMarked = true; }
      else { state = ''; text = 'Ожидает'; }
      steps.push(stepHtml({ key: key, label: labels[key] || key, state: state, stateText: text, index: counter++ }));
    });

    var finalState, finalText;
    if (req.status === 'closed') { finalState = 'is-done'; finalText = 'Выполнено'; }
    else if (Demo.isReady(req)) { finalState = 'is-current'; finalText = 'Готово к закрытию'; }
    else { finalState = 'is-locked'; finalText = 'Заблокировано'; }
    steps.push(stepHtml({ key: 'final', label: 'Финальное закрытие', state: finalState, stateText: finalText, index: counter }));

    host.innerHTML = steps.join('');
  }

  // ── Contracts ───────────────────────────────────────────────────────────────
  function renderContracts(req) {
    var host = $('[data-role="contracts"]');
    if (!host) return;
    var closed = req.status === 'closed';

    host.innerHTML = (req.contracts || []).map(function (c) {
      return '' +
        '<div class="crm-account-closure-item">' +
          '<div class="crm-account-closure-item-main">' +
            '<strong>' + esc(c.number) + '</strong>' +
            '<span>' + esc(c.type) + ' · счёт ' + esc(c.account) + '</span>' +
          '</div>' +
          '<div class="crm-account-closure-item-aside">' +
            (closed
              ? '<span class="crm-badge muted">Закрыт</span>' +
                '<span class="crm-account-closure-target is-done">Закрыто</span>'
              : '<span class="crm-badge success">Действующий</span>' +
                '<span class="crm-account-closure-target">Закрыть</span>') +
          '</div>' +
        '</div>';
    }).join('');
  }

  // ── Document basis ──────────────────────────────────────────────────────────
  function renderBasis(req) {
    setText('[data-role="basis-type"]', req.basisType || '—');
    setText('[data-role="basis-source"]', req.source || '—');
    setText('[data-role="basis-comment"]', req.managerComment || '—');

    var fileWrap = $('[data-role="basis-file"]');
    var fileName = $('[data-role="basis-file-name"]');
    if (req.attachmentName) {
      if (fileWrap) fileWrap.hidden = false;
      if (fileName) fileName.textContent = req.attachmentName;
    } else if (fileWrap) {
      fileWrap.hidden = true;
      var holder = fileWrap.parentNode;
      if (holder && !holder.querySelector('.crm-account-closure-file-empty')) {
        var em = document.createElement('span');
        em.className = 'crm-account-closure-file-empty';
        em.textContent = 'Без вложения';
        holder.appendChild(em);
      }
    }
  }

  // ── Approvals ───────────────────────────────────────────────────────────────
  function approvalRowHtml(label, ap) {
    var status = (ap && ap.status) || 'pending';
    var meta = Demo.approvalMeta(status);
    var who = (ap && ap.user) ? ap.user : '—';
    var when = (ap && ap.datetime) ? ap.datetime : '—';
    return '' +
      '<div class="crm-account-closure-approval">' +
        '<div class="crm-account-closure-approval-main">' +
          '<strong>' + esc(label) + '</strong>' +
          '<span class="crm-account-closure-approval-meta">' +
            '<span class="crm-account-closure-approval-user">' + esc(who) + '</span>' +
            '<span class="crm-account-closure-approval-dot" aria-hidden="true">·</span>' +
            '<span class="crm-account-closure-approval-time">' + esc(when) + '</span>' +
          '</span>' +
        '</div>' +
        '<span class="crm-badge ' + meta.badge + ' crm-account-closure-approval-status">' + esc(meta.label) + '</span>' +
      '</div>';
  }

  function renderApprovals(req) {
    var host = $('[data-role="approvals"]');
    if (!host) return;
    var rows = [];
    Demo.requiredKeys(req).forEach(function (key) {
      rows.push(approvalRowHtml(Demo.APPROVAL_LABEL[key], req.approvals[key]));
    });
    rows.push(approvalRowHtml(Demo.APPROVAL_LABEL.manager, req.approvals.manager));
    host.innerHTML = rows.join('');
  }

  // ── History ─────────────────────────────────────────────────────────────────
  function renderHistory(req) {
    var host = $('[data-role="history"]');
    if (!host) return;
    host.innerHTML = (req.history || []).map(function (ev) {
      return '<li><time>' + esc(ev.at) + '</time>' + esc(ev.text) + '</li>';
    }).join('');
  }

  // ── Decision panel ──────────────────────────────────────────────────────────
  function show(el, visible) { if (el) el.hidden = !visible; }

  // Text for the "return" callout, written from the acting role's perspective.
  function returnCalloutText(req, isManager) {
    var returnedRoles = Demo.rolesInState(req, 'returned');
    var fromRoles = returnedRoles.join(', ') || (req.returnedBy || '—');
    var myStatus = Demo.approvalStatus(req, role.approval);

    // A still-pending reviewing role: make clear they can — and must — still act.
    if (!isManager && myStatus === 'pending') {
      return 'Есть возврат от: ' + fromRoles +
        '. Решение «' + role.label + '» ещё требуется.';
    }
    // Manager / already-decided role: surface who returned and why.
    return fromRoles + ': ' + (req.returnReason || '—');
  }

  function renderDecision(req) {
    var isManager = role.approval === 'manager';
    var myStatus  = Demo.approvalStatus(req, role.approval);
    var ready     = Demo.isReady(req);
    var closed    = req.status === 'closed';
    var anyReturn = Demo.hasReturn(req);

    setBadge($('[data-role="decision-status"]'), Demo.statusMeta(req));
    setText('[data-role="decision-role-label"]', role.label);
    setText('[data-role="decision-title"]', isManager ? 'Финальное закрытие' : 'Ваше решение');

    // Return callout — shown whenever a return stands and the request is open.
    // Crucially it does NOT gate the still-pending role's actions below.
    var returnedBlock = $('[data-role="decision-returned"]');
    var stillPending  = !isManager && myStatus === 'pending';
    if (anyReturn && !closed) {
      show(returnedBlock, true);
      setText('[data-role="decision-returned-title"]',
        stillPending ? 'Есть возврат на уточнение' : 'Возвращена на уточнение');
      setText('[data-role="decision-returned-text"]', returnCalloutText(req, isManager));
    } else {
      show(returnedBlock, false);
    }

    var reviewBlock  = $('[data-role="decision-review"]');
    var managerBlock = $('[data-role="decision-manager"]');
    var doneBlock    = $('[data-role="decision-done"]');
    show(reviewBlock, false);
    show(managerBlock, false);
    show(doneBlock, false);

    var subtitle = '';

    if (isManager) {
      if (closed) {
        subtitle = 'Заявка закрыта';
        show(doneBlock, true);
        var mgr = req.approvals.manager || {};
        setText('[data-role="decision-done-text"]',
          'Заявка закрыта' + (mgr.user ? ' (' + mgr.user + (mgr.datetime ? ', ' + mgr.datetime : '') + ')' : '') + '.');
      } else {
        show(managerBlock, true);
        var finalBtn = $('[data-action="closure-final"]');
        if (finalBtn) finalBtn.disabled = !ready;

        if (anyReturn) {
          subtitle = 'Есть возврат на уточнение';
          setText('[data-role="manager-hint"]',
            'Финальное закрытие недоступно: есть возврат на уточнение.');
        } else if (ready) {
          subtitle = 'Все согласования получены';
          setText('[data-role="manager-hint"]',
            'Все согласования получены — можно выполнить финальное закрытие.');
        } else {
          subtitle = 'Ожидаются согласования подразделений';
          var pending = Demo.rolesInState(req, 'pending');
          setText('[data-role="manager-hint"]',
            'Финальное закрытие доступно после акцепта: ' + (pending.join(', ') || '—') + '.');
        }
      }
    } else {
      if (closed) {
        subtitle = 'Заявка закрыта';
        show(doneBlock, true);
        setText('[data-role="decision-done-text"]', 'Заявка закрыта. Действия по согласованию недоступны.');
      } else if (myStatus === 'accepted') {
        subtitle = 'Вы уже акцептовали';
        show(doneBlock, true);
        var ap = req.approvals[role.approval] || {};
        setText('[data-role="decision-done-text"]',
          'Вы акцептовали закрытие' + (ap.datetime ? ' (' + ap.datetime + ')' : '') + '.');
      } else if (myStatus === 'returned') {
        subtitle = 'Вы вернули на уточнение';
        show(doneBlock, true);
        var mine = req.approvals[role.approval] || {};
        setText('[data-role="decision-done-text"]',
          'Вы вернули заявку на уточнение' + (mine.datetime ? ' (' + mine.datetime + ')' : '') +
          '. Решение примет инициатор после доработки.');
      } else {
        // PENDING — actions stay available even if the other role returned.
        subtitle = anyReturn ? 'Требуется ваше решение' : 'Требуется ваш акцепт';
        show(reviewBlock, true);
      }
    }

    setText('[data-role="decision-subtitle"]', subtitle);
  }

  // ── Full render ─────────────────────────────────────────────────────────────
  function render() {
    var req = currentReq();
    if (!req) { renderMissing(); return; }
    renderHero(req);
    renderWorkflow(req);
    renderContracts(req);
    renderBasis(req);
    renderApprovals(req);
    renderHistory(req);
    renderDecision(req);
  }

  function renderMissing() {
    var page = $('.crm-account-closure-page');
    if (!page) return;
    page.innerHTML =
      '<div class="crm-breadcrumbs"><a href="requests.html">Заявки</a></div>' +
      '<section class="crm-card crm-account-closure-hero">' +
        '<h1>Заявка не найдена</h1>' +
        '<p class="crm-account-closure-help">Запрошенная заявка «' + esc(requestId) +
          '» отсутствует в демо-состоянии. Откройте заявку из журнала или ' +
          '<a href="#" data-action="closure-reset">сбросьте демо-сценарий</a>.</p>' +
      '</section>';
  }

  // ── Confirmation modal ──────────────────────────────────────────────────────
  var modal     = $('[data-role="closure-confirm-modal"]');
  var modalBody = $('[data-role="closure-modal-body"]');
  var modalTitle = $('[data-role="closure-modal-title"]');
  var pendingConfirm = null;

  function openModal(title, bodyText, onConfirm) {
    pendingConfirm = onConfirm || null;
    if (modalTitle) modalTitle.textContent = title;
    if (modalBody) modalBody.textContent = bodyText;
    if (modal) modal.hidden = false;
    document.body.classList.add('crm-modal-open');
  }

  function closeModal() {
    pendingConfirm = null;
    if (modal) modal.hidden = true;
    document.body.classList.remove('crm-modal-open');
  }

  // ── Actions ─────────────────────────────────────────────────────────────────
  function handleAccept() {
    var textarea = $('#closure-decision-comment');
    var comment = textarea ? textarea.value.trim() : '';
    openModal('Подтвердить акцепт',
      'Вы уверены, что хотите акцептовать закрытие по роли «' + role.label + '»?',
      function () {
        Demo.accept(requestId, role.approval, role.user, comment);
        render();
      });
  }

  function handleReturn() {
    var textarea = $('#closure-decision-comment');
    var error = $('[data-role="decision-error"]');
    var reason = textarea ? textarea.value.trim() : '';

    if (!reason) {
      if (error) error.hidden = false;
      if (textarea) { textarea.classList.add('crm-input-error'); textarea.focus(); }
      return;
    }
    if (error) error.hidden = true;
    if (textarea) textarea.classList.remove('crm-input-error');

    openModal('Подтвердить возврат',
      'Вернуть заявку на уточнение? Финальное закрытие будет заблокировано.',
      function () {
        Demo.returnForClarification(requestId, role.approval, role.user, reason);
        render();
      });
  }

  function handleFinal() {
    var req = currentReq();
    if (!req || !Demo.isReady(req) || req.status === 'closed') return;
    openModal('Финальное закрытие',
      'Вы уверены, что хотите выполнить финальное закрытие выбранных договоров и счетов? Действие необратимо в рамках демо.',
      function () {
        Demo.finalClose(requestId, role.user);
        render();
      });
  }

  function handleReset() {
    Demo.reset();
    window.location.reload();
  }

  function wire() {
    document.addEventListener('click', function (e) {
      var action = e.target.closest('[data-action]');
      if (!action) return;
      var name = action.getAttribute('data-action');

      switch (name) {
        case 'closure-modal-cancel': closeModal(); break;
        case 'closure-modal-confirm': {
          var fn = pendingConfirm;
          closeModal();
          if (typeof fn === 'function') fn();
          break;
        }
        case 'closure-accept': if (role.approval !== 'manager') handleAccept(); break;
        case 'closure-return': if (role.approval !== 'manager') handleReturn(); break;
        case 'closure-final':
          if (role.approval === 'manager' && !action.disabled) handleFinal();
          break;
        case 'closure-reset':
          e.preventDefault();
          handleReset();
          break;
        default: break;
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal && !modal.hidden) closeModal();
    });
  }

  // ── Init ────────────────────────────────────────────────────────────────────
  applyTopbar();
  render();
  wire();

}());
