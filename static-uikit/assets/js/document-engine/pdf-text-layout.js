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
      generated: !!source.generated
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
          var split = breakToken(font, token, size, slot.width);
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
