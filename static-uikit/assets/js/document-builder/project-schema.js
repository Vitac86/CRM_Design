(function (global) {
  'use strict';

  var ns = global.CRMDocumentBuilder = global.CRMDocumentBuilder || {};
  var Schema = {};
  var SCHEMA_VERSION = 1;

  var DEFAULT_FONTS = {
    legalSerif: '../assets/fonts/pdf/LiberationSerif-Regular.ttf',
    legalSerifBold: '../assets/fonts/pdf/LiberationSerif-Bold.ttf',
    legalSerifItalic: '../assets/fonts/pdf/LiberationSerif-Italic.ttf'
  };

  var FIELD_PRODUCTION_KEYS = [
    'id', 'source', 'type', 'page', 'left', 'baselineTop', 'width', 'font',
    'fontSize', 'minFontSize', 'align', 'multiline', 'lineHeight', 'maxHeight',
    'maxLines', 'format', 'fallbacks', 'required', 'optional', 'baselineShift',
    'showWhen', 'equals', 'invert', 'glyphSize', 'markStyle', 'offsetX',
    'offsetY', 'boxSize', 'thickness', 'inset', 'text'
  ];

  var BUILDER_FIELD_KEYS = {
    top: true,
    height: true,
    locked: true,
    reviewStatus: true,
    anchorNote: true,
    checkboxGroup: true,
    checkboxGroupKind: true,
    explanatory: true,
    workflowNote: true
  };

  var ROOT_KEYS = {
    schemaVersion: true,
    templateId: true,
    title: true,
    description: true,
    category: true,
    appliesTo: true,
    templateUrl: true,
    outputFilename: true,
    expectedPages: true,
    sourcePdfSha256: true,
    sourcePdf: true,
    pageGeometry: true,
    fonts: true,
    fields: true,
    wizard: true,
    fixtures: true,
    qa: true,
    productionProperties: true,
    replacementReview: true
  };

  function clone(value, seen) {
    if (value == null || typeof value !== 'object') return value;
    var prior = seen || [];
    for (var i = 0; i < prior.length; i += 1) {
      if (prior[i][0] === value) return prior[i][1];
    }
    var copy = Array.isArray(value) ? [] : {};
    prior.push([value, copy]);
    Object.keys(value).forEach(function (key) { copy[key] = clone(value[key], prior); });
    return copy;
  }

  function findNonSerializable(value, path, findings, stack) {
    var at = path || '$';
    var out = findings || [];
    var active = stack || [];
    if (typeof value === 'function') {
      out.push({ path: at, kind: 'function', name: value.name || '(anonymous)' });
      return out;
    }
    if (typeof value === 'bigint' || typeof value === 'symbol') {
      out.push({ path: at, kind: typeof value });
      return out;
    }
    if (!value || typeof value !== 'object') return out;
    if (active.indexOf(value) !== -1) {
      out.push({ path: at, kind: 'cycle' });
      return out;
    }
    var proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== Array.prototype && proto !== null) {
      out.push({ path: at, kind: 'custom-object', name: proto && proto.constructor && proto.constructor.name });
    }
    active.push(value);
    Object.keys(value).forEach(function (key) {
      findNonSerializable(value[key], at + '.' + key, out, active);
    });
    active.pop();
    return out;
  }

  function fieldGeometry(field) {
    var size = Number(field.fontSize || field.glyphSize || 9);
    var top = Number.isFinite(Number(field.top))
      ? Number(field.top)
      : Math.max(0, Number(field.baselineTop || 0) - size);
    var height = Number.isFinite(Number(field.height)) && Number(field.height) > 0
      ? Number(field.height)
      : Number(field.maxHeight || (field.multiline ? (field.lineHeight || size * 1.15) * (field.maxLines || 2) : size * 1.25));
    return { top: top, height: height };
  }

  function addBuilderGeometry(field) {
    var copy = clone(field);
    var geometry = fieldGeometry(copy);
    if (copy.top == null) copy.top = geometry.top;
    if (copy.height == null) copy.height = geometry.height;
    if (copy.locked == null) copy.locked = false;
    if (!copy.reviewStatus) copy.reviewStatus = 'unreviewed';
    if (copy.anchorNote == null) copy.anchorNote = '';
    return copy;
  }

  function emptyProject(meta) {
    var data = meta || {};
    var id = String(data.templateId || 'new-document').trim();
    return {
      schemaVersion: SCHEMA_VERSION,
      templateId: id,
      title: data.title || 'Новый PDF-шаблон',
      description: data.description || '',
      category: data.category || 'Документы и заявления клиента',
      appliesTo: clone(data.appliesTo || ['individual']),
      templateUrl: data.templateUrl || ('../assets/document-pdf-templates/' + id + '.pdf'),
      outputFilename: data.outputFilename || (id + '.pdf'),
      expectedPages: Number(data.expectedPages || 1),
      sourcePdfSha256: data.sourcePdfSha256 || '',
      sourcePdf: { name: data.sourcePdfName || '', committed: false },
      pageGeometry: [],
      fonts: clone(DEFAULT_FONTS),
      fields: [],
      wizard: { fields: [], checkFields: [], companyFields: [] },
      fixtures: [],
      qa: {
        status: 'Draft',
        lastValidatedAt: null,
        automaticValidationPassed: false,
        visualReviewPassed: false
      },
      productionProperties: {}
    };
  }

  function wizardFromRegistry(entry) {
    var owner = entry && entry.catalogOwner ? entry.catalogOwner : entry || {};
    var normalization = entry && entry.normalization || {};
    return {
      fields: clone(owner.fields || []),
      checkFields: clone(owner.checkFields || []),
      companyFields: clone(owner.companyFields || []),
      extraPassThroughToField: !!normalization.extraPassThroughToField,
      normalizedProviders: clone(normalization.providers || {})
    };
  }

  function fromProduction(template, entry) {
    var findings = findNonSerializable(template);
    var project = emptyProject({
      templateId: template.id,
      title: template.title || (entry && entry.title) || template.id,
      description: (entry && entry.description) || '',
      category: (entry && entry.category) || '',
      appliesTo: template.appliesTo || (entry && entry.appliesTo) || ['individual'],
      templateUrl: template.templateUrl,
      outputFilename: template.outputFilename || (entry && entry.pdfOutputFilename) || (template.id + '.pdf'),
      expectedPages: template.expectedPages
    });
    project.fonts = clone(template.fonts || DEFAULT_FONTS);
    project.fields = (template.fields || []).map(addBuilderGeometry);
    project.wizard = wizardFromRegistry(entry);
    project.sourcePdf.committed = true;
    project.sourcePdf.name = String(template.templateUrl || '').split('/').pop() || '';
    project.qa.status = 'Published';
    project.qa.automaticValidationPassed = true;
    project.qa.visualReviewPassed = true;
    project.productionProperties = {};
    Object.keys(template).forEach(function (key) {
      if (['id', 'title', 'templateUrl', 'outputFilename', 'expectedPages', 'appliesTo', 'fonts', 'fields'].indexOf(key) === -1) {
        project.productionProperties[key] = clone(template[key]);
      }
    });
    if (findings.length) {
      project.qa.status = 'Draft';
      project.qa.automaticValidationPassed = false;
      project.readOnlyRules = findings;
    }
    return project;
  }

  function cleanProductionField(field) {
    var result = {};
    Object.keys(field).forEach(function (key) {
      if (!BUILDER_FIELD_KEYS[key]) result[key] = clone(field[key]);
    });
    return result;
  }

  function toProduction(project, templateUrlOverride) {
    var template = clone(project.productionProperties || {});
    template.id = project.templateId;
    template.title = project.title;
    template.templateUrl = templateUrlOverride || project.templateUrl;
    template.outputFilename = project.outputFilename;
    template.expectedPages = Number(project.expectedPages);
    template.appliesTo = clone(project.appliesTo || []);
    template.fonts = clone(project.fonts || {});
    template.fields = (project.fields || [])
      .filter(function (field) { return !field.explanatory; })
      .map(cleanProductionField);
    return template;
  }

  function validateImported(project) {
    var errors = [];
    var warnings = [];
    if (!project || typeof project !== 'object' || Array.isArray(project)) {
      return { errors: [{ path: '$', message: 'Ожидается объект проекта.' }], warnings: [] };
    }
    if (!Number.isInteger(project.schemaVersion)) {
      errors.push({ path: 'schemaVersion', message: 'Версия схемы обязательна и должна быть целым числом.' });
    } else if (project.schemaVersion > SCHEMA_VERSION) {
      errors.push({ path: 'schemaVersion', message: 'Эта версия конструктора не поддерживает схему ' + project.schemaVersion + '.' });
    } else if (project.schemaVersion < 1) {
      errors.push({ path: 'schemaVersion', message: 'Некорректная версия схемы.' });
    }
    if (!project.templateId || typeof project.templateId !== 'string') {
      errors.push({ path: 'templateId', message: 'Не указан ID шаблона.' });
    }
    if (!Array.isArray(project.fields)) errors.push({ path: 'fields', message: 'fields должен быть массивом.' });
    if (!project.wizard || typeof project.wizard !== 'object') {
      errors.push({ path: 'wizard', message: 'Не задан раздел wizard.' });
    }
    findNonSerializable(project).forEach(function (finding) {
      errors.push({ path: finding.path, message: 'Неподдерживаемое значение: ' + finding.kind + '.' });
    });
    Object.keys(project).forEach(function (key) {
      if (!ROOT_KEYS[key]) warnings.push({ path: key, message: 'Неизвестное свойство сохранено без изменений.' });
    });
    return { errors: errors, warnings: warnings };
  }

  function migrate(project) {
    var checked = validateImported(project);
    if (checked.errors.length) return { project: null, errors: checked.errors, warnings: checked.warnings };
    // Future schema migrations are intentionally routed through this function.
    return { project: clone(project), errors: [], warnings: checked.warnings };
  }

  Schema.SCHEMA_VERSION = SCHEMA_VERSION;
  Schema.DEFAULT_FONTS = DEFAULT_FONTS;
  Schema.FIELD_PRODUCTION_KEYS = FIELD_PRODUCTION_KEYS;
  Schema.BUILDER_FIELD_KEYS = BUILDER_FIELD_KEYS;
  Schema.clone = clone;
  Schema.findNonSerializable = findNonSerializable;
  Schema.fieldGeometry = fieldGeometry;
  Schema.emptyProject = emptyProject;
  Schema.fromProduction = fromProduction;
  Schema.toProduction = toProduction;
  Schema.cleanProductionField = cleanProductionField;
  Schema.validateImported = validateImported;
  Schema.migrate = migrate;
  ns.schema = Schema;
}(typeof window !== 'undefined' ? window : this));
