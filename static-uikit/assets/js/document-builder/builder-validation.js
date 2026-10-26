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

  // ── Values a reader compares side by side ──────────────────────────────────
  //
  // The three tariff plans of an accession application are a column of answers
  // to the same question, and one row set larger than its neighbours reads as a
  // defect. A map says so with `typographyGroup`; this is the Builder's half of
  // holding it to that, with the field named so the editor can jump to it.
  //
  // Only what a reader can compare is checked. Where the value sits, how wide
  // its slot is and how many lines its own printed row has room for are
  // geometry the source decided per row.
  var TYPOGRAPHY_GROUP_LABELS = {
    font: 'гарнитура',
    fontSize: 'кегль',
    minFontSize: 'минимальный кегль',
    lineHeight: 'интерлиньяж',
    lineHeightRatio: 'интерлиньяж (доля кегля)',
    align: 'выключка'
  };

  function continuationStyleOf(field) {
    var generated = (field.flowRegions || []).filter(function (region) {
      return region.generated;
    });
    var expansion = field.expansion || {};
    var region = generated[0] || {};
    return {
      'кегль перенесённой строки': generated.length
        ? region.maxFontSize : expansion.maxFontSize,
      'отступ линейки от базовой линии': generated.length
        ? region.underlineOffset : null,
      'толщина линейки': generated.length ? region.underlineThickness : null,
      'высота добавленной строки': expansion.rowHeight
    };
  }

  function validateTypographyGroups(project, errors) {
    var groups = {};
    (project.fields || []).forEach(function (field) {
      if (!field.typographyGroup) return;
      var name = String(field.typographyGroup);
      (groups[name] = groups[name] || []).push(field);
    });

    Object.keys(groups).forEach(function (name) {
      var members = groups[name];
      if (members.length < 2) {
        errors.push(item('error', 'typography-group-single',
          'Группа оформления «' + name + '» состоит из одного поля. ' +
          'Либо к ней присоединяется второе поле, либо объявление удаляется.',
          members[0]));
        return;
      }
      var first = members[0];
      var firstStyle = continuationStyleOf(first);
      members.slice(1).forEach(function (field) {
        Object.keys(TYPOGRAPHY_GROUP_LABELS).forEach(function (property) {
          var a = first[property] == null ? null : first[property];
          var b = field[property] == null ? null : field[property];
          if (a === b) return;
          errors.push(item('error', 'typography-group-mismatch',
            'Группа «' + name + '»: ' + TYPOGRAPHY_GROUP_LABELS[property] +
            ' поля «' + field.id + '» (' + JSON.stringify(b) + ') отличается ' +
            'от «' + first.id + '» (' + JSON.stringify(a) + '). ' +
            'Одна группа — одно оформление.', field));
        });
        var style = continuationStyleOf(field);
        Object.keys(firstStyle).forEach(function (property) {
          if (firstStyle[property] === style[property]) return;
          errors.push(item('error', 'typography-group-continuation',
            'Группа «' + name + '»: ' + property + ' поля «' + field.id +
            '» (' + JSON.stringify(style[property]) + ') отличается от «' +
            first.id + '» (' + JSON.stringify(firstStyle[property]) + '). ' +
            'Значение, перешедшее на дополнительную строку, не должно менять ' +
            'кегль или отбивку.', field));
        });
      });
    });
  }

  function syntheticPages(project, pageSizes) {
    var count = Math.max(Number(project.expectedPages || 0), pageSizes.length, 1);
    var pages = [];
    for (var index = 0; index < count; index += 1) {
      (function (size) {
        pages.push({
          getSize: function () {
            return {
              width: Number(size && size.width || 595.32),
              height: Number(size && size.height || 841.92)
            };
          }
        });
      }(pageSizes[index]));
    }
    return pages;
  }

  function finiteCoordinate(bounds, name) {
    return !!bounds && Object.prototype.hasOwnProperty.call(bounds, name) &&
      bounds[name] !== null && bounds[name] !== '' &&
      Number.isFinite(Number(bounds[name]));
  }

  function validBounds(bounds) {
    return bounds && ['left', 'top', 'right', 'bottom'].every(function (name) {
      return finiteCoordinate(bounds, name);
    }) && Number(bounds.right) > Number(bounds.left) &&
      Number(bounds.bottom) > Number(bounds.top);
  }

  function validHorizontalBounds(bounds) {
    return bounds && finiteCoordinate(bounds, 'left') &&
      finiteCoordinate(bounds, 'right') &&
      Number(bounds.right) > Number(bounds.left);
  }

  function fieldIndex(project) {
    var fields = {};
    (project.fields || []).forEach(function (field) {
      if (field && field.id) fields[field.id] = field;
    });
    return fields;
  }

  function validateSourcePathSuppressions(project, pageSizes, errors) {
    if (project.sourcePathSuppressions != null &&
        !Array.isArray(project.sourcePathSuppressions)) {
      errors.push(item('error', 'source-path-suppression-schema',
        'sourcePathSuppressions must be an array.', null, 'sourcePathSuppressions'));
      return;
    }
    var renderer = global.CRMDocumentEngine.overlayRenderer;
    if (!renderer || typeof renderer.validateSourcePathSuppressions !== 'function') {
      if ((project.sourcePathSuppressions || []).length) {
        errors.push(item('error', 'source-path-suppression-validator',
          'The reviewed source-path validator is not loaded.', null,
          'sourcePathSuppressions'));
      }
      return;
    }
    var problems = [];
    try {
      renderer.validateSourcePathSuppressions(
        project, syntheticPages(project, pageSizes), problems);
    } catch (error) {
      problems.push(error.message);
    }
    problems.forEach(function (message) {
      errors.push(item('error', 'source-path-suppression', message, null,
        'sourcePathSuppressions'));
    });
    var fields = fieldIndex(project);
    (project.sourcePathSuppressions || []).forEach(function (entry, index) {
      if (!entry || typeof entry !== 'object') return;
      var geometry = entry.geometry || {};
      var geometryNames = ['left', 'top', 'right', 'bottom'];
      var coordinates = geometryNames.map(function (name) {
        return Number(geometry[name]);
      });
      if (!geometryNames.every(function (name) {
        return finiteCoordinate(geometry, name);
      }) ||
          coordinates[2] <= coordinates[0] || coordinates[3] < coordinates[1]) {
        errors.push(item('error', 'source-path-suppression-boundary',
          (entry.id || ('sourcePathSuppressions[' + index + ']')) +
          ': reviewed path geometry is incomplete or reversed.', null,
          'sourcePathSuppressions.' + index + '.geometry'));
      } else {
        var page = pageSizes[Number(entry.page)] || {};
        if (coordinates[0] < 0 || coordinates[1] < 0 ||
            coordinates[2] > Number(page.width || 595.32) + 0.5 ||
            coordinates[3] > Number(page.height || 841.92) + 0.5) {
          errors.push(item('error', 'source-path-suppression-boundary',
            (entry.id || ('sourcePathSuppressions[' + index + ']')) +
            ': reviewed path geometry leaves the PDF page.', null,
            'sourcePathSuppressions.' + index + '.geometry'));
        }
      }
      if (!Array.isArray(entry.fieldIds)) {
        errors.push(item('error', 'source-path-suppression-fields',
          (entry.id || ('sourcePathSuppressions[' + index + ']')) +
          ': fieldIds must record the dynamic replacements (or an empty reviewed list).',
          null, 'sourcePathSuppressions.' + index + '.fieldIds'));
      } else {
        entry.fieldIds.forEach(function (fieldId) {
          if (!fields[fieldId]) {
            errors.push(item('error', 'source-path-suppression-fields',
              (entry.id || ('sourcePathSuppressions[' + index + ']')) +
              ': replacement field "' + fieldId + '" does not exist.', null,
              'sourcePathSuppressions.' + index + '.fieldIds'));
          }
        });
      }
    });
  }

  function semanticField(groupName, spec, fields, errors, path) {
    if (!spec || !spec.fieldId || !spec.source) {
      errors.push(item('error', 'semantic-group-field',
        groupName + ': ' + path + ' must declare fieldId and exact source.', null,
        path));
      return null;
    }
    var field = fields[spec.fieldId];
    if (!field) {
      errors.push(item('error', 'semantic-group-field',
        groupName + ': field "' + spec.fieldId + '" does not exist.', null, path));
      return null;
    }
    if (field.source !== spec.source) {
      errors.push(item('error', 'semantic-group-source',
        groupName + ': ' + spec.fieldId + '.source must exactly match ' +
        JSON.stringify(spec.source) + '.', field, path));
    }
    return field;
  }

  function validateSemanticUnderline(block, run, errors, path) {
    var decoration = run && run.decoration;
    if (!decoration || !decoration.underline) return;
    var size = Number(run.fontSize != null ? run.fontSize : block.fontSize);
    var offset = Number(decoration.offset);
    var thickness = Number(decoration.thickness);
    if (!Number.isFinite(offset) || !Number.isFinite(thickness) || thickness <= 0) {
      errors.push(item('error', 'semantic-underline',
        block.id + ': reviewed underline needs numeric offset and thickness.',
        null, path));
      return;
    }
    // A configured field box extends below the baseline. This conservative
    // ink descent catches a rule placed through glyphs while leaving the
    // reviewed 2.4 pt legal-form clearance intact.
    if (offset - thickness / 2 < size * 0.18 - 0.01) {
      errors.push(item('error', 'semantic-underline-intersection',
        block.id + ': underline enters the configured text ink box.', null, path));
    }
  }

  function requireSemanticUnderline(block, run, errors, path) {
    if (!run.decoration || run.decoration.underline !== true ||
        !(Number(run.decoration.minWidth) > 0)) {
      errors.push(item('error', 'semantic-underline',
        block.id + ': reviewed semantic field must keep its measured underline.',
        null, path));
      return;
    }
    validateSemanticUnderline(block, run, errors, path);
  }

  function validateSemanticGroups(project, pageSizes, errors) {
    var fields = fieldIndex(project);
    (project.wordFlowBlocks || []).forEach(function (block, blockIndex) {
      if (block.semanticGroup == null) return;
      var group = block.semanticGroup;
      var at = 'wordFlowBlocks.' + blockIndex + '.semanticGroup';
      if (!group || typeof group !== 'object' || Array.isArray(group)) {
        errors.push(item('error', 'semantic-group-schema',
          block.id + ': semanticGroup must be an object.', null, at));
        return;
      }
      if (group.reviewStatus !== 'approved') {
        errors.push(item('error', 'semantic-group-unreviewed',
          block.id + ': semantic layout group is not visually approved.', null, at));
      }
      if (!String(group.kind || '').trim()) {
        errors.push(item('error', 'semantic-group-kind',
          block.id + ': semanticGroup.kind is required.', null, at));
        return;
      }
      var bounds = group.bounds || group.boundary;
      var boundaryRequired = group.kind === 'depository-transfer-basis';
      var boundaryValid = group.kind === 'recipient-block'
        ? validHorizontalBounds(bounds) : validBounds(bounds);
      if ((bounds || boundaryRequired || group.kind === 'recipient-block') &&
          !boundaryValid) {
        errors.push(item('error', 'semantic-group-boundary',
          block.id + ': semantic group has incomplete reviewed bounds.', null, at));
      } else if (boundaryValid) {
        var size = pageSizes[Number(block.page)] || {};
        if (Number(bounds.left) < 0 ||
            (bounds.top != null && Number(bounds.top) < 0) ||
            Number(bounds.right) > Number(size.width || 595.32) + 0.5 ||
            (bounds.bottom != null &&
              Number(bounds.bottom) > Number(size.height || 841.92) + 0.5)) {
          errors.push(item('error', 'semantic-group-boundary',
            block.id + ': semantic boundary leaves the PDF page.', null, at));
        }
      }

      if (group.kind === 'recipient-block') {
        var recipientName = semanticField(block.id, group.name, fields, errors,
          at + '.name');
        var recipientAddress = semanticField(block.id, group.address, fields, errors,
          at + '.address');
        if (!group.address || group.address.renderOnce !== true) {
          errors.push(item('error', 'recipient-render-once',
            block.id + ': formatted address must declare renderOnce=true.',
            recipientAddress, at + '.address'));
        }
        var frame = block.frame || {};
        var first = Number(frame.left) + Number(block.firstLineIndent);
        var hanging = Number(frame.left) + Number(block.hangingIndent);
        var right = Number(frame.left) + Number(frame.width);
        if (!validHorizontalBounds(bounds) || !Number.isFinite(first) ||
            !Number.isFinite(hanging) || first < Number(bounds.left) - 0.05 ||
            hanging < Number(bounds.left) - 0.05 || right > Number(bounds.right) + 0.05) {
          errors.push(item('error', 'recipient-boundary',
            block.id + ': first and continuation lines must stay inside the reviewed recipient bounds.',
            null, at));
        }
        var nameRef = false, addressRef = false, recipientLabel = false,
          addressLabel = false;
        (block.runs || []).forEach(function (run, runIndex) {
          if (run.type === 'fieldRef' && recipientName &&
              run.fieldId === recipientName.id) {
            nameRef = true;
            requireSemanticUnderline(block, run, errors,
              at + '.runs.' + runIndex + '.decoration');
          }
          if (run.type === 'fieldRef' && recipientAddress &&
              run.fieldId === recipientAddress.id) {
            addressRef = true;
            requireSemanticUnderline(block, run, errors,
              at + '.runs.' + runIndex + '.decoration');
          }
          if (run.semanticRole === 'recipient-label') recipientLabel = true;
          if (run.semanticRole === 'address-label') addressLabel = true;
        });
        if (!nameRef || !addressRef || !recipientLabel || !addressLabel) {
          errors.push(item('error', 'recipient-semantic-runs',
            block.id + ': recipient labels and both reviewed field references must remain in one block.',
            null, at));
        }
      } else if (group.kind === 'organization-name-and-date') {
        var fullName = semanticField(block.id, group.fullName, fields, errors,
          at + '.fullName');
        var date = semanticField(block.id, group.date, fields, errors,
          at + '.date');
        if (!group.caption || !group.continuation) {
          errors.push(item('error', 'semantic-group-reading-order',
            block.id + ': full-name caption and continuation roles are required.', null, at));
        }
        if (!group.date || !group.date.rule ||
            !Number.isFinite(Number(group.date.rule.left)) ||
            !Number.isFinite(Number(group.date.rule.width)) ||
            Number(group.date.rule.width) <= 0) {
          errors.push(item('error', 'semantic-date-rule',
            block.id + ': date must own a complete reviewed rule.', date, at + '.date.rule'));
        }
        var fullNameRef = false, dateRef = false, caption = false,
          continuation = false;
        (block.runs || []).forEach(function (run, runIndex) {
          if (run.type === 'fieldRef' && fullName && run.fieldId === fullName.id) {
            fullNameRef = true;
            requireSemanticUnderline(block, run, errors,
              at + '.runs.' + runIndex + '.decoration');
          }
          if (run.type === 'fieldRef' && date && run.fieldId === date.id) {
            dateRef = true;
            requireSemanticUnderline(block, run, errors,
              at + '.runs.' + runIndex + '.decoration');
            if (group.date && group.date.rule && run.decoration &&
                Math.abs(Number(run.decoration.minWidth) -
                  Number(group.date.rule.width)) > 0.05) {
              errors.push(item('error', 'semantic-date-rule',
                block.id + ': date run width differs from its semantic rule.',
                date, at + '.date.rule'));
            }
          }
          if (run.semanticRole === 'client-full-name-caption') caption = true;
          if (run.semanticRole === 'recognition-clause') continuation = true;
        });
        if (!fullNameRef || !dateRef || !caption || !continuation) {
          errors.push(item('error', 'semantic-group-reading-order',
            block.id + ': name, caption, date and continuation must remain in the reviewed reading flow.',
            null, at));
        }
      } else if (group.kind === 'depository-transfer-basis') {
        var numberRefs = [], dateRefs = [];
        (block.runs || []).forEach(function (run) {
          if (run.type !== 'fieldRef') return;
          var referenced = fields[run.fieldId];
          if (!referenced) return;
          if (referenced.source === DEPOSITORY_NUMBER) {
            numberRefs.push({ run: run, field: referenced });
          }
          if (referenced.source === DEPOSITORY_DATE) {
            dateRefs.push({ run: run, field: referenced });
          }
        });
        if (numberRefs.length !== 1 || dateRefs.length !== 1 ||
            numberRefs.some(function (entry) { return entry.run.keepTogether !== true; }) ||
            dateRefs.some(function (entry) { return entry.run.keepTogether !== true; })) {
          errors.push(item('error', 'depository-semantic-pair',
            block.id + ': reviewed transfer-basis sentence must contain one unbreakable depository number and date.',
            null, at));
        }
      }
    });
  }

  function validateTableOwnership(project, pageSizes, errors) {
    ['cellOwnership', 'tableBudgets', 'ownershipExemptions'].forEach(function (key) {
      if (project[key] != null && !Array.isArray(project[key])) {
        errors.push(item('error', 'table-ownership-schema',
          key + ' must be an array.', null, key));
      }
    });
    var ownership = global.CRMDocumentEngine.tableOwnership;
    if (!ownership || typeof ownership.validateTemplate !== 'function') {
      if (project.tableOwnershipRequired || (project.cellOwnership || []).length) {
        errors.push(item('error', 'table-ownership-validator',
          'The table-ownership validator is not loaded.', null, 'cellOwnership'));
      }
      return;
    }
    var problems = [];
    try {
      problems = ownership.validateTemplate(
        project, syntheticPages(project, pageSizes));
    } catch (error) {
      problems = [error.message];
    }
    problems.forEach(function (message) {
      errors.push(item('error', 'table-ownership', message, null, 'cellOwnership'));
    });

    var fields = fieldIndex(project);
    (project.cellOwnership || []).forEach(function (owner, index) {
      if (!owner) return;
      var field = fields[owner.fieldId];
      var at = 'cellOwnership.' + index;
      if (owner.canGrow) {
        var borders = owner.affectedBorders || {};
        if (!Array.isArray(borders.horizontal) || !borders.horizontal.length ||
            !Array.isArray(borders.vertical) || !borders.vertical.length) {
          errors.push(item('error', 'table-ownership-borders',
            'cellOwnership[' + index + ']: a growing row must declare both moved horizontal and vertical borders.',
            field, at + '.affectedBorders'));
        }
      }
      if (!field || !owner.bounds) return;
      if (!validBounds(owner.bounds)) {
        errors.push(item('error', 'table-ownership',
          'cellOwnership[' + index + ']: reviewed bounds are incomplete or reversed.',
          field, at + '.bounds'));
        return;
      }

      // Ownership is only useful when it constrains the configured ink, not
      // merely the field anchor.  Check the initial region here; generated
      // continuation rows are checked by the production ownership validator.
      var bounds = owner.bounds;
      var inset = Math.max(0, Number(owner.inkInset || 0));
      var leftBound = Number(bounds.left) + inset;
      var rightBound = Number(bounds.right) - inset;
      var topBound = Number(bounds.top) + inset;
      var bottomBound = Number(bounds.bottom) - inset;
      if (![leftBound, rightBound, topBound, bottomBound].every(Number.isFinite)) return;

      var fontSize = Number(field.fontSize || ns.schema.policy().preferredFontSize);
      var regions = Array.isArray(field.flowRegions) && field.flowRegions.length
        ? field.flowRegions.map(function (region) {
          return {
            page: region.page,
            left: region.left,
            width: region.width,
            baselineTop: region.baselineTop,
            maxLines: region.maxLines,
            lineHeight: region.lineHeight,
            lineHeightRatio: region.lineHeightRatio,
            maxFontSize: region.maxFontSize
          };
        })
        : [{
          page: field.page,
          left: field.left,
          width: field.width,
          baselineTop: field.baselineTop,
          maxLines: field.maxLines,
          lineHeight: field.lineHeight,
          lineHeightRatio: field.lineHeightRatio,
          maxFontSize: field.maxFontSize
        }];

      regions.forEach(function (region, regionIndex) {
        // A continuation region on another page/cell has its own owner.  This
        // owner still guarantees that its matching page region cannot leak
        // into a neighbour row or cross a vertical border.
        if (Number(region.page) !== Number(owner.page)) return;
        var size = Math.min(fontSize,
          Number.isFinite(Number(region.maxFontSize))
            ? Number(region.maxFontSize) : fontSize);
        var left = Number(region.left);
        var right = left + Number(region.width);
        var firstBaseline = Number(region.baselineTop);
        var inkTop = firstBaseline - size * 0.78;
        var inkBottom = firstBaseline + size * 0.22;
        var outside = ![left, right, inkTop, inkBottom].every(Number.isFinite) ||
          left < leftBound - 0.1 || right > rightBound + 0.1 ||
          inkTop < topBound - 0.1 || inkBottom > bottomBound + 0.1;
        if (outside) {
          errors.push(item('error', 'table-ownership-region',
            field.id + ': configured region ' + (regionIndex + 1) +
            ' leaves its reviewed table-cell bounds.', field,
            at + '.bounds'));
        }
      });
    });
  }

  var DEPOSITORY_NUMBER = 'extra.extra-depository-contract';
  var DEPOSITORY_DATE = 'extra.extra-depository-contract-date';

  function wizardControls(wizard, key) {
    var out = [];
    ['fields', 'companyFields'].forEach(function (group) {
      ((wizard || {})[group] || []).forEach(function (control, index) {
        if (control.key === key) out.push({ control: control, group: group, index: index });
      });
    });
    return out;
  }

  function validateDepositoryOperatorInputs(project, errors) {
    var fields = project.fields || [];
    var numberFields = fields.filter(function (field) {
      return field.source === DEPOSITORY_NUMBER;
    });
    var dateFields = fields.filter(function (field) {
      return field.source === DEPOSITORY_DATE;
    });
    var numberControls = wizardControls(project.wizard,
      DEPOSITORY_NUMBER.slice('extra.'.length));
    var dateControls = wizardControls(project.wizard,
      DEPOSITORY_DATE.slice('extra.'.length));
    if (!numberFields.length && !dateFields.length &&
        !numberControls.length && !dateControls.length) return;

    [DEPOSITORY_NUMBER, DEPOSITORY_DATE].forEach(function (source) {
      var info = ns.sourceCatalog.infoFor(source);
      if (!info.known || info.registryKind !== 'workflow' ||
          !info.operatorInput || info.sourceKind !== 'operator-input') {
        errors.push(item('error', 'depository-registry-classification',
          source + ' must be classified by the UMI alias registry as a workflow operator input.',
          null, source));
      }
    });
    if (!numberFields.length || !dateFields.length) {
      errors.push(item('error', 'depository-pair',
        'A document that prints a depository agreement must map both number and date.',
        null, 'fields'));
    }
    numberFields.concat(dateFields).forEach(function (field) {
      if (field.required !== true) {
        errors.push(item('error', 'depository-field-required',
          field.source + ' must be required for every printed occurrence.', field));
      }
      if (field.sourceKind && field.sourceKind !== 'operator-input') {
        errors.push(item('error', 'source-kind',
          field.source + ' is an operator input, not ' + field.sourceKind + '.', field));
      }
    });
    dateFields.forEach(function (field) {
      if (field.format !== 'dateRu') {
        errors.push(item('error', 'depository-date-format',
          'Depository agreement date must use dateRu.', field));
      }
    });

    [[numberControls, 'text', DEPOSITORY_NUMBER],
      [dateControls, 'date', DEPOSITORY_DATE]].forEach(function (entry) {
      var controls = entry[0], expectedType = entry[1], source = entry[2];
      controls.forEach(function (found) {
        var at = 'wizard.' + found.group + '.' + found.index;
        ['default', 'defaultValue'].forEach(function (name) {
          if (Object.prototype.hasOwnProperty.call(found.control, name)) {
            errors.push(item('error', 'depository-operator-default',
              source + ' must not declare wizard ' + name + '.', null,
              at + '.' + name));
          }
        });
      });
      if (controls.length !== 1) {
        errors.push(item('error', 'depository-wizard-pair',
          source + ' needs exactly one wizard control.', null, 'wizard'));
        return;
      }
      var found = controls[0];
      var control = found.control;
      var at = 'wizard.' + found.group + '.' + found.index;
      if (control.type !== expectedType || control.required !== true ||
          control.sourceKind !== 'operator-input') {
        errors.push(item('error', 'depository-wizard-control',
          source + ' must be a required ' + expectedType +
          ' control with sourceKind="operator-input".', null, at));
      }
    });
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

    if (Object.prototype.hasOwnProperty.call(spec, 'moveTopLevelPaths') &&
        typeof spec.moveTopLevelPaths !== 'boolean') {
      errors.push(item('error', 'expansion-path-movement',
        'moveTopLevelPaths must be a boolean reviewed layout decision.', field));
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
    if (Object.prototype.hasOwnProperty.call(project, 'tableOwnershipRequired') &&
        typeof project.tableOwnershipRequired !== 'boolean') {
      errors.push(item('error', 'table-ownership-schema',
        'tableOwnershipRequired must be boolean.', null, 'tableOwnershipRequired'));
    }
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
    validateTypographyGroups(project, errors);
    validateSemanticGroups(project, pageSizes, errors);
    validateSourcePathSuppressions(project, pageSizes, errors);
    validateTableOwnership(project, pageSizes, errors);
    validateDepositoryOperatorInputs(project, errors);
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
      if (field.source && field.source.indexOf('umi.') === 0 &&
          !ns.sourceCatalog.isKnownUmi(field.source)) {
        errors.push(item('error', 'unknown-umi-source',
          'Unknown exact UMI source: ' + field.source + '.', field));
      }
      if (field.source && field.sourceKind) {
        var sourceInfo = ns.sourceCatalog.infoFor(field.source);
        if (sourceInfo.known && sourceInfo.sourceKind !== field.sourceKind) {
          errors.push(item('error', 'source-kind',
            field.source + ' is classified as ' + sourceInfo.sourceKind +
            ', not ' + field.sourceKind + '.', field));
        }
      }
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
        if (field.showWhen.source && field.showWhen.source.indexOf('umi.') === 0 &&
            !ns.sourceCatalog.isKnownUmi(field.showWhen.source)) {
          errors.push(item('error', 'unknown-umi-source',
            'Unknown exact UMI condition source: ' + field.showWhen.source + '.', field));
        }
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

  // ── Anchor geometry, against the real PDF ─────────────────────────────────
  //
  // Everything else here checks declared numbers against each other. Only the
  // page's own content stream can say whether an insertion point actually
  // falls between two complete drawing blocks, and until it did, a builder
  // could export a map whose anchor sat inside printed text — which is how
  // seven Word-flow anchors shipped unable to add a row.
  //
  // Uses the production normalizer and the production analyser, so the builder
  // blocks exactly what the renderer would refuse.
  function anchorGeometry(project, runtimePdfUrl) {
    var engine = global.CRMDocumentEngine;
    var errors = [];
    var warnings = [];
    if (!engine || !runtimePdfUrl || !global.PDFLib) {
      return Promise.resolve({ errors: errors, warnings: warnings });
    }
    var template;
    try {
      template = ns.schema.toProduction(project, runtimePdfUrl);
    } catch (error) {
      return Promise.resolve({ errors: errors, warnings: warnings });
    }
    var anchors = engine.overlayRenderer.expansionAnchors(template);
    if (!anchors.length) return Promise.resolve({ errors: errors, warnings: warnings });
    var suppressedBlocks = typeof engine.overlayRenderer.unconditionalSuppressedBlocksByPage === 'function'
      ? engine.overlayRenderer.unconditionalSuppressedBlocksByPage(template) : {};
    var suppressedPaths = typeof engine.overlayRenderer.unconditionalSuppressedPathsByPage === 'function'
      ? engine.overlayRenderer.unconditionalSuppressedPathsByPage(template) : {};

    return fetch(runtimePdfUrl).then(function (response) {
      return response.arrayBuffer();
    }).then(function (bytes) {
      return global.PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
    }).then(function (pdfDoc) {
      var pages = pdfDoc.getPages();
      anchors.forEach(function (anchor) {
        var page = pages[anchor.page];
        if (!page) {
          errors.push(item('error', 'anchor-page',
            'Якорь «' + anchor.id + '» ссылается на страницу ' +
            (anchor.page + 1) + ', которой нет в PDF.', null, anchor.page));
          return;
        }
        var analysis;
        try {
          analysis = engine.pageExpander.analysePageShift(page, [{
            fieldId: anchor.id, fromTop: anchor.top, toTop: anchor.toTop,
            delta: anchor.delta, moveTopLevelPaths: anchor.moveTopLevelPaths
          }], {
            suppressedBlocks: suppressedBlocks[anchor.page] || [],
            suppressedPaths: suppressedPaths[anchor.page] || []
          });
        } catch (error) {
          errors.push(item('error', 'anchor-geometry',
            'Якорь «' + anchor.id + '»: ' + error.message, null, anchor.page));
          return;
        }
        if (!analysis.straddling.length) return;
        var first = analysis.straddling[0];
        errors.push(item('error', 'anchor-straddles-source',
          'Точка вставки пересекает исходный блок PDF; выберите границу ' +
          'полного блока. Якорь «' + anchor.id + '» на стр. ' +
          (anchor.page + 1) + ': точка ' + anchor.top + ' pt попадает внутрь ' +
          'блока ' + first.top + '–' + first.bottom + ' pt.',
          null, anchor.page));
      });
      return { errors: errors, warnings: warnings };
    }, function () {
      // The PDF could not be read here; `structural` already reports that.
      return { errors: errors, warnings: warnings };
    });
  }
  Validation.anchorGeometry = anchorGeometry;

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
