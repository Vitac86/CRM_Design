// Document engine — in-place PDF overlay renderer.
//
// Draws dynamic values directly onto the pages of a prepared PDF base template
// with pdf-lib's page.drawText(). The output is ordinary static PDF page
// content: no AcroForm fields, no widgets, no appended pages. The generated
// file must look as if somebody typed the values into the original Word form.
//
// Everything runs in the browser from locally served assets. No backend, no
// Word/LibreOffice, no native binary, no CDN.
//
// ── Coordinate system ──────────────────────────────────────────────────────
// Field maps are authored in TOP-LEFT coordinates because that is how the
// template is read on screen and how tools/probe-pdf-coords.py reports it:
//
//   left         x of the left edge of the field, in points
//   baselineTop  distance from the TOP of the page down to the text BASELINE
//
// The renderer converts to PDF user space (origin bottom-left) internally:
//
//   pdfY = pageHeight - baselineTop
//
// Placing on the baseline (rather than a box) is deliberate: it puts the text
// exactly on the printed rule of the form, which is what "typed on the line"
// means, and it is what the probe tool measures from the real template.
//
// ── Continuation regions ───────────────────────────────────────────────────
// One logical value may flow through several explicitly mapped regions
// (`flowRegions`). The renderer never decides where text breaks: it asks
// document-engine/pdf-text-layout.js and draws exactly the region assignments
// it gets back. Where the authoritative form has no printed rule to continue
// on, a region may declare a reviewed Word-like underline, which is drawn as
// ordinary vector page content — never an AcroForm control or an annotation.

(function (global) {
  'use strict';

  var ns = global.CRMDocumentEngine = global.CRMDocumentEngine || {};
  var Layout = ns.textLayout;
  var Checkbox = ns.checkbox;
  var Expander = ns.pageExpander;

  var Renderer = {};

  var MIN_DYNAMIC_FONT_SIZE = Layout.MIN_DYNAMIC_FONT_SIZE;
  var PREFERRED_DYNAMIC_FONT_SIZE = Layout.PREFERRED_DYNAMIC_FONT_SIZE;
  Renderer.MIN_DYNAMIC_FONT_SIZE = MIN_DYNAMIC_FONT_SIZE;
  Renderer.PREFERRED_DYNAMIC_FONT_SIZE = PREFERRED_DYNAMIC_FONT_SIZE;

  // Default weight of a generated continuation rule. Word draws its bottom
  // borders and underlines at roughly this weight on these forms; a map may
  // override it per region after visual comparison at high zoom.
  var DEFAULT_UNDERLINE_THICKNESS = 0.75;
  var DEFAULT_UNDERLINE_OFFSET = 2;

  // ── Errors ─────────────────────────────────────────────────────────────────

  // Carries the document and field so the wizard can show a precise message
  // instead of a generic "PDF failed".
  function FieldError(documentId, fieldId, message) {
    var e = new Error('[' + documentId + '] ' + fieldId + ': ' + message);
    e.name = 'DocumentFieldError';
    e.documentId = documentId;
    e.fieldId = fieldId;
    e.detail = message;
    return e;
  }
  Renderer.FieldError = FieldError;

  // Raised by the preflight when one or more values cannot be printed. Carries
  // every diagnostic at once, so the wizard can list them and send the manager
  // straight back to the input that needs correcting instead of showing a
  // generic "generation failed".
  function OverflowError(documentId, documentTitle, overflows) {
    var first = overflows[0];
    var e = new Error('[' + documentId + '] ' + first.fieldId + ': ' + first.message);
    e.name = 'DocumentOverflowError';
    e.documentId = documentId;
    e.documentTitle = documentTitle;
    e.overflows = overflows;
    return e;
  }
  Renderer.OverflowError = OverflowError;

  // ── Value formatters ───────────────────────────────────────────────────────

  var MONTHS_RU = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

  function parseRuOrIso(value) {
    var s = String(value || '').trim();
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return { d: m[3], m: m[2], y: m[1] };
    m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (m) return { d: m[1], m: m[2], y: m[3] };
    return null;
  }

  // Reusable Russian document-date splitter.
  //
  //   ruDateParts('20.04.2008')  ->  { day: '20', monthGenitive: 'апреля',
  //                                    monthNumber: '04', year: '2008' }
  //
  // Russian forms are printed as «__» ________ 20__ г., where the month is
  // written in the genitive ("20 апреля 2008"), never as a number. Returns
  // null for an unparseable value so callers can leave the slot blank.
  function ruDateParts(value) {
    var p = parseRuOrIso(value);
    if (!p) return null;
    return {
      day: p.d,
      monthNumber: p.m,
      monthGenitive: MONTHS_RU[parseInt(p.m, 10) - 1] || '',
      year: p.y
    };
  }
  Renderer.ruDateParts = ruDateParts;

  var FORMATTERS = {
    // '2008-04-20' | '20.04.2008' -> '20.04.2008'
    dateRu: function (v) {
      var p = parseRuOrIso(v);
      return p ? (p.d + '.' + p.m + '.' + p.y) : (v || '');
    },
    // date -> day number only, for the «___» slot of a Russian date line
    dateDay: function (v) {
      var p = parseRuOrIso(v);
      return p ? p.d : '';
    },
    // date -> 'апреля 2008' style tail used after «__»
    dateMonthYear: function (v) {
      var p = parseRuOrIso(v);
      if (!p) return '';
      return MONTHS_RU[parseInt(p.m, 10) - 1] + ' ' + p.y;
    },
    // date -> 'MM.YYYY' when the printed slot is too narrow for a month name
    dateMonthYearShort: function (v) {
      var p = parseRuOrIso(v);
      return p ? (p.m + '.' + p.y) : '';
    },
    // date -> month name only, for '«__» ________ 20__ г.' lines where the
    // template already prints the '20' of the year
    monthOnly: function (v) {
      var p = ruDateParts(v);
      return p ? p.monthGenitive : '';
    },
    // date -> genitive month name, e.g. 'сентября'
    dateMonthGenitive: function (v) {
      var p = ruDateParts(v);
      return p ? p.monthGenitive : '';
    },
    // date -> four-digit year, e.g. '2008'
    dateYear4: function (v) {
      var p = ruDateParts(v);
      return p ? p.year : '';
    },
    // date -> 'апреля 2008' — genitive month plus the four-digit year, for a
    // single printed blank that ends just before "г.".
    dateMonthYearGenitive: function (v) {
      var p = ruDateParts(v);
      return p ? (p.monthGenitive + ' ' + p.year) : '';
    },
    // date -> last two digits of the year, for '20__ г.' slots
    dateYear2: function (v) {
      var p = parseRuOrIso(v);
      return p ? p.y.slice(2) : '';
    },
    // 'Ковалёв Даниил Олегович' -> 'Ковалёв Д.О.'
    // Signature-block parentheses are short; the printed convention on these
    // forms is surname plus initials.
    initials: function (v) {
      var parts = String(v || '').trim().split(/\s+/).filter(Boolean);
      if (!parts.length) return '';
      if (parts.length === 1) return parts[0];
      return parts[0] + ' ' + parts.slice(1)
        .map(function (p) { return p.charAt(0).toUpperCase() + '.'; })
        .join('');
    },
    // 'Ковалёв Даниил Олегович' -> 'Ковалёв'
    // Last-resort fallback for very narrow signature slots.
    surname: function (v) {
      var parts = String(v || '').trim().split(/\s+/).filter(Boolean);
      return parts.length ? parts[0] : '';
    },
    // Stable declarative replacements for the legacy inline formatters used
    // by the refusal forms. Keeping these in the production renderer lets
    // builder projects name behavior without serializing executable code.
    prefixNumber: function (v) {
      var value = String(v || '').trim();
      return value ? '\u2116 ' + value : '';
    },
    prefixFrom: function (v) {
      var value = String(v || '').trim();
      return value ? '\u043e\u0442 ' + value : '';
    },
    dateYearLastDigit: function (v) {
      var match = String(v || '').match(/(?:^|\D)(\d{4})(?:\D|$)/);
      return match ? match[1].slice(-1) : '';
    },
    upper: function (v) { return String(v || '').toUpperCase(); },
    trim: function (v) { return String(v == null ? '' : v).trim(); }
  };
  Renderer.formatters = FORMATTERS;

  // ── Payload resolution ─────────────────────────────────────────────────────

  // Resolve 'field.clientFullName' / 'subject.email' / 'extra.x' / 'check.y'.
  // Returns undefined for an unknown namespace or a missing key so the caller
  // can distinguish "absent" from "empty string".
  function resolve(path, payload) {
    if (!path || typeof path !== 'string') return undefined;
    var dot = path.indexOf('.');
    if (dot === -1) return undefined;
    var ns_ = path.slice(0, dot);
    var key = path.slice(dot + 1);
    var source =
      ns_ === 'subject' ? payload.subject :
      ns_ === 'field' ? payload.fields :
      ns_ === 'extra' ? payload.extraValues :
      ns_ === 'check' ? payload.checks : null;
    if (!source) return undefined;
    return Object.prototype.hasOwnProperty.call(source, key) ? source[key] : undefined;
  }
  Renderer.resolve = resolve;

  // Optional visibility condition: { source, equals }. Draw the value only when
  // the referenced business value matches — used for text that belongs to one
  // branch of a mutually exclusive choice, such as the address printed on the
  // "По электронной почте ______" line, which must stay blank when a different
  // delivery method is selected.
  function isVisible(field, payload) {
    var cond = field.showWhen;
    if (!cond || !cond.source) return true;
    var value = resolve(cond.source, payload);
    if (Object.prototype.hasOwnProperty.call(cond, 'equals')) {
      return Array.isArray(cond.equals)
        ? cond.equals.indexOf(value) !== -1
        : value === cond.equals;
    }
    if (Object.prototype.hasOwnProperty.call(cond, 'notEquals')) {
      return Array.isArray(cond.notEquals)
        ? cond.notEquals.indexOf(value) === -1
        : value !== cond.notEquals;
    }
    return !!value;
  }

  function formatValue(field, raw) {
    var fmt = field.format;
    if (!fmt) return raw == null ? '' : String(raw);
    var fn = typeof fmt === 'function' ? fmt : FORMATTERS[fmt];
    if (!fn) return raw == null ? '' : String(raw);
    return fn(raw);
  }

  // ── Print overrides ────────────────────────────────────────────────────────

  // An operator-editable print representation, allowed ONLY where the field map
  // says so with `allowPrintOverride: true`. It never touches the CRM record and
  // only affects the document being generated right now. Names, identifiers,
  // passport and tax numbers must never enable it.
  function printOverrideFor(field, payload) {
    if (!field.allowPrintOverride) return undefined;
    var overrides = payload && payload.printOverrides;
    if (!overrides || !Object.prototype.hasOwnProperty.call(overrides, field.id)) {
      return undefined;
    }
    var value = overrides[field.id];
    return value == null || value === '' ? undefined : value;
  }
  Renderer.printOverrideFor = printOverrideFor;

  // ── Layout — the single production entry point for one field ───────────────
  //
  // Renderer drawing, the Document Wizard preflight and the Template Builder
  // all call this. Nobody re-implements the formatter chain or the wrapping.
  //
  // Returns one of:
  //   { drawn: false, reason: 'hidden' | 'empty' }
  //   { drawn: true,  value, formatter, fallbackIndex, layout, regions }
  //   { drawn: false, reason: 'missing' | 'overflow', diagnostics }
  function layoutField(field, payload, font, options) {
    var opts = options || {};
    if (!isVisible(field, payload)) return { drawn: false, reason: 'hidden' };

    var type = field.type || 'text';
    var override = printOverrideFor(field, payload);
    var raw = type === 'static' ? field.text
      : (override !== undefined ? override : resolve(field.source, payload));

    // `opts.regions` lets the page-expansion pass hand in the field's regions
    // after inserted rows have been added and everything below an anchor has
    // been moved down. Without it the field's own mapped geometry is used.
    var regions = opts.regions || Layout.regionsFor(field);
    var size = field.fontSize != null ? Number(field.fontSize) : PREFERRED_DYNAMIC_FONT_SIZE;
    var minSize = field.minFontSize != null ? Number(field.minFontSize) : size;

    // Applying the primary formatter first, then each declared legally safe
    // fallback, repeating the whole wrap/shrink process for each.
    var candidates = [field.format].concat(field.fallbacks || []);
    var attempts = [];
    var value = '';

    for (var index = 0; index < candidates.length; index += 1) {
      var candidate = formatValue({ format: candidates[index] }, raw);
      if (!candidate) { value = candidate; continue; }
      value = candidate;
      var result = Layout.layoutValue(font, candidate, {
        size: size,
        minSize: minSize,
        regions: regions,
        tokenBreak: field.tokenBreak
      });
      attempts.push({ formatter: candidates[index] || null, value: candidate, layout: result });
      if (result.fits) {
        return {
          drawn: true,
          value: candidate,
          formatter: candidates[index] || null,
          fallbackIndex: index,
          usedFallback: index > 0,
          layout: result,
          regions: regions,
          overridden: override !== undefined
        };
      }
    }

    if (!value) {
      return field.required
        ? { drawn: false, reason: 'missing', fieldId: field.id }
        : { drawn: false, reason: 'empty' };
    }

    // Everything was tried: every approved line, every size down to the floor
    // and every declared fallback. Report precisely why, in the manager's terms.
    var primary = attempts[0];
    var layoutResult = primary.layout;
    return {
      drawn: false,
      reason: 'overflow',
      value: primary.value,
      regions: regions,
      layout: layoutResult,
      diagnostics: {
        fieldId: field.id,
        label: field.label || field.id,
        source: field.source || null,
        value: primary.value,
        valueLength: String(primary.value).length,
        minFontSize: Math.max(MIN_DYNAMIC_FONT_SIZE, minSize),
        preferredFontSize: size,
        regionCount: regions.length,
        lineCapacity: layoutResult.lineCapacity,
        availableWidth: layoutResult.availableWidth,
        reason: layoutResult.reason,
        token: layoutResult.token || null,
        remaining: layoutResult.remaining || null,
        fallbacksTried: attempts.length - 1,
        allowPrintOverride: !!field.allowPrintOverride,
        editable: !!field.source && field.source.indexOf('extra.') === 0
      }
    };
  }
  Renderer.layoutField = layoutField;

  // ── Word-flow block resolution and layout ─────────────────────────────────

  function fieldsById(template) {
    var out = {};
    (template.fields || []).forEach(function (field) { out[field.id] = field; });
    return out;
  }

  function isFlowReference(field) {
    return field && field.layoutMode === 'flow-reference';
  }
  Renderer.isFlowReference = isFlowReference;

  function cloneRun(run) {
    var out = {};
    Object.keys(run || {}).forEach(function (key) {
      var value = run[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        var nested = {};
        Object.keys(value).forEach(function (name) { nested[name] = value[name]; });
        out[key] = nested;
      } else out[key] = value;
    });
    return out;
  }

  // Resolve existing business fields into text-bearing layout runs.  Field IDs,
  // sources and production formatters remain on the field definitions; the
  // block only references them and therefore cannot silently fork the business
  // schema. `useRawValue` is an explicit layout choice for a full name whose
  // legacy fixed signature slot still uses initials.
  // The size a client or transaction value is drawn at inside a reviewed block.
  //
  // A Word-flow block locks its size to the printed paragraph it replaces, so
  // that the form's own wording is reproduced exactly. Two forms set that
  // paragraph in 8.52 pt, which is below the 9 pt readability floor the
  // business set for values a client has to be able to read.
  //
  // `valueFontSize` separates the two: the static wording keeps the source's
  // size, and the values the manager entered are drawn at the floor. It is
  // stated per block, in the map, next to the size it overrides — there is no
  // implicit exception anywhere for a run merely being locked.
  function valueRunSize(block, run) {
    if (run.fontSize != null) return run.fontSize;
    if (block.valueFontSize != null) return Number(block.valueFontSize);
    return block.fontSize;
  }
  Renderer.valueRunSize = valueRunSize;

  function resolveWordFlowRuns(template, block, payload) {
    var index = fieldsById(template);
    var resolved = [];
    var missing = [];
    var values = {};

    (block.runs || []).forEach(function (sourceRun) {
      var run = cloneRun(sourceRun);
      if (run.type !== 'fieldRef') {
        resolved.push(run);
        return;
      }
      var field = index[run.fieldId];
      if (!field) {
        missing.push({ fieldId: run.fieldId, reason: 'missing-reference' });
        return;
      }
      if (!isVisible(field, payload)) {
        // Mutually exclusive existing fields may share one reviewed paragraph.
        // An inactive reference is zero-width and undecorated: it neither asks
        // for a business value nor leaves a blank underline in the active
        // branch, and it is deliberately absent from the rendered-value set.
        //
        // `blankWhenEmpty` is the reviewed exception: the source form prints
        // this blank unconditionally, so an unselected branch keeps the rule
        // rather than deleting it from the document.
        run.text = '';
        run.sourceFieldId = field.id;
        run.inactive = true;
        if (!run.blankWhenEmpty) delete run.decoration;
        run.font = run.font || block.font || field.font || 'legalSerif';
        run.fontSize = run.fontSize != null ? run.fontSize : block.fontSize;
        resolved.push(run);
        return;
      }
      var override = printOverrideFor(field, payload);
      var raw = override !== undefined ? override : resolve(field.source, payload);
      var value;
      if (run.useRawValue) value = raw == null ? '' : String(raw);
      else if (Object.prototype.hasOwnProperty.call(run, 'format')) {
        value = formatValue({ format: run.format }, raw);
      } else value = formatValue(field, raw);

      if (!value && field.required && !field.optional) {
        missing.push({
          fieldId: field.id,
          label: field.label || field.id,
          source: field.source,
          reason: 'missing'
        });
      }
      run.text = value || '';
      run.sourceFieldId = field.id;
      run.font = run.font || block.font || field.font || 'legalSerif';
      run.fontSize = valueRunSize(block, run);
      values[field.id] = run.text;
      resolved.push(run);
    });

    return { runs: resolved, missing: missing, values: values };
  }
  Renderer.resolveWordFlowRuns = resolveWordFlowRuns;

  // Why a reviewed paragraph could not be laid out, in physical terms.
  //
  // The three refusals a manager can actually meet are different problems and
  // need different words: a value with no space in it can never be wrapped;
  // more continuation rows than the source page was reviewed for is a capacity
  // limit with a number attached; anything else is a configuration fault.
  function wordFlowOverflowMessage(block, result) {
    var layout = result.layout || {};
    if (layout.reason === 'unbreakable-token') {
      return 'неразрывное значение не помещается в Word-подобный блок';
    }
    var expansion = block.expansion || {};
    var allowed = Number(expansion.maxExtraRows == null ? 0 : expansion.maxExtraRows);
    var wanted = Number(layout.additionalLinesWanted != null
      ? layout.additionalLinesWanted : layout.additionalLines || 0);
    if (layout.reason === 'no-space' || wanted > allowed) {
      var rows = wanted > allowed
        ? 'требуется дополнительных строк: ' + wanted + ', разрешено: ' + allowed
        : 'дополнительных строк разрешено: ' + allowed;
      return 'значения не умещаются в блок «' + block.id + '»: ' + rows +
        '. Исходная форма даёт этому блоку ровно столько места; сократите одно ' +
        'из длинных значений или согласуйте увеличение запаса строк.';
    }
    return result.message || 'Word-подобный блок не помещается в проверенные границы';
  }
  Renderer.wordFlowOverflowMessage = wordFlowOverflowMessage;

  function layoutWordFlowBlock(template, block, payload, fonts) {
    if (!isVisible(block, payload)) {
      return { drawn: false, reason: 'hidden', blockId: block.id };
    }
    var prepared = resolveWordFlowRuns(template, block, payload);
    if (prepared.missing.length) {
      return {
        drawn: false,
        reason: prepared.missing[0].reason,
        blockId: block.id,
        missing: prepared.missing,
        runs: prepared.runs,
        values: prepared.values
      };
    }
    var frame = block.frame || {};
    var expansion = block.expansion || {};
    var layout;
    try {
      layout = Layout.layoutRuns(fonts, prepared.runs, {
        frame: frame,
        font: block.font || 'legalSerif',
        fontSize: Number(block.fontSize),
        minFontSize: block.minFontSize != null ? Number(block.minFontSize) : Number(block.fontSize),
        fontSizeLocked: !!block.fontSizeLocked,
        lineHeight: Number(block.lineHeight),
        paragraphSpacingAfter: Number(block.paragraphSpacingAfter || 0),
        alignment: block.alignment || block.align || 'left',
        firstLineIndent: Number(block.firstLineIndent || 0),
        hangingIndent: Number(block.hangingIndent || 0),
        justifyMinRatio: block.justifyMinRatio,
        initialLineCount: Number(block.initialLineCount || frame.initialLineCount || 1),
        maxAdditionalLines: Number(block.maxAdditionalLines != null
          ? block.maxAdditionalLines : expansion.maxExtraRows || 0)
      });
    } catch (error) {
      return {
        drawn: false, reason: 'configuration', blockId: block.id,
        message: error.message, runs: prepared.runs, values: prepared.values
      };
    }
    if (!layout.fits) {
      return {
        drawn: false,
        reason: 'overflow',
        blockId: block.id,
        fieldId: layout.fieldId || null,
        layout: layout,
        runs: prepared.runs,
        values: prepared.values
      };
    }
    return {
      drawn: true,
      blockId: block.id,
      layout: layout,
      runs: prepared.runs,
      values: prepared.values
    };
  }
  Renderer.layoutWordFlowBlock = layoutWordFlowBlock;

  function planWordFlowBlocks(template, payload, fonts) {
    var byBlock = {};
    var overflows = [];
    (template.wordFlowBlocks || []).forEach(function (block) {
      var result = layoutWordFlowBlock(template, block, payload, fonts);
      byBlock[block.id] = result;
      if (result.drawn || result.reason === 'hidden') return;
      if (result.reason === 'missing' || result.reason === 'missing-reference') {
        (result.missing || [{ fieldId: block.id, reason: result.reason }]).forEach(function (item) {
          overflows.push({
            documentId: template.id,
            documentTitle: template.title || template.id,
            blockId: block.id,
            fieldId: item.fieldId || block.id,
            label: item.label || block.label || item.fieldId || block.id,
            source: item.source || null,
            reason: item.reason,
            editable: !!item.source && item.source.indexOf('extra.') === 0,
            message: item.reason === 'missing-reference'
              ? 'в блоке отсутствует ссылка на существующее поле'
              : 'обязательное значение отсутствует'
          });
        });
        return;
      }
      var field = result.fieldId && fieldsById(template)[result.fieldId];
      overflows.push({
        documentId: template.id,
        documentTitle: template.title || template.id,
        blockId: block.id,
        fieldId: result.fieldId || block.id,
        label: field && (field.label || field.id) || block.label || block.id,
        source: field && field.source || null,
        reason: result.layout && result.layout.reason || result.reason,
        editable: !!(field && field.source && field.source.indexOf('extra.') === 0),
        // A capacity refusal has to say what physically ran out. «The block
        // does not fit» tells the manager nothing they can act on; the rows
        // wanted against the rows the reviewed source can give does.
        message: wordFlowOverflowMessage(block, result)
      });
    });
    return { byBlock: byBlock, overflows: overflows };
  }
  Renderer.planWordFlowBlocks = planWordFlowBlocks;

  function reviewedRangeForBlock(block) {
    var source = block.sourceReplacement || block.originalContentRange;
    if (!source) return null;
    return {
      id: block.id,
      firstBlock: Number(source.firstBlock),
      lastBlock: Number(source.lastBlock),
      expectedBlockCount: Number(source.expectedBlockCount),
      expectedPageBlockCount: source.expectedPageBlockCount == null
        ? null : Number(source.expectedPageBlockCount),
      expectedSha256: source.expectedSha256,
      expectedTemplateSha256: source.expectedTemplateSha256,
      reviewStatus: source.reviewStatus
    };
  }

  // Only the visible variant is replaced. A combined template such as the
  // Power of Attorney retains the authoritative blank wording on the inactive
  // pages and suppresses the reviewed ranges for the selected variant only.
  function activeReviewedRangePages(template, payload) {
    var byPage = {};
    (template.wordFlowBlocks || []).forEach(function (block) {
      if (!isVisible(block, payload)) return;
      var range = reviewedRangeForBlock(block);
      if (!range) return;
      var page = Number(block.page);
      byPage[page] = byPage[page] || { page: page, blocks: [], ranges: [] };
      byPage[page].blocks.push(block);
      byPage[page].ranges.push(range);
    });
    return Object.keys(byPage).map(Number).sort(function (a, b) { return a - b; })
      .map(function (page) { return byPage[page]; });
  }
  Renderer.activeReviewedRangePages = activeReviewedRangePages;

  function inspectActiveReviewedRanges(context, template, payload) {
    var groups = activeReviewedRangePages(template, payload);
    return Promise.all(groups.map(function (group) {
      return Expander.inspectReviewedRanges(
        context.pdfDoc, context.pages[group.page], group.ranges,
        { templateBytes: context.templateBytes }
      ).then(function (inspection) {
        return { page: group.page, blocks: group.blocks, inspection: inspection };
      });
    }));
  }
  Renderer.inspectActiveReviewedRanges = inspectActiveReviewedRanges;

  function suppressActiveReviewedRanges(context, template, payload) {
    var groups = activeReviewedRangePages(template, payload);
    return Promise.all(groups.map(function (group) {
      return Expander.suppressReviewedRanges(
        context.pdfDoc, context.pages[group.page], group.ranges,
        { templateBytes: context.templateBytes }
      ).then(function (suppression) {
        return { page: group.page, blocks: group.blocks, suppression: suppression };
      });
    }));
  }
  Renderer.suppressActiveReviewedRanges = suppressActiveReviewedRanges;

  // Human-readable reason, reused by the renderer error and the wizard UI.
  function overflowMessage(diagnostics) {
    if (diagnostics.reason === 'unbreakable-token') {
      return 'фрагмент «' + diagnostics.token + '» не помещается по ширине ' +
        'даже при минимальном кегле ' + diagnostics.minFontSize + ' pt ' +
        '(доступно ' + Math.floor(diagnostics.availableWidth) + ' pt) и не ' +
        'содержит допустимого места переноса';
    }
    return 'значение (' + diagnostics.valueLength + ' симв.) не помещается ' +
      'при минимальном кегле ' + diagnostics.minFontSize + ' pt: ' +
      'доступно строк — ' + diagnostics.lineCapacity +
      ' (областей: ' + diagnostics.regionCount + '), ' +
      'не размещено: «' + String(diagnostics.remaining || '').slice(0, 60) + '»';
  }
  Renderer.overflowMessage = overflowMessage;

  // ── Configuration validation ───────────────────────────────────────────────

  var TEXT_TYPES = { text: 1, static: 1 };

  // The two reviewed departures from ordinary word wrapping. 'none' forbids
  // splitting a token even at punctuation it already contains — an exact
  // reference printed whole or moved whole. 'anywhere' permits a mid-token cut
  // for a machine identifier the source itself allows to be broken.
  var TOKEN_BREAK_MODES = { none: 1, anywhere: 1 };

  // The page-level expansion budget: measured once per page, shared by every
  // anchor on it. Checked against the real page so a map cannot promise room
  // the paper does not have.
  function validatePageLayout(template, pages, problems) {
    var layout = template.pageLayout;
    if (!layout) return;
    Object.keys(layout).forEach(function (key) {
      var index = Number(key);
      var where = 'pageLayout[' + key + ']';
      if (!(index >= 0 && index < pages.length)) {
        problems.push(where + ': page is outside the document');
        return;
      }
      var entry = layout[key] || {};
      var height = pages[index].getSize().height;

      ['bodyBottom', 'shiftToTop'].forEach(function (name) {
        if (!isFinite(Number(entry[name]))) {
          problems.push(where + '.' + name + ' must be a number');
        }
      });
      if (problems.length && problems[problems.length - 1].indexOf(where) === 0) return;

      var footer = entry.fixedFooterFrom != null ? Number(entry.fixedFooterFrom) : height;
      if (footer > height + 0.5) {
        problems.push(where + '.fixedFooterFrom is past the page bottom');
      }
      if (Number(entry.bodyBottom) > footer + 1e-6) {
        problems.push(where + ': the movable body overlaps the fixed footer');
      }
      if (Number(entry.shiftToTop) > footer - 1e-6 && entry.fixedFooterFrom != null) {
        problems.push(where + ': shiftToTop reaches the fixed footer — a page ' +
          'number must never move');
      }
      if (Number(entry.shiftToTop) > height + 0.5) {
        problems.push(where + ': shiftToTop is past the page bottom');
      }
      var clearance = entry.bottomClearance != null ? Number(entry.bottomClearance) : 4;
      if (!isFinite(clearance) || clearance < 0) {
        problems.push(where + '.bottomClearance must be zero or more');
      }

      (entry.compaction || []).forEach(function (zone, i) {
        var at = where + '.compaction[' + i + ']';
        ['top', 'originalGap', 'minGap'].forEach(function (name) {
          if (!isFinite(Number(zone[name]))) problems.push(at + '.' + name + ' must be a number');
        });
        if (Number(zone.minGap) > Number(zone.originalGap) + 1e-6) {
          problems.push(at + ': minGap is larger than the gap it compacts');
        }
        if (Number(zone.minGap) < 0) problems.push(at + ': minGap must be zero or more');
        if (zone.reviewStatus !== 'approved') {
          problems.push(at + ': whitespace compaction is not visually approved');
        }
      });

      var flow = entry.crossPageFlow;
      if (flow) {
        var flowAt = where + '.crossPageFlow';
        ['targetPage', 'sourceFromTop', 'sourceToTop', 'sourceContentTop',
         'retainedBodyBottom', 'targetInsertionTop', 'targetShiftFromTop',
         'targetShiftToTop', 'targetShift', 'maxCumulativeShift',
         'maxCascadeDepth'].forEach(function (name) {
          if (!isFinite(Number(flow[name]))) {
            problems.push(flowAt + '.' + name + ' must be a number');
          }
        });
        var targetPage = Number(flow.targetPage);
        if (!Number.isInteger(targetPage) || targetPage !== index + 1 ||
            targetPage >= pages.length) {
          problems.push(flowAt + '.targetPage must name the immediately following page');
        }
        if (Number(flow.sourceFromTop) >= Number(flow.sourceToTop)) {
          problems.push(flowAt + ': source block is empty');
        }
        if (Number(flow.sourceFromTop) < 0 || Number(flow.sourceToTop) > height + 0.5) {
          problems.push(flowAt + ': source block is outside the source page');
        }
        if (Number(flow.sourceContentTop) < Number(flow.sourceFromTop) - 1e-6 ||
            Number(flow.sourceContentTop) > Number(flow.sourceToTop) + 1e-6) {
          problems.push(flowAt + '.sourceContentTop is outside the source block');
        }
        if (Number(flow.retainedBodyBottom) < 0 ||
            Number(flow.retainedBodyBottom) > Number(flow.sourceFromTop) + 0.5 ||
            Number(flow.retainedBodyBottom) >= Number(entry.bodyBottom) - 1e-6) {
          problems.push(flowAt + ': the moved block does not recover page room');
        }
        if (Number.isInteger(targetPage) && targetPage >= 0 && targetPage < pages.length) {
          var targetHeight = pages[targetPage].getSize().height;
          if (Number(flow.targetShiftFromTop) < 0 ||
              Number(flow.targetShiftFromTop) >= Number(flow.targetShiftToTop) ||
              Number(flow.targetShiftToTop) > targetHeight + 0.5) {
            problems.push(flowAt + ': target movable block is outside the target page');
          }
          if (Number(flow.targetInsertionTop) < Number(flow.targetShiftFromTop) - 1e-6 ||
              Number(flow.targetInsertionTop) > Number(flow.targetShiftToTop) + 1e-6) {
            problems.push(flowAt + ': target insertion is outside its movable block');
          }
          if (layout[targetPage] && layout[targetPage].crossPageFlow) {
            problems.push(flowAt + ': cascading cross-page flow is not allowed');
          }
        }
        if (Number(flow.targetShift) <= 0 ||
            Number(flow.targetShift) > Number(flow.maxCumulativeShift) + 1e-6) {
          problems.push(flowAt + ': target shift exceeds its reviewed maximum');
        }
        if (Number(flow.maxCascadeDepth) !== 1) {
          problems.push(flowAt + ': only one reviewed page boundary may be crossed');
        }
        if (flow.reviewStatus !== 'approved') {
          problems.push(flowAt + ': cross-page flow is not visually approved');
        }
        if (!String(flow.note || '').trim()) {
          problems.push(flowAt + ': cross-page flow needs a review note');
        }
      }

      var budget = Expander.pageBudget(entry, [], height);
      (entry.anchors || []).forEach(function (fieldId) {
        var field = (template.fields || []).concat(template.wordFlowBlocks || [])
          .filter(function (f) { return f.id === fieldId; })[0];
        if (!field) {
          problems.push(where + '.anchors: no field "' + fieldId + '"');
          return;
        }
        var spec = Expander.expansionOf(field);
        if (!spec) {
          problems.push(where + '.anchors: "' + fieldId + '" has no expansion');
          return;
        }
        var page = spec.page != null ? Number(spec.page) : Number(field.page);
        if (page !== index) {
          problems.push(where + '.anchors: "' + fieldId + '" expands page ' + page);
        }
        if (Number(spec.rowHeight) > budget.total + 1e-6) {
          problems.push(where + ': "' + fieldId + '" needs ' + spec.rowHeight +
            ' pt for one row, the page budget is ' + budget.total + ' pt');
        }
      });
    });
  }
  Renderer.validatePageLayout = validatePageLayout;

  // Validate every region a text field draws into: the implicit one built from
  // the field's own geometry, plus each declared continuation region.
  function validateRegions(template, field, id, pages, problems) {
    var regions;
    try {
      regions = Layout.regionsFor(field);
    } catch (e) {
      problems.push(id + ': flowRegions could not be read');
      return;
    }

    var declared = Array.isArray(field.flowRegions) ? field.flowRegions : null;
    if (declared && declared.length < 2) {
      problems.push(id + ': flowRegions must list at least two regions');
    }
    if (field.overflowStrategy &&
        ['flow', 'shrink', 'expand-layout'].indexOf(field.overflowStrategy) === -1) {
      problems.push(id + ': unknown overflowStrategy "' + field.overflowStrategy + '"');
    }
    if (field.overflowStrategy === 'flow' && !declared) {
      problems.push(id + ': overflowStrategy "flow" needs flowRegions');
    }
    if (field.overflowStrategy === 'expand-layout') {
      validateExpansion(template, field, id, pages, problems);
    } else if (field.expansion) {
      problems.push(id + ': expansion declared without overflowStrategy "expand-layout"');
    }

    var seen = {};
    regions.forEach(function (region, index) {
      var where = id + ' region ' + index;
      if (declared && (declared[index].page == null)) {
        problems.push(where + ': every continuation region needs an explicit page');
      }
      if (typeof region.page !== 'number' || region.page < 0 || region.page >= pages.length) {
        problems.push(where + ': invalid page index ' + region.page);
        return;
      }
      var size = pages[region.page].getSize();
      if (!isFinite(region.left) || !isFinite(region.baselineTop)) {
        problems.push(where + ': left/baselineTop must be numbers');
        return;
      }
      if (!isFinite(region.width) || region.width <= 0) {
        problems.push(where + ': width must be a positive number');
        return;
      }
      if (region.left < 0 || region.left + region.width > size.width + 0.5) {
        problems.push(where + ': extends past the page width');
      }
      if (region.baselineTop < 0 || region.baselineTop > size.height) {
        problems.push(where + ': baselineTop outside the page height');
      }
      if (region.maxLines != null && region.maxLines < 1) {
        problems.push(where + ': maxLines must be at least 1');
      }
      // Consecutive lines collide when the leading drops below the ink height
      // of the face — cap height plus descender, about 0.88 em for the serif
      // used here. Word itself sets tighter "exactly" leading than the point
      // size on these forms, so the font size alone is not the threshold.
      var fontSize = field.fontSize != null ? Number(field.fontSize) : PREFERRED_DYNAMIC_FONT_SIZE;
      if (region.lineHeightRatio != null) {
        if (!(region.lineHeightRatio >= 0.9) || region.lineHeightRatio > 3) {
          problems.push(where + ': lineHeightRatio ' + region.lineHeightRatio +
            ' must be between 0.9 and 3');
        }
      } else if (region.lineHeight != null && region.maxLines !== 1 &&
          region.lineHeight < fontSize * 0.9) {
        problems.push(where + ': lineHeight ' + region.lineHeight +
          ' is too tight for font size ' + fontSize);
      }
      var key = region.page + '|' + region.left + '|' + region.baselineTop;
      if (seen[key]) problems.push(where + ': duplicates the position of region ' + seen[key]);
      seen[key] = index;

      // A generated Word-like continuation line must have been looked at by a
      // human before it can appear in a client document.
      if (region.drawUnderline) {
        if (region.generated && region.reviewStatus !== 'approved') {
          problems.push(where + ': generated continuation line is not visually approved');
        }
        var underlineWidth = region.underlineWidth != null
          ? Number(region.underlineWidth) : region.width;
        var underlineLeft = region.underlineLeft != null
          ? Number(region.underlineLeft) : region.left;
        if (!isFinite(underlineWidth) || underlineWidth <= 0) {
          problems.push(where + ': underlineWidth must be a positive number');
        } else if (underlineLeft < 0 || underlineLeft + underlineWidth > size.width + 0.5) {
          problems.push(where + ': underline extends past the page width');
        }
        var thickness = region.underlineThickness != null
          ? Number(region.underlineThickness) : DEFAULT_UNDERLINE_THICKNESS;
        if (!isFinite(thickness) || thickness <= 0 || thickness > 3) {
          problems.push(where + ': underlineThickness must be between 0 and 3 pt');
        }
      }
    });
  }

  // A page-expansion definition has to say everything: no runtime guesswork is
  // permitted about where a row opens, what may move, or how far.
  function validateExpansion(template, field, id, pages, problems) {
    var spec = field.expansion;
    if (!spec) {
      problems.push(id + ': overflowStrategy "expand-layout" needs an expansion block');
      return;
    }
    var pageIndex = spec.page != null ? Number(spec.page) : Number(field.page);
    if (!(pageIndex >= 0 && pageIndex < pages.length)) {
      problems.push(id + ': expansion page ' + pageIndex + ' is outside the document');
      return;
    }
    var size = pages[pageIndex].getSize();

    // The page budget may live on the page (`template.pageLayout`) or, for a
    // map authored before it existed, on the anchor itself. Exactly one of them
    // has to be there.
    var pageLayout = (template && template.pageLayout || {})[pageIndex];
    var required = [['insertionTop', spec.insertionTop], ['rowHeight', spec.rowHeight],
                    ['maxExtraRows', spec.maxExtraRows], ['shiftFromTop', spec.shiftFromTop]];
    if (!pageLayout) {
      required.push(['shiftToTop', spec.shiftToTop]);
      required.push(['bottomReserve', spec.bottomReserve]);
    }
    required.forEach(function (entry) {
      if (!isFinite(Number(entry[1]))) {
        problems.push(id + ': expansion.' + entry[0] + ' must be a number');
      }
    });
    if (problems.length && problems[problems.length - 1].indexOf('expansion.') !== -1) return;

    if (Number(spec.rowHeight) <= 0) problems.push(id + ': expansion.rowHeight must be positive');
    if (Number(spec.maxExtraRows) < 1) problems.push(id + ': expansion.maxExtraRows must be at least 1');
    if (Number(spec.shiftFromTop) > Number(spec.insertionTop) + 1e-6) {
      problems.push(id + ': expansion.shiftFromTop must not be below the insertion point');
    }

    if (pageLayout) {
      if ((pageLayout.anchors || []).indexOf(id) === -1) {
        problems.push(id + ': is not listed in pageLayout[' + pageIndex + '].anchors');
      }
      if (spec.bottomReserve != null) {
        problems.push(id + ': expansion.bottomReserve duplicates the page budget — ' +
          'the reserve of a page is declared once, in pageLayout[' + pageIndex + ']');
      }
      if (pageLayout.fixedFooterFrom != null &&
          Number(pageLayout.shiftToTop) >= Number(pageLayout.fixedFooterFrom) - 1e-6) {
        problems.push(id + ': the movable block reaches the fixed footer of page ' +
          pageIndex);
      }
    } else {
      if (Number(spec.shiftToTop) <= Number(spec.shiftFromTop)) {
        problems.push(id + ': expansion movable block is empty');
      }
      // `bottomReserve` is the measured free space beneath the lowest movable
      // content — the most the block may travel. The movable block's own bottom
      // boundary only has to stay on the page.
      if (Number(spec.shiftToTop) > size.height + 0.5) {
        problems.push(id + ': expansion movable block ends past the page bottom');
      }
      if (Number(spec.bottomReserve) < Number(spec.rowHeight)) {
        problems.push(id + ': expansion.bottomReserve is smaller than one row');
      }
      if (Number(spec.bottomReserve) > size.height) {
        problems.push(id + ': expansion.bottomReserve is larger than the page');
      }
    }

    var style = spec.lineStyle || 'underline';
    if (['underline', 'table-row', 'none'].indexOf(style) === -1) {
      problems.push(id + ': unknown expansion lineStyle "' + style + '"');
    }
    var line = spec.line || {};
    if (style !== 'none') {
      if (!isFinite(Number(line.width)) || Number(line.width) <= 0) {
        problems.push(id + ': expansion.line.width must be a positive number');
      } else if (Number(line.left) < 0 || Number(line.left) + Number(line.width) > size.width + 0.5) {
        problems.push(id + ': expansion.line extends past the page width');
      }
    }
    if (style === 'underline' && !isFinite(Number(line.ruleThickness == null ? 0.36 : line.ruleThickness))) {
      problems.push(id + ': expansion.line.ruleThickness must be a number');
    }
    if (spec.reviewStatus && spec.reviewStatus !== 'approved') {
      problems.push(id + ': expansion rule is not visually approved');
    }
  }

  function validateWordFlowBlocks(template, pages, problems) {
    var fields = fieldsById(template);
    var seenBlocks = {};
    var referenced = {};
    var ranges = {};

    (template.wordFlowBlocks || []).forEach(function (block, index) {
      var id = block.id || ('wordFlowBlocks[' + index + ']');
      var where = 'wordFlowBlocks[' + index + ']';
      if (seenBlocks[id] || fields[id]) problems.push(where + ': duplicate id "' + id + '"');
      seenBlocks[id] = true;
      if (block.type !== 'wordFlowBlock') {
        problems.push(id + ': type must be "wordFlowBlock"');
      }
      if (!Number.isInteger(Number(block.page)) || block.page < 0 || block.page >= pages.length) {
        problems.push(id + ': invalid page index ' + block.page);
        return;
      }
      var size = pages[block.page].getSize();
      var frame = block.frame || {};
      ['left', 'baselineTop', 'width'].forEach(function (name) {
        if (!isFinite(Number(frame[name]))) problems.push(id + '.frame.' + name + ' must be a number');
      });
      if (Number(frame.width) <= 0 || Number(frame.left) < 0 ||
          Number(frame.left) + Number(frame.width) > size.width + 0.5) {
        problems.push(id + ': frame extends past the page width');
      }
      if (Number(frame.baselineTop) < 0 || Number(frame.baselineTop) > size.height) {
        problems.push(id + ': frame baseline is outside the page');
      }
      if (!(Number(block.fontSize) > 0) || !(Number(block.lineHeight) > 0)) {
        problems.push(id + ': fontSize and lineHeight must be positive');
      }
      if (!block.fontSizeLocked || Number(block.minFontSize) !== Number(block.fontSize)) {
        problems.push(id + ': reviewed Word flow must lock minFontSize to fontSize');
      }
      if (block.font && !(template.fonts || {})[block.font] && !DEFAULT_FONT_KEYS[block.font]) {
        problems.push(id + ': unknown font "' + block.font + '"');
      }
      if (!Number.isInteger(Number(block.initialLineCount || frame.initialLineCount)) ||
          Number(block.initialLineCount || frame.initialLineCount) < 1) {
        problems.push(id + ': initialLineCount must be at least 1');
      }

      var replacement = block.sourceReplacement || block.originalContentRange;
      if (!replacement) {
        problems.push(id + ': reviewed sourceReplacement is required');
      } else {
        var first = Number(replacement.firstBlock);
        var last = Number(replacement.lastBlock);
        if (!Number.isInteger(first) || !Number.isInteger(last) || first < 1 || last < first) {
          problems.push(id + ': sourceReplacement needs a valid firstBlock/lastBlock range');
        }
        var expectedCount = Number(replacement.expectedBlockCount);
        if (!Number.isInteger(expectedCount) || expectedCount < 1 ||
            expectedCount !== last - first + 1) {
          problems.push(id + ': sourceReplacement.expectedBlockCount must equal the reviewed ordinal span');
        }
        if (!/^[0-9a-f]{64}$/i.test(String(replacement.expectedSha256 || ''))) {
          problems.push(id + ': sourceReplacement.expectedSha256 must freeze the reviewed operator bytes');
        }
        if (!/^[0-9a-f]{64}$/i.test(String(replacement.expectedTemplateSha256 || ''))) {
          problems.push(id + ': sourceReplacement.expectedTemplateSha256 must freeze the authoritative PDF');
        }
        if (replacement.expectedPageBlockCount != null &&
            (!Number.isInteger(Number(replacement.expectedPageBlockCount)) ||
             Number(replacement.expectedPageBlockCount) < 1)) {
          problems.push(id + ': sourceReplacement.expectedPageBlockCount must be a positive integer');
        }
        if (replacement.reviewStatus !== 'approved') {
          problems.push(id + ': sourceReplacement is not visually approved');
        }
        var pageRanges = ranges[block.page] = ranges[block.page] || [];
        pageRanges.forEach(function (other) {
          if (first <= other.last && last >= other.first) {
            problems.push(id + ': sourceReplacement overlaps "' + other.id + '"');
          }
        });
        pageRanges.push({ id: id, first: first, last: last });
      }

      var blockRefs = {};
      (block.runs || []).forEach(function (run, runIndex) {
        if (run.type !== 'fieldRef') return;
        var field = fields[run.fieldId];
        if (!field) {
          problems.push(id + '.runs[' + runIndex + ']: missing field "' + run.fieldId + '"');
          return;
        }
        if (blockRefs[field.id] && !run.allowDuplicate) {
          problems.push(id + ': field "' + field.id + '" is referenced more than once');
        }
        blockRefs[field.id] = true;
        if (referenced[field.id] && referenced[field.id] !== id &&
            !field.allowMultipleFlowReferences) {
          problems.push(id + ': field "' + field.id + '" is already referenced by "' +
            referenced[field.id] + '"');
        }
        referenced[field.id] = id;
        if (!isFlowReference(field)) {
          problems.push(id + ': field "' + field.id + '" would be rendered independently too');
        }
        var owners = Array.isArray(field.flowBlockId) ? field.flowBlockId : [field.flowBlockId];
        if (owners.indexOf(id) === -1) {
          problems.push(id + ': field "' + field.id + '" does not name this flowBlockId');
        }
        if (run.keepTogether && run.emergencyBreak) {
          problems.push(id + '.runs[' + runIndex + ']: keepTogether conflicts with emergencyBreak');
        }
        if (run.decoration && run.decoration.underline) {
          var thickness = run.decoration.thickness == null
            ? DEFAULT_UNDERLINE_THICKNESS : Number(run.decoration.thickness);
          if (!(thickness > 0 && thickness <= 3)) {
            problems.push(id + '.runs[' + runIndex + ']: invalid underline thickness');
          }
        }
        // Keeping the source's blank is only meaningful if the run knows how
        // wide that blank was; without it an unfilled reference would draw a
        // zero-length rule where the form printed a line to write on.
        if (run.blankWhenEmpty &&
            !(run.decoration && Number(run.decoration.minWidth) > 0)) {
          problems.push(id + '.runs[' + runIndex + ']: blankWhenEmpty needs ' +
            'decoration.minWidth — the printed blank it reproduces');
        }
      });

      if (block.sourceStaticText != null) {
        var actual = Layout.staticTokenSequence(Layout.staticTextOfRuns(block.runs || []));
      var placeholders = validateSourcePlaceholders(block, id, blockRefs, problems);

        if (expected.join('\u0001') !== actual.join('\u0001')) {
          problems.push(id + ': configured static token sequence differs from the source block');
        }
        // A reviewed placeholder — a sample value the source prints where a
        // real one belongs — is removed from the source side before the
        // comparison. Everything else still has to match token for token.
        var expected = Layout.removePlaceholderTokens(
          Layout.staticTokenSequence(block.sourceStaticText), placeholders);
        if (expected === null) {
          problems.push(id + ': a declared sourcePlaceholder is not in sourceStaticText');
          expected = actual;
        }
      } else {
        problems.push(id + ': sourceStaticText is required for legal-text equivalence QA');
      }

      if (block.overflowStrategy === 'expand-layout') {
        validateExpansion(template, block, id, pages, problems);
      } else if (block.expansion) {
        problems.push(id + ': expansion requires overflowStrategy "expand-layout"');
      }
    });

    (template.fields || []).forEach(function (field) {
      if (isFlowReference(field) && !referenced[field.id]) {
        problems.push(field.id + ': flow-reference is not consumed by a Word-flow block');
      }
    });
  }
  Renderer.validateWordFlowBlocks = validateWordFlowBlocks;

  // Validate one template definition against the loaded PDF. Returns an array
  // of human-readable problems; empty means the map is usable.
  function validateTemplate(template, pages, payload) {
  // A reviewed source placeholder: printed sample content that the CRM value
  // replaces. Underscored blanks need no declaration — the tokenizer already
  // treats them as geometry — but a sample made of ordinary letters and digits,
  // such as the account-opening notice's «Код INV0000X», is indistinguishable
  // from legal wording and must be named here to be droppable.
  //
  // Every one of these has to be approved, has to say which field takes its
  // place, and that field has to be a reference this very block resolves. A
  // placeholder can therefore never remove wording that no value replaces.
  function validateSourcePlaceholders(block, id, blockRefs, problems) {
    var declared = block.sourcePlaceholders;
    if (declared == null) return null;
    if (!Array.isArray(declared) || !declared.length) {
      problems.push(id + ': sourcePlaceholders must be a non-empty array when present');
      return null;
    }
    var usable = [];
    declared.forEach(function (entry, index) {
      var where = id + '.sourcePlaceholders[' + index + ']';
      if (!entry || typeof entry !== 'object') {
        problems.push(where + ': must be an object');
        return;
      }
      if (!entry.text || !String(entry.text).trim()) {
        problems.push(where + ': text is required — the printed sample it drops');
        return;
      }
      if (entry.reviewStatus !== 'approved') {
        problems.push(where + ': printed wording may only be dropped once approved');
        return;
      }
      if (!entry.fieldId) {
        problems.push(where + ': fieldId is required — the value that replaces it');
        return;
      }
      if (!blockRefs[entry.fieldId]) {
        problems.push(where + ': field "' + entry.fieldId +
          '" is not referenced by this block, so nothing replaces the placeholder');
        return;
      }
      usable.push(entry);
    });
    return usable.length ? usable : null;
  }
  Renderer.validateSourcePlaceholders = validateSourcePlaceholders;

    var problems = [];
    var seen = {};
    var fields = template.fields || [];

    if (!fields.length) problems.push('template has no field definitions');

    validatePageLayout(template, pages, problems);
    validateWordFlowBlocks(template, pages, problems);

    fields.forEach(function (f, i) {
      var id = f.id || ('#' + i);

      if (seen[id]) problems.push('duplicate field id "' + id + '"');
      seen[id] = true;

      var type = f.type || 'text';
      if (!TEXT_TYPES[type] && type !== 'check') {
        problems.push(id + ': unsupported field type "' + type + '"');
        return;
      }

      if (typeof f.page !== 'number' || f.page < 0 || f.page >= pages.length) {
        problems.push(id + ': invalid page index ' + f.page +
          ' (template has ' + pages.length + ' page(s))');
        return;
      }

      var page = pages[f.page];
      var size = page.getSize();

      if (typeof f.left !== 'number' || typeof f.baselineTop !== 'number') {
        problems.push(id + ': left/baselineTop must be numbers');
        return;
      }
      if (f.left < 0 || f.left > size.width) {
        problems.push(id + ': left ' + f.left + ' outside page width ' + size.width);
      }
      if (f.baselineTop < 0 || f.baselineTop > size.height) {
        problems.push(id + ': baselineTop ' + f.baselineTop +
          ' outside page height ' + size.height);
      }

      if (TEXT_TYPES[type]) {
        if (typeof f.width !== 'number' || f.width <= 0) {
          problems.push(id + ': width must be a positive number');
        } else if (f.left + f.width > size.width + 0.5) {
          problems.push(id + ': field extends past the right page edge');
        }
        if (f.minFontSize != null && f.fontSize != null && f.minFontSize > f.fontSize) {
          problems.push(id + ': minFontSize is larger than fontSize');
        }
        // The readability floor is a hard production rule: a map may not
        // configure dynamic text that could be drawn below it. Static legal
        // text already printed in the base PDF is untouched and unaffected.
        if (f.minFontSize != null && f.minFontSize < MIN_DYNAMIC_FONT_SIZE) {
          problems.push(id + ': minFontSize ' + f.minFontSize +
            ' is below the readable minimum ' + MIN_DYNAMIC_FONT_SIZE + 'pt');
        }
        if (f.fontSize != null && f.fontSize < MIN_DYNAMIC_FONT_SIZE) {
          problems.push(id + ': fontSize ' + f.fontSize +
            ' is below the readable minimum ' + MIN_DYNAMIC_FONT_SIZE + 'pt');
        }
        if (type === 'text' && !f.source) {
          problems.push(id + ': text field has no source path');
        }
        if (type === 'static' && f.text == null) {
          problems.push(id + ': static field has no text');
        }
        if (f.tokenBreak != null && !TOKEN_BREAK_MODES[f.tokenBreak]) {
          problems.push(id + ': unsupported tokenBreak "' + f.tokenBreak +
            '" (expected "none" or "anywhere")');
        }
        validateRegions(template, f, id, pages, problems);
      }

      if (type === 'check' && !f.source) {
        problems.push(id + ': checkbox has no source path');
      }

      if (f.font && !(template.fonts || {})[f.font] && !DEFAULT_FONT_KEYS[f.font]) {
        problems.push(id + ': unknown font "' + f.font + '"');
      }
    });

    // A source path that resolves nowhere is a mapping bug worth surfacing,
    // but only when a payload is available to check against.
    if (payload) {
      fields.forEach(function (f) {
        if (!f.source || f.optional) return;
        // A field switched off by `showWhen` is never drawn, so its source does
        // not have to resolve. Documents that carry two variants of a form in
        // one file — the power of attorney holds a legal-entity version and an
        // individual one — legitimately reference values that exist for only
        // one kind of subject.
        if (!isVisible(f, payload)) return;
        if (resolve(f.source, payload) === undefined) {
          problems.push((f.id || f.source) + ': source "' + f.source +
            '" is not present in the payload');
        }
      });
    }

    return problems;
  }
  Renderer.validateTemplate = validateTemplate;

  var DEFAULT_FONT_KEYS = { legalSerif: 1, legalSerifBold: 1, legalSerifItalic: 1 };

  // ── Font loading ───────────────────────────────────────────────────────────

  var fontBytesCache = {};

  function loadFontBytes(url) {
    if (!fontBytesCache[url]) {
      var absolute;
      try {
        absolute = new URL(url, global.location.href).href;
      } catch (e) {
        return Promise.reject(new Error('Не удалось определить URL шрифта: ' + url));
      }
      fontBytesCache[url] = fetch(absolute).then(function (r) {
        if (!r.ok) throw new Error('Шрифт ' + url + ' — HTTP ' + r.status);
        return r.arrayBuffer();
      });
    }
    return fontBytesCache[url];
  }

  // Embed every font the template needs. Subsetting keeps only the glyphs the
  // document actually uses, so the generated file stays small.
  function embedFonts(pdfDoc, fontSpec) {
    var keys = Object.keys(fontSpec);
    return Promise.all(keys.map(function (key) {
      return loadFontBytes(fontSpec[key]).then(function (bytes) {
        // fontkit may mutate its input while building the first subset. Keep
        // the cached download immutable and give every render a fresh buffer;
        // otherwise the first PDF in a browser session differs from all later
        // PDFs despite identical template, map and payload.
        return pdfDoc.embedFont(bytes.slice(0), { subset: true });
      });
    })).then(function (embedded) {
      var map = {};
      keys.forEach(function (key, i) { map[key] = embedded[i]; });
      return map;
    });
  }

  // ── Page-section expansion ─────────────────────────────────────────────────
  //
  // A permitted expandable value that will not fit its mapped regions asks the
  // page for extra rows. How many is decided by the layout engine itself, not
  // by an estimate: the layout is retried with one more inserted row at a time
  // until it fits, which is exact and cannot disagree with what is drawn.
  //
  // Only a value that is actually going to be printed may ask. A field switched
  // off by `showWhen`, an empty optional value and a missing required value are
  // not layout problems and must cost the page nothing — the power of attorney
  // carries a legal-entity variant and an individual one in the same four-page
  // file, and a document must never pay for the variant it is not printing.
  function expansionDemands(template, payload, fonts, wordFlowPlan) {
    var demands = [];

    (template.fields || []).forEach(function (field) {
      if ((field.type || 'text') === 'check') return;
      if (isFlowReference(field)) return;
      var spec = Expander.expansionOf(field);
      if (!spec) return;
      var font = fonts[field.font || 'legalSerif'];
      if (!font) return;

      var base = Layout.regionsFor(field);
      var asPrinted = layoutField(field, payload, font, { regions: base });
      if (asPrinted.drawn || asPrinted.reason !== 'overflow') {
        // Fits as printed, or is not part of this document at all.
        demands.push({
          field: field,
          rows: 0,
          inactive: !asPrinted.drawn,
          reason: asPrinted.drawn ? 'fits' : asPrinted.reason
        });
        return;
      }

      var maximum = spec.maxExtraRows == null ? 1 : Number(spec.maxExtraRows);
      for (var rows = 1; rows <= maximum; rows += 1) {
        var candidate = base.concat(insertedRegions(field, rows, 0));
        if (layoutField(field, payload, font, { regions: candidate }).drawn) {
          demands.push({ field: field, rows: rows });
          return;
        }
      }
      // Even the maximum approved number of rows is not enough; the field-level
      // overflow diagnostics will explain that.
      demands.push({ field: field, rows: maximum, insufficient: true });
    });

    // A Word-flow block expands as one paragraph, never as one row per field.
    // Its layout has already been decided with the locked source font; the page
    // planner receives only the number of complete source-pitch lines needed.
    (template.wordFlowBlocks || []).forEach(function (block) {
      var spec = Expander.expansionOf(block);
      if (!spec) return;
      var result = wordFlowPlan && wordFlowPlan.byBlock[block.id];
      if (!result || !result.drawn) {
        demands.push({
          field: block, rows: 0, wordFlow: true, inactive: true,
          reason: result ? result.reason : 'absent'
        });
        return;
      }
      demands.push({
        field: block,
        rows: result.layout.additionalLines,
        wordFlow: true
      });
    });

    return demands;
  }
  Renderer.expansionDemands = expansionDemands;

  function insertedRegions(field, rows, priorShift) {
    var out = [];
    for (var index = 0; index < rows; index += 1) {
      out.push(Layout.normalizeRegion(
        Expander.rowRegion(field, index, priorShift), field, index + 1));
    }
    return out;
  }

  // Effective regions for every field once the page plans are known: inserted
  // rows are appended to their own field, and everything that sits below an
  // anchor moves down by the plan's cumulative delta. Static page content is
  // moved by the SAME plan, so the two can never drift apart.
  function makeRegionsFor(plans, rowsByField) {
    return function (field) {
      var regions = Layout.regionsFor(field).map(function (region) {
        var plan = plans[region.page];
        var delta = Expander.shiftAt(plan, region.baselineTop);
        if (!delta) return region;
        var moved = {};
        Object.keys(region).forEach(function (key) { moved[key] = region[key]; });
        moved.baselineTop = region.baselineTop + delta;
        if (moved.underlineTop != null) moved.underlineTop = region.underlineTop + delta;
        return moved;
      });
      var inserted = rowsByField[field.id];
      return inserted && inserted.length ? regions.concat(inserted) : regions;
    };
  }

  // Where a checkbox — or any bare template coordinate — lands after expansion.
  function shiftedTopFor(plans, page, top) {
    return top + Expander.shiftAt(plans[page], top);
  }
  Renderer.shiftedTopFor = shiftedTopFor;

  // ── Preflight ──────────────────────────────────────────────────────────────

  // Lay out every text field of a template with the real embedded fonts.
  // Returns the plan the renderer will draw plus a complete list of values that
  // cannot be printed, each with enough detail for an actionable message.
  function plan(template, payload, fonts, options) {
    var opts = options || {};
    var byField = {};
    var overflows = [];
    var summary = { total: 0, atPreferred: 0, wrapped: 0, flowed: 0, shrunk: 0,
      fallback: 0, expanded: 0, wordFlowBlocks: 0 };
    var wordFlow = opts.wordFlowPlan || planWordFlowBlocks(template, payload, fonts);

    (template.fields || []).forEach(function (field) {
      if ((field.type || 'text') === 'check') return;
      if (isFlowReference(field)) {
        byField[field.id] = {
          drawn: false,
          reason: 'flow-reference',
          flowBlockId: field.flowBlockId || null
        };
        return;
      }
      var font = fonts[field.font || 'legalSerif'];
      if (!font) {
        overflows.push({
          documentId: template.id,
          documentTitle: template.title || template.id,
          fieldId: field.id,
          label: field.label || field.id,
          reason: 'font',
          message: 'шрифт "' + field.font + '" не загружен'
        });
        return;
      }
      var result = layoutField(field, payload, font, {
        regions: opts.regionsFor ? opts.regionsFor(field) : null
      });
      byField[field.id] = result;

      if (result.reason === 'overflow') {
        var diagnostics = result.diagnostics;
        overflows.push({
          documentId: template.id,
          documentTitle: template.title || template.id,
          fieldId: diagnostics.fieldId,
          label: diagnostics.label,
          source: diagnostics.source,
          value: diagnostics.value,
          valueLength: diagnostics.valueLength,
          minFontSize: diagnostics.minFontSize,
          preferredFontSize: diagnostics.preferredFontSize,
          lineCapacity: diagnostics.lineCapacity,
          regionCount: diagnostics.regionCount,
          fallbacksTried: diagnostics.fallbacksTried,
          allowPrintOverride: diagnostics.allowPrintOverride,
          editable: diagnostics.editable,
          reason: diagnostics.reason,
          message: overflowMessage(diagnostics)
        });
      } else if (result.reason === 'missing') {
        overflows.push({
          documentId: template.id,
          documentTitle: template.title || template.id,
          fieldId: field.id,
          label: field.label || field.id,
          source: field.source || null,
          reason: 'missing',
          editable: !!field.source && field.source.indexOf('extra.') === 0,
          message: 'обязательное значение отсутствует'
        });
      } else if (result.drawn) {
        summary.total += 1;
        if (result.usedFallback) summary.fallback += 1;
        if (result.layout.shrunk) summary.shrunk += 1;
        else summary.atPreferred += 1;
        if (result.layout.strategy === 'flow') summary.flowed += 1;
        else if (result.layout.strategy === 'wrap') summary.wrapped += 1;
      }
    });

    wordFlow.overflows.forEach(function (entry) { overflows.push(entry); });
    Object.keys(wordFlow.byBlock).forEach(function (id) {
      var result = wordFlow.byBlock[id];
      if (!result.drawn) return;
      summary.wordFlowBlocks += 1;
      summary.total += Object.keys(result.values || {}).length;
      summary.atPreferred += Object.keys(result.values || {}).length;
      if (result.layout.additionalLines) summary.expanded += 1;
    });

    return {
      byField: byField,
      byBlock: wordFlow.byBlock,
      overflows: overflows,
      summary: summary
    };
  }
  Renderer.plan = plan;

  // ── Drawing ────────────────────────────────────────────────────────────────

  // Draw one field from a layout the engine has already decided. The renderer
  // performs no wrapping, no shrinking and no region selection of its own — it
  // only turns region assignments into page content.
  function drawTextField(ctx, field, planned) {
    var plan = planned || layoutField(field, ctx.payload, ctx.fonts[field.font || 'legalSerif']);
    if (!plan.drawn) {
      if (plan.reason === 'missing') {
        throw FieldError(ctx.documentId, field.id, 'обязательное значение отсутствует');
      }
      return;                                   // hidden / empty optional value
    }

    var font = ctx.fonts[field.font || 'legalSerif'];
    var fit = plan.layout;
    var regions = plan.regions;
    var drawnRegions = {};

    fit.lines.forEach(function (line) {
      var region = regions[line.regionIndex];
      var page = ctx.pages[region.page];
      var pageHeight = page.getSize().height;
      var lineHeight = Layout.lineHeightAt(region, fit.size);
      var indent = line.lineIndex === 0 ? (region.firstLineIndent || 0) : 0;
      var boxWidth = region.width - indent;
      var lineWidth = Layout.widthOf(font, line.text, fit.size);
      var dx = Layout.alignOffset(region.align, lineWidth, boxWidth);
      var baseY = pageHeight - region.baselineTop + region.baselineShift -
        line.lineIndex * lineHeight;

      page.drawText(line.text, {
        x: region.left + indent + dx,
        y: baseY,
        size: fit.size,
        font: font,
        color: ctx.color
      });

      if (!drawnRegions[line.regionIndex]) drawnRegions[line.regionIndex] = [];
      drawnRegions[line.regionIndex].push(line.lineIndex);
    });

    // A reviewed continuation rule — or an inserted table row's borders — is
    // drawn only where text actually landed, so a short value never adds a
    // stray line to the form.
    Object.keys(drawnRegions).forEach(function (key) {
      var region = regions[Number(key)];
      if (region.drawUnderline) drawUnderline(ctx, region, drawnRegions[key], fit.size);
      if (region.tableRow) drawTableRow(ctx, region);
    });
  }

  // Draw exactly the fragments assigned by Layout.layoutRuns.  No width
  // measurement or line-break decision is repeated here.
  function drawWordFlowBlock(ctx, block, planned) {
    if (!planned || !planned.drawn) return;
    var page = ctx.pages[block.page];
    var pageHeight = page.getSize().height;

    function sourceShiftAt(top) {
      var plan = ctx.plans && ctx.plans[block.page];
      if (!plan) return 0;
      return (plan.shifts || []).reduce(function (total, shift) {
        // This block consumes its own additional lines; applying that same
        // shift to those lines would double-expand it. Compaction and earlier
        // anchors still move the replacement exactly as they moved the source.
        if (shift.fieldId === block.id) return total;
        if (top < shift.fromTop - 1e-6 || top > shift.toTop + 1e-6) return total;
        return total + Number(shift.delta);
      }, 0);
    }

    planned.layout.lines.forEach(function (line) {
      var baselineY = pageHeight - (line.baselineTop + sourceShiftAt(line.baselineTop));
      line.runs.forEach(function (run) {
        if (run.type !== 'spacer' && run.text) {
          page.drawText(run.text, {
            x: run.x,
            y: baselineY,
            size: run.fontSize,
            font: ctx.fonts[run.font || block.font || 'legalSerif'],
            color: ctx.color
          });
        }
        var decoration = run.decoration;
        if (!decoration || !decoration.underline || !(run.width > 0)) return;
        var offset = decoration.offset != null
          ? Number(decoration.offset) : DEFAULT_UNDERLINE_OFFSET;
        var thickness = decoration.thickness != null
          ? Number(decoration.thickness) : DEFAULT_UNDERLINE_THICKNESS;
        var color = decoration.color
          ? global.PDFLib.rgb(decoration.color[0], decoration.color[1], decoration.color[2])
          : ctx.color;
        page.drawLine({
          start: { x: run.x, y: baselineY - offset },
          end: { x: run.x + run.width, y: baselineY - offset },
          thickness: thickness,
          color: color
        });
      });
    });
  }
  Renderer.drawWordFlowBlock = drawWordFlowBlock;

  function insertReviewedWordFlowBlocks(ctx, template, decided, reviewedPages) {
    (reviewedPages || []).forEach(function (reviewedPage) {
      reviewedPage.blocks.forEach(function (block) {
        var planned = decided.planned.byBlock[block.id];
        if (!planned || !planned.drawn) {
          throw FieldError(ctx.documentId, block.id,
            'active reviewed Word-flow block has no drawable layout');
        }
        var operators = Expander.capturePageOperators(
          ctx.pdfDoc, ctx.pages[block.page], function () {
            drawWordFlowBlock(ctx, block, planned);
          }
        );
        Expander.replaceReviewedRangeContent(
          ctx.pdfDoc, ctx.pages[block.page], block.id, operators);
      });
    });
  }
  Renderer.insertReviewedWordFlowBlocks = insertReviewedWordFlowBlocks;

  // A blank table row opened by page expansion: real vector borders matching
  // the table it was inserted into, never underscore glyphs.
  function drawTableRow(ctx, region) {
    var spec = region.tableRow;
    var page = ctx.pages[region.page];
    var pageHeight = page.getSize().height;
    var thickness = Number(spec.thickness || 0.36);
    var top = pageHeight - Number(spec.top);
    var bottom = pageHeight - (Number(spec.top) + Number(spec.height));
    var left = Number(spec.left);
    var right = left + Number(spec.width);
    var borders = spec.borders || {};

    function line(x1, y1, x2, y2) {
      page.drawLine({
        start: { x: x1, y: y1 }, end: { x: x2, y: y2 },
        thickness: thickness, color: ctx.color
      });
    }

    // A printed table often breaks its horizontal rules at the column
    // boundaries; `bottomSegments` reproduces that exactly rather than laying
    // one long line across gaps the form leaves open.
    if (spec.bottomSegments && spec.bottomSegments.length) {
      spec.bottomSegments.forEach(function (segment) {
        line(Number(segment[0]), bottom, Number(segment[1]), bottom);
      });
    } else if (borders.bottom !== false) {
      line(left, bottom, right, bottom);
    }
    if (spec.topSegments && spec.topSegments.length) {
      spec.topSegments.forEach(function (segment) {
        line(Number(segment[0]), top, Number(segment[1]), top);
      });
    } else if (borders.top) {
      line(left, top, right, top);
    }
    if (borders.left !== false) line(left, top, left, bottom);
    if (borders.right !== false) line(right, top, right, bottom);
    (spec.columns || []).forEach(function (x) { line(Number(x), top, Number(x), bottom); });
  }

  // A Word-like continuation rule: ordinary PDF vector content, drawn with the
  // same weight as the printed underlines around it, sitting just below the
  // text baseline so the value reads as typed on the line.
  function drawUnderline(ctx, region, lineIndexes, size) {
    var page = ctx.pages[region.page];
    var pageHeight = page.getSize().height;
    var lineHeight = Layout.lineHeightAt(region, size);
    var thickness = region.underlineThickness != null
      ? Number(region.underlineThickness) : DEFAULT_UNDERLINE_THICKNESS;
    var offset = region.underlineOffset != null
      ? Number(region.underlineOffset) : DEFAULT_UNDERLINE_OFFSET;
    var left = region.underlineLeft != null ? Number(region.underlineLeft) : region.left;
    var width = region.underlineWidth != null ? Number(region.underlineWidth) : region.width;
    var color = region.underlineColor
      ? global.PDFLib.rgb(region.underlineColor[0], region.underlineColor[1], region.underlineColor[2])
      : ctx.color;

    lineIndexes.forEach(function (lineIndex) {
      // An explicit underlineTop pins the rule; otherwise it follows the
      // baseline of the line it belongs to.
      var top = region.underlineTop != null
        ? Number(region.underlineTop) + lineIndex * lineHeight
        : region.baselineTop + lineIndex * lineHeight + offset;
      var y = pageHeight - top;
      page.drawLine({
        start: { x: left, y: y },
        end: { x: left + width, y: y },
        thickness: thickness,
        color: color
      });
    });
  }

  function drawCheckField(ctx, field) {
    var raw = resolve(field.source, ctx.payload);

    // `equals` turns one normalised business value into one or more marks and
    // gives mutually exclusive groups for free: several definitions share a
    // source and each matches a different value.
    var on;
    if (Object.prototype.hasOwnProperty.call(field, 'equals')) {
      on = Array.isArray(field.equals)
        ? field.equals.indexOf(raw) !== -1
        : raw === field.equals;
    } else {
      on = !!raw;
    }
    if (field.invert) on = !on;
    if (!on) return;

    var page = ctx.pages[field.page];
    var pageHeight = page.getSize().height;
    // A mark below an expansion anchor moves with the row it belongs to, by the
    // same plan that moved the printed checkbox underneath it.
    var baselineTop = ctx.plans
      ? shiftedTopFor(ctx.plans, field.page, field.baselineTop)
      : field.baselineTop;
    Checkbox.mark(
      page,
      field.left,
      pageHeight - baselineTop,
      field.glyphSize || 8.5,
      {
        style: field.markStyle || 'check',
        color: ctx.color,
        offsetX: field.offsetX,
        offsetY: field.offsetY,
        boxSize: field.boxSize,
        thickness: field.thickness,
        inset: field.inset
      }
    );
  }


  // ── The one decision pass ──────────────────────────────────────────────────
  //
  // Everything between "here is a payload" and "draw it": which fields need
  // extra rows, what each page's plan is, and where every line of every value
  // lands. The Document Wizard's preflight and the final render call THIS, so
  // a preflight that succeeds cannot be followed by a generation that fails —
  // there is no second implementation to disagree with.
  // `context` is the result of `open()`. It is optional so existing callers and
  // QA harnesses keep working; when it is given, the plan fingerprint also
  // records which template bytes the plan was decided against.
  function decide(template, payload, pages, fonts, context) {
    var wordFlowPlan = planWordFlowBlocks(template, payload, fonts);
    var demands = expansionDemands(template, payload, fonts, wordFlowPlan);
    var plans = {};
    var rowsByField = {};
    var planErrors = [];
    var pageLayout = template.pageLayout || {};
    pages.forEach(function (pdfPage, index) {
      var pagePlan = Expander.planPage(index, demands, pdfPage.getSize().height,
                                       pageLayout[index]);
      plans[index] = pagePlan;
      pagePlan.rows.forEach(function (row) {
        rowsByField[row.fieldId] = (rowsByField[row.fieldId] || []).concat(
          Layout.normalizeRegion(row.region, { flowRegions: [1, 2] }, 1));
      });
      pagePlan.errors.forEach(function (error) { planErrors.push(error); });
    });

    // A source page activates its reviewed flow only after local reserve and
    // compaction are exhausted.  The following page's complete movable body is
    // shifted by the same plan used for its dynamic overlays.
    Object.keys(plans).map(Number).sort(function (a, b) { return a - b; })
      .forEach(function (index) {
        var flow = plans[index].pageFlow;
        if (!flow) return;
        var target = plans[Number(flow.targetPage)];
        target.shifts.unshift({
          kind: 'cross-page-target',
          fromTop: Number(flow.targetShiftFromTop),
          toTop: Number(flow.targetShiftToTop),
          delta: Number(flow.targetShift),
          sourcePage: index
        });
      });

    // ── Does the real page content allow this plan? ─────────────────────────
    //
    // Everything above reasons about declared coordinates. Only the page's own
    // content stream can say whether a shift band actually falls between two
    // complete drawing blocks, and the renderer used to be the first thing to
    // find out — it asked `shiftPageContent`, which threw, long after preflight
    // had told the manager the document was fine.
    //
    // The same analysis now runs here, in the one decision pass both preflight
    // and render share, so an impossible anchor is a plan error like any other.
    var contentFingerprints = {};
    Object.keys(plans).map(Number).sort(function (a, b) { return a - b; })
      .forEach(function (index) {
        var pagePlan = plans[index];
        if (!pages[index]) return;
        var analysis;
        try {
          analysis = Expander.analysePageShift(pages[index], pagePlan.shifts, {});
        } catch (error) {
          planErrors.push({
            fieldId: (pagePlan.shifts[0] || {}).fieldId || 'page[' + index + ']',
            reason: 'content-stream',
            message: String(error && error.message || error)
          });
          return;
        }
        contentFingerprints[index] = {
          blocks: analysis.blocks,
          moved: analysis.moved,
          straddling: analysis.straddling.length
        };
        analysis.straddling.forEach(function (entry) {
          planErrors.push({
            fieldId: entry.band.fieldId || (pagePlan.shifts[0] || {}).fieldId ||
              'page[' + index + ']',
            reason: 'straddle',
            message: Expander.straddleMessage(entry)
          });
        });
      });

    var regionsFor = makeRegionsFor(plans, rowsByField);
    var planned = plan(template, payload, fonts, {
      regionsFor: regionsFor,
      wordFlowPlan: wordFlowPlan
    });

    planErrors.forEach(function (error) {
      var field = (template.fields || []).concat(template.wordFlowBlocks || []).filter(function (item) {
        return item.id === error.fieldId;
      })[0] || {};
      // A field the page could not pay for also fails to lay out, so it would
      // otherwise be reported twice. The page's reason is the specific one and
      // the manager needs exactly one entry per value.
      planned.overflows = planned.overflows.filter(function (entry) {
        return entry.fieldId !== error.fieldId;
      });
      planned.overflows.push({
        documentId: template.id,
        documentTitle: template.title || template.id,
        fieldId: error.fieldId,
        label: field.label || error.fieldId,
        source: field.source || null,
        reason: error.reason,
        editable: !!field.source && field.source.indexOf('extra.') === 0,
        // A straddle is not «the page has no room»: the room exists, the
        // configured insertion point simply falls inside printed content. Say
        // which it is, so the message points at the map and not at the value.
        message: error.reason === 'straddle'
          ? 'точка вставки дополнительной строки пересекает исходный блок PDF: ' +
            error.message
          : 'страница не может быть расширена: ' + error.message
      });
    });

    return {
      demands: demands,
      plans: plans,
      rowsByField: rowsByField,
      planned: planned,
      contentFingerprints: contentFingerprints,
      notes: expansionNotes(template, plans),
      templateSha256: (context && context.templateSha256) || null,
      fingerprint: fingerprintOf(template, plans, planned, contentFingerprints,
                                 context && context.templateSha256)
    };
  }
  Renderer.decide = decide;

  // ── Every declared cut in a template, in one normalized list ───────────────
  //
  // A template can move page content from five different places in the schema,
  // and a validator that only walks `fields[].expansion` silently approves the
  // other four. That is how `accession-application-fl`'s Word-flow anchor came
  // to sit inside a printed block with every gate passing.
  //
  // Anything that validates or previews an insertion point — the QA anchor
  // audit, the Template Builder — reads this, so a new schema location has to
  // be added here once rather than in each of them.
  function expansionAnchors(template) {
    var layout = template.pageLayout || {};
    var out = [];

    function add(entry) {
      if (entry.top == null || entry.delta == null) return;
      var pageLayout = layout[entry.page] || {};
      out.push({
        documentId: template.id,
        origin: entry.origin,
        id: entry.id,
        page: Number(entry.page),
        top: Number(entry.top),
        delta: Number(entry.delta),
        toTop: Number(entry.toTop != null ? entry.toTop : pageLayout.shiftToTop),
        maxExtraRows: entry.maxExtraRows != null ? entry.maxExtraRows : null,
        moveTopLevelPaths: !!entry.moveTopLevelPaths,
        reviewStatus: entry.reviewStatus || null
      });
    }

    function fromExpansion(origin, id, owner, expansion) {
      if (!expansion) return;
      add({
        origin: origin, id: id,
        page: expansion.page != null ? expansion.page : owner.page,
        top: expansion.insertionTop,
        delta: expansion.rowHeight,
        toTop: expansion.shiftToTop,
        maxExtraRows: expansion.maxExtraRows,
        moveTopLevelPaths: expansion.lineStyle === 'table-row',
        reviewStatus: expansion.reviewStatus
      });
    }

    (template.fields || []).forEach(function (field) {
      fromExpansion('field', field.id, field, field.expansion);
    });
    (template.wordFlowBlocks || []).forEach(function (block) {
      fromExpansion('wordFlowBlock', block.id, block, block.expansion);
    });

    Object.keys(layout).forEach(function (key) {
      var page = Number(key);
      var entry = layout[key] || {};
      (entry.compaction || []).forEach(function (zone, index) {
        add({
          origin: 'compaction', id: 'compaction[' + index + ']', page: page,
          top: zone.top, delta: -(zone.originalGap - zone.minGap),
          toTop: entry.shiftToTop, reviewStatus: zone.reviewStatus
        });
      });
      var flow = entry.crossPageFlow;
      if (!flow) return;
      add({
        origin: 'crossPageFlow', id: 'crossPageFlow[source]', page: page,
        top: flow.sourceFromTop, delta: 1, toTop: flow.sourceToTop,
        reviewStatus: flow.reviewStatus
      });
      add({
        origin: 'crossPageFlow', id: 'crossPageFlow[target]',
        page: Number(flow.targetPage),
        top: flow.targetShiftFromTop, delta: flow.targetShift,
        toTop: flow.targetShiftToTop, reviewStatus: flow.reviewStatus
      });
    });

    return out;
  }
  Renderer.expansionAnchors = expansionAnchors;

  // What the manager is told about: rows were added, nothing to decide.
  function expansionNotes(template, plans) {
    var notes = [];
    Object.keys(plans).forEach(function (index) {
      (plans[index].consumption || []).forEach(function (entry) {
        var field = (template.fields || []).filter(function (item) {
          return item.id === entry.fieldId;
        })[0] || {};
        notes.push({
          page: Number(index),
          fieldId: entry.fieldId,
          label: field.label || entry.fieldId,
          rows: entry.rows,
          delta: entry.delta,
          remaining: entry.remaining
        });
      });
    });
    return notes;
  }

  // A deterministic, human-readable summary of the layout that was decided:
  // every page shift, every inserted row, and every line of every value with
  // the size and region it landed in. Identical input gives an identical
  // string, so QA can prove the preflight and the final render agreed.
  function fingerprintOf(template, plans, planned, contentFingerprints,
                         templateSha256) {
    var parts = ['doc=' + template.id];
    if (templateSha256) parts.push('template=' + templateSha256);
    // What the plan was decided *against*: if the page content the geometry
    // was validated on is not the content the renderer later shifts, the two
    // are not the same plan however identical the coordinates look.
    Object.keys(contentFingerprints || {}).map(Number)
      .sort(function (a, b) { return a - b; })
      .forEach(function (index) {
        var entry = contentFingerprints[index];
        parts.push('content p' + index + ' blocks=' + entry.blocks +
          ' moved=' + entry.moved + ' straddling=' + entry.straddling);
      });
    Object.keys(plans).map(Number).sort(function (a, b) { return a - b; })
      .forEach(function (index) {
        var page = plans[index];
        if (!page.shifts.length && !page.errors.length) return;
        parts.push('p' + index +
          ' shift=' + page.shifts.map(function (shift) {
            return (shift.fieldId || shift.kind) + '@' + shift.fromTop +
              ':' + shift.delta;
          }).join(',') +
          ' rows=' + page.rows.map(function (row) {
            return row.fieldId + '@' + row.region.rowTop;
          }).join(',') +
          ' recovered=' + (page.recovered || 0) +
          ' flow=' + (page.pageFlow
            ? page.pageFlow.targetPage + ':' + (page.flowRecovered || 0) : '') +
          ' err=' + page.errors.map(function (e) {
            return e.fieldId + ':' + e.reason;
          }).join(','));
      });
    Object.keys(planned.byField).sort().forEach(function (id) {
      var result = planned.byField[id];
      if (!result.drawn) {
        parts.push(id + '=' + (result.reason || 'skipped'));
        return;
      }
      parts.push(id + '@' + result.layout.size + ' ' +
        result.layout.lines.map(function (line) {
          return line.regionIndex + ':' + line.lineIndex + ':' + line.text;
        }).join('|'));
    });
    Object.keys(planned.byBlock || {}).sort().forEach(function (id) {
      var result = planned.byBlock[id];
      if (!result.drawn) {
        parts.push('word:' + id + '=' + (result.reason || 'skipped'));
        return;
      }
      parts.push('word:' + id + '@' + result.layout.size + ' locked=' +
        result.layout.fontSizeLocked + ' add=' + result.layout.additionalLines + ' ' +
        result.layout.lines.map(function (line) {
          return line.paragraphIndex + ':' + line.lineInParagraph + ':' + line.text;
        }).join('|'));
    });
    return parts.join('\n');
  }
  Renderer.fingerprintOf = fingerprintOf;

  // ── Public API ─────────────────────────────────────────────────────────────

  // Load the committed template, check the map against it and embed the fonts.
  //
  // Both `render` and `preflight` start here, so the document a preflight
  // reasons about is the one that would be generated, measured with the same
  // embedded faces.
  // SHA-256 of the authoritative bytes, hex. Falls back to a deterministic
  // FNV-1a digest where WebCrypto is unavailable (a page opened over file://
  // is not a secure context); the fingerprint only has to be stable and to
  // differ when the bytes differ.
  function templateDigest(bytes) {
    var subtle = global.crypto && global.crypto.subtle;
    if (!subtle || typeof subtle.digest !== 'function') {
      return Promise.resolve('fnv1a:' + fnv1a(bytes));
    }
    return subtle.digest('SHA-256', bytes).then(function (buffer) {
      var view = new Uint8Array(buffer);
      var hex = '';
      for (var i = 0; i < view.length; i += 1) {
        hex += (view[i] < 16 ? '0' : '') + view[i].toString(16);
      }
      return 'sha256:' + hex;
    }, function () {
      return 'fnv1a:' + fnv1a(bytes);
    });
  }

  function fnv1a(bytes) {
    var hash = 0x811c9dc5;
    for (var i = 0; i < bytes.length; i += 1) {
      hash ^= bytes[i];
      hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) +
        (hash << 8) + (hash << 24))) >>> 0;
    }
    return ('00000000' + hash.toString(16)).slice(-8);
  }
  Renderer.templateDigest = templateDigest;

  function open(template, options) {
    var opts = options || {};
    var PDFLib = global.PDFLib;
    var templateBytes = null;
    if (!PDFLib) return Promise.reject(new Error('PDF-модуль (pdf-lib) не загружен.'));

    var templateUrl;
    try {
      templateUrl = new URL(template.templateUrl, global.location.href).href;
    } catch (e) {
      return Promise.reject(new Error('Не удалось определить URL PDF-шаблона "' +
        template.id + '".'));
    }

    return fetch(templateUrl)
      .then(function (res) {
        if (!res.ok) {
          throw new Error('PDF-шаблон "' + template.id + '" не найден (HTTP ' +
            res.status + ').');
        }
        return res.arrayBuffer();
      })
      .then(function (buf) {
        // Keep an immutable copy of the fetched authoritative file. pdf-lib's
        // parsed document is not a proof of which source bytes produced it;
        // reviewed operator ranges validate against this exact fetch instead.
        templateBytes = new Uint8Array(buf.slice(0));
        // Loading must not stamp the wall-clock time into /ModDate. Besides
        // changing metadata the manager never asked us to change, the default
        // makes two otherwise identical renders differ when they straddle a
        // clock-second boundary. Preserve the authoritative metadata so the
        // same template, map and payload produce byte-identical output.
        return PDFLib.PDFDocument.load(buf, {
          ignoreEncryption: true,
          updateMetadata: false
        });
      })
      .then(function (pdfDoc) {
        if (global.fontkit) {
          pdfDoc.registerFontkit(global.fontkit);
        } else {
          throw new Error('fontkit не загружен — кириллица не может быть встроена.');
        }

        var pages = pdfDoc.getPages();

        if (template.expectedPages != null && pages.length !== template.expectedPages) {
          throw new Error('PDF-шаблон "' + template.id + '": ожидалось ' +
            template.expectedPages + ' стр., в файле ' + pages.length + '.');
        }

        var problems = validateTemplate(template, pages,
          opts.validatePayload ? opts.payload : null);
        if (problems.length) {
          console.error('Document template "' + template.id + '" configuration problems:',
            problems);
          throw new Error('Ошибка конфигурации документа "' + template.id + '": ' +
            problems[0] + (problems.length > 1 ? ' (и ещё ' + (problems.length - 1) + ')' : ''));
        }

        return embedFonts(pdfDoc, template.fonts || {}).then(function (fonts) {
          // The identity of the bytes the plan is about to be decided against.
          // Preflight and render each fetch the file themselves; carrying the
          // digest into the plan fingerprint is what proves the document the
          // manager was promised is the document that was drawn.
          return templateDigest(templateBytes).then(function (digest) {
            return {
              pdfDoc: pdfDoc,
              pages: pages,
              fonts: fonts,
              templateBytes: templateBytes,
              templateSha256: digest
            };
          });
        });
      });
  }
  Renderer.open = open;

  // Decide the layout for a payload without drawing anything.
  //
  // The wizard's preflight and QA use this; it loads the same file, embeds the
  // same fonts and runs the same decision pass as `render`, so a preflight that
  // succeeds cannot be followed by a generation that fails for the same
  // payload. `fingerprint` is a deterministic summary of the layout decided,
  // which is what QA compares against the one the render actually drew.
  function preflight(template, payload, options) {
    var opts = options || {};
    return open(template, {
      validatePayload: opts.validatePayload, payload: payload
    }).then(function (context) {
      var decided = decide(template, payload, context.pages, context.fonts,
                           context);
      return inspectActiveReviewedRanges(context, template, payload)
        .then(function (reviewed) {
          return {
            ok: !decided.planned.overflows.length,
            fingerprint: decided.fingerprint,
            templateSha256: decided.templateSha256,
            contentFingerprints: decided.contentFingerprints,
            overflows: decided.planned.overflows,
            expansion: decided.notes,
            summary: decided.planned.summary,
            reviewedRanges: reviewed.map(function (entry) {
              return { page: entry.page, inspection: entry.inspection };
            })
          };
        });
    });
  }
  Renderer.preflight = preflight;

  // Render a template with a payload and resolve to a PDF Blob.
  //
  // template: {
  //   id, templateUrl, expectedPages, fonts: { key: url }, fields: [...]
  // }
  function render(template, payload, options) {
    var opts = options || {};
    var PDFLib = global.PDFLib;
    if (!PDFLib) return Promise.reject(new Error('PDF-модуль (pdf-lib) не загружен.'));

    return open(template, {
      validatePayload: opts.validatePayload, payload: payload
    }).then(function (context) {
      var pdfDoc = context.pdfDoc;
      var pages = context.pages;
      var ctx = {
        documentId: template.id,
        pdfDoc: pdfDoc,
        pages: pages,
        fonts: context.fonts,
        payload: payload,
        // Black unless the source document intentionally uses another colour.
        color: opts.color || PDFLib.rgb(0, 0, 0)
      };

      // ── Preflight ──────────────────────────────────────────────────────────
      // One decision pass, shared with Renderer.preflight: which fields need
      // extra rows, what each page's plan is, and where every line of every
      // value lands. Nothing is drawn and no Blob exists until the whole
      // document is known to be printable, so a failure reports every problem
      // at once instead of dying on the first one.
      var decided = decide(template, payload, pages, context.fonts, context);
      var plans = decided.plans;
      if (typeof opts.onPlan === 'function') opts.onPlan(decided);

      if (decided.planned.overflows.length) {
        throw OverflowError(template.id, template.title || template.id,
          decided.planned.overflows);
      }

      // Only now that the document is known to be printable is page content
      // mutated. Exact reviewed ranges are suppressed first, while their
      // original ordinals and template proof still apply. Static source shifts
      // then operate on the remaining original blocks. Finally the high-level
      // styled-run drawing is captured and inserted at each marker rather than
      // being left as a duplicate appended content stream.
      return suppressActiveReviewedRanges(context, template, payload)
        .then(function (reviewedPages) {
          if (typeof opts.onReviewedRanges === 'function') {
            opts.onReviewedRanges(reviewedPages.map(function (entry) {
              return { page: entry.page, suppression: entry.suppression };
            }));
          }

          var transfers = [];
          Object.keys(plans).map(Number).sort(function (a, b) { return a - b; })
            .forEach(function (index) {
              var flow = plans[index].pageFlow;
              if (!flow) return;
              transfers.push({
                sourcePage: pages[index],
                targetPage: pages[Number(flow.targetPage)],
                flow: flow,
                content: Expander.takePageContent(pdfDoc, pages[index], flow)
              });
            });
          pages.forEach(function (pdfPage, index) {
            if (!plans[index].shifts.length) return;
            Expander.shiftPageContent(pdfDoc, pdfPage, plans[index].shifts);
          });
          transfers.forEach(function (transfer) {
            Expander.placePageContent(pdfDoc, transfer.sourcePage, transfer.targetPage,
                                      transfer.flow, transfer.content);
          });

          ctx.plans = plans;
          insertReviewedWordFlowBlocks(ctx, template, decided, reviewedPages);

          // What the manager is told about: rows were added, nothing to decide.
          if (typeof opts.onExpansion === 'function' && decided.notes.length) {
            opts.onExpansion(decided.notes);
          }

          (template.fields || []).forEach(function (field) {
            if ((field.type || 'text') === 'check') drawCheckField(ctx, field);
            else drawTextField(ctx, field, decided.planned.byField[field.id]);
          });

          // No AcroForm is created, so nothing needs flattening: the values are
          // already ordinary page content.
          return pdfDoc.save().then(function (bytes) {
            return new Blob([bytes], { type: 'application/pdf' });
          });
        });
    });
  }
  Renderer.render = render;

  ns.overlayRenderer = Renderer;

}(typeof window !== 'undefined' ? window : this));
