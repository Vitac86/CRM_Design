// Document engine — text layout utilities.
//
// Pure geometry helpers used by the PDF overlay renderer: measuring, word
// wrapping, shrink-to-fit and horizontal alignment. No pdf-lib document or
// page objects are touched here, so this file stays testable and reusable.
//
// Everything works in PDF points. A "font" is any object exposing
// widthOfTextAtSize(text, size) — i.e. a pdf-lib PDFFont.

(function (global) {
  'use strict';

  var Layout = {};

  // ── Measuring ──────────────────────────────────────────────────────────────

  function widthOf(font, text, size) {
    if (!text) return 0;
    return font.widthOfTextAtSize(String(text), size);
  }
  Layout.widthOf = widthOf;

  // ── Word wrapping ──────────────────────────────────────────────────────────

  // Split `text` into lines that each fit `maxWidth` at `size`.
  // A single word longer than maxWidth is hard-broken so it can never overflow
  // silently; the caller decides whether that is acceptable.
  function wrap(font, text, size, maxWidth) {
    var words = String(text == null ? '' : text).split(/\s+/).filter(Boolean);
    var lines = [];
    var line = '';

    function pushLine() {
      if (line) { lines.push(line); line = ''; }
    }

    words.forEach(function (word) {
      var candidate = line ? line + ' ' + word : word;
      if (widthOf(font, candidate, size) <= maxWidth) {
        line = candidate;
        return;
      }
      pushLine();
      // Word alone still too wide → hard-break it character by character.
      if (widthOf(font, word, size) > maxWidth) {
        var chunk = '';
        for (var i = 0; i < word.length; i++) {
          var next = chunk + word[i];
          if (widthOf(font, next, size) > maxWidth && chunk) {
            lines.push(chunk);
            chunk = word[i];
          } else {
            chunk = next;
          }
        }
        line = chunk;
      } else {
        line = word;
      }
    });

    pushLine();
    return lines.length ? lines : [''];
  }
  Layout.wrap = wrap;

  // ── Shrink to fit ──────────────────────────────────────────────────────────

  // Find the largest size in [minSize, size] at which `text` fits the box.
  //
  // Returns { size, lines, fits }. `fits` is false when even minSize overflows —
  // the renderer turns that into a visible generation error rather than
  // silently clipping a name, address or issuing authority.
  //
  // opts: { multiline, maxLines, lineHeight, step }
  function fitText(font, text, opts) {
    var size = opts.size;
    var minSize = opts.minSize == null ? opts.size : opts.minSize;
    var maxWidth = opts.maxWidth;
    var maxHeight = opts.maxHeight;          // optional, multiline only
    var multiline = !!opts.multiline;
    var step = opts.step || 0.25;
    var value = String(text == null ? '' : text);

    // `size - n * step` does not necessarily land on `minSize` (for example,
    // 9.48 with a 0.25 step skips from 6.23 to 5.98).  Build the stepped
    // candidates above the boundary, then always test the exact minimum once.
    var candidateSizes = [];
    for (var s = size; s > minSize + 1e-9; s -= step) {
      candidateSizes.push(Math.round(s * 1000) / 1000);
    }
    candidateSizes.push(minSize);

    for (var candidateIndex = 0; candidateIndex < candidateSizes.length; candidateIndex += 1) {
      var current = candidateSizes[candidateIndex];

      if (!multiline) {
        if (widthOf(font, value, current) <= maxWidth) {
          return { size: current, lines: [value], fits: true };
        }
        continue;
      }

      var lines = wrap(font, value, current, maxWidth);
      var lineHeight = opts.lineHeight ? opts.lineHeight * (current / size) : current * 1.15;
      var tooTall = maxHeight != null && lines.length * lineHeight > maxHeight + 1e-6;
      var tooMany = opts.maxLines != null && lines.length > opts.maxLines;
      var overflows = lines.some(function (l) {
        return widthOf(font, l, current) > maxWidth + 1e-6;
      });
      if (!tooTall && !tooMany && !overflows) {
        return { size: current, lines: lines, fits: true, lineHeight: lineHeight };
      }
    }

    // Did not fit even at the minimum size — report the best effort so the
    // caller can include real numbers in the error message.
    var fallbackLines = multiline ? wrap(font, value, minSize, maxWidth) : [value];
    return {
      size: minSize,
      lines: fallbackLines,
      fits: false,
      requiredWidth: widthOf(font, value, minSize),
      availableWidth: maxWidth
    };
  }
  Layout.fitText = fitText;

  // ── Alignment ──────────────────────────────────────────────────────────────

  // X offset for one line inside a box of `boxWidth`, given the alignment.
  function alignOffset(alignment, lineWidth, boxWidth) {
    if (alignment === 'center') return (boxWidth - lineWidth) / 2;
    if (alignment === 'right') return boxWidth - lineWidth;
    return 0;                                    // 'left' / undefined
  }
  Layout.alignOffset = alignOffset;

  global.CRMDocumentEngine = global.CRMDocumentEngine || {};
  global.CRMDocumentEngine.textLayout = Layout;

}(typeof window !== 'undefined' ? window : this));
