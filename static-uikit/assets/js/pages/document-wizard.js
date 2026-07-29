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
      qualificationStatus: 'Неквалифицированный'
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
        { key: 'tariff-currency', label: 'Тарифный план — валютный рынок', type: 'text' }
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
        {
          key: 'extra-authorized-signer',
          label: 'Уполномоченное лицо ООО «Инвестика» (в лице …)',
          type: 'text',
          required: true,
          placeholder: 'ФИО в родительном падеже'
        },
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
          label: 'Номер депозитарного договора (договора счёта ДЕПО)',
          type: 'text',
          required: true
        },
        {
          key: 'extra-depository-contract-date',
          label: 'Дата депозитарного договора',
          type: 'date',
          required: true
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
          required: true,
          // The legal-entity variant reserves only 4.56 pt after «дата выдачи».
          showWhen: { source: 'subject.kind', equals: 'individual' }
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

  function buildFields(subject, extraValues) {
    var f = {};

    // Common
    f['client-full-name'] = subject.displayName;
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

  // ── Render extra fields ───────────────────────────────────────────────────

  function renderExtraFields(doc, subject) {
    var container = document.getElementById('docwiz-extra-fields');
    if (!container) return;

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

    effectiveFields.forEach(function (field) {
      var wrap = document.createElement('div');
      wrap.className = 'crm-docwiz-field-wrap';
      if (field.type === 'textarea' || field.fullWidth) wrap.classList.add('crm-docwiz-field-wrap-full');

      var label = document.createElement('label');
      label.className = 'crm-document-form-label';
      label.setAttribute('for', 'docwiz-field-' + field.key);
      label.textContent = field.label + (field.required ? ' *' : '');
      wrap.appendChild(label);

      var input;
      var dateField;
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
      } else {
        input = document.createElement('input');
        input.className = 'uk-input crm-input';
        input.type = 'text';
        if (field.placeholder) input.placeholder = field.placeholder;
        if (field.defaultValue) input.value = field.defaultValue;
      }

      input.id = 'docwiz-field-' + field.key;
      input.setAttribute('data-field-key', field.key);
      if (field.required) input.required = true;
      wrap.appendChild(dateField || input);
      grid.appendChild(wrap);
      if (field.showWhen && field.showWhen.source) {
        conditionalFields.push({ wrap: wrap, input: input, condition: field.showWhen });
      }
    });

    container.appendChild(grid);

    if (doc.checkFields && doc.checkFields.length) {
      var checkGroup = document.createElement('div');
      checkGroup.className = 'crm-docwiz-check-group';

      var checkLabel = document.createElement('p');
      checkLabel.className = 'crm-document-form-label';
      checkLabel.textContent = doc.checkGroupLabel || 'Отметки:';
      checkGroup.appendChild(checkLabel);

      doc.checkFields.forEach(function (cf) {
        var row = document.createElement('label');
        row.className = 'crm-check-row';

        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = 'docwiz-check-' + cf.key;
        cb.setAttribute('data-check-key', cf.key);
        cb.checked = !!cf.defaultChecked;

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

    function conditionMatches(condition) {
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

    function syncConditionalFields() {
      conditionalFields.forEach(function (entry) {
        var visible = conditionMatches(entry.condition);
        entry.wrap.hidden = !visible;
        entry.input.disabled = !visible;
        if (!visible) entry.input.classList.remove('crm-input-error');
      });
    }

    if (conditionalFields.length) {
      container.querySelectorAll('[data-field-key], [data-check-key]').forEach(function (control) {
        control.addEventListener('change', syncConditionalFields);
        control.addEventListener('input', syncConditionalFields);
      });
      syncConditionalFields();
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

  // Validates visible required fields, collects extra/check values and builds
  // the normalized field/check maps consumed by the local PDF generation flow.
  function buildDocumentPayload(doc, subject) {
    var extraValues  = {};
    var checkValues  = {};
    var valid        = true;
    var firstInvalid = null;
    var validationMessage = '';

    // Collect text/date/select field values from [data-field-key].
    document.querySelectorAll('#docwiz-extra-fields [data-field-key]').forEach(function (el) {
      var key = el.getAttribute('data-field-key');
      var val = (el.value || '').trim();
      extraValues[key] = val;
      if (el.disabled) return;
      if (el.required && !val) {
        el.classList.add('crm-input-error');
        valid = false;
        if (!firstInvalid) firstInvalid = el;
      } else {
        el.classList.remove('crm-input-error');
      }
    });

    // Collect checkbox values from [data-check-key].
    document.querySelectorAll('#docwiz-extra-fields [data-check-key]').forEach(function (el) {
      checkValues[el.getAttribute('data-check-key')] = el.checked;
    });

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
      fields:       buildFields(subject, extraValues),
      checks:       buildChecks(doc, checkValues, extraValues, subject),
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

  // Clear status and revoke every tracked Object URL so selecting another
  // document never leaks blobs from a previous generation.
  function resetPdfStatus() {
    setPdfStatus('');
    var box = document.getElementById('docwiz-pdf-downloads');
    if (!box) return;
    box.querySelectorAll('a[data-object-url]').forEach(function (a) {
      var url = a.getAttribute('data-object-url');
      if (url) { try { URL.revokeObjectURL(url); } catch (e) {} }
    });
    box.innerHTML = '';
    box.hidden = true;
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
  //   subject.* -> payload.subject       (e.g. subject.displayName)
  //   field.*   -> payload.fields        (e.g. field.clientFullName)
  //   extra.*   -> payload.extraValues   (e.g. extra.extra-document-date)
  //   check.*   -> payload.checks        (e.g. check.notice-scope-all)
  // Unknown namespace or missing key -> undefined. The resolver does NOT coerce
  // to '' / false; callers (applyPdfFieldValue) apply defaults after resolution.
  function resolvePdfValue(ref, payload) {
    if (!ref || typeof ref !== 'string') return undefined;
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
      subject:     payload.subject,
      fields:      payload.fields,
      extraValues: payload.extraValues,
      checks:      payload.checks
    }, { validatePayload: true });
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
      })
      .catch(function (err) {
        console.error('PDF generation failed:', err);
        setPdfStatus((err && err.message) ? err.message : 'Не удалось сформировать PDF.', 'error');
        setActiveStep(2);
      })
      .finally(function () {
        if (btn) { btn.disabled = false; btn.textContent = original || 'Сформировать PDF'; }
      });
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
        fields:      payload.fields,
        checks:      payload.checks,
        extraValues: payload.extraValues,
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
      })
      .catch(function (err) {
        console.error('PDF package generation failed:', err);
        setPdfStatus((err && err.message) ? err.message : 'Не удалось сформировать PDF-комплект.', 'error');
        setActiveStep(2);
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
