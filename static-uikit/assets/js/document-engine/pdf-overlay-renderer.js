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

    var regions = Layout.regionsFor(field);
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

  // Validate every region a text field draws into: the implicit one built from
  // the field's own geometry, plus each declared continuation region.
  function validateRegions(field, id, pages, problems) {
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
    if (field.overflowStrategy && ['flow', 'shrink'].indexOf(field.overflowStrategy) === -1) {
      problems.push(id + ': unknown overflowStrategy "' + field.overflowStrategy + '"');
    }
    if (field.overflowStrategy === 'flow' && !declared) {
      problems.push(id + ': overflowStrategy "flow" needs flowRegions');
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

  // Validate one template definition against the loaded PDF. Returns an array
  // of human-readable problems; empty means the map is usable.
  function validateTemplate(template, pages, payload) {
    var problems = [];
    var seen = {};
    var fields = template.fields || [];

    if (!fields.length) problems.push('template has no field definitions');

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
        validateRegions(f, id, pages, problems);
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
        return pdfDoc.embedFont(bytes, { subset: true });
      });
    })).then(function (embedded) {
      var map = {};
      keys.forEach(function (key, i) { map[key] = embedded[i]; });
      return map;
    });
  }

  // ── Preflight ──────────────────────────────────────────────────────────────

  // Lay out every text field of a template with the real embedded fonts.
  // Returns the plan the renderer will draw plus a complete list of values that
  // cannot be printed, each with enough detail for an actionable message.
  function plan(template, payload, fonts) {
    var byField = {};
    var overflows = [];
    var summary = { total: 0, atPreferred: 0, wrapped: 0, flowed: 0, shrunk: 0, fallback: 0 };

    (template.fields || []).forEach(function (field) {
      if ((field.type || 'text') === 'check') return;
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
      var result = layoutField(field, payload, font);
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

    return { byField: byField, overflows: overflows, summary: summary };
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

    // A reviewed continuation rule is drawn only under the lines that actually
    // received text, so a short value never adds a stray line to the form.
    Object.keys(drawnRegions).forEach(function (key) {
      var region = regions[Number(key)];
      if (!region.drawUnderline) return;
      drawUnderline(ctx, region, drawnRegions[key], fit.size);
    });
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
    Checkbox.mark(
      page,
      field.left,
      pageHeight - field.baselineTop,
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

  // ── Public API ─────────────────────────────────────────────────────────────

  // Render a template with a payload and resolve to a PDF Blob.
  //
  // template: {
  //   id, templateUrl, expectedPages, fonts: { key: url }, fields: [...]
  // }
  function render(template, payload, options) {
    var opts = options || {};
    var PDFLib = global.PDFLib;
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
        return PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
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

        var problems = validateTemplate(template, pages, opts.validatePayload ? payload : null);
        if (problems.length) {
          console.error('Document template "' + template.id + '" configuration problems:',
            problems);
          throw new Error('Ошибка конфигурации документа "' + template.id + '": ' +
            problems[0] + (problems.length > 1 ? ' (и ещё ' + (problems.length - 1) + ')' : ''));
        }

        return embedFonts(pdfDoc, template.fonts || {}).then(function (fonts) {
          var ctx = {
            documentId: template.id,
            pages: pages,
            fonts: fonts,
            payload: payload,
            // Black unless the source document intentionally uses another colour.
            color: opts.color || PDFLib.rgb(0, 0, 0)
          };

          // ── Preflight ──────────────────────────────────────────────────────
          // Lay every visible field out first, using the fonts actually
          // embedded in this document. Nothing is drawn and no Blob exists
          // until the whole document is known to be printable, so a failure
          // reports every problem at once instead of dying on the first one.
          var planned = plan(template, payload, fonts);
          if (planned.overflows.length) {
            throw OverflowError(template.id, template.title || template.id,
              planned.overflows);
          }

          template.fields.forEach(function (field) {
            if ((field.type || 'text') === 'check') drawCheckField(ctx, field);
            else drawTextField(ctx, field, planned.byField[field.id]);
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
