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
      qualificationStatus: 'Квалифицированный'
    }
  };

  // ── Document configuration ─────────────────────────────────────────────────
  var DOCUMENTS = [
    {
      id: 'anketa-fl',
      title: 'Анкета ФЛ',
      description: 'Анкета физического лица — клиента ООО «Инвестика»',
      appliesTo: ['individual'],
      templateUrl: '../assets/document-templates/anketa-fl.html',
      outputFilename: 'anketa-fl.pdf',
      checkGroupLabel: 'Отметки анкеты:',
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
          options: [
            { value: 'first', label: 'Заполняется впервые' },
            { value: 'change', label: 'Изменение анкетных данных' }
          ]
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
          label: 'Источник происхождения денежных средств / имущества',
          type: 'textarea',
          required: false,
          placeholder: 'Например: заработная плата'
        },
        {
          key: 'extra-pep-relation',
          label: 'Связь с публичным должностным лицом',
          type: 'textarea',
          required: false
        },
        {
          key: 'extra-bank-details',
          label: 'Банковские реквизиты',
          type: 'textarea',
          required: false
        },
        {
          key: 'extra-representative-details',
          label: 'Сведения о представителе',
          type: 'textarea',
          required: false
        },
        {
          key: 'extra-beneficiary-details',
          label: 'Выгодоприобретатель / бенефициарный владелец',
          type: 'textarea',
          required: false
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
          key: 'extra-financial-position',
          label: 'Сведения о финансовом положении',
          type: 'textarea',
          required: false,
          placeholder: 'При отсутствии сведений можно оставить пустым'
        },
        {
          key: 'extra-business-reputation',
          label: 'Сведения о деловой репутации',
          type: 'textarea',
          required: false
        },
        {
          key: 'extra-other-info',
          label: 'Иные сведения',
          type: 'textarea',
          required: false
        },
        {
          key: 'extra-fatca-details',
          label: 'Признаки налогоплательщика США',
          type: 'textarea',
          required: false
        }
      ],
      checkFields: [
        { key: 'anketa-role-client', label: 'Клиент', defaultChecked: true },
        { key: 'anketa-role-representative', label: 'Представитель' },
        { key: 'anketa-role-beneficiary', label: 'Выгодоприобретатель' },
        { key: 'anketa-role-beneficial-owner', label: 'Бенефициарный владелец' },
        { key: 'anketa-mode-first', label: 'Заполняется впервые', defaultChecked: true },
        { key: 'anketa-mode-change', label: 'Изменение анкетных данных' },
        { key: 'citizenship-rf', label: 'Гражданство: Российская Федерация', defaultChecked: true },
        { key: 'citizenship-other', label: 'Иное гражданство' },
        { key: 'tax-resident-rf-yes', label: 'Налоговый резидент РФ', defaultChecked: true },
        { key: 'tax-resident-rf-no', label: 'Налоговый резидент иного государства' },
        { key: 'fatca-yes', label: 'FATCA: да' },
        { key: 'fatca-no', label: 'FATCA: нет', defaultChecked: true },
        { key: 'pep-foreign', label: 'Иностранное публичное должностное лицо' },
        { key: 'pep-international', label: 'Должностное лицо публичной международной организации' },
        { key: 'pep-russian', label: 'Лицо, замещающее государственные должности РФ' },
        { key: 'financial-bankruptcy-no', label: 'Отсутствуют признаки банкротства', defaultChecked: true },
        { key: 'foreign-trust-owner-no', label: 'Нет статуса доверительного собственника иностранной структуры', defaultChecked: true },
        { key: 'foreign-trust-protector-no', label: 'Нет статуса протектора иностранной структуры', defaultChecked: true }
      ]
    },
    {
      id: 'anketa-yul',
      title: 'Анкета ЮЛ',
      description: 'Анкета юридического лица — клиента ООО «Инвестика»',
      appliesTo: ['company'],
      templateUrl: '../assets/document-templates/anketa-yul.html',
      outputFilename: 'anketa-yul.pdf',
      checkGroupLabel: 'Отметки анкеты:',
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
          options: [
            { value: 'first', label: 'Заполняется впервые' },
            { value: 'change', label: 'Изменение анкетных данных' }
          ]
        },
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
          type: 'textarea',
          required: false,
          placeholder: 'Совет директоров, правление, ЕИО и т.п.'
        },
        {
          key: 'extra-shareholders',
          label: 'Акционеры / участники от 5%',
          type: 'textarea',
          required: false
        },
        {
          key: 'extra-controlling-persons',
          label: 'Лица, определяющие действия ЮЛ',
          type: 'textarea',
          required: false
        },
        {
          key: 'extra-license-details',
          label: 'Лицензируемая деятельность / лицензии',
          type: 'textarea',
          required: false
        },
        {
          key: 'extra-bank-details',
          label: 'Банковские реквизиты',
          type: 'textarea',
          required: false
        },
        {
          key: 'extra-beneficiaries',
          label: 'Выгодоприобретатели / бенефициары',
          type: 'textarea',
          required: false
        },
        {
          key: 'extra-representative-details',
          label: 'Представитель юридического лица',
          type: 'textarea',
          required: false
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
          key: 'extra-financial-docs',
          label: 'Документы о финансовом положении',
          type: 'textarea',
          required: false
        },
        {
          key: 'extra-reputation-docs',
          label: 'Документы о деловой репутации',
          type: 'textarea',
          required: false
        },
        {
          key: 'extra-source-of-funds',
          label: 'Источник происхождения средств / имущества',
          type: 'textarea',
          required: false
        },
        {
          key: 'extra-other-info',
          label: 'Иные сведения',
          type: 'textarea',
          required: false
        },
        {
          key: 'extra-fatca-details',
          label: 'Признаки налогоплательщика США',
          type: 'textarea',
          required: false
        }
      ],
      checkFields: [
        { key: 'anketa-role-client', label: 'Клиент', defaultChecked: true },
        { key: 'anketa-role-representative', label: 'Представитель' },
        { key: 'anketa-role-beneficiary', label: 'Выгодоприобретатель' },
        { key: 'anketa-mode-first', label: 'Заполняется впервые', defaultChecked: true },
        { key: 'anketa-mode-change', label: 'Изменение анкетных данных' },
        { key: 'tax-resident-rf-yes', label: 'Налоговый резидент РФ', defaultChecked: true },
        { key: 'tax-resident-rf-no', label: 'Нерезидент' },
        { key: 'fatca-yes', label: 'FATCA: да' },
        { key: 'fatca-no', label: 'FATCA: нет', defaultChecked: true },
        { key: 'strategic-company-yes', label: 'Стратегическое общество / под контролем такого общества' },
        { key: 'strategic-company-no', label: 'Не относится к стратегическим обществам', defaultChecked: true },
        { key: 'licensed-activity-no', label: 'Лицензируемая деятельность не осуществляется', defaultChecked: true },
        { key: 'licensed-activity-yes', label: 'Лицензируемая деятельность осуществляется' },
        { key: 'funds-own', label: 'Источник средств: собственные средства', defaultChecked: true },
        { key: 'funds-borrowed', label: 'Источник средств: заемные средства' },
        { key: 'foreign-trust-owner-no', label: 'Нет статуса доверительного собственника иностранной структуры', defaultChecked: true },
        { key: 'foreign-trust-protector-no', label: 'Нет статуса протектора иностранной структуры', defaultChecked: true }
      ]
    },
    {
      id: 'qualification-request-fl',
      title: 'Заявление о признании ФЛ квалифицированным инвестором',
      description: 'Заявление физического лица о признании квалифицированным инвестором',
      appliesTo: ['individual'],
      templateUrl: '../assets/document-templates/qualification-request-fl.html',
      outputFilename: 'qualification-request-fl.pdf',
      checkGroupLabel: 'Критерии и способ получения документов:',
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
          placeholder: 'Например: БО-1006'
        },
        {
          key: 'extra-contract-date',
          label: 'Дата договора',
          type: 'date',
          required: true
        },
        {
          key: 'extra-instrument-other',
          label: 'Иные инструменты / ограничения',
          type: 'textarea',
          required: false
        },
        {
          key: 'extra-securities-amount',
          label: 'Стоимость ценных бумаг / ПФИ, млн руб.',
          type: 'text',
          required: false
        },
        {
          key: 'extra-transactions-amount',
          label: 'Объём сделок, млн руб.',
          type: 'text',
          required: false
        },
        {
          key: 'extra-property-amount',
          label: 'Размер имущества, млн руб.',
          type: 'text',
          required: false
        },
        {
          key: 'extra-education-details',
          label: 'Образование / свидетельство НОК / сертификаты',
          type: 'textarea',
          required: false
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
        },
        {
          key: 'extra-delivery-address',
          label: 'Адрес для уведомлений / выписок',
          type: 'textarea',
          required: false
        }
      ],
      checkFields: [
        { key: 'qual-scope-all', label: 'Все виды ценных бумаг / финансовых инструментов', defaultChecked: true },
        { key: 'qual-scope-other', label: 'Иное / ограниченный перечень' },
        { key: 'qual-fl-securities', label: 'Стоимость ценных бумаг / ПФИ не менее 12 млн руб. (с 01.01.2026 — 24 млн руб.)' },
        { key: 'qual-fl-experience-2', label: 'Опыт работы не менее 2 лет в организации-квалифицированном инвесторе' },
        { key: 'qual-fl-experience-3', label: 'Опыт работы не менее 3 лет в иной организации' },
        { key: 'qual-fl-cbr-position', label: 'Опыт работы в должности, требующей согласования Банка России' },
        { key: 'qual-fl-transactions', label: 'Не менее 10 сделок в квартал, объём не менее 6 млн руб.' },
        { key: 'qual-fl-property-cash', label: 'Имущество: денежные средства / депозиты' },
        { key: 'qual-fl-property-metal', label: 'Имущество: требования к кредитной организации по драгоценному металлу' },
        { key: 'qual-fl-property-securities', label: 'Имущество: ценные бумаги, включая переданные в ДУ' },
        { key: 'qual-fl-education', label: 'Высшее экономическое образование / свидетельство НОК / сертификаты' },
        { key: 'qual-fl-registry', label: 'Выписка из реестра квалифицированных лиц' },
        { key: 'delivery-address', label: 'Документы предоставлять по адресу' },
        { key: 'delivery-office', label: 'Документы предоставлять лично в ООО «Инвестика»', defaultChecked: true }
      ]
    },
    {
      id: 'qualification-request-yul',
      title: 'Заявление о признании ЮЛ квалифицированным инвестором',
      description: 'Заявление юридического лица о признании квалифицированным инвестором',
      appliesTo: ['company'],
      templateUrl: '../assets/document-templates/qualification-request-yul.html',
      outputFilename: 'qualification-request-yul.pdf',
      checkGroupLabel: 'Критерии и способ получения документов:',
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
          key: 'extra-instrument-other',
          label: 'Иные инструменты / ограничения',
          type: 'textarea',
          required: false
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
          key: 'extra-delivery-address',
          label: 'Адрес для уведомлений / выписок',
          type: 'textarea',
          required: false
        }
      ],
      checkFields: [
        { key: 'qual-scope-all', label: 'Все виды ценных бумаг / финансовых инструментов', defaultChecked: true },
        { key: 'qual-scope-other', label: 'Иное / ограниченный перечень' },
        { key: 'qual-yul-criteria-1', label: 'Собственные средства (капитал) ≥ 200 млн руб.' },
        { key: 'qual-yul-criteria-2', label: 'Не менее 5 сделок в квартал, объём не менее 50 млн руб.' },
        { key: 'qual-yul-criteria-3', label: 'Выручка ≥ 2 млрд руб. (по годовой отчётности)' },
        { key: 'qual-yul-criteria-4', label: 'Активы ≥ 2 млрд руб. (по годовой отчётности)' },
        { key: 'qual-yul-criteria-5', label: 'Выписка из реестра квалифицированных лиц' },
        { key: 'delivery-address', label: 'Документы предоставлять по адресу' },
        { key: 'delivery-office', label: 'Документы предоставлять лично в офисе ООО «Инвестика»', defaultChecked: true }
      ]
    },
    {
      id: 'qualification-notice',
      title: 'Уведомление о признании лица квалифицированным инвестором',
      description: 'Уведомление о признании лица квалифицированным инвестором',
      appliesTo: ['individual', 'company'],
      templateUrl: '../assets/document-templates/qualification-notice.html',
      outputFilename: 'qualification-notice.pdf',
      checkGroupLabel: 'Виды инструментов:',
      fields: [
        {
          key: 'extra-document-date',
          label: 'Дата уведомления',
          type: 'date',
          required: true
        },
        {
          key: 'extra-recipient-address',
          label: 'Адрес получателя',
          type: 'textarea',
          required: false
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
        },
        {
          key: 'extra-registry-entry-date',
          label: 'Дата внесения записи в реестр',
          type: 'date',
          required: true
        },
        {
          key: 'extra-instrument-other',
          label: 'Иной перечень инструментов',
          type: 'textarea',
          required: false
        },
        {
          key: 'extra-authorized-signer-position',
          label: 'Должность уполномоченного лица',
          type: 'text',
          required: false,
          placeholder: 'Например: Генеральный директор'
        },
        {
          key: 'extra-authorized-signer',
          label: 'ФИО уполномоченного лица',
          type: 'text',
          required: false
        }
      ],
      checkFields: [
        { key: 'notice-scope-all', label: 'Все виды ценных бумаг / финансовых инструментов', defaultChecked: true },
        { key: 'notice-scope-other', label: 'Иное / ограниченный перечень' }
      ]
    },
    {
      id: 'account-opening-notice',
      title: 'Уведомление об открытии брокерского-депозитарного счета',
      description: 'Уведомление об открытии брокерского-депозитарного счета',
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
          key: 'extra-authorized-signer',
          label: 'Уполномоченное лицо ООО «Инвестика»',
          type: 'text',
          required: true,
          placeholder: 'ФИО подписанта'
        },
        {
          key: 'extra-authority-basis',
          label: 'Основание полномочий подписанта',
          type: 'text',
          required: true,
          placeholder: 'Например: доверенность № ...'
        },
        {
          key: 'extra-brokerage-contract',
          label: 'Номер договора брокерского обслуживания',
          type: 'text',
          required: true
        },
        {
          key: 'extra-brokerage-contract-date',
          label: 'Дата договора брокерского обслуживания',
          type: 'date',
          required: true
        },
        {
          key: 'extra-depository-contract',
          label: 'Номер депозитарного договора',
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
        },
        {
          key: 'extra-stock-market-account',
          label: 'Счет внутреннего учета: фондовый рынок',
          type: 'text',
          required: false
        },
        {
          key: 'extra-futures-market-account',
          label: 'Счет внутреннего учета: срочный рынок',
          type: 'text',
          required: false
        },
        {
          key: 'extra-currency-market-account',
          label: 'Счет внутреннего учета: валютный рынок / драг. металлы',
          type: 'text',
          required: false
        },
        {
          key: 'extra-payment-details',
          label: 'Реквизиты для перечисления денежных средств',
          type: 'textarea',
          required: false,
          placeholder: 'Получатель, банк, р/с, к/с, БИК'
        },
        {
          key: 'extra-securities-transfer-details',
          label: 'Реквизиты для перевода ценных бумаг',
          type: 'textarea',
          required: false
        }
      ]
    },
    {
      id: 'code-word-request',
      title: 'Заявление об установлении/замене кодового слова',
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
        },
        {
          key: 'extra-effective-date',
          label: 'Дата начала действия',
          type: 'date',
          required: false
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

    return f;
  }

  // ── Build check map ──────────────────────────────────────────────────────

  function buildChecks(doc, checkValues) {
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
        try {
          if (link.sheet) { resolve(); return; }
        } catch (e) {
          // Some browsers throw before stylesheet metadata is available.
        }
        link.addEventListener('load',  resolve, { once: true });
        link.addEventListener('error', resolve, { once: true });
        setTimeout(resolve, 1200);
      });
    }

    var stylesReady = links.length ? Promise.all(links.map(waitForLink)) : Promise.resolve();
    var timeoutReady = new Promise(function (resolve) { setTimeout(resolve, 1800); });
    var didPrint = false;

    function printOnce() {
      if (didPrint) return;
      didPrint = true;
      setTimeout(function () {
        try {
          win.focus();
          win.print();
        } catch (e) {
          console.error('Document print failed:', e);
        }
      }, 150);
    }

    Promise.race([stylesReady, timeoutReady]).then(printOnce);
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
        (field.options || []).forEach(function (opt) {
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
    if (doc.id === 'anketa-fl' || doc.id === 'anketa-yul') {
      checkValues['extra-questionnaire-role'] = extraValues['extra-questionnaire-role'] || '';
      checkValues['extra-questionnaire-mode'] = extraValues['extra-questionnaire-mode'] || '';
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

    var filteredDocs = DOCUMENTS.filter(function (doc) {
      return doc.appliesTo.indexOf(subject.kind) !== -1;
    });

    renderDocCards(filteredDocs, subject);
    setActiveStep(1);
  }

  initWizard();

}());
