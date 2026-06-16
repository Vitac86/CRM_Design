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

  /* ─── Account / contract closure flow ──────────────────────────────────── */

  var closureRoot = subjectCardPage.querySelector('[data-role="closure-root"]');

  var CLOSURE_USERS = {
    depository: 'Петров П.П.',
    'middle-office': 'Сидорова А.А.',
  };

  var CLOSURE_ROLE_NAMES = {
    depository: 'Депозитарий',
    'middle-office': 'Мидл-офис',
    manager: 'Клиентский менеджер',
  };

  var CLOSURE_DECISION_WORDS = {
    waiting: 'ожидает',
    accepted: 'акцептовано',
    returned: 'возвращено',
  };

  var closureState = {
    role: 'manager',
    decisions: { depository: 'waiting', 'middle-office': 'waiting' },
    reasons: { depository: '', 'middle-office': '' },
    decisionInfo: {
      depository: { user: '—', date: '—' },
      'middle-office': { user: '—', date: '—' },
    },
    items: [
      { id: 'broker', contract: 'BR-2026/00444', account: '30601-000-4401', type: 'Брокерский' },
      { id: 'depository', contract: 'DP-2026/00445', account: '30-016-00041-DP', type: 'Депозитарный' },
    ],
    source: 'Личный кабинет',
    closed: false,
    finalDate: null,
  };

  function closureNow() {
    var d = new Date();
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    return '15.06.2026 ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function closureAll(selector) {
    return closureRoot ? Array.prototype.slice.call(closureRoot.querySelectorAll(selector)) : [];
  }

  function closureOne(selector) {
    return closureRoot ? closureRoot.querySelector(selector) : null;
  }

  function setClosureText(role, text) {
    closureAll('[data-role="' + role + '"]').forEach(function (el) { el.textContent = text; });
  }

  function setClosureBadgeAll(role, text, cls) {
    closureAll('[data-role="' + role + '"]').forEach(function (el) {
      el.textContent = text;
      el.className = 'crm-badge ' + cls;
    });
  }

  function setBadgeEl(el, text, cls) {
    if (!el) return;
    el.textContent = text;
    el.className = 'crm-badge ' + cls;
  }

  function getClosureDecisionRow(role) {
    return closureRoot ? closureRoot.querySelector('.crm-closure-decision-row[data-decision-role="' + role + '"]') : null;
  }

  function addTimelineEvent(text) {
    var list = closureOne('[data-role="closure-timeline"]');
    if (!list) return;
    var li = document.createElement('li');
    li.className = 'crm-closure-event';
    li.innerHTML =
      '<span class="crm-closure-event-time">' + escapeHtml(closureNow()) + '</span>' +
      '<span class="crm-closure-event-text">' + escapeHtml(text) + '</span>';
    list.appendChild(li);
  }

  function getClosureComment() {
    var ta = closureOne('[data-role="closure-comment"]');
    return ta ? ta.value.trim() : '';
  }

  function setClosureCommentError(visible) {
    var err = closureOne('[data-role="closure-comment-error"]');
    if (err) err.hidden = !visible;
  }

  function setClosureRole(role) {
    if (!closureRoot) return;
    closureState.role = role;
    closureRoot.setAttribute('data-role-current', role);
    closureRoot.querySelectorAll('[data-action="set-closure-role"]').forEach(function (btn) {
      var isActive = btn.getAttribute('data-role-value') === role;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });
    recomputeClosure();
  }

  function renderClosureItems() {
    var bannerItems = closureOne('[data-role="closure-banner-items"]');
    if (bannerItems) {
      var chipsHtml = '<span class="crm-closure-banner-items-label">Договоры/счета:</span>';
      closureState.items.forEach(function (it) {
        chipsHtml += '<span class="crm-closure-tagchip" data-closure-item="' + escapeHtml(it.id) + '">' + escapeHtml(it.contract) + '</span>';
      });
      bannerItems.innerHTML = chipsHtml;
    }

    var list = closureOne('[data-role="closure-items"]');
    if (list) {
      list.innerHTML = '';
      var statusText = closureState.closed ? 'Закрыт' : 'Действующий';
      var statusCls = closureState.closed ? 'muted' : 'success';
      closureState.items.forEach(function (it) {
        var li = document.createElement('li');
        li.className = 'crm-closure-item' + (closureState.closed ? ' is-closed' : '');
        li.setAttribute('data-closure-item', it.id);
        li.innerHTML =
          '<div class="crm-closure-item-main">' +
            '<span class="crm-closure-item-contract">' + escapeHtml(it.contract) + '</span>' +
            '<span class="crm-closure-item-sub">' + escapeHtml(it.type) + ' · счёт ' + escapeHtml(it.account) + '</span>' +
          '</div>' +
          '<span class="crm-badge ' + statusCls + '" data-role="closure-item-status">' + statusText + '</span>';
        list.appendChild(li);
      });
    }
  }

  function updateClosureTableTags() {
    var activeIds = closureState.items.map(function (it) { return it.id; });
    subjectCardPage.querySelectorAll('[data-role="closure-tag"]').forEach(function (tag) {
      var id = tag.getAttribute('data-closure-item');
      if (activeIds.indexOf(id) === -1) {
        tag.hidden = true;
        return;
      }
      tag.hidden = false;
      if (closureState.closed) {
        tag.textContent = 'Закрыт';
        tag.className = 'crm-badge muted crm-closure-tag';
      } else {
        tag.textContent = 'В заявке на закрытие';
        tag.className = 'crm-badge info crm-closure-tag';
      }
    });
  }

  function updateClosureRowActions() {
    var activeIds = closureState.items.map(function (it) { return it.id; });
    subjectCardPage.querySelectorAll('[data-action="row-close-request"]').forEach(function (btn) {
      var id = btn.getAttribute('data-closure-item');
      var inRequest = activeIds.indexOf(id) !== -1;
      if (inRequest && closureState.closed) {
        btn.disabled = true;
        btn.textContent = 'Закрыт';
      } else if (inRequest) {
        btn.disabled = true;
        btn.textContent = 'В заявке';
      } else {
        btn.disabled = false;
        btn.textContent = 'Закрыть';
      }
    });
  }

  function renderClosureChips() {
    ['depository', 'middle-office'].forEach(function (r) {
      var chip = closureOne('[data-chip-role="' + r + '"]');
      if (!chip) return;
      var st = closureState.decisions[r];
      chip.setAttribute('data-state', st);
      chip.textContent = CLOSURE_ROLE_NAMES[r] + ' — ' + CLOSURE_DECISION_WORDS[st];
    });
    var mgrChip = closureOne('[data-chip-role="manager"]');
    if (mgrChip) {
      var both = closureState.decisions.depository === 'accepted' && closureState.decisions['middle-office'] === 'accepted';
      var st = closureState.closed ? 'done' : (both ? 'ready' : 'unavailable');
      var word = { unavailable: 'недоступно', ready: 'готов к закрытию', done: 'выполнено' }[st];
      mgrChip.setAttribute('data-state', st);
      mgrChip.textContent = 'Клиентский менеджер — ' + word;
    }
  }

  function renderClosureDecisionRow(role) {
    var row = getClosureDecisionRow(role);
    if (!row) return;
    var state = closureState.decisions[role];
    var info = closureState.decisionInfo[role];
    var badge = row.querySelector('[data-role="decision-badge"]');
    var userEl = row.querySelector('[data-role="decision-user"]');
    var dateEl = row.querySelector('[data-role="decision-date"]');
    row.setAttribute('data-state', state);
    if (userEl) userEl.textContent = info.user;
    if (dateEl) dateEl.textContent = info.date;
    if (state === 'accepted') setBadgeEl(badge, 'Акцептовано', 'success');
    else if (state === 'returned') setBadgeEl(badge, 'Возвращено', 'danger');
    else setBadgeEl(badge, 'Ожидает', 'warning');
  }

  function syncClosureButtons(both) {
    closureAll('[data-action="closure-accept"]').forEach(function (btn) {
      var r = btn.getAttribute('data-decision-role');
      btn.disabled = closureState.closed || closureState.decisions[r] === 'accepted';
    });
    closureAll('[data-action="closure-return"]').forEach(function (btn) {
      btn.disabled = closureState.closed;
    });
    closureAll('[data-action="closure-final"]').forEach(function (btn) {
      btn.disabled = !(both && closureState.role === 'manager' && !closureState.closed);
      btn.textContent = closureState.closed ? 'Счёт закрыт' : 'Закрыть счёт';
    });
  }

  function recomputeClosure() {
    if (!closureRoot) return;

    renderClosureDecisionRow('depository');
    renderClosureDecisionRow('middle-office');
    renderClosureChips();
    renderClosureItems();

    var dep = closureState.decisions.depository;
    var mid = closureState.decisions['middle-office'];
    var both = dep === 'accepted' && mid === 'accepted';
    var anyReturned = dep === 'returned' || mid === 'returned';

    var status, statusCls, step;
    if (closureState.closed) {
      status = 'Закрыта'; statusCls = 'success'; step = 'Закрытие выполнено';
    } else if (anyReturned) {
      status = 'Возвращена на уточнение'; statusCls = 'danger'; step = 'Уточнение у клиентского менеджера';
    } else if (both) {
      status = 'Готова к закрытию'; statusCls = 'info'; step = 'Клиентский менеджер';
    } else {
      status = 'Ожидает акцепта'; statusCls = 'warning';
      var pending = [];
      if (dep === 'waiting') pending.push('Депозитарий');
      if (mid === 'waiting') pending.push('Мидл-офис');
      step = pending.join(' и ') || 'Клиентский менеджер';
    }

    setClosureBadgeAll('closure-status-badge', status, statusCls);
    setClosureText('closure-step', step);

    var hintText = both ? 'Все согласования получены — закрытие доступно менеджеру.' : 'Доступно после акцепта Депозитария и Мидл-офиса';
    if (closureState.closed) hintText = 'Закрытие выполнено клиентским менеджером.';
    setClosureText('closure-final-hint', hintText);

    var managerRow = getClosureDecisionRow('manager');
    if (managerRow) {
      var mgrBadge = managerRow.querySelector('[data-role="decision-badge"]');
      var mgrDate = managerRow.querySelector('[data-role="decision-date"]');
      if (closureState.closed) {
        managerRow.setAttribute('data-state', 'done');
        setBadgeEl(mgrBadge, 'Выполнено', 'success');
        if (mgrDate) mgrDate.textContent = closureState.finalDate || closureNow();
      } else {
        managerRow.setAttribute('data-state', both ? 'ready' : 'unavailable');
        setBadgeEl(mgrBadge, both ? 'Готово к закрытию' : 'Недоступно', both ? 'info' : 'muted');
        if (mgrDate) mgrDate.textContent = '—';
      }
    }

    syncClosureButtons(both);

    var reasonBox = closureOne('[data-role="closure-reason"]');
    var reasonText = closureOne('[data-role="closure-reason-text"]');
    var parts = [];
    ['depository', 'middle-office'].forEach(function (role) {
      if (closureState.decisions[role] === 'returned' && closureState.reasons[role]) {
        parts.push(CLOSURE_ROLE_NAMES[role] + ': ' + closureState.reasons[role]);
      }
    });
    if (reasonBox && reasonText) {
      if (parts.length && !closureState.closed) {
        reasonText.textContent = parts.join('\n');
        reasonBox.hidden = false;
      } else {
        reasonBox.hidden = true;
      }
    }

    updateClosureTableTags();
    updateClosureRowActions();
  }

  function acceptClosureDecision(role) {
    if (closureState.closed || role === 'manager') return;
    closureState.decisions[role] = 'accepted';
    closureState.reasons[role] = '';
    closureState.decisionInfo[role] = { user: CLOSURE_USERS[role] || '—', date: closureNow() };
    setClosureCommentError(false);
    var comment = getClosureComment();
    addTimelineEvent(CLOSURE_ROLE_NAMES[role] + ' акцептовал заявку' + (comment ? ' · ' + comment : ''));
    recomputeClosure();
  }

  function returnClosureDecision(role) {
    if (closureState.closed || role === 'manager') return;
    var comment = getClosureComment();
    if (!comment) {
      setClosureDrawerState(true);
      setClosureCommentError(true);
      var ta = closureOne('[data-role="closure-comment"]');
      if (ta) ta.focus();
      return;
    }
    setClosureCommentError(false);
    closureState.decisions[role] = 'returned';
    closureState.reasons[role] = comment;
    closureState.decisionInfo[role] = { user: CLOSURE_USERS[role] || '—', date: closureNow() };
    addTimelineEvent('Возвращено на уточнение · ' + CLOSURE_ROLE_NAMES[role] + ': ' + comment);
    recomputeClosure();
  }

  function finalCloseClosure() {
    if (closureState.closed || closureState.role !== 'manager') return;
    if (!(closureState.decisions.depository === 'accepted' && closureState.decisions['middle-office'] === 'accepted')) return;
    closureState.closed = true;
    closureState.finalDate = closureNow();
    addTimelineEvent('Клиентский менеджер закрыл договоры/счета. Заявка переведена в статус «Закрыта».');
    recomputeClosure();
  }

  function setClosureDrawerState(open) {
    var drawer = closureOne('[data-role="closure-drawer"]');
    if (!drawer) return;
    if (open) {
      drawer.hidden = false;
      if (window.requestAnimationFrame) {
        window.requestAnimationFrame(function () { drawer.classList.add('is-visible'); });
      } else {
        drawer.classList.add('is-visible');
      }
      document.body.classList.add('crm-modal-open');
    } else {
      drawer.classList.remove('is-visible');
      document.body.classList.remove('crm-modal-open');
      window.setTimeout(function () { drawer.hidden = true; }, 220);
    }
  }

  /* ─── Closure creation modal ───────────────────────────────────────────── */

  function setClosureModalState(isOpen) {
    var modal = subjectCardPage.querySelector('[data-role="closure-modal"]');
    if (!modal) return;
    modal.hidden = !isOpen;
    document.body.classList.toggle('crm-modal-open', isOpen);
    if (isOpen) {
      updateClosureFormSummary();
      var err = modal.querySelector('[data-role="closure-form-error"]');
      if (err) err.hidden = true;
    }
  }

  function getClosureFormChecks() {
    var modal = subjectCardPage.querySelector('[data-role="closure-modal"]');
    if (!modal) return [];
    return Array.prototype.slice.call(modal.querySelectorAll('[data-role="closure-form-check"]'));
  }

  function updateClosureFormSummary() {
    var summary = subjectCardPage.querySelector('[data-role="closure-form-summary"]');
    if (!summary) return;
    var count = getClosureFormChecks().filter(function (c) { return c.checked; }).length;
    summary.textContent = 'Выбрано позиций: ' + count;
  }

  function openClosureModalForItem(itemId) {
    var modal = subjectCardPage.querySelector('[data-role="closure-modal"]');
    if (!modal) return;
    getClosureFormChecks().forEach(function (check) {
      check.checked = check.getAttribute('data-closure-item') === itemId;
    });
    setClosureModalState(true);
  }

  function submitClosureModal() {
    var checks = getClosureFormChecks().filter(function (c) { return c.checked; });
    if (!checks.length) {
      var err = subjectCardPage.querySelector('[data-role="closure-form-error"]');
      if (err) err.hidden = false;
      return;
    }

    var modal = subjectCardPage.querySelector('[data-role="closure-modal"]');
    var sourceSel = modal.querySelector('[data-role="closure-form-source"]');
    var source = sourceSel ? sourceSel.value : 'Личный кабинет';
    var commentEl = modal.querySelector('[data-role="closure-form-comment"]');
    var comment = commentEl ? commentEl.value.trim() : '';

    closureState.items = checks.map(function (check) {
      var row = check.closest('tr');
      var cells = row ? row.children : null;
      return {
        id: check.getAttribute('data-closure-item'),
        contract: check.getAttribute('data-contract'),
        account: check.getAttribute('data-account'),
        type: cells ? cells[2].textContent.trim() : '',
      };
    });

    closureState.decisions = { depository: 'waiting', 'middle-office': 'waiting' };
    closureState.reasons = { depository: '', 'middle-office': '' };
    closureState.decisionInfo = {
      depository: { user: '—', date: '—' },
      'middle-office': { user: '—', date: '—' },
    };
    closureState.closed = false;
    closureState.finalDate = null;
    closureState.source = source;

    setClosureText('closure-source', source);
    setClosureText('closure-created', closureNow());
    var commentTa = closureOne('[data-role="closure-comment"]');
    if (commentTa) commentTa.value = '';
    setClosureCommentError(false);

    var timeline = closureOne('[data-role="closure-timeline"]');
    if (timeline) timeline.innerHTML = '';
    addTimelineEvent('Заявка создана менеджером вручную · источник: ' + source + (comment ? ' · ' + comment : ''));
    addTimelineEvent('Уведомления отправлены ответственным сотрудникам');

    recomputeClosure();
    setClosureModalState(false);

    var banner = closureOne('[data-role="closure-banner"]');
    if (banner && banner.scrollIntoView) {
      banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /* ─── Closure event wiring ─────────────────────────────────────────────── */

  if (closureRoot) {
    closureRoot.addEventListener('click', function (event) {
      var roleBtn = event.target.closest('[data-action="set-closure-role"]');
      if (roleBtn) { setClosureRole(roleBtn.getAttribute('data-role-value')); event.preventDefault(); return; }

      var openDrawer = event.target.closest('[data-action="open-closure-drawer"]');
      if (openDrawer) { setClosureDrawerState(true); event.preventDefault(); return; }

      var closeDrawer = event.target.closest('[data-action="close-closure-drawer"]');
      if (closeDrawer) { setClosureDrawerState(false); event.preventDefault(); return; }

      var acceptBtn = event.target.closest('[data-action="closure-accept"]');
      if (acceptBtn && !acceptBtn.disabled) { acceptClosureDecision(acceptBtn.getAttribute('data-decision-role')); event.preventDefault(); return; }

      var returnBtn = event.target.closest('[data-action="closure-return"]');
      if (returnBtn && !returnBtn.disabled) { returnClosureDecision(returnBtn.getAttribute('data-decision-role')); event.preventDefault(); return; }

      var finalBtn = event.target.closest('[data-action="closure-final"]');
      if (finalBtn && !finalBtn.disabled) { finalCloseClosure(); event.preventDefault(); return; }
    });
  }

  document.addEventListener('click', function (event) {
    var rowCloseBtn = event.target.closest('[data-action="row-close-request"]');
    if (rowCloseBtn && !rowCloseBtn.disabled) { openClosureModalForItem(rowCloseBtn.getAttribute('data-closure-item')); event.preventDefault(); return; }
    if (event.target.closest('[data-action="open-closure-modal"]')) { setClosureModalState(true); event.preventDefault(); return; }
    if (event.target.closest('[data-action="close-closure-modal"]')) { setClosureModalState(false); event.preventDefault(); return; }
    if (event.target.closest('[data-action="submit-closure-modal"]')) { submitClosureModal(); event.preventDefault(); return; }
  });

  document.addEventListener('change', function (event) {
    if (event.target.matches('[data-role="closure-form-check"]')) { updateClosureFormSummary(); }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      setClosureModalState(false);
      setClosureDrawerState(false);
    }
  });

  /* ─── Query-param tab + role bootstrap ─────────────────────────────────── */

  function bootstrapClosureFromQuery() {
    var params;
    try {
      params = new URLSearchParams(window.location.search);
    } catch (e) {
      return;
    }

    var roleParam = params.get('role');
    var roleMap = { manager: 'manager', depository: 'depository', 'middle-office': 'middle-office' };
    if (closureRoot && roleParam && roleMap[roleParam]) {
      setClosureRole(roleMap[roleParam]);
    }

    if (params.get('tab') === 'contracts') {
      var tabLinks = subjectCardPage.querySelectorAll('.crm-subject-tabs [data-tab-target]');
      var index = -1;
      tabLinks.forEach(function (link, i) {
        if (link.getAttribute('data-tab-target') === 'contracts') index = i;
      });
      var tabsEl = subjectCardPage.querySelector('.crm-subject-tabs');
      if (index >= 0 && tabsEl) {
        setTimeout(function () {
          if (window.UIkit && window.UIkit.tab) {
            try {
              window.UIkit.tab(tabsEl).show(index);
              return;
            } catch (e) { /* fall through to click */ }
          }
          if (tabLinks[index]) tabLinks[index].click();
        }, 0);
      }
    }
  }

  if (closureRoot) {
    recomputeClosure();
  }
  bootstrapClosureFromQuery();

  syncRepresentativeExpiry();
  setupDocumentUpload();
})();
