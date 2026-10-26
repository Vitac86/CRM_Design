(function (global) {
  'use strict';

  var ns = global.CRMDocumentBuilder = global.CRMDocumentBuilder || {};

  function element(name, className, text) {
    var node = document.createElement(name);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function input(type, value, options) {
    var node = document.createElement('input');
    node.type = type;
    if (type === 'checkbox') node.checked = !!value;
    else node.value = value == null ? '' : value;
    Object.keys(options || {}).forEach(function (key) {
      if (key === 'list') node.setAttribute('list', options[key]);
      else node[key] = options[key];
    });
    node.classList.add('dtb-control');
    return node;
  }

  function select(value, choices) {
    var node = document.createElement('select');
    node.className = 'dtb-control';
    choices.forEach(function (choice) {
      var option = document.createElement('option');
      option.value = typeof choice === 'string' ? choice : choice.value;
      option.textContent = typeof choice === 'string' ? choice : choice.label;
      if (String(option.value) === String(value == null ? '' : value)) option.selected = true;
      node.appendChild(option);
    });
    return node;
  }

  function row(label, control, hint) {
    var wrap = element('label', 'dtb-inspector-row');
    wrap.appendChild(element('span', 'dtb-inspector-label', label));
    wrap.appendChild(control);
    if (hint) wrap.appendChild(element('small', 'dtb-inspector-hint', hint));
    return wrap;
  }

  function section(title) {
    var node = element('section', 'dtb-inspector-section');
    node.appendChild(element('h3', '', title));
    return node;
  }

  function numberValue(value) {
    return value === '' ? undefined : Number(value);
  }

  function scalarValue(value) {
    var text = String(value == null ? '' : value).trim();
    if (!text) return undefined;
    if (text === 'true') return true;
    if (text === 'false') return false;
    if (text === 'null') return null;
    if (Number.isFinite(Number(text))) return Number(text);
    return text;
  }

  function setPath(root, path, value) {
    var parts = path.split('.');
    var target = root;
    parts.slice(0, -1).forEach(function (part) {
      target[part] = target[part] || {};
      target = target[part];
    });
    var name = parts[parts.length - 1];
    if (value === undefined) delete target[name];
    else target[name] = value;
  }

  function defaultRun(type) {
    if (type === 'static') return { type: 'static', text: '' };
    if (type === 'fieldRef') return { type: 'fieldRef', fieldId: '' };
    if (type === 'spacer') return { type: 'spacer', width: 12 };
    return { type: type };
  }

  function WordFlowEditor(options) {
    this.state = options.state;
    this.container = options.container;
    this.inspectorContainer = options.inspectorContainer;
    this.listContainer = options.listContainer;
    this.count = options.count;
    this.createButton = options.createButton;
    this.fieldDatalist = options.fieldDatalist;
    this.onMessage = options.onMessage || function () {};
    this._wire();
  }

  WordFlowEditor.prototype._wire = function () {
    var self = this;
    this.createButton.addEventListener('click', function () {
      var id = self.state.uniqueWordFlowBlockId('word-flow-block');
      var block = ns.schema.suggestWordFlowBlock(
        self.state.project, self.state.pageIndex, id);
      self.state.addWordFlowBlock(block);
      self.onMessage('Word-flow блок создан как черновик. Укажите точный reviewed operator range.');
    });
  };

  WordFlowEditor.prototype._bind = function (blockId, control, path, transform, label) {
    var self = this;
    control.dataset.wordFlowControl = path.replace(/\./g, '-');
    control.addEventListener('change', function () {
      var raw = control.type === 'checkbox' ? control.checked : control.value;
      var value = transform ? transform(raw) : raw;
      self.state.mutateWordFlowBlock(blockId, label || ('edit ' + path), function (block) {
        setPath(block, path, value);
        if (path === 'fontSize' && block.fontSizeLocked) block.minFontSize = value;
        if (path === 'fontSizeLocked' && value) block.minFontSize = Number(block.fontSize);
      });
    });
    return control;
  };

  WordFlowEditor.prototype._add = function (parent, blockId, label, path, control, transform, hint) {
    this._bind(blockId, control, path, transform, 'edit Word-flow ' + path);
    parent.appendChild(row(label, control, hint));
    return control;
  };

  WordFlowEditor.prototype.render = function () {
    this._renderList();
    this._renderFieldDatalist();
    var block = this.state.wordFlowBlock();
    this.container.hidden = !block;
    this.inspectorContainer.hidden = !!block;
    this.container.textContent = '';
    if (!block) return;
    this._renderBlock(block);
  };

  WordFlowEditor.prototype._renderFieldDatalist = function () {
    if (!this.fieldDatalist) return;
    this.fieldDatalist.textContent = '';
    (this.state.project.fields || []).forEach(function (field) {
      var option = document.createElement('option');
      option.value = field.id;
      option.label = field.source || field.text || field.type || 'text';
      this.fieldDatalist.appendChild(option);
    }, this);
  };

  WordFlowEditor.prototype._renderList = function () {
    var self = this;
    var blocks = this.state.project && this.state.project.wordFlowBlocks || [];
    this.listContainer.textContent = '';
    blocks.forEach(function (block) {
      var button = element('button', 'dtb-word-flow-item' +
        (block.id === self.state.selectedWordFlowBlockId ? ' is-active' : ''));
      button.type = 'button';
      button.dataset.wordFlowBlockId = block.id;
      button.appendChild(element('strong', '', block.id));
      button.appendChild(element('span', '', 'p.' + (Number(block.page || 0) + 1) +
        ' · ' + (block.runs || []).length + ' runs'));
      button.addEventListener('click', function () {
        self.state.selectWordFlowBlock(block.id);
      });
      self.listContainer.appendChild(button);
    });
    this.count.textContent = String(blocks.length);
  };

  WordFlowEditor.prototype._renderBlock = function (block) {
    var self = this;
    var heading = element('div', 'dtb-inspector-heading');
    heading.appendChild(element('h2', '', block.id));
    heading.appendChild(element('span', 'dtb-type-badge', 'wordFlowBlock'));
    this.container.appendChild(heading);
    var actions = element('div', 'dtb-inspector-actions');
    var showPage = element('button', 'dtb-button', 'Показать страницу');
    var remove = element('button', 'dtb-button is-danger', 'Удалить блок');
    showPage.type = remove.type = 'button';
    showPage.addEventListener('click', function () {
      self.state.pageIndex = Number(block.page || 0);
      self.state.emit('page');
    });
    remove.addEventListener('click', function () {
      if (global.confirm('Удалить Word-flow блок и снять его field references?')) {
        self.state.deleteSelectedWordFlowBlock();
      }
    });
    actions.appendChild(showPage);
    actions.appendChild(remove);
    this.container.appendChild(actions);
    this.container.appendChild(element('p', 'dtb-identifier-warning',
      'Field refs используют существующие business ID. Редактор не переименовывает поля или source paths.'));

    var identity = section('Блок');
    var id = input('text', block.id);
    id.dataset.wordFlowControl = 'id';
    id.addEventListener('change', function () {
      var nextId = id.value.trim();
      if (!nextId) {
        id.value = block.id;
        self.onMessage('Block ID не может быть пустым.');
        return;
      }
      self.state.updateWordFlowBlock(block.id, { id: nextId }, 'rename Word-flow block');
    });
    identity.appendChild(row('Block ID', id));
    this._add(identity, block.id, 'Страница (0…)', 'page',
      input('number', block.page, { min: 0, step: 1 }), numberValue);
    var condition = block.showWhen || {};
    this._add(identity, block.id, 'showWhen source', 'showWhen.source',
      input('text', condition.source || '', { list: 'dtb-source-options' }), function (value) {
        return value.trim() || undefined;
      });
    this._add(identity, block.id, 'showWhen equals', 'showWhen.equals',
      input('text', Object.prototype.hasOwnProperty.call(condition, 'equals') ? condition.equals : ''), scalarValue);
    this.container.appendChild(identity);

    var frame = section('Frame · PDF points');
    var frameSpec = block.frame || {};
    [['left', 'Left'], ['baselineTop', 'Baseline top'], ['width', 'Width'],
      ['initialLineCount', 'Initial lines']].forEach(function (definition) {
      self._add(frame, block.id, definition[1], 'frame.' + definition[0],
        input('number', frameSpec[definition[0]], {
          min: definition[0] === 'initialLineCount' ? 1 : 0,
          step: definition[0] === 'initialLineCount' ? 1 : 0.01
        }), numberValue);
    });
    this.container.appendChild(frame);

    var typography = section('Типографика и абзац');
    var fontChoices = Object.keys(this.state.project.fonts || {}).map(function (name) {
      return { value: name, label: name };
    });
    if (block.font && !fontChoices.some(function (choice) { return choice.value === block.font; })) {
      fontChoices.push({ value: block.font, label: block.font + ' · отсутствует' });
    }
    this._add(typography, block.id, 'Шрифт', 'font', select(block.font || 'legalSerif', fontChoices));
    this._add(typography, block.id, 'Font size', 'fontSize',
      input('number', block.fontSize, { min: 0.1, step: 0.01 }), numberValue);
    this._add(typography, block.id, 'Font size locked', 'fontSizeLocked',
      input('checkbox', block.fontSizeLocked), Boolean,
      'Reviewed Word-flow должен сохранять измеренный кегль.');
    this._add(typography, block.id, 'Minimum font size', 'minFontSize',
      input('number', block.minFontSize, { min: 0.1, step: 0.01 }), numberValue);
    this._add(typography, block.id, 'Line height', 'lineHeight',
      input('number', block.lineHeight, { min: 0.1, step: 0.01 }), numberValue);
    this._add(typography, block.id, 'Paragraph spacing after', 'paragraphSpacingAfter',
      input('number', block.paragraphSpacingAfter || 0, { min: 0, step: 0.01 }), numberValue);
    this._add(typography, block.id, 'Alignment', 'alignment',
      select(block.alignment || 'left', ['left', 'center', 'right', 'justify']));
    this._add(typography, block.id, 'Justify minimum ratio', 'justifyMinRatio',
      input('number', block.justifyMinRatio == null ? '' : block.justifyMinRatio,
        { min: 0, max: 1, step: 0.01 }), numberValue);
    this._add(typography, block.id, 'First-line indent', 'firstLineIndent',
      input('number', block.firstLineIndent == null ? '' : block.firstLineIndent, { step: 0.01 }), numberValue);
    this._add(typography, block.id, 'Hanging indent', 'hangingIndent',
      input('number', block.hangingIndent == null ? '' : block.hangingIndent, { step: 0.01 }), numberValue);
    this.container.appendChild(typography);

    var semantics = section('Semantic layout group');
    var semanticJson = document.createElement('textarea');
    semanticJson.className = 'dtb-control';
    semanticJson.rows = 8;
    semanticJson.dataset.wordFlowControl = 'semanticGroup';
    semanticJson.value = block.semanticGroup
      ? JSON.stringify(block.semanticGroup, null, 2) : '';
    semanticJson.addEventListener('change', function () {
      var value;
      try {
        value = semanticJson.value.trim() ? JSON.parse(semanticJson.value) : undefined;
      } catch (error) {
        self.onMessage('semanticGroup must be valid JSON: ' + error.message);
        return;
      }
      self.state.mutateWordFlowBlock(block.id, 'edit Word-flow semantic group',
        function (target) { setPath(target, 'semanticGroup', value); });
    });
    semantics.appendChild(row('Reviewed recipient / organization boundaries', semanticJson,
      'The group must carry reviewStatus="approved" and exact field/source links.'));
    this.container.appendChild(semantics);

    this._renderExpansion(block);
    this._renderPageBudget(block);
    this._renderReplacement(block);

    var staticText = section('Исходный static text');
    var sourceText = document.createElement('textarea');
    sourceText.className = 'dtb-control';
    sourceText.rows = 5;
    sourceText.value = block.sourceStaticText || '';
    this._add(staticText, block.id, 'Точная legal wording', 'sourceStaticText', sourceText, String,
      'Static runs должны давать тот же token sequence; подчёркивания задаются decoration.');
    this.container.appendChild(staticText);

    this._renderRuns(block);
  };

  WordFlowEditor.prototype._renderExpansion = function (block) {
    var self = this;
    var sectionNode = section('Расширение и перенос нижнего content');
    var enabled = input('checkbox', block.overflowStrategy === 'expand-layout');
    enabled.dataset.wordFlowControl = 'expansion-enabled';
    enabled.addEventListener('change', function () {
      self.state.mutateWordFlowBlock(block.id, 'toggle Word-flow expansion', function (target) {
        if (enabled.checked) {
          target.overflowStrategy = 'expand-layout';
          target.expansion = target.expansion || {
            page: Number(target.page || 0),
            insertionTop: Number((target.frame || {}).baselineTop || 0) +
              Number(target.lineHeight || 12),
            shiftFromTop: Number((target.frame || {}).baselineTop || 0) +
              Number(target.lineHeight || 12),
            rowHeight: Number(target.lineHeight || 12),
            maxExtraRows: 1,
            lineStyle: 'none',
            reviewStatus: 'suggested'
          };
        } else {
          delete target.overflowStrategy;
          delete target.expansion;
        }
      });
    });
    sectionNode.appendChild(row('Move content below', enabled,
      'Добавляет только полные строки и использует reviewed page budget.'));
    var spec = block.expansion;
    if (spec) {
      [['page', 'Страница', 1], ['insertionTop', 'Insertion top', 0.01],
        ['shiftFromTop', 'Shift from top', 0.01], ['rowHeight', 'Row height', 0.01],
        ['maxExtraRows', 'Maximum extra rows', 1]].forEach(function (definition) {
        self._add(sectionNode, block.id, definition[1], 'expansion.' + definition[0],
          input('number', spec[definition[0]], { min: 0, step: definition[2] }), numberValue);
      });
      this._add(sectionNode, block.id, 'Line style', 'expansion.lineStyle',
        select(spec.lineStyle || 'none', ['none', 'underline', 'table-row']));
      this._add(sectionNode, block.id, 'Move top-level PDF paths',
        'expansion.moveTopLevelPaths', input('checkbox', spec.moveTopLevelPaths), Boolean,
        'Reviewed rules and borders move with the same complete block delta.');
      this._add(sectionNode, block.id, 'Visual review', 'expansion.reviewStatus',
        select(spec.reviewStatus || 'suggested', ['suggested', 'required', 'approved']));
      var rows = Number(spec.maxExtraRows || 0);
      var height = Number(spec.rowHeight || block.lineHeight || 0);
      sectionNode.appendChild(element('p', 'dtb-inspector-hint',
        'Сдвиг: 0 строк — 0 pt · 1 строка — ' + height + ' pt · максимум (' +
        rows + ') — ' + Math.round(rows * height * 100) / 100 + ' pt.'));
    }
    this.container.appendChild(sectionNode);
  };

  WordFlowEditor.prototype._renderPageBudget = function (block) {
    if (!block.expansion) return;
    var self = this;
    var project = this.state.project;
    var pageIndex = block.expansion.page != null
      ? Number(block.expansion.page) : Number(block.page || 0);
    var pageSize = (project.pageGeometry || [])[pageIndex] ||
      { width: 595.32, height: 841.92 };
    var layout = (project.pageLayout || {})[pageIndex];
    var sectionNode = section('Запас страницы ' + (pageIndex + 1));

    function commit(next) {
      var all = ns.schema.clone(project.pageLayout || {});
      if (next === undefined) delete all[pageIndex]; else all[pageIndex] = next;
      self.state.update({ pageLayout: all }, 'edit Word-flow page budget');
    }

    if (!layout) {
      sectionNode.appendChild(element('p', 'dtb-warning-text',
        'Для расширения нет общего reviewed page budget.'));
      var create = element('button', 'dtb-button is-primary', 'Задать запас страницы');
      create.type = 'button';
      create.addEventListener('click', function () {
        var anchors = (project.fields || []).filter(function (field) {
          return field.expansion && Number(field.expansion.page == null ? field.page :
            field.expansion.page) === pageIndex;
        }).map(function (field) { return field.id; }).concat(
          (project.wordFlowBlocks || []).filter(function (candidate) {
            return candidate.expansion && Number(candidate.expansion.page == null ? candidate.page :
              candidate.expansion.page) === pageIndex;
          }).map(function (candidate) { return candidate.id; })
        );
        commit(ns.schema.suggestPageLayout(pageIndex, pageSize, { anchors: anchors }));
      });
      sectionNode.appendChild(create);
      this.container.appendChild(sectionNode);
      return;
    }

    function patch(path, value) {
      var next = ns.schema.clone(layout);
      setPath(next, path, value);
      commit(next);
    }

    [['fixedHeaderUntil', 'Фиксированная шапка до'],
      ['bodyBottom', 'Низ подвижного content'],
      ['fixedFooterFrom', 'Фиксированный footer от'],
      ['shiftToTop', 'Подвижный блок до'],
      ['bottomClearance', 'Просвет до footer']].forEach(function (definition) {
      var control = input('number', layout[definition[0]] == null ? '' : layout[definition[0]],
        { step: 0.01 });
      control.dataset.wordFlowPageControl = definition[0];
      control.addEventListener('change', function () {
        patch(definition[0], numberValue(control.value));
      });
      sectionNode.appendChild(row(definition[1], control));
    });
    var budget = ns.schema.pageBudgetOf(Object.assign({}, layout,
      { pageHeight: pageSize.height }));
    var others = (layout.anchors || []).filter(function (id) { return id !== block.id; });
    sectionNode.appendChild(element('p', 'dtb-inspector-hint',
      'Доступно ' + budget.total + ' pt: нижний запас ' + budget.bottomCapacity +
      ' pt · просветы ' + budget.recoverable + ' pt · cross-page ' +
      budget.flowRecoverable + ' pt.' + (others.length
        ? ' Ещё на этой странице: ' + others.join(', ') + '.' : '')));
    if ((layout.anchors || []).indexOf(block.id) === -1) {
      var anchor = element('button', 'dtb-button', 'Добавить блок в anchors страницы');
      anchor.type = 'button';
      anchor.addEventListener('click', function () {
        var next = ns.schema.clone(layout);
        next.anchors = (next.anchors || []).concat([block.id]);
        commit(next);
      });
      sectionNode.appendChild(anchor);
    }

    (layout.compaction || []).forEach(function (zone, zoneIndex) {
      var card = element('div', 'dtb-word-flow-decoration');
      card.appendChild(element('strong', '', 'Reviewed whitespace ' + (zoneIndex + 1)));
      [['top', 'Top'], ['originalGap', 'Original gap'], ['minGap', 'Minimum gap']]
        .forEach(function (definition) {
          var control = input('number', zone[definition[0]], { step: 0.01 });
          control.addEventListener('change', function () {
            patch('compaction.' + zoneIndex + '.' + definition[0], numberValue(control.value));
          });
          card.appendChild(row(definition[1], control));
        });
      var approved = input('checkbox', zone.reviewStatus === 'approved');
      approved.addEventListener('change', function () {
        patch('compaction.' + zoneIndex + '.reviewStatus',
          approved.checked ? 'approved' : 'suggested');
      });
      card.appendChild(row('Проверено визуально', approved));
      sectionNode.appendChild(card);
    });

    if (layout.crossPageFlow) {
      var cross = layout.crossPageFlow;
      var crossNode = element('div', 'dtb-word-flow-decoration');
      crossNode.appendChild(element('strong', '', 'Перенос между страницами'));
      crossNode.appendChild(element('p', 'dtb-inspector-hint',
        'Исходный блок и целевая страница задаются только для reviewed whole-block transfer.'));
      [['targetPage', 'Целевая страница'], ['sourceFromTop', 'Исходный блок: от'],
        ['sourceToTop', 'Исходный блок: до'], ['sourceContentTop', 'Исходный content top'],
        ['retainedBodyBottom', 'Retained body bottom'],
        ['targetInsertionTop', 'Target insertion top'],
        ['targetShiftFromTop', 'Target shift from'], ['targetShiftToTop', 'Target shift to'],
        ['targetShift', 'Target shift'], ['maxCumulativeShift', 'Maximum shift'],
        ['maxCascadeDepth', 'Maximum cascade depth']].forEach(function (definition) {
        var control = input('number', cross[definition[0]], { step: definition[0].indexOf('Page') !== -1 ? 1 : 0.01 });
        control.addEventListener('change', function () {
          patch('crossPageFlow.' + definition[0], numberValue(control.value));
        });
        crossNode.appendChild(row(definition[1], control));
      });
      var note = input('text', cross.note || '');
      note.addEventListener('change', function () {
        patch('crossPageFlow.note', note.value.trim() || undefined);
      });
      crossNode.appendChild(row('Review note', note));
      var approved = input('checkbox', cross.reviewStatus === 'approved');
      approved.addEventListener('change', function () {
        patch('crossPageFlow.reviewStatus', approved.checked ? 'approved' : 'suggested');
      });
      crossNode.appendChild(row('Проверено визуально', approved));
      sectionNode.appendChild(crossNode);
    }
    this.container.appendChild(sectionNode);
  };

  WordFlowEditor.prototype._renderReplacement = function (block) {
    var replacementKey = block.sourceReplacement ? 'sourceReplacement' :
      block.originalContentRange ? 'originalContentRange' : 'sourceReplacement';
    var replacement = block[replacementKey] || {};
    var sectionNode = section('Reviewed source operator range');
    var self = this;
    [['firstBlock', 'First q…Q block'], ['lastBlock', 'Last q…Q block'],
      ['expectedBlockCount', 'Expected range blocks'],
      ['expectedPageBlockCount', 'Expected page blocks']].forEach(function (definition) {
      self._add(sectionNode, block.id, definition[1], replacementKey + '.' + definition[0],
        input('number', replacement[definition[0]] == null ? '' : replacement[definition[0]],
          { min: definition[0] === 'expectedPageBlockCount' ? 0 : 1, step: 1 }), numberValue);
    });
    var rangeHashKey = Object.prototype.hasOwnProperty.call(replacement, 'expectedSha256') ||
      !Object.prototype.hasOwnProperty.call(replacement, 'sha256') ? 'expectedSha256' : 'sha256';
    var templateHashKey = Object.prototype.hasOwnProperty.call(replacement, 'expectedTemplateSha256') ||
      !Object.prototype.hasOwnProperty.call(replacement, 'templateSha256')
      ? 'expectedTemplateSha256' : 'templateSha256';
    this._add(sectionNode, block.id, 'Range SHA-256', replacementKey + '.' + rangeHashKey,
      input('text', replacement[rangeHashKey] || ''), function (value) { return value.trim(); });
    this._add(sectionNode, block.id, 'Template SHA-256', replacementKey + '.' + templateHashKey,
      input('text', replacement[templateHashKey] || ''), function (value) { return value.trim(); });
    this._add(sectionNode, block.id, 'Visual review', replacementKey + '.reviewStatus',
      select(replacement.reviewStatus || 'suggested', ['suggested', 'required', 'approved']));
    sectionNode.appendChild(element('p', 'dtb-warning-text',
      'Диапазон 1-based и должен совпадать с точными balanced q…Q blocks исходного PDF.'));
    this.container.appendChild(sectionNode);
  };

  WordFlowEditor.prototype._renderRuns = function (block) {
    var self = this;
    var sectionNode = section('Styled runs');
    sectionNode.appendChild(element('p', 'dtb-inspector-hint',
      'Static wording и существующие field refs участвуют в одном production line-breaking pass.'));
    (block.runs || []).forEach(function (run, index) {
      sectionNode.appendChild(self._renderRun(block, run, index));
    });
    var addRow = element('div', 'dtb-word-flow-add-run');
    var type = select('static', [
      { value: 'static', label: 'Static text' },
      { value: 'fieldRef', label: 'Field reference' },
      { value: 'space', label: 'Space' },
      { value: 'lineBreak', label: 'Hard line break' },
      { value: 'paragraphBreak', label: 'Paragraph break' },
      { value: 'spacer', label: 'Reviewed spacer' }
    ]);
    type.dataset.wordFlowControl = 'add-run-type';
    var add = element('button', 'dtb-button is-primary', 'Добавить run');
    add.type = 'button';
    add.addEventListener('click', function () {
      self.state.addWordFlowRun(block.id, defaultRun(type.value));
    });
    addRow.appendChild(type);
    addRow.appendChild(add);
    sectionNode.appendChild(addRow);
    this.container.appendChild(sectionNode);
  };

  WordFlowEditor.prototype._renderRun = function (block, run, index) {
    var self = this;
    var card = element('div', 'dtb-word-flow-run');
    card.dataset.wordFlowRunIndex = String(index);
    var head = element('div', 'dtb-word-flow-run-head');
    var type = select(run.type || 'static', [
      'static', 'fieldRef', 'space', 'lineBreak', 'paragraphBreak', 'spacer'
    ]);
    type.dataset.wordFlowRunType = String(index);
    type.addEventListener('change', function () {
      self.state.mutateWordFlowBlock(block.id, 'change Word-flow run type', function (target) {
        target.runs[index] = defaultRun(type.value);
      });
    });
    head.appendChild(type);
    [['↑', -1], ['↓', 1]].forEach(function (definition) {
      var move = element('button', 'dtb-icon-button', definition[0]);
      move.type = 'button';
      move.disabled = definition[1] < 0 ? index === 0 : index === block.runs.length - 1;
      move.addEventListener('click', function () {
        self.state.moveWordFlowRun(block.id, index, definition[1]);
      });
      head.appendChild(move);
    });
    var remove = element('button', 'dtb-icon-button', '×');
    remove.type = 'button';
    remove.addEventListener('click', function () {
      self.state.deleteWordFlowRun(block.id, index);
    });
    head.appendChild(remove);
    card.appendChild(head);

    function update(name, value) {
      var patch = {}; patch[name] = value;
      self.state.updateWordFlowRun(block.id, index, patch);
    }

    function runControl(label, name, control, transform, hint) {
      control.dataset.wordFlowRunControl = name;
      control.addEventListener('change', function () {
        var raw = control.type === 'checkbox' ? control.checked : control.value;
        update(name, transform ? transform(raw) : raw);
      });
      card.appendChild(row(label, control, hint));
    }

    if (run.type === 'static') {
      var text = document.createElement('textarea');
      text.className = 'dtb-control'; text.rows = 3; text.value = run.text || '';
      runControl('Static text', 'text', text, String);
      runControl('Override font', 'font', input('text', run.font || ''), function (value) {
        return value.trim() || undefined;
      });
      runControl('Override size', 'fontSize', input('number', run.fontSize == null ? '' : run.fontSize,
        { min: 0.1, step: 0.01 }), numberValue);
      runControl('Keep with next', 'keepWithNext', input('checkbox', run.keepWithNext), Boolean);
    } else if (run.type === 'fieldRef') {
      runControl('Existing field ID', 'fieldId', input('text', run.fieldId || '', {
        list: 'dtb-word-flow-field-options'
      }), function (value) { return value.trim(); },
      'Выбирается существующее поле; его ID и source не копируются и не переименовываются.');
      runControl('Use raw value', 'useRawValue', input('checkbox', run.useRawValue), Boolean);
      runControl('Formatter override', 'format', input('text', run.format || ''), function (value) {
        return value.trim() || undefined;
      });
      runControl('Keep together', 'keepTogether', input('checkbox', run.keepTogether), Boolean);
      runControl('Keep with next', 'keepWithNext', input('checkbox', run.keepWithNext), Boolean);
      runControl('Emergency character wrap', 'emergencyBreak', input('checkbox',
        run.emergencyBreak || run.allowEmergencyBreak), Boolean);
      runControl('Keep the printed blank', 'blankWhenEmpty',
        input('checkbox', run.blankWhenEmpty), Boolean,
        'Печатный бланк исходной формы сохраняется, даже если значение пустое ' +
        'или скрыто showWhen. Требуется decoration → minimum width: это ' +
        'измеренная ширина того самого бланка.');
      this._renderDecoration(card, block, run, index);
    } else if (run.type === 'spacer') {
      runControl('Width · pt', 'width', input('number', run.width, { min: 0, step: 0.01 }), numberValue,
        'Spacer — reviewed fixed geometry, не пробелы или underscore characters.');
      runControl('Keep with next', 'keepWithNext', input('checkbox', run.keepWithNext), Boolean);
    } else {
      card.appendChild(element('p', 'dtb-inspector-hint',
        run.type === 'space' ? 'Один нормальный межсловный пробел.' :
        run.type === 'paragraphBreak' ? 'Новый абзац с paragraph spacing.' :
        'Принудительный перенос строки внутри абзаца.'));
    }
    return card;
  };

  WordFlowEditor.prototype._renderDecoration = function (card, block, run, index) {
    var self = this;
    var decoration = run.decoration || {};
    var box = element('div', 'dtb-word-flow-decoration');
    box.appendChild(element('strong', '', 'Underline decoration'));

    function update(name, value) {
      var next = ns.schema.clone(decoration);
      if (value === undefined) delete next[name]; else next[name] = value;
      if (!next.underline && Object.keys(next).length === 1 &&
          Object.prototype.hasOwnProperty.call(next, 'underline')) next = undefined;
      self.state.updateWordFlowRun(block.id, index, { decoration: next });
    }

    function control(label, name, node, transform) {
      node.dataset.wordFlowDecorationControl = name;
      node.addEventListener('change', function () {
        var raw = node.type === 'checkbox' ? node.checked : node.value;
        update(name, transform ? transform(raw) : raw);
      });
      box.appendChild(row(label, node));
    }

    control('Underline', 'underline', input('checkbox', decoration.underline), Boolean);
    if (decoration.underline) {
      control('Minimum blank width', 'minWidth', input('number', decoration.minWidth == null ? '' : decoration.minWidth,
        { min: 0, step: 0.01 }), numberValue);
      control('Thickness', 'thickness', input('number', decoration.thickness == null ? '' : decoration.thickness,
        { min: 0.01, step: 0.01 }), numberValue);
      control('Offset', 'offset', input('number', decoration.offset == null ? '' : decoration.offset,
        { step: 0.01 }), numberValue);
      control('Color', 'color', input('text', decoration.color || ''), function (value) {
        return value.trim() || undefined;
      });
    }
    card.appendChild(box);
  };

  ns.WordFlowEditor = WordFlowEditor;
}(typeof window !== 'undefined' ? window : this));
