// Focused tests for the production text-layout engine.
//
// These run against the real module (assets/js/document-engine/pdf-text-layout.js)
// with the real embedded PDF font, in a real browser — there is no mock font and
// no second layout implementation. Open tools/document-layout-qa.html, or let
// tools/qa/run_qa.py drive it headlessly.

(function (global) {
  'use strict';

  // ── Tiny assertion harness ────────────────────────────────────────────────

  function Suite() {
    this.results = [];
  }

  Suite.prototype.test = function (name, fn) {
    try {
      fn();
      this.results.push({ name: name, ok: true });
    } catch (error) {
      this.results.push({
        name: name,
        ok: false,
        detail: (error && error.message) || String(error)
      });
    }
  };

  function fail(message) { throw new Error(message); }

  function assert(condition, message) {
    if (!condition) fail(message || 'assertion failed');
  }

  function assertEqual(actual, expected, message) {
    if (actual !== expected) {
      fail((message || 'not equal') + ': expected ' + JSON.stringify(expected) +
        ', got ' + JSON.stringify(actual));
    }
  }

  function assertClose(actual, expected, tolerance, message) {
    if (Math.abs(actual - expected) > (tolerance == null ? 1e-6 : tolerance)) {
      fail((message || 'not close') + ': expected ~' + expected + ', got ' + actual);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  var Layout;

  function region(over) {
    var base = {
      page: 0, left: 100, baselineTop: 200, width: 200,
      maxLines: 1, lineHeight: 13.5
    };
    Object.keys(over || {}).forEach(function (key) { base[key] = over[key]; });
    return base;
  }

  function layout(font, value, spec) {
    var options = { size: 12, minSize: 9 };
    Object.keys(spec || {}).forEach(function (key) { options[key] = spec[key]; });
    options.regions = (options.regionSpecs || [region()]).map(function (r, i) {
      return Layout.normalizeRegion(r, { flowRegions: options.regionSpecs || [] }, i);
    });
    delete options.regionSpecs;
    return Layout.layoutValue(font, value, options);
  }

  function textOf(result) {
    return result.lines.map(function (line) { return line.text; });
  }

  // A width that exactly holds `text` at `size`, plus a small margin.
  function widthFor(font, text, size, margin) {
    return font.widthOfTextAtSize(text, size) + (margin == null ? 1 : margin);
  }

  // ── Specs ─────────────────────────────────────────────────────────────────

  function run(font) {
    Layout = global.CRMDocumentEngine.textLayout;
    var suite = new Suite();
    var t = suite.test.bind(suite);

    // ── Policy constants ────────────────────────────────────────────────────

    t('policy constants expose the 9 pt floor and 12 pt preferred size', function () {
      assertEqual(Layout.MIN_DYNAMIC_FONT_SIZE, 9, 'min');
      assertEqual(Layout.PREFERRED_DYNAMIC_FONT_SIZE, 12, 'preferred');
      assertEqual(Layout.SIZE_STEP, 0.25, 'step');
    });

    // ── Single-line fit at 12 pt ────────────────────────────────────────────

    t('short value fits on one line at the preferred 12 pt', function () {
      var value = 'Иванов Иван Иванович';
      var result = layout(font, value, {
        regionSpecs: [region({ width: widthFor(font, value, 12) })]
      });
      assert(result.fits, 'should fit');
      assertEqual(result.size, 12, 'size');
      assertEqual(result.strategy, 'single', 'strategy');
      assertEqual(result.shrunk, false, 'not shrunk');
      assertEqual(textOf(result).join('|'), value, 'text');
    });

    // ── Wrapping at 12 pt, before any shrinking ─────────────────────────────

    t('wraps at 12 pt rather than shrinking when the region allows two lines', function () {
      var value = 'Александров-Смирнов Константин Владиславович';
      var half = font.widthOfTextAtSize(value, 12) / 2 + 20;
      var result = layout(font, value, {
        regionSpecs: [region({ width: half, maxLines: 3 })]
      });
      assert(result.fits, 'should fit');
      assertEqual(result.size, 12, 'must not shrink when wrapping suffices');
      assert(result.lines.length > 1, 'should wrap onto more than one line');
      assertEqual(result.strategy, 'wrap', 'strategy');
    });

    t('prefers a continuation region over shrinking', function () {
      var value = 'Александров-Смирнов Константин Владиславович';
      var half = font.widthOfTextAtSize(value, 12) / 2 + 20;
      var result = layout(font, value, {
        regionSpecs: [region({ width: half }), region({ baselineTop: 214, width: half })]
      });
      assert(result.fits, 'should fit');
      assertEqual(result.size, 12, 'must not shrink when a second region suffices');
      assertEqual(result.strategy, 'flow', 'strategy');
      assertEqual(result.usedRegions.length, 2, 'both regions used');
    });

    // ── Multiple continuation regions, different widths ─────────────────────

    t('flows across three regions of different widths', function () {
      var value = '125009, Российская Федерация, город Москва, внутригородская ' +
        'территория муниципальный округ Пресненский, улица Большая Никитская, ' +
        'дом 128, корпус 4, строение 7, квартира 385';
      var result = layout(font, value, {
        regionSpecs: [
          region({ left: 121, baselineTop: 340, width: 180 }),
          region({ left: 75, baselineTop: 354, width: 300 }),
          region({ left: 75, baselineTop: 368, width: 435 })
        ]
      });
      assert(result.fits, 'should fit: ' + result.reason);
      assertEqual(result.strategy, 'flow', 'strategy');
      var integrity = Layout.verifyIntegrity(value, result.lines);
      assert(integrity.ok, 'no characters lost or duplicated');
      // Every line must respect the width of the region it landed in.
      result.lines.forEach(function (line) {
        var width = result.regions[line.regionIndex].width;
        assert(font.widthOfTextAtSize(line.text, result.size) <= width + 1e-6,
          'line ' + line.regionIndex + ' overflows its region width');
      });
    });

    t('region assignments carry regionIndex, page and text', function () {
      var value = 'Первая часть значения и вторая часть значения тоже';
      var result = layout(font, value, {
        regionSpecs: [
          region({ page: 0, width: 90 }),
          region({ page: 1, baselineTop: 100, width: 400 })
        ]
      });
      assert(result.fits, 'should fit');
      result.lines.forEach(function (line) {
        assert(typeof line.regionIndex === 'number', 'regionIndex');
        assert(typeof line.page === 'number', 'page');
        assert(typeof line.text === 'string', 'text');
      });
      var second = result.lines.filter(function (l) { return l.regionIndex === 1; });
      assert(second.length > 0, 'continuation region used');
      assertEqual(second[0].page, 1, 'continuation keeps its own page');
    });

    // ── Wrapping followed by shrinking ──────────────────────────────────────

    t('shrinks only after every approved line has been used', function () {
      var value = 'Отделение по вопросам миграции Управления Министерства внутренних ' +
        'дел Российской Федерации по Центральному административному округу города Москвы';
      var narrow = 120;
      var two = layout(font, value, {
        regionSpecs: [region({ width: narrow, maxLines: 2 })]
      });
      var many = layout(font, value, {
        regionSpecs: [region({ width: narrow, maxLines: 12 })]
      });
      assert(many.fits, 'plenty of lines should fit at the preferred size');
      assertEqual(many.size, 12, 'no shrink needed with enough lines');
      assert(two.size < 12, 'with only two lines the engine must shrink');
      assert(two.size >= 9, 'never below the floor');
    });

    t('recomputes the whole wrap at every candidate size', function () {
      // Find a width where the value genuinely needs three lines at 12 pt but
      // fits in two once the engine steps down — the wrap has to be redone at
      // the smaller size, not merely scaled.
      var value = 'Общество с ограниченной ответственностью Инвестиционные Технологии';
      var found = null;
      for (var width = 90; width <= 400 && !found; width += 2) {
        var tight = layout(font, value, {
          regionSpecs: [region({ width: width, maxLines: 2 })]
        });
        var roomy = layout(font, value, {
          regionSpecs: [region({ width: width, maxLines: 8 })]
        });
        if (tight.fits && tight.size < 12 && roomy.fits && roomy.size === 12 &&
            roomy.lines.length > 2) {
          found = { width: width, tight: tight, roomy: roomy };
        }
      }
      assert(found, 'no width exercises re-wrapping at a smaller size');
      assertEqual(found.tight.lines.length, 2, 're-wrapped into the two available lines');
      assert(found.tight.size >= 9, 'never below the floor');
      found.tight.lines.forEach(function (line) {
        assert(font.widthOfTextAtSize(line.text, found.tight.size) <= found.width + 1e-6,
          'each line re-wrapped at the final size');
      });
      assert(Layout.verifyIntegrity(value, found.tight.lines).ok, 'integrity');
    });

    t('shrinks in 0.25 pt steps', function () {
      var value = 'Александров-Смирнов Константин Владиславович Дополнительное';
      var result = layout(font, value, {
        regionSpecs: [region({ width: 200, maxLines: 2 })]
      });
      if (result.fits && result.size < 12) {
        var steps = (12 - result.size) / 0.25;
        assertClose(steps, Math.round(steps), 1e-6, 'size lands on a 0.25 pt step');
      }
    });

    // ── The 9 pt floor ──────────────────────────────────────────────────────

    t('never returns a fitted size below 9 pt', function () {
      var value = 'Отделение по вопросам миграции Управления Министерства внутренних дел';
      var result = layout(font, value, {
        minSize: 9,
        regionSpecs: [region({ width: 60, maxLines: 1 })]
      });
      assert(result.size >= 9, 'size floor');
    });

    t('a configured minimum below 9 pt is raised to 9 pt, never honoured', function () {
      var value = 'Отделение по вопросам миграции Управления Министерства внутренних дел';
      var result = layout(font, value, {
        minSize: 6,
        regionSpecs: [region({ width: 60, maxLines: 1 })]
      });
      assert(!result.fits, 'must not squeeze the value in below the floor');
      assertEqual(result.size, 9, 'clamped to the floor');
      assertEqual(result.minSize, 9, 'reported minimum is the policy floor');
    });

    t('stops exactly at 9 pt when 9 pt is the last size that fits', function () {
      var value = 'Проверка точного нижнего предела';
      var at9 = font.widthOfTextAtSize(value, 9);
      var result = layout(font, value, {
        regionSpecs: [region({ width: at9 + 0.5, maxLines: 1 })]
      });
      assert(result.fits, 'should fit at the floor');
      assertEqual(result.size, 9, 'lands exactly on 9 pt');
    });

    // ── Explicit newlines ───────────────────────────────────────────────────

    t('preserves explicit line breaks', function () {
      var value = 'Первая строка\nВторая строка';
      var result = layout(font, value, {
        regionSpecs: [region({ width: 300 }), region({ baselineTop: 214, width: 300 })]
      });
      assert(result.fits, 'should fit');
      assertEqual(textOf(result).join('|'), 'Первая строка|Вторая строка', 'lines');
    });

    t('normalises repeated whitespace without losing words', function () {
      var result = layout(font, '  Иванов   \t Иван    Иванович  ', {
        regionSpecs: [region({ width: 400 })]
      });
      assert(result.fits, 'should fit');
      assertEqual(textOf(result).join('|'), 'Иванов Иван Иванович', 'collapsed');
    });

    t('never produces an empty first or last line', function () {
      var result = layout(font, '\n\nЗначение\n\n', {
        regionSpecs: [region({ width: 300, maxLines: 4 })]
      });
      assert(result.fits, 'should fit');
      assertEqual(result.lines.length, 1, 'one printed line');
      assertEqual(result.lines[0].text, 'Значение', 'text');
    });

    // ── Russian ─────────────────────────────────────────────────────────────

    t('wraps a long Russian address on word boundaries', function () {
      var value = '125009, Российская Федерация, город Москва, улица Большая ' +
        'Никитская, дом 128, корпус 4, строение 7, квартира 385';
      var result = layout(font, value, {
        regionSpecs: [region({ width: 200, maxLines: 6 })]
      });
      assert(result.fits, 'should fit');
      assert(Layout.verifyIntegrity(value, result.lines).ok, 'integrity');
      textOf(result).forEach(function (line) {
        assert(line === line.trim(), 'no stray edge whitespace: "' + line + '"');
        assert(line.length > 0, 'no empty line');
      });
    });

    t('keeps a Russian hyphenated surname whole when it fits', function () {
      var value = 'Александров-Смирнов Константин Владиславович';
      var result = layout(font, value, {
        regionSpecs: [region({ width: widthFor(font, 'Александров-Смирнов', 12), maxLines: 4 })]
      });
      assert(result.fits, 'should fit');
      assertEqual(result.lines[0].text, 'Александров-Смирнов', 'surname kept whole');
    });

    t('long Russian issuing authority flows into continuation lines at 12 pt', function () {
      var value = 'Отделение по вопросам миграции Управления Министерства внутренних ' +
        'дел Российской Федерации по Центральному административному округу города Москвы';
      var result = layout(font, value, {
        regionSpecs: [
          region({ width: 352, maxLines: 1 }),
          region({ baselineTop: 214, width: 435, maxLines: 3 })
        ]
      });
      assert(result.fits, 'should fit: ' + result.reason);
      assertEqual(result.size, 12, 'no shrinking needed');
      assert(Layout.verifyIntegrity(value, result.lines).ok, 'integrity');
    });

    // ── English ─────────────────────────────────────────────────────────────

    t('wraps a long English name on word boundaries', function () {
      var value = 'Christopher Alexander Montgomery-Wellington';
      var result = layout(font, value, {
        regionSpecs: [region({ width: 150, maxLines: 4 })]
      });
      assert(result.fits, 'should fit');
      assert(Layout.verifyIntegrity(value, result.lines).ok, 'integrity');
    });

    t("preserves an apostrophe name", function () {
      var value = "O'Connor";
      var result = layout(font, value, {
        regionSpecs: [region({ width: widthFor(font, value, 12) })]
      });
      assert(result.fits, 'should fit');
      assertEqual(result.lines[0].text, "O'Connor", 'apostrophe preserved');
    });

    t('keeps Smith-Jones whole when it fits', function () {
      var value = 'Smith-Jones';
      var result = layout(font, value, {
        regionSpecs: [region({ width: widthFor(font, value, 12) })]
      });
      assert(result.fits, 'should fit');
      assertEqual(result.lines[0].text, 'Smith-Jones', 'kept whole');
    });

    t('long English address and foreign company name flow correctly', function () {
      var address = 'Apartment 148, Building 27, Saint Christopher International ' +
        'Business Park, King George the Fifth Avenue, London, United Kingdom, SW1A 2AA';
      var company = 'International Securities Infrastructure and Investment ' +
        'Technologies Holdings Limited';
      [address, company].forEach(function (value) {
        var result = layout(font, value, {
          regionSpecs: [
            region({ width: 200 }),
            region({ baselineTop: 214, width: 260 }),
            region({ baselineTop: 228, width: 300, maxLines: 4 })
          ]
        });
        assert(result.fits, 'should fit: ' + value.slice(0, 30));
        assert(Layout.verifyIntegrity(value, result.lines).ok, 'integrity');
      });
    });

    // ── Hyphenated / unbreakable tokens ─────────────────────────────────────

    t('splits an over-wide token at an existing hyphen, keeping the hyphen', function () {
      var value = 'Александров-Смирнов';
      var head = 'Александров-';
      // Both regions are equally narrow, so there is no wider line to move the
      // token to: the only lawful way to print it is the hyphen already in it.
      var width = widthFor(font, head, 9);
      var result = layout(font, value, {
        regionSpecs: [
          region({ width: width }),
          region({ baselineTop: 214, width: width })
        ]
      });
      assert(result.fits, 'should fit: ' + result.reason);
      assertEqual(result.size, 9, 'shrinks to the floor before splitting');
      assertEqual(result.lines[0].text, head, 'hyphen stays on the first line');
      assertEqual(result.lines[1].text, 'Смирнов', 'remainder continues');
      assert(Layout.verifyIntegrity(value, result.lines).ok, 'integrity');
    });

    t('moves an over-wide token to a wider approved line before splitting it', function () {
      var value = 'Александров-Смирнов';
      var result = layout(font, value, {
        regionSpecs: [
          region({ width: widthFor(font, 'Александров-', 9) }),
          region({ baselineTop: 214, width: 300 })
        ]
      });
      assert(result.fits, 'should fit: ' + result.reason);
      assertEqual(result.lines.length, 1, 'printed whole on the wider line');
      assertEqual(result.lines[0].regionIndex, 1, 'used the wider continuation');
      assertEqual(result.lines[0].text, value, 'surname kept intact');
    });

    t('reports an unbreakable token instead of inventing a split', function () {
      var value = 'ЭТОТОЧЕНЬДЛИННЫЙНЕРАЗРЫВНЫЙТОКЕНБЕЗПРОБЕЛОВИДЕФИСОВ';
      var result = layout(font, value, {
        regionSpecs: [region({ width: 40, maxLines: 3 })]
      });
      assert(!result.fits, 'must not fit');
      assertEqual(result.reason, 'unbreakable-token', 'reason');
      assertEqual(result.token, value, 'reports the offending token');
      assertEqual(result.size, 9, 'measured at the floor');
    });

    t('tokenBreak "anywhere" splits a machine identifier deterministically', function () {
      var value = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJ';
      var spec = {
        tokenBreak: 'anywhere',
        regionSpecs: [region({ width: 60, maxLines: 6 })]
      };
      var first = layout(font, value, spec);
      var second = layout(font, value, spec);
      assert(first.fits, 'should fit with an approved split rule');
      assertEqual(textOf(first).join('|'), textOf(second).join('|'), 'deterministic');
      assert(Layout.verifyIntegrity(value, first.lines).ok, 'integrity');
    });

    t('never breaks a token without an approved rule even when regions remain', function () {
      var value = 'ОченьДлинноеСловоБезРазделителейКотороеНеПоместится';
      var result = layout(font, value, {
        regionSpecs: [region({ width: 30 }), region({ baselineTop: 214, width: 30 })]
      });
      assert(!result.fits, 'must report rather than split');
      assertEqual(result.reason, 'unbreakable-token', 'reason');
    });

    // ── Determinism and integrity ───────────────────────────────────────────

    t('repeated layout of the same input is byte-identical', function () {
      var value = 'Отделение по вопросам миграции ОМВД России по Пресненскому району ' +
        'города Москвы, подразделение 770-001';
      var spec = {
        regionSpecs: [region({ width: 170 }), region({ baselineTop: 214, width: 220, maxLines: 3 })]
      };
      var a = layout(font, value, spec);
      var b = layout(font, value, spec);
      assertEqual(JSON.stringify(textOf(a)), JSON.stringify(textOf(b)), 'identical lines');
      assertEqual(a.size, b.size, 'identical size');
    });

    t('no characters are missing or duplicated across many shapes', function () {
      var values = [
        'Александров-Смирнов Константин Владиславович',
        'Christopher Alexander Montgomery-Wellington',
        "O'Connor",
        'Smith-Jones',
        '125009, Россия, г. Москва, ул. Тверская, д. 14, кв. 38',
        'Публичное акционерное общество «Международные Инвестиционные Технологии»',
        'BR-2026/00444-INTERNATIONAL-00000000000000017',
        '40817810099910004312 в АО «БАНК» г. Москва, БИК 044525225'
      ];
      values.forEach(function (value) {
        [80, 140, 200, 320].forEach(function (width) {
          var result = layout(font, value, {
            regionSpecs: [
              region({ width: width }),
              region({ baselineTop: 214, width: width }),
              region({ baselineTop: 228, width: width, maxLines: 8 })
            ],
            tokenBreak: 'anywhere'
          });
          if (!result.fits) return;
          var integrity = Layout.verifyIntegrity(value, result.lines);
          assert(integrity.ok, 'integrity for "' + value.slice(0, 24) + '" @' + width +
            ': ' + integrity.expected.slice(0, 40) + ' vs ' + integrity.actual.slice(0, 40));
        });
      });
    });

    t('a line never contains only punctuation', function () {
      var value = 'Москва , улица Тверская , дом 14 , квартира 38';
      var result = layout(font, value, {
        regionSpecs: [region({ width: 70, maxLines: 12 })]
      });
      assert(result.fits, 'should fit');
      textOf(result).forEach(function (line) {
        assert(!/^[.,;:!?)\]}»"'’”–—-]+$/.test(line),
          'punctuation-only line: "' + line + '"');
      });
    });

    // ── Overflow diagnostics ────────────────────────────────────────────────

    t('final overflow reports actionable diagnostics', function () {
      var value = 'Отделение по вопросам миграции Управления Министерства внутренних ' +
        'дел Российской Федерации по Центральному административному округу города Москвы';
      var result = layout(font, value, {
        regionSpecs: [region({ width: 60, maxLines: 1 })]
      });
      assert(!result.fits, 'must not fit');
      assertEqual(result.strategy, 'overflow', 'strategy');
      assertEqual(result.reason, 'no-space', 'reason');
      assertEqual(result.minSize, 9, 'minimum size reported');
      assertEqual(result.regionCount, 1, 'region count reported');
      assertEqual(result.lineCapacity, 1, 'line capacity reported');
      assert(typeof result.remaining === 'string' && result.remaining.length > 0,
        'reports what did not fit');
    });

    // ── Backward compatibility ──────────────────────────────────────────────

    t('a field without flowRegions keeps its geometry as an implicit region', function () {
      var field = {
        page: 2, left: 56.6, baselineTop: 118.8, width: 352.6,
        fontSize: 12, minFontSize: 9
      };
      var regions = Layout.regionsFor(field);
      assertEqual(regions.length, 1, 'one implicit region');
      assertEqual(regions[0].page, 2, 'page');
      assertEqual(regions[0].left, 56.6, 'left');
      assertEqual(regions[0].baselineTop, 118.8, 'baselineTop');
      assertEqual(regions[0].width, 352.6, 'width');
      assertEqual(regions[0].maxLines, 1, 'single line by default');
    });

    t('a legacy multiline field without maxLines stays unbounded', function () {
      var regions = Layout.regionsFor({
        page: 0, left: 10, baselineTop: 20, width: 100, multiline: true
      });
      assertEqual(regions[0].maxLines, null, 'unbounded');
    });

    t('legacy fitText still works and honours the floor', function () {
      var value = 'Отделение по вопросам миграции Управления Министерства';
      var fit = Layout.fitText(font, value, {
        size: 12, minSize: 6, maxWidth: 400, multiline: false
      });
      assert(fit.size >= 9, 'floor honoured through the legacy helper');
      assert(Array.isArray(fit.lines) && typeof fit.lines[0] === 'string',
        'legacy string lines');
    });

    t('an explicit lineHeight is physical geometry and does not scale', function () {
      var regions = [Layout.normalizeRegion(
        region({ width: 100, maxLines: 3, lineHeight: 13.5 }), {}, 0)];
      assertEqual(Layout.lineHeightAt(regions[0], 12), 13.5, 'at 12 pt');
      assertEqual(Layout.lineHeightAt(regions[0], 9), 13.5, 'at 9 pt');
    });

    return suite.results;
  }

  global.CRMLayoutSpec = { run: run };

}(typeof window !== 'undefined' ? window : this));
