(function (global) {
  'use strict';

  var ns = global.CRMDocumentBuilder = global.CRMDocumentBuilder || {};
  var SourceCatalog = {};
  var PATH_RE = /^(subject|field|extra|check|umi)\.[A-Za-z0-9][A-Za-z0-9._-]*$/;

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

  function category(path, sourceKind) {
    if (sourceKind === 'operator-input') return 'Workflow / operator input';
    if (path.indexOf('umi.') === 0) return 'Exact UMI variables';
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

  function kindOf(path, metadata) {
    var entry = metadata || {};
    if (entry.operatorInput) return 'operator-input';
    if (entry.kind === 'workflow') return 'workflow';
    if (entry.kind === 'umi' || entry.kind === 'umi-either' ||
        entry.kind === 'composed' || String(path || '').indexOf('umi.') === 0) {
      return 'umi';
    }
    if (String(path || '').indexOf('extra.') === 0 ||
        String(path || '').indexOf('check.') === 0) return 'wizard-input';
    return 'normalized';
  }

  // The generated registry is the authority for exact UMI paths and for the
  // exceptional workflow aliases that deliberately do not come from UMI.
  // Build one searchable index from both exact fields and aliases. Alias
  // targets are included too: composed adapters such as
  // `umi.address.registration` are valid production sources even though no
  // workbook row has that synthetic path by itself.
  function registryIndex(engine) {
    var registry = engine && engine.umiRegistry || {};
    var index = {};

    function add(path, metadata, label) {
      if (typeof path !== 'string' || !PATH_RE.test(path)) return;
      var prior = index[path] || {};
      var sourceKind = kindOf(path, metadata);
      index[path] = {
        path: path,
        label: label || metadata && metadata.title || prior.label || humanize(path),
        category: category(path, sourceKind),
        sourceKind: sourceKind,
        registryKind: metadata && metadata.kind || prior.registryKind || null,
        operatorInput: !!(metadata && metadata.operatorInput),
        note: metadata && metadata.note || prior.note || '',
        known: true
      };
    }

    (registry.fields || []).forEach(function (field) {
      add(field.source, { kind: 'umi', title: field.title }, field.title);
      add(field.subjectSource, { kind: 'umi', title: field.title }, field.title);
    });
    Object.keys(registry.aliases || {}).forEach(function (path) {
      var alias = registry.aliases[path] || {};
      add(path, alias, alias.title);
      var targets = Array.isArray(alias.umi) ? alias.umi : [alias.umi];
      targets.forEach(function (target) {
        add(target, { kind: 'umi', title: alias.title, note: alias.note }, alias.title);
      });
    });
    (registry.unregisteredSources || []).forEach(function (path) {
      if (typeof path !== 'string' || !PATH_RE.test(path) || index[path]) return;
      var sourceKind = kindOf(path, null);
      index[path] = {
        path: path, label: humanize(path), category: category(path, sourceKind),
        sourceKind: sourceKind, registryKind: 'unregistered',
        operatorInput: false, note: '', known: true
      };
    });
    return index;
  }

  function infoFor(path, engine) {
    var value = String(path || '');
    var known = registryIndex(engine || global.CRMDocumentEngine)[value];
    if (known) return known;
    var sourceKind = kindOf(value, null);
    return {
      path: value, label: humanize(value), category: category(value, sourceKind),
      sourceKind: sourceKind, registryKind: null, operatorInput: false,
      note: '', known: false
    };
  }

  function collect(engine, project) {
    var paths = {};
    var registered = registryIndex(engine);
    Object.keys(registered).forEach(function (path) { paths[path] = registered[path]; });
    function add(path) {
      if (typeof path !== 'string' || !PATH_RE.test(path) || paths[path]) return;
      paths[path] = infoFor(path, engine);
    }
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
    return Object.keys(paths).sort().map(function (path) { return paths[path]; });
  }

  SourceCatalog.PATH_RE = PATH_RE;
  SourceCatalog.isValid = function (path) { return PATH_RE.test(String(path || '')); };
  SourceCatalog.labelFor = humanize;
  SourceCatalog.categoryFor = function (path) {
    var info = infoFor(path, global.CRMDocumentEngine);
    return info.category;
  };
  SourceCatalog.registryIndex = registryIndex;
  SourceCatalog.infoFor = function (path) { return infoFor(path, global.CRMDocumentEngine); };
  SourceCatalog.sourceKindFor = function (path) {
    return infoFor(path, global.CRMDocumentEngine).sourceKind;
  };
  SourceCatalog.isKnownUmi = function (path) {
    var value = String(path || '');
    return value.indexOf('umi.') !== 0 || !!registryIndex(global.CRMDocumentEngine)[value];
  };
  SourceCatalog.collect = collect;
  ns.sourceCatalog = SourceCatalog;
}(typeof window !== 'undefined' ? window : this));
