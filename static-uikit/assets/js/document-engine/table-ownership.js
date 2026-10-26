// Declarative table-cell ownership and runtime ink audit.
//
// A field's `maxHeight` proves only that the layout stayed inside the box the
// map happened to declare.  Questionnaire maps additionally declare the
// printed table cell that owns each dynamic value.  This module independently
// checks the declaration and the exact line plan that the renderer will draw.
(function (global) {
  'use strict';

  var ns = global.CRMDocumentEngine = global.CRMDocumentEngine || {};
  var Ownership = {};
  var EPS = 0.05;

  function number(value) {
    var out = Number(value);
    return Number.isFinite(out) ? out : null;
  }

  function round(value) {
    return Math.round(Number(value) * 1000) / 1000;
  }

  function pageSize(pages, index) {
    var page = pages && pages[index];
    if (!page) return null;
    if (typeof page.getSize === 'function') return page.getSize();
    if (number(page.width) != null && number(page.height) != null) return page;
    return null;
  }

  function fieldIndex(template) {
    var out = {};
    (template.fields || []).forEach(function (field) {
      if (field && field.id) out[field.id] = field;
    });
    return out;
  }

  function budgetIndex(template) {
    var out = {};
    (template.tableBudgets || []).forEach(function (budget) {
      if (budget && budget.id) out[budget.id] = budget;
    });
    return out;
  }

  function exemptionIndex(template) {
    var out = {};
    (template.ownershipExemptions || []).forEach(function (entry) {
      var id = typeof entry === 'string' ? entry : entry && entry.fieldId;
      if (id) out[id] = entry;
    });
    return out;
  }

  function horizontalBorders(owner) {
    var borders = owner && owner.affectedBorders;
    if (Array.isArray(borders)) return borders;
    return borders && Array.isArray(borders.horizontal)
      ? borders.horizontal : [];
  }

  function verticalBorders(owner) {
    var borders = owner && owner.affectedBorders;
    return borders && Array.isArray(borders.vertical)
      ? borders.vertical : [];
  }

  function sameNumbers(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (var i = 0; i < a.length; i += 1) {
      if (Math.abs(Number(a[i]) - Number(b[i])) > EPS) return false;
    }
    return true;
  }

  function boundsOf(owner) {
    var source = owner && owner.bounds || owner || {};
    return {
      left: number(source.left), top: number(source.top),
      right: number(source.right), bottom: number(source.bottom)
    };
  }

  function validBounds(bounds) {
    return bounds.left != null && bounds.top != null && bounds.right != null &&
      bounds.bottom != null && bounds.right > bounds.left + EPS &&
      bounds.bottom > bounds.top + EPS;
  }

  function mutuallyExclusive(a, b, fields) {
    var fa = fields[a.fieldId] || {};
    var fb = fields[b.fieldId] || {};
    var ca = fa.showWhen;
    var cb = fb.showWhen;
    if (!ca || !cb || !ca.source || ca.source !== cb.source) return false;
    if (Object.prototype.hasOwnProperty.call(ca, 'equals') &&
        Object.prototype.hasOwnProperty.call(cb, 'equals')) {
      return ca.equals !== cb.equals;
    }
    return false;
  }

  function overlapAllowed(a, b, fields) {
    if (a.variantGroup && a.variantGroup === b.variantGroup) return true;
    if ((a.allowOverlapWith || []).indexOf(b.fieldId) !== -1) return true;
    if ((b.allowOverlapWith || []).indexOf(a.fieldId) !== -1) return true;
    return mutuallyExclusive(a, b, fields);
  }

  function intersects(a, b) {
    return Math.min(a.right, b.right) - Math.max(a.left, b.left) > EPS &&
      Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > EPS;
  }

  function validateTemplate(template, pages) {
    var problems = [];
    var fields = fieldIndex(template);
    var budgets = {};
    var owners = {};
    var ownerList = template.cellOwnership || [];
    var exemptions = exemptionIndex(template);

    if (template.tableOwnershipRequired && !ownerList.length) {
      problems.push('tableOwnershipRequired is set but cellOwnership is empty');
    }

    (template.tableBudgets || []).forEach(function (budget, index) {
      var at = 'tableBudgets[' + index + ']';
      if (!budget || !String(budget.id || '').trim()) {
        problems.push(at + ': id is required');
        return;
      }
      if (budgets[budget.id]) problems.push(at + ': duplicate id "' + budget.id + '"');
      budgets[budget.id] = budget;
      var page = number(budget.page);
      var top = number(budget.top);
      var bottom = number(budget.bottom);
      var maximum = number(budget.maxGrowth);
      var size = page != null ? pageSize(pages, page) : null;
      if (!Number.isInteger(page) || page < 0 || !size) {
        problems.push(at + ': page must identify a loaded PDF page');
      } else if (top == null || bottom == null || top < -EPS ||
                 bottom <= top + EPS || bottom > Number(size.height) + 0.5) {
        problems.push(at + ': top/bottom are outside the page or reversed');
      }
      if (maximum == null || maximum < 0) {
        problems.push(at + ': maxGrowth must be a non-negative number');
      }
      if (budget.reviewStatus !== 'approved') {
        problems.push(at + ': table budget is not visually approved');
      }
    });

    ownerList.forEach(function (owner, index) {
      var at = 'cellOwnership[' + index + ']';
      if (!owner || !String(owner.fieldId || '').trim()) {
        problems.push(at + ': fieldId is required');
        return;
      }
      if (owners[owner.fieldId]) {
        problems.push(at + ': duplicate ownership for "' + owner.fieldId + '"');
      }
      if (exemptions[owner.fieldId]) {
        problems.push(at + ': field cannot have both cell ownership and an exemption');
      }
      owners[owner.fieldId] = owner;
      var field = fields[owner.fieldId];
      if (!field) {
        problems.push(at + ': field "' + owner.fieldId + '" does not exist');
        return;
      }
      if (owner.source !== field.source) {
        problems.push(at + ': source must exactly match ' + owner.fieldId + '.source');
      }
      if (number(owner.page) !== number(field.page)) {
        problems.push(at + ': page must exactly match ' + owner.fieldId + '.page');
      }
      if (!String(owner.tableId || '').trim() || !String(owner.rowId || '').trim()) {
        problems.push(at + ': tableId and rowId are required');
      }
      var bounds = boundsOf(owner);
      var size = pageSize(pages, number(owner.page));
      if (!validBounds(bounds)) {
        problems.push(at + ': left/top/right/bottom must define a positive cell');
      } else if (size && (bounds.left < -EPS || bounds.top < -EPS ||
                 bounds.right > Number(size.width) + 0.5 ||
                 bounds.bottom > Number(size.height) + 0.5)) {
        problems.push(at + ': owning cell lies outside the PDF page');
      }
      var reviewedLines = number(owner.maxReviewedLines);
      if (!Number.isInteger(reviewedLines) || reviewedLines < 1) {
        problems.push(at + ': maxReviewedLines must be a positive integer');
      }
      if (owner.reviewStatus !== 'approved') {
        problems.push(at + ': owning cell is not visually approved');
      }
      if (owner.canGrow) {
        if (!field.expansion || field.overflowStrategy !== 'expand-layout' ||
            field.expansion.reviewStatus !== 'approved') {
          problems.push(at + ': a growing cell needs an approved field expansion');
        }
        if (!String(owner.nextRowId || '').trim()) {
          problems.push(at + ': a growing cell must name nextRowId');
        }
        if (!horizontalBorders(owner).length) {
          problems.push(at + ': a growing cell must name its affectedBorders');
        }
        if ((field.expansion || {}).lineStyle !== 'table-row') {
          problems.push(at + ': a growing table cell must use table-row expansion');
        }
        if (!verticalBorders(owner).length ||
            !sameNumbers(verticalBorders(owner), (field.expansion || {}).columns || [])) {
          problems.push(at + ': affected vertical borders must exactly match expansion.columns');
        }
        var insertionTop = number((field.expansion || {}).insertionTop);
        if (insertionTop == null || !horizontalBorders(owner).some(function (border) {
          return Math.abs(Number(borderTop(border, owner)) - insertionTop) <= 0.5;
        })) {
          problems.push(at + ': affected horizontal borders do not include the growth cut');
        }
        if (!owner.budgetId || !budgets[owner.budgetId]) {
          problems.push(at + ': a growing cell must reference a table budget');
        }
      } else if (owner.budgetId && !budgets[owner.budgetId]) {
        problems.push(at + ': unknown budgetId "' + owner.budgetId + '"');
      }
      if (owner.budgetId && budgets[owner.budgetId]) {
        var budget = budgets[owner.budgetId];
        if (number(budget.page) !== number(owner.page) ||
            (budget.tableId && budget.tableId !== owner.tableId)) {
          problems.push(at + ': table budget belongs to another page or table');
        }
        if (validBounds(bounds) && (bounds.top < Number(budget.top) - EPS ||
            bounds.bottom > Number(budget.bottom) + EPS)) {
          problems.push(at + ': owning cell lies outside its table budget bounds');
        }
      }
    });

    for (var i = 0; i < ownerList.length; i += 1) {
      for (var j = i + 1; j < ownerList.length; j += 1) {
        var a = ownerList[i], b = ownerList[j];
        if (!a || !b || number(a.page) !== number(b.page) ||
            overlapAllowed(a, b, fields)) continue;
        var ab = boundsOf(a), bb = boundsOf(b);
        if (validBounds(ab) && validBounds(bb) && intersects(ab, bb)) {
          problems.push('cellOwnership: "' + a.fieldId + '" and "' + b.fieldId +
            '" claim overlapping cell geometry');
        }
      }
    }

    // Rendering the same exact source twice in one table is usually the
    // address-duplication defect this registry exists to prevent. A source
    // form may explicitly request the same value in two different rows; that
    // exception must be named and explained on both owners.
    for (var sourceA = 0; sourceA < ownerList.length; sourceA += 1) {
      for (var sourceB = sourceA + 1; sourceB < ownerList.length; sourceB += 1) {
        var first = ownerList[sourceA], second = ownerList[sourceB];
        if (!first || !second || first.source !== second.source ||
            number(first.page) !== number(second.page) ||
            first.tableId !== second.tableId ||
            mutuallyExclusive(first, second, fields)) continue;
        var group = String(first.sourceRepeatGroup || '').trim();
        if (!group || group !== String(second.sourceRepeatGroup || '').trim() ||
            !String(first.sourceRepeatReason || '').trim() ||
            !String(second.sourceRepeatReason || '').trim()) {
          problems.push('cellOwnership: repeated source "' + first.source +
            '" in one table needs one explained sourceRepeatGroup');
        }
      }
    }

    if (template.tableOwnershipRequired) {
      (template.fields || []).forEach(function (field) {
        if (!field || (field.type || 'text') === 'static') return;
        if (owners[field.id]) return;
        var exemption = exemptions[field.id];
        if (!exemption) {
          problems.push(field.id + ': dynamic field has no cellOwnership or ownershipExemption');
          return;
        }
        if (typeof exemption !== 'object' || !String(exemption.reason || '').trim() ||
            exemption.reviewStatus !== 'approved') {
          problems.push(field.id + ': ownershipExemption needs an approved reason');
        }
        if (typeof exemption === 'object' && exemption.source !== field.source) {
          problems.push(field.id + ': ownershipExemption source must exactly match the field');
        }
        if (typeof exemption === 'object' && number(exemption.page) !== number(field.page)) {
          problems.push(field.id + ': ownershipExemption page must exactly match the field');
        }
      });
      (template.ownershipExemptions || []).forEach(function (entry, index) {
        var field = entry && fields[entry.fieldId];
        if (!field) problems.push('ownershipExemptions[' + index +
          ']: field "' + String(entry && entry.fieldId || '') + '" does not exist');
      });
    }

    return problems;
  }

  function shiftAt(plans, page, top) {
    var expander = ns.pageExpander;
    return expander && typeof expander.shiftAt === 'function'
      ? expander.shiftAt(plans && plans[page], top) : 0;
  }

  function shiftedBounds(owner, plans) {
    var bounds = boundsOf(owner);
    var page = number(owner.page);
    return {
      left: bounds.left,
      right: bounds.right,
      top: bounds.top + shiftAt(plans, page, bounds.top),
      bottom: bounds.bottom + shiftAt(plans, page, bounds.bottom)
    };
  }

  function borderTop(border, owner) {
    if (typeof border === 'number') return border;
    if (border && number(border.top) != null) return number(border.top);
    if (border && number(border.y) != null) return number(border.y);
    if (border === 'top') return boundsOf(owner).top;
    if (border === 'bottom') return boundsOf(owner).bottom;
    return null;
  }

  function lineInk(field, result, line, fonts) {
    var region = (result.regions || result.layout.regions || [])[line.regionIndex];
    if (!region) return null;
    var font = fonts[field.font || 'legalSerif'];
    if (!font) return null;
    var size = Number(result.layout.size);
    var lineHeight = ns.textLayout.lineHeightAt(region, size);
    var baseline = Number(region.baselineTop) - Number(region.baselineShift || 0) +
      Number(line.lineIndex || 0) * lineHeight;
    var ascent = typeof font.heightAtSize === 'function'
      ? Number(font.heightAtSize(size, { descender: false })) : size * 0.78;
    // Table maps review available vertical room to the text baseline: the
    // printed rule below a value is an underline/border, not extra descender
    // leading. pdf-lib's font-wide height delta is not a glyph bound (for
    // Liberation Serif it is about 4.9 pt at 11 pt), so treating it as the
    // current line's descent reports false border crossings. Match the page
    // expander and measure_field_room convention and audit through baseline.
    var indent = Number(line.lineIndex || 0) === 0
      ? Number(region.firstLineIndent || 0) : 0;
    var available = Number(region.width) - indent;
    var width = ns.textLayout.widthOf(font, line.text, size);
    var offset = ns.textLayout.alignOffset(region.align, width, available);
    return {
      page: Number(region.page),
      left: Number(region.left) + indent + offset,
      right: Number(region.left) + indent + offset + width,
      top: baseline - ascent,
      bottom: baseline,
      baselineTop: baseline,
      size: size,
      text: line.text,
      regionIndex: line.regionIndex,
      lineIndex: line.lineIndex
    };
  }

  function rowsAdded(plans, fieldId) {
    var count = 0;
    Object.keys(plans || {}).forEach(function (page) {
      ((plans[page] || {}).rows || []).forEach(function (row) {
        if (row.fieldId === fieldId) count += 1;
      });
    });
    return count;
  }

  function addedRows(plans, fieldId) {
    var rows = [];
    Object.keys(plans || {}).forEach(function (page) {
      ((plans[page] || {}).rows || []).forEach(function (row) {
        if (row.fieldId === fieldId) rows.push(row);
      });
    });
    return rows;
  }

  function violation(owner, field, reason, message, ink) {
    return {
      fieldId: owner.fieldId,
      source: field && field.source || owner.source || null,
      page: number(owner.page),
      rowId: owner.rowId || null,
      tableId: owner.tableId || null,
      reason: reason,
      message: message,
      ink: ink || null
    };
  }

  function auditPlan(template, planned, plans, fonts) {
    var violations = [];
    var metrics = [];
    var fields = fieldIndex(template);
    var owners = template.cellOwnership || [];
    var activeInk = [];
    var renderedGroups = {};
    var renderedSources = {};

    owners.forEach(function (owner) {
      var field = fields[owner.fieldId] || {};
      var result = planned && planned.byField && planned.byField[owner.fieldId];
      var cell = shiftedBounds(owner, plans);
      var grownRows = addedRows(plans, owner.fieldId);
      var added = grownRows.length;
      var lines = [];
      if (result && result.drawn && result.layout) {
        if (owner.renderOnceGroup) {
          (renderedGroups[owner.renderOnceGroup] =
            renderedGroups[owner.renderOnceGroup] || []).push(owner.fieldId);
        }
        var sourceKey = [owner.source || field.source || '', owner.page,
          owner.tableId || ''].join('|');
        (renderedSources[sourceKey] = renderedSources[sourceKey] || []).push(owner);
        (result.layout.lines || []).forEach(function (line) {
          var ink = lineInk(field, result, line, fonts);
          if (!ink) return;
          lines.push(ink);
          activeInk.push({ owner: owner, field: field, ink: ink });
          var inset = number(owner.inkInset);
          inset = inset == null ? 0.15 : inset;
          if (ink.page !== number(owner.page) || ink.left < cell.left + inset - EPS ||
              ink.right > cell.right - inset + EPS || ink.top < cell.top + inset - EPS ||
              ink.bottom > cell.bottom - inset + EPS) {
            violations.push(violation(owner, field, 'outside-owning-cell',
              'printed text leaves its reviewed owning cell', ink));
          }
          horizontalBorders(owner).forEach(function (border) {
            var rawTop = borderTop(border, owner);
            if (rawTop == null) return;
            var top = rawTop + shiftAt(plans, number(owner.page), rawTop);
            if (top > ink.top + EPS && top < ink.bottom - EPS) {
              violations.push(violation(owner, field, 'horizontal-border-intersection',
                'printed text intersects a reviewed horizontal border at ' + round(top) + ' pt', ink));
            }
          });
        });
      }
      var allowedLines = number(owner.maxReviewedLines);
      if (allowedLines != null && owner.canGrow) allowedLines += added;
      if (allowedLines != null && lines.length > allowedLines) {
        violations.push(violation(owner, field, 'unreviewed-line-count',
          'printed ' + lines.length + ' lines; reviewed capacity is ' + allowedLines));
      }
      grownRows.forEach(function (row) {
        var region = row.region || {};
        var tableRow = region.tableRow || {};
        if (!region.tableRow ||
            !sameNumbers(tableRow.columns || [], verticalBorders(owner))) {
          violations.push(violation(owner, field, 'grown-border-discontinuity',
            'a grown row does not continue every reviewed vertical border'));
        }
      });
      metrics.push({
        fieldId: owner.fieldId,
        source: owner.source || field.source || null,
        page: number(owner.page),
        tableId: owner.tableId || null,
        rowId: owner.rowId || null,
        bounds: {
          left: round(cell.left), top: round(cell.top),
          right: round(cell.right), bottom: round(cell.bottom)
        },
        lineCount: lines.length,
        rowExpansionCount: added,
        cumulativeShift: round(shiftAt(plans, number(owner.page), boundsOf(owner).top)),
        fontSize: result && result.drawn && result.layout
          ? round(result.layout.size) : null,
        sourceRepeatGroup: owner.sourceRepeatGroup || null,
        drawn: !!(result && result.drawn)
      });
    });

    for (var i = 0; i < activeInk.length; i += 1) {
      for (var j = i + 1; j < activeInk.length; j += 1) {
        var a = activeInk[i], b = activeInk[j];
        if (a.ink.page !== b.ink.page || a.owner.fieldId === b.owner.fieldId ||
            overlapAllowed(a.owner, b.owner, fields)) continue;
        if (intersects(a.ink, b.ink)) {
          violations.push(violation(a.owner, a.field, 'dynamic-value-overlap',
            'printed text overlaps dynamic field "' + b.owner.fieldId + '"', a.ink));
        }
      }
    }

    Object.keys(renderedGroups).forEach(function (group) {
      var ids = renderedGroups[group];
      if (ids.length < 2) return;
      var owner = owners.filter(function (entry) {
        return entry.fieldId === ids[0];
      })[0] || {};
      violations.push(violation(owner, fields[ids[0]], 'duplicate-render-group',
        'one logical value was rendered more than once: ' + ids.join(', ')));
    });

    Object.keys(renderedSources).forEach(function (key) {
      var repeated = renderedSources[key];
      if (repeated.length < 2) return;
      var group = String(repeated[0].sourceRepeatGroup || '').trim();
      var explained = !!group && repeated.every(function (owner) {
        return String(owner.sourceRepeatGroup || '').trim() === group &&
          String(owner.sourceRepeatReason || '').trim();
      });
      if (explained) return;
      var owner = repeated[0];
      violations.push(violation(owner, fields[owner.fieldId],
        'duplicate-source-render', 'one logical source was rendered more than once: ' +
        repeated.map(function (entry) { return entry.fieldId; }).join(', ')));
    });

    var budgetTotals = {};
    Object.keys(plans || {}).forEach(function (page) {
      ((plans[page] || {}).consumption || []).forEach(function (entry) {
        var owner = owners.filter(function (candidate) {
          return candidate.fieldId === entry.fieldId;
        })[0];
        if (!owner || !owner.budgetId) return;
        budgetTotals[owner.budgetId] = (budgetTotals[owner.budgetId] || 0) +
          Number(entry.delta || 0);
      });
    });
    var budgets = budgetIndex(template);
    Object.keys(budgetTotals).forEach(function (id) {
      var maximum = budgets[id] && number(budgets[id].maxGrowth);
      if (maximum != null && budgetTotals[id] > maximum + EPS) {
        violations.push({
          fieldId: id, source: null, page: number(budgets[id].page),
          tableId: budgets[id].tableId || null, rowId: null,
          reason: 'table-budget-exceeded',
          message: 'table growth ' + round(budgetTotals[id]) +
            ' pt exceeds reviewed budget ' + round(maximum) + ' pt'
        });
      }
    });

    return {
      violations: violations,
      metrics: metrics,
      budgetUse: Object.keys(budgetTotals).sort().map(function (id) {
        return { id: id, used: round(budgetTotals[id]),
          maximum: budgets[id] ? round(budgets[id].maxGrowth) : null };
      })
    };
  }

  function fingerprint(audit) {
    if (!audit) return '';
    return (audit.metrics || []).map(function (entry) {
      return entry.fieldId + '@p' + entry.page + '/' + entry.rowId +
        ':lines=' + entry.lineCount + ':rows=' + entry.rowExpansionCount +
        ':shift=' + entry.cumulativeShift + ':size=' + entry.fontSize;
    }).concat((audit.violations || []).map(function (entry) {
      return 'violation=' + entry.fieldId + ':' + entry.reason;
    })).join('|');
  }

  Ownership.boundsOf = boundsOf;
  Ownership.validateTemplate = validateTemplate;
  Ownership.auditPlan = auditPlan;
  Ownership.fingerprint = fingerprint;
  ns.tableOwnership = Ownership;
}(typeof window !== 'undefined' ? window : this));
