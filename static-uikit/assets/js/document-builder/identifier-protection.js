(function (global) {
  'use strict';

  var ns = global.CRMDocumentBuilder = global.CRMDocumentBuilder || {};
  var Protection = {};
  var VERSION = 1;
  var WARNING = 'Идентификатор существующей переменной используется production-формами и не может быть изменён.';

  function clone(value) {
    return ns.schema && ns.schema.clone
      ? ns.schema.clone(value)
      : JSON.parse(JSON.stringify(value));
  }

  function wizardKeys(wizard) {
    var source = wizard || {};
    var result = {};
    ['fields', 'checkFields', 'companyFields'].forEach(function (group) {
      result[group] = (source[group] || []).map(function (control) {
        return String(control.key || '');
      }).filter(Boolean);
    });
    return result;
  }

  function capture(template, wizard, entry) {
    var registryEntry = entry || {};
    return {
      version: VERSION,
      templateId: String(template && template.id || ''),
      registryId: String(registryEntry.id || template && template.id || ''),
      overlayTemplateId: String(registryEntry.overlayTemplateId || template && template.id || ''),
      fields: (template && template.fields || []).map(function (field) {
        return {
          id: String(field.id || ''),
          source: field.source == null ? null : String(field.source)
        };
      }),
      wizardKeys: wizardKeys(wizard)
    };
  }

  function runtimeEntry(templateId) {
    var catalog = global.CRMDocumentCatalog;
    var documents = catalog && catalog.documents || [];
    for (var i = 0; i < documents.length; i += 1) {
      var owner = documents[i];
      if (owner.overlayTemplateId === templateId) return { entry: owner, owner: owner };
      var children = owner.packageDocuments || [];
      for (var j = 0; j < children.length; j += 1) {
        if (children[j].overlayTemplateId === templateId) {
          return { entry: children[j], owner: owner };
        }
      }
    }
    return null;
  }

  function runtimeBaseline(project) {
    var templateId = String(project && project.templateId || '');
    var maps = global.CRMDocumentEngine && global.CRMDocumentEngine.fieldMaps || {};
    var template = maps[templateId];
    var match = runtimeEntry(templateId);
    if (!template || !match) return null;
    return capture(template, {
      fields: match.owner.fields || [],
      checkFields: match.owner.checkFields || [],
      companyFields: match.owner.companyFields || []
    }, match.entry);
  }

  function ordered(value) {
    if (Array.isArray(value)) return value.map(ordered);
    if (!value || typeof value !== 'object') return value;
    var result = {};
    Object.keys(value).sort().forEach(function (key) {
      result[key] = ordered(value[key]);
    });
    return result;
  }

  function sameProtection(left, right) {
    return JSON.stringify(ordered(left || null)) === JSON.stringify(ordered(right || null));
  }

  function issue(code, message, path, fieldId) {
    return {
      code: code,
      message: message,
      path: path || null,
      fieldId: fieldId || null
    };
  }

  // Existing identifiers are a required subset. New fields and controls are
  // deliberately allowed, while removing or renaming anything captured from a
  // production map is rejected.
  function validate(project, requiredProtection) {
    var canonical = requiredProtection || runtimeBaseline(project);
    var baseline = canonical || project && project.identifierProtection;
    if (!baseline) return [];
    var problems = [];
    var fields = project && project.fields || [];
    var byId = {};
    fields.forEach(function (field) {
      if (field && field.id != null && !byId[field.id]) byId[field.id] = field;
    });

    if (String(project && project.templateId || '') !== String(baseline.templateId || '')) {
      problems.push(issue('protected-template-id', WARNING, 'templateId'));
    }
    if (project && project.identifierProtection && canonical &&
        !sameProtection(project.identifierProtection, canonical)) {
      problems.push(issue('protected-metadata', WARNING, 'identifierProtection'));
    }

    (baseline.fields || []).forEach(function (original) {
      var field = byId[original.id];
      if (!field) {
        problems.push(issue('protected-field-id', WARNING,
          'fields.' + original.id + '.id', original.id));
        return;
      }
      var currentSource = field.source == null ? null : String(field.source);
      var originalSource = original.source == null ? null : String(original.source);
      if (currentSource !== originalSource) {
        problems.push(issue('protected-field-source', WARNING,
          'fields.' + original.id + '.source', original.id));
      }
    });

    var currentWizard = wizardKeys(project && project.wizard);
    ['fields', 'checkFields', 'companyFields'].forEach(function (group) {
      var present = {};
      (currentWizard[group] || []).forEach(function (key) { present[key] = true; });
      (((baseline.wizardKeys || {})[group]) || []).forEach(function (key) {
        if (!present[key]) {
          problems.push(issue('protected-wizard-key', WARNING,
            'wizard.' + group + '.' + key));
        }
      });
    });
    return problems;
  }

  function attach(project) {
    var canonical = runtimeBaseline(project);
    if (!project.identifierProtection && canonical) {
      project.identifierProtection = clone(canonical);
    }
    assertPreserved(project, canonical || project.identifierProtection);
    return project;
  }

  function assertPreserved(project, requiredProtection) {
    var problems = validate(project, requiredProtection);
    if (!problems.length) return true;
    var error = new Error(problems[0].message);
    error.name = 'IdentifierProtectionError';
    error.code = problems[0].code;
    error.path = problems[0].path;
    error.fieldId = problems[0].fieldId;
    error.identifierProblems = problems;
    throw error;
  }

  function baselineField(project, id) {
    var baseline = project && project.identifierProtection;
    if (!baseline) return null;
    return (baseline.fields || []).find(function (field) { return field.id === id; }) || null;
  }

  function isWizardKeyProtected(project, group, key) {
    var baseline = project && project.identifierProtection;
    return !!(baseline && (((baseline.wizardKeys || {})[group]) || []).indexOf(key) !== -1);
  }

  function currentProjectIdentifiers(project) {
    return {
      templateId: String(project && project.templateId || ''),
      fields: (project && project.fields || []).map(function (field) {
        return {
          id: String(field.id || ''),
          source: field.source == null ? null : String(field.source)
        };
      }).sort(function (a, b) {
        return (a.id + '\u0000' + (a.source || '')).localeCompare(
          b.id + '\u0000' + (b.source || ''));
      }),
      wizardKeys: (function () {
        var keys = wizardKeys(project && project.wizard);
        Object.keys(keys).forEach(function (group) { keys[group].sort(); });
        return keys;
      }())
    };
  }

  Protection.VERSION = VERSION;
  Protection.WARNING = WARNING;
  Protection.capture = capture;
  Protection.runtimeBaseline = runtimeBaseline;
  Protection.attach = attach;
  Protection.validate = validate;
  Protection.assertPreserved = assertPreserved;
  Protection.baselineField = baselineField;
  Protection.isFieldProtected = function (project, id) { return !!baselineField(project, id); };
  Protection.isTemplateProtected = function (project) { return !!(project && project.identifierProtection); };
  Protection.isWizardKeyProtected = isWizardKeyProtected;
  Protection.currentProjectIdentifiers = currentProjectIdentifiers;
  Protection.clone = clone;
  ns.identifierProtection = Protection;
}(typeof window !== 'undefined' ? window : this));
