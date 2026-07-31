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
    'id', 'label', 'source', 'type', 'page', 'left', 'baselineTop', 'width', 'font',
    'fontSize', 'minFontSize', 'align', 'multiline', 'lineHeight', 'lineHeightRatio',
    'maxHeight', 'maxLines', 'format', 'fallbacks', 'required', 'optional',
    'baselineShift', 'showWhen', 'equals', 'invert', 'glyphSize', 'markStyle',
    'offsetX', 'offsetY', 'boxSize', 'thickness', 'inset', 'text',
    // Continuation regions and the properties that travel with them.
    'flowRegions', 'overflowStrategy', 'allowPrintOverride', 'tokenBreak',
    'firstLineIndent', 'expansion'
  ];

  // Everything a page-expansion definition may carry. Nothing here may be lost
  // on an import/export round trip.
  var EXPANSION_KEYS = [
    'page', 'insertionTop', 'rowHeight', 'maxExtraRows', 'shiftFromTop',
    'shiftToTop', 'bottomReserve', 'lineStyle', 'reviewStatus', 'line',
    'maxFontSize', 'rowLeft', 'rowWidth', 'borders', 'columns',
    'bottomSegments', 'topSegments'
  ];

  // The budget a page shares between all of its anchors. Measured from the
  // authoritative PDF with tools/qa/measure_page_layout.py, stated once, and
  // carried through export/import untouched.
  var PAGE_LAYOUT_KEYS = [
    'fixedHeaderUntil', 'bodyBottom', 'fixedFooterFrom', 'shiftToTop',
    'bottomClearance', 'compaction', 'crossPageFlow', 'anchors'
  ];

  var CROSS_PAGE_FLOW_KEYS = [
    'targetPage', 'sourceFromTop', 'sourceToTop', 'sourceContentTop',
    'retainedBodyBottom', 'targetInsertionTop', 'targetShiftFromTop',
    'targetShiftToTop', 'targetShift', 'maxCumulativeShift',
    'maxCascadeDepth', 'reviewStatus', 'note'
  ];

  // One reviewed whitespace recovery: the gap between two complete blocks, and
  // the smallest a human agreed it may become.
  var COMPACTION_KEYS = ['top', 'originalGap', 'minGap', 'reviewStatus', 'note'];

  // What a page can give, given its budget. The same arithmetic the production
  // planner uses, so the builder cannot promise room production would refuse.
  function pageBudgetOf(layout) {
    if (!layout) return null;
    var clearance = layout.bottomClearance != null ? Number(layout.bottomClearance) : 4;
    var footer = layout.fixedFooterFrom != null
      ? Number(layout.fixedFooterFrom) : Number(layout.pageHeight || 0);
    var bottom = Math.max(0, footer - clearance - Number(layout.bodyBottom));
    var recoverable = (layout.compaction || []).reduce(function (sum, zone) {
      return sum + Math.max(0, Number(zone.originalGap) - Number(zone.minGap));
    }, 0);
    var flowRecoverable = layout.crossPageFlow
      ? Math.max(0, Number(layout.bodyBottom) -
          Number(layout.crossPageFlow.retainedBodyBottom)) : 0;
    return {
      bottomCapacity: Math.round(bottom * 100) / 100,
      recoverable: Math.round(recoverable * 100) / 100,
      flowRecoverable: Math.round(flowRecoverable * 100) / 100,
      total: Math.round((bottom + recoverable + flowRecoverable) * 100) / 100
    };
  }

  // Every property a continuation region may carry. Anything here must survive
  // an import/export round trip untouched.
  var FLOW_REGION_KEYS = [
    'page', 'left', 'baselineTop', 'width', 'maxLines', 'lineHeight',
    'lineHeightRatio', 'maxHeight', 'maxFontSize', 'align', 'baselineShift',
    'firstLineIndent', 'drawUnderline', 'underlineLeft', 'underlineTop',
    'underlineWidth', 'underlineThickness', 'underlineOffset', 'underlineColor',
    'generated', 'reviewStatus'
  ];

  // Policy shared with the production engine — the builder must never let a
  // user configure something production would refuse to draw.
  function policy() {
    var engine = global.CRMDocumentEngine;
    var layout = engine && engine.textLayout;
    return {
      minFontSize: layout ? layout.MIN_DYNAMIC_FONT_SIZE : 9,
      preferredFontSize: layout ? layout.PREFERRED_DYNAMIC_FONT_SIZE : 12
    };
  }

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
    pageLayout: true,
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
      pageLayout: {},
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
    // The page budget is a first-class part of the project, not an opaque
    // production property: the builder edits it and validates against it.
    project.pageLayout = clone(template.pageLayout || {});
    project.fields = (template.fields || []).map(addBuilderGeometry);
    project.wizard = wizardFromRegistry(entry);
    project.sourcePdf.committed = true;
    project.sourcePdf.name = String(template.templateUrl || '').split('/').pop() || '';
    project.qa.status = 'Published';
    project.qa.automaticValidationPassed = true;
    project.qa.visualReviewPassed = true;
    project.productionProperties = {};
    Object.keys(template).forEach(function (key) {
      if (['id', 'title', 'templateUrl', 'outputFilename', 'expectedPages',
           'appliesTo', 'fonts', 'fields', 'pageLayout'].indexOf(key) === -1) {
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
    if (project.pageLayout && Object.keys(project.pageLayout).length) {
      template.pageLayout = clone(project.pageLayout);
    } else {
      delete template.pageLayout;
    }
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

  // Ordered regions a value flows through, mirroring the production engine's
  // view of the same field. A field without `flowRegions` has exactly one
  // implicit region built from its own geometry.
  function flowRegions(field) {
    if (!Array.isArray(field.flowRegions) || !field.flowRegions.length) {
      return [{
        page: field.page,
        left: field.left,
        baselineTop: field.baselineTop,
        width: field.width,
        maxLines: field.maxLines,
        lineHeight: field.lineHeight,
        implicit: true
      }];
    }
    return clone(field.flowRegions);
  }

  // Build a continuation region below an existing one. The suggestion is never
  // trusted: it is written with reviewStatus 'suggested' and production export
  // stays blocked until a human has looked at it on the page.
  function suggestContinuation(field, regions, options) {
    var opts = options || {};
    var last = regions[regions.length - 1] || field;
    var size = Number(field.fontSize || policy().preferredFontSize);
    var leading = Number(last.lineHeight || opts.lineHeight || size * 1.15);
    var region = {
      page: last.page != null ? last.page : field.page,
      left: Number(last.left),
      baselineTop: Number((Number(last.baselineTop) + leading).toFixed(2)),
      width: Number(last.width),
      maxLines: 1,
      reviewStatus: 'suggested',
      generated: !!opts.withUnderline
    };
    if (opts.withUnderline) {
      region.drawUnderline = true;
      region.underlineThickness = opts.underlineThickness != null
        ? Number(opts.underlineThickness) : 0.36;
      region.underlineOffset = opts.underlineOffset != null
        ? Number(opts.underlineOffset) : Number((size * 0.176).toFixed(2));
    }
    return region;
  }

  // A starting expansion definition for a field, measured as far as the
  // builder can from what it already knows. Everything is a suggestion until a
  // human has looked at the page: `reviewStatus` stays 'suggested' and
  // validation blocks production export while it does.
  function suggestExpansion(field, pageSize, options) {
    var opts = options || {};
    var size = Number(field.fontSize || policy().preferredFontSize);
    var rowHeight = Number(opts.rowHeight || Math.round(size * 1.15 * 100) / 100);
    var insertionTop = Number(opts.insertionTop != null
      ? opts.insertionTop : Number(field.baselineTop) + size * 0.3);
    var spec = {
      page: Number(field.page),
      insertionTop: Math.round(insertionTop * 100) / 100,
      rowHeight: rowHeight,
      maxExtraRows: Number(opts.maxExtraRows || 1),
      shiftFromTop: Math.round(insertionTop * 100) / 100,
      lineStyle: opts.lineStyle || 'underline',
      reviewStatus: 'suggested',
      line: {
        left: Number(field.left),
        width: Number(field.width),
        baselineOffset: Math.round(rowHeight * 0.75 * 100) / 100,
        ruleOffset: Math.round(rowHeight * 0.9 * 100) / 100,
        ruleThickness: Number(opts.ruleThickness || 0.36)
      }
    };
    // A page that already declares its budget owns the reserve and the movable
    // block; repeating them on the anchor is what the page budget replaced.
    if (!opts.pageLayout) {
      spec.shiftToTop = Number(opts.shiftToTop != null
        ? opts.shiftToTop : Math.round((pageSize.height - 2) * 100) / 100);
      spec.bottomReserve = Number(opts.bottomReserve || rowHeight);
    }
    return spec;
  }

  // A starting page budget, from what the builder can see of the page. Every
  // number is a suggestion to be replaced by a measurement — compaction zones
  // start empty, because recovering white space is a reviewed decision.
  function suggestPageLayout(pageIndex, pageSize, options) {
    var opts = options || {};
    return {
      fixedHeaderUntil: Number(opts.fixedHeaderUntil || 0),
      bodyBottom: Number(opts.bodyBottom != null
        ? opts.bodyBottom : Math.round((pageSize.height * 0.9) * 100) / 100),
      fixedFooterFrom: opts.fixedFooterFrom != null
        ? Number(opts.fixedFooterFrom) : null,
      shiftToTop: Number(opts.shiftToTop != null
        ? opts.shiftToTop : Math.round((pageSize.height - 12) * 100) / 100),
      bottomClearance: Number(opts.bottomClearance != null ? opts.bottomClearance : 4),
      compaction: [],
      anchors: clone(opts.anchors || [])
    };
  }

  Schema.SCHEMA_VERSION = SCHEMA_VERSION;
  Schema.DEFAULT_FONTS = DEFAULT_FONTS;
  Schema.FIELD_PRODUCTION_KEYS = FIELD_PRODUCTION_KEYS;
  Schema.FLOW_REGION_KEYS = FLOW_REGION_KEYS;
  Schema.EXPANSION_KEYS = EXPANSION_KEYS;
  Schema.suggestExpansion = suggestExpansion;
  Schema.suggestPageLayout = suggestPageLayout;
  Schema.PAGE_LAYOUT_KEYS = PAGE_LAYOUT_KEYS;
  Schema.COMPACTION_KEYS = COMPACTION_KEYS;
  Schema.CROSS_PAGE_FLOW_KEYS = CROSS_PAGE_FLOW_KEYS;
  Schema.pageBudgetOf = pageBudgetOf;
  Schema.policy = policy;
  Schema.flowRegions = flowRegions;
  Schema.suggestContinuation = suggestContinuation;
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
