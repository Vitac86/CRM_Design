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

  function getBankFieldValue(form, name) {
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
      bankName: getBankFieldValue(form, 'bankName'),
      bik: getBankFieldValue(form, 'bik'),
      currency: getBankFieldValue(form, 'currency') || 'RUB',
      accountNumber: getBankFieldValue(form, 'accountNumber'),
      correspondentAccount: getBankFieldValue(form, 'correspondentAccount'),
      openedAt: getBankFieldValue(form, 'openedAt'),
      purpose: getBankFieldValue(form, 'purpose'),
    };

    var list = getBankList();
    if (list) {
      list.appendChild(buildAccountCard(data));
    }

    hideBankForm();
  }

  /* ─── Documents ─────────────────────────────────────────────────────────── */

  function getDocumentModal() {
    return document.querySelector('[data-role="document-modal"]');
  }

  function getDocumentForm() {
    return document.querySelector('[data-entity="document-form"]');
  }

  function getDocumentFormError() {
    var form = getDocumentForm();
    return form ? form.querySelector('[data-role="document-form-error"]') : null;
  }

  function setDocumentModalState(isOpen) {
    var modal = getDocumentModal();
    if (!modal) return;
    modal.hidden = !isOpen;
    document.body.classList.toggle('crm-modal-open', isOpen);
  }

  function clearDocumentForm() {
    var form = getDocumentForm();
    if (!form) return;
    form.querySelectorAll('input').forEach(function (input) {
      input.value = '';
    });
    form.querySelectorAll('select').forEach(function (select) {
      select.value = '';
    });
    var errEl = getDocumentFormError();
    if (errEl) errEl.hidden = true;
  }

  function openDocumentForm() {
    clearDocumentForm();
    setDocumentModalState(true);
    var form = getDocumentForm();
    if (form) {
      var firstInput = form.querySelector('input[name="title"]');
      if (firstInput) firstInput.focus();
    }
  }

  function cancelDocumentForm() {
    setDocumentModalState(false);
    clearDocumentForm();
  }

  function getDocFormFieldValue(name) {
    var form = getDocumentForm();
    if (!form) return '';
    var el = form.querySelector('[name="' + name + '"]');
    return el ? el.value.trim() : '';
  }

  function isDocumentFormValid() {
    return (
      getDocFormFieldValue('title') &&
      getDocFormFieldValue('documentType') &&
      getDocFormFieldValue('status') &&
      getDocFormFieldValue('date')
    );
  }

  function getDocStatusBadgeClass(status) {
    if (status === 'Действующий') return 'success';
    if (status === 'На подписи') return 'warning';
    if (status === 'Архивный') return 'muted';
    if (status === 'Черновик') return 'muted';
    return 'muted';
  }

  function buildDocumentRow(data) {
    var badgeClass = getDocStatusBadgeClass(data.status);
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td class="crm-documents-td-title">' + escapeHtml(data.title) + '</td>' +
      '<td>' + escapeHtml(data.documentType) + '</td>' +
      '<td><span class="crm-badge ' + badgeClass + '">' + escapeHtml(data.status) + '</span></td>' +
      '<td>' + escapeHtml(data.date) + '</td>' +
      '<td class="crm-documents-td-actions">' +
        '<div class="crm-documents-row-actions">' +
          '<button class="uk-button uk-button-default crm-button crm-document-action-button" type="button"' +
            ' data-action="download-document"' +
            ' data-doc-title="' + escapeHtml(data.title) + '"' +
            ' data-doc-type="' + escapeHtml(data.documentType) + '"' +
            ' data-doc-status="' + escapeHtml(data.status) + '"' +
            ' data-doc-date="' + escapeHtml(data.date) + '">' +
            'Скачать' +
          '</button>' +
          '<button class="uk-button uk-button-default crm-button crm-document-action-button" type="button"' +
            ' data-action="print-document"' +
            ' data-doc-title="' + escapeHtml(data.title) + '">' +
            'Распечатать' +
          '</button>' +
        '</div>' +
      '</td>';
    return tr;
  }

  function submitDocumentForm() {
    if (!isDocumentFormValid()) {
      var errEl = getDocumentFormError();
      if (errEl) errEl.hidden = false;
      return;
    }

    var data = {
      title: getDocFormFieldValue('title'),
      documentType: getDocFormFieldValue('documentType'),
      status: getDocFormFieldValue('status'),
      date: getDocFormFieldValue('date'),
    };

    var tbody = subjectCardPage.querySelector('[data-role="documents-tbody"]');
    if (tbody) {
      tbody.insertBefore(buildDocumentRow(data), tbody.firstChild);
    }

    setDocumentModalState(false);
    clearDocumentForm();
  }

  var transliterationMap = {
    'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z',
    'и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r',
    'с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'ts','ч':'ch','ш':'sh',
    'щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'
  };

  function sanitizeFileName(raw) {
    var lower = raw.toLowerCase();
    var transliterated = lower.split('').map(function (ch) {
      return transliterationMap[ch] !== undefined ? transliterationMap[ch] : ch;
    }).join('');
    return transliterated
      .replace(/[^a-z0-9._\s-]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_');
  }

  function downloadDocument(btn) {
    var title = btn.getAttribute('data-doc-title') || 'document';
    var type = btn.getAttribute('data-doc-type') || '';
    var status = btn.getAttribute('data-doc-status') || '';
    var date = btn.getAttribute('data-doc-date') || '';

    var content = [
      'Название документа: ' + title,
      'Вид документа: ' + type,
      'Статус: ' + status,
      'Дата: ' + date,
      '',
      'Это mock-файл, сгенерированный в интерфейсе CRM.'
    ].join('\n');

    var sanitized = sanitizeFileName(title);
    var fileName = sanitized ? (sanitized + '.txt') : 'document.txt';

    var blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    var objectUrl = URL.createObjectURL(blob);
    var anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  }

  function printDocument(btn) {
    var title = btn.getAttribute('data-doc-title') || 'документ';
    window.alert('Подготовка документа «' + title + '» к печати');
    window.print();
  }

  /* ─── Global keyboard handler ───────────────────────────────────────────── */

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      setRepresentativeModalState(false);
      setDocumentModalState(false);
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

    if (target.closest('[data-action="open-document-form"]')) {
      openDocumentForm();
      event.preventDefault();
      return;
    }

    if (target.closest('[data-action="cancel-document-form"]')) {
      cancelDocumentForm();
      event.preventDefault();
      return;
    }

    if (target.closest('[data-action="submit-document-form"]')) {
      submitDocumentForm();
      event.preventDefault();
      return;
    }

    var downloadBtn = target.closest('[data-action="download-document"]');
    if (downloadBtn) {
      downloadDocument(downloadBtn);
      event.preventDefault();
      return;
    }

    var printBtn = target.closest('[data-action="print-document"]');
    if (printBtn) {
      printDocument(printBtn);
      event.preventDefault();
      return;
    }

    if (target.closest('[data-action="open-document-wizard"]')) {
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
