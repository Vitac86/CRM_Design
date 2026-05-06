// Document Wizard — static demo for additional client documents.
// Scoped to body[data-page="document-wizard"].
// Mirrors the statement export approach in crm-static.js; does not modify it.

(function () {
  'use strict';

  if (!document.body || document.body.dataset.page !== 'document-wizard') return;

  // ── Static subject registry ────────────────────────────────────────────────
  // Static demo data. UMI.CMS should replace with server-side subject lookup.
  var SUBJECTS = {
    'c-006': {
      id: 'c-006',
      kind: 'individual',
      displayName: 'Ковалёв Даниил Олегович',
      inn: '773412345678',
      code: 'КОВ-2024-001',
      email: 'd.kovalev@mail.ru',
      phone: '+7 (916) 123-45-67',
      birthDate: '15.08.1985',
      birthPlace: 'г. Москва',
      citizenship: 'Российская Федерация',
      snils: '123-456-789 00',
      idType: 'Паспорт гражданина Российской Федерации',
      passportSeries: '4512',
      passportNumber: '345678',
      passportIssuedBy: 'ГУ МВД России по г. Москве',
      passportIssueDate: '22.04.2016',
      passportDeptCode: '770-001',
      registrationAddress: 'г. Москва, ул. Примерная, д. 10, кв. 25',
      postalAddress: 'г. Москва, ул. Примерная, д. 10, кв. 25'
    },
    'c-011': {
      id: 'c-011',
      kind: 'company',
      displayName: 'АО «Восток Майнинг Системс»',
      inn: '7704132901',
      code: 'ВМС-2024-001',
      email: 'office@vms.ru',
      phone: '+7 (495) 123-45-67',
      shortName: 'АО «ВМС»',
      fullLegalName: 'Акционерное общество «Восток Майнинг Системс»',
      kpp: '770401001',
      ogrn: '1027700132505',
      registrationDate: '15.03.2004',
      registrationAuthority: 'МИФНС России № 46 по г. Москве',
      legalAddress: 'г. Москва, ул. Тверская, д. 16, стр. 1',
      postalAddress: 'г. Москва, ул. Тверская, д. 16, стр. 1',
      repFullName: 'Воронцов Игорь Степанович',
      repPosition: 'Генеральный директор',
      repAuthority: 'Устав'
    }
  };

  // ── Document configuration ─────────────────────────────────────────────────
  var DOCUMENTS = [
    {
      id: 'anketa-fl',
      title: 'Анкета клиента (ФЛ)',
      description: 'Анкета физического лица — клиента ООО «Инвестика»',
      appliesTo: ['individual'],
      templateUrl: '../assets/document-templates/anketa-fl.html',
      outputFilename: 'anketa-fl.pdf',
      fields: [
        {
          key: 'extra-document-date',
          label: 'Дата составления анкеты',
          type: 'date',
          required: true
        },
        {
          key: 'extra-employment-status',
          label: 'Статус занятости',
          type: 'select',
          required: true,
          options: [
            { value: 'Работник по найму', label: 'Работник по найму' },
            { value: 'Индивидуальный предприниматель', label: 'Индивидуальный предприниматель' },
            { value: 'Самозанятый', label: 'Самозанятый' },
            { value: 'Пенсионер', label: 'Пенсионер' },
            { value: 'Студент', label: 'Студент' },
            { value: 'Безработный', label: 'Безработный' },
            { value: 'Иное', label: 'Иное' }
          ]
        },
        {
          key: 'extra-income-source',
          label: 'Основной источник дохода',
          type: 'text',
          required: false,
          placeholder: 'Например: заработная плата'
        }
      ]
    },
    {
      id: 'anketa-yul',
      title: 'Анкета клиента (ЮЛ)',
      description: 'Анкета юридического лица — клиента ООО «Инвестика»',
      appliesTo: ['company'],
      templateUrl: '../assets/document-templates/anketa-yul.html',
      outputFilename: 'anketa-yul.pdf',
      fields: [
        {
          key: 'extra-document-date',
          label: 'Дата составления анкеты',
          type: 'date',
          required: true
        }
      ]
    },
    {
      id: 'qualification-request-fl',
      title: 'Заявление о признании ФЛ квал. инвестором',
      description: 'Заявление физического лица о признании квалифицированным инвестором',
      appliesTo: ['individual'],
      templateUrl: '../assets/document-templates/qualification-request-fl.html',
      outputFilename: 'qualification-request-fl.pdf',
      fields: [
        {
          key: 'extra-document-date',
          label: 'Дата заявления',
          type: 'date',
          required: true
        },
        {
          key: 'extra-supporting-docs-1',
          label: 'Приложенный документ 1',
          type: 'text',
          required: false,
          placeholder: 'Например: выписка из брокерского счёта'
        },
        {
          key: 'extra-supporting-docs-2',
          label: 'Приложенный документ 2',
          type: 'text',
          required: false,
          placeholder: 'Например: справка о составе и стоимости активов'
        },
        {
          key: 'extra-supporting-docs-3',
          label: 'Приложенный документ 3',
          type: 'text',
          required: false,
          placeholder: 'Например: диплом / аттестат'
        }
      ],
      checkFields: [
        { key: 'qual-fl-criteria-1', label: 'Активы и вклады ≥ 6 млн руб.' },
        { key: 'qual-fl-criteria-2', label: 'Опыт работы в финансовой организации ≥ 3 лет' },
        { key: 'qual-fl-criteria-3', label: 'Квалификационный аттестат / высшее экономическое образование' },
        { key: 'qual-fl-criteria-4', label: 'Сделки ≥ 10 в квартал в течение 4 кварталов, объём ≥ 6 млн руб.' }
      ]
    },
    {
      id: 'qualification-request-yul',
      title: 'Заявление о признании ЮЛ квал. инвестором',
      description: 'Заявление юридического лица о признании квалифицированным инвестором',
      appliesTo: ['company'],
      templateUrl: '../assets/document-templates/qualification-request-yul.html',
      outputFilename: 'qualification-request-yul.pdf',
      fields: [
        {
          key: 'extra-document-date',
          label: 'Дата заявления',
          type: 'date',
          required: true
        },
        {
          key: 'extra-supporting-docs-1',
          label: 'Приложенный документ 1',
          type: 'text',
          required: false,
          placeholder: 'Например: бухгалтерский баланс'
        },
        {
          key: 'extra-supporting-docs-2',
          label: 'Приложенный документ 2',
          type: 'text',
          required: false,
          placeholder: 'Например: отчёт о финансовых результатах'
        },
        {
          key: 'extra-supporting-docs-3',
          label: 'Приложенный документ 3',
          type: 'text',
          required: false,
          placeholder: ''
        }
      ],
      checkFields: [
        { key: 'qual-yul-criteria-1', label: 'Собственные средства (капитал) ≥ 200 млн руб.' },
        { key: 'qual-yul-criteria-2', label: 'Выручка ≥ 2 млрд руб. (по годовой отчётности)' },
        { key: 'qual-yul-criteria-3', label: 'Активы ≥ 2 млрд руб. (по годовой отчётности)' },
        { key: 'qual-yul-criteria-4', label: 'Организация является профессиональным участником РЦБ' }
      ]
    },
    {
      id: 'qualification-notice',
      title: 'Уведомление о признании квал. инвестором',
      description: 'Уведомление о признании лица квалифицированным инвестором',
      appliesTo: ['individual', 'company'],
      templateUrl: '../assets/document-templates/qualification-notice.html',
      outputFilename: 'qualification-notice.pdf',
      fields: [
        {
          key: 'extra-document-date',
          label: 'Дата уведомления',
          type: 'date',
          required: true
        },
        {
          key: 'extra-decision-number',
          label: 'Номер решения о признании',
          type: 'text',
          required: true,
          placeholder: 'Например: 001/2024'
        },
        {
          key: 'extra-decision-date',
          label: 'Дата решения',
          type: 'date',
          required: true
        },
        {
          key: 'extra-qualified-from',
          label: 'Квалифицирован(а) с',
          type: 'date',
          required: true
        }
      ],
      checkFields: [
        { key: 'qual-criteria-assets',       label: 'Активы и вклады ≥ 6 млн руб.' },
        { key: 'qual-criteria-experience',   label: 'Опыт работы в финансовой организации' },
        { key: 'qual-criteria-education',    label: 'Квалификационный аттестат / образование' },
        { key: 'qual-criteria-transactions', label: 'Сделки ≥ 10 в квартал / объём ≥ 6 млн руб.' },
        { key: 'qual-criteria-capital',      label: 'Собственные средства ≥ 200 млн руб. (для ЮЛ)' },
        { key: 'qual-criteria-revenue',      label: 'Выручка или активы ≥ 2 млрд руб. (для ЮЛ)' }
      ]
    },
    {
      id: 'account-opening-notice',
      title: 'Уведомление об открытии счёта',
      description: 'Уведомление об открытии брокерского-депозитарного счёта',
      appliesTo: ['individual', 'company'],
      templateUrl: '../assets/document-templates/account-opening-notice.html',
      outputFilename: 'account-opening-notice.pdf',
      fields: [
        {
          key: 'extra-document-date',
          label: 'Дата уведомления',
          type: 'date',
          required: true
        },
        {
          key: 'extra-account-opening-date',
          label: 'Дата открытия счетов',
          type: 'date',
          required: true
        },
        {
          key: 'extra-brokerage-account',
          label: 'Номер брокерского счёта',
          type: 'text',
          required: true,
          placeholder: 'Например: БС-2024-001'
        },
        {
          key: 'extra-depo-account',
          label: 'Номер счёта депо',
          type: 'text',
          required: true,
          placeholder: 'Например: Д-2024-001'
        }
      ]
    },
    {
      id: 'code-word-request',
      title: 'Заявление об установлении / замене кодового слова',
      description: 'Заявление об установлении или изменении кодового слова для идентификации клиента',
      appliesTo: ['individual', 'company'],
      templateUrl: '../assets/document-templates/code-word-request.html',
      outputFilename: 'code-word-request.pdf',
      fields: [
        {
          key: 'extra-document-date',
          label: 'Дата заявления',
          type: 'date',
          required: true
        },
        {
          key: 'extra-code-word-operation',
          label: 'Вид операции',
          type: 'select',
          required: true,
          options: [
            { value: 'установление', label: 'Установление кодового слова' },
            { value: 'изменение', label: 'Изменение кодового слова' }
          ]
        },
        {
          key: 'extra-new-code-word',
          label: 'Новое кодовое слово',
          type: 'text',
          required: true,
          placeholder: 'Введите кодовое слово'
        }
      ]
    }
  ];

  // ── HTML escaping helpers ─────────────────────────────────────────────────

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escAttr(s) {
    return String(s).replace(/"/g, '&quot;');
  }

  // ── Date formatting ───────────────────────────────────────────────────────

  // Convert ISO date string YYYY-MM-DD → DD.MM.YYYY
  function isoToRu(val) {
    if (!val) return val;
    var m = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? (m[3] + '.' + m[2] + '.' + m[1]) : val;
  }

  // ── Build field map from subject + extra form values ─────────────────────

  function buildFields(subject, extraValues) {
    var f = {};

    // Common
    f['client-full-name'] = subject.displayName;
    f['client-inn']       = subject.inn;
    f['client-code']      = subject.code;
    f['client-email']     = subject.email;
    f['client-phone']     = subject.phone;
    f['signature-name']   = subject.displayName;

    if (subject.kind === 'individual') {
      f['client-birth-date']          = subject.birthDate;
      f['client-birth-place']         = subject.birthPlace;
      f['client-citizenship']         = subject.citizenship;
      f['client-snils']               = subject.snils;
      f['client-id-type']             = subject.idType;
      f['client-passport-series']     = subject.passportSeries;
      f['client-passport-number']     = subject.passportNumber;
      f['client-passport-issued-by']  = subject.passportIssuedBy;
      f['client-passport-issue-date'] = subject.passportIssueDate;
      f['client-passport-dept-code']  = subject.passportDeptCode;
      f['client-registration-address']= subject.registrationAddress;
      f['client-postal-address']      = subject.postalAddress;
    } else {
      f['client-short-name']            = subject.shortName;
      f['client-full-legal-name']       = subject.fullLegalName;
      f['client-kpp']                   = subject.kpp;
      f['client-ogrn']                  = subject.ogrn;
      f['client-registration-date']     = subject.registrationDate;
      f['client-registration-authority']= subject.registrationAuthority;
      f['client-legal-address']         = subject.legalAddress;
      f['client-postal-address']        = subject.postalAddress;
      f['client-rep-full-name']         = subject.repFullName;
      f['client-rep-position']          = subject.repPosition;
      f['client-rep-authority']         = subject.repAuthority;
      f['signature-name']               = subject.repFullName;
    }

    // Extra wizard fields (date values converted to Russian format)
    Object.keys(extraValues).forEach(function (key) {
      f[key] = isoToRu(extraValues[key]);
    });

    return f;
  }

  // ── Build check map ──────────────────────────────────────────────────────

  function buildChecks(doc, checkValues) {
    var checks = {};

    // Initialise from doc config checkFields defaults (all false)
    (doc.checkFields || []).forEach(function (cf) {
      checks[cf.key] = false;
    });

    // Apply wizard check values
    Object.keys(checkValues).forEach(function (key) {
      checks[key] = !!checkValues[key];
    });

    // Code-word operation: derive checkbox states from select value
    if (doc.id === 'code-word-request') {
      var op = (checkValues['extra-code-word-operation'] || '').toLowerCase();
      checks['code-word-establish'] = op.indexOf('установление') !== -1;
      checks['code-word-change']    = op.indexOf('изменение')    !== -1;
    }

    // Anketa tax residency defaults (static: Russia = yes, FATCA = no)
    if (doc.id === 'anketa-fl' || doc.id === 'anketa-yul') {
      if (!Object.prototype.hasOwnProperty.call(checks, 'tax-resident-rf-yes'))  checks['tax-resident-rf-yes'] = true;
      if (!Object.prototype.hasOwnProperty.call(checks, 'tax-resident-rf-no'))   checks['tax-resident-rf-no']  = false;
      if (!Object.prototype.hasOwnProperty.call(checks, 'fatca-yes'))            checks['fatca-yes']           = false;
      if (!Object.prototype.hasOwnProperty.call(checks, 'fatca-no'))             checks['fatca-no']            = true;
    }

    return checks;
  }

  // ── Fill template document ───────────────────────────────────────────────

  function fillTemplateDoc(tmplDoc, fields, checks) {
    tmplDoc.querySelectorAll('[data-doc-field]').forEach(function (el) {
      var key = el.getAttribute('data-doc-field');
      if (Object.prototype.hasOwnProperty.call(fields, key)) {
        el.textContent = fields[key];
      }
    });

    tmplDoc.querySelectorAll('[data-doc-check]').forEach(function (el) {
      var key = el.getAttribute('data-doc-check');
      if (Object.prototype.hasOwnProperty.call(checks, key)) {
        el.classList.toggle('is-checked', !!checks[key]);
      }
    });
  }

  // ── Open filled document in new window and trigger print ─────────────────

  function openFilledHtml(filledHtml) {
    var win = window.open('', '_blank');
    if (!win) {
      alert('Не удалось открыть новую вкладку. Разрешите всплывающие окна для просмотра документа.');
      return;
    }

    win.document.open();
    win.document.write(filledHtml);
    win.document.close();

    var links = Array.from(win.document.querySelectorAll('link[rel="stylesheet"]'));

    function waitForLink(link) {
      return new Promise(function (resolve) {
        if (link.sheet) { resolve(); return; }
        link.addEventListener('load',  resolve, { once: true });
        link.addEventListener('error', resolve, { once: true });
        setTimeout(resolve, 700);
      });
    }

    Promise.all(links.map(waitForLink)).then(function () {
      setTimeout(function () {
        try {
          win.focus();
          win.print();
        } catch (e) {
          console.error('Document print failed:', e);
        }
      }, 150);
    });
  }

  // ── Step indicator ────────────────────────────────────────────────────────

  function setActiveStep(step) {
    document.querySelectorAll('.crm-wizard-step').forEach(function (el, idx) {
      el.classList.toggle('crm-wizard-step-active', (idx + 1) === step);
    });
  }

  // ── Render subject summary ────────────────────────────────────────────────

  function renderSubjectSummary(subject) {
    var nameEl   = document.getElementById('docwiz-subject-name');
    var innEl    = document.getElementById('docwiz-subject-inn');
    var codeEl   = document.getElementById('docwiz-subject-code');
    var kindEl   = document.getElementById('docwiz-subject-kind');
    var crumbEl  = document.getElementById('docwiz-breadcrumb-subject');

    if (nameEl)  nameEl.textContent  = subject.displayName;
    if (innEl)   innEl.textContent   = subject.inn;
    if (codeEl)  codeEl.textContent  = subject.code;
    if (kindEl)  kindEl.textContent  = subject.kind === 'individual' ? 'Физическое лицо' : 'Юридическое лицо';
    if (crumbEl) crumbEl.textContent = subject.displayName;
  }

  // ── Render extra fields ───────────────────────────────────────────────────

  function renderExtraFields(doc) {
    var container = document.getElementById('docwiz-extra-fields');
    if (!container) return;

    container.innerHTML = '';

    if ((!doc.fields || !doc.fields.length) && (!doc.checkFields || !doc.checkFields.length)) {
      var p = document.createElement('p');
      p.className = 'crm-docwiz-no-fields';
      p.textContent = 'Дополнительные поля не требуются.';
      container.appendChild(p);
      return;
    }

    var grid = document.createElement('div');
    grid.className = 'crm-docwiz-fields-grid';

    (doc.fields || []).forEach(function (field) {
      var wrap = document.createElement('div');
      wrap.className = 'crm-docwiz-field-wrap';

      var label = document.createElement('label');
      label.className = 'crm-document-form-label';
      label.setAttribute('for', 'docwiz-field-' + field.key);
      label.textContent = field.label + (field.required ? ' *' : '');
      wrap.appendChild(label);

      var input;
      if (field.type === 'select') {
        input = document.createElement('select');
        input.className = 'uk-select crm-input';
        var emptyOpt = document.createElement('option');
        emptyOpt.value = '';
        emptyOpt.textContent = 'Выберите…';
        input.appendChild(emptyOpt);
        (field.options || []).forEach(function (opt) {
          var o = document.createElement('option');
          o.value = opt.value;
          o.textContent = opt.label;
          input.appendChild(o);
        });
      } else if (field.type === 'textarea') {
        input = document.createElement('textarea');
        input.className = 'uk-textarea crm-input';
        input.rows = 3;
      } else {
        input = document.createElement('input');
        input.className = 'uk-input crm-input';
        input.type = field.type === 'date' ? 'date' : 'text';
        if (field.placeholder) input.placeholder = field.placeholder;
        if (field.defaultValue) input.value = field.defaultValue;
      }

      input.id = 'docwiz-field-' + field.key;
      input.setAttribute('data-field-key', field.key);
      if (field.required) input.required = true;
      wrap.appendChild(input);
      grid.appendChild(wrap);
    });

    container.appendChild(grid);

    if (doc.checkFields && doc.checkFields.length) {
      var checkGroup = document.createElement('div');
      checkGroup.className = 'crm-docwiz-check-group';

      var checkLabel = document.createElement('p');
      checkLabel.className = 'crm-document-form-label';
      checkLabel.textContent = 'Основания для признания:';
      checkGroup.appendChild(checkLabel);

      doc.checkFields.forEach(function (cf) {
        var row = document.createElement('label');
        row.className = 'crm-check-row';

        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = 'docwiz-check-' + cf.key;
        cb.setAttribute('data-check-key', cf.key);

        var span = document.createElement('span');
        span.textContent = cf.label;

        row.appendChild(cb);
        row.appendChild(span);
        checkGroup.appendChild(row);
      });

      container.appendChild(checkGroup);
    }
  }

  // ── Render document cards ─────────────────────────────────────────────────

  function renderDocCards(docs, subject) {
    var grid = document.getElementById('docwiz-doc-grid');
    if (!grid) return;

    grid.innerHTML = '';

    if (!docs.length) {
      grid.innerHTML = '<p class="crm-docwiz-no-results">Нет доступных документов для данного субъекта.</p>';
      return;
    }

    docs.forEach(function (doc) {
      var card = document.createElement('article');
      card.className = 'crm-docwiz-doc-card';
      card.setAttribute('data-doc-id', doc.id);

      card.innerHTML =
        '<div class="crm-docwiz-doc-icon" aria-hidden="true">' +
          '<span uk-icon="file-text"></span>' +
        '</div>' +
        '<div class="crm-docwiz-doc-info">' +
          '<p class="crm-docwiz-doc-title">' + escHtml(doc.title) + '</p>' +
          '<p class="crm-docwiz-doc-desc">' + escHtml(doc.description) + '</p>' +
        '</div>' +
        '<div class="crm-docwiz-doc-action">' +
          '<button class="uk-button crm-button-primary crm-button crm-docwiz-select-btn" ' +
                  'type="button" data-doc-id="' + escAttr(doc.id) + '">' +
            'Выбрать' +
          '</button>' +
        '</div>';

      grid.appendChild(card);
    });

    grid.querySelectorAll('.crm-docwiz-select-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var docId = btn.getAttribute('data-doc-id');
        var doc = docs.find(function (d) { return d.id === docId; });
        if (doc) selectDoc(doc, subject);
      });
    });
  }

  // ── Handle document selection ─────────────────────────────────────────────

  function selectDoc(doc, subject) {
    // Highlight selected card
    document.querySelectorAll('.crm-docwiz-doc-card').forEach(function (c) {
      c.classList.toggle('crm-docwiz-doc-card-selected', c.getAttribute('data-doc-id') === doc.id);
    });

    var step2     = document.getElementById('docwiz-step2');
    var step3     = document.getElementById('docwiz-step3');
    var titleEl   = document.getElementById('docwiz-selected-title');
    var subtitleEl = document.getElementById('docwiz-selected-subtitle');

    if (titleEl)    titleEl.textContent    = doc.title;
    if (subtitleEl) subtitleEl.textContent = doc.description;

    renderExtraFields(doc);

    if (step2) step2.hidden = false;
    if (step3) step3.hidden = false;

    setActiveStep(2);

    if (step2) step2.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Wire generate button (replace to remove stale listeners)
    var genBtn = document.getElementById('docwiz-generate-btn');
    if (genBtn) {
      var newGen = genBtn.cloneNode(true);
      newGen.id = 'docwiz-generate-btn';
      genBtn.parentNode.replaceChild(newGen, genBtn);
      newGen.addEventListener('click', function () { generateDoc(doc, subject); });
    }

    // Wire back button
    var backBtn = document.getElementById('docwiz-back-btn');
    if (backBtn) {
      var newBack = backBtn.cloneNode(true);
      newBack.id = 'docwiz-back-btn';
      backBtn.parentNode.replaceChild(newBack, backBtn);
      newBack.addEventListener('click', function () {
        if (step2) step2.hidden = true;
        if (step3) step3.hidden = true;
        setActiveStep(1);
        document.querySelectorAll('.crm-docwiz-doc-card').forEach(function (c) {
          c.classList.remove('crm-docwiz-doc-card-selected');
        });
      });
    }
  }

  // ── Generate document ─────────────────────────────────────────────────────

  function generateDoc(doc, subject) {
    var extraValues  = {};
    var checkValues  = {};
    var valid        = true;
    var firstInvalid = null;

    // Collect text/date/select field values
    document.querySelectorAll('#docwiz-extra-fields [data-field-key]').forEach(function (el) {
      var key = el.getAttribute('data-field-key');
      var val = el.value.trim();
      extraValues[key] = val;
      if (el.required && !val) {
        el.classList.add('crm-input-error');
        valid = false;
        if (!firstInvalid) firstInvalid = el;
      } else {
        el.classList.remove('crm-input-error');
      }
    });

    if (!valid) {
      alert('Заполните все обязательные поля (отмечены *).');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    // Collect checkbox values
    document.querySelectorAll('#docwiz-extra-fields [data-check-key]').forEach(function (el) {
      checkValues[el.getAttribute('data-check-key')] = el.checked;
    });
    // Pass select value to buildChecks for code-word operation
    if (doc.id === 'code-word-request') {
      checkValues['extra-code-word-operation'] = extraValues['extra-code-word-operation'] || '';
    }

    var allFields = buildFields(subject, extraValues);
    var allChecks = buildChecks(doc, checkValues);

    // Resolve template URL
    var templateUrl;
    try {
      templateUrl = new URL(doc.templateUrl, window.location.href).href;
    } catch (e) {
      alert('Не удалось определить URL шаблона документа.');
      return;
    }

    var genBtn = document.getElementById('docwiz-generate-btn');
    if (genBtn) {
      genBtn.disabled    = true;
      genBtn.textContent = 'Формируем…';
    }

    setActiveStep(3);

    fetch(templateUrl)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (html) {
        var parser  = new DOMParser();
        var tmplDoc = parser.parseFromString(html, 'text/html');

        fillTemplateDoc(tmplDoc, allFields, allChecks);

        // Resolve stylesheet hrefs to absolute before writing to new window
        tmplDoc.querySelectorAll('link[rel="stylesheet"][href]').forEach(function (link) {
          link.setAttribute('href', new URL(link.getAttribute('href'), templateUrl).href);
        });

        var filledHtml = '<!doctype html>\n' + tmplDoc.documentElement.outerHTML;
        openFilledHtml(filledHtml);
      })
      .catch(function (err) {
        console.error('Document generation failed:', err);
        alert('Не удалось загрузить шаблон документа. Убедитесь, что локальный HTTP-сервер запущен (python -m http.server).');
        setActiveStep(2);
      })
      .finally(function () {
        if (genBtn) {
          genBtn.disabled    = false;
          genBtn.textContent = 'Сформировать документ';
        }
      });
  }

  // ── Error display ─────────────────────────────────────────────────────────

  function showError(msg) {
    var page = document.querySelector('[data-page="document-wizard"] .crm-docwiz-shell');
    if (page) {
      page.innerHTML =
        '<div class="crm-card" style="padding:24px;color:#c0392b;">' +
          escHtml(msg) +
        '</div>';
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  function initWizard() {
    var params    = new URLSearchParams(window.location.search);
    var subjectId = params.get('subject') || 'c-011';
    var subject   = SUBJECTS[subjectId];

    if (!subject) {
      showError('Субъект «' + subjectId + '» не найден в демонстрационном реестре.');
      return;
    }

    renderSubjectSummary(subject);

    var filteredDocs = DOCUMENTS.filter(function (doc) {
      return doc.appliesTo.indexOf(subject.kind) !== -1;
    });

    renderDocCards(filteredDocs, subject);
    setActiveStep(1);
  }

  initWizard();

}());
