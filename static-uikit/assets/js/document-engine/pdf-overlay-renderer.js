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

(function (global) {
  'use strict';

  var ns = global.CRMDocumentEngine = global.CRMDocumentEngine || {};
  var Layout = ns.textLayout;
  var Checkbox = ns.checkbox;

  var Renderer = {};

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
      var p = parseRuOrIso(v);
      return p ? MONTHS_RU[parseInt(p.m, 10) - 1] : '';
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

  // ── Configuration validation ───────────────────────────────────────────────

  var TEXT_TYPES = { text: 1, static: 1 };

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
        if (type === 'text' && !f.source) {
          problems.push(id + ': text field has no source path');
        }
        if (type === 'static' && f.text == null) {
          problems.push(id + ': static field has no text');
        }
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

  // ── Drawing ────────────────────────────────────────────────────────────────

  function drawTextField(ctx, field) {
    if (!isVisible(field, ctx.payload)) return;

    var page = ctx.pages[field.page];
    var pageHeight = page.getSize().height;
    var font = ctx.fonts[field.font || 'legalSerif'];
    if (!font) throw FieldError(ctx.documentId, field.id, 'шрифт "' + field.font + '" не загружен');

    var raw = field.type === 'static' ? field.text : resolve(field.source, ctx.payload);

    // Some printed slots are far too narrow for the full value (the signature
    // parentheses hold ~11 characters). `fallbacks` lists progressively shorter
    // renderings to try before giving up — never a silent truncation.
    var candidates = [field.format].concat(field.fallbacks || []);
    var value = '';
    var fit = null;

    for (var c = 0; c < candidates.length; c++) {
      var candidate = formatValue({ format: candidates[c] }, raw);
      if (!candidate) { value = candidate; continue; }
      value = candidate;
      var size = field.fontSize || 9;
      fit = Layout.fitText(font, candidate, {
        size: size,
        minSize: field.minFontSize != null ? field.minFontSize : size,
        maxWidth: field.width,
        maxHeight: field.maxHeight,
        maxLines: field.maxLines,
        multiline: !!field.multiline,
        lineHeight: field.lineHeight
      });
      if (fit.fits) break;
    }

    if (!value) {
      if (field.required) {
        throw FieldError(ctx.documentId, field.id, 'обязательное значение отсутствует');
      }
      return;                                   // empty optional value → leave the line blank
    }

    if (!fit || !fit.fits) {
      throw FieldError(ctx.documentId, field.id,
        'значение не помещается даже при минимальном кегле ' + fit.size + 'pt ' +
        '(нужно ' + Math.ceil(fit.requiredWidth) + 'pt, доступно ' +
        Math.floor(fit.availableWidth) + 'pt): "' + value + '"');
    }

    var lineHeight = fit.lineHeight || field.lineHeight || fit.size * 1.15;
    var baseY = pageHeight - field.baselineTop + (field.baselineShift || 0);

    fit.lines.forEach(function (line, i) {
      var lineWidth = Layout.widthOf(font, line, fit.size);
      var dx = Layout.alignOffset(field.align, lineWidth, field.width);
      page.drawText(line, {
        x: field.left + dx,
        y: baseY - i * lineHeight,
        size: fit.size,
        font: font,
        color: ctx.color
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

          template.fields.forEach(function (field) {
            if ((field.type || 'text') === 'check') drawCheckField(ctx, field);
            else drawTextField(ctx, field);
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
