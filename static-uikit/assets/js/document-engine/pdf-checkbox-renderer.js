// Document engine — checkbox mark renderer.
//
// Draws a mark INSIDE the checkbox that already exists in the base PDF. The
// template's own "☐" glyph is part of the original Word layout and is never
// redrawn, covered or replaced — we only add strokes on top of it, exactly as
// a person would tick a printed form.
//
// Marks are drawn as vector strokes rather than glyphs on purpose: the serif
// text font (Liberation Serif) has no ✓/✗ glyph, so a glyph-based mark would
// silently fall back to a missing-glyph box in some viewers.

(function (global) {
  'use strict';

  var Checkbox = {};

  // Geometry of the source checkbox, relative to the text baseline the glyph
  // sits on. The "☐" in these Word forms is a full-width box roughly the size
  // of the font, sitting just above the baseline.
  var BOX_RATIO = 0.72;      // box side  ≈ 0.72 em
  var BOX_LIFT = 0.06;       // box bottom sits ≈ 0.06 em above the baseline

  // Resolve the checkbox square in PDF user space (origin bottom-left).
  // `left` / `baselineY` describe where the template's glyph is drawn.
  function boxRect(left, baselineY, glyphSize, tuning) {
    var t = tuning || {};
    var side = (t.boxSize != null ? t.boxSize : glyphSize * BOX_RATIO);
    return {
      x: left + (t.offsetX || 0),
      y: baselineY + glyphSize * BOX_LIFT + (t.offsetY || 0),
      size: side
    };
  }
  Checkbox.boxRect = boxRect;

  // Draw a mark inside the box. `style`:
  //   'check' (default) — a tick
  //   'cross'           — an X
  //   'fill'            — a solid square (rare; for "closed" boxes)
  //
  // The mark is inset so it never touches or overdraws the printed border.
  function drawMark(page, rect, options) {
    var opts = options || {};
    var style = opts.style || 'check';
    var rgb = opts.color;                    // pdf-lib rgb() value
    var thickness = opts.thickness != null ? opts.thickness : Math.max(0.6, rect.size * 0.11);
    var inset = rect.size * (opts.inset != null ? opts.inset : 0.18);

    var x = rect.x + inset;
    var y = rect.y + inset;
    var s = rect.size - inset * 2;
    if (s <= 0) return;

    function line(x1, y1, x2, y2) {
      page.drawLine({
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness: thickness,
        color: rgb
      });
    }

    if (style === 'fill') {
      page.drawRectangle({ x: x, y: y, width: s, height: s, color: rgb });
      return;
    }

    if (style === 'cross') {
      line(x, y, x + s, y + s);
      line(x, y + s, x + s, y);
      return;
    }

    // 'check' — short down-stroke then a longer up-stroke, like a hand tick.
    line(x, y + s * 0.52, x + s * 0.38, y);
    line(x + s * 0.38, y, x + s, y + s);
  }
  Checkbox.drawMark = drawMark;

  // Convenience: mark the checkbox whose template glyph is at (left, baselineY).
  function mark(page, left, baselineY, glyphSize, options) {
    drawMark(page, boxRect(left, baselineY, glyphSize, options), options);
  }
  Checkbox.mark = mark;

  global.CRMDocumentEngine = global.CRMDocumentEngine || {};
  global.CRMDocumentEngine.checkbox = Checkbox;

}(typeof window !== 'undefined' ? window : this));
