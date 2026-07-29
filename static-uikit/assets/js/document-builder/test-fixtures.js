(function (global) {
  'use strict';

  var ns = global.CRMDocumentBuilder = global.CRMDocumentBuilder || {};
  var Fixtures = {};

  var PROFILES = [
    { id: 'ru-resident-short', title: 'Russian resident — short values', language: 'ru', kind: 'individual', resident: true, length: 'short' },
    { id: 'ru-resident-normal', title: 'Russian resident — normal values', language: 'ru', kind: 'individual', resident: true, length: 'normal' },
    { id: 'ru-resident-long', title: 'Russian resident — long values', language: 'ru', kind: 'individual', resident: true, length: 'long' },
    { id: 'ru-company-normal', title: 'Russian legal entity — normal values', language: 'ru', kind: 'company', resident: true, length: 'normal' },
    { id: 'ru-company-long', title: 'Russian legal entity — long values', language: 'ru', kind: 'company', resident: true, length: 'long' },
    { id: 'en-nonresident-normal', title: 'English nonresident individual — normal values', language: 'en', kind: 'individual', resident: false, length: 'normal' },
    { id: 'en-nonresident-long', title: 'English nonresident individual — long values', language: 'en', kind: 'individual', resident: false, length: 'long' },
    { id: 'en-company-normal', title: 'Foreign legal entity — normal English values', language: 'en', kind: 'company', resident: false, length: 'normal' },
    { id: 'en-company-long', title: 'Foreign legal entity — long English values', language: 'en', kind: 'company', resident: false, length: 'long' },
    { id: 'mixed-ru-en', title: 'Mixed Russian / English data', language: 'mixed', kind: 'individual', resident: true, length: 'normal' },
    { id: 'missing-optional', title: 'Missing optional values', language: 'ru', kind: 'individual', resident: true, length: 'normal', missingOptional: true },
    { id: 'maximum-checkboxes', title: 'Maximum checkbox selections', language: 'ru', kind: 'individual', resident: true, length: 'normal', maximumChecks: true },
    { id: 'minimum-required', title: 'Minimum required values only', language: 'ru', kind: 'individual', resident: true, length: 'short', minimumOnly: true }
  ];

  function clone(value) { return ns.schema.clone(value); }

  function basePayload(profile) {
    var en = profile.language === 'en';
    var mixed = profile.language === 'mixed';
    var company = profile.kind === 'company';
    var long = profile.length === 'long';
    var short = profile.length === 'short';

    var ruPerson = long
      ? 'Александров-Смирнов Максимилиан Константинович'
      : short ? 'Иванов И.И.' : 'Соколов Алексей Михайлович';
    var enPerson = long
      ? "Maximilian-Alexander O'Connor-Smith-Jones"
      : "Patrick O'Connor-Smith";
    var ruCompany = long
      ? 'Акционерное общество «Международные инвестиционные технологии и инфраструктурные решения»'
      : 'АО «Тестовые инвестиции»';
    var enCompany = long
      ? 'International Securities Infrastructure and Investment Technologies Holdings Limited'
      : 'North Star Investments Ltd.';
    var display = company ? (en ? enCompany : ruCompany) : (en ? enPerson : ruPerson);
    if (mixed) display = "Александр O'Connor-Смирнов";

    var ruAddress = long
      ? '125009, Российская Федерация, город Москва, внутригородская территория муниципальный округ Пресненский, улица Большая Никитская, дом 128, корпус 4, строение 7, квартира 385'
      : '125009, Россия, г. Москва, ул. Тверская, д. 14, кв. 38';
    var enAddress = long
      ? 'Apartment 148, Building 27, Saint Christopher International Business Park, King George the Fifth Avenue, London, United Kingdom, SW1A 2AA'
      : '27 King Street, London, SW1A 2AA, United Kingdom';
    var authority = en
      ? (long ? 'Department of Immigration and Citizenship Services of the United Kingdom Overseas Territories Administration' : 'United Kingdom Passport Office')
      : (long ? 'Отделение по вопросам миграции Управления Министерства внутренних дел Российской Федерации по Центральному административному округу города Москвы' : 'ОВМ МВД России по г. Москве');

    var subject = {
      id: 'synthetic-' + profile.id,
      kind: company ? 'company' : 'individual',
      displayName: display,
      shortName: display,
      fullLegalName: display,
      englishName: enCompany,
      inn: company ? '7701234567' : '772201234567',
      kpp: '770101001',
      ogrn: '1217700011256',
      snils: '123-456-789 01',
      code: 'INV-TEST-2026-00000017',
      email: long ? 'compliance.notifications.international.department@example.test' : 'client@example.test',
      phone: en ? '+44 20 7946 0958' : '+7 (903) 215-44-89',
      citizenship: profile.resident ? 'Россия' : 'United Kingdom',
      birthDate: '1988-03-15',
      birthPlace: en ? 'London, United Kingdom' : 'г. Москва',
      registrationAddress: en ? enAddress : ruAddress,
      postalAddress: en ? enAddress : ruAddress,
      legalAddress: en ? enAddress : ruAddress,
      registrationDate: '2021-01-18',
      registrationAuthority: authority,
      website: 'https://example.test',
      qualificationStatus: 'Неквалифицированный инвестор'
    };

    var fields = {
      clientFullName: display,
      'client-full-name': display,
      representativeFullName: en ? "Anna-Marie O'Neil" : 'Петрова Анна Сергеевна',
      representativeRole: company ? (en ? 'Chief Executive Officer' : 'Генеральный директор') : '',
      representativeAuthority: company ? (en ? 'Articles of Association' : 'Устав общества') : '',
      passportSeries: en ? 'AB' : '4510',
      passportNumber: 'AB-7789',
      passportIssuedBy: authority,
      passportIssueDate: '2008-04-20',
      passportDeptCode: profile.resident ? '770-001' : '',
      registrationAddress: en ? enAddress : ruAddress,
      postalAddress: en ? enAddress : ruAddress,
      documentDateRu: '2026-07-29',
      'extra-contract-number': long ? 'BR-2026/00444-INTERNATIONAL-00000000000000017' : 'BR-2026/00444',
      'extra-contract-date': '29.07.2026',
      'extra-account-portfolio': long ? '30601-000-4401-INTERNATIONAL-CLIENT-PORTFOLIO-00017' : '30601-000-4401',
      'extra-stock-portfolio': 'STOCK-00000017',
      'extra-derivatives-portfolio': 'DERIVATIVES-00000017',
      'extra-currency-portfolio': 'CURRENCY-00000017'
    };

    return { subject: subject, fields: fields, extraValues: {}, checks: {} };
  }

  function defaultValue(path, profile, field) {
    var key = path.split('.').slice(1).join('.');
    var long = profile.length === 'long';
    var short = profile.length === 'short';
    var en = profile.language === 'en';
    if (/date/i.test(key)) return '2026-07-29';
    if (/email/i.test(key)) return long ? 'international.client.notifications.department@example.test' : 'client@example.test';
    if (/phone/i.test(key)) return en ? '+44 20 7946 0958' : '+7 (903) 215-44-89';
    if (/passport.*series|series/i.test(key)) return en ? 'AB' : '4510';
    if (/passport.*number/i.test(key)) return en ? 'AB-7789' : '234567';
    if (/citizenship/i.test(key)) return en ? 'United Kingdom' : 'Россия';
    if (/authority|issued|issuer/i.test(key)) return en ? 'United Kingdom Passport and Immigration Authority' : 'ГУ МВД России по г. Москве';
    if (/amount|capital|price|quantity|income|turnover|assets|sum|value/i.test(key)) return long ? '999999999999999999.99' : '8';
    if (/inn/i.test(key)) return '772201234567';
    if (/kpp/i.test(key)) return '770101001';
    if (/ogrn|registration-number|identifier/i.test(key)) return long ? 'REG-GB-2026-0000000000000000007789' : '1217700011256';
    if (/account|portfolio|contract|agreement|number|code/i.test(key)) return long ? 'AB-7789-2026-00000000000000000000017' : 'AB-7789';
    if (/address|place/i.test(key)) return en
      ? '27 King George the Fifth Avenue, London, United Kingdom, SW1A 2AA'
      : '125009, Россия, г. Москва, ул. Тверская, д. 14, кв. 38';
    if (/name|fio|client|representative|director/i.test(key)) return en
      ? (long ? "Maximilian-Alexander O'Connor-Smith-Jones" : "Patrick O'Connor-Smith")
      : (long ? 'Александров-Смирнов Максим Константинович' : (short ? 'Иванов И.И.' : 'Соколов Алексей Михайлович'));
    if (field && field.equals != null) return Array.isArray(field.equals) ? field.equals[0] : field.equals;
    return long
      ? (en ? 'Synthetic long English test value for document layout validation' : 'Синтетическое длинное тестовое значение для проверки размещения в документе')
      : (en ? 'Synthetic test value' : 'Тестовое значение');
  }

  function assignPath(payload, path, value, overwrite) {
    var dot = path.indexOf('.');
    if (dot === -1) return;
    var namespace = path.slice(0, dot);
    var key = path.slice(dot + 1);
    var target = namespace === 'subject' ? payload.subject :
      namespace === 'field' ? payload.fields :
      namespace === 'extra' ? payload.extraValues :
      namespace === 'check' ? payload.checks : null;
    if (target && (overwrite || !Object.prototype.hasOwnProperty.call(target, key))) target[key] = value;
  }

  function ensureProjectSources(payload, profile, project) {
    (project.fields || []).forEach(function (field) {
      if (field.source) {
        var value = field.source.indexOf('check.') === 0
          ? !!profile.maximumChecks
          : defaultValue(field.source, profile, field);
        assignPath(payload, field.source, value);
      }
      if (field.showWhen && field.showWhen.source) {
        var expected = Object.prototype.hasOwnProperty.call(field.showWhen, 'equals')
          ? (Array.isArray(field.showWhen.equals) ? field.showWhen.equals[0] : field.showWhen.equals)
          : true;
        assignPath(payload, field.showWhen.source, expected);
      }
    });
    ['fields', 'companyFields'].forEach(function (group) {
      (((project.wizard || {})[group]) || []).forEach(function (control) {
        assignPath(payload, 'extra.' + control.key, control.default != null
          ? control.default
          : defaultValue('extra.' + control.key, profile, control));
      });
    });
    (((project.wizard || {}).checkFields) || []).forEach(function (control) {
      assignPath(payload, 'check.' + control.key, !!profile.maximumChecks || !!control.default);
    });
    if (profile.missingOptional) {
      (project.fields || []).forEach(function (field) {
        if (!field.optional || !field.source) return;
        var dot = field.source.indexOf('.');
        var target = field.source.slice(0, dot) === 'subject' ? payload.subject :
          field.source.slice(0, dot) === 'field' ? payload.fields :
          field.source.slice(0, dot) === 'extra' ? payload.extraValues : payload.checks;
        delete target[field.source.slice(dot + 1)];
      });
    }
    if (profile.minimumOnly) {
      (project.fields || []).forEach(function (field) {
        if (field.required || !field.source) return;
        var dot = field.source.indexOf('.');
        var target = field.source.slice(0, dot) === 'subject' ? payload.subject :
          field.source.slice(0, dot) === 'field' ? payload.fields :
          field.source.slice(0, dot) === 'extra' ? payload.extraValues : payload.checks;
        delete target[field.source.slice(dot + 1)];
      });
    }
    return payload;
  }

  function applyOverrides(payload, overrides) {
    Object.keys(overrides || {}).forEach(function (path) { assignPath(payload, path, overrides[path], true); });
    return payload;
  }

  Fixtures.profiles = PROFILES;
  Fixtures.profile = function (id) { return PROFILES.find(function (item) { return item.id === id; }) || PROFILES[1]; };
  Fixtures.payloadFor = function (profileId, project, overrides) {
    var profile = Fixtures.profile(profileId);
    return applyOverrides(ensureProjectSources(basePayload(profile), profile, project), overrides || {});
  };
  Fixtures.assignPath = assignPath;
  Fixtures.defaultValue = defaultValue;
  Fixtures.exportData = function (project) {
    return {
      schemaVersion: 1,
      templateId: project.templateId,
      synthetic: true,
      profiles: PROFILES.map(function (profile) {
        return { id: profile.id, title: profile.title, payload: Fixtures.payloadFor(profile.id, project) };
      })
    };
  };
  Fixtures.importData = function (data) {
    if (!data || data.schemaVersion !== 1 || !Array.isArray(data.profiles) || data.synthetic !== true) {
      throw new Error('Некорректный файл синтетических тестовых данных.');
    }
    return clone(data);
  };
  ns.fixtures = Fixtures;
}(typeof window !== 'undefined' ? window : this));
