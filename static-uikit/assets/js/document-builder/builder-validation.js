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

  // The fit result always comes from the production engine — the builder must
  // configure production behaviour, never approximate it with its own copy.
  // Only the glyph-coverage check is builder-specific: production embeds a
  // subset and would simply drop an unmapped character, so it is worth catching
  // while the template is still being authored.
  function analyzeTextField(project, field, payload, profileId, font) {
    var renderer = global.CRMDocumentEngine.overlayRenderer;
    var result = renderer.layoutField(field, payload, font);

    if (result.reason === 'hidden') return { status: 'hidden', label: 'Не показывается' };
    if (result.reason === 'empty') {
      return { status: 'empty', label: 'Пусто (допустимо)', profileId: profileId };
    }
    if (result.reason === 'missing') {
      return { status: 'missing', label: 'Нет обязательного значения', profileId: profileId };
    }
    if (result.reason === 'overflow') {
      return {
        status: 'overflow',
        label: 'Не помещается',
        message: renderer.overflowMessage(result.diagnostics),
        requiredWidth: result.layout && result.layout.requiredWidth,
        availableWidth: result.diagnostics.availableWidth,
        lineCapacity: result.diagnostics.lineCapacity,
        regionCount: result.diagnostics.regionCount,
        value: result.diagnostics.value,
        profileId: profileId
      };
    }

    var unsupported = unsupportedCharacters(font, result.value);
    if (unsupported.length) {
      return {
        status: 'unsupported-glyph',
        label: unsupported[0].character + ' ' + unsupported[0].unicode,
        unsupported: unsupported,
        value: result.value,
        profileId: profileId
      };
    }

    var layout = result.layout;
    var status = result.usedFallback ? 'fallback'
      : layout.strategy === 'flow' ? 'flow'
      : layout.lines.length > 1 ? 'multiline'
      : layout.shrunk ? 'shrink' : 'normal';
    return {
      status: status,
      label: status === 'fallback' ? 'Fallback: ' + (result.formatter || 'без форматтера') :
        status === 'flow' ? layout.usedRegions.length + ' строк продолжения' :
        status === 'multiline' ? layout.lines.length + ' lines' :
        status === 'shrink' ? layout.size + ' pt' : 'OK',
      fontSize: layout.size,
      lines: layout.lines.length,
      regions: layout.usedRegions.length,
      assignments: layout.lines.map(function (line) {
        return { regionIndex: line.regionIndex, page: line.page, text: line.text };
      }),
      formatter: result.formatter,
      value: result.value,
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

  // ── Readability policy ─────────────────────────────────────────────────────
  //
  // The same rule production enforces, checked here so a project can never be
  // exported with a configuration the renderer would reject. Legacy maps
  // imported from before the policy land here and are flagged rather than
  // quietly corrected — a human decides what each slot should really use.
  function validateReadability(field, errors) {
    var floor = ns.schema.policy().minFontSize;
    if (field.minFontSize != null && Number(field.minFontSize) < floor) {
      errors.push(item('error', 'min-font-size',
        'Минимальный размер ниже допустимых ' + floor + ' pt', field));
    }
    if (field.fontSize != null && Number(field.fontSize) < floor) {
      errors.push(item('error', 'font-size-floor',
        'Начальный кегль ниже допустимых ' + floor + ' pt', field));
    }
  }

  // ── Continuation regions ───────────────────────────────────────────────────

  function validateFlowRegions(field, page, pageSizes, errors, warnings, project) {
    var declared = field.flowRegions;
    if (!Array.isArray(declared) || !declared.length) {
      if (field.overflowStrategy === 'flow') {
        errors.push(item('error', 'flow-regions',
          'Стратегия «flow» требует строк продолжения.', field));
      }
      return;
    }
    if (declared.length < 2) {
      errors.push(item('error', 'flow-regions',
        'Строк продолжения должно быть минимум две (основная и продолжение).', field));
    }

    var fontSize = Number(field.fontSize || ns.schema.policy().preferredFontSize);
    var boxes = [];

    declared.forEach(function (region, index) {
      var label = 'Строка ' + (index + 1);
      if (!Number.isInteger(region.page) || region.page < 0 || region.page >= pageSizes.length) {
        errors.push(item('error', 'flow-region-page',
          label + ': некорректная страница.', field));
        return;
      }
      var size = pageSizes[region.page];
      if (!Number.isFinite(Number(region.width)) || Number(region.width) <= 0) {
        errors.push(item('error', 'flow-region-width',
          label + ': ширина должна быть положительной.', field));
        return;
      }
      if (!Number.isFinite(Number(region.left)) || !Number.isFinite(Number(region.baselineTop))) {
        errors.push(item('error', 'flow-region-coordinate',
          label + ': координаты должны быть числами.', field));
        return;
      }
      if (Number(region.left) < 0 || Number(region.left) + Number(region.width) > size.width + 0.5 ||
          Number(region.baselineTop) < 0 || Number(region.baselineTop) > size.height) {
        errors.push(item('error', 'flow-region-bounds',
          label + ': выходит за границы страницы.', field));
      }
      if (region.lineHeightRatio == null && region.lineHeight != null &&
          Number(region.maxLines) !== 1 && Number(region.lineHeight) < fontSize * 0.9) {
        errors.push(item('error', 'flow-region-leading',
          label + ': интерлиньяж мал для кегля ' + fontSize + ' pt.', field));
      }
      if (region.maxFontSize != null && Number(region.maxFontSize) < ns.schema.policy().minFontSize) {
        errors.push(item('error', 'flow-region-max-size',
          label + ': максимальный кегль ниже допустимых ' +
          ns.schema.policy().minFontSize + ' pt.', field));
      }
      // A generated line invented by the builder must be looked at on the page
      // before it can reach a client document.
      if (region.generated && region.reviewStatus !== 'approved') {
        errors.push(item('error', 'flow-region-unreviewed',
          label + ': сгенерированная строка не подтверждена визуально — ' +
          'production-экспорт заблокирован.', field));
      }

      // Ink box, not em box. Lines on a tight legal form routinely have em
      // boxes that graze each other; what matters is whether the printed
      // glyphs collide, so measure from cap height rather than the font's
      // typographic ascent, and honour a region's own size cap.
      var regionSize = region.maxFontSize != null
        ? Math.min(fontSize, Number(region.maxFontSize)) : fontSize;
      boxes.push({
        label: label, page: region.page,
        left: Number(region.left), right: Number(region.left) + Number(region.width),
        top: Number(region.baselineTop) - regionSize * 0.7,
        bottom: Number(region.baselineTop) + regionSize * 0.216
      });
    });

    // Regions of one field must not sit on top of each other.
    boxes.forEach(function (a, i) {
      boxes.slice(i + 1).forEach(function (b) {
        if (a.page !== b.page) return;
        if (a.right <= b.left || b.right <= a.left) return;
        if (a.bottom <= b.top || b.bottom <= a.top) return;
        errors.push(item('error', 'flow-region-overlap',
          a.label + ' и ' + b.label + ' перекрываются.', field));
      });
    });

    // …nor cross another dynamic field that is drawn on the same page.
    (project.fields || []).forEach(function (other) {
      if (other === field || other.id === field.id) return;
      if ((other.type || 'text') === 'check') return;
      var otherTop = Number(other.baselineTop) - Number(other.fontSize || fontSize) * 0.7;
      var otherBottom = Number(other.baselineTop) + Number(other.fontSize || fontSize) * 0.216;
      var otherLeft = Number(other.left);
      var otherRight = otherLeft + Number(other.width || 0);
      boxes.forEach(function (box, index) {
        if (index === 0) return;                 // the primary slot is the map's own
        if (box.page !== other.page) return;
        if (box.right <= otherLeft || otherRight <= box.left) return;
        if (box.bottom <= otherTop || otherBottom <= box.top) return;
        warnings.push(item('warning', 'flow-region-neighbour',
          box.label + ' пересекается с полем ' + other.id + '.', field));
      });
    });
  }

  // ── Page-section expansion ─────────────────────────────────────────────────
  //
  // Blocks export when anything about growing the page is undefined, unsafe or
  // unreviewed. Production refuses the same configurations; this just says so
  // while the template is still being authored.
  function validateExpansion(field, pageSizes, errors, warnings, project) {
    var spec = field.expansion;
    if (!spec) {
      if (field.overflowStrategy === 'expand-layout') {
        errors.push(item('error', 'expansion-missing',
          'Стратегия «expand-layout» требует блока расширения.', field));
      }
      return;
    }
    if (field.overflowStrategy !== 'expand-layout') {
      errors.push(item('error', 'expansion-strategy',
        'Блок расширения задан, но стратегия поля не «expand-layout».', field));
    }

    var page = spec.page != null ? Number(spec.page) : Number(field.page);
    if (!Number.isInteger(page) || page < 0 || page >= pageSizes.length) {
      errors.push(item('error', 'expansion-page',
        'Некорректная страница расширения.', field));
      return;
    }
    var size = pageSizes[page];

    var numbers = ['insertionTop', 'rowHeight', 'maxExtraRows', 'shiftFromTop',
                   'shiftToTop', 'bottomReserve'];
    var missing = numbers.filter(function (key) {
      return !Number.isFinite(Number(spec[key]));
    });
    if (missing.length) {
      errors.push(item('error', 'expansion-incomplete',
        'Не заданы параметры расширения: ' + missing.join(', ') + '.', field));
      return;
    }

    var rows = Number(spec.maxExtraRows);
    var height = Number(spec.rowHeight);
    var reserve = Number(spec.bottomReserve);

    if (height <= 0) {
      errors.push(item('error', 'expansion-row-height',
        'Высота вставляемой строки должна быть положительной.', field));
    }
    if (rows < 1) {
      errors.push(item('error', 'expansion-max-rows',
        'Максимум вставляемых строк должен быть не меньше одной.', field));
    }
    if (rows * height > reserve + 1e-6) {
      errors.push(item('error', 'expansion-reserve',
        'Максимальное расширение (' + Math.round(rows * height * 100) / 100 +
        ' pt) больше запаса внизу страницы (' + reserve + ' pt).', field));
    }
    if (Number(spec.shiftFromTop) > Number(spec.insertionTop) + 1e-6) {
      errors.push(item('error', 'expansion-block',
        'Начало подвижного блока ниже точки вставки.', field));
    }
    if (Number(spec.shiftToTop) <= Number(spec.shiftFromTop)) {
      errors.push(item('error', 'expansion-block',
        'Подвижный блок страницы не задан.', field));
    }
    if (Number(spec.shiftToTop) > size.height + 0.5) {
      errors.push(item('error', 'expansion-bounds',
        'Подвижный блок выходит за нижнюю границу страницы.', field));
    }

    var line = spec.line || {};
    if (!Number.isFinite(Number(line.width)) || Number(line.width) <= 0) {
      errors.push(item('error', 'expansion-line',
        'У вставляемой строки не задана ширина.', field));
    } else if (Number(line.left) < 0 ||
               Number(line.left) + Number(line.width) > size.width + 0.5) {
      errors.push(item('error', 'expansion-line',
        'Вставляемая строка выходит за границы страницы.', field));
    }
    if (!Number.isFinite(Number(line.ruleThickness))) {
      errors.push(item('error', 'expansion-line',
        'Не задана толщина линии вставляемой строки.', field));
    }
    if ((spec.lineStyle || 'underline') === 'table-row' &&
        !(spec.columns || []).length && spec.borders &&
        spec.borders.left === false && spec.borders.right === false) {
      warnings.push(item('warning', 'expansion-table-row',
        'У строки таблицы не заданы ни боковые границы, ни колонки.', field));
    }

    // An inserted row must not land on top of something fixed.
    var rowTop = Number(spec.insertionTop);
    var rowBottom = rowTop + rows * height;
    (project.fields || []).forEach(function (other) {
      if (other === field || other.id === field.id) return;
      if (Number(other.page) !== page) return;
      if (other.expansion) return;               // it moves with the shift
      var top = Number(other.baselineTop) - Number(other.fontSize || 12) * 0.7;
      if (top >= rowTop - 1e-6 && top <= rowBottom + 1e-6) {
        warnings.push(item('warning', 'expansion-overlap',
          'Вставляемая строка перекрывает поле ' + other.id + '.', field));
      }
    });

    if (spec.reviewStatus !== 'approved') {
      errors.push(item('error', 'expansion-unreviewed',
        'Правило расширения не подтверждено визуально — production-экспорт ' +
        'заблокирован.', field));
    }
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
      if (type !== 'check') validateReadability(field, errors);
      if (type !== 'check') validateFlowRegions(field, page, pageSizes, errors, warnings, project);
      if (type !== 'check') validateExpansion(field, pageSizes, errors, warnings, project);
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
      var counts = { normal: 0, shrink: 0, multiline: 0, flow: 0, fallback: 0, failures: 0, missing: 0, unsupportedGlyphs: 0 };
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
