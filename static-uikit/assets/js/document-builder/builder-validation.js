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

  function validateWordFlowBlocks(project, pageSizes, knownFormats, errors) {
    var renderer = global.CRMDocumentEngine.overlayRenderer;
    var blocks = project.wordFlowBlocks || [];
    if (!Array.isArray(blocks)) {
      errors.push(item('error', 'word-flow-schema',
        'wordFlowBlocks должен быть массивом.', null, 'wordFlowBlocks'));
      return;
    }
    blocks.forEach(function (block, blockIndex) {
      if (!Array.isArray(block.runs)) {
        errors.push(item('error', 'word-flow-runs',
          'Word-flow block требует массив styled runs.', null,
          'wordFlowBlocks.' + blockIndex + '.runs'));
        return;
      }
      block.runs.forEach(function (run, runIndex) {
        if (!ns.schema.WORD_FLOW_RUN_TYPES[run.type]) {
          errors.push(item('error', 'word-flow-run-type',
            'Неподдерживаемый Word-flow run type: ' + run.type + '.', null,
            'wordFlowBlocks.' + blockIndex + '.runs.' + runIndex));
        }
        if (run.type === 'fieldRef' && run.format && !knownFormats[run.format]) {
          errors.push(item('error', 'word-flow-formatter',
            'Неизвестный форматтер Word-flow run: ' + run.format + '.', null,
            'wordFlowBlocks.' + blockIndex + '.runs.' + runIndex + '.format'));
        }
      });
    });

    if (!renderer || typeof renderer.validateWordFlowBlocks !== 'function') return;
    var pageCount = Math.max(Number(project.expectedPages || 0), pageSizes.length, 1);
    var pages = [];
    for (var pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      (function (size) {
        pages.push({
          getSize: function () {
            return {
              width: Number(size && size.width || 595.32),
              height: Number(size && size.height || 841.92)
            };
          }
        });
      }(pageSizes[pageIndex]));
    }
    var productionProblems = [];
    try {
      renderer.validateWordFlowBlocks(project, pages, productionProblems);
    } catch (error) {
      productionProblems.push('Word-flow validation failed: ' + error.message);
    }
    productionProblems.forEach(function (message) {
      errors.push(item('error', 'word-flow', message, null, 'wordFlowBlocks'));
    });
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
  // The page budget: measured once per page, shared by every anchor on it.
  // Production refuses a page that promises room the paper does not have; this
  // says so while the template is still being authored.
  function validatePageLayout(project, pageSizes, errors, warnings) {
    var layout = project.pageLayout || {};
    Object.keys(layout).forEach(function (key) {
      var index = Number(key);
      var at = 'pageLayout[' + key + ']';
      if (!Number.isInteger(index) || index < 0 || index >= pageSizes.length) {
        errors.push(item('error', 'page-layout-page',
          at + ': такой страницы нет в документе.', null, at));
        return;
      }
      var entry = layout[key] || {};
      var size = pageSizes[index];

      ['bodyBottom', 'shiftToTop'].forEach(function (name) {
        if (!Number.isFinite(Number(entry[name]))) {
          errors.push(item('error', 'page-layout-incomplete',
            at + ': не задан ' + name + '.', null, at));
        }
      });
      var footer = entry.fixedFooterFrom != null
        ? Number(entry.fixedFooterFrom) : size.height;
      if (Number(entry.bodyBottom) > footer + 1e-6) {
        errors.push(item('error', 'page-layout-body',
          at + ': подвижная часть страницы заходит на фиксированный колонтитул.',
          null, at));
      }
      if (entry.fixedFooterFrom != null && Number(entry.shiftToTop) > footer - 1e-6) {
        errors.push(item('error', 'page-layout-footer',
          at + ': подвижный блок доходит до колонтитула — номер страницы ' +
          'двигать нельзя.', null, at));
      }
      if (Number(entry.shiftToTop) > size.height + 0.5) {
        errors.push(item('error', 'page-layout-bounds',
          at + ': подвижный блок выходит за нижнюю границу страницы.', null, at));
      }

      (entry.compaction || []).forEach(function (zone, i) {
        var zoneAt = at + '.compaction[' + i + ']';
        ['top', 'originalGap', 'minGap'].forEach(function (name) {
          if (!Number.isFinite(Number(zone[name]))) {
            errors.push(item('error', 'compaction-incomplete',
              zoneAt + ': не задан ' + name + '.', null, zoneAt));
          }
        });
        if (Number(zone.minGap) > Number(zone.originalGap) + 1e-6) {
          errors.push(item('error', 'compaction-minimum',
            zoneAt + ': минимальный просвет больше исходного.', null, zoneAt));
        }
        if (Number(zone.minGap) < 0) {
          errors.push(item('error', 'compaction-minimum',
            zoneAt + ': минимальный просвет не может быть отрицательным.',
            null, zoneAt));
        }
        if (zone.reviewStatus !== 'approved') {
          errors.push(item('error', 'compaction-unreviewed',
            zoneAt + ': уплотнение просвета не подтверждено визуально — ' +
            'production-экспорт заблокирован.', null, zoneAt));
        }
      });

      var flow = entry.crossPageFlow;
      if (flow) {
        var flowAt = at + '.crossPageFlow';
        var required = [
          'targetPage', 'sourceFromTop', 'sourceToTop', 'sourceContentTop',
          'retainedBodyBottom', 'targetInsertionTop', 'targetShiftFromTop',
          'targetShiftToTop', 'targetShift', 'maxCumulativeShift',
          'maxCascadeDepth'
        ];
        required.forEach(function (name) {
          if (!Number.isFinite(Number(flow[name]))) {
            errors.push(item('error', 'cross-page-incomplete',
              flowAt + ': не задан ' + name + '.', null, flowAt));
          }
        });
        var target = Number(flow.targetPage);
        if (!Number.isInteger(target) || target !== index + 1 || target >= pageSizes.length) {
          errors.push(item('error', 'cross-page-target',
            flowAt + ': целевой должна быть непосредственно следующая страница.',
            null, flowAt));
        }
        if (Number(flow.sourceFromTop) >= Number(flow.sourceToTop)) {
          errors.push(item('error', 'cross-page-source-block',
            flowAt + ': границы переносимого блока не образуют полный диапазон.',
            null, flowAt));
        }
        if (Number(flow.sourceFromTop) < 0 ||
            Number(flow.sourceToTop) > pageSizes[index].height + 0.5) {
          errors.push(item('error', 'cross-page-source-bounds',
            flowAt + ': переносимый блок выходит за исходную страницу.', null, flowAt));
        }
        if (Number(flow.sourceContentTop) < Number(flow.sourceFromTop) - 1e-6 ||
            Number(flow.sourceContentTop) > Number(flow.sourceToTop) + 1e-6) {
          errors.push(item('error', 'cross-page-source-block',
            flowAt + ': верх содержимого находится вне переносимого блока.',
            null, flowAt));
        }
        if (Number(flow.retainedBodyBottom) < 0 ||
            Number(flow.retainedBodyBottom) > Number(flow.sourceFromTop) + 0.5 ||
            Number(flow.retainedBodyBottom) >= Number(entry.bodyBottom) - 1e-6) {
          errors.push(item('error', 'cross-page-recovery',
            flowAt + ': перенос не освобождает место на исходной странице.',
            null, flowAt));
        }
        if (Number(flow.targetShift) <= 0 ||
            Number(flow.targetShift) > Number(flow.maxCumulativeShift) + 1e-6) {
          errors.push(item('error', 'cross-page-shift',
            flowAt + ': сдвиг следующей страницы превышает проверенный максимум.',
            null, flowAt));
        }
        if (Number.isInteger(target) && target >= 0 && target < pageSizes.length) {
          if (Number(flow.targetShiftFromTop) < 0 ||
              Number(flow.targetShiftFromTop) >= Number(flow.targetShiftToTop) ||
              Number(flow.targetShiftToTop) > pageSizes[target].height + 0.5) {
            errors.push(item('error', 'cross-page-target-bounds',
              flowAt + ': подвижный блок следующей страницы выходит за лист.',
              null, flowAt));
          }
          if (Number(flow.targetInsertionTop) < Number(flow.targetShiftFromTop) - 1e-6 ||
              Number(flow.targetInsertionTop) > Number(flow.targetShiftToTop) + 1e-6) {
            errors.push(item('error', 'cross-page-target-bounds',
              flowAt + ': точка вставки находится вне подвижного блока следующей страницы.',
              null, flowAt));
          }
          if (layout[target] && layout[target].crossPageFlow) {
            errors.push(item('error', 'cross-page-cascade',
              flowAt + ': каскадный перенос через несколько страниц запрещён.',
              null, flowAt));
          }
        }
        if (Number(flow.maxCascadeDepth) !== 1) {
          errors.push(item('error', 'cross-page-cascade',
            flowAt + ': разрешён только один явно проверенный переход между страницами.',
            null, flowAt));
        }
        if (flow.reviewStatus !== 'approved') {
          errors.push(item('error', 'cross-page-unreviewed',
            flowAt + ': перенос целого блока не подтверждён визуально — ' +
            'production-экспорт заблокирован.', null, flowAt));
        }
        if (!String(flow.note || '').trim()) {
          errors.push(item('error', 'cross-page-note',
            flowAt + ': добавьте описание проверенного целого блока.', null, flowAt));
        }
      }

      var budget = ns.schema.pageBudgetOf(
        Object.assign({}, entry, { pageHeight: size.height }));
      (entry.anchors || []).forEach(function (anchorId) {
        var anchor = (project.fields || []).filter(function (field) {
          return field.id === anchorId;
        })[0] || (project.wordFlowBlocks || []).filter(function (block) {
          return block.id === anchorId;
        })[0];
        if (!anchor) {
          errors.push(item('error', 'page-layout-anchor',
            at + '.anchors: нет поля или Word-flow блока «' + anchorId + '».', null, at));
          return;
        }
        if (!anchor.expansion) {
          errors.push(item('error', 'page-layout-anchor',
            at + '.anchors: у якоря «' + anchorId + '» нет расширения.', null, at));
          return;
        }
        var page = anchor.expansion.page != null
          ? Number(anchor.expansion.page) : Number(anchor.page);
        if (page !== index) {
          errors.push(item('error', 'page-layout-anchor',
            at + '.anchors: якорь «' + anchorId + '» расширяет страницу ' + page + '.',
            null, at));
        }
        if (Number(anchor.expansion.rowHeight) > budget.total + 1e-6) {
          errors.push(item('error', 'page-layout-reserve',
            at + ': одной строке якоря «' + anchorId + '» нужно ' +
            anchor.expansion.rowHeight + ' pt, запас страницы — ' +
            budget.total + ' pt.', null, at));
        }
        (entry.compaction || []).forEach(function (zone) {
          if (Number(zone.top) > Number(anchor.expansion.insertionTop) + 1e-6) {
            warnings.push(item('warning', 'compaction-below-anchor',
              at + ': зона уплотнения ' + zone.top + ' pt ниже точки вставки ' +
              'якоря «' + anchorId + '» — она не будет использована.', null, at));
          }
        });
      });
    });
  }

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

    var pageLayout = (project.pageLayout || {})[page];
    var numbers = ['insertionTop', 'rowHeight', 'maxExtraRows', 'shiftFromTop'];
    if (!pageLayout) numbers = numbers.concat(['shiftToTop', 'bottomReserve']);
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
    var budget = pageLayout
      ? ns.schema.pageBudgetOf(Object.assign({}, pageLayout, { pageHeight: size.height }))
      : { total: Number(spec.bottomReserve) };
    var reserve = budget.total;

    if (height <= 0) {
      errors.push(item('error', 'expansion-row-height',
        'Высота вставляемой строки должна быть положительной.', field));
    }
    if (rows < 1) {
      errors.push(item('error', 'expansion-max-rows',
        'Максимум вставляемых строк должен быть не меньше одной.', field));
    }
    if (rows * height > reserve + 1e-6) {
      // With a page budget this is not a fault: the anchors below simply get
      // whatever this one leaves. Without one it is the only limit there is.
      (pageLayout ? warnings : errors).push(
        item(pageLayout ? 'warning' : 'error', 'expansion-reserve',
          'Максимальное расширение (' + Math.round(rows * height * 100) / 100 +
          ' pt) больше запаса страницы (' + reserve + ' pt).', field));
    }
    if (Number(spec.shiftFromTop) > Number(spec.insertionTop) + 1e-6) {
      errors.push(item('error', 'expansion-block',
        'Начало подвижного блока ниже точки вставки.', field));
    }
    if (pageLayout) {
      if (spec.bottomReserve != null) {
        errors.push(item('error', 'expansion-reserve-duplicated',
          'Запас страницы задаётся один раз в pageLayout — уберите ' +
          'bottomReserve у поля.', field));
      }
      if ((pageLayout.anchors || []).indexOf(field.id) === -1) {
        errors.push(item('error', 'expansion-not-anchored',
          'Поле не перечислено в pageLayout[' + page + '].anchors.', field));
      }
      if (Number(spec.insertionTop) < Number(pageLayout.fixedHeaderUntil || 0) - 1e-6) {
        errors.push(item('error', 'expansion-fixed-header',
          'Точка вставки выше фиксированной шапки страницы.', field));
      }
      if (pageLayout.fixedFooterFrom != null &&
          Number(spec.insertionTop) + rows * height >
            Number(pageLayout.fixedFooterFrom) + 1e-6) {
        errors.push(item('error', 'expansion-fixed-footer',
          'Вставляемые строки заходят на фиксированный колонтитул.', field));
      }
    } else {
      if (Number(spec.shiftToTop) <= Number(spec.shiftFromTop)) {
        errors.push(item('error', 'expansion-block',
          'Подвижный блок страницы не задан.', field));
      }
      if (Number(spec.shiftToTop) > size.height + 0.5) {
        errors.push(item('error', 'expansion-bounds',
          'Подвижный блок выходит за нижнюю границу страницы.', field));
      }
    }

    var lineStyle = spec.lineStyle || 'underline';
    var line = spec.line || {};
    if (lineStyle !== 'none') {
      if (!Number.isFinite(Number(line.width)) || Number(line.width) <= 0) {
        errors.push(item('error', 'expansion-line',
          'У вставляемой строки не задана ширина.', field));
      } else if (Number(line.left) < 0 ||
                 Number(line.left) + Number(line.width) > size.width + 0.5) {
        errors.push(item('error', 'expansion-line',
          'Вставляемая строка выходит за границы страницы.', field));
      }
    }
    if (lineStyle === 'underline' &&
        !Number.isFinite(Number(line.ruleThickness))) {
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
    if (ns.identifierProtection) {
      ns.identifierProtection.validate(project).forEach(function (problem) {
        var protectedField = problem.fieldId && (project.fields || []).find(function (field) {
          return field.id === problem.fieldId;
        });
        errors.push(item('error', problem.code, problem.message,
          protectedField || null, problem.path));
      });
    }
    validateWordFlowBlocks(project, pageSizes, knownFormats, errors);
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

    validatePageLayout(project, pageSizes, errors, warnings);

    // A Word-flow block is a page-layout anchor in exactly the same sense as a
    // legacy field. Give its expansion the Builder's granular diagnostics as
    // well as the production renderer's canonical Word-flow validation.
    (project.wordFlowBlocks || []).forEach(function (block) {
      validateExpansion(block, pageSizes, errors, warnings, project);
    });

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
      if (type !== 'check' && field.layoutMode !== 'flow-reference') validateReadability(field, errors);
      if (type !== 'check' && field.layoutMode !== 'flow-reference') validateFlowRegions(field, page, pageSizes, errors, warnings, project);
      if (type !== 'check' && field.layoutMode !== 'flow-reference') validateExpansion(field, pageSizes, errors, warnings, project);
      if (field.layoutMode && field.layoutMode !== 'flow-reference') {
        errors.push(item('error', 'layout-mode', 'Неизвестный layoutMode: ' + field.layoutMode + '.', field));
      }
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
    var renderer = global.CRMDocumentEngine.overlayRenderer;
    var productionPlan = renderer.plan(project, payload, fonts);
    return {
      profileId: profileId,
      payload: payload,
      fields: (project.fields || []).map(function (field) {
        if (field.layoutMode === 'flow-reference') {
          var owners = Array.isArray(field.flowBlockId) ? field.flowBlockId : [field.flowBlockId];
          var blockResult = productionPlan.byBlock[owners[0]];
          if (!blockResult) {
            return { fieldId: field.id, page: field.page, result: {
              status: 'error', label: 'Word-flow block отсутствует', profileId: profileId
            } };
          }
          if (blockResult.reason === 'hidden') {
            return { fieldId: field.id, page: field.page, result: {
              status: 'hidden', label: 'Word-flow скрыт условием', profileId: profileId
            } };
          }
          if (!blockResult.drawn) {
            return { fieldId: field.id, page: field.page, result: {
              status: blockResult.reason === 'missing' ? 'missing' : 'overflow',
              label: blockResult.message || ('Word-flow: ' + blockResult.reason),
              profileId: profileId
            } };
          }
          return { fieldId: field.id, page: field.page, result: {
            status: 'word-flow',
            label: blockResult.layout.lines.length + ' lines · locked ' +
              blockResult.layout.size + ' pt',
            fontSize: blockResult.layout.size,
            lines: blockResult.layout.lines.length,
            flowBlockId: owners[0],
            profileId: profileId
          } };
        }
        return { fieldId: field.id, page: field.page, result: analyzeField(project, field, payload, profileId, fonts) };
      })
    };
  }

  function runAll(project, overrides) {
    return loadProjectFonts(project).then(function (fonts) {
      var profiles = ns.fixtures.profiles.map(function (profile) { return analyzeProfile(project, profile.id, overrides, fonts); });
      var counts = { normal: 0, shrink: 0, multiline: 0, flow: 0, wordFlow: 0, fallback: 0, failures: 0, missing: 0, unsupportedGlyphs: 0 };
      profiles.forEach(function (profile) {
        profile.fields.forEach(function (entry) {
          var status = entry.result.status;
          if (counts[status] != null) counts[status] += 1;
          if (status === 'word-flow') counts.wordFlow += 1;
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
