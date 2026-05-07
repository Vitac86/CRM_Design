(function () {
  'use strict';

  /* ── scope guard ─────────────────────────────────────────────────────────── */
  var PAGE_ATTR = 'subject-register';
  var pageScope =
    document.body && document.body.getAttribute('data-page') === PAGE_ATTR
      ? document.body
      : document.querySelector('.crm-page[data-page="' + PAGE_ATTR + '"]');

  if (!pageScope) return;

  /* ── state ───────────────────────────────────────────────────────────────── */
  var currentStep = 1;
  var subjectType = null;  // 'fl' | 'ul'
  var regMethod   = null;  // 'manual' | 'cabinet' | 'inn'
  var innResolved = false;

  /* ── element refs ────────────────────────────────────────────────────────── */
  var panels = {
    step1:    document.getElementById('reg-step-1'),
    step2fl:  document.getElementById('reg-step-2-fl'),
    step2ul:  document.getElementById('reg-step-2-ul'),
    step2inn: document.getElementById('reg-step-2-inn'),
    step3:    document.getElementById('reg-step-3'),
  };

  var stepNote       = document.querySelector('[data-reg-step-note]');
  var stepIndicators = Array.prototype.slice.call(document.querySelectorAll('.crm-wizard-step'));
  var typeGrid       = document.querySelector('.reg-type-grid');
  var methodGrid     = document.querySelector('.reg-method-grid');
  var innCard        = methodGrid ? methodGrid.querySelector('[data-value="inn"]') : null;
  var innCardSmall   = innCard ? innCard.querySelector('small') : null;

  /* ── panel helpers ───────────────────────────────────────────────────────── */
  function showPanel(key) {
    Object.keys(panels).forEach(function (k) {
      if (panels[k]) panels[k].hidden = (k !== key);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setStepNote(text) {
    if (stepNote) stepNote.textContent = text;
  }

  function updateStepIndicators(active) {
    stepIndicators.forEach(function (el, i) {
      var n = i + 1;
      el.classList.toggle('crm-wizard-step-active', n === active);
      el.classList.toggle('crm-wizard-step-done',   n < active);
      if (n < active) el.classList.remove('crm-wizard-step-active');
    });
  }

  /* ── error helpers ───────────────────────────────────────────────────────── */
  function showError(id, msg) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
  }

  function clearError(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = '';
    el.hidden = true;
  }

  /* ── INN card disabled sync ──────────────────────────────────────────────── */
  function syncInnCard() {
    if (!innCard || !typeGrid) return;
    var selRadio = typeGrid.querySelector('.crm-option-card.is-selected input[type="radio"]');
    var flSel    = selRadio && selRadio.value === 'fl';

    innCard.classList.toggle('is-disabled', flSel);

    if (innCardSmall) {
      innCardSmall.textContent = flSel
        ? 'Недоступно для ФЛ.'
        : 'Автозаполнение demo-данными по ИНН.';
    }

    if (flSel && innCard.classList.contains('is-selected')) {
      innCard.classList.remove('is-selected');
      var r = innCard.querySelector('input[type="radio"]');
      if (r) r.checked = false;
    }
  }

  /* ── INN demo prefill data ───────────────────────────────────────────────── */
  var INN_FIELDS = {
    'ul-client-name':           'ООО "ТехноИмпульс"',
    'ul-full-name':             'Общество с ограниченной ответственностью "ТехноИмпульс"',
    'ul-english-name':          'TechnoImpulse LLC',
    'ul-english-full-name':     'TechnoImpulse Limited Liability Company',
    'ul-kpp':                   '770101001',
    'ul-ogrn':                  '1207700123456',
    'ul-reg-date':              '2020-04-15',
    'ul-reg-authority':         'Межрайонная ИФНС России № 46 по г. Москве',
    'ul-auth-capital':          '1 000 000',
    'ul-registrar-name':        'АО "Реестр"',
    'ul-tax-name':              'ИФНС России № 1 по г. Москве',
    'ul-tax-code':              '7701',
    'ul-fss-number':            '7701001234',
    'ul-pfr-number':            '087-001-123456',
    'ul-phone':                 '+7 (495) 123-45-67',
    'ul-email':                 'info@technoimpulse.demo',
    'ul-address':               'г. Москва, ул. Летниковская, д. 10, стр. 4',
    'ul-beneficiary':           'Иванов Игорь Сергеевич',
    'ul-auth-persons':          'Генеральный директор Петров Пётр Петрович',
    'ul-okato':                 '45286585000',
    'ul-oktmo':                 '45376000000',
    'ul-okpo':                  '12345678',
    'ul-okfs':                  '16',
    'ul-okogu':                 '4210014',
    'ul-rep-full-name':         'Петров Пётр Петрович',
    'ul-rep-position':          'Генеральный директор',
    'ul-rep-birth-date':        '1985-08-12',
    'ul-rep-doc-series':        '4510',
    'ul-rep-doc-number':        '123456',
    'ul-rep-doc-issued-by':     'ОВД Тверского района г. Москвы',
    'ul-rep-doc-issued-at':     '2015-06-20',
    'ul-rep-doc-division-code': '770-001',
  };

  var INN_RADIOS = {
    'ul-parent-company':         'no',
    'ul-qualified-investor':     'no',
    'ul-cash-permission':        'yes',
    'ul-securities-permission':  'yes',
    'ul-residency':              'yes',
  };

  function fillInnDemo(innValue) {
    INN_FIELDS['ul-inn'] = innValue;

    Object.keys(INN_FIELDS).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = INN_FIELDS[id];
    });

    Object.keys(INN_RADIOS).forEach(function (name) {
      var val = INN_RADIOS[name];
      var radios = document.querySelectorAll(
        'input[type="radio"][name="' + name + '"]'
      );
      radios.forEach(function (radio) {
        radio.checked = radio.value === val;
        var lbl = radio.closest('label');
        if (lbl && lbl.closest('.crm-binary-control')) {
          lbl.classList.toggle('is-active', radio.checked);
        }
      });
    });
  }

  function clearUlForm() {
    var p = panels.step2ul;
    if (!p) return;
    p.querySelectorAll('input[type="text"], input[type="date"], input[type="tel"], input[type="email"]').forEach(function (i) { i.value = ''; });
    p.querySelectorAll('input[type="radio"]').forEach(function (r) { r.checked = false; });
    p.querySelectorAll('.crm-binary-control label').forEach(function (l) { l.classList.remove('is-active'); });
    p.querySelectorAll('select').forEach(function (s) { s.selectedIndex = 0; });
  }

  /* ── result panel update ─────────────────────────────────────────────────── */
  function updateResult() {
    var typeLabel = subjectType === 'fl' ? 'Физическое лицо' : 'Юридическое лицо';
    var name = '—';

    if (subjectType === 'fl') {
      var ln = document.getElementById('fl-last-name');
      var fn = document.getElementById('fl-first-name');
      var mn = document.getElementById('fl-middle-name');
      var parts = [
        ln ? ln.value.trim() : '',
        fn ? fn.value.trim() : '',
        mn ? mn.value.trim() : ''
      ].filter(Boolean);
      if (parts.length) name = parts.join(' ');
    } else {
      var cn = document.getElementById('ul-client-name');
      if (cn && cn.value.trim()) name = cn.value.trim();
    }

    var ts   = Date.now();
    var code = 'INV-' + String(ts).slice(-6);
    var now  = new Date();
    var date = now.toLocaleDateString('ru-RU');
    var id   = 'c-' + ts;

    var set = function (elId, text) {
      var el = document.getElementById(elId);
      if (el) el.textContent = text;
    };

    set('result-type-label', typeLabel);
    set('result-name',       name);
    set('result-code',       code);
    set('result-date',       date);
    set('result-id',         'ID клиента: ' + id);
  }

  /* ── step navigation ─────────────────────────────────────────────────────── */
  function goStep1() {
    currentStep = 1;
    showPanel('step1');
    setStepNote('Шаг 1 из 3 · Выбор типа и способа');
    updateStepIndicators(1);
  }

  function goStep2(note) {
    currentStep = 2;
    updateStepIndicators(2);

    var isInnLookup = subjectType === 'ul' && regMethod === 'inn' && !innResolved;

    if (isInnLookup) {
      showPanel('step2inn');
      setStepNote('Шаг 2 из 3 · Поиск по ИНН');
    } else if (subjectType === 'fl') {
      showPanel('step2fl');
      setStepNote('Шаг 2 из 3 · Данные клиента — Физическое лицо');
    } else {
      showPanel('step2ul');
      setStepNote(note || 'Шаг 2 из 3 · Данные клиента — Юридическое лицо');
    }
  }

  function goStep3() {
    currentStep = 3;
    updateResult();
    showPanel('step3');
    setStepNote('Шаг 3 из 3 · Завершение');
    updateStepIndicators(3);
  }

  /* ── bank accounts ───────────────────────────────────────────────────────── */
  var bankCounter = 0;

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function toggleBankForm(suffix) {
    var form = document.getElementById('bank-add-form-' + suffix);
    var btn  = document.getElementById('bank-toggle-' + suffix);
    if (!form || !btn) return;
    form.hidden = !form.hidden;
    btn.textContent = form.hidden ? '+ Добавить счёт' : 'Скрыть форму счёта';
  }

  function addBankAccount(suffix) {
    var nameEl = document.getElementById('bank-name-' + suffix);
    var bikEl  = document.getElementById('bank-bik-'  + suffix);
    var accEl  = document.getElementById('bank-acc-'  + suffix);
    var caccEl = document.getElementById('bank-corr-' + suffix);
    var curEl  = document.getElementById('bank-cur-'  + suffix);
    var errId  = 'bank-err-' + suffix;

    if (!nameEl || !bikEl || !accEl || !caccEl) return;

    if (!nameEl.value.trim() || !bikEl.value.trim() ||
        !accEl.value.trim()  || !caccEl.value.trim()) {
      showError(errId, 'Заполните обязательные поля банковского счёта.');
      return;
    }

    clearError(errId);
    bankCounter++;

    var currency = curEl ? curEl.value : 'RUB';
    var isPrimary = bankCounter === 1; // first added account is primary

    var listEl  = document.getElementById('bank-list-'  + suffix);
    var emptyEl = document.getElementById('bank-empty-' + suffix);
    if (emptyEl) emptyEl.hidden = true;

    if (listEl) {
      var row = document.createElement('div');
      row.className = 'reg-bank-row';
      row.setAttribute('data-bank-id', 'ba-' + bankCounter);
      row.innerHTML =
        '<div><strong>' + esc(nameEl.value.trim()) + '</strong>'
        + ' · ' + esc(accEl.value.trim())
        + ' · ' + esc(currency)
        + (isPrimary ? '<span class="reg-bank-badge">Основной</span>' : '')
        + '</div>'
        + '<button type="button" class="reg-bank-delete"'
        + ' data-action="reg-bank-delete"'
        + ' data-suffix="' + esc(suffix) + '"'
        + ' aria-label="Удалить счёт">Удалить</button>';
      listEl.appendChild(row);
    }

    [nameEl, bikEl, accEl, caccEl].forEach(function (el) { el.value = ''; });

    var form = document.getElementById('bank-add-form-' + suffix);
    var btn  = document.getElementById('bank-toggle-'  + suffix);
    if (form) form.hidden = true;
    if (btn)  btn.textContent = '+ Добавить счёт';
  }

  function deleteBankAccount(btn) {
    var row    = btn.closest('.reg-bank-row');
    var suffix = btn.dataset.suffix;
    if (!row || !suffix) return;

    var listEl  = document.getElementById('bank-list-'  + suffix);
    var emptyEl = document.getElementById('bank-empty-' + suffix);
    if (row.parentNode) row.parentNode.removeChild(row);
    if (listEl && emptyEl && !listEl.querySelector('.reg-bank-row')) {
      emptyEl.hidden = false;
    }
  }

  /* ── INN input: digits only ──────────────────────────────────────────────── */
  var innInputEl = document.getElementById('reg-inn-input');
  if (innInputEl) {
    innInputEl.addEventListener('input', function () {
      var cur = this.selectionStart;
      this.value = this.value.replace(/\D/g, '').slice(0, 10);
      try { this.setSelectionRange(cur, cur); } catch (e) { /* ignore */ }
      clearError('reg-err-step2inn');
    });
  }

  /* ── click delegation ────────────────────────────────────────────────────── */
  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;

    /* sync INN card disabled state after any click inside the type grid */
    if (typeGrid && typeGrid.contains(target)) {
      requestAnimationFrame(syncInnCard);
    }

    /* ── step 1: Далее ─────────────────────────────────────────────────────── */
    if (target.closest('[data-action="reg-next-step1"]')) {
      clearError('reg-err-step1');
      var selType   = typeGrid   && typeGrid.querySelector('.crm-option-card.is-selected input[type="radio"]');
      var selMethod = methodGrid && methodGrid.querySelector('.crm-option-card.is-selected input[type="radio"]');

      if (!selType || !selMethod) {
        showError('reg-err-step1', 'Выберите тип субъекта и способ регистрации.');
        return;
      }
      if (selType.value === 'fl' && selMethod.value === 'inn') {
        showError('reg-err-step1', 'Загрузка по ИНН недоступна для физических лиц.');
        return;
      }

      subjectType = selType.value;
      regMethod   = selMethod.value;
      innResolved = false;

      if (subjectType === 'ul') clearUlForm();
      goStep2();
      return;
    }

    /* ── step 2-INN: Далее ─────────────────────────────────────────────────── */
    if (target.closest('[data-action="reg-resolve-inn"]')) {
      clearError('reg-err-step2inn');
      var innVal = innInputEl ? innInputEl.value.replace(/\D/g, '') : '';

      if (!innVal) {
        showError('reg-err-step2inn', 'Введите ИНН юридического лица.');
        return;
      }
      if (innVal.length !== 10) {
        showError('reg-err-step2inn', 'ИНН юридического лица должен содержать 10 цифр.');
        return;
      }

      innResolved = true;
      fillInnDemo(innVal);
      showPanel('step2ul');
      setStepNote('Шаг 2 из 3 · Проверьте и дополните данные');
      return;
    }

    /* ── step 2-FL: Сохранить ──────────────────────────────────────────────── */
    if (target.closest('[data-action="reg-save-fl"]')) {
      goStep3();
      return;
    }

    /* ── step 2-UL: Сохранить ──────────────────────────────────────────────── */
    if (target.closest('[data-action="reg-save-ul"]')) {
      goStep3();
      return;
    }

    /* ── step 2: Назад ─────────────────────────────────────────────────────── */
    if (target.closest('[data-action="reg-back-step2"]')) {
      clearError('reg-err-step2inn');
      clearError('reg-err-step2fl');
      clearError('reg-err-step2ul');

      if (subjectType === 'ul' && regMethod === 'inn' && innResolved) {
        innResolved = false;
        showPanel('step2inn');
        setStepNote('Шаг 2 из 3 · Поиск по ИНН');
      } else {
        goStep1();
      }
      return;
    }

    /* ── step 3: Завершить ─────────────────────────────────────────────────── */
    if (target.closest('[data-action="reg-finish"]')) {
      window.location.href = 'subjects.html';
      return;
    }

    /* ── step 3: Открыть карточку ──────────────────────────────────────────── */
    if (target.closest('[data-action="reg-open-card"]')) {
      window.location.href = 'subject-card.html';
      return;
    }

    /* ── bank: toggle add form ─────────────────────────────────────────────── */
    if (target.closest('[data-action="reg-toggle-bank"]')) {
      var sfx = target.closest('[data-action="reg-toggle-bank"]').dataset.suffix;
      toggleBankForm(sfx);
      return;
    }

    /* ── bank: add account ─────────────────────────────────────────────────── */
    if (target.closest('[data-action="reg-add-bank"]')) {
      var sfx2 = target.closest('[data-action="reg-add-bank"]').dataset.suffix;
      addBankAccount(sfx2);
      return;
    }

    /* ── bank: delete account ──────────────────────────────────────────────── */
    if (target.closest('[data-action="reg-bank-delete"]')) {
      deleteBankAccount(target.closest('[data-action="reg-bank-delete"]'));
      return;
    }
  });

  /* ── FL residency toggle: RF resident gets FIAS buttons, non-resident edits manually ── */
  (function () {
    var fiasBlock   = document.getElementById('fl-address-fias');
    var manualBlock = document.getElementById('fl-address-manual');

    function applyResidency(value) {
      if (!fiasBlock) return;
      var isRf = value === 'rf';
      fiasBlock.hidden = false;
      if (manualBlock) manualBlock.hidden = true;

      fiasBlock.querySelectorAll('.crm-btn-fill-address[data-address-target]').forEach(function (btn) {
        var target = btn.getAttribute('data-address-target');
        var sameCheck = fiasBlock.querySelector('[data-address-same-as][data-address-target="' + target + '"]');
        btn.hidden = !isRf || !!(sameCheck && sameCheck.checked);
      });

      if (!isRf) {
        fiasBlock.querySelectorAll('[data-fias-panel]').forEach(function (panel) {
          panel.hidden = true;
        });
      }
    }

    document.querySelectorAll('input[type="radio"][name="fl-residency"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        if (radio.checked) applyResidency(radio.value);
      });
    });

    // Apply initial state (default: RF resident — FIAS buttons visible)
    var checked = document.querySelector('input[type="radio"][name="fl-residency"]:checked');
    applyResidency(checked ? checked.value : 'rf');
  }());

  /* ── init ────────────────────────────────────────────────────────────────── */
  goStep1();
  syncInnCard();
})();
