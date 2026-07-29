(function (global) {
  'use strict';

  var ns = global.CRMDocumentBuilder = global.CRMDocumentBuilder || {};
  var SourceCatalog = {};
  var PATH_RE = /^(subject|field|extra|check)\.[A-Za-z0-9][A-Za-z0-9._-]*$/;

  var LABELS = {
    'subject.displayName': 'Полное имя / наименование',
    'subject.kind': 'Тип субъекта',
    'subject.inn': 'ИНН',
    'subject.email': 'Email',
    'subject.phone': 'Телефон',
    'subject.citizenship': 'Гражданство',
    'subject.birthDate': 'Дата рождения',
    'subject.birthPlace': 'Место рождения',
    'subject.registrationAddress': 'Адрес регистрации',
    'subject.legalAddress': 'Юридический адрес',
    'field.clientFullName': 'ФИО / наименование клиента',
    'field.passportSeries': 'Серия документа',
    'field.passportNumber': 'Номер документа',
    'field.passportIssuedBy': 'Кем выдан документ',
    'field.passportIssueDate': 'Дата выдачи документа',
    'field.registrationAddress': 'Адрес регистрации',
    'field.documentDateRu': 'Дата документа',
    'field.representativeFullName': 'ФИО представителя',
    'field.representativeRole': 'Должность представителя'
  };

  function humanize(path) {
    if (LABELS[path]) return LABELS[path];
    var key = String(path || '').split('.').slice(1).join('.')
      .replace(/^extra-/, '').replace(/[-_]+/g, ' ');
    return key ? key.charAt(0).toUpperCase() + key.slice(1) : path;
  }

  function category(path) {
    if (path.indexOf('check.') === 0) return 'Checkbox and choice values';
    if (path.indexOf('extra.') === 0) return 'Wizard-specific values';
    if (/representative|rep|authority/i.test(path)) return 'Representative';
    if (/passport|identity|document|issued|birth/i.test(path)) return 'Identity document';
    if (/address|city|country|citizenship/i.test(path)) return 'Addresses';
    if (/email|phone|website/i.test(path)) return 'Contact data';
    if (/contract|account|portfolio|agreement|bank/i.test(path)) return 'Agreement/account data';
    if (/qualification|qualified|criterion/i.test(path)) return 'Qualification data';
    if (path.indexOf('subject.') === 0) return 'Individual / legal entity';
    return 'CRM normalized values';
  }

  function collect(engine, project) {
    var paths = {};
    function add(path) { if (typeof path === 'string' && PATH_RE.test(path)) paths[path] = true; }
    var maps = engine && engine.fieldMaps || {};
    Object.keys(maps).forEach(function (id) {
      (maps[id].fields || []).forEach(function (field) {
        add(field.source);
        if (field.showWhen) add(field.showWhen.source);
      });
    });
    if (project) {
      (project.fields || []).forEach(function (field) {
        add(field.source);
        if (field.showWhen) add(field.showWhen.source);
      });
      ['fields', 'checkFields', 'companyFields'].forEach(function (group) {
        ((project.wizard || {})[group] || []).forEach(function (field) {
          add((group === 'checkFields' ? 'check.' : 'extra.') + field.key);
          if (field.showWhen) add(field.showWhen.source);
        });
      });
    }
    return Object.keys(paths).sort().map(function (path) {
      return { path: path, label: humanize(path), category: category(path) };
    });
  }

  SourceCatalog.PATH_RE = PATH_RE;
  SourceCatalog.isValid = function (path) { return PATH_RE.test(String(path || '')); };
  SourceCatalog.labelFor = humanize;
  SourceCatalog.categoryFor = category;
  SourceCatalog.collect = collect;
  ns.sourceCatalog = SourceCatalog;
}(typeof window !== 'undefined' ? window : this));
