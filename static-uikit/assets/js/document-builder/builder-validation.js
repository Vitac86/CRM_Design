(function (global) {
  'use strict';

  var ns = global.CRMDocumentBuilder = global.CRMDocumentBuilder || {};
  var Validation = {};
  var fontCache = {};

  function item(level, code, message, field, path) {
    return {
      level: level,
      code: code,
      message: message,
      fieldId: field && field.id || null,
      page: field && Number.isInteger(field.page) ? field.page : null,
      path: path || null
    };
  }

  function visible(field, payload) {
    var condition = field.showWhen;
    if (!condition || !condition.source) return true;
    var value = global.CRMDocumentEngine.overlayRenderer.resolve(condition.source, payload);
    if (Object.prototype.hasOwnProperty.call(condition, 'equals')) {
      return Array.isArray(condition.equals)
        ? condition.equals.indexOf(value) !== -1
        : value === condition.equals;
    }
    return !!value;
  }

  function format(formatter, raw) {
    if (!formatter) return raw == null ? '' : String(raw);
    var fn = global.CRMDocumentEngine.overlayRenderer.formatters[formatter];
    return fn ? fn(raw) : (raw == null ? '' : String(raw));
  }

  function fontFor(url) {
    var absolute;
    try {
      absolute = new URL(url, global.location.href);
    } catch (error) {
      return Promise.reject(new Error('URL шрифта некорректен.'));
    }
    if (absolute.protocol !== 'blob:' && absolute.origin !== global.location.origin) {
      return Promise.reject(new Error('Внешний URL шрифта запрещён.'));
    }
    if (!fontCache[absolute.href]) {
      fontCache[absolute.href] = fetch(absolute.href)
        .then(function (response) {
          if (!response.ok) throw new Error('Шрифт не загружен: HTTP ' + response.status + '.');
          return response.arrayBuffer();
        })
        .then(function (bytes) {
          if (!global.PDFLib || !global.fontkit) throw new Error('pdf-lib/fontkit не загружены.');
          return global.PDFLib.PDFDocument.create().then(function (doc) {
            doc.registerFontkit(global.fontkit);
            return doc.embedFont(bytes, { subset: false });
          });
        });
    }
    return fontCache[absolute.href];
  }

  function unsupportedCharacters(font, value) {
    var supported = {};
    font.getCharacterSet().forEach(function (code) { supported[code] = true; });
    var result = [];
    Array.from(String(value || '')).forEach(function (character) {
      var code = character.codePointAt(0);
      if (/\s/.test(character)) return;
      if (!supported[code] && !result.some(function (entry) { return entry.codePoint === code; })) {
        result.push({ character: character, codePoint: code, unicode: 'U+' + code.toString(16).toUpperCase().padStart(4, '0') });
      }
    });
    return result;
  }

  function analyzeTextField(project, field, payload, profileId, font) {
    if (!visible(field, payload)) return { status: 'hidden', label: 'Не показывается' };
    var renderer = global.CRMDocumentEngine.overlayRenderer;
    var raw = (field.type || 'text') === 'static' ? field.text : renderer.resolve(field.source, payload);
    if (raw == null || raw === '') {
      return field.required
        ? { status: 'missing', label: 'Нет обязательного значения', profileId: profileId }
        : { status: 'empty', label: 'Пусто (допустимо)', profileId: profileId };
    }
    var candidates = [field.format].concat(field.fallbacks || []);
    var firstUnsupported = null;
    var lastFit = null;
    for (var index = 0; index < candidates.length; index += 1) {
      var formatter = candidates[index];
      var value = format(formatter, raw);
      if (!value) continue;
      var unsupported = unsupportedCharacters(font, value);
      if (unsupported.length) {
        if (!firstUnsupported) firstUnsupported = { value: value, unsupported: unsupported, formatter: formatter };
        continue;
      }
      var start = Number(field.fontSize || 9);
      var fit = global.CRMDocumentEngine.textLayout.fitText(font, value, {
        size: start,
        minSize: field.minFontSize != null ? Number(field.minFontSize) : start,
        maxWidth: Number(field.width),
        maxHeight: field.maxHeight == null ? undefined : Number(field.maxHeight),
        maxLines: field.maxLines == null ? undefined : Number(field.maxLines),
        multiline: !!field.multiline,
        lineHeight: field.lineHeight == null ? undefined : Number(field.lineHeight)
      });
      lastFit = fit;
      if (!fit.fits) continue;
      var status = index > 0 ? 'fallback' :
        (fit.lines.length > 1 ? 'multiline' : (fit.size < start - 0.001 ? 'shrink' : 'normal'));
      return {
        status: status,
        label: status === 'fallback' ? 'Fallback: ' + (formatter || 'без форматтера') :
          status === 'multiline' ? fit.lines.length + ' lines' :
          status === 'shrink' ? fit.size + ' pt' : 'OK',
        fontSize: fit.size,
        lines: fit.lines.length,
        formatter: formatter || null,
        value: value,
        profileId: profileId
      };
    }
    if (firstUnsupported) {
      return {
        status: 'unsupported-glyph',
        label: firstUnsupported.unsupported[0].character + ' ' + firstUnsupported.unsupported[0].unicode,
        unsupported: firstUnsupported.unsupported,
        value: firstUnsupported.value,
        profileId: profileId
      };
    }
    return {
      status: 'overflow',
      label: 'Не помещается',
      requiredWidth: lastFit && lastFit.requiredWidth,
      availableWidth: field.width,
      profileId: profileId
    };
  }

  function analyzeField(project, field, payload, profileId, fonts) {
    if ((field.type || 'text') === 'check') {
      var raw = global.CRMDocumentEngine.overlayRenderer.resolve(field.source, payload);
      var selected = Object.prototype.hasOwnProperty.call(field, 'equals')
        ? (Array.isArray(field.equals) ? field.equals.indexOf(raw) !== -1 : raw === field.equals)
        : !!raw;
      if (field.invert) selected = !selected;
      return { status: 'normal', label: selected ? 'Selected' : 'Unselected', profileId: profileId };
    }
    var font = fonts[field.font || 'legalSerif'];
    if (!font) return { status: 'error', label: 'Неизвестный шрифт', profileId: profileId };
    return analyzeTextField(project, field, payload, profileId, font);
  }

  function loadProjectFonts(project) {
    var spec = project.fonts || {};
    var keys = Object.keys(spec);
    return Promise.all(keys.map(function (key) { return fontFor(spec[key]); }))
      .then(function (fonts) {
        var result = {};
        keys.forEach(function (key, index) { result[key] = fonts[index]; });
        return result;
      });
  }

  function structural(project, baseInfo, payload) {
    var errors = [];
    var warnings = [];
    var ids = {};
    var positions = {};
    var knownFormats = global.CRMDocumentEngine.overlayRenderer.formatters;
    var pageSizes = baseInfo && baseInfo.pages || project.pageGeometry || [];
    var wizard = project.wizard || { fields: [], checkFields: [], companyFields: [] };
    var extraProviders = {};
    var checkProviders = {};
    (wizard.fields || []).concat(wizard.companyFields || []).forEach(function (field) { extraProviders[field.key] = field; });
    (wizard.checkFields || []).forEach(function (field) { checkProviders[field.key] = field; });
    var usedWizard = {};
    var usedPdfSources = {};
    (project.fields || []).forEach(function (field) {
      if (field.source) usedPdfSources[field.source] = true;
      if (field.showWhen && field.showWhen.source) usedPdfSources[field.showWhen.source] = true;
    });

    function normalizedProviderUsed(path) {
      var derived = ((wizard.normalizedProviders || {})[path] || []).slice();
      if (wizard.extraPassThroughToField && path.indexOf('extra.') === 0) {
        derived.push('field.' + path.slice(6));
      }
      return derived.some(function (source) { return !!usedPdfSources[source]; });
    }

    function hasNormalizedSourceProvider(source) {
      return Object.keys(wizard.normalizedProviders || {}).some(function (path) {
        return ((wizard.normalizedProviders || {})[path] || []).indexOf(source) !== -1;
      });
    }

    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(project.templateId || '')) {
      errors.push(item('error', 'template-id', 'ID шаблона должен содержать только ASCII-буквы, цифры, точку, дефис или подчёркивание.', null, 'templateId'));
    }
    if (!project.outputFilename || !/\.pdf$/i.test(project.outputFilename)) {
      errors.push(item('error', 'output-filename', 'Имя выходного файла должно оканчиваться на .pdf.', null, 'outputFilename'));
    }
    if (!project.templateUrl || !/\.pdf(?:$|[?#])/i.test(project.templateUrl)) {
      errors.push(item('error', 'template-url', 'Нужен локальный URL PDF-шаблона.', null, 'templateUrl'));
    } else {
      try {
        var templateAbsolute = new URL(project.templateUrl, global.location.href);
        if (templateAbsolute.protocol !== 'blob:' && templateAbsolute.origin !== global.location.origin) {
          errors.push(item('error', 'external-template-url', 'Внешний URL PDF запрещён.', null, 'templateUrl'));
        }
      } catch (urlError) {
        errors.push(item('error', 'template-url', 'URL PDF-шаблона некорректен.', null, 'templateUrl'));
      }
    }
    Object.keys(project.fonts || {}).forEach(function (fontName) {
      try {
        var fontAbsolute = new URL(project.fonts[fontName], global.location.href);
        if (fontAbsolute.protocol !== 'blob:' && fontAbsolute.origin !== global.location.origin) {
          errors.push(item('error', 'external-font-url', 'Внешний URL шрифта запрещён: ' + fontName + '.', null, 'fonts.' + fontName));
        }
      } catch (fontUrlError) {
        errors.push(item('error', 'font-url', 'URL шрифта некорректен: ' + fontName + '.', null, 'fonts.' + fontName));
      }
    });
    if (baseInfo) {
      if (Number(project.expectedPages) !== Number(baseInfo.pageCount)) {
        errors.push(item('error', 'page-count', 'Ожидалось страниц: ' + project.expectedPages + ', в PDF: ' + baseInfo.pageCount + '.'));
      }
      if (baseInfo.acroFormFields > 0) errors.push(item('error', 'acroform', 'В базовом PDF обнаружены AcroForm-поля: ' + baseInfo.acroFormFields + '.'));
      if (baseInfo.widgets > 0) errors.push(item('error', 'widgets', 'В базовом PDF обнаружены виджеты: ' + baseInfo.widgets + '.'));
      if (project.sourcePdfSha256 && baseInfo.sha256 && project.sourcePdfSha256 !== baseInfo.sha256) {
        warnings.push(item('warning', 'hash-mismatch', 'SHA-256 PDF отличается от сохранённого в проекте. Требуется повторная проверка.'));
      }
    }

    (project.fields || []).forEach(function (field, index) {
      var id = field.id || ('#' + index);
      if (!field.id) errors.push(item('error', 'field-id', 'У поля нет ID.', field, 'fields.' + index + '.id'));
      else if (ids[id]) errors.push(item('error', 'duplicate-id', 'Дублирующийся ID поля: ' + id + '.', field));
      ids[id] = true;
      var type = field.type || 'text';
      if (['text', 'static', 'check'].indexOf(type) === -1) errors.push(item('error', 'field-type', 'Неподдерживаемый тип: ' + type + '.', field));
      if (!Number.isInteger(field.page) || field.page < 0 || field.page >= pageSizes.length) {
        errors.push(item('error', 'field-page', 'Некорректный индекс страницы.', field));
        return;
      }
      var page = pageSizes[field.page];
      ['left', 'baselineTop'].forEach(function (key) {
        if (!Number.isFinite(Number(field[key]))) errors.push(item('error', 'coordinate', key + ' должен быть числом.', field));
      });
      if (type !== 'check' && (!Number.isFinite(Number(field.width)) || Number(field.width) <= 0)) {
        errors.push(item('error', 'field-width', 'Ширина текстового поля должна быть положительной.', field));
      }
      var geometry = ns.schema.fieldGeometry(field);
      var right = Number(field.left) + (type === 'check' ? Number(field.boxSize || field.glyphSize || 8.5) : Number(field.width || 0));
      var bottom = type === 'check' ? Number(field.baselineTop) + Number(field.boxSize || field.glyphSize || 8.5) : geometry.top + geometry.height;
      if (Number(field.left) < 0 || geometry.top < 0 || right > page.width + 0.5 || bottom > page.height + 0.5 || Number(field.baselineTop) > page.height) {
        errors.push(item('error', 'out-of-bounds', 'Поле выходит за границы страницы.', field));
      }
      if (type !== 'static' && !field.source) errors.push(item('error', 'missing-source', 'Не указан источник.', field));
      if (field.source && !ns.sourceCatalog.isValid(field.source)) errors.push(item('error', 'source-syntax', 'Некорректный путь источника: ' + field.source + '.', field));
      if (field.source && field.source.indexOf('extra.') === 0) {
        var extraKey = field.source.slice(6);
        usedWizard['extra.' + extraKey] = true;
        if (!extraProviders[extraKey]) errors.push(item('error', 'unresolved-wizard-source', 'Нет wizard-поля для ' + field.source + '.', field));
      }
      if (field.source && field.source.indexOf('check.') === 0) {
        var checkKey = field.source.slice(6);
        usedWizard['check.' + checkKey] = true;
        if (!checkProviders[checkKey] && !hasNormalizedSourceProvider(field.source)) errors.push(item('error', 'unresolved-wizard-source', 'Нет checkbox-поля для ' + field.source + '.', field));
      }
      if (field.format && !knownFormats[field.format]) errors.push(item('error', 'formatter', 'Неизвестный форматтер: ' + field.format + '.', field));
      (field.fallbacks || []).forEach(function (name) {
        if (name && !knownFormats[name]) errors.push(item('error', 'fallback', 'Неизвестный fallback: ' + name + '.', field));
      });
      if (field.font && !(project.fonts || {})[field.font]) errors.push(item('error', 'font', 'Неизвестный шрифт: ' + field.font + '.', field));
      if (field.minFontSize != null && Number(field.minFontSize) > Number(field.fontSize)) errors.push(item('error', 'font-size', 'Минимальный кегль больше начального.', field));
      if (field.showWhen) {
        if (!ns.sourceCatalog.isValid(field.showWhen.source)) errors.push(item('error', 'show-when', 'Некорректный источник условия.', field));
        if (field.showWhen.invert != null || field.showWhen.expression != null) errors.push(item('error', 'show-when', 'Условие содержит неподдерживаемое выражение.', field));
        usedWizard[field.showWhen.source] = true;
      }
      if (type === 'check' && field.markStyle && ['check', 'cross', 'fill'].indexOf(field.markStyle) === -1) errors.push(item('error', 'mark-style', 'Неизвестный стиль отметки.', field));
      if (field.checkboxGroupKind === 'mutually-exclusive' && !Object.prototype.hasOwnProperty.call(field, 'equals')) {
        errors.push(item('error', 'checkbox-group', 'Взаимоисключающая отметка должна иметь equals.', field));
      }
      var positionKey = [field.source, field.page, field.left, field.baselineTop].join('|');
      var previousAtPosition = positions[positionKey];
      var sameCondition = previousAtPosition && JSON.stringify(previousAtPosition.showWhen || null) === JSON.stringify(field.showWhen || null);
      if (field.source && previousAtPosition && (!previousAtPosition.showWhen || !field.showWhen || sameCondition)) {
        warnings.push(item('warning', 'duplicate-position', 'Повторяется источник и позиция с полем ' + previousAtPosition.id + '.', field));
      }
      positions[positionKey] = field;
      if (payload && field.source && field.required && visible(field, payload) && global.CRMDocumentEngine.overlayRenderer.resolve(field.source, payload) === undefined) {
        errors.push(item('error', 'missing-required', 'В выбранном профиле отсутствует обязательный источник ' + field.source + '.', field));
      }
      if (field.reviewStatus === 'required') warnings.push(item('warning', 'review-required', 'Координаты требуют визуальной проверки после замены PDF.', field));
    });

    (wizard.fields || []).forEach(function (control) {
      var path = 'extra.' + control.key;
      if (!usedWizard[path] && !normalizedProviderUsed(path) && !control.workflowOnly) warnings.push(item('warning', 'unused-wizard', 'Wizard-поле не используется PDF: ' + control.key + '.'));
      if (control.workflowOnly && !control.workflowReason) errors.push(item('error', 'workflow-reason', 'Для workflow-only поля нужна причина: ' + control.key + '.'));
    });
    (wizard.checkFields || []).forEach(function (control) {
      var path = 'check.' + control.key;
      if (!usedWizard[path] && !control.workflowOnly) warnings.push(item('warning', 'unused-wizard', 'Wizard-checkbox не используется PDF: ' + control.key + '.'));
    });
    (wizard.companyFields || []).forEach(function (control) {
      var path = 'extra.' + control.key;
      if (!usedWizard[path] && !normalizedProviderUsed(path) && !control.optionsFrom && !control.workflowOnly) warnings.push(item('warning', 'unused-wizard', 'Company wizard-поле не используется PDF: ' + control.key + '.'));
    });

    if (project.qa && ['Approved', 'Published'].indexOf(project.qa.status) === -1) {
      warnings.push(item('warning', 'qa-status', 'Статус проекта ' + project.qa.status + ': production export требует предупреждения.'));
    }
    return { errors: errors, warnings: warnings };
  }

  function analyzeProfile(project, profileId, overrides, fonts) {
    var payload = ns.fixtures.payloadFor(profileId, project, overrides);
    return {
      profileId: profileId,
      payload: payload,
      fields: (project.fields || []).map(function (field) {
        return { fieldId: field.id, page: field.page, result: analyzeField(project, field, payload, profileId, fonts) };
      })
    };
  }

  function runAll(project, overrides) {
    return loadProjectFonts(project).then(function (fonts) {
      var profiles = ns.fixtures.profiles.map(function (profile) { return analyzeProfile(project, profile.id, overrides, fonts); });
      var counts = { normal: 0, shrink: 0, multiline: 0, fallback: 0, failures: 0, missing: 0, unsupportedGlyphs: 0 };
      profiles.forEach(function (profile) {
        profile.fields.forEach(function (entry) {
          var status = entry.result.status;
          if (counts[status] != null) counts[status] += 1;
          if (status === 'overflow' || status === 'error') counts.failures += 1;
          if (status === 'missing') counts.missing += 1;
          if (status === 'unsupported-glyph') counts.unsupportedGlyphs += 1;
        });
      });
      return { profiles: profiles, counts: counts };
    });
  }

  Validation.visible = visible;
  Validation.format = format;
  Validation.loadProjectFonts = loadProjectFonts;
  Validation.unsupportedCharacters = unsupportedCharacters;
  Validation.analyzeField = analyzeField;
  Validation.analyzeProfile = function (project, profileId, overrides) {
    return loadProjectFonts(project).then(function (fonts) { return analyzeProfile(project, profileId, overrides, fonts); });
  };
  Validation.runAll = runAll;
  Validation.structural = structural;
  ns.validation = Validation;
}(typeof window !== 'undefined' ? window : this));
