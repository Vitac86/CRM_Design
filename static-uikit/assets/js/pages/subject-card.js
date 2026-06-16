(function () {
  var subjectCardPage = document.body && document.body.getAttribute('data-page') === 'subject-card'
    ? document.body
    : document.querySelector('.crm-page[data-page="subject-card"]');

  if (!subjectCardPage) {
    return;
  }

  /* ─── In-memory file store ──────────────────────────────────────────────── */

  var docFileStore = {};
  var docFileIdCounter = 0;
  var selectedDocFile = null;

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

  var editingBankCard = null;

  function setBankFormLabels(isEdit) {
    var form = getBankForm();
    if (!form) return;
    var titleEl = form.querySelector('.crm-bank-account-form-title');
    var submitBtn = form.querySelector('[data-action="submit-bank-account-form"]');
    if (titleEl) titleEl.textContent = isEdit ? 'Редактировать счёт' : 'Новый счёт';
    if (submitBtn) submitBtn.textContent = isEdit ? 'Сохранить изменения' : 'Добавить';
  }

  function prefillBankFormFromCard(card) {
    var form = getBankForm();
    if (!form || !card) return;
    function setField(name, value) {
      var el = form.querySelector('[name="' + name + '"]');
      if (el) el.value = value || '';
    }
    setField('bankName', card.getAttribute('data-bank-name'));
    setField('bik', card.getAttribute('data-bik'));
    setField('accountNumber', card.getAttribute('data-account-number'));
    setField('correspondentAccount', card.getAttribute('data-correspondent-account'));
    setField('currency', card.getAttribute('data-currency') || 'RUB');
    setField('openedAt', card.getAttribute('data-opened-at'));
    setField('purpose', card.getAttribute('data-purpose'));
    var primaryCheckbox = form.querySelector('[data-role="bank-primary-input"]');
    if (primaryCheckbox) {
      primaryCheckbox.checked = card.getAttribute('data-is-primary') === 'true';
    }
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
      if (input.type === 'checkbox') {
        input.checked = false;
      } else {
        input.value = '';
      }
    });
    var currencySelect = form.querySelector('select[name="currency"]');
    if (currencySelect) currencySelect.value = 'RUB';
  }

  function hideBankForm() {
    editingBankCard = null;
    var form = getBankForm();
    if (!form) return;
    clearBankForm();
    setBankFormLabels(false);
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
    card.setAttribute('data-entity', 'bank-account-card');
    card.setAttribute('data-bank-name', data.bankName || '');
    card.setAttribute('data-bik', data.bik || '');
    card.setAttribute('data-account-number', data.accountNumber || '');
    card.setAttribute('data-correspondent-account', data.correspondentAccount || '');
    card.setAttribute('data-currency', data.currency || '');
    card.setAttribute('data-opened-at', data.openedAt || '');
    card.setAttribute('data-purpose', data.purpose || '');
    card.setAttribute('data-is-primary', data.isPrimary ? 'true' : 'false');
    var badgesHtml = data.isPrimary
      ? '<div class="crm-bank-account-badges"><span class="crm-badge brand">Основной</span></div>'
      : '';
    card.innerHTML =
      '<div class="crm-bank-account-head">' +
        '<div>' +
          '<div class="crm-bank-account-title">' + escapeHtml(data.bankName) + '</div>' +
          '<div class="crm-bank-account-subtitle">' + escapeHtml(purpose) + '</div>' +
        '</div>' +
        badgesHtml +
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
        '<button class="uk-button uk-button-default crm-button crm-bank-action-btn" type="button" data-action="edit-bank-account">Редактировать</button>' +
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
    var primaryCheckbox = form.querySelector('[data-role="bank-primary-input"]');
    var data = {
      bankName: getBankFieldValue(form, 'bankName'),
      bik: getBankFieldValue(form, 'bik'),
      currency: getBankFieldValue(form, 'currency') || 'RUB',
      accountNumber: getBankFieldValue(form, 'accountNumber'),
      correspondentAccount: getBankFieldValue(form, 'correspondentAccount'),
      openedAt: getBankFieldValue(form, 'openedAt'),
      purpose: getBankFieldValue(form, 'purpose'),
      isPrimary: primaryCheckbox ? primaryCheckbox.checked : false,
    };

    if (data.isPrimary) {
      subjectCardPage.querySelectorAll('[data-entity="bank-account-card"]').forEach(function (c) {
        c.setAttribute('data-is-primary', 'false');
        var badgesDiv = c.querySelector('.crm-bank-account-badges');
        if (badgesDiv) {
          var primaryBadge = badgesDiv.querySelector('.crm-badge.brand');
          if (primaryBadge) primaryBadge.remove();
        }
      });
    }

    if (editingBankCard) {
      var newCard = buildAccountCard(data);
      editingBankCard.parentNode.replaceChild(newCard, editingBankCard);
    } else {
      var list = getBankList();
      if (list) {
        list.appendChild(buildAccountCard(data));
      }
    }

    hideBankForm();
  }

  /* ─── Documents ─────────────────────────────────────────────────────────── */

  function getDocumentForm() {
    return document.querySelector('[data-entity="document-form"]');
  }

  function getDocumentFormError() {
    var form = getDocumentForm();
    return form ? form.querySelector('[data-role="document-form-error"]') : null;
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' Б';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
    return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
  }

  function clearDocumentUpload() {
    selectedDocFile = null;
    var form = getDocumentForm();
    if (!form) return;
    var dropzone = form.querySelector('[data-role="document-dropzone"]');
    var preview = form.querySelector('[data-role="document-file-preview"]');
    var fileInput = form.querySelector('[data-role="document-file-input"]');
    if (dropzone) {
      dropzone.hidden = false;
      dropzone.classList.remove('is-dragover', 'is-error');
    }
    if (preview) preview.hidden = true;
    if (fileInput) fileInput.value = '';
  }

  function selectDocumentFile(file) {
    selectedDocFile = file;
    var form = getDocumentForm();
    if (!form) return;
    var dropzone = form.querySelector('[data-role="document-dropzone"]');
    var preview = form.querySelector('[data-role="document-file-preview"]');
    var nameEl = form.querySelector('[data-role="document-file-name"]');
    var metaEl = form.querySelector('[data-role="document-file-meta"]');
    if (dropzone) {
      dropzone.hidden = true;
      dropzone.classList.remove('is-dragover', 'is-error');
    }
    if (preview) preview.hidden = false;
    if (nameEl) nameEl.textContent = file.name;
    if (metaEl) {
      var typeStr = file.type || ('.' + file.name.split('.').pop().toLowerCase());
      metaEl.textContent = formatFileSize(file.size) + ' · ' + typeStr;
    }
    var titleInput = form.querySelector('[name="title"]');
    if (titleInput && !titleInput.value.trim()) {
      titleInput.value = file.name.replace(/\.[^.]+$/, '');
    }
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
    clearDocumentUpload();
    var errEl = getDocumentFormError();
    if (errEl) errEl.hidden = true;
  }

  function openDocumentForm() {
    clearDocumentForm();
    var form = getDocumentForm();
    if (!form) return;
    form.hidden = false;
    var firstInput = form.querySelector('input[name="title"]');
    if (firstInput) firstInput.focus();
  }

  function cancelDocumentForm() {
    var form = getDocumentForm();
    if (form) form.hidden = true;
    clearDocumentForm();
  }

  function getDocFormFieldValue(name) {
    var form = getDocumentForm();
    if (!form) return '';
    var el = form.querySelector('[name="' + name + '"]');
    return el ? el.value.trim() : '';
  }

  function isDocumentFormValid() {
    return !!(
      getDocFormFieldValue('title') &&
      getDocFormFieldValue('documentType') &&
      getDocFormFieldValue('status') &&
      getDocFormFieldValue('date') &&
      selectedDocFile
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
    var dlFileAttrs = data.docFileId
      ? ' data-doc-file-id="' + escapeHtml(data.docFileId) + '"'
      : '';
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
            ' data-doc-date="' + escapeHtml(data.date) + '"' +
            dlFileAttrs + '>' +
            'Скачать' +
          '</button>' +
          '<button class="uk-button uk-button-default crm-button crm-document-action-button" type="button"' +
            ' data-action="print-document"' +
            ' data-doc-title="' + escapeHtml(data.title) + '"' +
            dlFileAttrs + '>' +
            'Распечатать' +
          '</button>' +
        '</div>' +
      '</td>';
    return tr;
  }

  function submitDocumentForm() {
    if (!isDocumentFormValid()) {
      var errEl = getDocumentFormError();
      if (errEl) {
        errEl.textContent = 'Заполните обязательные поля и приложите файл документа.';
        errEl.hidden = false;
      }
      var form = getDocumentForm();
      if (form && !selectedDocFile) {
        var dz = form.querySelector('[data-role="document-dropzone"]');
        if (dz && !dz.hidden) dz.classList.add('is-error');
      }
      return;
    }

    docFileIdCounter += 1;
    var fileId = 'doc-file-' + docFileIdCounter;
    docFileStore[fileId] = selectedDocFile;

    var data = {
      title: getDocFormFieldValue('title'),
      documentType: getDocFormFieldValue('documentType'),
      status: getDocFormFieldValue('status'),
      date: getDocFormFieldValue('date'),
      docFileId: fileId,
    };

    var tbody = subjectCardPage.querySelector('[data-role="documents-tbody"]');
    if (tbody) {
      tbody.insertBefore(buildDocumentRow(data), tbody.firstChild);
    }

    cancelDocumentForm();
  }

  function setupDocumentUpload() {
    var form = getDocumentForm();
    if (!form) return;
    var dropzone = form.querySelector('[data-role="document-dropzone"]');
    var fileInput = form.querySelector('[data-role="document-file-input"]');
    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('dragenter', function (e) {
      e.preventDefault();
      dropzone.classList.add('is-dragover');
    }, false);

    dropzone.addEventListener('dragover', function (e) {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      dropzone.classList.add('is-dragover');
    }, false);

    dropzone.addEventListener('dragleave', function (e) {
      if (!dropzone.contains(e.relatedTarget)) {
        dropzone.classList.remove('is-dragover');
      }
    }, false);

    dropzone.addEventListener('drop', function (e) {
      e.preventDefault();
      dropzone.classList.remove('is-dragover');
      var files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length > 0) {
        selectDocumentFile(files[0]);
      }
    }, false);

    dropzone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });

    fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files.length > 0) {
        selectDocumentFile(fileInput.files[0]);
      }
    });
  }

  /* ─── Client accounts ───────────────────────────────────────────────────── */

  function getClientAccountForm() {
    return subjectCardPage.querySelector('[data-entity="client-account-form"]');
  }

  function getClientAccountFormError() {
    var form = getClientAccountForm();
    return form ? form.querySelector('[data-role="client-account-form-error"]') : null;
  }

  function getClientAccountFieldValue(name) {
    var form = getClientAccountForm();
    if (!form) return '';
    var el = form.querySelector('[name="' + name + '"]');
    return el ? el.value.trim() : '';
  }

  function isClientAccountFormValid() {
    return !!(getClientAccountFieldValue('accountNumber') && getClientAccountFieldValue('accountOpenDate'));
  }

  function clearClientAccountForm() {
    var form = getClientAccountForm();
    if (!form) return;
    form.querySelectorAll('input').forEach(function (input) {
      input.value = '';
    });
    var typeSelect = form.querySelector('select[name="accountType"]');
    if (typeSelect) typeSelect.value = 'broker';
    var errEl = getClientAccountFormError();
    if (errEl) errEl.hidden = true;
  }

  function openClientAccountForm() {
    clearClientAccountForm();
    var form = getClientAccountForm();
    if (!form) return;
    form.hidden = false;
    var firstInput = form.querySelector('input[name="accountNumber"]');
    if (firstInput) firstInput.focus();
  }

  function cancelClientAccountForm() {
    var form = getClientAccountForm();
    if (form) form.hidden = true;
    clearClientAccountForm();
  }

  var accountTypeLabelMap = {
    broker: 'Брокерский',
    depository: 'Депозитарный',
    trust: 'Доверительное управление',
    iis: 'ИИС',
    other: 'Иной',
  };

  function buildClientAccountRow(data) {
    var tr = document.createElement('tr');
    var typeLabel = accountTypeLabelMap[data.accountType] || escapeHtml(data.accountType);
    tr.innerHTML =
      '<td>' + escapeHtml(data.accountNumber) + '</td>' +
      '<td>' + typeLabel + '</td>' +
      '<td>' + escapeHtml(data.accountOpenDate) + '</td>';
    return tr;
  }

  function submitClientAccountForm() {
    if (!isClientAccountFormValid()) {
      var errEl = getClientAccountFormError();
      if (errEl) errEl.hidden = false;
      return;
    }

    var data = {
      accountNumber: getClientAccountFieldValue('accountNumber'),
      accountType: getClientAccountFieldValue('accountType') || 'broker',
      accountOpenDate: getClientAccountFieldValue('accountOpenDate'),
    };

    var tbody = subjectCardPage.querySelector('[data-role="client-accounts-tbody"]');
    if (tbody) {
      tbody.insertBefore(buildClientAccountRow(data), tbody.firstChild);
    }

    cancelClientAccountForm();
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
    var fileId = btn.getAttribute('data-doc-file-id');
    if (fileId && docFileStore[fileId]) {
      var file = docFileStore[fileId];
      var objectUrl = URL.createObjectURL(file);
      var anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = file.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      return;
    }

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
    var fileId = btn.getAttribute('data-doc-file-id');
    if (fileId && docFileStore[fileId]) {
      var file = docFileStore[fileId];
      var mime = file.type || '';
      if (mime === 'application/pdf' || mime.indexOf('image/') === 0) {
        var objectUrl = URL.createObjectURL(file);
        window.open(objectUrl, '_blank');
        setTimeout(function () { URL.revokeObjectURL(objectUrl); }, 10000);
        return;
      }
    }
    var title = btn.getAttribute('data-doc-title') || 'документ';
    window.alert('Подготовка документа «' + title + '» к печати');
    window.print();
  }

  /* ─── Global keyboard handler ───────────────────────────────────────────── */

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      setRepresentativeModalState(false);
      hideBankForm();
      cancelDocumentForm();
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
      editingBankCard = null;
      clearBankForm();
      setBankFormLabels(false);
      showBankForm();
      event.preventDefault();
      return;
    }

    var editBankBtn = target.closest('[data-action="edit-bank-account"]');
    if (editBankBtn) {
      var bankCard = editBankBtn.closest('[data-entity="bank-account-card"]');
      if (bankCard) {
        editingBankCard = bankCard;
        clearBankForm();
        prefillBankFormFromCard(bankCard);
        setBankFormLabels(true);
        var bankForm = getBankForm();
        if (bankForm) {
          bankForm.hidden = false;
          bankForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          var firstBankInput = bankForm.querySelector('input[name="bankName"]');
          if (firstBankInput) firstBankInput.focus();
        }
      }
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

    if (target.closest('[data-action="remove-document-file"]')) {
      clearDocumentUpload();
      event.preventDefault();
      return;
    }

    var dropzoneEl = target.closest('[data-role="document-dropzone"]');
    if (dropzoneEl && !dropzoneEl.hidden) {
      var fileInputEl = dropzoneEl.querySelector('[data-role="document-file-input"]');
      if (fileInputEl) fileInputEl.click();
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

    var wizardTrigger = target.closest('[data-action="open-document-wizard"]');
    if (wizardTrigger) {
      if (wizardTrigger.tagName === 'A' && wizardTrigger.getAttribute('href')) {
        return;
      }
      event.preventDefault();
      return;
    }

    if (target.closest('[data-action="open-client-account-form"]')) {
      openClientAccountForm();
      event.preventDefault();
      return;
    }

    if (target.closest('[data-action="cancel-client-account-form"]')) {
      cancelClientAccountForm();
      event.preventDefault();
      return;
    }

    if (target.closest('[data-action="submit-client-account-form"]')) {
      submitClientAccountForm();
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
  setupDocumentUpload();
})();
