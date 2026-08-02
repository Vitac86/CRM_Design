// Document engine — text layout.
//
// The single source of truth for how one logical value becomes printed lines:
// font measurement, word wrapping, flow across continuation regions, shrinking,
// fallback selection and overflow diagnostics all live here. The overlay
// renderer, the Document Wizard preflight and the Template Builder must all ask
// this module — none of them may re-implement wrapping.
//
// No pdf-lib document or page objects are touched, so this file stays testable
// and reusable. Everything works in PDF points. A "font" is any object exposing
// widthOfTextAtSize(text, size) — i.e. a pdf-lib PDFFont.
//
// ── Readability policy ─────────────────────────────────────────────────────
// Dynamic text at 7 pt is not acceptably readable on a printed form, so the
// engine enforces a hard floor and prefers a comfortable size:
//
//   MIN_DYNAMIC_FONT_SIZE        9 pt   never draw dynamic text below this
//   PREFERRED_DYNAMIC_FONT_SIZE  12 pt  default for new fields
//
// The floor applies only to text this engine draws. Static legal text already
// embedded in the base PDF is never touched.
//
// ── Layout order ───────────────────────────────────────────────────────────
// For one logical value the order is deliberate — an extra approved line is
// always better than smaller text:
//
//   1. apply the primary formatter                (caller)
//   2. start at the configured preferred size
//   3. wrap across ALL approved regions at that size
//   4. preserve words and explicit line breaks
//   5. still does not fit → reduce by 0.25 pt
//   6. recompute the WHOLE layout at every size
//   7. stop at MIN_DYNAMIC_FONT_SIZE
//   8. try declared legally safe formatter fallbacks, same process (caller)
//   9. only then report a field-specific overflow
//
// Never "shrink first, then try multiline".

(function (global) {
  'use strict';

  var Layout = {};

  // ── Policy constants ───────────────────────────────────────────────────────

  var MIN_DYNAMIC_FONT_SIZE = 9;
  var PREFERRED_DYNAMIC_FONT_SIZE = 12;
  var SIZE_STEP = 0.25;

  // A region without an explicit line capacity may still not grow forever; this
  // only guards against a pathological loop, it is never reached in practice.
  var UNBOUNDED_LINES = 200;

  Layout.MIN_DYNAMIC_FONT_SIZE = MIN_DYNAMIC_FONT_SIZE;
  Layout.PREFERRED_DYNAMIC_FONT_SIZE = PREFERRED_DYNAMIC_FONT_SIZE;
  Layout.SIZE_STEP = SIZE_STEP;

  // ── Measuring ──────────────────────────────────────────────────────────────

  function widthOf(font, text, size) {
    if (!text) return 0;
    return font.widthOfTextAtSize(String(text), size);
  }
  Layout.widthOf = widthOf;

  // ── Text normalisation (Russian and English) ───────────────────────────────

  // Explicit line breaks are part of the value and must survive; every other
  // whitespace run collapses to a single space. Non-breaking spaces are kept as
  // ordinary spaces so a value pasted from Word does not produce a giant token.
  function splitParagraphs(value) {
    var text = String(value == null ? '' : value)
      .replace(/[\u00a0\u2007\u202f]/g, ' ')
      .replace(/\r\n?/g, '\n');
    var paragraphs = text.split('\n').map(function (p) {
      return p.replace(/[ \t\f\v]+/g, ' ').trim();
    });
    // Drop empty leading/trailing paragraphs and collapse runs of blank lines,
    // so a value never starts or ends with an empty printed line.
    while (paragraphs.length && !paragraphs[0]) paragraphs.shift();
    while (paragraphs.length && !paragraphs[paragraphs.length - 1]) paragraphs.pop();
    var out = [];
    paragraphs.forEach(function (p) {
      if (!p && out.length && !out[out.length - 1]) return;
      out.push(p);
    });
    return out;
  }
  Layout.splitParagraphs = splitParagraphs;

  // Punctuation that may never stand alone on a line. A token made only of
  // these is merged into the previous word, so wrapping can never produce a
  // line such as "," or ")." on its own.
  var PUNCTUATION_ONLY = /^[.,;:!?)\]}»"'’”–—-]+$/;

  function tokenize(paragraph) {
    var words = String(paragraph || '').split(' ').filter(Boolean);
    var out = [];
    words.forEach(function (word) {
      if (out.length && PUNCTUATION_ONLY.test(word)) {
        out[out.length - 1] = out[out.length - 1] + ' ' + word;
        return;
      }
      out.push(word);
    });
    return out;
  }
  Layout.tokenize = tokenize;

  // ── Breaking a token that is wider than its line ───────────────────────────
  //
  // No dictionary hyphenation. A token may only be split after a character that
  // already reads as a break in the source value — a hyphen in a double
  // surname, a slash in a contract number, a dot in a domain. The separator
  // stays on the first line, so nothing is invented and nothing is lost.
  var BREAK_AFTER = '-‐‑‒–—/\\.,:;@_';

  function breakToken(font, token, size, maxWidth) {
    var best = -1;
    for (var i = 0; i < token.length - 1; i += 1) {
      if (BREAK_AFTER.indexOf(token.charAt(i)) === -1) continue;
      if (widthOf(font, token.slice(0, i + 1), size) <= maxWidth) best = i;
      else break;
    }
    if (best === -1) return null;
    return [token.slice(0, best + 1), token.slice(best + 1)];
  }
  Layout.breakToken = breakToken;

  // The opposite reviewed decision: `tokenBreak: 'none'` says this slot holds
  // ONE exact identifier — a contract number, a payment reference — that the
  // document owner's format does not allow to be broken anywhere at all, not
  // even after a slash or a hyphen it happens to contain. Such a token is never
  // split; it moves whole to a wider approved line, or the field overflows and
  // says so. Without this the engine would helpfully print «БД-2026/» on the
  // printed blank and «000417-СПБ» underneath, which reads as two references.
  function mayBreakToken(options) {
    return !options || options.tokenBreak !== 'none';
  }

  // A last-resort split at an arbitrary character. Only used when the field
  // explicitly declares `tokenBreak: 'anywhere'`, which is a reviewed decision
  // for slots that hold machine identifiers rather than legal wording.
  function breakAnywhere(font, token, size, maxWidth) {
    var chunk = '';
    for (var i = 0; i < token.length; i += 1) {
      var next = chunk + token.charAt(i);
      if (chunk && widthOf(font, next, size) > maxWidth) {
        return [chunk, token.slice(i)];
      }
      chunk = next;
    }
    return null;
  }

  // ── Regions ────────────────────────────────────────────────────────────────
  //
  // One logical value may flow through several explicitly mapped regions. Each
  // region carries its own page, baseline, width and line capacity, so a value
  // can continue on a second printed rule that is wider than the first.
  //
  // A field without `flowRegions` keeps working unchanged: its own geometry is
  // treated as an implicit first region.
  function regionsFor(field) {
    var declared = field && field.flowRegions;
    if (Array.isArray(declared) && declared.length) {
      return declared.map(function (region, index) {
        return normalizeRegion(region, field, index);
      });
    }
    return [normalizeRegion(field, field, 0)];
  }
  Layout.regionsFor = regionsFor;

  function normalizeRegion(region, field, index) {
    var source = region || {};
    var owner = field || {};
    var multiline = source.multiline != null ? !!source.multiline : !!owner.multiline;
    var lineHeight = source.lineHeight != null ? Number(source.lineHeight)
      : (owner.lineHeight != null ? Number(owner.lineHeight) : null);
    var maxHeight = source.maxHeight != null ? Number(source.maxHeight)
      : (index === 0 && owner.maxHeight != null ? Number(owner.maxHeight) : null);
    var maxLines = source.maxLines != null ? Number(source.maxLines)
      : (index === 0 && owner.maxLines != null ? Number(owner.maxLines) : null);
    // A printed cell of fixed height holds more lines at a smaller size. Such a
    // region declares its leading as a ratio of the font size instead of a
    // fixed distance, so shrinking really does buy another line.
    var lineHeightRatio = source.lineHeightRatio != null ? Number(source.lineHeightRatio)
      : (owner.lineHeightRatio != null ? Number(owner.lineHeightRatio) : null);

    // Line capacity, in order of authority:
    //   1. an explicit maxLines
    //   2. what the declared maxHeight physically allows at a fixed leading
    //   3. left to slotsFor when the leading follows the font size, because
    //      then a smaller size genuinely buys another line inside the same
    //      printed cell
    //   4. one line per declared flow region — the explicit model is one
    //      printed rule per region unless the map says otherwise
    //   5. legacy behaviour for an implicit single region: one line, or as
    //      many as needed when the field is marked multiline
    if (maxLines == null) {
      if (maxHeight != null && lineHeightRatio) maxLines = null;
      else if (maxHeight != null && lineHeight) maxLines = Math.max(1, Math.floor(maxHeight / lineHeight));
      else if (Array.isArray(owner.flowRegions) && owner.flowRegions.length) maxLines = 1;
      else maxLines = multiline ? null : 1;
    }

    return {
      index: index,
      page: source.page != null ? Number(source.page) : Number(owner.page),
      left: Number(source.left != null ? source.left : owner.left),
      baselineTop: Number(source.baselineTop != null ? source.baselineTop : owner.baselineTop),
      width: Number(source.width != null ? source.width : owner.width),
      maxLines: maxLines,
      lineHeight: lineHeight,
      lineHeightRatio: lineHeightRatio,
      maxHeight: maxHeight,
      // Largest size this particular region can physically hold. A continuation
      // line squeezed into a measured gap between two printed paragraphs may
      // simply have no room for 12 pt text; declaring that here keeps the
      // constraint with the geometry it belongs to instead of penalising the
      // field's primary slot.
      maxFontSize: source.maxFontSize != null ? Number(source.maxFontSize) : null,
      align: source.align != null ? source.align : owner.align,
      baselineShift: Number(source.baselineShift || 0),
      firstLineIndent: Number(source.firstLineIndent || (index === 0 ? owner.firstLineIndent || 0 : 0)),
      drawUnderline: !!source.drawUnderline,
      underlineLeft: source.underlineLeft,
      underlineTop: source.underlineTop,
      underlineWidth: source.underlineWidth,
      underlineThickness: source.underlineThickness,
      underlineOffset: source.underlineOffset,
      underlineColor: source.underlineColor,
      reviewStatus: source.reviewStatus,
      generated: !!source.generated,
      // Set on a region opened by page expansion: the row's own borders and
      // where it sits. The renderer needs these to draw the row it was given.
      inserted: !!source.inserted,
      lineStyle: source.lineStyle,
      tableRow: source.tableRow,
      rowTop: source.rowTop,
      rowHeight: source.rowHeight
    };
  }
  Layout.normalizeRegion = normalizeRegion;

  // Effective line height of a region at a given size.
  //
  // A fixed `lineHeight` is physical geometry — the distance between two
  // printed rules — and therefore does NOT scale with the font. A region that
  // instead models a blank cell of a given height declares `lineHeightRatio`,
  // and its leading follows the size so a smaller size fits more lines.
  function lineHeightAt(region, size) {
    if (region.lineHeightRatio) return size * region.lineHeightRatio;
    return region.lineHeight != null && isFinite(region.lineHeight)
      ? region.lineHeight
      : size * 1.15;
  }
  Layout.lineHeightAt = lineHeightAt;

  // Ordered writable lines across every region.
  function slotsFor(regions, size) {
    var slots = [];
    regions.forEach(function (region, regionIndex) {
      var capacity = region.maxLines == null ? UNBOUNDED_LINES : Math.max(0, Math.floor(region.maxLines));
      var lineHeight = lineHeightAt(region, size);
      if (region.maxHeight != null && isFinite(region.maxHeight) && lineHeight > 0) {
        capacity = Math.min(capacity, Math.max(1, Math.floor((region.maxHeight + 1e-6) / lineHeight)));
      }
      for (var line = 0; line < capacity; line += 1) {
        var indent = line === 0 ? (region.firstLineIndent || 0) : 0;
        slots.push({
          regionIndex: regionIndex,
          region: region,
          lineIndex: line,
          page: region.page,
          left: region.left + indent,
          width: region.width - indent,
          lineHeight: lineHeight
        });
      }
    });
    return slots;
  }
  Layout.slotsFor = slotsFor;

  // ── Flowing one value at one size ──────────────────────────────────────────
  //
  // Deterministic greedy distribution: fill each approved line in order with as
  // many whole words as fit. The same input always produces the same output.
  function flowAtSize(font, value, size, regions, options) {
    var opts = options || {};
    var slots = slotsFor(regions, size);
    var paragraphs = splitParagraphs(value);
    var lines = [];
    var slotIndex = 0;

    for (var p = 0; p < paragraphs.length; p += 1) {
      var words = tokenize(paragraphs[p]);
      if (!words.length) {
        // A deliberate blank line between two blocks of text.
        if (slotIndex >= slots.length) {
          return overflowResult(size, lines, 'no-space', { remaining: '' });
        }
        slotIndex += 1;
        continue;
      }
      var wordIndex = 0;
      while (wordIndex < words.length) {
        if (slotIndex >= slots.length) {
          return overflowResult(size, lines, 'no-space', {
            remaining: words.slice(wordIndex).join(' '),
            requiredWidth: widthOf(font, words.slice(wordIndex).join(' '), size)
          });
        }
        var slot = slots[slotIndex];
        var line = '';
        while (wordIndex < words.length) {
          var candidate = line ? line + ' ' + words[wordIndex] : words[wordIndex];
          if (widthOf(font, candidate, size) > slot.width + 1e-6) break;
          line = candidate;
          wordIndex += 1;
        }
        if (!line) {
          // The next word alone is wider than this line.
          var token = words[wordIndex];
          var split = mayBreakToken(opts)
            ? breakToken(font, token, size, slot.width) : null;
          if (!split && opts.tokenBreak === 'anywhere') {
            split = breakAnywhere(font, token, size, slot.width);
          }
          if (!split) {
            // Another region further down may be wider — try there before
            // declaring the token unprintable.
            var wider = false;
            for (var s = slotIndex + 1; s < slots.length; s += 1) {
              if (slots[s].width > slot.width + 1e-6) { wider = true; break; }
            }
            if (wider) { slotIndex += 1; continue; }
            return overflowResult(size, lines, 'unbreakable-token', {
              token: token,
              requiredWidth: widthOf(font, token, size),
              availableWidth: slot.width
            });
          }
          line = split[0];
          words[wordIndex] = split[1];
        }
        lines.push({
          regionIndex: slot.regionIndex,
          page: slot.page,
          lineIndex: slot.lineIndex,
          text: line
        });
        slotIndex += 1;
      }
    }

    if (!lines.length) lines.push({ regionIndex: 0, page: regions[0].page, lineIndex: 0, text: '' });

    return {
      fits: true,
      size: size,
      lines: lines,
      regions: regions,
      lineHeight: lineHeightAt(regions[0], size)
    };
  }

  function overflowResult(size, lines, reason, detail) {
    var result = {
      fits: false,
      size: size,
      lines: lines,
      reason: reason
    };
    Object.keys(detail || {}).forEach(function (key) { result[key] = detail[key]; });
    return result;
  }

  // ── Public: lay one value out across its approved regions ──────────────────
  //
  // spec: {
  //   size,        preferred size, normally PREFERRED_DYNAMIC_FONT_SIZE
  //   minSize,     never allowed below MIN_DYNAMIC_FONT_SIZE
  //   regions,     normalized regions (see regionsFor)
  //   step,        size decrement, default 0.25
  //   tokenBreak   'anywhere' to permit a reviewed mid-token split
  // }
  //
  // Returns on success:
  //   { fits: true, size, strategy, shrunk, lines: [{regionIndex, page, text}],
  //     regions, usedRegions, lineHeight }
  // and on failure the best-effort attempt at the minimum size plus a machine
  // readable `reason` so the caller can explain precisely what went wrong.
  function layoutValue(font, text, spec) {
    var regions = spec.regions && spec.regions.length ? spec.regions : [normalizeRegion(spec, spec, 0)];
    var preferred = Number(spec.size);
    if (!isFinite(preferred) || preferred <= 0) preferred = PREFERRED_DYNAMIC_FONT_SIZE;
    // The floor is absolute: a configured minimum below it is raised, never
    // honoured. Renderer and builder validation reject such a configuration
    // outright; this clamp guarantees the engine itself can never emit
    // unreadable text even if a map slips through.
    var minSize = spec.minSize == null ? preferred : Number(spec.minSize);
    minSize = Math.max(MIN_DYNAMIC_FONT_SIZE, minSize);
    if (preferred < minSize) preferred = minSize;
    var step = spec.step || SIZE_STEP;

    var sizes = [];
    for (var s = preferred; s > minSize + 1e-9; s -= step) {
      sizes.push(Math.round(s * 1000) / 1000);
    }
    sizes.push(minSize);

    var last = null;
    for (var i = 0; i < sizes.length; i += 1) {
      var attempt = flowAtSize(font, text, sizes[i], regions, spec);
      if (attempt.fits && exceedsRegionCap(attempt, regions, sizes[i])) {
        // The text fits, but it landed in a region that cannot hold this size.
        // Keep stepping down rather than drawing over the printed form.
        continue;
      }
      last = attempt;
      if (attempt.fits) return describe(attempt, preferred, regions);
    }

    last = last || overflowResult(minSize, [], 'no-space', {});
    last.strategy = 'overflow';
    last.minSize = minSize;
    last.preferredSize = preferred;
    last.regions = regions;
    last.regionCount = regions.length;
    last.lineCapacity = slotsFor(regions, minSize).length;
    if (last.availableWidth == null) {
      last.availableWidth = regions.reduce(function (max, r) {
        return Math.max(max, r.width);
      }, 0);
    }
    return last;
  }
  Layout.layoutValue = layoutValue;

  // ── Word-flow blocks: styled static and dynamic runs ──────────────────────
  //
  // A fixed overlay lays out one value inside one or more boxes.  A Word-flow
  // block is deliberately different: static legal wording and referenced
  // values enter the SAME greedy line-breaking pass.  This function is the
  // only place where those lines are assigned; the PDF renderer merely draws
  // the returned x/baseline coordinates.
  //
  // `runs` are already resolved by the caller, so the pure layout engine does
  // not know about a CRM payload.  A field reference is represented as:
  //
  //   { type: 'fieldRef', fieldId: 'ulInn', text: '7701234567',
  //     keepTogether: true, decoration: { underline: true, minWidth: 55 } }
  //
  // Supported controls are `space`, `lineBreak`, `paragraphBreak` and a
  // reviewed fixed-width `spacer` (the latter is useful for two independent
  // blanks on a date line).  No underscore glyph, synthetic hyphen or slash is
  // ever introduced.

  var FLOW_ATTACH_TO_PREVIOUS = /^[,.;:!?%)\]}»”’]+$/;

  function flowFont(fonts, key) {
    if (typeof fonts === 'function') return fonts(key);
    return fonts && fonts[key];
  }

  function collapseFlowText(value) {
    return String(value == null ? '' : value)
      .replace(/[\u00a0\u2007\u202f]/g, ' ')
      .replace(/\r\n?/g, '\n');
  }

  function copyOwn(source) {
    var out = {};
    Object.keys(source || {}).forEach(function (key) { out[key] = source[key]; });
    return out;
  }

  function wordAtoms(fonts, run, spec, pendingSpace) {
    var type = run.type || 'static';
    var fontKey = run.font || spec.font;
    var font = flowFont(fonts, fontKey);
    var size = Number(run.fontSize != null ? run.fontSize : spec.fontSize);
    if (!font) throw new Error('word-flow font "' + fontKey + '" is not loaded');
    if (!isFinite(size) || size <= 0) throw new Error('word-flow font size must be positive');

    var sourceFieldId = type === 'fieldRef'
      ? (run.fieldId || run.sourceFieldId || null) : null;
    var text = collapseFlowText(run.text);
    var pieces = [];

    // A printed form's blank is part of its wording: «По электронной почте
    // ______» shows that rule whether or not anybody filled it in. A reviewed
    // reference may therefore declare `blankWhenEmpty`; an empty value — or one
    // switched off by `showWhen` — then reserves its decoration's minimum width
    // and keeps the rule, exactly as the suppressed source printed it. Without
    // this, choosing «по почте» would silently delete the e-mail blank from the
    // generated form.
    if (type === 'fieldRef' && run.blankWhenEmpty && !text.replace(/\s+/g, '')) {
      var blankWidth = run.decoration && isFinite(Number(run.decoration.minWidth))
        ? Math.max(0, Number(run.decoration.minWidth)) : 0;
      pieces.push({
        type: type, text: '', font: fontKey, fontSize: size,
        textWidth: 0, slotWidth: blankWidth,
        spaceBefore: pendingSpace.value, sourceFieldId: sourceFieldId,
        decoration: run.decoration ? copyOwn(run.decoration) : null,
        emergencyBreak: false, keepTogether: true,
        keepWithNext: !!run.keepWithNext, attachPrevious: false,
        runIndex: run._runIndex
      });
      pendingSpace.value = false;
      return pieces;
    }

    var lineParts = text.split('\n');

    lineParts.forEach(function (part, lineIndex) {
      if (lineIndex) {
        pieces.push({ control: 'lineBreak' });
        pendingSpace.value = false;
      }

      var leading = /^\s/.test(part);
      var trailing = /\s$/.test(part);
      var normal = part.replace(/[ \t\f\v]+/g, ' ').trim();
      if (!normal) {
        if (leading || trailing || part) pendingSpace.value = true;
        return;
      }

      var words = run.keepTogether ? [normal] : normal.split(' ');
      var indices = [];
      words.forEach(function (word, wordIndex) {
        var spaceBefore = pendingSpace.value || leading || wordIndex > 0;
        var textWidth = widthOf(font, word, size);
        var atom = {
          type: type,
          text: word,
          font: fontKey,
          fontSize: size,
          textWidth: textWidth,
          slotWidth: textWidth,
          spaceBefore: spaceBefore,
          sourceFieldId: sourceFieldId,
          decoration: run.decoration ? copyOwn(run.decoration) : null,
          emergencyBreak: !!run.emergencyBreak || run.tokenBreak === 'anywhere',
          keepTogether: !!run.keepTogether,
          keepWithNext: false,
          attachPrevious: FLOW_ATTACH_TO_PREVIOUS.test(word),
          runIndex: run._runIndex
        };
        indices.push(pieces.length);
        pieces.push(atom);
        pendingSpace.value = false;
        leading = false;
      });

      // A minimum blank width belongs to the dynamic run, not its punctuation.
      // Reserve any unused part after the final fragment.  If the value wraps,
      // that remainder follows the last fragment just as a Word underline does.
      if (type === 'fieldRef' && indices.length && run.decoration &&
          isFinite(Number(run.decoration.minWidth))) {
        var actual = 0;
        indices.forEach(function (index, i) {
          var atom = pieces[index];
          if (i) actual += widthOf(font, ' ', size);
          actual += atom.textWidth;
        });
        var extra = Math.max(0, Number(run.decoration.minWidth) - actual);
        pieces[indices[indices.length - 1]].slotWidth += extra;
      }

      if (indices.length && run.keepWithNext) {
        pieces[indices[indices.length - 1]].keepWithNext = true;
      }
      pendingSpace.value = trailing;
    });

    return pieces;
  }

  function prepareWordFlow(fonts, runs, spec) {
    var paragraphs = [[]];
    var pendingSpace = { value: false };

    (runs || []).forEach(function (original, runIndex) {
      var run = copyOwn(original || {});
      run._runIndex = runIndex;
      var type = run.type || 'static';
      if (type === 'paragraphBreak') {
        paragraphs.push([]);
        pendingSpace.value = false;
        return;
      }
      if (type === 'lineBreak' || type === 'hardLineBreak') {
        paragraphs[paragraphs.length - 1].push({ control: 'lineBreak' });
        pendingSpace.value = false;
        return;
      }
      if (type === 'space') {
        pendingSpace.value = true;
        return;
      }
      if (type === 'spacer') {
        paragraphs[paragraphs.length - 1].push({
          type: 'spacer', text: '', font: run.font || spec.font,
          fontSize: Number(run.fontSize != null ? run.fontSize : spec.fontSize),
          textWidth: 0, slotWidth: Math.max(0, Number(run.width) || 0),
          spaceBefore: pendingSpace.value, sourceFieldId: null,
          decoration: null, emergencyBreak: false, keepTogether: true,
          keepWithNext: !!run.keepWithNext, attachPrevious: false,
          runIndex: runIndex
        });
        pendingSpace.value = false;
        return;
      }
      if (type !== 'static' && type !== 'fieldRef') {
        throw new Error('unsupported word-flow run type "' + type + '"');
      }
      var atoms = wordAtoms(fonts, run, spec, pendingSpace);
      Array.prototype.push.apply(paragraphs[paragraphs.length - 1], atoms);
    });

    // A trailing paragraph break is layout metadata, not an empty printed line.
    while (paragraphs.length > 1 && !paragraphs[paragraphs.length - 1].length) {
      paragraphs.pop();
    }
    return paragraphs;
  }

  function groupsForWordFlow(items) {
    var groups = [];
    items.forEach(function (atom) {
      if (atom.control) {
        groups.push(atom);
        return;
      }
      var previous = groups.length ? groups[groups.length - 1] : null;
      if (atom.attachPrevious && previous && !previous.control) {
        previous.atoms.push(atom);
        return;
      }
      var group = { atoms: [atom] };
      if (previous && !previous.control &&
          previous.atoms[previous.atoms.length - 1].keepWithNext) {
        previous.atoms.push(atom);
      } else {
        groups.push(group);
      }
    });
    return groups;
  }

  function atomSpaceWidth(fonts, atom) {
    var font = flowFont(fonts, atom.font);
    return widthOf(font, ' ', atom.fontSize);
  }

  function groupWidth(fonts, group, ignoreLeadingSpace) {
    var total = 0;
    group.atoms.forEach(function (atom, index) {
      if (atom.spaceBefore && !(ignoreLeadingSpace && index === 0)) {
        total += atomSpaceWidth(fonts, atom);
      }
      total += atom.slotWidth;
    });
    return total;
  }

  function splitEmergencyAtom(fonts, atom, maxWidth) {
    if (!atom.emergencyBreak || atom.keepTogether || atom.text.length < 2) return null;
    var font = flowFont(fonts, atom.font);
    var chunks = [];
    var rest = atom.text;
    while (rest) {
      var chunk = '';
      var used = 0;
      for (var i = 0; i < rest.length; i += 1) {
        var candidate = chunk + rest.charAt(i);
        var candidateWidth = widthOf(font, candidate, atom.fontSize);
        if (chunk && candidateWidth > maxWidth + 1e-6) break;
        chunk = candidate;
        used = i + 1;
      }
      if (!chunk || used === rest.length && chunks.length === 0) return null;
      var next = copyOwn(atom);
      next.text = chunk;
      next.textWidth = widthOf(font, chunk, atom.fontSize);
      next.slotWidth = next.textWidth;
      next.spaceBefore = chunks.length ? false : atom.spaceBefore;
      chunks.push({ atoms: [next] });
      rest = rest.slice(used);
    }
    return chunks;
  }

  function plainLineText(groups) {
    var out = '';
    groups.forEach(function (group) {
      group.atoms.forEach(function (atom) {
        if (atom.type === 'spacer') return;
        if (atom.spaceBefore && out) out += ' ';
        out += atom.text;
      });
    });
    return out;
  }

  // Public deterministic styled-run layout.  This never shrinks: a reviewed
  // Word-flow block normally sets `fontSizeLocked: true`, and validation also
  // enforces minFontSize === fontSize for that mode.
  // ES5 shallow merge: this file targets the same browsers the rest of the
  // engine does and does not assume Object.assign.
  function withOverrides(base, overrides) {
    var out = {};
    Object.keys(base || {}).forEach(function (key) { out[key] = base[key]; });
    Object.keys(overrides || {}).forEach(function (key) { out[key] = overrides[key]; });
    return out;
  }

  function layoutRuns(fonts, runs, input) {
    var spec = input || {};
    var frame = spec.frame || {};
    var fontSize = Number(spec.fontSize);
    var lineHeight = Number(spec.lineHeight);
    var width = Number(frame.width);
    var left = Number(frame.left);
    var baselineTop = Number(frame.baselineTop != null ? frame.baselineTop : frame.top);
    if (!isFinite(fontSize) || fontSize <= 0) throw new Error('word-flow fontSize must be positive');
    if (!isFinite(lineHeight) || lineHeight <= 0) throw new Error('word-flow lineHeight must be positive');
    if (!isFinite(width) || width <= 0 || !isFinite(left) || !isFinite(baselineTop)) {
      throw new Error('word-flow frame needs numeric left, baselineTop and width');
    }
    if (spec.fontSizeLocked && spec.minFontSize != null &&
        Number(spec.minFontSize) !== fontSize) {
      throw new Error('locked word-flow minFontSize must equal fontSize');
    }

    var initialLineCount = Math.max(1, Number(spec.initialLineCount) || 1);
    var maxAdditionalLines = Math.max(0, Number(spec.maxAdditionalLines) || 0);
    var maxLines = initialLineCount + maxAdditionalLines;
    var paragraphSpacing = Math.max(0, Number(spec.paragraphSpacingAfter) || 0);
    var alignment = spec.alignment || spec.align || 'left';
    var firstLineIndent = Number(spec.firstLineIndent) || 0;
    var hangingIndent = Number(spec.hangingIndent) || 0;
    var prepared;
    try {
      prepared = prepareWordFlow(fonts, runs, spec);
    } catch (error) {
      return { fits: false, reason: 'configuration', message: error.message, lines: [] };
    }

    var rawLines = [];
    var overflow = null;

    prepared.forEach(function (paragraph, paragraphIndex) {
      if (overflow) return;
      var sequence = groupsForWordFlow(paragraph);
      var current = [];
      var lineInParagraph = 0;

      function metrics() {
        var indent = lineInParagraph === 0 ? firstLineIndent : hangingIndent;
        return { left: left + indent, width: width - indent };
      }

      function pushLine(forced) {
        if (!current.length) return;
        var m = metrics();
        rawLines.push({
          paragraphIndex: paragraphIndex,
          lineInParagraph: lineInParagraph,
          forced: !!forced,
          groups: current,
          left: m.left,
          availableWidth: m.width,
          text: plainLineText(current)
        });
        current = [];
        lineInParagraph += 1;
        if (rawLines.length > maxLines) {
          overflow = { reason: 'no-space', paragraphIndex: paragraphIndex };
        }
      }

      for (var index = 0; index < sequence.length && !overflow; index += 1) {
        var group = sequence[index];
        if (group.control === 'lineBreak') {
          pushLine(true);
          continue;
        }

        var m = metrics();
        var candidate = current.concat([group]);
        var candidateWidth = 0;
        candidate.forEach(function (entry, entryIndex) {
          candidateWidth += groupWidth(fonts, entry, entryIndex === 0);
        });
        if (candidateWidth <= m.width + 1e-6) {
          current.push(group);
          continue;
        }

        if (current.length) {
          pushLine(false);
          index -= 1;
          continue;
        }

        var split = group.atoms.length === 1
          ? splitEmergencyAtom(fonts, group.atoms[0], m.width) : null;
        if (split && split.length) {
          sequence.splice.apply(sequence, [index, 1].concat(split));
          index -= 1;
          continue;
        }
        var culprit = group.atoms.filter(function (atom) { return atom.sourceFieldId; })[0];
        overflow = {
          reason: 'unbreakable-token',
          fieldId: culprit ? culprit.sourceFieldId : null,
          token: culprit ? culprit.text : plainLineText([group]),
          availableWidth: m.width,
          requiredWidth: groupWidth(fonts, group, true)
        };
      }
      if (!overflow) pushLine(false);
    });

    if (overflow) {
      // «It does not fit» is not something a manager can act on. Lay the same
      // runs out once more with the cap lifted, purely to learn how many rows
      // the values really wanted, so the refusal can say how far over it is.
      // `probe` stops that second pass from recursing.
      var wanted = null;
      if (overflow.reason === 'no-space' && !spec.probe) {
        var relaxed = layoutRuns(fonts, runs, withOverrides(spec, {
          maxAdditionalLines: maxAdditionalLines + 24,
          probe: true
        }));
        if (relaxed.fits) wanted = Math.max(0, relaxed.lines.length - initialLineCount);
      }
      return {
        fits: false,
        reason: overflow.reason,
        fieldId: overflow.fieldId || null,
        token: overflow.token || null,
        availableWidth: overflow.availableWidth || width,
        requiredWidth: overflow.requiredWidth || null,
        lineCapacity: maxLines,
        additionalLinesAllowed: maxAdditionalLines,
        additionalLinesWanted: wanted,
        lines: rawLines,
        size: fontSize,
        fontSizeLocked: !!spec.fontSizeLocked
      };
    }

    // Produce final x assignments only after every line is known, because
    // justification depends on whether this is the paragraph's final line.
    var lines = rawLines.map(function (line, lineIndex) {
      var isFinal = lineIndex === rawLines.length - 1 ||
        rawLines[lineIndex + 1].paragraphIndex !== line.paragraphIndex;
      var contentWidth = 0;
      var spaces = 0;
      line.groups.forEach(function (group, groupIndex) {
        group.atoms.forEach(function (atom, atomIndex) {
          if (atom.spaceBefore && !(groupIndex === 0 && atomIndex === 0)) spaces += 1;
        });
        contentWidth += groupWidth(fonts, group, groupIndex === 0);
      });
      var justify = alignment === 'justify' && !isFinal && !line.forced && spaces > 0 &&
        contentWidth / line.availableWidth >= Number(spec.justifyMinRatio || 0.45);
      var extraSpace = justify ? (line.availableWidth - contentWidth) / spaces : 0;
      var dx = 0;
      if (!justify && alignment === 'center') dx = (line.availableWidth - contentWidth) / 2;
      if (!justify && alignment === 'right') dx = line.availableWidth - contentWidth;
      var x = line.left + Math.max(0, dx);
      var assignments = [];
      line.groups.forEach(function (group, groupIndex) {
        group.atoms.forEach(function (atom, atomIndex) {
          if (atom.spaceBefore && !(groupIndex === 0 && atomIndex === 0)) {
            x += atomSpaceWidth(fonts, atom) + extraSpace;
          }
          assignments.push({
            type: atom.type,
            text: atom.text,
            sourceFieldId: atom.sourceFieldId,
            x: x,
            width: atom.slotWidth,
            textWidth: atom.textWidth,
            font: atom.font,
            fontSize: atom.fontSize,
            decoration: atom.decoration ? copyOwn(atom.decoration) : null,
            runIndex: atom.runIndex
          });
          x += atom.slotWidth;
        });
      });
      var priorParagraphs = line.paragraphIndex;
      return {
        baselineTop: baselineTop + lineIndex * lineHeight + priorParagraphs * paragraphSpacing,
        paragraphIndex: line.paragraphIndex,
        lineInParagraph: line.lineInParagraph,
        finalInParagraph: isFinal,
        forcedBreak: line.forced,
        text: line.text,
        width: contentWidth,
        runs: assignments
      };
    });

    var additionalLines = Math.max(0, lines.length - initialLineCount);
    var paragraphCount = lines.reduce(function (seen, line) {
      seen[line.paragraphIndex] = true; return seen;
    }, {});
    var usedHeight = lines.length * lineHeight +
      Math.max(0, Object.keys(paragraphCount).length - 1) * paragraphSpacing;
    return {
      fits: true,
      strategy: 'word-flow',
      size: fontSize,
      minSize: spec.fontSizeLocked ? fontSize : Number(spec.minFontSize || fontSize),
      fontSizeLocked: !!spec.fontSizeLocked,
      lines: lines,
      usedHeight: usedHeight,
      initialHeight: initialLineCount * lineHeight,
      additionalLines: additionalLines,
      additionalHeight: additionalLines * lineHeight,
      lineHeight: lineHeight,
      alignment: alignment
    };
  }
  Layout.layoutRuns = layoutRuns;

  // Static-token QA deliberately treats printed blank underscores as geometry:
  // migrated blocks replace them with vector underline decoration.  Every
  // other word and punctuation token must remain in the same sequence.
  function staticTextOfRuns(runs) {
    var out = '';
    (runs || []).forEach(function (run) {
      var type = run.type || 'static';
      if (type === 'static') out += String(run.text || '');
      else if (type === 'space') out += ' ';
      else if (type === 'lineBreak' || type === 'hardLineBreak' ||
               type === 'paragraphBreak') out += '\n';
    });
    return out;
  }
  Layout.staticTextOfRuns = staticTextOfRuns;

  function staticTokenSequence(text) {
    return String(text || '')
      .replace(/_+/g, ' ')
      .replace(/[\u00a0\u2007\u202f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .match(/[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu) || [];
  }
  Layout.staticTokenSequence = staticTokenSequence;

  // True when the layout used a region whose declared maximum size is smaller
  // than the size being tried.
  function exceedsRegionCap(attempt, regions, size) {
    for (var i = 0; i < attempt.lines.length; i += 1) {
      var region = regions[attempt.lines[i].regionIndex];
      if (region && region.maxFontSize != null && size > region.maxFontSize + 1e-9) {
        return true;
      }
    }
    return false;
  }

  function describe(attempt, preferred, regions) {
    var used = {};
    attempt.lines.forEach(function (line) { used[line.regionIndex] = true; });
    var usedRegions = Object.keys(used).map(Number).sort(function (a, b) { return a - b; });
    attempt.usedRegions = usedRegions;
    attempt.shrunk = attempt.size < preferred - 1e-9;
    attempt.preferredSize = preferred;
    attempt.strategy = usedRegions.length > 1 ? 'flow'
      : (attempt.lines.length > 1 ? 'wrap' : 'single');
    attempt.regions = regions;
    return attempt;
  }

  // ── Integrity check ────────────────────────────────────────────────────────
  //
  // Guarantees the printed lines carry exactly the input text — no character
  // dropped between regions, none duplicated. Used by QA and by anyone adding a
  // new wrapping rule.
  function verifyIntegrity(value, lines) {
    var expected = splitParagraphs(value).map(tokenize).reduce(function (all, words) {
      return all.concat(words);
    }, []).join(' ').replace(/\s+/g, '');
    var actual = lines.map(function (line) { return line.text; }).join(' ').replace(/\s+/g, '');
    return { ok: expected === actual, expected: expected, actual: actual };
  }
  Layout.verifyIntegrity = verifyIntegrity;

  // ── Alignment ──────────────────────────────────────────────────────────────

  // X offset for one line inside a box of `boxWidth`, given the alignment.
  function alignOffset(alignment, lineWidth, boxWidth) {
    if (alignment === 'center') return (boxWidth - lineWidth) / 2;
    if (alignment === 'right') return boxWidth - lineWidth;
    return 0;                                    // 'left' / undefined
  }
  Layout.alignOffset = alignOffset;

  // ── Legacy single-region helper ────────────────────────────────────────────
  //
  // Kept so existing callers keep compiling; it is a thin wrapper over
  // layoutValue and shares its behaviour, including the 9 pt floor. New code
  // should call layoutValue and read the region assignments.
  function fitText(font, text, opts) {
    var result = layoutValue(font, text, {
      size: opts.size,
      minSize: opts.minSize == null ? opts.size : opts.minSize,
      step: opts.step,
      tokenBreak: opts.tokenBreak,
      regions: [normalizeRegion({
        page: 0,
        left: 0,
        baselineTop: 0,
        width: opts.maxWidth,
        maxLines: opts.maxLines,
        lineHeight: opts.lineHeight,
        maxHeight: opts.maxHeight,
        multiline: !!opts.multiline
      }, { multiline: !!opts.multiline }, 0)]
    });
    return {
      size: result.size,
      lines: result.lines.map(function (line) { return line.text; }),
      fits: result.fits,
      lineHeight: result.lineHeight,
      requiredWidth: result.requiredWidth,
      availableWidth: result.availableWidth,
      reason: result.reason
    };
  }
  Layout.fitText = fitText;

  // Word wrapping inside one width — retained for callers that only need lines.
  function wrap(font, text, size, maxWidth) {
    var result = flowAtSize(font, text, size, [normalizeRegion({
      page: 0, left: 0, baselineTop: 0, width: maxWidth, multiline: true
    }, { multiline: true }, 0)], { tokenBreak: 'anywhere' });
    return result.lines.map(function (line) { return line.text; });
  }
  Layout.wrap = wrap;

  global.CRMDocumentEngine = global.CRMDocumentEngine || {};
  global.CRMDocumentEngine.textLayout = Layout;

}(typeof window !== 'undefined' ? window : this));
