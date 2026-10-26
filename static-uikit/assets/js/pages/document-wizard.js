// Document Wizard — static demo for additional client documents.
// Scoped to body[data-page="document-wizard"].
// Mirrors the statement export approach in crm-static.js; does not modify it.

(function () {
  'use strict';

  var isDocumentWizardPage = document.body &&
    document.body.dataset.page === 'document-wizard';

  // ── Static subject registry ────────────────────────────────────────────────
  // Static demo data. UMI.CMS should replace with server-side subject lookup.
  var SUBJECTS = {
    'c-006': {
      id: 'c-006',
      kind: 'individual',
      displayName: 'Ковалёв Даниил Олегович',
      inn: '772201234567',
      code: 'INV-1006',
      email: 'd.kovalev@mail.ru',
      phone: '+7 (903) 215-44-89',
      birthDate: '15.03.1988',
      birthPlace: 'г. Москва',
      citizenship: 'Россия',
      snils: '123-456-789 01',
      idType: 'Паспорт РФ',
      passportSeries: '4510',
      passportNumber: '234567',
      passportIssuedBy: 'ОВД района Пресненский г. Москвы',
      passportIssueDate: '20.04.2008',
      passportDeptCode: '770-001',
      registrationAddress: '125009, Россия, г. Москва, ул. Тверская, д. 14, кв. 38',
      postalAddress: '125009, г. Москва, ул. Тверская, д. 14, кв. 38',
      qualificationStatus: 'Неквалифицированный',
  // Bank requisites, per client and per currency. Static demo data standing in
  // for `Front Реквизиты`: every field below has an exact UMI name (see
  // docs/umi-variable-registry.md and the mapping in
  // document-wizard/order-forms-model.js), and a backend replaces this array
  // with the real record without the payout form changing.
  //
  //   primary   umi.requisites.osnovnoj_rekvizit — the card's default record
  //
  // A rouble route has no intermediary bank, so `correspondentSwift` and
  // `correspondentBankName` are empty on it by nature rather than by omission;
  // `correspondentAccount` is the recipient bank's own к/с and is always there.
      bankRequisites: [
        {
          id: 'req-fl-rub',
          currency: 'RUB',
          primary: true,
          recipient: 'Ковалёв Даниил Олегович',
          bankName: 'ПАО Сбербанк, г. Москва',
          bic: '044525225',
          correspondentSwift: '',
          correspondentBankName: '',
          correspondentAccount: '30101810400000000225',
          account: '40817810500000078901',
          inn: '772201234567',
          personalAccount: '',
          notation: ''
        }
      ]
    },
    'c-011': {
      id: 'c-011',
      kind: 'company',
      displayName: 'АО «Восток Майнинг Системс»',
      inn: '2721123456',
      code: 'INV-1011',
      email: 'office@vms.ru',
      phone: '+7 (495) 900-22-11',
      shortName: 'АО «Восток Майнинг Системс»',
      fullLegalName: 'АО «Восток Майнинг Системс» (полное наименование)',
      englishName: 'АО Восток Майнинг Системс',
      legalForm: 'Акционерное общество',
      kpp: '771011001',
      ogrn: '1217700011256',
      registrationDate: '18.01.2021',
      registrationAuthority: 'Межрайонная ИФНС России №46 по г. Москве',
      legalAddress: '101000, Россия, Хабаровск, г. Хабаровск, ул. Муравьёва-Амурского, д. 25',
      postalAddress: '101000, Россия, Хабаровск, г. Хабаровск, ул. Муравьёва-Амурского, д. 25',
      website: 'www.vostokms.ru',
      charterCapital: '300 000 000 ₽',
      taxStatus: 'Плательщик налога на прибыль (ОСНО)',
      repFullName: 'ЗАО «Вектор Данных»',
      repPosition: 'Генеральный директор',
      repAuthority: 'Устав общества',
      qualificationStatus: 'Квалифицированный',
  // Bank requisites, per client and per currency. Static demo data standing in
  // for `Front Реквизиты`: every field below has an exact UMI name (see
  // docs/umi-variable-registry.md and the mapping in
  // document-wizard/order-forms-model.js), and a backend replaces this array
  // with the real record without the payout form changing.
  //
  //   primary   umi.requisites.osnovnoj_rekvizit — the card's default record
  //
  // A rouble route has no intermediary bank, so `correspondentSwift` and
  // `correspondentBankName` are empty on it by nature rather than by omission;
  // `correspondentAccount` is the recipient bank's own к/с and is always there.
      bankRequisites: [
        {
          id: 'req-ul-rub',
          currency: 'RUB',
          primary: true,
          recipient: 'АО «Восток Майнинг Системс»',
          bankName: 'Банк ВТБ (ПАО), г. Санкт-Петербург',
          bic: '044525187',
          correspondentSwift: '',
          correspondentBankName: '',
          correspondentAccount: '30101810700000000187',
          account: '40702810100000012345',
          inn: '2721123456',
          personalAccount: '40702810100000012345',
          notation: ''
        },
        {
          id: 'req-ul-usd',
          currency: 'USD',
          primary: false,
          recipient: 'VOSTOK MINING SYSTEMS JSC',
          bankName: 'VTB BANK (PJSC), SAINT PETERSBURG',
          bic: 'VTBRRUMM',
          correspondentSwift: 'RZBAATWW',
          correspondentBankName: 'RAIFFEISEN BANK INTERNATIONAL AG, VIENNA',
          correspondentAccount: '70-55.070.229',
          account: '40702840700000012345',
          inn: '2721123456',
          personalAccount: '',
          notation: 'Charges: OUR'
        },
        {
          // A record the client has opened but not finished: the intermediary
          // bank is agreed, its account is not on file yet. A payout in EURO
          // is therefore refused by name rather than printed half-filled —
          // which is the case the whole requisites check exists for.
          id: 'req-ul-eur',
          currency: 'EURO',
          primary: false,
          recipient: 'VOSTOK MINING SYSTEMS JSC',
          bankName: 'VTB BANK (PJSC), SAINT PETERSBURG',
          bic: 'VTBRRUMM',
          correspondentSwift: 'RZBAATWW',
          correspondentBankName: 'RAIFFEISEN BANK INTERNATIONAL AG, VIENNA',
          correspondentAccount: '',
          account: '40702978300000012345',
          inn: '2721123456',
          personalAccount: '',
          notation: ''
        }
      ],
      // Static demo signatories. Names/roles reuse the subject card
      // (subject-card.html → "Представители"). Future UMI integration will
      // load representatives from the subject card / backend.
      representatives: [
        {
          id: 'rep-director',
          fullName: 'Крылов Денис Олегович',
          role: 'Генеральный директор',
          authority: 'Устав общества',
          passportSeries: '4512',
          passportNumber: '345678',
          passportIssuedBy: 'ОВД района Басманный г. Москвы',
          passportIssueDate: '12.05.2015',
          registrationAddress: '101000, г. Москва, ул. Мясницкая, д. 10'
        },
        {
          id: 'rep-attorney',
          fullName: 'Соколова Мария Владимировна',
          role: 'Представитель по доверенности',
          authority: 'Доверенность № 44/25',
          passportSeries: '4520',
          passportNumber: '876543',
          passportIssuedBy: 'ГУ МВД России по г. Москве',
          passportIssueDate: '03.09.2018',
          registrationAddress: '119019, г. Москва, ул. Новый Арбат, д. 7'
        }
      ]
    }
  };

  // ── Local PDF generation config ────────────────────────────────────────────
  // Generated client-facing files are flattened: field appearances are baked in
  // (with the embedded Cyrillic font) so values render identically in every PDF
  // viewer and the document becomes final/non-editable. Set to false only for a
  // template that needs to stay editable after generation.
  var PDF_FLATTEN_FORM = true;

  // Local Unicode/Cyrillic-capable font embedded into generated PDFs so filled
  // AcroForm values render in every viewer (the 14 standard PDF fonts are
  // WinAnsi-only and cannot draw Cyrillic). Served locally — never from a CDN.
  var PDF_FONT_URL = '../assets/fonts/pdf/Inter-Regular.ttf';

  // Optional internal upload endpoint. When empty, the wizard NEVER uploads:
  // PDFs are generated locally and offered as a download link only.
  var DOCUMENT_UPLOAD_ENDPOINT =
    window.CRM_DOCUMENT_UPLOAD_ENDPOINT ||
    (document.body && document.body.getAttribute('data-document-upload-endpoint')) ||
    '';

  // Representative / signatory selector for legal-entity subjects. The notifications
  // confirmation page needs a physical person's details; for companies that person
  // is a representative chosen from the subject's representative records (see
  // subject.representatives and getSelectedRepresentative).
  var REPRESENTATIVE_FIELD = {
    key: 'extra-representative-id',
    label: 'Представитель / подписант',
    type: 'select',
    required: true,
    optionsFrom: 'subject.representatives'
  };

  // Appendix 1В prints this role beside the signature line, so another
  // representative type would contradict the unmodified source wording.
  var GENERAL_DIRECTOR_REPRESENTATIVE_FIELD = {
    key: 'extra-representative-id',
    label: 'Генеральный директор / подписант',
    type: 'select',
    required: true,
    optionsFrom: 'subject.representatives',
    representativeRole: 'Генеральный директор'
  };

  // ── Order-form branch conditions ──────────────────────────────────────────
  //
  // Приложение 7 is three forms in one file and, inside the trade form, four
  // markets whose instrument blocks are mutually exclusive. Naming the
  // conditions once keeps every field pointing at the same rule, and keeps the
  // rule readable: the security block belongs to the фондовый рынок and to an
  // внебиржевая ценная бумага, and to nothing else.
  //
  // Each branch condition re-states «this is a trade order». A hidden control
  // keeps its DOM value, so a market chosen before the order type was switched
  // must not go on showing its instrument block.
  var ORDER_TRADE = { source: 'extra.extra-order-type', equals: 'trade' };
  var ORDER_TRANSFER = { source: 'extra.extra-order-type', equals: 'transfer' };
  var ORDER_WITHDRAWAL = { source: 'extra.extra-order-type', equals: 'withdrawal' };

  var ORDER_SECURITY_BRANCH = {
    allOf: [ORDER_TRADE, { anyOf: [
      { source: 'extra.extra-order-market', equals: 'stock' },
      { allOf: [
        { source: 'extra.extra-order-market', equals: 'otc' },
        { source: 'extra.extra-otc-instrument-type', equals: 'security' }
      ] }
    ] }]
  };
  var ORDER_FX_BRANCH = {
    allOf: [ORDER_TRADE, { anyOf: [
      { source: 'extra.extra-order-market', equals: 'currency' },
      { allOf: [
        { source: 'extra.extra-order-market', equals: 'otc' },
        { source: 'extra.extra-otc-instrument-type', equals: 'currency' }
      ] }
    ] }]
  };
  // Срочный рынок only. OTC never offers a derivative.
  var ORDER_DERIVATIVE_BRANCH = {
    allOf: [ORDER_TRADE, { source: 'extra.extra-order-market', equals: 'derivatives' }]
  };

  // A price is entered only on a limit order; a market order prints «Рыночная».
  var ORDER_LIMIT = { source: 'extra.extra-order-kind', equals: 'limit' };
  var ORDER_SECURITY_LIMIT = { allOf: [ORDER_SECURITY_BRANCH, ORDER_LIMIT] };
  var ORDER_FX_LIMIT = { allOf: [ORDER_FX_BRANCH, ORDER_LIMIT] };
  var ORDER_DERIVATIVE_LIMIT = { allOf: [ORDER_DERIVATIVE_BRANCH, ORDER_LIMIT] };

  // Declarative dependency metadata for builder/QA consumers. The production
  // payload normalizer below remains authoritative; this describes which
  // normalized PDF sources are supplied by wizard controls so a direct
  // source-name comparison does not mislabel operational inputs as unused.
  var NORMALIZED_SOURCE_PROVIDERS = {
    extraPassThroughToField: true,
    providers: {
      'subject.citizenship': ['check.citizenship-rf', 'check.citizenship-other'],
      'extra.extra-document-date': ['field.documentDateRu'],
      'extra.extra-representative-id': [
        'field.clientFullName', 'field.passportSeries', 'field.passportNumber',
        'field.passportIssuedBy', 'field.passportIssueDate',
        'field.registrationAddress', 'field.passportSeriesNumber',
        'field.representativeFullName', 'field.representativeRole',
        'field.representativeAuthority', 'field.representativeSignerLine'
      ],
      'extra.extra-questionnaire-role': [
        'check.anketa-role-client', 'check.anketa-role-representative',
        'check.anketa-role-beneficiary', 'check.anketa-role-beneficial-owner'
      ],
      'extra.extra-questionnaire-mode': ['check.anketa-mode-first', 'check.anketa-mode-change'],
      'extra.extra-tax-residency': ['check.tax-resident-rf-yes', 'check.tax-resident-rf-no'],
      'extra.extra-foreign-taxpayer': ['check.fatca-yes', 'check.fatca-no'],
      'extra.extra-strategic-company': ['check.strategic-company-yes', 'check.strategic-company-no'],
      'extra.extra-licensed-activity': ['check.licensed-activity-yes', 'check.licensed-activity-no'],

      // Order forms: an instrument is picked once and every master-data row it
      // prints is built from that one selection, so these controls are used by
      // the PDF even though no map field names them.
      'extra.extra-security-asset-id': [
        'extra.extra-security-issuer', 'extra.extra-security-type'
      ],
      'extra.extra-fx-instrument-id': ['extra.extra-fx-instrument'],
      'extra.extra-derivative-id': [
        'extra.extra-derivative-kind', 'extra.extra-derivative-name',
        'extra.extra-derivative-strike', 'extra.extra-derivative-expiry'
      ],
      'extra.extra-order-validity-mode': ['extra.extra-order-validity'],
      'extra.extra-order-validity-date': ['extra.extra-order-validity'],
      'extra.extra-otc-instrument-type': [
        'extra.extra-security-type', 'extra.extra-fx-instrument'
      ]
    }
  };

  // Step 1/Step 2 navigation re-renders the selected document. Keep operator
  // inputs in memory for this wizard session so Back/reselect never discards a
  // legal agreement number or date the operator has already entered. Nothing
  // is written to localStorage and no value is defaulted to today.
  var wizardInputState = Object.create(null);

  // ── Document configuration ─────────────────────────────────────────────────
  var DOCUMENTS = [
    {
      // One wizard item that generates THREE PDFs from local templates.
      // Individuals enter only the signing date (identity comes from SUBJECTS);
      // legal entities additionally pick a representative/signatory (companyFields).
      id: 'brokerage-starter-package',
      title: 'Стартовый пакет брокерского договора',
      description: 'Уведомления клиента, декларация о рисках и ключевая информация о договоре.',
      category: 'Документы и заявления клиента',
      appliesTo: ['individual', 'company'],
      fields: [
        {
          key: 'extra-document-date',
          label: 'Дата подписания / подтверждения',
          type: 'date',
          required: true
        }
      ],
      // Legal-entity-only fields (appended for company subjects).
      companyFields: [REPRESENTATIVE_FIELD],
      packageDocuments: [
        {
          // Authoritative 10-page notification pack. Identity and confirmation
          // date are drawn into the original acknowledgement on pages 9–10;
          // there is no appended sheet, AcroForm or visible widget.
          id: 'client-notifications',
          title: 'Уведомления клиента',
          downloadLabel: 'Скачать уведомления',
          overlayTemplateId: 'client-notifications',
          pdfOutputFilename: 'client-notifications.pdf'
        },
        {
          id: 'risks-declaration',
          title: 'Декларация о рисках',
          downloadLabel: 'Скачать декларацию о рисках',
          pdfTemplateUrl: '../assets/document-pdf-templates/Risks.pdf',
          pdfOutputFilename: 'Risks.pdf'
          // Static declaration — no AcroForm fields; returned as-is.
        },
        {
          id: 'brokerage-key-information',
          title: 'Ключевая информация о договоре',
          downloadLabel: 'Скачать ключевую информацию',
          pdfTemplateUrl: '../assets/document-pdf-templates/brokerage-key-information.pdf',
          pdfOutputFilename: 'brokerage-key-information.pdf'
          // Static information document — no AcroForm fields; returned as-is.
        }
      ]
    },
    {
      // In-place PDF overlay. Values are drawn straight onto the pages of the
      // Word-derived template; the coordinates live in
      // assets/js/document-field-maps/accession-application-fl.js.
      // Identity, passport, address, phone and e-mail come from the subject
      // card, so the wizard only asks for the transaction-specific choices.
      id: 'accession-application-fl',
      title: 'Заявление о присоединении (ФЛ)',
      description: 'Приложение 1А к Регламенту брокерского обслуживания.',
      category: 'Документы и заявления клиента',
      appliesTo: ['individual'],
      overlayTemplateId: 'accession-application-fl',
      pdfOutputFilename: 'zayavlenie-o-prisoedinenii-fl.pdf',
      downloadLabel: 'Скачать заявление',
      checkGroupLabel: 'Отметки заявления:',
      fields: [
        {
          key: 'extra-document-date',
          label: 'Дата подписания',
          type: 'date',
          required: true
        },
        {
          key: 'depo-account-type',
          label: 'Счёт депо (п. 2)',
          type: 'select',
          options: [
            { value: '', label: 'Не открывать' },
            { value: 'owner', label: 'Владельца' },
            { value: 'nominee', label: 'Номинального держателя' },
            { value: 'trustee', label: 'Доверительного управляющего' }
          ]
        },
        {
          key: 'trading-depo-account-type',
          label: 'Торговый счёт депо (п. 2)',
          type: 'select',
          options: [
            { value: '', label: 'Не открывать' },
            { value: 'owner', label: 'Владельца' },
            { value: 'nominee', label: 'Номинального держателя' },
            { value: 'trustee', label: 'Доверительного управляющего' }
          ]
        },
        {
          key: 'report-delivery',
          label: 'Способ получения отчётов (п. 3)',
          type: 'select',
          required: true,
          options: [
            { value: 'office', label: 'В офисе ООО «Инвестика»' },
            { value: 'post', label: 'По почте заказным письмом' },
            { value: 'email', label: 'По электронной почте' },
            { value: 'edo', label: 'По системе ЭДО' }
          ]
        },
        {
          key: 'income-payout',
          label: 'Перечисление доходов по ценным бумагам (п. 6)',
          type: 'select',
          options: [
            { value: '', label: 'Не выбрано' },
            { value: 'broker-account', label: 'На специальный брокерский счёт' },
            { value: 'bank-details', label: 'На банковские реквизиты из анкеты' }
          ]
        },
        { key: 'tariff-stock', label: 'Тарифный план — фондовый рынок', type: 'text' },
        { key: 'tariff-derivatives', label: 'Тарифный план — срочный рынок', type: 'text' },
        { key: 'tariff-currency', label: 'Тарифный план — валютный рынок', type: 'text' },
        // Page 3, «Заполняется ООО «Инвестика»». The brokerage pair is the
        // client's own agreement (umi.bo_num / umi.datesign); the depository
        // pair has no UMI field that is proven to hold a printable number or
        // date, so it is typed here — see docs/umi-variable-registry.md.
        { key: 'extra-contract-number', label: 'Номер договора на брокерское обслуживание', type: 'text' },
        { key: 'extra-contract-date', label: 'Дата договора на брокерское обслуживание', type: 'date' },
        {
          key: 'extra-depository-contract',
          label: 'Номер депозитарного договора',
          type: 'text', required: true, sourceKind: 'operator-input'
        },
        {
          key: 'extra-depository-contract-date',
          label: 'Дата депозитарного договора',
          type: 'date', required: true, sourceKind: 'operator-input'
        }
      ],
      checkFields: [
        { key: 'accession-brokerage', label: 'Присоединение к Регламенту брокерского обслуживания', defaultChecked: true },
        { key: 'accession-depository', label: 'Присоединение к Депозитарному договору' },
        { key: 'depo-operator', label: 'Назначить ООО «Инвестика» оператором счёта депо' },
        { key: 'market-stock', label: 'Фондовый рынок' },
        { key: 'market-derivatives', label: 'Срочный рынок' },
        { key: 'market-currency', label: 'Валютный рынок и рынок драгоценных металлов' },
        { key: 'agreement-esignature', label: 'Соглашение об использовании электронной подписи' },
        { key: 'agreement-quik', label: 'Соглашение о праве использования ПО QUIK' }
      ]
    },
    {
      id: 'accession-application-yul',
      title: 'Заявление о присоединении (ЮЛ)',
      description: 'Приложение 1В к Регламенту брокерского обслуживания.',
      category: 'Документы и заявления клиента',
      appliesTo: ['company'],
      overlayTemplateId: 'accession-application-yul',
      pdfOutputFilename: 'zayavlenie-o-prisoedinenii-yul.pdf',
      downloadLabel: 'Скачать заявление',
      fields: [
        { key: 'extra-document-date', label: 'Дата подписания', type: 'date', required: true },
        {
          key: 'depo-account-type',
          label: 'Счёт депо (п. 2)',
          type: 'select',
          options: [
            { value: '', label: 'Не открывать' },
            { value: 'owner', label: 'Владельца' },
            { value: 'nominee', label: 'Номинального держателя' },
            { value: 'trustee', label: 'Доверительного управляющего' }
          ]
        },
        {
          key: 'trading-depo-account-type',
          label: 'Торговый счёт депо (п. 2)',
          type: 'select',
          options: [
            { value: '', label: 'Не открывать' },
            { value: 'owner', label: 'Владельца' },
            { value: 'nominee', label: 'Номинального держателя' },
            { value: 'trustee', label: 'Доверительного управляющего' }
          ]
        },
        {
          key: 'report-delivery',
          label: 'Способ получения отчётов (п. 3)',
          type: 'select',
          required: true,
          options: [
            { value: 'office', label: 'В офисе ООО «Инвестика»' },
            { value: 'post', label: 'По почте заказным письмом' },
            { value: 'email', label: 'По электронной почте' },
            { value: 'edo', label: 'По системе ЭДО' }
          ]
        },
        {
          key: 'income-payout',
          label: 'Перечисление доходов по ценным бумагам (п. 6)',
          type: 'select',
          options: [
            { value: '', label: 'Не выбрано' },
            { value: 'broker-account', label: 'На специальный брокерский счёт' },
            { value: 'bank-details', label: 'На банковские реквизиты из анкеты' }
          ]
        },
        { key: 'tariff-stock', label: 'Тарифный план — фондовый рынок', type: 'text' },
        { key: 'tariff-derivatives', label: 'Тарифный план — срочный рынок', type: 'text' },
        { key: 'tariff-currency', label: 'Тарифный план — валютный рынок', type: 'text' },
        // Page 2, «Заполняется ООО «Инвестика»» — same pairing as the ФЛ form.
        { key: 'extra-contract-number', label: 'Номер договора на брокерское обслуживание', type: 'text' },
        { key: 'extra-contract-date', label: 'Дата договора на брокерское обслуживание', type: 'date' },
        {
          key: 'extra-depository-contract',
          label: 'Номер депозитарного договора',
          type: 'text', required: true, sourceKind: 'operator-input'
        },
        {
          key: 'extra-depository-contract-date',
          label: 'Дата депозитарного договора',
          type: 'date', required: true, sourceKind: 'operator-input'
        },
        GENERAL_DIRECTOR_REPRESENTATIVE_FIELD
      ],
      checkGroupLabel: 'Отметки заявления:',
      checkFields: [
        { key: 'accession-brokerage', label: 'Присоединение к Регламенту брокерского обслуживания', defaultChecked: true },
        { key: 'accession-depository', label: 'Присоединение к Депозитарному договору' },
        { key: 'depo-operator', label: 'Назначить ООО «Инвестика» оператором счёта депо' },
        { key: 'market-stock', label: 'Фондовый рынок' },
        { key: 'market-derivatives', label: 'Срочный рынок' },
        { key: 'market-currency', label: 'Валютный рынок и рынок драгоценных металлов' },
        { key: 'agreement-esignature', label: 'Соглашение об использовании электронной подписи' },
        { key: 'agreement-quik', label: 'Соглашение о праве использования ПО QUIK' }
      ]
    },
    {
      id: 'broker-use-refusal-request',
      title: 'Отказ от права использования средств и ценных бумаг',
      description: 'Приложение 9 к Регламенту брокерского обслуживания.',
      category: 'Брокерское обслуживание',
      appliesTo: ['individual', 'company'],
      overlayTemplateId: 'broker-use-refusal-request',
      pdfOutputFilename: 'broker-use-refusal-request.pdf',
      downloadLabel: 'Скачать заявление',
      fields: [
        { key: 'extra-document-date', label: 'Дата заявления', type: 'date', required: true },
        { key: 'extra-contract-number', label: 'Номер договора', type: 'text', required: true },
        { key: 'extra-contract-date', label: 'Дата договора', type: 'date', required: true },
        { key: 'extra-account-portfolio', label: 'Счёт / портфель', type: 'text', required: true }
      ],
      companyFields: [REPRESENTATIVE_FIELD]
    },
    {
      id: 'regulation-full-refusal-notice',
      title: 'Отказ от исполнения Регламента в целом',
      description: 'Приложение 10 к Регламенту брокерского обслуживания.',
      category: 'Брокерское обслуживание',
      appliesTo: ['individual', 'company'],
      overlayTemplateId: 'regulation-full-refusal-notice',
      pdfOutputFilename: 'regulation-full-refusal-notice.pdf',
      downloadLabel: 'Скачать уведомление',
      fields: [
        { key: 'extra-document-date', label: 'Дата уведомления', type: 'date', required: true },
        { key: 'extra-contract-number', label: 'Номер договора', type: 'text', required: true },
        { key: 'extra-contract-date', label: 'Дата договора', type: 'date', required: true },
        { key: 'extra-account-portfolio', label: 'Счёт / портфель', type: 'text', required: true }
      ],
      companyFields: [REPRESENTATIVE_FIELD],
      checkGroupLabel: 'Отказаться от исполнения:',
      checkFields: [
        { key: 'full-refusal-brokerage', label: 'Регламента брокерского обслуживания' },
        { key: 'full-refusal-depository', label: 'Депозитарного договора' }
      ],
      validationRules: [
        {
          type: 'atLeastOneCheck',
          keys: ['full-refusal-brokerage', 'full-refusal-depository'],
          message: 'Выберите хотя бы один договор, от исполнения которого клиент отказывается.'
        }
      ]
    },
    {
      id: 'regulation-partial-refusal-notice',
      title: 'Отказ от части услуг по Регламенту',
      description: 'Приложение 11 к Регламенту брокерского обслуживания.',
      category: 'Брокерское обслуживание',
      appliesTo: ['individual', 'company'],
      overlayTemplateId: 'regulation-partial-refusal-notice',
      pdfOutputFilename: 'regulation-partial-refusal-notice.pdf',
      downloadLabel: 'Скачать уведомление',
      fields: [
        { key: 'extra-document-date', label: 'Дата уведомления', type: 'date', required: true },
        { key: 'extra-contract-number', label: 'Номер договора', type: 'text', required: true },
        { key: 'extra-contract-date', label: 'Дата договора', type: 'date', required: true },
        { key: 'extra-account-portfolio', label: 'Счёт / портфель', type: 'text', required: true },
        {
          key: 'extra-stock-portfolio',
          label: 'Портфель фондового рынка',
          type: 'text',
          required: true,
          showWhen: { source: 'check.partial-refusal-stock', equals: true }
        },
        {
          key: 'extra-derivatives-portfolio',
          label: 'Портфель срочного рынка',
          type: 'text',
          required: true,
          showWhen: { source: 'check.partial-refusal-derivatives', equals: true }
        },
        {
          key: 'extra-currency-portfolio',
          label: 'Портфель валютного рынка',
          type: 'text',
          required: true,
          showWhen: { source: 'check.partial-refusal-currency', equals: true }
        }
      ],
      companyFields: [REPRESENTATIVE_FIELD],
      checkGroupLabel: 'Прекратить предоставление:',
      checkFields: [
        { key: 'partial-refusal-stock', label: 'Услуг на фондовом рынке' },
        { key: 'partial-refusal-derivatives', label: 'Услуг на срочном рынке' },
        { key: 'partial-refusal-currency', label: 'Услуг на валютном рынке' },
        { key: 'partial-refusal-quik', label: 'Соглашения о праве использования ПО QUIK' },
        { key: 'partial-refusal-esignature', label: 'Соглашения об электронной подписи' }
      ],
      validationRules: [
        {
          type: 'atLeastOneCheck',
          keys: [
            'partial-refusal-stock',
            'partial-refusal-derivatives',
            'partial-refusal-currency',
            'partial-refusal-quik',
            'partial-refusal-esignature'
          ],
          message: 'Выберите хотя бы одну услугу или соглашение для прекращения.'
        }
      ]
    },
    {
      id: 'anketa-fl',
      title: 'Анкета физического лица',
      description: 'Анкета физического лица — клиента ООО «Инвестика»',
      category: 'Анкеты и идентификация',
      appliesTo: ['individual'],
      overlayTemplateId: 'anketa-fl',
      pdfOutputFilename: 'anketa-fl.pdf',
      downloadLabel: 'Скачать анкету',
      checkGroupLabel: 'Независимые признаки и декларации:',
      fields: [
        {
          key: 'extra-document-date',
          label: 'Дата составления анкеты',
          type: 'date',
          required: true
        },
        {
          key: 'extra-questionnaire-role',
          label: 'Роль лица в анкете',
          type: 'select',
          required: true,
          defaultValue: 'client',
          options: [
            { value: 'client', label: 'Клиент' },
            { value: 'representative', label: 'Представитель' },
            { value: 'beneficiary', label: 'Выгодоприобретатель' },
            { value: 'beneficial-owner', label: 'Бенефициарный владелец' }
          ]
        },
        {
          key: 'extra-questionnaire-mode',
          label: 'Тип заполнения',
          type: 'select',
          required: true,
          defaultValue: 'first',
          options: [
            { value: 'first', label: 'Заполняется впервые' },
            { value: 'change', label: 'Изменение анкетных данных' }
          ]
        },
        {
          key: 'extra-tax-residency',
          label: 'Налоговое резидентство',
          type: 'select',
          required: true,
          defaultValue: 'rf',
          options: [
            { value: 'rf', label: 'Российская Федерация' },
            { value: 'other', label: 'Иное государство' }
          ]
        },
        {
          key: 'tax-residency-countries',
          label: 'Иные государства налогового резидентства',
          type: 'text',
          required: true,
          showWhen: { source: 'extra.extra-tax-residency', equals: 'other' }
        },
        {
          key: 'extra-foreign-taxpayer',
          label: 'Налогоплательщик иностранного государства',
          type: 'select',
          required: true,
          defaultValue: 'no',
          options: [
            { value: 'yes', label: 'Да' },
            { value: 'no', label: 'Нет' }
          ]
        },
        {
          key: 'migration-document-series-number',
          label: 'Миграционный документ: серия и номер',
          type: 'text',
          showWhen: { source: 'subject.citizenship', notEquals: ['Россия', 'Российская Федерация'] }
        },
        {
          key: 'migration-stay-start-date',
          label: 'Срок пребывания в РФ: с',
          type: 'date',
          showWhen: { source: 'subject.citizenship', notEquals: ['Россия', 'Российская Федерация'] }
        },
        {
          key: 'migration-stay-end-date',
          label: 'Срок пребывания в РФ: по',
          type: 'date',
          showWhen: { source: 'subject.citizenship', notEquals: ['Россия', 'Российская Федерация'] }
        },
        {
          key: 'pep-position-employer',
          label: 'Должность и работодатель публичного должностного лица',
          type: 'textarea'
        },
        {
          key: 'extra-pep-relation',
          label: 'Связь с публичным должностным лицом',
          type: 'textarea'
        },
        { key: 'landline-phone', label: 'Стационарный телефон', type: 'text' },
        { key: 'bank-name', label: 'Наименование банка', type: 'text' },
        { key: 'bank-address', label: 'Адрес банка', type: 'text' },
        { key: 'bank-inn', label: 'ИНН банка', type: 'text' },
        { key: 'bank-bic-swift', label: 'БИК / SWIFT банка', type: 'text' },
        { key: 'bank-correspondent-account', label: 'Корреспондентский счёт', type: 'text' },
        { key: 'bank-settlement-account', label: 'Расчётный счёт', type: 'text' },
        {
          key: 'bank-additional-details',
          label: 'Дополнительные банковские реквизиты',
          type: 'textarea'
        },
        { key: 'representative-name', label: 'ФИО представителя', type: 'text' },
        {
          key: 'representative-authority-details',
          label: 'Основание полномочий представителя',
          type: 'textarea'
        },
        { key: 'beneficiary-name', label: 'ФИО выгодоприобретателя', type: 'text' },
        {
          key: 'beneficiary-basis-details',
          label: 'Основание выгодоприобретателя',
          type: 'textarea'
        },
        { key: 'beneficial-owner-name', label: 'ФИО бенефициарного владельца', type: 'text' },
        {
          key: 'beneficial-owner-basis',
          label: 'Основание бенефициарного владения',
          type: 'textarea',
          rows: 2
        },
        {
          key: 'extra-business-purpose',
          label: 'Цель деловых отношений',
          type: 'select',
          required: false,
          options: [
            { value: 'Брокерское обслуживание', label: 'Брокерское обслуживание' },
            { value: 'Доверительное управление', label: 'Доверительное управление' },
            { value: 'Конверсионные операции', label: 'Конверсионные операции' },
            { value: 'Иное', label: 'Иное' }
          ]
        },
        {
          key: 'business-purpose-other',
          label: 'Иная цель деловых отношений',
          type: 'text',
          required: true,
          showWhen: { source: 'extra.extra-business-purpose', equals: 'Иное' }
        },
        {
          key: 'extra-financial-goal',
          label: 'Цель финансово-хозяйственной деятельности',
          type: 'select',
          required: false,
          options: [
            { value: 'Получение инвестиционного дохода', label: 'Получение инвестиционного дохода' },
            { value: 'Сохранение активов', label: 'Сохранение активов' },
            { value: 'Контроль рисков', label: 'Контроль рисков' },
            { value: 'Иное', label: 'Иное' }
          ]
        },
        {
          key: 'financial-goal-other',
          label: 'Иная цель финансово-хозяйственной деятельности',
          type: 'text',
          required: true,
          showWhen: { source: 'extra.extra-financial-goal', equals: 'Иное' }
        },
        {
          key: 'financial-solvency',
          label: 'Признаки банкротства или неплатёжеспособности',
          type: 'select',
          required: true,
          options: [
            { value: 'no-bankruptcy', label: 'Да, отсутствуют' },
            { value: 'bankruptcy-present', label: 'Нет, имеются' }
          ]
        },
        {
          key: 'extra-business-reputation',
          label: 'Сведения о деловой репутации',
          type: 'textarea',
          required: false
        },
        {
          key: 'foreign-trust-owner-status',
          label: 'Статус доверительного собственника иностранной структуры',
          type: 'select',
          required: true,
          options: [
            { value: 'yes', label: 'Да' },
            { value: 'no', label: 'Нет' }
          ]
        },
        {
          key: 'foreign-trust-protector-status',
          label: 'Статус протектора иностранной структуры',
          type: 'select',
          required: true,
          options: [
            { value: 'yes', label: 'Да' },
            { value: 'no', label: 'Нет' }
          ]
        },
        { key: 'extra-other-info', label: 'Иные сведения', type: 'textarea' }
      ],
      checkFields: [
        { key: 'pep-foreign', label: 'Иностранное публичное должностное лицо' },
        { key: 'pep-international', label: 'Должностное лицо публичной международной организации' },
        { key: 'pep-russian', label: 'Лицо, замещающее государственные должности РФ' },
        { key: 'fatca-us-citizen', label: 'Гражданство США' },
        { key: 'fatca-us-permanent-resident', label: 'Разрешение на постоянное пребывание в США' },
        { key: 'fatca-us-birth-country', label: 'Место рождения в США' },
        { key: 'fatca-us-address', label: 'Адрес проживания в США' },
        { key: 'fatca-us-mailing-address', label: 'Почтовый адрес в США' },
        { key: 'fatca-us-phone', label: 'Телефонный номер США' },
        { key: 'fatca-us-payment-instructions', label: 'Платёжные инструкции в США' },
        { key: 'fatca-us-attorney', label: 'Доверенность лицу с адресом в США' }
      ]
    },
    {
      // Приложение 16.1 — the short questionnaire used when the client is
      // identified in a simplified way through the personal cabinet. A
      // different form from Приложение 16 (`anketa-fl`), with its own bank and
      // PDL blocks, so it gets its own card rather than sharing that one.
      // Identity, passport, address and contacts come from the subject card;
      // the wizard asks only for what the CRM does not hold.
      id: 'anketa-fl-simplified-id',
      title: 'Анкета ФЛ (упрощённая идентификация)',
      description: 'Приложение 16.1 — упрощённая идентификация через личный кабинет.',
      category: 'Анкеты и идентификация',
      appliesTo: ['individual'],
      overlayTemplateId: 'anketa-fl-simplified-id',
      pdfOutputFilename: 'anketa-fl-uproshchennaya-identifikaciya.pdf',
      downloadLabel: 'Скачать анкету',
      aliases: ['упрощенная идентификация', 'приложение 16.1', 'личный кабинет'],
      fields: [
        {
          key: 'extra-document-date',
          label: 'Дата заполнения анкеты',
          type: 'date',
          required: true
        },
        {
          key: 'extra-landline-phone',
          label: 'Стационарный телефон (код страны, код города, номер)',
          type: 'text'
        },
        {
          key: 'extra-medical-policy',
          label: 'Полис ОМС (при наличии)',
          type: 'text'
        },
        {
          key: 'extra-pdl-status',
          label: 'Статус публичного должностного лица (п. 11)',
          type: 'select',
          defaultValue: 'none',
          options: [
            { value: 'none', label: 'Не является ПДЛ' },
            { value: 'foreign', label: 'Иностранное публичное должностное лицо' },
            { value: 'international', label: 'Должностное лицо публичной международной организации' },
            { value: 'russian', label: 'Государственная или приравненная должность в РФ' }
          ]
        },
        {
          key: 'extra-pdl-details',
          label: 'Должность, наименование и адрес работодателя (при статусе ПДЛ)',
          type: 'textarea',
          showWhen: { source: 'extra.extra-pdl-status', notEquals: 'none' }
        },
        {
          key: 'extra-kinship-degree',
          label: 'Степень родства либо статус по отношению к ПДЛ (п. 12)',
          type: 'textarea'
        },
        { key: 'extra-bank-name', label: 'Полное наименование банка', type: 'text' },
        { key: 'extra-bank-address', label: 'Полный адрес банка с указанием страны', type: 'text' },
        { key: 'extra-bank-inn', label: 'ИНН банка', type: 'text' },
        { key: 'extra-bank-bic', label: 'БИК/SWIFT', type: 'text' },
        { key: 'extra-bank-corr-account', label: 'Корреспондентский счёт', type: 'text' },
        { key: 'extra-bank-account', label: 'Расчётный счёт/IBAN', type: 'text' },
        {
          key: 'extra-bank-additional',
          label: 'Дополнительные сведения: лицевой счёт, получатель, иное',
          type: 'text'
        },
        {
          key: 'extra-other-information',
          label: 'Иная информация (п. 14)',
          type: 'textarea'
        }
      ]
    },
    {
      // Приложение 18. The filename abbreviates the second category as «СЗ»,
      // but the form itself never says «самозанятый» — its wording is
      // «Индивидуальный предприниматель» and «Лицо, занимающееся частной
      // практикой». Those two legally distinct categories are kept separate.
      // Individuals only: an ИП is a physical person, and the CRM has no
      // trusted field recording that status, so the operator selects it.
      id: 'anketa-ip-sz',
      title: 'Анкета (досье) ИП или лица, занимающегося частной практикой',
      description: 'Приложение 18 — анкета индивидуального предпринимателя или частной практики.',
      category: 'Анкеты и идентификация',
      appliesTo: ['individual'],
      overlayTemplateId: 'anketa-ip-sz',
      pdfOutputFilename: 'anketa-ip-chastnaya-praktika.pdf',
      downloadLabel: 'Скачать анкету',
      extraGroupLabel: 'Сведения для анкеты',
      checkGroupLabel: 'Признаки налогоплательщика США (п. 31):',
      aliases: ['приложение 18', 'индивидуальный предприниматель', 'частная практика', 'огрнип'],
      fields: [
        {
          key: 'extra-document-date',
          label: 'Дата заполнения анкеты',
          type: 'date',
          required: true
        },
        {
          key: 'extra-ipsz-status',
          label: 'Статус клиента',
          type: 'select',
          required: true,
          options: [
            { value: 'entrepreneur', label: 'Индивидуальный предприниматель' },
            { value: 'private-practice', label: 'Лицо, занимающееся частной практикой' }
          ]
        },
        {
          key: 'extra-questionnaire-role',
          label: 'Роль лица в анкете (п. «Представитель / Выгодоприобретатель»)',
          type: 'select',
          options: [
            { value: '', label: 'Не указывать' },
            { value: 'representative', label: 'Представитель' },
            { value: 'beneficiary', label: 'Выгодоприобретатель' }
          ]
        },
        {
          key: 'extra-questionnaire-mode',
          label: 'Тип заполнения',
          type: 'select',
          required: true,
          defaultValue: 'first',
          options: [
            { value: 'first', label: 'Заполняется впервые' },
            { value: 'change', label: 'Изменение анкетных данных' }
          ]
        },
        {
          key: 'extra-citizenship-kind',
          label: 'Гражданство (п. 4)',
          type: 'select',
          required: true,
          defaultValue: 'rf',
          options: [
            { value: 'rf', label: 'Российская Федерация' },
            { value: 'other', label: 'Иное государство' }
          ]
        },
        {
          key: 'extra-citizenship-countries',
          label: 'Укажите все страны, гражданином которых Вы являетесь',
          type: 'text',
          showWhen: { source: 'extra.extra-citizenship-kind', equals: 'other' }
        },
        {
          key: 'extra-tax-residency',
          label: 'Сведения о налоговом резидентстве (п. 5)',
          type: 'select',
          required: true,
          defaultValue: 'rf',
          options: [
            { value: 'rf', label: 'Российская Федерация' },
            { value: 'other', label: 'Иное государство' }
          ]
        },
        {
          key: 'extra-tax-residency-countries',
          label: 'Укажите все страны налогового резидентства',
          type: 'text',
          showWhen: { source: 'extra.extra-tax-residency', equals: 'other' }
        },
        {
          key: 'extra-foreign-taxpayer',
          label: 'Принадлежность к иностранным налогоплательщикам (п. 6)',
          type: 'select',
          required: true,
          options: [
            { value: 'yes', label: 'Да' },
            { value: 'no', label: 'Нет' }
          ]
        },
        {
          key: 'extra-residence-permit-number',
          label: 'Документ о праве пребывания (проживания): серия и номер',
          type: 'text',
          showWhen: { source: 'extra.extra-citizenship-kind', equals: 'other' }
        },
        {
          key: 'extra-residence-permit-from',
          label: 'Дата начала срока права пребывания (проживания)',
          type: 'date',
          showWhen: { source: 'extra.extra-citizenship-kind', equals: 'other' }
        },
        {
          key: 'extra-residence-permit-to',
          label: 'Дата окончания срока права пребывания (проживания)',
          type: 'date',
          showWhen: { source: 'extra.extra-citizenship-kind', equals: 'other' }
        },

        { key: 'extra-landline-phone', label: 'Телефон (код страны, код города, номер)', type: 'text' },

        {
          key: 'extra-pdl-status',
          label: 'Наличие статуса публичного должностного лица (п. 13)',
          type: 'select',
          defaultValue: '',
          options: [
            { value: '', label: 'Не является ПДЛ' },
            { value: 'foreign', label: 'Иностранного публичного должностного лица, его супруга, близкого родственника или действие в интересах такого лица' },
            { value: 'international', label: 'Должностного лица публичной международной организации' },
            { value: 'russian', label: 'Лица, замещающего государственные должности РФ и приравненные к ним' }
          ]
        },
        {
          key: 'extra-pdl-relation',
          label: 'Статус родства по отношению к ПДЛ (п. 14)',
          type: 'textarea'
        },

        { key: 'extra-bank-name', label: 'Полное наименование банка', type: 'text' },
        { key: 'extra-bank-address', label: 'Полный адрес банка с указанием страны', type: 'text' },
        { key: 'extra-bank-inn', label: 'ИНН банка', type: 'text' },
        { key: 'extra-bank-bic', label: 'БИК/SWIFT', type: 'text' },
        { key: 'extra-bank-corr-account', label: 'Корреспондентский счёт', type: 'text' },
        { key: 'extra-bank-account', label: 'Расчётный счёт/IBAN', type: 'text' },
        { key: 'extra-bank-additional', label: 'Дополнительные сведения: лицевой счёт, получатель, иное', type: 'text' },

        // ─── ИП registration (п. 17) ───────────────────────────────────────
        {
          key: 'extra-ogrnip', label: 'ОГРНИП', type: 'text',
          showWhen: { source: 'extra.extra-ipsz-status', equals: 'entrepreneur' }
        },
        {
          key: 'extra-ip-registration-date', label: 'Дата государственной регистрации ИП', type: 'date',
          showWhen: { source: 'extra.extra-ipsz-status', equals: 'entrepreneur' }
        },
        {
          key: 'extra-ip-certificate',
          label: 'Данные свидетельства о регистрации в ЕГРИП / о записи об ИП',
          type: 'textarea',
          showWhen: { source: 'extra.extra-ipsz-status', equals: 'entrepreneur' }
        },
        {
          key: 'extra-ip-registration-authority', label: 'Наименование регистрирующего органа', type: 'text',
          showWhen: { source: 'extra.extra-ipsz-status', equals: 'entrepreneur' }
        },
        {
          key: 'extra-ip-registration-place', label: 'Место регистрации ИП', type: 'text',
          showWhen: { source: 'extra.extra-ipsz-status', equals: 'entrepreneur' }
        },
        {
          key: 'extra-okved', label: 'ОКВЭД (перечислить все)', type: 'text',
          showWhen: { source: 'extra.extra-ipsz-status', equals: 'entrepreneur' }
        },

        // ─── Private practice registration (п. 18) ─────────────────────────
        {
          key: 'extra-practice-document',
          label: 'Наименование документа, подтверждающего регистрацию в качестве лица, занимающегося частной практикой',
          type: 'textarea',
          showWhen: { source: 'extra.extra-ipsz-status', equals: 'private-practice' }
        },
        {
          key: 'extra-practice-document-number', label: 'Номер документа', type: 'text',
          showWhen: { source: 'extra.extra-ipsz-status', equals: 'private-practice' }
        },
        {
          key: 'extra-practice-document-date', label: 'Дата выдачи документа', type: 'date',
          showWhen: { source: 'extra.extra-ipsz-status', equals: 'private-practice' }
        },
        {
          key: 'extra-practice-document-authority', label: 'Наименование органа, выдавшего документ', type: 'text',
          showWhen: { source: 'extra.extra-ipsz-status', equals: 'private-practice' }
        },

        // ─── Licensing (п. 19) ─────────────────────────────────────────────
        {
          key: 'extra-licensing',
          label: 'Деятельность, подлежащая лицензированию',
          type: 'select',
          required: true,
          defaultValue: 'none',
          options: [
            { value: 'none', label: 'Не осуществляется' },
            { value: 'yes', label: 'Осуществляется (указать ниже)' }
          ]
        },
        {
          key: 'extra-licence-number-date', label: 'Номер и дата выдачи лицензии', type: 'text',
          showWhen: { source: 'extra.extra-licensing', equals: 'yes' }
        },
        {
          key: 'extra-licence-authority', label: 'Наименование органа, выдавшего лицензию', type: 'text',
          showWhen: { source: 'extra.extra-licensing', equals: 'yes' }
        },
        {
          key: 'extra-licence-validity', label: 'Срок действия лицензии', type: 'text',
          showWhen: { source: 'extra.extra-licensing', equals: 'yes' }
        },
        {
          key: 'extra-licence-activities', label: 'Перечень видов лицензируемой деятельности', type: 'text',
          showWhen: { source: 'extra.extra-licensing', equals: 'yes' }
        },

        { key: 'extra-website', label: 'Доменное имя / указатель страницы в сети Интернет', type: 'text' },
        { key: 'extra-representative-basis', label: 'Реквизиты документа, на основании которого действует представитель', type: 'textarea' },
        { key: 'extra-beneficiary-name', label: 'ФИО или наименование выгодоприобретателя', type: 'text' },
        { key: 'extra-beneficiary-basis', label: 'Реквизиты документа, на основании которого лицо действует к выгоде', type: 'textarea' },
        { key: 'extra-beneficial-owner', label: 'ФИО бенефициарного владельца', type: 'text' },
        { key: 'extra-beneficial-owner-basis', label: 'Основание для признания лица бенефициарным владельцем', type: 'textarea' },

        {
          key: 'extra-business-purpose',
          label: 'Цели установления деловых отношений (п. 24)',
          type: 'select',
          required: true,
          options: [
            { value: 'brokerage', label: 'Брокерское обслуживание' },
            { value: 'trust', label: 'Доверительное управление' },
            { value: 'conversion', label: 'Конверсионные операции' },
            { value: 'other', label: 'Иное' }
          ]
        },
        {
          key: 'extra-financial-goal',
          label: 'Цели финансово-хозяйственной деятельности (п. 25)',
          type: 'select',
          required: true,
          options: [
            { value: 'income', label: 'Получение инвестиционного дохода' },
            { value: 'preservation', label: 'Сохранение активов' },
            { value: 'risk-control', label: 'Контроль рисков' },
            { value: 'other', label: 'Иное' }
          ]
        },
        {
          key: 'extra-financial-position',
          label: 'Сведения о финансовом положении: отсутствие производства по делу о несостоятельности (п. 26)',
          type: 'select',
          required: true,
          options: [
            { value: 'yes', label: 'Да' },
            { value: 'no', label: 'Нет' }
          ]
        },
        {
          key: 'extra-trustee-status',
          label: 'Статус доверительного собственника (управляющего) ИСБОЮЛ (п. 29)',
          type: 'select',
          required: true,
          defaultValue: 'no',
          options: [
            { value: 'yes', label: 'Имеется' },
            { value: 'no', label: 'Отсутствует' }
          ]
        },
        {
          key: 'extra-protector-status',
          label: 'Статус протектора ИСБОЮЛ (п. 30)',
          type: 'select',
          required: true,
          defaultValue: 'no',
          options: [
            { value: 'yes', label: 'Имеется' },
            { value: 'no', label: 'Отсутствует' }
          ]
        },
        { key: 'extra-other-info', label: 'Иные сведения (п. 32)', type: 'textarea' }
      ],
      // Eight independent US-taxpayer indicators; any number may be ticked.
      checkFields: [
        { key: 'fatca-us-citizen', label: 'Являюсь гражданином США' },
        { key: 'fatca-us-greencard', label: 'Имею разрешение на постоянное пребывание в США (greencard)' },
        { key: 'fatca-us-birth-country', label: 'Страна моего рождения является США' },
        { key: 'fatca-us-address', label: 'Имею фактический адрес проживания, адрес регистрации или почтовый адрес на территории США' },
        { key: 'fatca-us-mailing-address', label: 'Имею адрес «для передачи» или «до востребования» на территории США' },
        { key: 'fatca-us-phone', label: 'Имею действующий номер контактного телефона на территории США' },
        { key: 'fatca-us-payment-instructions', label: 'Имею долгосрочные платёжные инструкции по перечислению средств на счёт в США' },
        { key: 'fatca-us-attorney', label: 'Выдана доверенность лицу, имеющему адрес в США' }
      ]
    },
    {
      id: 'anketa-yul',
      title: 'Анкета юридического лица',
      description: 'Анкета юридического лица — клиента ООО «Инвестика»',
      category: 'Анкеты и идентификация',
      appliesTo: ['company'],
      overlayTemplateId: 'anketa-yul',
      pdfOutputFilename: 'anketa-yul.pdf',
      downloadLabel: 'Скачать анкету',
      checkGroupLabel: 'Независимые признаки и подтверждающие документы:',
      fields: [
        {
          key: 'extra-document-date',
          label: 'Дата составления анкеты',
          type: 'date',
          required: true
        },
        {
          key: 'extra-questionnaire-role',
          label: 'Роль организации в анкете',
          type: 'select',
          required: true,
          defaultValue: 'client',
          options: [
            { value: 'client', label: 'Клиент' },
            { value: 'representative', label: 'Представитель' },
            { value: 'beneficiary', label: 'Выгодоприобретатель' }
          ]
        },
        {
          key: 'extra-questionnaire-mode',
          label: 'Тип заполнения',
          type: 'select',
          required: true,
          defaultValue: 'first',
          options: [
            { value: 'first', label: 'Заполняется впервые' },
            { value: 'change', label: 'Изменение анкетных данных' }
          ]
        },
        {
          key: 'extra-tax-residency',
          label: 'Налоговое резидентство',
          type: 'select',
          required: true,
          defaultValue: 'rf',
          options: [
            { value: 'rf', label: 'Российская Федерация' },
            { value: 'other', label: 'Иное государство' }
          ]
        },
        {
          key: 'tax-residency-countries',
          label: 'Иные государства налогового резидентства',
          type: 'text',
          required: true,
          showWhen: { source: 'extra.extra-tax-residency', equals: 'other' }
        },
        {
          key: 'extra-foreign-taxpayer',
          label: 'Налогоплательщик иностранного государства',
          type: 'select',
          required: true,
          defaultValue: 'no',
          options: [
            { value: 'yes', label: 'Да' },
            { value: 'no', label: 'Нет' }
          ]
        },
        {
          key: 'extra-strategic-company',
          label: 'Стратегическое общество или подконтрольная организация',
          type: 'select',
          required: true,
          options: [
            { value: 'yes', label: 'Да' },
            { value: 'no', label: 'Нет' }
          ]
        },
        { key: 'tax-registration-date', label: 'Дата постановки на налоговый учёт', type: 'date' },
        {
          key: 'foreign-tax-identifier',
          label: 'Иностранный налоговый идентификатор',
          type: 'text',
          showWhen: { source: 'extra.extra-tax-residency', equals: 'other' }
        },
        {
          key: 'foreign-registration-number',
          label: 'Иностранный регистрационный номер',
          type: 'text',
          showWhen: { source: 'extra.extra-tax-residency', equals: 'other' }
        },
        {
          key: 'foreign-branch-accreditation-number',
          label: 'Номер аккредитации филиала иностранной организации',
          type: 'text',
          showWhen: { source: 'extra.extra-tax-residency', equals: 'other' }
        },
        { key: 'pre2002-registration-document', label: 'Документ о регистрации до 01.07.2002', type: 'text' },
        { key: 'pre2002-registration-number', label: 'Номер регистрации до 01.07.2002', type: 'text' },
        { key: 'pre2002-registration-date', label: 'Дата регистрации до 01.07.2002', type: 'date' },
        { key: 'pre2002-registration-authority', label: 'Орган регистрации до 01.07.2002', type: 'text' },
        { key: 'executive-body-address', label: 'Адрес исполнительного органа', type: 'textarea' },
        {
          key: 'nonresident-representation-address',
          label: 'Адрес представительства нерезидента',
          type: 'textarea',
          showWhen: { source: 'extra.extra-tax-residency', equals: 'other' }
        },
        {
          key: 'nonresident-representative-residence',
          label: 'Место жительства представителя нерезидента',
          type: 'textarea',
          showWhen: { source: 'extra.extra-tax-residency', equals: 'other' }
        },
        { key: 'landline-phone', label: 'Стационарный телефон', type: 'text' },
        { key: 'credit-organisation-bic', label: 'БИК кредитной организации', type: 'text' },
        {
          key: 'extra-okpo',
          label: 'ОКПО',
          type: 'text',
          required: false
        },
        {
          key: 'extra-okved',
          label: 'ОКВЭД / виды деятельности',
          type: 'textarea',
          required: false
        },
        {
          key: 'extra-management-structure',
          label: 'Структура органов управления',
          type: 'text',
          required: false,
          placeholder: 'Совет директоров, правление, ЕИО и т.п.'
        },
        { key: 'management-composition', label: 'Состав органов управления', type: 'text' },
        {
          key: 'shareholders-names-inn',
          label: 'Участники от 5%: наименования / ФИО и ИНН',
          type: 'text'
        },
        {
          key: 'shareholders-percentages',
          label: 'Доли участников от 5%',
          type: 'text'
        },
        {
          key: 'extra-controlling-persons',
          label: 'Лица, определяющие действия ЮЛ',
          type: 'textarea',
          required: false
        },
        {
          key: 'extra-licensed-activity',
          label: 'Осуществляется лицензируемая деятельность',
          type: 'select',
          required: true,
          options: [
            { value: 'yes', label: 'Да' },
            { value: 'no', label: 'Нет' }
          ]
        },
        { key: 'licence-number', label: 'Номер лицензии', type: 'text', showWhen: { source: 'extra.extra-licensed-activity', equals: 'yes' } },
        { key: 'licence-issue-date', label: 'Дата выдачи лицензии', type: 'date', showWhen: { source: 'extra.extra-licensed-activity', equals: 'yes' } },
        { key: 'licence-authority', label: 'Орган, выдавший лицензию', type: 'text', showWhen: { source: 'extra.extra-licensed-activity', equals: 'yes' } },
        { key: 'licence-expiry', label: 'Срок действия лицензии', type: 'text', showWhen: { source: 'extra.extra-licensed-activity', equals: 'yes' } },
        { key: 'licensed-activities', label: 'Виды лицензируемой деятельности', type: 'text', showWhen: { source: 'extra.extra-licensed-activity', equals: 'yes' } },
        { key: 'bank-name', label: 'Наименование банка', type: 'text' },
        { key: 'bank-address', label: 'Адрес банка', type: 'text' },
        { key: 'bank-inn', label: 'ИНН банка', type: 'text' },
        { key: 'bank-bic-swift', label: 'БИК / SWIFT банка', type: 'text' },
        { key: 'bank-correspondent-account', label: 'Корреспондентский счёт', type: 'text' },
        { key: 'bank-settlement-account', label: 'Расчётный счёт', type: 'text' },
        {
          key: 'correspondent-bank-details',
          label: 'Реквизиты банка-корреспондента',
          type: 'textarea',
          required: false
        },
        { key: 'representative-name', label: 'ФИО представителя', type: 'text' },
        { key: 'representative-authority-details', label: 'Основание полномочий представителя', type: 'textarea' },
        { key: 'beneficiary-name', label: 'ФИО / наименование выгодоприобретателя', type: 'text' },
        { key: 'beneficiary-basis-details', label: 'Основание выгодоприобретателя', type: 'textarea' },
        { key: 'beneficial-owner-name', label: 'ФИО бенефициарного владельца', type: 'text' },
        { key: 'beneficial-owner-basis', label: 'Основание бенефициарного владения', type: 'textarea' },
        {
          key: 'extra-business-purpose',
          label: 'Цель деловых отношений',
          type: 'select',
          required: false,
          options: [
            { value: 'Брокерское обслуживание', label: 'Брокерское обслуживание' },
            { value: 'Доверительное управление', label: 'Доверительное управление' },
            { value: 'Конверсионные операции', label: 'Конверсионные операции' },
            { value: 'Иное', label: 'Иное' }
          ]
        },
        {
          key: 'business-purpose-other',
          label: 'Иная цель деловых отношений',
          type: 'text',
          required: true,
          showWhen: { source: 'extra.extra-business-purpose', equals: 'Иное' }
        },
        {
          key: 'extra-financial-goal',
          label: 'Цель финансово-хозяйственной деятельности',
          type: 'select',
          required: false,
          options: [
            { value: 'Получение инвестиционного дохода', label: 'Получение инвестиционного дохода' },
            { value: 'Сохранение активов', label: 'Сохранение активов' },
            { value: 'Контроль рисков', label: 'Контроль рисков' },
            { value: 'Иное', label: 'Иное' }
          ]
        },
        {
          key: 'financial-goal-other',
          label: 'Иная цель финансово-хозяйственной деятельности',
          type: 'text',
          required: true,
          showWhen: { source: 'extra.extra-financial-goal', equals: 'Иное' }
        },
        {
          key: 'reputation-other-details',
          label: 'Иные документы о деловой репутации',
          type: 'textarea',
          showWhen: { source: 'check.reputation-other', equals: true }
        },
        {
          key: 'source-of-funds-other',
          label: 'Иной источник происхождения средств / имущества',
          type: 'text',
          showWhen: { source: 'check.funds-other', equals: true }
        },
        {
          key: 'extra-other-info',
          label: 'Иные сведения',
          type: 'textarea',
          required: false
        },
        {
          key: 'foreign-trust-owner-status',
          label: 'Статус доверительного собственника иностранной структуры',
          type: 'select',
          required: true,
          options: [
            { value: 'yes', label: 'Да' },
            { value: 'no', label: 'Нет' }
          ]
        },
        {
          key: 'foreign-trust-protector-status',
          label: 'Статус протектора иностранной структуры',
          type: 'select',
          required: true,
          options: [
            { value: 'yes', label: 'Да' },
            { value: 'no', label: 'Нет' }
          ]
        }
      ],
      checkFields: [
        { key: 'financial-docs-annual-accounts', label: 'Годовая бухгалтерская отчётность' },
        { key: 'financial-docs-audit-report', label: 'Аудиторское заключение' },
        { key: 'reputation-client-reviews', label: 'Отзывы клиентов о деловой репутации' },
        { key: 'reputation-financial-reviews', label: 'Отзывы кредитных организаций о деловой репутации' },
        { key: 'reputation-other', label: 'Иные документы о деловой репутации' },
        { key: 'funds-borrowed', label: 'Источник средств: заемные средства' },
        { key: 'funds-other', label: 'Источник средств: иное' },
        { key: 'fatca-us-tax-residence', label: 'Налоговое резидентство США' },
        { key: 'fatca-us-registration-address', label: 'Адрес регистрации в США' },
        { key: 'fatca-us-beneficial-owners', label: 'Бенефициарные владельцы — налогоплательщики США' },
        { key: 'fatca-us-phone', label: 'Телефонный номер США' },
        { key: 'fatca-us-signatory', label: 'Подписант с адресом в США' },
        { key: 'fatca-us-payment-instructions', label: 'Платёжные инструкции в США' }
      ]
    },
    {
      id: 'qualification-request-fl',
      title: 'Заявление о признании ФЛ квалифицированным инвестором',
      description: 'Приложение № 1 к Регламенту признания лиц квалифицированными инвесторами.',
      category: 'Квалифицированный инвестор',
      appliesTo: ['individual'],
      overlayTemplateId: 'qualification-request-fl',
      pdfOutputFilename: 'qualification-request-fl.pdf',
      downloadLabel: 'Скачать заявление',
      checkGroupLabel: 'Виды имущества для критерия стоимости:',
      fields: [
        {
          key: 'extra-contract-number',
          label: 'Номер договора',
          type: 'text',
          required: true
        },
        {
          key: 'extra-contract-date',
          label: 'Дата договора',
          type: 'date',
          required: true
        },
        {
          key: 'extra-qualification-scope',
          label: 'Перечень инструментов',
          type: 'select',
          required: true,
          options: [
            { value: 'all', label: 'Все виды ценных бумаг и финансовых инструментов' },
            { value: 'other', label: 'Ограниченный перечень' }
          ]
        },
        {
          key: 'extra-qualification-instruments-other',
          label: 'Ограниченный перечень инструментов',
          type: 'text',
          required: true,
          showWhen: { source: 'extra.extra-qualification-scope', equals: 'other' }
        },
        { key: 'extra-securities-value-millions', label: 'Стоимость ценных бумаг / ПФИ, млн руб.', type: 'text' },
        {
          key: 'extra-work-experience-basis',
          label: 'Основание по опыту работы',
          type: 'select',
          options: [
            { value: 'qualified-two-years', label: 'Не менее 2 лет в организации — квалифицированном инвесторе' },
            { value: 'other-three-years', label: 'Не менее 3 лет в иной организации' }
          ]
        },
        { key: 'extra-quarterly-transactions-value-millions', label: 'Стоимость сделок за квартал, млн руб.', type: 'text' },
        { key: 'extra-assets-value-millions', label: 'Стоимость имущества, млн руб.', type: 'text' },
        {
          key: 'extra-education-basis',
          label: 'Основание по образованию / квалификации',
          type: 'select',
          options: [
            { value: 'higher-education', label: 'Высшее экономическое образование' },
            { value: 'certificate', label: 'Свидетельство НОК / квалификационный аттестат' }
          ]
        },
        {
          key: 'extra-supporting-docs-securities-holdings',
          label: 'Документы: стоимость ценных бумаг / ПФИ',
          type: 'textarea',
          required: false
        },
        {
          key: 'extra-supporting-docs-work-experience',
          label: 'Документы: опыт работы',
          type: 'textarea'
        },
        {
          key: 'extra-supporting-docs-bank-approved-position',
          label: 'Документы: должность, согласованная Банком России',
          type: 'textarea'
        },
        {
          key: 'extra-supporting-docs-quarterly-transactions',
          label: 'Документы: сделки за квартал',
          type: 'textarea'
        },
        {
          key: 'extra-supporting-docs-assets',
          label: 'Документы: стоимость имущества',
          type: 'textarea'
        },
        {
          key: 'extra-supporting-docs-education',
          label: 'Документы: образование / квалификация',
          type: 'textarea'
        },
        {
          key: 'extra-supporting-docs-qualified-registry',
          label: 'Документы: выписка из реестра квалифицированных лиц',
          type: 'textarea'
        },
        {
          key: 'extra-delivery-method',
          label: 'Способ получения уведомлений и выписок',
          type: 'select',
          required: true,
          options: [
            { value: 'address', label: 'По указанному адресу' },
            { value: 'office', label: 'Лично в офисе ООО «Инвестика»' }
          ]
        },
        {
          key: 'extra-delivery-address',
          label: 'Адрес доставки уведомлений и выписок',
          type: 'textarea',
          required: true,
          showWhen: { source: 'extra.extra-delivery-method', equals: 'address' }
        }
      ],
      checkFields: [
        { key: 'qualification-assets-cash-deposits', label: 'Денежные средства и вклады' },
        { key: 'qualification-assets-precious-metals', label: 'Требования по обезличенным металлическим счетам' },
        { key: 'qualification-assets-securities', label: 'Ценные бумаги, включая переданные в доверительное управление' }
      ]
    },
    {
      id: 'qualification-request-yul',
      title: 'Заявление о признании ЮЛ квалифицированным инвестором',
      description: 'Приложение № 2 к Регламенту признания лиц квалифицированными инвесторами.',
      category: 'Квалифицированный инвестор',
      appliesTo: ['company'],
      overlayTemplateId: 'qualification-request-yul',
      pdfOutputFilename: 'qualification-request-yul.pdf',
      downloadLabel: 'Скачать заявление',
      fields: [
        {
          key: 'extra-document-date',
          label: 'Дата заявления',
          type: 'date',
          required: true
        },
        {
          key: 'extra-contract-number',
          label: 'Номер договора',
          type: 'text',
          required: true,
          placeholder: 'Например: БО-1011'
        },
        {
          key: 'extra-contract-date',
          label: 'Дата договора',
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
        },
        {
          key: 'extra-supporting-docs-4',
          label: 'Приложенный документ 4',
          type: 'text',
          required: false
        },
        {
          key: 'extra-supporting-docs-5',
          label: 'Приложенный документ 5',
          type: 'text',
          required: false,
          placeholder: 'Например: выписка из реестра квалифицированных лиц'
        },
        {
          key: 'extra-delivery-method',
          label: 'Способ получения уведомлений и выписок',
          type: 'select',
          required: true,
          options: [
            { value: 'address', label: 'По указанному адресу' },
            { value: 'office', label: 'Лично в офисе ООО «Инвестика»' }
          ]
        },
        {
          key: 'extra-delivery-address',
          label: 'Адрес доставки уведомлений и выписок',
          type: 'textarea',
          required: true,
          showWhen: { source: 'extra.extra-delivery-method', equals: 'address' }
        }
      ],
      companyFields: [REPRESENTATIVE_FIELD]
    },
    {
      id: 'qualification-notice',
      title: 'Уведомление о признании лица квалифицированным инвестором',
      description: 'Уведомление о признании лица квалифицированным инвестором',
      // Приложение № 3 of the qualification regulation — not to be confused
      // with ПРИЛОЖЕНИЕ 3 of the brokerage regulation below.
      //
      // Migrated from the legacy HTML print template onto the authoritative
      // PDF. The old form asked for a decision number, a decision date, a
      // "qualified from" date, a register-entry date and the signing officer's
      // name and position. None of those has a slot in the authoritative
      // document: it prints one recognition date, and the officer block is
      // filled in by hand after printing. They were dropped rather than shown
      // and ignored.
      appliesTo: ['individual', 'company'],
      category: 'Квалифицированный инвестор',
      overlayTemplateId: 'qualification-notice',
      pdfOutputFilename: 'uvedomlenie-o-priznanii-kvalinvestorom.pdf',
      downloadLabel: 'Скачать уведомление',
      aliases: ['приложение 3 квалификация', 'реестр квалифицированных инвесторов'],
      fields: [
        {
          key: 'extra-document-date',
          label: 'Дата признания квалифицированным инвестором',
          type: 'date',
          required: true
        },
        {
          key: 'extra-qualification-scope',
          label: 'Виды сделок, ценных бумаг и финансовых инструментов',
          type: 'select',
          required: true,
          defaultValue: 'all',
          options: [
            { value: 'all', label: 'Все виды, предназначенные для квалифицированных инвесторов' },
            { value: 'other', label: 'Иное (указать перечень)' }
          ]
        },
        {
          key: 'extra-qualification-instruments-other',
          label: 'Перечень инструментов («иное»)',
          type: 'text',
          showWhen: { source: 'extra.extra-qualification-scope', equals: 'other' }
        }
      ]
    },
    {
      // Приложение № 11 of the same qualification regulation. Despite its
      // filename it is unrelated to ПРИЛОЖЕНИЕ 11 К РЕГЛАМЕНТУ (отказ от части
      // услуг) and to the 17-page Risks.pdf.
      id: 'qualification-consequences-notice',
      title: 'Уведомление о последствиях признания квалифицированным инвестором',
      description: 'Приложение 11 к Регламенту признания квалифицированным инвестором.',
      category: 'Квалифицированный инвестор',
      appliesTo: ['individual'],
      overlayTemplateId: 'qualification-consequences-notice',
      pdfOutputFilename: 'uvedomlenie-o-posledstviyah-priznaniya-kvalinvestorom.pdf',
      downloadLabel: 'Скачать уведомление',
      aliases: ['последствия признания', 'риски квалифицированного инвестора'],
      fields: [
        {
          key: 'extra-document-date',
          label: 'Дата уведомления',
          type: 'date',
          required: true
        }
      ]
    },
    {
      id: 'account-opening-notice',
      title: 'Уведомление об открытии брокерского-депозитарного счета',
      description: 'Уведомление об открытии брокерского-депозитарного счета',
      // Operator-facing notice issued by Investica after the accounts are
      // opened. Client identity comes from the subject card; everything else
      // is back-office data the CRM does not hold.
      //
      // Inputs removed when the authoritative template was updated with
      // Investica's own constants printed in:
      //   * extra-payment-details            — §5 requisites are now printed
      //     (ИНН 7802953900, Р/сч, АО "Райффайзенбанк", К/сч, БИК 044525700);
      //   * extra-securities-transfer-details — the page-2 депо tables are now
      //     printed (HL2509080091 / ML2508290147 / MC0742000000 / НКО АО НРД /
      //     №7420/ДНД).
      // Inputs removed because the source reserves no usable space or no slot:
      //   * extra-authority-basis    — the gap after «Доверенности №» is 8.18 pt;
      //   * extra-account-opening-date and extra-brokerage-account — neither has
      //     a position anywhere in the two pages.
      appliesTo: ['individual', 'company'],
      category: 'Уведомления и раскрытие информации',
      overlayTemplateId: 'account-opening-notice',
      pdfOutputFilename: 'uvedomlenie-ob-otkrytii-scheta.pdf',
      downloadLabel: 'Скачать уведомление',
      extraGroupLabel: 'Данные открытия счетов и договоров',
      aliases: ['приложение 3 регламент', 'открытие счета', 'счет депо'],
      fields: [
        {
          key: 'extra-document-date',
          label: 'Дата формирования',
          type: 'date',
          required: true
        },
        // «Уполномоченное лицо ООО «Инвестика»» was asked for here while the
        // template left a blank for it. The updated authoritative template
        // prints the representative itself, so asking would put a value on
        // screen that the document no longer has anywhere to print.
        {
          key: 'extra-brokerage-contract',
          label: 'Номер договора на брокерское обслуживание',
          type: 'text',
          required: true
        },
        {
          key: 'extra-brokerage-contract-date',
          label: 'Дата договора на брокерское обслуживание',
          type: 'date',
          required: true
        },
        {
          key: 'extra-depository-contract',
          label: 'Номер депозитарного договора',
          type: 'text',
          required: true,
          sourceKind: 'operator-input'
        },
        {
          key: 'extra-depository-contract-date',
          label: 'Дата депозитарного договора',
          type: 'date',
          required: true,
          sourceKind: 'operator-input'
        },
        {
          key: 'extra-stock-market-account',
          label: 'Счёт внутреннего учёта: фондовый рынок',
          type: 'text'
        },
        {
          key: 'extra-futures-market-account',
          label: 'Счёт внутреннего учёта: срочный рынок',
          type: 'text'
        },
        {
          key: 'extra-currency-market-account',
          label: 'Счёт внутреннего учёта: валютный рынок и рынок драг. металлов',
          type: 'text'
        },
        {
          key: 'extra-depo-account',
          label: 'Номер счёта депо клиента',
          type: 'text',
          required: true
        }
      ]
    },
    {
      // ПРИЛОЖЕНИЕ 6. One four-page file holding two powers of attorney — one
      // from a legal entity (pages 1–2) and one from an individual (pages 3–4)
      // — so it is offered to both subject kinds and the field map fills only
      // the matching variant.
      //
      // The delegated powers are fixed prose in the source, with no checkbox
      // glyphs anywhere in the document, no "other powers" line, no validity
      // blank and no substitution option (the wording fixes three years without
      // передоверие). Nothing of that is therefore offered as a choice.
      id: 'power-of-attorney',
      title: 'Доверенность',
      description: 'Приложение 6 к Регламенту брокерского обслуживания.',
      category: 'Документы и заявления клиента',
      appliesTo: ['individual', 'company'],
      overlayTemplateId: 'power-of-attorney',
      pdfOutputFilename: 'doverennost.pdf',
      downloadLabel: 'Скачать доверенность',
      extraGroupLabel: 'Данные поверенного',
      aliases: ['приложение 6', 'поверенный', 'представитель'],
      fields: [
        {
          key: 'extra-poa-date-words',
          label: 'Дата доверенности прописью',
          type: 'text',
          required: true,
          placeholder: 'двадцать восьмое июля две тысячи двадцать шестого года'
        },
        {
          key: 'extra-poa-city',
          label: 'Место выдачи (город)',
          type: 'text',
          required: true,
          placeholder: 'Санкт-Петербург',
          // The individual variant prints «г. Москва», so it has no blank.
          showWhen: { source: 'subject.kind', equals: 'company' }
        },
        {
          key: 'extra-attorney-name',
          label: 'Поверенный — ФИО',
          type: 'text',
          required: true
        },
        {
          key: 'extra-attorney-citizenship',
          label: 'Поверенный — гражданство',
          type: 'text',
          required: true,
          placeholder: 'РФ'
        },
        {
          key: 'extra-attorney-passport',
          label: 'Поверенный — серия и номер паспорта',
          type: 'text',
          required: true,
          placeholder: '4510 234567',
          // The legal-entity variant prints «серии» with no rule after it, so
          // series and number share one slot there.
          showWhen: { source: 'subject.kind', equals: 'company' }
        },
        {
          key: 'extra-attorney-passport-series',
          label: 'Поверенный — серия паспорта',
          type: 'text',
          required: true,
          showWhen: { source: 'subject.kind', equals: 'individual' }
        },
        {
          key: 'extra-attorney-passport-number',
          label: 'Поверенный — номер паспорта',
          type: 'text',
          required: true,
          showWhen: { source: 'subject.kind', equals: 'individual' }
        },
        {
          key: 'extra-attorney-issued-by',
          label: 'Поверенный — кем выдан паспорт',
          type: 'text',
          required: true
        },
        {
          key: 'extra-attorney-issue-date',
          label: 'Поверенный — дата выдачи паспорта',
          type: 'date',
          required: true
        },
        {
          key: 'extra-attorney-address',
          label: 'Поверенный — адрес регистрации',
          type: 'textarea',
          required: true
        }
      ]
    },
    {
      // ПРИЛОЖЕНИЕ 7 — one authoritative four-page file holding three separate
      // order forms, kept as a single registry entry rather than split into
      // duplicate cards. «Тип поручения» selects which of the three is filled;
      // the other two stay blank and all four pages are always emitted.
      // The order-type names are taken verbatim from the source.
      //
      // Every value a mistake would make expensive comes from a fixed option or
      // from the instrument catalog: the trade side, the market, the order
      // kind, validity, settlement, REPO/SWAP and the traded instrument itself.
      // What stays free text is what the form itself leaves free — counterparty
      // and «иная информация» — plus the bank requisites of a payout, which are
      // the rows waiting for their exact UMI binding.
      //
      // Four payload values are never typed and never editable. They are built
      // in CRMOrderForms.normalize() from the selected instrument and the fixed
      // options, and the fields that carry them are declared `derived` so the
      // payload contract still names them:
      //   extra-submission-kind   always «primary» — see below
      //   extra-order-validity    «До отмены» or the chosen date, RU-formatted
      //   extra-security-issuer   Assets.EmitentFirm_ID → Firms
      //   extra-security-type     the compact legal description of the asset
      // and the same for the FX instrument name and the derivative master data.
      id: 'order-forms',
      title: 'Поручение (формы поручений)',
      description: 'Приложение 7 к Регламенту брокерского обслуживания.',
      category: 'Операционные заявки',
      appliesTo: ['individual', 'company'],
      overlayTemplateId: 'order-forms',
      pdfOutputFilename: 'poruchenie.pdf',
      downloadLabel: 'Скачать поручение',
      extraGroupLabel: 'Параметры поручения',
      aliases: ['приложение 7', 'заявка', 'сделка', 'вывод средств', 'перевод средств',
                'ценные бумаги', 'репо', 'валюта', 'пфи', 'срочный рынок'],
      // What the form's read-only rows resolve against. The wizard only walks
      // the `valueFrom` path; what a requisite is, and which one a payout in a
      // given currency uses, is the payload model's business.
      resolveContext: function (subject, values) {
        return window.CRMOrderForms
          ? window.CRMOrderForms.context(subject, values) : {};
      },
      fields: [
        {
          key: 'extra-order-type',
          label: 'Тип поручения',
          type: 'select',
          required: true,
          fullWidth: true,
          options: [
            { value: 'trade', label: 'Поручение на совершение сделки' },
            { value: 'transfer', label: 'Поручение на операции с денежными средствами (перевод между торговыми площадками)' },
            { value: 'withdrawal', label: 'Поручение на операции с денежными средствами (вывод на банковский счет)' }
          ]
        },
        {
          // Every order this process produces is a primary submission. The
          // form's «Отмена ранее поданной заявки» box exists in the source and
          // stays mapped, but a manager may not reach it: an order is cancelled
          // through the operational flow, not by printing a different tick on
          // the same form. The value is fixed in the payload, not in the map,
          // so the map keeps describing the paper form exactly.
          key: 'extra-submission-kind',
          label: 'Вид подачи',
          type: 'derived',
          staticText: 'Вид подачи: первичная подача заявки (устанавливается автоматически).'
        },
        {
          key: 'extra-order-number-date',
          label: 'Номер и дата заявки',
          type: 'text',
          placeholder: '12 от 02.09.2026'
        },
        {
          key: 'extra-contract-number-date',
          label: 'Номер и дата договора с клиентом',
          type: 'text',
          required: true
        },
        {
          key: 'extra-brokerage-account',
          label: 'Брокерский счёт №',
          type: 'text',
          required: true
        },

        // ─── Поручение на совершение сделки ───────────────────────────────
        {
          key: 'extra-trade-kind',
          label: 'Вид сделки',
          type: 'select',
          required: true,
          options: [
            { value: 'buy', label: 'Покупка' },
            { value: 'sell', label: 'Продажа' },
            { value: 'other', label: 'Иной вид сделки' }
          ],
          showWhen: ORDER_TRADE
        },
        {
          key: 'extra-trade-kind-other',
          label: 'Иной вид сделки (указать)',
          type: 'text',
          required: true,
          showWhen: { allOf: [ORDER_TRADE, { source: 'extra.extra-trade-kind', equals: 'other' }] }
        },
        {
          key: 'extra-order-market',
          label: 'Вид рынка',
          type: 'select',
          required: true,
          options: [
            { value: 'stock', label: 'Фондовый' },
            { value: 'currency', label: 'Валютный' },
            { value: 'derivatives', label: 'Срочный' },
            { value: 'otc', label: 'Внебиржевой' }
          ],
          showWhen: ORDER_TRADE
        },
        {
          // The business rule that makes OTC different from every other market:
          // it carries securities and currency instruments and nothing else.
          // Derivatives are the срочный рынок and are never offered here.
          key: 'extra-otc-instrument-type',
          label: 'Вид инструмента (внебиржевой рынок)',
          type: 'select',
          required: true,
          options: [
            { value: 'security', label: 'Ценная бумага' },
            { value: 'currency', label: 'Валютный инструмент' }
          ],
          showWhen: { allOf: [ORDER_TRADE, { source: 'extra.extra-order-market', equals: 'otc' }] }
        },
        {
          // «Условное» is in the source form and stays in the map, but this
          // process does not accept conditional orders, so the option is not
          // offered and `extra-order-kind` can only ever be market or limit.
          key: 'extra-order-kind',
          label: 'Вид поручения',
          type: 'select',
          required: true,
          options: [
            { value: 'market', label: 'Рыночное' },
            { value: 'limit', label: 'Лимитированное' }
          ],
          showWhen: ORDER_TRADE
        },
        {
          // Unreachable by construction — «Условное» is not offered above. Kept
          // so the legacy payload key stays part of the contract.
          key: 'extra-order-kind-conditional',
          label: 'Условное поручение (указать)',
          type: 'text',
          showWhen: { allOf: [ORDER_TRADE, { source: 'extra.extra-order-kind', equals: 'conditional' }] }
        },
        {
          key: 'extra-order-validity-mode',
          label: 'Срок действия заявки',
          type: 'select',
          required: true,
          options: [
            { value: 'cancelled', label: 'До отмены' },
            { value: 'date', label: 'До определённой даты' }
          ],
          showWhen: ORDER_TRADE
        },
        {
          key: 'extra-order-validity-date',
          label: 'Действительна по (включительно)',
          type: 'date',
          required: true,
          showWhen: { allOf: [ORDER_TRADE, { source: 'extra.extra-order-validity-mode', equals: 'date' }] }
        },
        { key: 'extra-order-validity', label: 'Срок действия заявки (для печати)', type: 'derived' },
        {
          key: 'extra-settlement-period',
          label: 'Срок расчётов',
          type: 'select',
          required: true,
          options: [
            { value: 'T+0', label: 'T+0' },
            { value: 'T+1', label: 'T+1' },
            { value: 'T+2', label: 'T+2' }
          ],
          showWhen: ORDER_TRADE
        },
        { key: 'extra-counterparty', label: 'Информация о контрагенте', type: 'text',
          showWhen: ORDER_TRADE },
        { key: 'extra-order-other-info', label: 'Иная информация', type: 'text',
          showWhen: ORDER_TRADE },

        // ─── Ценная бумага: фондовый рынок и внебиржевая ценная бумага ────
        //
        // One selector for both. A security is an Asset; which trading section
        // it happens to have a Securities row in is not an order parameter.
        {
          key: 'extra-security-asset-id',
          label: 'Ценная бумага',
          type: 'autocomplete',
          catalog: 'securities',
          placeholder: 'Наименование, тикер, ISIN или эмитент',
          required: true,
          fullWidth: true,
          showWhen: ORDER_SECURITY_BRANCH
        },
        { key: 'extra-security-issuer', label: 'Наименование эмитента', type: 'derived' },
        { key: 'extra-security-type', label: 'Вид, категория (тип), выпуск, серия, ISIN', type: 'derived' },
        {
          key: 'extra-security-quantity',
          label: 'Количество ценных бумаг, шт.',
          type: 'number',
          min: 1,
          step: 1,
          positive: true,
          required: true,
          showWhen: ORDER_SECURITY_BRANCH
        },
        {
          // A market order takes the price the market gives; the form prints
          // «Рыночная» and there is nothing for a manager to enter.
          key: 'extra-security-price',
          label: 'Цена одной ценной бумаги',
          type: 'number',
          step: 'any',
          positive: true,
          required: true,
          showWhen: ORDER_SECURITY_LIMIT
        },
        {
          key: 'extra-repo-ccp',
          label: 'Сделка РЕПО с ЦК',
          type: 'select',
          required: true,
          options: [
            { value: 'yes', label: 'Да' },
            { value: 'no', label: 'Нет' }
          ],
          showWhen: ORDER_SECURITY_BRANCH
        },
        {
          // Blank on a market order by the form's own design: the amount is not
          // known when the price is not. Optional even on a limit order.
          key: 'extra-trade-amount',
          label: 'Сумма сделки в валюте сделки',
          type: 'number',
          step: 'any',
          positive: true,
          showWhen: ORDER_SECURITY_LIMIT
        },

        // ─── Валютный инструмент: валютный рынок и внебиржевая валюта ─────
        {
          key: 'extra-fx-instrument-id',
          label: 'Валютный инструмент / инструмент драг. металлов',
          type: 'autocomplete',
          catalog: 'fx',
          placeholder: 'Код инструмента, наименование или валютная пара',
          required: true,
          fullWidth: true,
          showWhen: ORDER_FX_BRANCH
        },
        { key: 'extra-fx-instrument', label: 'Наименование валютного инструмента', type: 'derived' },
        {
          key: 'extra-fx-lots',
          label: 'Количество лотов',
          type: 'number',
          min: 1,
          step: 1,
          positive: true,
          required: true,
          showWhen: ORDER_FX_BRANCH
        },
        {
          key: 'extra-fx-rate',
          label: 'Курс валюты / цена сделки с драг. металлами',
          type: 'number',
          step: 'any',
          positive: true,
          required: true,
          showWhen: ORDER_FX_LIMIT
        },
        {
          key: 'extra-fx-amount',
          label: 'Сумма сделки в валюте котировки',
          type: 'number',
          step: 'any',
          positive: true,
          showWhen: ORDER_FX_BRANCH
        },
        {
          key: 'extra-fx-swap-ccp',
          label: 'Сделка валютный СВОП с ЦК',
          type: 'select',
          required: true,
          options: [
            { value: 'yes', label: 'Да' },
            { value: 'no', label: 'Нет' }
          ],
          showWhen: ORDER_FX_BRANCH
        },

        // ─── Срочный рынок ────────────────────────────────────────────────
        {
          key: 'extra-derivative-id',
          label: 'Инструмент срочного рынка',
          type: 'autocomplete',
          catalog: 'derivatives',
          placeholder: 'Код контракта, наименование или базовый актив',
          required: true,
          fullWidth: true,
          showWhen: ORDER_DERIVATIVE_BRANCH
        },
        { key: 'extra-derivative-kind', label: 'Вид инструмента срочного рынка', type: 'derived' },
        { key: 'extra-derivative-name', label: 'Наименование ПФИ', type: 'derived' },
        { key: 'extra-derivative-strike', label: 'Цена исполнения страйк (для опционов)', type: 'derived' },
        { key: 'extra-derivative-expiry', label: 'Дата исполнения (экспирации)', type: 'derived' },
        {
          key: 'extra-derivative-quantity',
          label: 'Количество ПФИ, шт. (лотов)',
          type: 'number',
          min: 1,
          step: 1,
          positive: true,
          required: true,
          showWhen: ORDER_DERIVATIVE_BRANCH
        },
        {
          key: 'extra-derivative-premium',
          label: 'Цена ПФИ (премия)',
          type: 'number',
          step: 'any',
          positive: true,
          required: true,
          showWhen: ORDER_DERIVATIVE_LIMIT
        },
        {
          key: 'extra-derivative-amount',
          label: 'Сумма сделки (ПФИ)',
          type: 'number',
          step: 'any',
          positive: true,
          showWhen: ORDER_DERIVATIVE_BRANCH
        },

        // ─── Перевод между торговыми площадками ───────────────────────────
        {
          key: 'extra-move-from',
          label: 'С торговой площадки',
          type: 'select',
          required: true,
          options: [
            { value: 'stock', label: 'ПАО Московская Биржа (фондовый рынок и рынок депозитов)' },
            { value: 'currency', label: 'ПАО Московская Биржа (валютный рынок и рынок драг. металлов)' },
            { value: 'derivatives', label: 'ПАО Московская Биржа (срочный рынок)' },
            { value: 'otc', label: 'Внебиржевой рынок' }
          ],
          showWhen: ORDER_TRANSFER
        },
        {
          key: 'extra-move-to',
          label: 'На торговую площадку',
          type: 'select',
          required: true,
          options: [
            { value: 'stock', label: 'ПАО Московская Биржа (фондовый рынок и рынок депозитов)' },
            { value: 'currency', label: 'ПАО Московская Биржа (валютный рынок и рынок драг. металлов)' },
            { value: 'derivatives', label: 'ПАО Московская Биржа (срочный рынок)' },
            { value: 'otc', label: 'Внебиржевой рынок' }
          ],
          showWhen: ORDER_TRANSFER
        },
        { key: 'extra-move-amount', label: 'Сумма (цифрами)', type: 'number',
          step: 'any', positive: true, required: true, showWhen: ORDER_TRANSFER },
        // Spelled out from the figure and the currency above it. Never typed:
        // an amount a manager writes twice is an amount they can write two
        // ways. The printed blank holds one narrow line, so a long wording
        // continues onto the reviewed line the map opens beneath it.
        { key: 'extra-move-amount-words', label: 'Сумма (прописью)', type: 'derived' },
        {
          key: 'extra-move-currency',
          label: 'Валюта перевода',
          type: 'select',
          required: true,
          options: [
            { value: 'RUB', label: 'RUB' },
            { value: 'USD', label: 'USD' },
            { value: 'EURO', label: 'EURO' },
            { value: 'CNY', label: 'CNY' },
            { value: 'other', label: 'Иная валюта' }
          ],
          showWhen: ORDER_TRANSFER
        },

        // ─── Вывод на банковский счёт ─────────────────────────────────────
        {
          key: 'extra-payout-currency',
          label: 'Валюта вывода',
          type: 'select',
          required: true,
          options: [
            { value: 'RUB', label: 'RUB' },
            { value: 'USD', label: 'USD' },
            { value: 'EURO', label: 'EURO' },
            { value: 'CNY', label: 'CNY' },
            { value: 'other', label: 'Иная валюта' }
          ],
          showWhen: ORDER_WITHDRAWAL
        },
        {
          key: 'extra-payout-amount-mode',
          label: 'Сумма вывода',
          type: 'select',
          required: true,
          options: [
            { value: 'whole', label: 'В размере свободного остатка' },
            { value: 'amount', label: 'В сумме' }
          ],
          showWhen: ORDER_WITHDRAWAL
        },
        { key: 'extra-payout-amount', label: 'Сумма вывода (цифрами)', type: 'number',
          step: 'any', positive: true, required: true,
          showWhen: { allOf: [ORDER_WITHDRAWAL, { source: 'extra.extra-payout-amount-mode', equals: 'amount' }] } },
        // Spelled out from the figure, exactly as on the transfer form. «В
        // размере свободного остатка» has no figure, so it produces no wording.
        { key: 'extra-payout-amount-words', label: 'Сумма вывода (прописью)', type: 'derived' },
        {
          key: 'extra-payout-from',
          label: 'С торговой площадки',
          type: 'select',
          required: true,
          options: [
            { value: 'stock', label: 'ПАО Московская Биржа (фондовый рынок и рынок депозитов)' },
            { value: 'currency', label: 'ПАО Московская Биржа (валютный рынок и рынок драг. металлов)' },
            { value: 'derivatives', label: 'ПАО Московская Биржа (срочный рынок)' },
            { value: 'otc', label: 'Внебиржевой рынок' }
          ],
          showWhen: ORDER_WITHDRAWAL
        },
        // The bank block is CRM-owned data, shown for checking and not for
        // typing. Every row has an exact UMI name in Front Реквизиты
        // (docs/umi-variable-registry.md); today they resolve from the subject
        // card's static mock through the document's context provider, and the
        // backend points the same keys at the real record without this list
        // changing. Which requisite a payout uses follows the currency chosen
        // above, so these refresh when it changes.
        //
        // The rows a payout cannot be executed without are validated by
        // CRMOrderForms.validate(): missing CRM data refuses the document and
        // names what is missing, rather than printing a half-filled order.
        { key: 'extra-bank-recipient', label: 'Получатель (наименование/ФИО)',
          type: 'readonly', valueFrom: 'requisites.extra-bank-recipient',
          emptyHint: 'нет данных в карточке субъекта', showWhen: ORDER_WITHDRAWAL },
        { key: 'extra-bank-bic', label: 'БИК/SWIFT банка получателя',
          type: 'readonly', valueFrom: 'requisites.extra-bank-bic',
          emptyHint: 'нет данных в карточке субъекта', showWhen: ORDER_WITHDRAWAL },
        { key: 'extra-bank-name', label: 'Наименование банка получателя',
          type: 'readonly', valueFrom: 'requisites.extra-bank-name',
          emptyHint: 'нет данных в карточке субъекта', showWhen: ORDER_WITHDRAWAL },
        // Intermediary-bank rows: a domestic rouble route has none, and empty
        // is the right answer there rather than a missing one.
        { key: 'extra-bank-corr-swift', label: 'SWIFT банка-корреспондента',
          type: 'readonly', valueFrom: 'requisites.extra-bank-corr-swift',
          emptyHint: 'не применимо для этого маршрута', showWhen: ORDER_WITHDRAWAL },
        { key: 'extra-bank-corr-name', label: 'Наименование банка-корреспондента',
          type: 'readonly', valueFrom: 'requisites.extra-bank-corr-name',
          emptyHint: 'не применимо для этого маршрута', showWhen: ORDER_WITHDRAWAL },
        { key: 'extra-bank-corr-account', label: 'Корреспондентский счёт банка получателя',
          type: 'readonly', valueFrom: 'requisites.extra-bank-corr-account',
          emptyHint: 'нет данных в карточке субъекта', showWhen: ORDER_WITHDRAWAL },
        { key: 'extra-bank-account', label: 'Счёт получателя',
          type: 'readonly', valueFrom: 'requisites.extra-bank-account',
          emptyHint: 'нет данных в карточке субъекта', showWhen: ORDER_WITHDRAWAL },
        { key: 'extra-bank-inn', label: 'ИНН получателя',
          type: 'readonly', valueFrom: 'requisites.extra-bank-inn',
          showWhen: ORDER_WITHDRAWAL },
        { key: 'extra-bank-personal-account', label: 'Лицевой счёт',
          type: 'readonly', valueFrom: 'requisites.extra-bank-personal-account',
          showWhen: ORDER_WITHDRAWAL },
        { key: 'extra-bank-other', label: 'Прочее',
          type: 'readonly', valueFrom: 'requisites.extra-bank-other',
          showWhen: ORDER_WITHDRAWAL }
      ],
      checkFields: [
        {
          // The form's own wording, and not a question: a trade order always
          // carries the acknowledgement, so it is set rather than asked. The
          // map prints it on the trade form only.
          key: 'order-uncovered-ack',
          label: 'Я проинформирован, что данная сделка может привести к открытию непокрытой позиции (для клиентов с начальным уровнем риска)',
          defaultChecked: true,
          hidden: true
        }
      ]
    },
    {
      id: 'code-word-request',
      title: 'Заявление об установлении/изменении кодового слова',
      description: 'Приложение 14 к Регламенту брокерского обслуживания.',
      category: 'Документы и заявления клиента',
      appliesTo: ['individual', 'company'],
      overlayTemplateId: 'code-word-request',
      pdfOutputFilename: 'code-word-request.pdf',
      downloadLabel: 'Скачать заявление',
      fields: [
        {
          key: 'extra-document-date',
          label: 'Дата заявления',
          type: 'date',
          required: true
        },
        {
          key: 'extra-new-code-word',
          label: 'Новое кодовое слово',
          type: 'text',
          required: true,
          placeholder: 'Введите кодовое слово'
        }
      ],
      companyFields: [REPRESENTATIVE_FIELD]
    },
    {
      id: 'account-closure',
      title: 'Заявка на закрытие договора/счёта',
      description: 'Создание заявки на закрытие брокерского и/или депозитарного договора с последующим акцептом подразделений.',
      appliesTo: ['individual', 'company'],
      category: 'Операционные заявки',
      // Special operational-request flow: no print template, no document generation.
      // Step 2 collects closure data; the final action creates a request and opens
      // the standalone request card (account-closure-request.html).
      closure: true,
      requestHref: 'account-closure-request.html?role=manager&source=wizard',
      contracts: [
        { number: 'BR-2026/00444', type: 'Брокерский договор', account: '30601-000-4401', defaultChecked: true },
        { number: 'DP-2026/00445', type: 'Депозитарный договор', account: '30-016-00041-DP', defaultChecked: true },
        { number: 'IN-2026/00011', type: 'Иной договор', account: '40701-USD-4401', defaultChecked: false }
      ]
    }
  ];

  // The visual template builder consumes the real production registry without
  // mounting the wizard UI or maintaining a second hand-written catalog. The
  // exposed value is a detached, recursively frozen clone so builder code can
  // never mutate the configuration used by this page.
  function cloneCatalogValue(value) {
    if (Array.isArray(value)) return value.map(cloneCatalogValue);
    if (!value || typeof value !== 'object') return value;
    var clone = {};
    Object.keys(value).forEach(function (key) {
      clone[key] = cloneCatalogValue(value[key]);
    });
    return clone;
  }

  function freezeCatalogValue(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function (key) { freezeCatalogValue(value[key]); });
    return Object.freeze(value);
  }

  // `blockedIncompleteMapping` on an entry means the map is a starting point
  // rather than a finished document: the wizard's document list drops it while
  // the Template Builder — the tool that finishes a mapping — still sees it.
  // No entry carries the flag today; the gate stays because the next
  // half-mapped form should be held back the same way rather than by deleting
  // the work in progress.
  window.CRMDocumentCatalog = freezeCatalogValue({
    schemaVersion: 1,
    documents: cloneCatalogValue(DOCUMENTS),
    normalization: cloneCatalogValue(NORMALIZED_SOURCE_PROVIDERS)
  });

  if (!isDocumentWizardPage) return;

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

  function isValidIsoDate(val) {
    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(val || ''));
    if (!match) return false;
    var year = Number(match[1]);
    var month = Number(match[2]);
    var day = Number(match[3]);
    var date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  // ── Selected representative (legal-entity signatory) ──────────────────────

  function getSelectedRepresentative(subject, extraValues) {
    var repId = extraValues['extra-representative-id'];
    return (subject.representatives || []).find(function (rep) {
      return rep.id === repId;
    }) || null;
  }

  // ── Build field map from subject + extra form values ─────────────────────

  // Some forms print the identity document's series and number in one cell
  // ("Серия (при наличии) и номер документа") rather than two.
  function joinSeriesNumber(series, number) {
    return [series, number]
      .map(function (part) { return String(part == null ? '' : part).trim(); })
      .filter(Boolean)
      .join(' ');
  }

  // Preserve exact UMI values when the subject lookup supplies them, and give
  // the static demo company the two exact workbook names it can prove from its
  // card. The overlay engine still resolves every source through umi-adapter;
  // this merely keeps the Wizard from discarding the canonical payload layer.
  function buildUmi(subject) {
    var supplied = subject && subject.umi;
    var out = supplied && typeof supplied === 'object'
      ? JSON.parse(JSON.stringify(supplied)) : {};
    if (subject && subject.kind === 'company') {
      out.company = out.company && typeof out.company === 'object'
        ? out.company : {};
      if (!String(out.company.origname || '').trim()) {
        out.company.origname = subject.fullLegalName || subject.displayName || '';
      }
      if (!String(out.company.basicname || '').trim()) {
        out.company.basicname = subject.shortName || subject.displayName || '';
      }
    }
    return out;
  }

  function buildFields(subject, extraValues) {
    var f = {};

    // Common
    // The registry defines this compatibility source as exact company
    // `origname`, while an individual keeps the composed personal display
    // name. Do not let a short company caption leak into legal forms.
    f['client-full-name'] = subject.kind === 'company'
      ? (subject.fullLegalName || subject.displayName) : subject.displayName;
    f['client-inn']       = subject.inn;
    f['client-code']      = subject.code;
    f['client-email']     = subject.email;
    f['client-phone']     = subject.phone;
    f['signature-name']   = subject.displayName;
    f['client-qualification-status'] = subject.qualificationStatus || '';

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
      f['client-id-or-inn']           = subject.idType + ' ' + subject.passportSeries + ' ' + subject.passportNumber;
    } else {
      f['client-short-name']            = subject.shortName;
      f['client-full-legal-name']       = subject.fullLegalName;
      f['client-english-name']          = subject.englishName;
      f['client-legal-form']            = subject.legalForm;
      f['client-kpp']                   = subject.kpp;
      f['client-ogrn']                  = subject.ogrn;
      f['client-registration-date']     = subject.registrationDate;
      f['client-registration-authority']= subject.registrationAuthority;
      f['client-legal-address']         = subject.legalAddress;
      // `umi.address.registration` deliberately falls back to this normalized
      // key when the CRM payload has one formatted address rather than exact
      // component fields. A company registration address is its legal address.
      f['client-registration-address']  = subject.legalAddress;
      f['client-postal-address']        = subject.postalAddress;
      f['client-website']               = subject.website;
      f['client-charter-capital']       = subject.charterCapital;
      f['client-tax-status']            = subject.taxStatus;
      f['client-rep-full-name']         = subject.repFullName;
      f['client-rep-position']          = subject.repPosition;
      f['client-rep-authority']         = subject.repAuthority;
      f['signature-name']               = subject.repFullName;
      f['client-id-or-inn']             = subject.inn;
    }

    // Extra wizard fields (date values converted to Russian format)
    Object.keys(extraValues).forEach(function (key) {
      f[key] = isoToRu(extraValues[key]);
    });

    // Russian-formatted signing/confirmation date (DD.MM.YYYY) for PDF mapping.
    // Mapped as field.documentDateRu so generated PDFs never show raw ISO dates.
    f.documentDateRu = isoToRu(extraValues['extra-document-date'] || '');

    // Normalized identity values consumed by the PDF field mapping
    // (brokerage starter package, client-notifications.pdf). clientFullName is
    // the physical person confirming/signing the notification: the individual
    // client for FL subjects, the selected representative for UL subjects.
    if (subject.kind === 'individual') {
      f.clientFullName      = subject.displayName || '';
      f.passportSeries      = subject.passportSeries || '';
      f.passportNumber      = subject.passportNumber || '';
      f.passportIssuedBy    = subject.passportIssuedBy || '';
      f.passportIssueDate   = subject.passportIssueDate || '';
      f.registrationAddress = subject.registrationAddress || '';
      f.passportSeriesNumber = joinSeriesNumber(subject.passportSeries, subject.passportNumber);
    } else {
      var rep = getSelectedRepresentative(subject, extraValues);
      f.clientFullName      = rep ? (rep.fullName || '') : '';
      f.passportSeries      = rep ? (rep.passportSeries || '') : '';
      f.passportNumber      = rep ? (rep.passportNumber || '') : '';
      f.passportIssuedBy    = rep ? (rep.passportIssuedBy || '') : '';
      f.passportIssueDate   = rep ? (rep.passportIssueDate || '') : '';
      f.registrationAddress = rep ? (rep.registrationAddress || '') : '';
      f.representativeFullName  = rep ? (rep.fullName || '') : '';
      f.representativeRole      = rep ? (rep.role || '') : '';
      f.representativeAuthority = rep ? (rep.authority || '') : '';
      f.representativeSignerLine = rep
        ? ((rep.fullName || '') + (rep.role ? (', ' + rep.role) : ''))
        : '';
      f.passportSeriesNumber = rep
        ? joinSeriesNumber(rep.passportSeries, rep.passportNumber)
        : '';
    }

    return f;
  }

  // ── Effective field list (adds company-only fields for legal entities) ────

  function getEffectiveFields(doc, subject) {
    var base = (doc.fields || []).slice();
    // Legal entities get the extra representative/signatory selector; individuals
    // only enter the signing date (identity is auto-filled from SUBJECTS).
    if (doc.companyFields && subject && subject.kind === 'company') {
      base = base.concat(doc.companyFields);
    }
    return base;
  }

  // ── Build check map ──────────────────────────────────────────────────────

  function buildChecks(doc, checkValues, extraValues, subject) {
    var checks = {};

    // Initialise from doc config checkFields defaults (all false)
    (doc.checkFields || []).forEach(function (cf) {
      checks[cf.key] = !!cf.defaultChecked;
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

    if (doc.id === 'anketa-fl' || doc.id === 'anketa-yul') {
      var role = checkValues['extra-questionnaire-role'] || 'client';
      checks['anketa-role-client'] = role === 'client';
      checks['anketa-role-representative'] = role === 'representative';
      checks['anketa-role-beneficiary'] = role === 'beneficiary';
      checks['anketa-role-beneficial-owner'] = role === 'beneficial-owner';

      var mode = checkValues['extra-questionnaire-mode'] || 'first';
      checks['anketa-mode-first'] = mode === 'first';
      checks['anketa-mode-change'] = mode === 'change';

      var taxResidency = extraValues['extra-tax-residency'] || '';
      checks['tax-resident-rf-yes'] = taxResidency === 'rf';
      checks['tax-resident-rf-no'] = taxResidency === 'other';

      var foreignTaxpayer = extraValues['extra-foreign-taxpayer'] || '';
      checks['fatca-yes'] = foreignTaxpayer === 'yes';
      checks['fatca-no'] = foreignTaxpayer === 'no';

      if (doc.id === 'anketa-fl') {
        var citizenship = String((subject && subject.citizenship) || '').toLocaleLowerCase('ru-RU');
        var russianCitizen = citizenship === 'россия' || citizenship === 'российская федерация';
        checks['citizenship-rf'] = russianCitizen;
        checks['citizenship-other'] = !russianCitizen;
      } else {
        var strategic = extraValues['extra-strategic-company'] || '';
        checks['strategic-company-yes'] = strategic === 'yes';
        checks['strategic-company-no'] = strategic === 'no';

        var licensed = extraValues['extra-licensed-activity'] || '';
        checks['licensed-activity-yes'] = licensed === 'yes';
        checks['licensed-activity-no'] = licensed === 'no';
      }
    }

    return checks;
  }

  // ── Step indicator ────────────────────────────────────────────────────────

  function setActiveStep(step) {
    document.querySelectorAll('.crm-wizard-step').forEach(function (el, idx) {
      el.classList.toggle('crm-wizard-step-active', (idx + 1) === step);
    });
  }

  // ── Subject-aware navigation ──────────────────────────────────────────────

  function getSubjectBackHref(subject) {
    if (subject && subject.id === 'c-006' && subject.kind === 'individual') return 'subject-card-individual.html';
    if (subject && subject.id === 'c-011' && subject.kind === 'company') return 'subject-card.html';
    return 'subjects.html';
  }

  function resolveSubjectContext(subjectId) {
    var subject = SUBJECTS[subjectId];
    if (subject) {
      return {
        subject: subject,
        known: true,
        backHref: getSubjectBackHref(subject),
        warning: ''
      };
    }

    return {
      subject: {
        id: subjectId || '',
        kind: 'unknown',
        displayName: subjectId ? ('Неизвестный субъект ' + subjectId) : 'Субъект не выбран',
        inn: '—',
        code: subjectId || '—',
        email: '',
        phone: '',
        qualificationStatus: ''
      },
      known: false,
      backHref: 'subjects.html',
      warning: 'Субъект не найден в статическом демо-реестре. Вернитесь в список субъектов и откройте мастер из карточки клиента.'
    };
  }

  function renderNavigation(context) {
    var cardLink = document.getElementById('docwiz-breadcrumb-card-link');
    var backLink = document.getElementById('docwiz-back-link');

    if (cardLink) {
      cardLink.href = context.backHref;
      cardLink.textContent = context.known ? 'Карточка субъекта' : 'Список субъектов';
    }

    if (backLink) {
      backLink.href = context.backHref;
      backLink.textContent = context.known ? '← К карточке субъекта' : '← К списку субъектов';
    }

    var warningEl = document.getElementById('docwiz-subject-warning');
    if (warningEl) {
      warningEl.hidden = !context.warning;
      warningEl.textContent = context.warning || '';
    }
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
    if (kindEl)  {
      kindEl.textContent =
        subject.kind === 'individual' ? 'Физическое лицо' :
        subject.kind === 'company' ? 'Юридическое лицо' :
        'Не определён';
    }
    if (crumbEl) crumbEl.textContent = subject.displayName;
  }

  // ── Dynamic field options + package guards ────────────────────────────────

  // Resolve a field's option list. Static options come from field.options;
  // dynamic options come from field.optionsFrom (only the subject representative
  // registry is supported for now).
  function getFieldOptions(field, subject) {
    if (field.optionsFrom === 'subject.representatives') {
      var representatives = (subject.representatives || []).filter(function (rep) {
        if (field.representativeRole && rep.role !== field.representativeRole) return false;
        if (field.representativeRoles && field.representativeRoles.indexOf(rep.role) === -1) return false;
        return true;
      });
      return representatives.map(function (rep) {
        return { value: rep.id, label: rep.fullName + ' — ' + rep.role };
      });
    }
    return field.options || [];
  }

  // A starter package cannot be filled for a legal entity that has no
  // representatives on file (client-notifications.pdf needs a signatory).
  function isPackageBlocked(doc, subject) {
    return !!(doc.packageDocuments && doc.packageDocuments.length) &&
      subject && subject.kind === 'company' &&
      !(subject.representatives && subject.representatives.length);
  }

  // ── Instrument picker (searchable selector over a reference catalog) ──────
  //
  // The wizard needs one control a manager can type into but cannot type a
  // value into: an order may name only an instrument the reference data really
  // holds. Typing searches; only picking a result produces a value.
  //
  // The catalog is `window.CRMInstrumentCatalog` — the single static mock the
  // backend replaces with QORT data. This control knows nothing about
  // securities, currencies or derivatives; it asks the named catalog to search
  // and to describe what was found.
  //
  // Shape:
  //   <div class="crm-docwiz-picker">
  //     <input data-autocomplete-for="<key>">        what the manager types
  //     <input type="hidden" data-field-key="<key>"> the selected id
  //     <div class="crm-docwiz-picker-menu" role="listbox">
  //   <div class="crm-docwiz-picker-card">           the read-only summary
  //
  // The typed text is deliberately NOT a payload key: nothing a manager types
  // here can reach the PDF. Only the id does, and only the payload normalizer
  // turns that id into printed values.
  function buildInstrumentPicker(field) {
    var reference = window.CRMInstrumentCatalog;
    var catalog = reference && reference.catalog(field.catalog);
    var minLength = (reference && reference.MIN_QUERY_LENGTH) || 2;
    var maxResults = (reference && reference.MAX_RESULTS) || 20;

    var root = document.createElement('div');
    root.className = 'crm-docwiz-picker';

    var box = document.createElement('div');
    box.className = 'crm-docwiz-picker-box';

    var search = document.createElement('input');
    search.className = 'uk-input crm-input crm-docwiz-picker-input';
    search.type = 'text';
    search.id = 'docwiz-field-' + field.key + '-search';
    search.setAttribute('autocomplete', 'off');
    search.setAttribute('role', 'combobox');
    search.setAttribute('aria-autocomplete', 'list');
    search.setAttribute('aria-expanded', 'false');
    search.setAttribute('data-autocomplete-for', field.key);
    if (field.placeholder) search.placeholder = field.placeholder;

    var value = document.createElement('input');
    value.type = 'hidden';

    var menu = document.createElement('div');
    menu.className = 'crm-docwiz-picker-menu';
    menu.id = 'docwiz-field-' + field.key + '-menu';
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;
    search.setAttribute('aria-controls', menu.id);

    var card = document.createElement('div');
    card.className = 'crm-docwiz-picker-card';
    card.hidden = true;

    box.appendChild(search);
    box.appendChild(value);
    box.appendChild(menu);
    root.appendChild(box);
    root.appendChild(card);

    var results = [];
    var activeIndex = -1;

    if (!catalog) {
      // A missing catalog module is a deployment fault, not a manager's
      // problem: say so once and leave the control unusable rather than let an
      // order be produced with no real instrument behind it.
      console.error('Document Wizard: reference catalog "' + field.catalog +
        '" is not loaded. Check that assets/js/document-wizard/' +
        'instrument-catalog.js is included before document-wizard.js.');
      search.disabled = true;
      search.placeholder = 'Справочник инструментов не загружен';
    }

    function closeMenu() {
      menu.hidden = true;
      menu.textContent = '';
      search.setAttribute('aria-expanded', 'false');
      results = [];
      activeIndex = -1;
    }

    // The read-only face of the selection. Its rows come from the catalog, so
    // what a manager verifies here is exactly what the order will print.
    function renderCard(item) {
      card.textContent = '';
      if (!item) { card.hidden = true; return; }
      catalog.summary(item).forEach(function (row) {
        var line = document.createElement('div');
        line.className = 'crm-docwiz-picker-card-row';
        var name = document.createElement('span');
        name.className = 'crm-docwiz-picker-card-label';
        name.textContent = row.label;
        var val = document.createElement('strong');
        val.textContent = row.value;
        line.appendChild(name);
        line.appendChild(val);
        card.appendChild(line);
      });
      card.hidden = false;
    }

    function highlight() {
      Array.prototype.forEach.call(
        menu.querySelectorAll('.crm-docwiz-picker-item'),
        function (el, index) {
          var on = index === activeIndex;
          el.classList.toggle('is-active', on);
          el.setAttribute('aria-selected', on ? 'true' : 'false');
        }
      );
    }

    function select(item) {
      if (!item) return;
      value.value = String(item[catalog.idKey]);
      search.value = catalog.resultTitle(item);
      search.classList.remove('crm-input-error');
      renderCard(item);
      closeMenu();
      // Branch visibility and the saved wizard state both listen for this.
      value.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function renderMenu() {
      menu.textContent = '';
      if (!results.length) {
        var empty = document.createElement('div');
        empty.className = 'crm-docwiz-picker-item crm-docwiz-picker-item-empty';
        empty.textContent = search.value.trim().length < minLength
          ? 'Введите не менее ' + minLength + ' символов'
          : 'Ничего не найдено';
        menu.appendChild(empty);
      } else {
        results.forEach(function (item, index) {
          var row = document.createElement('div');
          row.className = 'crm-docwiz-picker-item';
          row.setAttribute('role', 'option');
          row.setAttribute('data-index', String(index));
          var title = document.createElement('span');
          title.className = 'crm-docwiz-picker-item-title';
          title.textContent = catalog.resultTitle(item);
          var meta = document.createElement('span');
          meta.className = 'crm-docwiz-picker-item-meta';
          meta.textContent = catalog.resultMeta(item);
          row.appendChild(title);
          row.appendChild(meta);
          menu.appendChild(row);
        });
      }
      menu.hidden = false;
      search.setAttribute('aria-expanded', 'true');
      highlight();
    }

    function runSearch() {
      if (!catalog) return;
      var query = search.value.trim();
      results = query.length < minLength ? [] : catalog.search(query, maxResults);
      activeIndex = results.length ? 0 : -1;
      renderMenu();
    }

    search.addEventListener('input', function () {
      // Editing the text after a selection invalidates it: the id is dropped so
      // a stale instrument can never survive a changed search string.
      if (value.value) {
        value.value = '';
        renderCard(null);
        value.dispatchEvent(new Event('change', { bubbles: true }));
      }
      runSearch();
    });

    search.addEventListener('focus', function () {
      if (!value.value && search.value.trim()) runSearch();
    });

    // The menu suppresses its own pointer default below, so a blur here always
    // means the manager really left the control.
    search.addEventListener('blur', closeMenu);

    search.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (menu.hidden) runSearch();
        if (!results.length) return;
        event.preventDefault();
        activeIndex = event.key === 'ArrowDown'
          ? (activeIndex + 1) % results.length
          : (activeIndex - 1 + results.length) % results.length;
        highlight();
        return;
      }
      if (event.key === 'Enter') {
        if (!menu.hidden && activeIndex >= 0) {
          event.preventDefault();
          select(results[activeIndex]);
        }
        return;
      }
      if (event.key === 'Escape' && !menu.hidden) {
        event.preventDefault();
        closeMenu();
      }
    });

    // Keep the focus on the input so blur never races the click.
    menu.addEventListener('mousedown', function (event) { event.preventDefault(); });
    menu.addEventListener('click', function (event) {
      var row = event.target.closest('.crm-docwiz-picker-item');
      if (!row || row.classList.contains('crm-docwiz-picker-item-empty')) return;
      select(results[Number(row.getAttribute('data-index'))]);
    });

    return {
      root: root,
      search: search,
      value: value,
      // Re-render the visible half from whatever id the hidden input carries.
      // Used after the saved wizard state is restored on Back/reselect.
      syncFromValue: function () {
        var item = catalog && value.value ? catalog.get(value.value) : null;
        if (item) {
          search.value = catalog.resultTitle(item);
          renderCard(item);
        } else {
          value.value = '';
          renderCard(null);
        }
      }
    };
  }

  // ── Render extra fields ───────────────────────────────────────────────────

  function renderExtraFields(doc, subject) {
    var container = document.getElementById('docwiz-extra-fields');
    if (!container) return;

    var savedState = wizardInputState[doc.id] ||
      (wizardInputState[doc.id] = { fields: Object.create(null), checks: Object.create(null) });

    container.innerHTML = '';

    if (isPackageBlocked(doc, subject)) {
      var warn = document.createElement('p');
      warn.className = 'crm-docwiz-rep-warning';
      warn.textContent = 'У субъекта нет представителей для заполнения стартового пакета.';
      container.appendChild(warn);
      return;
    }

    var effectiveFields = getEffectiveFields(doc, subject);

    if ((!effectiveFields.length) && (!doc.checkFields || !doc.checkFields.length)) {
      var p = document.createElement('p');
      p.className = 'crm-docwiz-no-fields';
      p.textContent = 'Дополнительные поля не требуются.';
      container.appendChild(p);
      return;
    }

    // Optional heading above the input grid. Operator-facing documents such as
    // the account-opening notice ask for a block of back-office data that reads
    // better under its own title than as a bare list.
    if (doc.extraGroupLabel && effectiveFields.length) {
      var groupHead = document.createElement('p');
      groupHead.className = 'crm-document-form-label';
      groupHead.textContent = doc.extraGroupLabel;
      container.appendChild(groupHead);
    }

    var grid = document.createElement('div');
    grid.className = 'crm-docwiz-fields-grid';
    var conditionalFields = [];
    var resolvedControls = [];

    effectiveFields.forEach(function (field) {
      // A derived value belongs to the payload contract but is never typed: it
      // is built by the document's payload normalizer from the fixed choices
      // and the selected instrument. Nothing is rendered for it beyond the
      // optional one-line note that tells the manager it is set for them.
      if (field.type === 'derived') {
        if (!field.staticText) return;
        var derivedNote = document.createElement('p');
        derivedNote.className = 'crm-docwiz-derived-note';
        derivedNote.textContent = field.staticText;
        grid.appendChild(derivedNote);
        return;
      }

      var wrap = document.createElement('div');
      wrap.className = 'crm-docwiz-field-wrap';
      if (field.type === 'textarea' || field.type === 'autocomplete' || field.fullWidth) {
        wrap.classList.add('crm-docwiz-field-wrap-full');
      }

      var label = document.createElement('label');
      label.className = 'crm-document-form-label';
      label.setAttribute('for', 'docwiz-field-' + field.key);
      label.textContent = field.label + (field.required ? ' *' : '');
      wrap.appendChild(label);

      var input;
      var dateField;
      var picker;
      if (field.type === 'select') {
        input = document.createElement('select');
        input.className = 'uk-select crm-input';
        var emptyOpt = document.createElement('option');
        emptyOpt.value = '';
        emptyOpt.textContent = 'Выберите…';
        input.appendChild(emptyOpt);
        getFieldOptions(field, subject).forEach(function (opt) {
          var o = document.createElement('option');
          o.value = opt.value;
          o.textContent = opt.label;
          if (field.defaultValue && opt.value === field.defaultValue) o.selected = true;
          input.appendChild(o);
        });
      } else if (field.type === 'textarea') {
        input = document.createElement('textarea');
        input.className = 'uk-textarea crm-input';
        input.rows = field.rows || 3;
        if (field.placeholder) input.placeholder = field.placeholder;
        if (field.defaultValue) input.value = field.defaultValue;
      } else if (field.type === 'date') {
        dateField = document.createElement('div');
        dateField.className = 'crm-date-field crm-docwiz-date-field';

        input = document.createElement('input');
        input.className = 'uk-input crm-input crm-date-input';
        input.type = 'date';
        input.setAttribute('data-date-input', '');
        if (field.defaultValue) input.value = field.defaultValue;

        var dateTrigger = document.createElement('button');
        dateTrigger.className = 'crm-date-trigger';
        dateTrigger.type = 'button';
        dateTrigger.setAttribute('data-date-trigger', '');
        dateTrigger.setAttribute('aria-label', 'Открыть календарь');
        dateTrigger.setAttribute('uk-icon', 'calendar');

        dateField.appendChild(input);
        dateField.appendChild(dateTrigger);
      } else if (field.type === 'number') {
        // A quantity, a price or an amount. The form asks for a number, so the
        // control accepts a number: «100 шт.» and «сто» are not values an order
        // can carry, and neither is a negative one.
        input = document.createElement('input');
        input.className = 'uk-input crm-input';
        input.type = 'number';
        input.setAttribute('inputmode', 'decimal');
        if (field.min != null) input.min = String(field.min);
        else if (field.positive) input.min = '0';
        if (field.max != null) input.max = String(field.max);
        input.step = field.step != null ? String(field.step) : 'any';
        if (field.placeholder) input.placeholder = field.placeholder;
        if (field.defaultValue) input.value = field.defaultValue;
      } else if (field.type === 'readonly') {
        // A value the CRM already holds. It is shown so the manager can check
        // it before generating, and it is not editable because retyping CRM
        // data is how a document ends up disagreeing with the record it came
        // from. `valueFrom` names where it comes from; the document's own
        // context provider resolves it, and it is refreshed on every change
        // because a payout's requisites depend on the currency chosen above.
        input = document.createElement('input');
        input.className = 'uk-input crm-input crm-input-readonly';
        input.type = 'text';
        input.readOnly = true;
        input.tabIndex = -1;
        if (field.emptyHint) input.placeholder = field.emptyHint;
      } else if (field.type === 'autocomplete') {
        picker = buildInstrumentPicker(field);
        input = picker.value;
        // The label belongs to the box the manager types in, not to the hidden
        // input that carries the chosen id.
        label.setAttribute('for', picker.search.id);
      } else {
        input = document.createElement('input');
        input.className = 'uk-input crm-input';
        input.type = 'text';
        if (field.placeholder) input.placeholder = field.placeholder;
        if (field.defaultValue) input.value = field.defaultValue;
      }

      input.id = 'docwiz-field-' + field.key;
      input.setAttribute('data-field-key', field.key);
      input.setAttribute('data-field-type', field.type || 'text');
      if (field.positive) input.setAttribute('data-field-positive', '1');
      if (field.sourceKind === 'operator-input') {
        input.setAttribute('data-source-kind', 'operator-input');
      }
      // A resolved value is re-read from the CRM on every render; restoring a
      // remembered one would show yesterday's requisite after the record moved.
      if (field.type !== 'readonly' &&
          Object.prototype.hasOwnProperty.call(savedState.fields, field.key)) {
        input.value = savedState.fields[field.key];
      }
      input.addEventListener('input', function () {
        savedState.fields[field.key] = input.value;
      });
      input.addEventListener('change', function () {
        savedState.fields[field.key] = input.value;
      });
      // A hidden input cannot be focused or reported by the browser, so a
      // required instrument is enforced by the document's own validation and
      // announced on the box the manager can actually see.
      if (field.required && field.type === 'autocomplete') {
        input.setAttribute('data-field-required', '1');
      } else if (field.required) {
        input.required = true;
      }
      if (picker) picker.syncFromValue();
      if (field.type === 'readonly') resolvedControls.push({ field: field, input: input });
      wrap.appendChild(picker ? picker.root : (dateField || input));
      grid.appendChild(wrap);
      if (field.showWhen) {
        conditionalFields.push({
          wrap: wrap,
          input: input,
          // A picker is three controls in one wrap; every one of them has to
          // go inert with the branch, or a disabled-only check would still
          // read a value out of the search box.
          controls: Array.prototype.slice.call(
            wrap.querySelectorAll('input, select, textarea')),
          condition: field.showWhen
        });
      }
    });

    container.appendChild(grid);

    // A check the form always carries is not a question. `hidden` marks such a
    // mark: it keeps its registry entry and its default, and is not offered.
    var visibleChecks = (doc.checkFields || []).filter(function (cf) { return !cf.hidden; });

    if (visibleChecks.length) {
      var checkGroup = document.createElement('div');
      checkGroup.className = 'crm-docwiz-check-group';

      var checkLabel = document.createElement('p');
      checkLabel.className = 'crm-document-form-label';
      checkLabel.textContent = doc.checkGroupLabel || 'Отметки:';
      checkGroup.appendChild(checkLabel);

      visibleChecks.forEach(function (cf) {
        var row = document.createElement('label');
        row.className = 'crm-check-row';

        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = 'docwiz-check-' + cf.key;
        cb.setAttribute('data-check-key', cf.key);
        cb.checked = Object.prototype.hasOwnProperty.call(savedState.checks, cf.key)
          ? !!savedState.checks[cf.key] : !!cf.defaultChecked;
        cb.addEventListener('change', function () {
          savedState.checks[cf.key] = cb.checked;
        });

        var span = document.createElement('span');
        span.textContent = cf.label;

        row.appendChild(cb);
        row.appendChild(span);
        checkGroup.appendChild(row);
      });

      container.appendChild(checkGroup);
    }

    function currentControlValue(source) {
      var dot = source.indexOf('.');
      if (dot === -1) return undefined;
      var namespace = source.slice(0, dot);
      var key = source.slice(dot + 1);
      if (namespace === 'subject') return subject ? subject[key] : undefined;
      var control = namespace === 'check'
        ? container.querySelector('[data-check-key="' + key + '"]')
        : container.querySelector('[data-field-key="' + key + '"]');
      if (!control) return undefined;
      return namespace === 'check' ? !!control.checked : control.value;
    }

    // A condition is either a leaf — one source compared with `equals` /
    // `notEquals` — or a combination of conditions. Order forms need the
    // combination: an внебиржевая ценная бумага is «trade AND (stock OR (otc
    // AND security))», and expressing that as one flat comparison is what
    // would put security fields on a currency order.
    function conditionMatches(condition) {
      if (!condition) return true;
      if (Array.isArray(condition.allOf)) {
        return condition.allOf.every(function (part) { return conditionMatches(part); });
      }
      if (Array.isArray(condition.anyOf)) {
        return condition.anyOf.some(function (part) { return conditionMatches(part); });
      }
      if (!condition.source) return true;
      var value = currentControlValue(condition.source);
      if (Object.prototype.hasOwnProperty.call(condition, 'equals')) {
        return Array.isArray(condition.equals)
          ? condition.equals.indexOf(value) !== -1
          : value === condition.equals;
      }
      if (Object.prototype.hasOwnProperty.call(condition, 'notEquals')) {
        return Array.isArray(condition.notEquals)
          ? condition.notEquals.indexOf(value) === -1
          : value !== condition.notEquals;
      }
      return !!value;
    }

    // Everything the document's context provider may need to answer with:
    // the values on screen right now, whatever branch they belong to.
    function currentExtraValues() {
      var values = {};
      container.querySelectorAll('[data-field-key]').forEach(function (control) {
        values[control.getAttribute('data-field-key')] = control.value || '';
      });
      return values;
    }

    function readPath(root, path) {
      var value = root;
      String(path || '').split('.').forEach(function (part) {
        value = (value && typeof value === 'object') ? value[part] : undefined;
      });
      return value == null ? '' : String(value);
    }

    function syncResolvedControls() {
      if (!resolvedControls.length) return;
      var context = typeof doc.resolveContext === 'function'
        ? (doc.resolveContext(subject, currentExtraValues()) || {}) : {};
      resolvedControls.forEach(function (entry) {
        var value = readPath(context, entry.field.valueFrom);
        if (entry.input.value === value) return;
        entry.input.value = value;
        savedState.fields[entry.field.key] = value;
      });
    }

    function syncConditionalFields() {
      conditionalFields.forEach(function (entry) {
        var visible = conditionMatches(entry.condition);
        entry.wrap.hidden = !visible;
        (entry.controls || [entry.input]).forEach(function (control) {
          control.disabled = !visible;
          if (!visible) control.classList.remove('crm-input-error');
        });
      });
    }

    function syncFields() {
      syncResolvedControls();
      syncConditionalFields();
    }

    if (conditionalFields.length || resolvedControls.length) {
      container.querySelectorAll('[data-field-key], [data-check-key]').forEach(function (control) {
        control.addEventListener('change', syncFields);
        control.addEventListener('input', syncFields);
      });
      syncFields();
    }
  }

  // ── Render account-closure step 2 (static demo) ──────────────────────────

  function renderClosureFields(doc) {
    var container = document.getElementById('docwiz-extra-fields');
    if (!container) return;

    var sources = ['Личный кабинет', 'Email', 'Офис / бумажное заявление', 'Другое'];
    var sourceOptions = sources.map(function (s) {
      return '<option value="' + escAttr(s) + '">' + escHtml(s) + '</option>';
    }).join('');

    var pickCards = (doc.contracts || []).map(function (c) {
      return '' +
        '<label class="crm-closure-pick">' +
          '<input type="checkbox" data-closure-contract value="' + escAttr(c.number) + '"' +
            (c.defaultChecked ? ' checked' : '') + '/>' +
          '<span class="crm-closure-pick-body">' +
            '<span class="crm-closure-pick-head">' +
              '<strong>' + escHtml(c.number) + '</strong>' +
              '<span class="crm-badge success">Действующий</span>' +
            '</span>' +
            '<span class="crm-closure-pick-type">' + escHtml(c.type) + '</span>' +
            '<span class="crm-closure-pick-account">Счёт: ' + escHtml(c.account) + '</span>' +
          '</span>' +
        '</label>';
    }).join('');

    container.innerHTML = '' +
      '<div class="crm-closure-fields">' +
        '<div class="crm-docwiz-fields-grid">' +
          '<div class="crm-closure-field">' +
            '<label class="crm-document-form-label" for="closure-source">Источник заявки</label>' +
            '<select class="uk-select crm-input" id="closure-source">' + sourceOptions + '</select>' +
          '</div>' +
          '<div class="crm-closure-field">' +
            '<label class="crm-document-form-label" for="closure-request-date">Дата обращения клиента</label>' +
            '<div class="crm-date-field crm-docwiz-date-field">' +
              '<input class="uk-input crm-input crm-date-input" type="date" id="closure-request-date" value="2026-06-15" data-date-input/>' +
              '<button class="crm-date-trigger" type="button" data-date-trigger aria-label="Открыть календарь" uk-icon="calendar"></button>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="crm-closure-field">' +
          '<span class="crm-document-form-label">Договоры и счета к закрытию</span>' +
          '<div class="crm-closure-pick-list">' + pickCards + '</div>' +
        '</div>' +

        '<div class="crm-closure-field">' +
          '<label class="crm-document-form-label" for="closure-comment">Комментарий менеджера</label>' +
          '<textarea class="uk-textarea crm-input" id="closure-comment" rows="2" ' +
            'placeholder="Например: По инициативе клиента"></textarea>' +
        '</div>' +

        '<div class="crm-closure-field">' +
          '<span class="crm-document-form-label">Вложение — заявление клиента</span>' +
          '<div class="crm-dropzone has-file" data-role="closure-dropzone">' +
            '<input type="file" data-role="closure-file-input" hidden/>' +
            '<span class="crm-dropzone-icon" uk-icon="icon: cloud-upload; ratio: 1.4"></span>' +
            '<p class="crm-dropzone-title">Перетащите заявление клиента сюда</p>' +
            '<p class="crm-dropzone-sub">или выберите файл вручную</p>' +
            '<button type="button" class="uk-button uk-button-default crm-button" ' +
              'data-role="closure-pick-btn" data-action="closure-pick-file">Выбрать другой файл</button>' +
            '<span class="crm-dropzone-file" data-role="closure-file">' +
              '<span class="crm-dropzone-file-icon" uk-icon="icon: file-text"></span>' +
              '<span class="crm-dropzone-file-name" data-role="closure-file-name">Заявление_на_закрытие.pdf</span>' +
              '<button type="button" class="crm-dropzone-remove" data-action="closure-remove-file" ' +
                'aria-label="Удалить файл">×</button>' +
            '</span>' +
            '<p class="crm-dropzone-help">Static demo: файл не загружается на сервер</p>' +
          '</div>' +
        '</div>' +
      '</div>';

    wireClosureDropzone();
  }

  // ── Attachment dropzone (static demo — no real upload) ────────────────────

  function wireClosureDropzone() {
    var zone = document.querySelector('[data-role="closure-dropzone"]');
    if (!zone) return;

    var input  = zone.querySelector('[data-role="closure-file-input"]');
    var chip   = zone.querySelector('[data-role="closure-file"]');
    var nameEl = zone.querySelector('[data-role="closure-file-name"]');
    var pickBtn = zone.querySelector('[data-role="closure-pick-btn"]');

    function setFile(name) {
      if (name) {
        if (nameEl) nameEl.textContent = name;
        if (chip) chip.hidden = false;
        zone.classList.add('has-file');
        if (pickBtn) pickBtn.textContent = 'Выбрать другой файл';
      } else {
        if (chip) chip.hidden = true;
        zone.classList.remove('has-file');
        if (pickBtn) pickBtn.textContent = 'Выбрать файл';
        if (input) input.value = '';
      }
    }

    // Click-to-select / replace / remove
    zone.addEventListener('click', function (e) {
      var act = e.target.closest('[data-action]');
      if (!act) return;
      var name = act.getAttribute('data-action');
      if (name === 'closure-pick-file') {
        e.preventDefault();
        if (input) input.click();
      } else if (name === 'closure-remove-file') {
        e.preventDefault();
        setFile('');
      }
    });

    if (input) {
      input.addEventListener('change', function () {
        if (input.files && input.files.length) setFile(input.files[0].name);
      });
    }

    // Drag-and-drop (visual only — nothing is uploaded)
    ['dragenter', 'dragover'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.add('is-dragover');
      });
    });

    zone.addEventListener('dragleave', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (zone.contains(e.relatedTarget)) return; // still inside the zone
      zone.classList.remove('is-dragover');
    });

    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.remove('is-dragover');
      var files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length) setFile(files[0].name);
    });
  }

  // ── Collect closure data + create the request in shared demo state ────────

  function collectClosureData(doc, subject) {
    var contracts = [];
    document.querySelectorAll('[data-closure-contract]:checked').forEach(function (cb) {
      var match = (doc.contracts || []).find(function (c) { return c.number === cb.value; });
      if (match) contracts.push({ number: match.number, type: match.type, account: match.account });
    });

    var sourceEl  = document.getElementById('closure-source');
    var commentEl = document.getElementById('closure-comment');
    var zone      = document.querySelector('[data-role="closure-dropzone"]');
    var nameEl    = document.querySelector('[data-role="closure-file-name"]');
    var hasFile   = zone && zone.classList.contains('has-file');

    return {
      subjectId: subject.id,
      client: subject.displayName,
      clientCode: subject.code,
      manager: 'Иванов И.И.',
      source: sourceEl ? sourceEl.value : 'Личный кабинет',
      managerComment: commentEl ? commentEl.value.trim() : '',
      attachmentName: (hasFile && nameEl) ? nameEl.textContent.trim() : '',
      contracts: contracts
    };
  }

  function createClosureRequest(doc, subject) {
    var data = collectClosureData(doc, subject);
    if (!data.contracts.length) {
      alert('Выберите хотя бы один договор или счёт для закрытия.');
      return;
    }
    var id = (window.CrmClosureDemo && window.CrmClosureDemo.upsertFromWizard)
      ? window.CrmClosureDemo.upsertFromWizard(data)
      : 'CL-2026-00017';
    window.location.href = 'account-closure-request.html?role=manager&request=' + encodeURIComponent(id);
  }

  // ── Render document cards ─────────────────────────────────────────────────

  function renderDocCards(docs, subject) {
    var grid = document.getElementById('docwiz-doc-grid');
    if (!grid) return;

    grid.innerHTML = '';

    if (!docs.length) {
      grid.innerHTML = '<p class="crm-docwiz-no-results">Документы по заданным условиям не найдены.</p>';
      return;
    }

    // Group by category (default group for documents without an explicit one).
    var DEFAULT_CATEGORY = 'Документы и заявления клиента';
    var groupOrder = [];
    var groups = {};
    docs.forEach(function (doc) {
      var cat = doc.category || DEFAULT_CATEGORY;
      if (!groups[cat]) { groups[cat] = []; groupOrder.push(cat); }
      groups[cat].push(doc);
    });

    function appendDocCard(doc) {
      var card = document.createElement('article');
      card.className = 'crm-docwiz-doc-card';
      card.setAttribute('data-doc-id', doc.id);

      // Optional meta line: how many PDFs a package generates ("3 PDF-документа").
      var meta = (doc.packageDocuments && doc.packageDocuments.length)
        ? '<p class="crm-docwiz-doc-meta">' + doc.packageDocuments.length + ' PDF-документа</p>'
        : '';

      card.innerHTML =
        '<div class="crm-docwiz-doc-icon" aria-hidden="true">' +
          '<span uk-icon="file-text"></span>' +
        '</div>' +
        '<div class="crm-docwiz-doc-info">' +
          '<p class="crm-docwiz-doc-title">' + escHtml(doc.title) + '</p>' +
          '<p class="crm-docwiz-doc-desc">' + escHtml(doc.description) + '</p>' +
          meta +
        '</div>' +
        '<div class="crm-docwiz-doc-action">' +
          '<button class="uk-button crm-button-primary crm-button crm-docwiz-select-btn" ' +
                  'type="button" data-doc-id="' + escAttr(doc.id) + '">' +
            'Выбрать' +
          '</button>' +
        '</div>';

      grid.appendChild(card);
    }

    // Render each category as a normal stacked list of rows. Group headings are
    // shown only when more than one category is present.
    var showGroupTitles = groupOrder.length > 1;
    groupOrder.forEach(function (cat) {
      if (showGroupTitles) {
        var title = document.createElement('p');
        title.className = 'crm-docwiz-doc-group-title';
        title.textContent = cat;
        grid.appendChild(title);
      }
      groups[cat].forEach(function (doc) { appendDocCard(doc); });
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
    // A print-only wording belongs to one generation of one document; picking
    // another document must never carry it over.
    clearPrintOverrides();

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

    if (doc.closure) {
      renderClosureFields(doc);
    } else {
      renderExtraFields(doc, subject);
    }

    if (step2) step2.hidden = false;
    if (step3) step3.hidden = false;

    setActiveStep(2);

    if (step2) step2.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Reset any PDF status / download links from a previously selected document.
    resetPdfStatus();

    var isPackage = !!(doc.packageDocuments && doc.packageDocuments.length);
    // PDF-capable = a rendering strategy is configured, whichever one it is.
    var hasPdf    = !!resolveRenderStrategy(doc);
    var blocked   = isPackageBlocked(doc, subject);

    // Privacy note (short) is relevant only for the local PDF flow.
    var secNote = document.getElementById('docwiz-security-note');
    if (secNote) secNote.hidden = !hasPdf;

    // Technical details live in a collapsed <details> shown only for PDF docs.
    var techDetails = document.getElementById('docwiz-tech-details');
    if (techDetails) {
      techDetails.hidden = !hasPdf;
      techDetails.open = false;
    }

    // Step 3 note: a compact one-liner (verbose explanation lives in <details>).
    var pdfBtnLabel = isPackage ? 'Сформировать комплект PDF' : 'Сформировать PDF';
    var noteEl = step3 ? step3.querySelector('.crm-docwiz-generate-note') : null;
    if (noteEl) {
      noteEl.textContent = doc.closure
        ? 'Static demo: после создания открывается карточка заявки на закрытие.'
        : isPackage
          ? 'Формируется ' + doc.packageDocuments.length + ' ' +
            filesWord(doc.packageDocuments.length) + ' PDF.'
          : hasPdf
            ? 'Документ формируется в PDF.'
            : 'PDF-шаблон пока не подключён.';
    }

    // Wire closure generate button (replace to remove stale listeners). The old
    // HTML print action is gone; this button now serves the operational closure
    // flow only.
    var genBtn = document.getElementById('docwiz-generate-btn');
    if (genBtn) {
      var newGen = genBtn.cloneNode(true);
      newGen.id = 'docwiz-generate-btn';
      genBtn.parentNode.replaceChild(newGen, genBtn);
      if (doc.closure) {
        newGen.hidden = false;
        newGen.textContent = 'Создать заявку';
        newGen.addEventListener('click', function () { createClosureRequest(doc, subject); });
      } else {
        newGen.hidden = true;
      }
    }

    // Wire PDF generate button. Shown only for non-closure documents that have a
    // PDF template or a PDF package. A legal entity without representatives keeps
    // the button disabled (the starter package cannot be filled).
    var pdfBtn = document.getElementById('docwiz-generate-pdf-btn');
    if (pdfBtn) {
      var newPdf = pdfBtn.cloneNode(true);
      newPdf.id = 'docwiz-generate-pdf-btn';
      pdfBtn.parentNode.replaceChild(newPdf, pdfBtn);
      if (!doc.closure && hasPdf) {
        newPdf.hidden = false;
        newPdf.textContent = pdfBtnLabel;
        if (blocked) {
          newPdf.disabled = true;
          setPdfStatus('У субъекта нет представителей для заполнения стартового пакета.', 'warn');
        } else {
          newPdf.disabled = false;
          newPdf.addEventListener('click', function () { generatePdf(doc, subject); });
        }
      } else {
        newPdf.hidden = true;
        if (!doc.closure && !hasPdf) {
          setPdfStatus('PDF-шаблон пока не подключён.', 'warn');
        }
      }
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
        resetPdfStatus();
        setActiveStep(1);
        document.querySelectorAll('.crm-docwiz-doc-card').forEach(function (c) {
          c.classList.remove('crm-docwiz-doc-card-selected');
        });
      });
    }
  }

  // ── Shared payload builder (local PDF flow) ───────────────────────────────

  // An instrument picker keeps its value in a hidden input, which cannot be
  // focused and cannot show an error. Both belong on the box the manager typed
  // into, so every message about a picker is routed here first.
  function pickerSearchInput(el) {
    var key = el.getAttribute('data-field-key');
    return document.querySelector(
      '#docwiz-extra-fields [data-autocomplete-for="' + escAttr(key) + '"]');
  }

  // A numeric control the browser accepted may still hold a value the business
  // does not: a quantity or a price has to be a real number above zero.
  function numberProblem(el, value) {
    if (el.validity.badInput) return 'Введите число.';
    if (!value) return '';
    var parsed = Number(String(value).replace(',', '.'));
    if (!isFinite(parsed)) return 'Введите число.';
    if (el.getAttribute('data-field-positive') === '1' && parsed <= 0) {
      return 'Значение должно быть больше нуля.';
    }
    if (el.validity.rangeUnderflow) return 'Значение должно быть не меньше ' + el.min + '.';
    if (el.validity.rangeOverflow) return 'Значение должно быть не больше ' + el.max + '.';
    if (el.validity.stepMismatch) {
      return el.step === '1' ? 'Введите целое число.' : 'Проверьте точность введённого числа.';
    }
    var key = el.getAttribute('data-field-key');
    if ((key === 'extra-move-amount' || key === 'extra-payout-amount') && window.CRMOrderForms) {
      return window.CRMOrderForms.moneyProblem(value);
    }
    return '';
  }

  // Typing into a picker is a search, not an answer. Text with no selection
  // behind it is the case this exists for: it looks filled in and is not.
  function pickerProblem(el, value) {
    if (value) return '';
    var search = pickerSearchInput(el);
    if (search && String(search.value || '').trim()) {
      return 'Выберите значение из списка — введённый текст не является выбранным значением.';
    }
    if (el.getAttribute('data-field-required') === '1') {
      return 'Выберите значение из справочника.';
    }
    return '';
  }

  // Validates visible required fields, collects extra/check values and builds
  // the normalized field/check maps consumed by the local PDF generation flow.
  function buildDocumentPayload(doc, subject) {
    var extraValues  = {};
    var checkValues  = {};
    var valid        = true;
    var firstInvalid = null;
    var validationMessage = '';

    // Collect text/date/select/number/picker values from [data-field-key].
    document.querySelectorAll('#docwiz-extra-fields [data-field-key]').forEach(function (el) {
      var key = el.getAttribute('data-field-key');
      var val = (el.value || '').trim();
      var type = el.getAttribute('data-field-type');
      extraValues[key] = val;
      if (el.disabled) return;
      var invalidDate = type === 'date' && !!val && !isValidIsoDate(val);
      var problem = type === 'number' ? numberProblem(el, val)
        : type === 'autocomplete' ? pickerProblem(el, val) : '';
      // A picker's error belongs on its search box; everything else marks
      // itself.
      var marker = type === 'autocomplete' ? (pickerSearchInput(el) || el) : el;
      if ((el.required && !val) || invalidDate || problem) {
        marker.classList.add('crm-input-error');
        valid = false;
        if (!firstInvalid) firstInvalid = marker;
        if (!validationMessage) {
          if (invalidDate) validationMessage = 'Введите корректную дату.';
          else if (problem) validationMessage = problem;
        }
      } else {
        marker.classList.remove('crm-input-error');
      }
    });

    // Collect checkbox values from [data-check-key].
    document.querySelectorAll('#docwiz-extra-fields [data-check-key]').forEach(function (el) {
      checkValues[el.getAttribute('data-check-key')] = el.checked;
    });

    // Order forms: three forms in one file, and four mutually exclusive
    // instrument blocks inside the trade form. Only the branch the manager
    // filled may contribute values, and the values a manager must not type are
    // derived here rather than collected. See document-wizard/order-forms-model.js.
    if (doc.id === 'order-forms') {
      if (window.CRMOrderForms) {
        // The bank requisites a payout needs are CRM data, so a gap in them is
        // reported the way a missing input is: against the exact rows, by
        // name. A half-filled payout order is not something to hand a client.
        window.CRMOrderForms.validate(subject, extraValues).forEach(function (problem) {
          var control = document.querySelector(
            '#docwiz-extra-fields [data-field-key="' + escAttr(problem.key) + '"]');
          if (control) control.classList.add('crm-input-error');
          valid = false;
          if (!firstInvalid && control) firstInvalid = control;
          if (!validationMessage) validationMessage = problem.message;
        });

        var normalized = window.CRMOrderForms.normalize(extraValues, checkValues, subject);
        extraValues = normalized.extraValues;
        checkValues = normalized.checkValues;
      } else {
        console.error('Document Wizard: order-forms payload model is not loaded. ' +
          'Check that assets/js/document-wizard/order-forms-model.js is included ' +
          'before document-wizard.js.');
        valid = false;
        validationMessage = 'Модуль поручений не загружен — обратитесь в поддержку.';
      }
    }

    (doc.validationRules || []).forEach(function (rule) {
      if (rule.type !== 'atLeastOneCheck') return;
      var selected = (rule.keys || []).some(function (key) { return !!checkValues[key]; });
      if (!selected) {
        valid = false;
        if (!validationMessage) {
          validationMessage = rule.message || 'Выберите хотя бы один вариант.';
        }
      }
    });

    // Select values that drive derived checkbox state.
    if (doc.id === 'code-word-request') {
      checkValues['extra-code-word-operation'] = extraValues['extra-code-word-operation'] || '';
    }
    if (doc.id === 'anketa-fl' || doc.id === 'anketa-yul') {
      checkValues['extra-questionnaire-role'] = extraValues['extra-questionnaire-role'] || '';
      checkValues['extra-questionnaire-mode'] = extraValues['extra-questionnaire-mode'] || '';
    }

    return {
      doc:          doc,
      subject:      subject,
      valid:        valid,
      firstInvalid: firstInvalid,
      validationMessage: validationMessage,
      extraValues:  extraValues,
      checkValues:  checkValues,
      umi:          buildUmi(subject),
      fields:       buildFields(subject, extraValues),
      checks:       buildChecks(doc, checkValues, extraValues, subject),
      // Print-only wording the operator supplied for this generation. Never
      // written back to the subject; only fields whose map allows it are used.
      printOverrides: printOverrides,
      pdfFilename:  doc.pdfOutputFilename || (doc.id + '.pdf')
    };
  }

  // ── Local PDF generation (pdf-lib, no CDN, no canvas, no html2pdf) ─────────

  // Single source of truth for "how does this document become a PDF?".
  // The production visibility filter, the step-3 capability check and the
  // generation dispatch all read this, so adding a rendering strategy never
  // means updating a hardcoded allowlist in three separate places.
  //
  //   'package'  — one wizard item that emits several child PDFs
  //   'overlay'  — values drawn onto a Word-derived template (document-engine)
  //   'acroform' — legacy: fill the AcroForm fields of a prepared PDF
  //   null       — no PDF rendering configured for this document
  function resolveRenderStrategy(doc) {
    if (!doc) return null;
    if (doc.packageDocuments && doc.packageDocuments.length) return 'package';
    if (doc.overlayTemplateId) return 'overlay';
    if (doc.pdfTemplateUrl) return 'acroform';
    return null;
  }

  // Coordinate map registered by assets/js/document-field-maps/<id>.js.
  function getOverlayTemplate(doc) {
    var engine = window.CRMDocumentEngine;
    if (!engine || !engine.fieldMaps || !doc || !doc.overlayTemplateId) return null;
    return engine.fieldMaps[doc.overlayTemplateId] || null;
  }

  // PDF status helpers.
  function setPdfStatus(msg, kind) {
    var statusEl = document.getElementById('docwiz-pdf-status');
    if (!statusEl) return;
    statusEl.textContent = msg || '';
    statusEl.className = 'crm-docwiz-pdf-status' + (kind ? (' is-' + kind) : '');
  }

  // ── Print overrides ────────────────────────────────────────────────────────
  //
  // An operator-editable print representation for the current document only.
  // The CRM record is never touched, and only fields whose map sets
  // `allowPrintOverride: true` can have one — never a name, an identifier, a
  // passport or tax number, or any other exact legal value.
  var printOverrides = {};

  function clearPrintOverrides() {
    printOverrides = {};
  }

  // Clear status and revoke every tracked Object URL so selecting another
  // document never leaks blobs from a previous generation.
  function resetPdfStatus() {
    setPdfStatus('');
    clearOverflowReport();
    clearExpansionNotice();
    var box = document.getElementById('docwiz-pdf-downloads');
    if (!box) return;
    box.querySelectorAll('a[data-object-url]').forEach(function (a) {
      var url = a.getAttribute('data-object-url');
      if (url) { try { URL.revokeObjectURL(url); } catch (e) {} }
    });
    box.innerHTML = '';
    box.hidden = true;
  }

  // ── Layout expansion notice ───────────────────────────────────────────────
  //
  // Purely informational, and neutral: the document grew a line, the manager
  // has nothing to choose and nothing to fix. Never ask them to shorten a legal
  // name, drop part of an address or pick a smaller font.
  var expansionNotes = [];

  // Layout internals are useful to document developers, but field IDs, font
  // limits and shift counts are not manager-facing information.  They are
  // exposed only after an explicit opt-in (`?document-debug=1` or the matching
  // global flag) and never appear in the normal workflow.
  function documentDebugEnabled() {
    if (window.CRM_DOCUMENT_DEBUG === true) return true;
    try {
      return new URLSearchParams(window.location.search).get('document-debug') === '1';
    } catch (e) {
      return false;
    }
  }

  function noteExpansion(doc, notes) {
    expansionNotes = (notes || []).map(function (note) {
      return { documentTitle: doc.title, label: note.label, rows: note.rows };
    });
  }

  function clearExpansionNotice() {
    expansionNotes = [];
    var box = document.getElementById('docwiz-pdf-expansion');
    if (!box) return;
    box.innerHTML = '';
    box.hidden = true;
  }

  function renderExpansionNotice() {
    var box = document.getElementById('docwiz-pdf-expansion');
    if (!box) return;
    box.innerHTML = '';
    if (!expansionNotes.length) { box.hidden = true; return; }

    var head = document.createElement('p');
    head.className = 'crm-docwiz-expansion-head';
    // Neutral and factual: the manager is told what happened, never asked to
    // shorten a legal identity value or to pick a template variant.
    head.textContent = 'Длинные реквизиты будут автоматически перенесены на ' +
      'дополнительные строки с сохранением структуры документа.';
    box.appendChild(head);

    if (documentDebugEnabled()) {
      var details = document.createElement('details');
      details.className = 'crm-docwiz-expansion-debug';
      var summary = document.createElement('summary');
      summary.textContent = 'Технические сведения';
      details.appendChild(summary);
      var list = document.createElement('ul');
      list.className = 'crm-docwiz-expansion-list';
      expansionNotes.forEach(function (note) {
        var item = document.createElement('li');
        item.textContent = note.label + ' — ' + note.rows + ' ' +
          rowsWord(note.rows) + ' в «' + note.documentTitle + '»';
        list.appendChild(item);
      });
      details.appendChild(list);
      box.appendChild(details);
    }
    box.hidden = false;
  }

  // Russian plural for "строка" (1 строка / 3 строки / 5 строк).
  function rowsWord(n) {
    var d = n % 10, dd = n % 100;
    if (d === 1 && dd !== 11) return 'дополнительная строка';
    if (d >= 2 && d <= 4 && (dd < 10 || dd >= 20)) return 'дополнительные строки';
    return 'дополнительных строк';
  }

  // ── Layout preflight result ───────────────────────────────────────────────

  function clearOverflowReport() {
    var box = document.getElementById('docwiz-pdf-overflow');
    if (!box) return;
    box.innerHTML = '';
    box.hidden = true;
    document.querySelectorAll('#docwiz-extra-fields .crm-input-overflow')
      .forEach(function (el) { el.classList.remove('crm-input-overflow'); });
  }

  // The wizard input behind an `extra.*` source, so the manager can be sent
  // straight to the value that needs correcting.
  function inputForSource(source) {
    if (!source || source.indexOf('extra.') !== 0) return null;
    var key = source.slice(6);
    return document.querySelector('#docwiz-extra-fields [data-field-key="' +
      key.replace(/"/g, '\\"') + '"]');
  }

  function focusOverflowField(source) {
    var input = inputForSource(source);
    if (!input) return false;
    document.querySelectorAll('#docwiz-extra-fields .crm-input-overflow')
      .forEach(function (el) { el.classList.remove('crm-input-overflow'); });
    input.classList.add('crm-input-overflow');
    setActiveStep(2);
    try { input.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
    input.focus();
    return true;
  }

  // Render one actionable entry per value the production engine could not
  // print. Normal users see only business-facing guidance. Exact field IDs,
  // font limits and line capacities are available in explicit debug mode.
  function renderOverflowReport(error, doc, onRetry) {
    var box = document.getElementById('docwiz-pdf-overflow');
    if (!box) return;
    box.innerHTML = '';

    var head = document.createElement('p');
    head.className = 'crm-docwiz-overflow-head';
    head.textContent = 'Документ «' + (error.documentTitle || doc.title) +
      '» не сформирован: значения не помещаются в отведённые места формы.';
    box.appendChild(head);

    (error.overflows || []).forEach(function (item) {
      var entry = document.createElement('div');
      entry.className = 'crm-docwiz-overflow-item';

      var title = document.createElement('p');
      title.className = 'crm-docwiz-overflow-field';
      title.textContent = item.label && item.label !== item.fieldId
        ? item.label : 'Значение документа';
      entry.appendChild(title);

      var why = document.createElement('p');
      why.className = 'crm-docwiz-overflow-why';
      why.textContent = item.editable
        ? 'Значение слишком длинное для утверждённой области формы. Проверьте введённые данные.'
        : 'Значение не помещается в утверждённую область формы.';
      entry.appendChild(why);

      if (documentDebugEnabled()) {
        var debug = document.createElement('details');
        debug.className = 'crm-docwiz-overflow-debug';
        var debugSummary = document.createElement('summary');
        debugSummary.textContent = 'Технические сведения';
        debug.appendChild(debugSummary);
        var meta = document.createElement('p');
        meta.className = 'crm-docwiz-overflow-meta';
        meta.textContent = 'Поле: ' + item.fieldId +
          (item.valueLength != null ? ' · длина значения: ' + item.valueLength + ' симв.' : '') +
          (item.minFontSize != null ? ' · минимальный кегль: ' + item.minFontSize + ' pt' : '') +
          (item.lineCapacity != null ? ' · доступно строк: ' + item.lineCapacity : '') +
          (item.message ? ' · ' + item.message : '');
        debug.appendChild(meta);
        entry.appendChild(debug);
      }

      if (item.editable && inputForSource(item.source)) {
        // Operator-entered value: send them back to it, keeping everything
        // else they have already filled in.
        var fix = document.createElement('button');
        fix.type = 'button';
        fix.className = 'crm-docwiz-overflow-action';
        fix.textContent = 'Перейти к полю и исправить значение';
        fix.addEventListener('click', function () { focusOverflowField(item.source); });
        entry.appendChild(fix);
      } else if (item.allowPrintOverride) {
        // Explicitly permitted by the field map: the manager may supply a
        // shorter printed wording. The CRM value stays exactly as it is.
        entry.appendChild(buildPrintOverrideControl(item, onRetry));
      } else {
        // CRM legal or identity data: never silently altered, and the manager
        // is not asked to shorten it.
        var note = document.createElement('p');
        note.className = 'crm-docwiz-overflow-note';
        note.textContent = 'Значение получено из карточки субъекта и не может ' +
          'быть сокращено при печати. Обратитесь в поддержку — для этого поля ' +
          'нужно расширить разметку документа.';
        entry.appendChild(note);
      }

      box.appendChild(entry);
    });

    box.hidden = false;
  }

  function buildPrintOverrideControl(item, onRetry) {
    var wrap = document.createElement('div');
    wrap.className = 'crm-docwiz-overflow-override';

    var label = document.createElement('label');
    label.className = 'crm-docwiz-overflow-override-label';
    label.textContent = 'Текст только для печати этого документа ' +
      '(значение в карточке субъекта не меняется)';
    var id = 'docwiz-override-' + item.fieldId;
    label.setAttribute('for', id);
    wrap.appendChild(label);

    var input = document.createElement('input');
    input.type = 'text';
    input.id = id;
    input.className = 'crm-input';
    input.value = printOverrides[item.fieldId] || item.value || '';
    wrap.appendChild(input);

    var apply = document.createElement('button');
    apply.type = 'button';
    apply.className = 'crm-docwiz-overflow-action';
    apply.textContent = 'Применить и сформировать заново';
    apply.addEventListener('click', function () {
      var value = (input.value || '').trim();
      if (!value) { input.focus(); return; }
      printOverrides[item.fieldId] = value;
      if (typeof onRetry === 'function') onRetry();
    });
    wrap.appendChild(apply);

    return wrap;
  }

  // Render one compact download link per generated PDF. Uses the document's
  // short downloadLabel ("Скачать уведомления") when present, otherwise a
  // generic "Скачать: <title>".
  function renderDownloadLinks(results) {
    var box = document.getElementById('docwiz-pdf-downloads');
    if (!box) return;
    box.innerHTML = '';
    results.forEach(function (item) {
      var url = URL.createObjectURL(item.blob);
      var a = document.createElement('a');
      a.className = 'crm-docwiz-pdf-download';
      a.href = url;
      a.setAttribute('download', item.filename);
      a.setAttribute('data-object-url', url);
      a.textContent = item.downloadLabel || ('Скачать: ' + item.title);
      box.appendChild(a);
    });
    box.hidden = results.length === 0;
  }

  // Russian plural for "файл" (1 файл / 3 файла / 5 файлов).
  function filesWord(n) {
    var d = n % 10, dd = n % 100;
    if (d === 1 && dd !== 11) return 'файл';
    if (d >= 2 && d <= 4 && (dd < 10 || dd >= 20)) return 'файла';
    return 'файлов';
  }

  // Cyrillic-capable font bytes, fetched once from the local assets folder and
  // reused for every PDF in a package. Never fetched from a CDN.
  var _pdfFontBytesPromise = null;
  function loadPdfFontBytes() {
    if (!_pdfFontBytesPromise) {
      var url;
      try { url = new URL(PDF_FONT_URL, window.location.href).href; }
      catch (e) { return Promise.reject(new Error('Не удалось определить URL шрифта PDF.')); }
      _pdfFontBytesPromise = fetch(url).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.arrayBuffer();
      });
    }
    return _pdfFontBytesPromise;
  }

  // Resolve a payload path to its raw value. Supported namespaces:
  //   umi.*     -> the exact UMI names, via document-engine/umi-adapter.js
  //   subject.* -> payload.subject       (e.g. subject.displayName)
  //   field.*   -> payload.fields        (e.g. field.clientFullName)
  //   extra.*   -> payload.extraValues   (e.g. extra.extra-document-date)
  //   check.*   -> payload.checks        (e.g. check.notice-scope-all)
  // Unknown namespace or missing key -> undefined. The resolver does NOT coerce
  // to '' / false; callers (applyPdfFieldValue) apply defaults after resolution.
  //
  // The UMI adapter is the single normalization layer, so this path and the
  // renderer's cannot disagree about what a source name means. The inline
  // fallback below only runs if the adapter script is missing from the page.
  function resolvePdfValue(ref, payload) {
    if (!ref || typeof ref !== 'string' || !payload) return undefined;
    var adapter = window.CRMDocumentEngine && window.CRMDocumentEngine.umiAdapter;
    if (adapter) return adapter.resolve(ref, payload);
    var dot = ref.indexOf('.');
    if (dot === -1) return undefined;
    var ns  = ref.slice(0, dot);
    var key = ref.slice(dot + 1);

    var source;
    if (ns === 'subject')     source = payload.subject;
    else if (ns === 'field')  source = payload.fields;
    else if (ns === 'extra')  source = payload.extraValues;
    else if (ns === 'check')  source = payload.checks;
    else return undefined;

    if (!source || !Object.prototype.hasOwnProperty.call(source, key)) return undefined;
    return source[key];
  }

  // Apply a resolved value to an AcroForm field, defaulting here (not in the
  // resolver). Text fields receive '' when value is undefined/null; checkboxes
  // map truthiness to check/uncheck. Other field kinds are skipped gracefully.
  function applyPdfFieldValue(field, value, pdfName) {
    try {
      if (typeof field.setText === 'function') {
        field.setText(value === undefined || value === null ? '' : String(value));
      } else if (typeof field.check === 'function' && typeof field.uncheck === 'function') {
        if (value) field.check(); else field.uncheck();
      }
      // Dropdowns / radio groups / buttons: skipped intentionally.
    } catch (e) {
      console.warn('Could not set PDF field "' + pdfName + '":', e);
    }
  }

  // Fill mapped AcroForm fields, regenerate appearances with the embedded
  // Cyrillic font, optionally flatten, and return a PDF Blob. cyrillicFont may
  // be null when fontkit is unavailable (falls back to default appearances).
  function finishFill(pdfDoc, form, fields, doc, payload, cyrillicFont) {
    var PDFLib = window.PDFLib;

    // 1) Explicit mapping from doc.pdfFieldMap (authoritative).
    var handled = {};
    var fieldMap = doc.pdfFieldMap || {};
    Object.keys(fieldMap).forEach(function (pdfName) {
      var field;
      try {
        field = form.getField(pdfName);
      } catch (e) {
        // Mapped field not present in this template — warn, do not crash.
        console.warn('PDF template has no field "' + pdfName + '" — skipped.');
        return;
      }
      handled[pdfName] = true;
      applyPdfFieldValue(field, resolvePdfValue(fieldMap[pdfName], payload), pdfName);
    });

    // 2) Direct field-name fallback. For any field not covered by an explicit
    // mapping, treat its AcroForm name as a payload path (e.g.
    // "subject.displayName", "field.clientFullName", "check.notice-scope-all").
    // Only applied when a value actually resolves, so unmapped fields stay
    // untouched and do not generate noisy warnings.
    fields.forEach(function (field) {
      var pdfName = field.getName();
      if (handled[pdfName]) return;
      var value = resolvePdfValue(pdfName, payload);
      if (value === undefined || value === null) return;       // no mapping
      if (typeof value === 'string' && value === '') return;   // empty string -> skip
      applyPdfFieldValue(field, value, pdfName);
    });

    // Generate field appearances with the embedded Cyrillic font BEFORE
    // flattening, so the baked-in text uses a Unicode-capable font (the 14
    // standard fonts are WinAnsi-only and cannot draw Cyrillic).
    try {
      if (cyrillicFont) form.updateFieldAppearances(cyrillicFont);
      else form.updateFieldAppearances();
    } catch (e) {
      console.warn('updateFieldAppearances failed:', e);
    }

    if (PDF_FLATTEN_FORM) {
      // Final client-facing document: bake appearances into page content.
      try {
        form.flatten({ updateFieldAppearances: false });
        removeDanglingAnnots(pdfDoc);
      } catch (e) {
        console.warn('Form flatten failed:', e);
      }
    } else {
      // Keep editable: NeedAppearances asks viewers to refresh field rendering.
      try {
        form.acroForm.dict.set(PDFLib.PDFName.of('NeedAppearances'), PDFLib.PDFBool.True);
      } catch (e) {
        console.warn('Could not set NeedAppearances flag:', e);
      }
    }

    return pdfDoc.save({ updateFieldAppearances: false }).then(function (bytes) {
      return new Blob([bytes], { type: 'application/pdf' });
    });
  }

  // flatten() leaves the flattened widgets' references in each page's /Annots
  // array, dangling in the xref (some viewers warn). Keep only annotation refs
  // that still resolve — this preserves real link annotations and drops the
  // now-empty widgets whose appearance is already baked into page content.
  function removeDanglingAnnots(pdfDoc) {
    var PDFLib = window.PDFLib;
    var ctx = pdfDoc.context;
    var Annots = PDFLib.PDFName.of('Annots');
    pdfDoc.getPages().forEach(function (page) {
      var annots = page.node.lookup(Annots);
      if (!annots || !annots.array) return;
      var kept = annots.array.filter(function (ref) { return !!ctx.lookup(ref); });
      if (kept.length === annots.array.length) return;
      if (kept.length === 0) page.node.delete(Annots);
      else page.node.set(Annots, ctx.obj(kept));
    });
  }

  // Draw the payload onto a Word-derived PDF template with the overlay engine.
  // The result is ordinary static page content: no AcroForm, no widgets and no
  // appended data sheet — the document looks as if it had been typed in Word.
  function generatePdfByOverlay(payload) {
    var doc = payload.doc;
    var engine = window.CRMDocumentEngine;
    if (!engine || !engine.overlayRenderer) {
      console.error('Document "' + doc.id + '": document-engine scripts are not loaded.');
      return Promise.reject(new Error('Модуль формирования документов не загружен.'));
    }
    var template = getOverlayTemplate(doc);
    if (!template) {
      console.error('Document "' + doc.id + '": overlay map "' +
        doc.overlayTemplateId + '" is not registered.');
      return Promise.reject(new Error('Карта полей документа не загружена.'));
    }
    return engine.overlayRenderer.render(template, {
      subject:        payload.subject,
      umi:            payload.umi || {},
      fields:         payload.fields,
      extraValues:    payload.extraValues,
      checks:         payload.checks,
      printOverrides: payload.printOverrides || {}
    }, {
      validatePayload: true,
      // Expansion is automatic: the manager picks no template variant and no
      // mode. They are simply told that a value moved onto an added line.
      onExpansion: function (notes) { noteExpansion(doc, notes); }
    });
  }

  // Load the local PDF template, fill mapped AcroForm fields and return a Blob.
  function generatePdfFromTemplate(payload) {
    var PDFLib = window.PDFLib;
    if (!PDFLib) {
      return Promise.reject(new Error('PDF-модуль не загружен.'));
    }

    var doc = payload.doc;

    // Documents migrated to the in-place overlay engine take that path.
    if (resolveRenderStrategy(doc) === 'overlay') return generatePdfByOverlay(payload);

    var templateUrl;
    try {
      templateUrl = new URL(doc.pdfTemplateUrl, window.location.href).href;
    } catch (e) {
      return Promise.reject(new Error('Не удалось определить URL PDF-шаблона.'));
    }

    // Fetch ONLY the local template URL.
    return fetch(templateUrl)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.arrayBuffer();
      })
      .then(function (buf) {
        return PDFLib.PDFDocument.load(buf, { ignoreEncryption: true }).then(function (pdfDoc) {
          var form;
          try { form = pdfDoc.getForm(); } catch (e) { form = null; }
          var fields = form ? form.getFields() : [];

          // No AcroForm fields (e.g. Risks / brokerage-key-information): return
          // the original PDF bytes untouched (no font needed).
          if (!form || !fields.length) {
            return new Blob([buf], { type: 'application/pdf' });
          }

          // Embed a local Cyrillic-capable font so filled values render in every
          // viewer. If fontkit is missing, fall back to default appearances.
          return loadPdfFontBytes().then(function (fontBytes) {
            if (window.fontkit && fontBytes) {
              try {
                pdfDoc.registerFontkit(window.fontkit);
                return pdfDoc.embedFont(fontBytes, { subset: true })
                  .then(function (font) {
                    return finishFill(pdfDoc, form, fields, doc, payload, font);
                  })
                  .catch(function (e) {
                    console.warn('Cyrillic font embedding failed; using default appearances:', e);
                    return finishFill(pdfDoc, form, fields, doc, payload, null);
                  });
              } catch (e) {
                console.warn('registerFontkit failed; using default appearances:', e);
              }
            } else {
              console.warn('fontkit not loaded — Cyrillic field values may not render.');
            }
            return finishFill(pdfDoc, form, fields, doc, payload, null);
          });
        });
      });
  }

  // Optional internal upload — only when an endpoint is explicitly configured.
  // Sends every generated PDF in ONE multipart request (files[]). When no
  // endpoint is configured this function is never called, so sensitive data
  // never leaves the browser.
  function uploadPdfs(results, payload) {
    var formData = new FormData();
    results.forEach(function (item) {
      formData.append('files[]', item.blob, item.filename);
    });

    // Manifest describing every attached file (id / title / filename).
    formData.append('documentsManifest', JSON.stringify(results.map(function (item) {
      return { id: item.id, title: item.title, filename: item.filename };
    })));

    formData.append('subjectId', payload.subject.id);
    formData.append('subjectCode', payload.subject.code || '');
    formData.append('subjectName', payload.subject.displayName || '');
    formData.append('documentType', payload.doc.id);
    formData.append('documentTitle', payload.doc.title);
    formData.append('source', 'document-wizard');

    // Do NOT set Content-Type manually — the browser adds the multipart boundary.
    return fetch(DOCUMENT_UPLOAD_ENDPOINT, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res;
    });
  }

  // Public entry point. Packages generate several PDFs at once; everything else
  // generates a single PDF from its own template.
  function generatePdf(doc, subject) {
    if (resolveRenderStrategy(doc) === 'package') {
      return generatePdfPackage(doc, subject);
    }
    return generateSinglePdf(doc, subject);
  }

  function generateSinglePdf(doc, subject) {
    resetPdfStatus();

    var strategy = resolveRenderStrategy(doc);
    if (!strategy) {
      setPdfStatus('PDF-шаблон пока не подключён.', 'warn');
      return;
    }
    if (!window.PDFLib) {
      setPdfStatus('PDF-модуль не загружен.', 'error');
      return;
    }
    // An overlay document needs its coordinate map module to have loaded.
    // Report that precisely instead of silently emitting a blank template.
    if (strategy === 'overlay' && !getOverlayTemplate(doc)) {
      console.error('Document "' + doc.id + '": overlay map "' +
        doc.overlayTemplateId + '" is not registered. Check that its ' +
        'document-field-maps script is loaded before document-wizard.js.');
      setPdfStatus('Карта полей документа не загружена — обратитесь в поддержку.', 'error');
      return;
    }

    var payload = buildDocumentPayload(doc, subject);
    if (!payload.valid) {
      setPdfStatus(payload.validationMessage || 'Заполните обязательные поля (отмечены *).', 'error');
      if (payload.firstInvalid) payload.firstInvalid.focus();
      return;
    }

    var btn = document.getElementById('docwiz-generate-pdf-btn');
    var original = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Формируем PDF…'; }
    setPdfStatus('Формируем PDF…');
    setActiveStep(3);

    generatePdfFromTemplate(payload)
      .then(function (blob) {
        var results = [{
          id: doc.id, blob: blob, filename: payload.pdfFilename,
          title: doc.title, downloadLabel: doc.downloadLabel
        }];
        renderDownloadLinks(results);

        if (DOCUMENT_UPLOAD_ENDPOINT) {
          return uploadPdfs(results, payload)
            .then(function () {
              setPdfStatus('PDF сформирован: 1 файл. Файл отправлен во внутренний сервис.', 'ok');
            })
            .catch(function (err) {
              console.error('PDF upload failed:', err);
              setPdfStatus('PDF сформирован: 1 файл. Не удалось отправить во внутренний сервис — файл доступен по ссылке ниже.', 'warn');
            });
        }

        // No endpoint configured: never upload, local download only.
        setPdfStatus('PDF сформирован: 1 файл. Файл не отправлялся.', 'ok');
        renderExpansionNotice();
      })
      .catch(function (err) {
        handleGenerationError(err, doc, function () { generateSinglePdf(doc, subject); });
      })
      .finally(function () {
        if (btn) { btn.disabled = false; btn.textContent = original || 'Сформировать PDF'; }
      });
  }

  // A layout overflow is not a generic failure: the preflight knows exactly
  // which values could not be printed and why, so show that instead.
  function handleGenerationError(err, doc, onRetry, fallbackMessage) {
    console.error('PDF generation failed:', err);
    if (err && err.name === 'DocumentOverflowError') {
      setPdfStatus('Проверка размещения не пройдена — см. подробности ниже.', 'error');
      renderOverflowReport(err, doc, onRetry);
      setActiveStep(2);
      var first = (err.overflows || [])[0];
      if (first && first.editable) focusOverflowField(first.source);
      return;
    }
    setPdfStatus((err && err.message) ? err.message :
      (fallbackMessage || 'Не удалось сформировать PDF.'), 'error');
    setActiveStep(2);
  }

  function generatePdfPackage(doc, subject) {
    resetPdfStatus();

    if (!window.PDFLib) {
      setPdfStatus('PDF-модуль не загружен.', 'error');
      return;
    }
    if (isPackageBlocked(doc, subject)) {
      setPdfStatus('У субъекта нет представителей для заполнения стартового пакета.', 'warn');
      return;
    }

    // Build the payload once from the parent package fields; each child PDF
    // reuses the same identity/date data but carries its own template + map.
    var payload = buildDocumentPayload(doc, subject);
    if (!payload.valid) {
      setPdfStatus(payload.validationMessage || 'Заполните обязательные поля (отмечены *).', 'error');
      if (payload.firstInvalid) payload.firstInvalid.focus();
      return;
    }

    var btn = document.getElementById('docwiz-generate-pdf-btn');
    var original = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Формируем PDF-комплект…'; }
    setPdfStatus('Формируем PDF-комплект…');
    setActiveStep(3);

    var tasks = doc.packageDocuments.map(function (child) {
      var childPayload = {
        doc:         child,
        subject:     payload.subject,
        umi:         payload.umi,
        fields:      payload.fields,
        checks:      payload.checks,
        extraValues: payload.extraValues,
        printOverrides: payload.printOverrides,
        pdfFilename: child.pdfOutputFilename || (child.id + '.pdf')
      };
      return generatePdfFromTemplate(childPayload).then(function (blob) {
        return {
          id: child.id, blob: blob, filename: childPayload.pdfFilename,
          title: child.title, downloadLabel: child.downloadLabel
        };
      });
    });

    Promise.all(tasks)
      .then(function (results) {
        renderDownloadLinks(results);

        var n = results.length;
        var head = 'PDF-комплект сформирован: ' + n + ' ' + filesWord(n) + '.';

        if (DOCUMENT_UPLOAD_ENDPOINT) {
          return uploadPdfs(results, payload)
            .then(function () {
              setPdfStatus(head + ' Файлы отправлены во внутренний сервис.', 'ok');
            })
            .catch(function (err) {
              console.error('PDF package upload failed:', err);
              setPdfStatus(head + ' Не удалось отправить во внутренний сервис — файлы доступны по ссылкам ниже.', 'warn');
            });
        }

        // No endpoint configured: never upload, local downloads only.
        setPdfStatus(head + ' Файлы не отправлялись.', 'ok');
        renderExpansionNotice();
      })
      .catch(function (err) {
        handleGenerationError(err, doc, function () { generatePdfPackage(doc, subject); },
          'Не удалось сформировать PDF-комплект.');
      })
      .finally(function () {
        if (btn) { btn.disabled = false; btn.textContent = original || 'Сформировать комплект PDF'; }
      });
  }

  // ── Error display ─────────────────────────────────────────────────────────

  function showError(msg) {
    var page = document.querySelector('[data-page="document-wizard"] .crm-docwiz-shell');
    if (page) {
      page.innerHTML =
        '<div class="crm-card crm-docwiz-error">' +
          escHtml(msg) +
        '</div>';
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  function initWizard() {
    var params    = new URLSearchParams(window.location.search);
    var subjectId = params.get('subject') || 'c-011';
    var context   = resolveSubjectContext(subjectId);
    var subject   = context.subject;

    renderNavigation(context);
    renderSubjectSummary(subject);

    // PDF-only architecture: the active wizard shows documents that generate a
    // PDF (a single PDF template or a PDF package) plus operational non-document
    // flows (account closure). Legacy HTML-only documents are hidden from the
    // user-facing list; their configs/templates remain in the repo for reference.
    var filteredDocs = DOCUMENTS.filter(function (doc) {
      if (doc.blockedIncompleteMapping) return false;
      if (doc.appliesTo.indexOf(subject.kind) === -1) return false;
      return !!resolveRenderStrategy(doc) || !!doc.closure;
    });

    renderDocCards(filteredDocs, subject);

    var documentSearch = document.getElementById('docwiz-document-search');
    if (documentSearch) {
      documentSearch.addEventListener('input', function () {
        var query = String(documentSearch.value || '')
          .toLocaleLowerCase('ru-RU')
          .replace(/ё/g, 'е')
          .trim();
        var matches = !query ? filteredDocs : filteredDocs.filter(function (doc) {
          var haystack = [doc.title, doc.description, doc.category]
            .concat(doc.aliases || [])
            .join(' ')
            .toLocaleLowerCase('ru-RU')
            .replace(/ё/g, 'е');
          return haystack.indexOf(query) !== -1;
        });
        renderDocCards(matches, subject);
      });
    }
    setActiveStep(1);

    // Preselect a document type when requested via ?type=<id>
    // (e.g. ?type=account-closure from the subject card "Закрыть" action).
    var requestedType = params.get('type');
    if (requestedType) {
      var preselect = filteredDocs.find(function (doc) { return doc.id === requestedType; });
      if (preselect) selectDoc(preselect, subject);
    }
  }

  initWizard();

}());
