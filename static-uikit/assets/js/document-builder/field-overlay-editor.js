(function (global) {
  'use strict';

  var ns = global.CRMDocumentBuilder = global.CRMDocumentBuilder || {};
  var SVG = 'http://www.w3.org/2000/svg';

  function svg(name, attrs) {
    var node = document.createElementNS(SVG, name);
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    return node;
  }

  function isEditingTarget(target) {
    return !!target.closest('input, textarea, select, [contenteditable="true"]');
  }

  function OverlayEditor(options) {
    this.state = options.state;
    this.viewer = options.viewer;
    this.svg = options.svg;
    this.getPayload = options.getPayload || function () { return null; };
    // Region assignments from the production layout engine, when the last
    // analysis run has produced them.
    this.getAssignments = options.getAssignments || function () { return null; };
    this.onCoordinates = options.onCoordinates || function () {};
    this.onMessage = options.onMessage || function () {};
    this.interaction = null;
    this.previewRect = null;
    this.fieldClipboard = null;
    this.guides = [];
    this._wire();
  }

  OverlayEditor.prototype._wire = function () {
    var self = this;
    this.svg.addEventListener('pointermove', function (event) {
      var point = self._eventPoint(event);
      self.onCoordinates(point);
      if (self.interaction) self._move(event, point);
    });
    this.svg.addEventListener('pointerdown', function (event) { self._down(event); });
    this.svg.addEventListener('pointerup', function (event) { self._up(event); });
    this.svg.addEventListener('pointercancel', function () { self.cancel(); });
    global.addEventListener('keydown', function (event) { self._key(event); });
  };

  OverlayEditor.prototype._eventPoint = function (event) {
    var bounds = this.svg.getBoundingClientRect();
    return this.viewer.cssToPdf(event.clientX - bounds.left, event.clientY - bounds.top);
  };

  OverlayEditor.prototype._snap = function (point, movingField) {
    if (!this.state.snapping) return point;
    var page = this.viewer.pages[this.state.pageIndex];
    var xs = [0, page.width / 2, page.width];
    var ys = [0, page.height / 2, page.height];
    (this.state.project.fields || []).forEach(function (field) {
      if (field.page !== movingField.page || field.id === movingField.id) return;
      var geometry = ns.schema.fieldGeometry(field);
      xs.push(Number(field.left), Number(field.left) + Number(field.width || field.boxSize || field.glyphSize || 0));
      ys.push(geometry.top, geometry.top + geometry.height, Number(field.baselineTop));
    });
    (this.viewer.textGuides || []).forEach(function (guide) {
      xs.push(guide.left, guide.left + guide.width);
      ys.push(guide.baselineTop);
    });
    var threshold = 5 / this.viewer.zoom;
    var bestX = null;
    var bestY = null;
    xs.forEach(function (candidate) {
      if (Math.abs(candidate - point.left) <= threshold && (!bestX || Math.abs(candidate - point.left) < bestX.distance)) {
        bestX = { value: candidate, distance: Math.abs(candidate - point.left) };
      }
    });
    ys.forEach(function (candidate) {
      if (Math.abs(candidate - point.top) <= threshold && (!bestY || Math.abs(candidate - point.top) < bestY.distance)) {
        bestY = { value: candidate, distance: Math.abs(candidate - point.top) };
      }
    });
    this.guides = [];
    if (bestX) { point.left = bestX.value; this.guides.push({ axis: 'x', value: bestX.value }); }
    if (bestY) { point.top = bestY.value; this.guides.push({ axis: 'y', value: bestY.value }); }
    return point;
  };

  OverlayEditor.prototype._down = function (event) {
    if (event.button !== 0 || this.state.tool === 'pan') return;
    var fieldNode = event.target.closest('[data-field-id]');
    var fieldId = fieldNode && fieldNode.getAttribute('data-field-id');
    var role = event.target.getAttribute('data-handle');
    var point = this._eventPoint(event);
    if (fieldId) {
      this.state.selectField(fieldId);
      var field = this.state.field(fieldId);
      if (!field || field.locked) return;
      this.interaction = {
        kind: role === 'resize' ? 'resize' : role === 'baseline' ? 'baseline' : 'move',
        fieldId: fieldId,
        start: point,
        original: ns.schema.clone(field)
      };
    } else if (['text', 'multiline', 'check', 'static'].indexOf(this.state.tool) !== -1) {
      this.interaction = { kind: 'draw', tool: this.state.tool, start: point, current: point };
      this.state.selectField(null);
    } else {
      this.state.selectField(null);
      return;
    }
    this.svg.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  OverlayEditor.prototype._move = function (_event, point) {
    var interaction = this.interaction;
    if (interaction.kind === 'draw') {
      interaction.current = this._snap(point, { page: this.state.pageIndex, id: '' });
    } else {
      var original = interaction.original;
      var dx = point.left - interaction.start.left;
      var dy = point.top - interaction.start.top;
      if (interaction.kind === 'move') {
        var snapped = this._snap({ left: Number(original.left) + dx, top: Number(original.top) + dy }, original);
        interaction.preview = {
          left: snapped.left,
          top: snapped.top,
          baselineTop: Number(original.baselineTop) + (snapped.top - Number(original.top))
        };
      } else if (interaction.kind === 'resize') {
        interaction.preview = {
          width: Math.max(2, Number(original.width || original.boxSize || original.glyphSize || 8.5) + dx),
          height: Math.max(2, Number(original.height || ns.schema.fieldGeometry(original).height) + dy)
        };
      } else if (interaction.kind === 'baseline') {
        interaction.preview = { baselineTop: Math.max(0, Number(original.baselineTop) + dy) };
      }
    }
    this.render();
  };

  OverlayEditor.prototype._up = function (event) {
    if (!this.interaction) return;
    var interaction = this.interaction;
    this.interaction = null;
    this.guides = [];
    try { this.svg.releasePointerCapture(event.pointerId); } catch (ignore) {}
    if (interaction.kind === 'draw') {
      var a = interaction.start;
      var b = interaction.current || a;
      var left = Math.min(a.left, b.left);
      var top = Math.min(a.top, b.top);
      var width = Math.max(4, Math.abs(b.left - a.left));
      var height = Math.max(4, Math.abs(b.top - a.top));
      var id = this.state.uniqueFieldId(interaction.tool === 'check' ? 'checkbox' : interaction.tool === 'static' ? 'static-text' : 'text-field');
      // New text fields follow the readability policy: 12 pt preferred, 9 pt
      // floor, and a leading that suits 12 pt text. A region tall enough for
      // more than one line of that text wraps by default — an extra line is
      // always better than smaller text.
      var policy = ns.schema.policy();
      var preferred = policy.preferredFontSize;
      var defaultLeading = Number((preferred * 1.15).toFixed(2));
      var fitsTwoLines = height >= defaultLeading * 2;
      var field = {
        id: id,
        type: interaction.tool === 'multiline' ? 'text' : interaction.tool,
        source: interaction.tool === 'static' ? undefined : '',
        text: interaction.tool === 'static' ? 'Статический overlay-текст' : undefined,
        page: this.state.pageIndex,
        left: Number(left.toFixed(2)),
        top: Number(top.toFixed(2)),
        height: Number(height.toFixed(2)),
        baselineTop: Number((top + (interaction.tool === 'check'
          ? Math.min(height, 8.5) * 0.78
          : preferred * 0.891)).toFixed(2)),
        width: Number(width.toFixed(2)),
        font: 'legalSerif',
        fontSize: interaction.tool === 'check' ? undefined : preferred,
        minFontSize: interaction.tool === 'check' ? undefined : policy.minFontSize,
        align: 'left',
        multiline: interaction.tool === 'multiline' ||
          (interaction.tool === 'text' && fitsTwoLines),
        lineHeight: interaction.tool === 'check' ? undefined : defaultLeading,
        maxHeight: interaction.tool === 'multiline' || fitsTwoLines
          ? Number(height.toFixed(2)) : undefined,
        maxLines: interaction.tool === 'multiline' || fitsTwoLines
          ? Math.max(1, Math.floor(height / defaultLeading)) : undefined,
        glyphSize: interaction.tool === 'check' ? 8.5 : undefined,
        boxSize: interaction.tool === 'check' ? Number(Math.min(width, height).toFixed(2)) : undefined,
        markStyle: interaction.tool === 'check' ? 'check' : undefined,
        locked: false,
        reviewStatus: 'unreviewed',
        anchorNote: ''
      };
      Object.keys(field).forEach(function (key) { if (field[key] === undefined) delete field[key]; });
      this.state.addField(field);
    } else if (interaction.preview) {
      var patch = interaction.preview;
      var original = interaction.original;
      if (interaction.kind === 'resize' && (original.type || 'text') === 'check') {
        patch.boxSize = Math.min(patch.width, patch.height);
        patch.glyphSize = Math.max(Number(original.glyphSize || 8.5), patch.boxSize);
        delete patch.width;
      }
      if (interaction.kind === 'resize' && original.multiline) patch.maxHeight = patch.height;
      Object.keys(patch).forEach(function (key) { patch[key] = Number(Number(patch[key]).toFixed(2)); });
      this.state.updateField(interaction.fieldId, patch, interaction.kind + ' field');
    }
    this.render();
  };

  OverlayEditor.prototype.cancel = function () {
    this.interaction = null;
    this.guides = [];
    this.render();
  };

  OverlayEditor.prototype._key = function (event) {
    if (isEditingTarget(event.target)) return;
    var command = event.ctrlKey || event.metaKey;
    var key = event.key.toLowerCase();
    if (command && key === 'z') {
      event.preventDefault();
      if (event.shiftKey) this.state.redo(); else this.state.undo();
      return;
    }
    if (command && key === 'y') { event.preventDefault(); this.state.redo(); return; }
    if (command && key === 'c') {
      var selected = this.state.field();
      if (selected) { this.fieldClipboard = ns.schema.clone(selected); this.onMessage('Поле скопировано.'); event.preventDefault(); }
      return;
    }
    if (command && key === 'v' && this.fieldClipboard) {
      var copy = ns.schema.clone(this.fieldClipboard);
      copy.id = this.state.uniqueFieldId(copy.id + '-copy');
      copy.left = Number(copy.left || 0) + 2;
      copy.top = Number(copy.top || 0) + 2;
      copy.baselineTop = Number(copy.baselineTop || 0) + 2;
      copy.reviewStatus = 'unreviewed';
      this.state.addField(copy);
      event.preventDefault();
      return;
    }
    if (event.key === 'Escape') { this.cancel(); this.state.tool = 'select'; this.state.emit('tool'); return; }
    if (event.key === 'Delete' || event.key === 'Backspace') { this.state.deleteSelected(); event.preventDefault(); return; }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(event.key) !== -1) {
      var field = this.state.field();
      if (!field || field.locked) return;
      var step = event.shiftKey ? 1 : 0.25;
      var horizontal = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
      var vertical = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
      var patch;
      if (event.altKey) {
        patch = {
          width: Math.max(2, Number(field.width || field.boxSize || 8.5) + horizontal),
          height: Math.max(2, Number(field.height || ns.schema.fieldGeometry(field).height) + vertical)
        };
        if ((field.type || 'text') === 'check') patch.boxSize = Math.max(2, Number(field.boxSize || field.glyphSize || 8.5) + horizontal + vertical);
      } else {
        patch = {
          left: Number(field.left) + horizontal,
          top: Number(field.top) + vertical,
          baselineTop: Number(field.baselineTop) + vertical
        };
      }
      Object.keys(patch).forEach(function (name) { patch[name] = Number(patch[name].toFixed(2)); });
      this.state.updateField(field.id, patch, event.altKey ? 'keyboard resize' : 'keyboard nudge');
      event.preventDefault();
    }
  };

  OverlayEditor.prototype.render = function () {
    var self = this;
    this.svg.textContent = '';
    if (!this.viewer.viewport || !this.state.project) return;
    var background = svg('rect', { x: 0, y: 0, width: '100%', height: '100%', fill: 'transparent', class: 'dtb-overlay-hit' });
    this.svg.appendChild(background);
    if (this.state.outlinesVisible) {
      (this.state.project.fields || []).filter(function (field) { return field.page === self.state.pageIndex; }).forEach(function (field) {
        self._renderField(field);
      });
    }
    this.guides.forEach(function (guide) {
      if (guide.axis === 'x') {
        var x = self.viewer.pdfToCss(guide.value, 0).x;
        self.svg.appendChild(svg('line', { x1: x, y1: 0, x2: x, y2: self.viewer.viewport.height, class: 'dtb-snap-guide' }));
      } else {
        var y = self.viewer.pdfToCss(0, guide.value).y;
        self.svg.appendChild(svg('line', { x1: 0, y1: y, x2: self.viewer.viewport.width, y2: y, class: 'dtb-snap-guide' }));
      }
    });
    if (this.interaction && this.interaction.kind === 'draw') {
      var a = this.interaction.start;
      var b = this.interaction.current || a;
      var preview = this.viewer.rectToCss(Math.min(a.left, b.left), Math.min(a.top, b.top), Math.abs(b.left - a.left), Math.abs(b.top - a.top));
      this.svg.appendChild(svg('rect', { x: preview.x, y: preview.y, width: preview.width, height: preview.height, class: 'dtb-field-box is-drawing' }));
    }
  };

  OverlayEditor.prototype._renderField = function (sourceField) {
    var field = ns.schema.clone(sourceField);
    if (this.interaction && this.interaction.fieldId === field.id && this.interaction.preview) {
      Object.keys(this.interaction.preview).forEach(function (key) { field[key] = selfValue(this.interaction.preview[key]); }, this);
    }
    function selfValue(value) { return value; }
    var type = field.type || 'text';
    var geometry = ns.schema.fieldGeometry(field);
    var width = type === 'check' ? Number(field.boxSize || field.glyphSize || 8.5) : Number(field.width || 4);
    var height = type === 'check' ? Number(field.boxSize || field.glyphSize || 8.5) : geometry.height;
    var rect = this.viewer.rectToCss(field.left, field.top, width, height);
    var group = svg('g', {
      class: 'dtb-field ' + (type === 'check' ? 'is-check' : 'is-text') +
        (field.id === this.state.selectedFieldId ? ' is-selected' : '') +
        (field.locked ? ' is-locked' : '') +
        (field.reviewStatus === 'required' ? ' needs-review' : ''),
      'data-field-id': field.id,
      tabindex: '0',
      role: 'button',
      'aria-label': field.id
    });
    group.appendChild(svg('rect', { x: rect.x, y: rect.y, width: rect.width, height: rect.height, class: 'dtb-field-box', 'data-field-id': field.id }));
    if (type !== 'check') {
      var baseline = this.viewer.pdfToCss(field.left, field.baselineTop);
      var baselineEnd = this.viewer.pdfToCss(Number(field.left) + Number(field.width || 0), field.baselineTop);
      group.appendChild(svg('line', { x1: baseline.x, y1: baseline.y, x2: baselineEnd.x, y2: baselineEnd.y, class: 'dtb-baseline', 'data-field-id': field.id }));
      // Continuation lines belong to this field: draw each of them, highlight
      // them together whenever the field is selected, and show the value split
      // across them exactly as the production engine assigned it.
      var assignments = this.getAssignments ? this.getAssignments(field.id) : null;
      var regions = ns.schema.flowRegions(field);
      var isSelected = field.id === this.state.selectedFieldId;

      regions.forEach(function (region, regionIndex) {
        if (regionIndex === 0 || Number(region.page) !== this.state.pageIndex) return;
        var start = this.viewer.pdfToCss(region.left, region.baselineTop);
        var end = this.viewer.pdfToCss(Number(region.left) + Number(region.width || 0),
          region.baselineTop);
        group.appendChild(svg('line', {
          x1: start.x, y1: start.y, x2: end.x, y2: end.y,
          class: 'dtb-flow-baseline' +
            (region.reviewStatus === 'suggested' ? ' is-suggested' : '') +
            (isSelected ? ' is-selected' : ''),
          'data-field-id': field.id
        }));
        if (region.drawUnderline) {
          var offset = region.underlineOffset != null ? Number(region.underlineOffset) : 2;
          var ruleTop = region.underlineTop != null
            ? Number(region.underlineTop) : Number(region.baselineTop) + offset;
          var ruleLeft = region.underlineLeft != null
            ? Number(region.underlineLeft) : Number(region.left);
          var ruleWidth = region.underlineWidth != null
            ? Number(region.underlineWidth) : Number(region.width || 0);
          var a = this.viewer.pdfToCss(ruleLeft, ruleTop);
          var b = this.viewer.pdfToCss(ruleLeft + ruleWidth, ruleTop);
          group.appendChild(svg('line', {
            x1: a.x, y1: a.y, x2: b.x, y2: b.y,
            class: 'dtb-flow-rule' +
              (region.reviewStatus === 'suggested' ? ' is-suggested' : ''),
            'data-field-id': field.id
          }));
        }
        var caption = svg('text', {
          x: start.x + 2, y: start.y - 2, class: 'dtb-flow-label',
          'data-field-id': field.id
        });
        caption.textContent = 'Строка ' + (regionIndex + 1) +
          (region.reviewStatus === 'suggested' ? ' · не подтверждена' : '');
        group.appendChild(caption);
      }, this);

      var payload = this.getPayload();
      var raw = type === 'static' ? field.text : payload && global.CRMDocumentEngine.overlayRenderer.resolve(field.source, payload);
      var formatted = ns.validation && ns.validation.format ? ns.validation.format(field.format, raw) : raw;
      var size = Math.max(4, Number(field.fontSize || 12) * this.viewer.zoom);

      if (assignments && assignments.length) {
        assignments.forEach(function (line) {
          if (Number(line.page) !== this.state.pageIndex) return;
          var region = regions[line.regionIndex] || regions[0];
          var at = this.viewer.pdfToCss(region.left, region.baselineTop);
          var text = svg('text', {
            x: at.x + 2, y: at.y, class: 'dtb-fast-text',
            'font-size': size, 'data-field-id': field.id
          });
          text.textContent = line.text;
          group.appendChild(text);
        }, this);
      } else if (formatted) {
        var text = svg('text', {
          x: rect.x + 2,
          y: baseline.y,
          class: 'dtb-fast-text',
          'font-size': size,
          'data-field-id': field.id
        });
        text.textContent = String(formatted).replace(/\s+/g, ' ');
        group.appendChild(text);
      }
    } else {
      var checkPayload = this.getPayload();
      var rawCheck = checkPayload && global.CRMDocumentEngine.overlayRenderer.resolve(field.source, checkPayload);
      var selected = Object.prototype.hasOwnProperty.call(field, 'equals')
        ? (Array.isArray(field.equals) ? field.equals.indexOf(rawCheck) !== -1 : rawCheck === field.equals)
        : !!rawCheck;
      if (field.invert) selected = !selected;
      if (selected) {
        group.appendChild(svg('path', {
          d: 'M ' + (rect.x + rect.width * 0.2) + ' ' + (rect.y + rect.height * 0.55) +
            ' L ' + (rect.x + rect.width * 0.43) + ' ' + (rect.y + rect.height * 0.78) +
            ' L ' + (rect.x + rect.width * 0.82) + ' ' + (rect.y + rect.height * 0.2),
          class: 'dtb-check-preview',
          'data-field-id': field.id
        }));
      }
    }
    var label = svg('text', { x: rect.x + 2, y: Math.max(10, rect.y - 3), class: 'dtb-field-label', 'data-field-id': field.id });
    label.textContent = field.id;
    group.appendChild(label);
    if (field.id === this.state.selectedFieldId && !field.locked) {
      group.appendChild(svg('rect', {
        x: rect.x + rect.width - 4, y: rect.y + rect.height - 4, width: 8, height: 8,
        class: 'dtb-handle dtb-resize-handle', 'data-field-id': field.id, 'data-handle': 'resize'
      }));
      if (type !== 'check') {
        var handle = this.viewer.pdfToCss(Number(field.left) + Number(field.width || 0) / 2, field.baselineTop);
        group.appendChild(svg('circle', {
          cx: handle.x, cy: handle.y, r: 5, class: 'dtb-handle dtb-baseline-handle',
          'data-field-id': field.id, 'data-handle': 'baseline'
        }));
      }
    }
    this.svg.appendChild(group);
  };

  ns.OverlayEditor = OverlayEditor;
}(typeof window !== 'undefined' ? window : this));
