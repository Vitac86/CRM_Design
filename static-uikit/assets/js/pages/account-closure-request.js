// Account / contract closure request — standalone request page (static demo).
// Scoped to body[data-page="account-closure-request"].
//
// Responsibilities:
//   - read `role` from the URL (manager | depository | middle-office);
//   - configure the "Ваше решение" decision panel for that role;
//   - drive a CRM-style confirmation modal (no native confirm());
//   - apply accept / return actions statically to THIS page only.
//
// No backend, no cross-page state sync — acceptances are reflected in this card only.

(function () {
  'use strict';

  if (!document.body || document.body.dataset.page !== 'account-closure-request') return;

  // ── Role configuration ─────────────────────────────────────────────────────
  var ROLES = {
    manager: {
      kind: 'manager',
      subtitle: 'Финальное закрытие',
      decisionStatus: 'Ожидает акцепта',
      decisionStatusClass: 'warning',
      topbar: { name: 'Иванов И.И.', role: 'менеджер', initials: 'ИИ' }
    },
    depository: {
      kind: 'review',
      subtitle: 'Требуется акцепт Депозитария',
      decisionStatus: 'Ожидает',
      decisionStatusClass: 'warning',
      approval: 'depository',
      step: 'depository',
      nextStep: 'middle-office',
      acceptUser: 'Петров П.П.',
      label: 'Депозитарий',
      acceptBody: 'Вы уверены, что хотите акцептовать закрытие по роли Депозитарий?',
      topbar: { name: 'Петров П.П.', role: 'депозитарий', initials: 'ПП' }
    },
    'middle-office': {
      kind: 'review',
      subtitle: 'Требуется акцепт Мидл-офиса',
      decisionStatus: 'Ожидает',
      decisionStatusClass: 'warning',
      approval: 'middle-office',
      step: 'middle-office',
      nextStep: 'final',
      acceptUser: 'Сидорова А.А.',
      label: 'Мидл-офис',
      acceptBody: 'Вы уверены, что хотите акцептовать закрытие по роли Мидл-офис?',
      topbar: { name: 'Сидорова А.А.', role: 'мидл-офис', initials: 'СА' }
    }
  };

  var FINAL_BODY = 'Вы уверены, что хотите выполнить финальное закрытие выбранных договоров и счетов?';

  // ── Helpers ────────────────────────────────────────────────────────────────
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }

  function setBadge(el, text, variant) {
    if (!el) return;
    el.className = 'crm-badge ' + variant;
    // Preserve decoration classes that some badges carry.
    if (el.hasAttribute('data-role') && el.getAttribute('data-role') === 'approval-status') {
      el.classList.add('crm-account-closure-approval-status');
    }
    el.textContent = text;
  }

  function nowStamp() {
    var d = new Date();
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear() +
           ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function addHistory(text) {
    var list = $('[data-role="history"]');
    if (!list) return;
    var li = document.createElement('li');
    var t = document.createElement('time');
    t.textContent = nowStamp();
    li.appendChild(t);
    li.appendChild(document.createTextNode(text));
    list.appendChild(li);
  }

  function getStep(name) { return $('[data-step="' + name + '"]'); }

  function markStepDone(name, stateText) {
    var step = getStep(name);
    if (!step) return;
    step.classList.remove('is-current', 'is-locked');
    step.classList.add('is-done');
    var idx = $('.crm-account-closure-step-index', step);
    if (idx) idx.textContent = '✓';
    var state = $('[data-role="step-state"]', step);
    if (state) state.textContent = stateText || 'Выполнено';
  }

  function markStepCurrent(name) {
    var step = getStep(name);
    if (!step || step.classList.contains('is-locked')) return;
    step.classList.add('is-current');
  }

  // ── Confirmation modal ───────────────────────────────────────────────────────
  var modal = $('[data-role="closure-confirm-modal"]');
  var modalBody = $('[data-role="closure-modal-body"]');
  var pendingConfirm = null;

  function openModal(bodyText, onConfirm) {
    pendingConfirm = onConfirm || null;
    if (modalBody) modalBody.textContent = bodyText;
    if (modal) modal.hidden = false;
    document.body.classList.add('crm-modal-open');
  }

  function closeModal() {
    pendingConfirm = null;
    if (modal) modal.hidden = true;
    document.body.classList.remove('crm-modal-open');
  }

  // ── Apply decisions (this page only) ─────────────────────────────────────────
  function applyAccept(role) {
    var stamp = nowStamp();

    // Approval row
    var approvalRow = $('[data-approval="' + role.approval + '"]');
    if (approvalRow) {
      setBadge($('[data-role="approval-status"]', approvalRow), 'Акцептовано', 'success');
      var meta = $('[data-role="approval-meta"]', approvalRow);
      if (meta) meta.textContent = role.acceptUser + ' · ' + stamp;
    }

    // Workflow strip
    markStepDone(role.step, 'Акцептовано');
    if (role.nextStep) markStepCurrent(role.nextStep);

    // Decision panel state
    setBadge($('[data-role="decision-status"]'), 'Акцептовано', 'success');
    lockReviewControls('Решение принято: закрытие акцептовано.');

    addHistory(role.label + ': закрытие акцептовано (' + role.acceptUser + ')');
  }

  function applyReturn(role, reason) {
    var stamp = nowStamp();

    // Request-level status
    setBadge($('[data-role="request-status"]'), 'Возвращена на уточнение', 'danger');

    // Approval row
    var approvalRow = $('[data-approval="' + role.approval + '"]');
    if (approvalRow) {
      setBadge($('[data-role="approval-status"]', approvalRow), 'Возвращено', 'danger');
      var meta = $('[data-role="approval-meta"]', approvalRow);
      if (meta) meta.textContent = role.acceptUser + ' · ' + stamp;
    }

    // Workflow strip — step is no longer the active/completed stage
    var step = getStep(role.step);
    if (step) {
      step.classList.remove('is-current', 'is-done');
      var state = $('[data-role="step-state"]', step);
      if (state) state.textContent = 'Возвращено';
    }

    // Decision panel state + visible return reason
    setBadge($('[data-role="decision-status"]'), 'Возвращено', 'danger');
    lockReviewControls('Заявка возвращена на уточнение.');
    showReturnReason(reason);

    addHistory(role.label + ': возврат на уточнение — ' + reason + ' (' + role.acceptUser + ')');
  }

  function lockReviewControls(message) {
    var review = $('[data-role="decision-review"]');
    if (!review) return;
    review.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
    var textarea = $('#closure-decision-comment', review);
    if (textarea) textarea.readOnly = true;
    var done = document.createElement('p');
    done.className = 'crm-account-closure-helper';
    done.textContent = message;
    review.appendChild(done);
  }

  function showReturnReason(reason) {
    var review = $('[data-role="decision-review"]');
    if (!review) return;
    var box = document.createElement('p');
    box.className = 'crm-account-closure-note';
    box.textContent = 'Причина возврата: ' + reason;
    review.appendChild(box);
  }

  // ── Decision panel setup per role ─────────────────────────────────────────────
  function configurePanel(role) {
    var subtitle = $('[data-role="decision-subtitle"]');
    if (subtitle) subtitle.textContent = role.subtitle;

    setBadge($('[data-role="decision-status"]'), role.decisionStatus, role.decisionStatusClass);

    var review = $('[data-role="decision-review"]');
    var manager = $('[data-role="decision-manager"]');

    if (role.kind === 'review') {
      if (review) review.hidden = false;
      if (manager) manager.hidden = true;
    } else {
      if (review) review.hidden = true;
      if (manager) manager.hidden = false;
    }

    // Topbar identity reflects the acting role.
    if (role.topbar) {
      var n = $('[data-role="topbar-user-name"]');
      var r = $('[data-role="topbar-user-role"]');
      var i = $('[data-role="topbar-user-initials"]');
      if (n) n.textContent = role.topbar.name;
      if (r) r.textContent = role.topbar.role;
      if (i) i.textContent = role.topbar.initials;
    }
  }

  // ── Event wiring ───────────────────────────────────────────────────────────
  function wireActions(role) {
    document.addEventListener('click', function (e) {
      var action = e.target.closest('[data-action]');

      // Modal controls are global (work regardless of role).
      if (action) {
        var name = action.getAttribute('data-action');

        if (name === 'closure-modal-cancel') { closeModal(); return; }
        if (name === 'closure-modal-confirm') {
          var fn = pendingConfirm;
          closeModal();
          if (typeof fn === 'function') fn();
          return;
        }

        if (role.kind === 'review') {
          if (name === 'closure-accept') {
            openModal(role.acceptBody, function () { applyAccept(role); });
            return;
          }
          if (name === 'closure-return') {
            handleReturn(role);
            return;
          }
        }

        if (role.kind === 'manager' && name === 'closure-final') {
          // Disabled by default in this first pass; wired for future enablement.
          if (action.disabled) return;
          openModal(FINAL_BODY, function () { addHistory('Клиентский менеджер: выполнено финальное закрытие'); });
          return;
        }
      }
    });

    // Close modal on Escape.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal && !modal.hidden) closeModal();
    });
  }

  function handleReturn(role) {
    var textarea = $('#closure-decision-comment');
    var error = $('[data-role="decision-error"]');
    var reason = textarea ? textarea.value.trim() : '';

    if (!reason) {
      if (error) error.hidden = false;
      if (textarea) {
        textarea.classList.add('crm-input-error');
        textarea.focus();
      }
      return;
    }

    if (error) error.hidden = true;
    if (textarea) textarea.classList.remove('crm-input-error');
    applyReturn(role, reason);
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  function init() {
    var params = new URLSearchParams(window.location.search);
    var roleKey = params.get('role') || 'manager';
    var role = ROLES[roleKey] || ROLES.manager;

    configurePanel(role);
    wireActions(role);
  }

  init();

}());
