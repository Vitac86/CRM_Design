(function () {
  var subjectCardPage = document.body && document.body.getAttribute('data-page') === 'subject-card'
    ? document.body
    : document.querySelector('.crm-page[data-page="subject-card"]');

  if (!subjectCardPage) {
    return;
  }

  /* ─── Representative modal ─────────────────────────────────────────────── */

  function setRepresentativeModalState(isOpen) {
    var modal = document.querySelector('[data-role="representative-modal"]');
    if (!modal) return;
    modal.hidden = !isOpen;
    document.body.classList.toggle('crm-modal-open', isOpen);
  }

  function syncRepresentativeExpiry() {
    var toggle = document.querySelector('[data-action="toggle-representative-expiry"]');
    var expiryInput = document.querySelector('[data-role="representative-expiry"]');
    if (!toggle || !expiryInput) return;
    expiryInput.disabled = !!toggle.checked;
  }

  /* ─── Bank accounts ─────────────────────────────────────────────────────── */

  function getBankForm() {
    return subjectCardPage.querySelector('[data-entity="bank-account-form"]');
  }

  function getBankList() {
    return subjectCardPage.querySelector('[data-entity="bank-account-list"]');
  }

  function getBankFormError() {
    var form = getBankForm();
    return form ? form.querySelector('[data-role="bank-form-error"]') : null;
  }

  function showBankForm() {
    var form = getBankForm();
    if (!form) return;
    form.hidden = false;
    var firstInput = form.querySelector('input[name="bankName"]');
    if (firstInput) firstInput.focus();
  }

  function clearBankForm() {
    var form = getBankForm();
    if (!form) return;
    form.querySelectorAll('input').forEach(function (input) {
      input.value = '';
    });
    var currencySelect = form.querySelector('select[name="currency"]');
    if (currencySelect) currencySelect.value = 'RUB';
  }

  function hideBankForm() {
    var form = getBankForm();
    if (!form) return;
    clearBankForm();
    var errEl = getBankFormError();
    if (errEl) errEl.hidden = true;
    form.hidden = true;
  }

  function isBankFormValid() {
    var form = getBankForm();
    if (!form) return false;
    function val(name) {
      var el = form.querySelector('[name="' + name + '"]');
      return el ? el.value.trim() : '';
    }
    return val('bankName') && val('bik') && val('accountNumber') && val('correspondentAccount') && val('currency');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function buildAccountCard(data) {
    var purpose = data.purpose.trim() || 'Без назначения';
    var openedAt = data.openedAt || '—';
    var card = document.createElement('article');
    card.className = 'crm-bank-account-card';
    card.innerHTML =
      '<div class="crm-bank-account-head">' +
        '<div>' +
          '<div class="crm-bank-account-title">' + escapeHtml(data.bankName) + '</div>' +
          '<div class="crm-bank-account-subtitle">' + escapeHtml(purpose) + '</div>' +
        '</div>' +
      '</div>' +
      '<dl class="crm-bank-account-grid">' +
        '<div class="crm-bank-account-field">' +
          '<dt class="crm-bank-field-label">БИК</dt>' +
          '<dd class="crm-bank-field-value crm-bank-mono">' + escapeHtml(data.bik) + '</dd>' +
        '</div>' +
        '<div class="crm-bank-account-field">' +
          '<dt class="crm-bank-field-label">Валюта</dt>' +
          '<dd class="crm-bank-field-value">' + escapeHtml(data.currency) + '</dd>' +
        '</div>' +
        '<div class="crm-bank-account-field">' +
          '<dt class="crm-bank-field-label">Расчётный счёт</dt>' +
          '<dd class="crm-bank-field-value crm-bank-mono">' + escapeHtml(data.accountNumber) + '</dd>' +
        '</div>' +
        '<div class="crm-bank-account-field">' +
          '<dt class="crm-bank-field-label">Дата открытия</dt>' +
          '<dd class="crm-bank-field-value">' + escapeHtml(openedAt) + '</dd>' +
        '</div>' +
        '<div class="crm-bank-account-field crm-bank-account-field-wide">' +
          '<dt class="crm-bank-field-label">Корреспондентский счёт</dt>' +
          '<dd class="crm-bank-field-value crm-bank-mono">' + escapeHtml(data.correspondentAccount) + '</dd>' +
        '</div>' +
      '</dl>' +
      '<div class="crm-bank-account-actions">' +
        '<button class="uk-button uk-button-default crm-button crm-bank-action-btn" type="button">Редактировать</button>' +
      '</div>';
    return card;
  }

  function getFieldValue(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? el.value : '';
  }

  function submitBankForm() {
    if (!isBankFormValid()) {
      var errEl = getBankFormError();
      if (errEl) {
        errEl.textContent = 'Заполните обязательные поля';
        errEl.hidden = false;
      }
      return;
    }

    var form = getBankForm();
    var data = {
      bankName: getFieldValue(form, 'bankName'),
      bik: getFieldValue(form, 'bik'),
      currency: getFieldValue(form, 'currency') || 'RUB',
      accountNumber: getFieldValue(form, 'accountNumber'),
      correspondentAccount: getFieldValue(form, 'correspondentAccount'),
      openedAt: getFieldValue(form, 'openedAt'),
      purpose: getFieldValue(form, 'purpose'),
    };

    var list = getBankList();
    if (list) {
      list.appendChild(buildAccountCard(data));
    }

    hideBankForm();
  }

  /* ─── Global keyboard handler ───────────────────────────────────────────── */

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      setRepresentativeModalState(false);
    }
  });

  /* ─── Global click handler ──────────────────────────────────────────────── */

  document.addEventListener('click', function (event) {
    var target = event.target;

    var toggleAddressesButton = target.closest('[data-action="toggle-addresses"]');
    if (toggleAddressesButton) {
      var section = toggleAddressesButton.closest('[data-role="addresses-section"], [data-entity="addresses"]');
      if (section) {
        var extra = section.querySelector('[data-role="addresses-extra"]');
        if (extra) {
          var isExpanded = toggleAddressesButton.getAttribute('aria-expanded') === 'true';
          extra.hidden = isExpanded;
          toggleAddressesButton.setAttribute('aria-expanded', String(!isExpanded));
          toggleAddressesButton.textContent = isExpanded ? 'Показать остальные адреса' : 'Скрыть остальные адреса';
        }
      }
      event.preventDefault();
      return;
    }

    if (target.closest('[data-action="open-representative-modal"]')) {
      setRepresentativeModalState(true);
      event.preventDefault();
      return;
    }

    if (target.closest('[data-action="close-representative-modal"]')) {
      setRepresentativeModalState(false);
      event.preventDefault();
      return;
    }

    if (target.closest('[data-action="save-representative"]')) {
      setRepresentativeModalState(false);
      event.preventDefault();
      return;
    }

    if (target.closest('[data-action="open-bank-account-form"]')) {
      showBankForm();
      event.preventDefault();
      return;
    }

    if (target.closest('[data-action="cancel-bank-account-form"]')) {
      hideBankForm();
      event.preventDefault();
      return;
    }

    if (target.closest('[data-action="submit-bank-account-form"]')) {
      submitBankForm();
      event.preventDefault();
      return;
    }
  });

  /* ─── Change handler ────────────────────────────────────────────────────── */

  document.addEventListener('change', function (event) {
    if (event.target.matches('[data-action="toggle-representative-expiry"]')) {
      syncRepresentativeExpiry();
    }
  });

  syncRepresentativeExpiry();
})();
