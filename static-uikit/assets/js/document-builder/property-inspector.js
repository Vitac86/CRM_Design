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
    return node;
  }

  function select(value, choices) {
    var node = document.createElement('select');
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
    var caption = element('span', 'dtb-inspector-label', label);
    wrap.appendChild(caption);
    wrap.appendChild(control);
    if (hint) wrap.appendChild(element('small', 'dtb-inspector-hint', hint));
    return wrap;
  }

  function parseScalar(value) {
    var text = String(value == null ? '' : value).trim();
    if (text === 'true') return true;
    if (text === 'false') return false;
    if (text === 'null') return null;
    if (text !== '' && Number.isFinite(Number(text))) return Number(text);
    return text;
  }

  function Inspector(options) {
    this.state = options.state;
    this.container = options.container;
    this.sourceDatalist = options.sourceDatalist;
    this.onMessage = options.onMessage || function () {};
    this.sources = [];
  }

  Inspector.prototype.setSources = function (sources) {
    this.sources = sources || [];
    this.sourceDatalist.textContent = '';
    this.sources.forEach(function (source) {
      var option = document.createElement('option');
      option.value = source.path;
      option.label = source.label + ' · ' + source.category;
      this.sourceDatalist.appendChild(option);
    }, this);
  };

  Inspector.prototype._fieldPatch = function (field, name, control, transform) {
    var self = this;
    control.addEventListener('change', function () {
      var value = control.type === 'checkbox' ? control.checked : control.value;
      if (transform) value = transform(value);
      var patch = {};
      patch[name] = value === '' && ['baselineShift', 'maxHeight', 'maxLines', 'lineHeight', 'boxSize', 'thickness', 'inset', 'offsetX', 'offsetY'].indexOf(name) !== -1
        ? undefined : value;
      self.state.updateField(field.id, patch, 'edit ' + name);
    });
  };

  Inspector.prototype._addFieldControl = function (section, field, label, name, control, transform, hint) {
    control.classList.add('dtb-control');
    this._fieldPatch(field, name, control, transform);
    section.appendChild(row(label, control, hint));
    return control;
  };

  Inspector.prototype.render = function () {
    this.container.textContent = '';
    var field = this.state.field();
    if (!field) {
      this.container.appendChild(element('div', 'dtb-empty-state', 'Выберите поле на странице или в списке.'));
      return;
    }
    var heading = element('div', 'dtb-inspector-heading');
    heading.appendChild(element('h2', '', field.id));
    var badge = element('span', 'dtb-type-badge', field.type || 'text');
    heading.appendChild(badge);
    this.container.appendChild(heading);

    var actions = element('div', 'dtb-inspector-actions');
    var duplicate = element('button', 'dtb-button', 'Дублировать');
    var remove = element('button', 'dtb-button is-danger', 'Удалить');
    var copySettings = element('button', 'dtb-button', 'Копировать настройки');
    var pasteSettings = element('button', 'dtb-button', 'Вставить настройки');
    duplicate.type = remove.type = copySettings.type = pasteSettings.type = 'button';
    duplicate.addEventListener('click', this.state.duplicateSelected.bind(this.state));
    remove.addEventListener('click', this.state.deleteSelected.bind(this.state));
    copySettings.addEventListener('click', function () { this.state.copySettings(); this.onMessage('Настройки поля скопированы.'); }.bind(this));
    pasteSettings.addEventListener('click', function () { this.state.pasteSettings(); }.bind(this));
    [duplicate, remove, copySettings, pasteSettings].forEach(function (button) { actions.appendChild(button); });
    this.container.appendChild(actions);

    var common = this._section('Поле');
    this._addFieldControl(common, field, 'ID', 'id', input('text', field.id), String);
    this._addFieldControl(common, field, 'Тип', 'type', select(field.type || 'text', [
      { value: 'text', label: 'Текст' }, { value: 'static', label: 'Статический overlay' }, { value: 'check', label: 'Checkbox' }
    ]), String);
    if ((field.type || 'text') === 'static') this._addFieldControl(common, field, 'Текст', 'text', input('text', field.text || ''), String);
    else {
      this._addFieldControl(common, field, 'Источник', 'source', input('text', field.source || '', { list: 'dtb-source-options' }), String, 'Можно ввести raw path; он будет проверен.');
      this._renderSourceBrowser(common, field);
    }
    this._addFieldControl(common, field, 'Страница (0…)', 'page', input('number', field.page, { min: 0, step: 1 }), Number);
    this._addFieldControl(common, field, 'Заблокировано', 'locked', input('checkbox', field.locked), Boolean);
    this._addFieldControl(common, field, 'Статус проверки', 'reviewStatus', select(field.reviewStatus || 'unreviewed', [
      { value: 'unreviewed', label: 'Не проверено' }, { value: 'required', label: 'Требует проверки' }, { value: 'reviewed', label: 'Проверено' }
    ]), String);
    this._addFieldControl(common, field, 'Примечание к якорю', 'anchorNote', input('text', field.anchorNote || ''), String);
    this.container.appendChild(common);

    var geometry = this._section('Геометрия · PDF points');
    [['left', 'Left'], ['top', 'Top'], ['width', 'Width'], ['height', 'Height'], ['baselineTop', 'Baseline top'], ['baselineShift', 'Baseline shift']]
      .forEach(function (entry) {
        if ((field.type || 'text') === 'check' && ['width', 'height', 'baselineShift'].indexOf(entry[0]) !== -1) return;
        this._addFieldControl(geometry, field, entry[1], entry[0], input('number', field[entry[0]] == null ? '' : field[entry[0]], { step: 0.25 }), function (value) { return value === '' ? '' : Number(value); });
      }, this);
    this.container.appendChild(geometry);

    if ((field.type || 'text') === 'check') this._renderCheckbox(field);
    else this._renderTypography(field);
    this._renderCondition(field);
    if (field.source && (field.source.indexOf('extra.') === 0 || field.source.indexOf('check.') === 0)) this._renderWizard(field);
  };

  Inspector.prototype._section = function (title) {
    var section = element('section', 'dtb-inspector-section');
    section.appendChild(element('h3', '', title));
    return section;
  };

  Inspector.prototype._renderSourceBrowser = function (section, field) {
    var self = this;
    var search = input('search', '', { placeholder: 'Поиск источника…' });
    var tree = document.createElement('select');
    tree.size = 6;
    search.classList.add('dtb-control');
    tree.classList.add('dtb-control');
    function fill() {
      var query = search.value.toLowerCase();
      var grouped = {};
      self.sources.filter(function (source) {
        return !query || (source.path + ' ' + source.label + ' ' + source.category).toLowerCase().indexOf(query) !== -1;
      }).forEach(function (source) {
        grouped[source.category] = grouped[source.category] || [];
        grouped[source.category].push(source);
      });
      tree.textContent = '';
      Object.keys(grouped).sort().forEach(function (category) {
        var group = document.createElement('optgroup'); group.label = category;
        grouped[category].forEach(function (source) {
          var option = document.createElement('option'); option.value = source.path; option.textContent = source.label + ' · ' + source.path;
          if (source.path === field.source) option.selected = true;
          group.appendChild(option);
        });
        tree.appendChild(group);
      });
    }
    search.addEventListener('input', fill);
    tree.addEventListener('change', function () { self.state.updateField(field.id, { source: tree.value }, 'select source'); });
    fill();
    section.appendChild(row('Searchable source tree', search));
    section.appendChild(tree);
  };

  Inspector.prototype._renderTypography = function (field) {
    var section = this._section('Типографика и overflow');
    this._addFieldControl(section, field, 'Шрифт', 'font', select(field.font || 'legalSerif', Object.keys(this.state.project.fonts || {}).map(function (name) { return { value: name, label: name }; })), String);
    [['fontSize', 'Начальный кегль'], ['minFontSize', 'Минимальный кегль'], ['lineHeight', 'Интерлиньяж'], ['maxHeight', 'Макс. высота'], ['maxLines', 'Макс. строк']]
      .forEach(function (entry) {
        this._addFieldControl(section, field, entry[1], entry[0], input('number', field[entry[0]] == null ? '' : field[entry[0]], { step: entry[0] === 'maxLines' ? 1 : 0.25 }), function (value) { return value === '' ? '' : Number(value); });
      }, this);
    this._addFieldControl(section, field, 'Выравнивание', 'align', select(field.align || 'left', ['left', 'center', 'right']), String);
    this._addFieldControl(section, field, 'Многострочное', 'multiline', input('checkbox', field.multiline), Boolean);
    this._addFieldControl(section, field, 'Обязательное', 'required', input('checkbox', field.required), Boolean);
    this._addFieldControl(section, field, 'Optional source', 'optional', input('checkbox', field.optional), Boolean);
    var formats = [{ value: '', label: 'Без форматтера' }].concat(Object.keys(global.CRMDocumentEngine.overlayRenderer.formatters).sort().map(function (name) { return { value: name, label: name }; }));
    this._addFieldControl(section, field, 'Форматтер', 'format', select(field.format || '', formats), function (value) { return value || undefined; });
    this.container.appendChild(section);
    this._renderFlowRegions(field);
    this._renderExpansion(field);
    this._renderPageBudget(field);
    this._renderFallbacks(field, formats);
  };

  // ── Page-section expansion ─────────────────────────────────────────────────
  //
  // Where a continuation line has nowhere to go because the form is full, the
  // document can grow a row instead: the page content below an anchor moves
  // down and a real ruled row or table row opens in the space. There is still
  // one authoritative PDF — the variation exists only in the generated file.
  Inspector.prototype._renderExpansion = function (field) {
    var self = this;
    var section = this._section('Расширение страницы');
    var spec = field.expansion;
    var pageSize = (this.state.project.pageGeometry || [])[field.page] ||
      { width: 595.32, height: 841.92 };

    if (!spec) {
      section.appendChild(element('p', 'dtb-inspector-hint',
        'Если у поля нет свободного места для строки продолжения, документ ' +
        'может добавить строку сам: содержимое ниже точки вставки сдвигается ' +
        'вниз. Шаблон PDF при этом не дублируется.'));
      var add = element('button', 'dtb-button is-primary', 'Добавить расширяемую строку');
      add.type = 'button';
      add.addEventListener('click', function () {
        self.state.updateField(field.id, {
          overflowStrategy: 'expand-layout',
          expansion: ns.schema.suggestExpansion(field, pageSize, {})
        }, 'add layout expansion');
      });
      section.appendChild(add);
      this.container.appendChild(section);
      return;
    }

    function patch(changes) {
      var next = ns.schema.clone(field.expansion);
      Object.keys(changes).forEach(function (key) {
        if (changes[key] === undefined || changes[key] === '') delete next[key];
        else next[key] = changes[key];
      });
      self.state.updateField(field.id, { expansion: next }, 'edit layout expansion');
    }

    function patchLine(changes) {
      var next = ns.schema.clone(field.expansion);
      next.line = next.line || {};
      Object.keys(changes).forEach(function (key) {
        if (changes[key] === undefined || changes[key] === '') delete next.line[key];
        else next.line[key] = changes[key];
      });
      self.state.updateField(field.id, { expansion: next }, 'edit expansion rule');
    }

    if (spec.reviewStatus !== 'approved') {
      section.appendChild(element('p', 'dtb-warning-text',
        'Правило расширения не подтверждено визуально — production-экспорт ' +
        'заблокирован.'));
    }

    // The movable block and the anchor. The reserve of the page is edited in
    // its own section, once, and only appears here when the page has no budget
    // — a map written before the page budget existed.
    var pageLayout = (this.state.project.pageLayout || {})[
      spec.page != null ? Number(spec.page) : Number(field.page)];
    var anchorRows = [
      ['page', 'Страница', 1], ['insertionTop', 'Точка вставки', 0.25],
      ['rowHeight', 'Высота строки', 0.25], ['maxExtraRows', 'Максимум строк', 1],
      ['maxFontSize', 'Максимальный кегль строки', 0.25],
      ['shiftFromTop', 'Подвижный блок: от', 0.25]
    ];
    if (!pageLayout) {
      anchorRows.push(['shiftToTop', 'Подвижный блок: до', 0.25]);
      anchorRows.push(['bottomReserve', 'Запас внизу страницы', 0.25]);
    }
    anchorRows
      .forEach(function (entry) {
        var control = input('number', spec[entry[0]] == null ? '' : spec[entry[0]],
          { step: entry[2] });
        control.classList.add('dtb-control');
        control.addEventListener('change', function () {
          var changes = {};
          changes[entry[0]] = control.value === '' ? undefined : Number(control.value);
          patch(changes);
        });
        section.appendChild(row(entry[1], control));
      });

    var style = select(spec.lineStyle || 'underline', [
      { value: 'underline', label: 'Строка с подчёркиванием' },
      { value: 'table-row', label: 'Пустая строка таблицы' }
    ]);
    style.classList.add('dtb-control');
    style.addEventListener('change', function () { patch({ lineStyle: style.value }); });
    section.appendChild(row('Вид вставляемой строки', style));

    var line = spec.line || {};
    [['left', 'Строка: left'], ['width', 'Строка: ширина'],
     ['baselineOffset', 'Строка: baseline'], ['ruleOffset', 'Строка: линия'],
     ['ruleThickness', 'Строка: толщина линии']]
      .forEach(function (entry) {
        var control = input('number', line[entry[0]] == null ? '' : line[entry[0]],
          { step: 0.05 });
        control.classList.add('dtb-control');
        control.addEventListener('change', function () {
          var changes = {};
          changes[entry[0]] = control.value === '' ? undefined : Number(control.value);
          patchLine(changes);
        });
        section.appendChild(row(entry[1], control));
      });

    // Copy the weight of a printed rule nearby, so the inserted row matches.
    var match = element('button', 'dtb-button', 'Взять толщину соседней линии');
    match.type = 'button';
    match.addEventListener('click', function () {
      patchLine({ ruleThickness: self._nearbyUnderlineThickness(field) });
      self.onMessage('Толщина линии скопирована с ближайшего правила формы.');
    });
    section.appendChild(match);

    // How far the page would move at zero, one and the maximum row count, and
    // what the other anchors on the same page have already spoken for.
    var rows = Number(spec.maxExtraRows || 1);
    var height = Number(spec.rowHeight || 14);
    var budget = pageLayout
      ? ns.schema.pageBudgetOf(Object.assign({}, pageLayout,
          { pageHeight: pageSize.height }))
      : { total: Number(spec.bottomReserve || 0), recoverable: 0 };
    section.appendChild(element('p', 'dtb-inspector-hint',
      'Сдвиг: 0 строк — 0 pt · 1 строка — ' + height + ' pt · максимум (' +
      rows + ') — ' + Math.round(rows * height * 100) / 100 + ' pt из ' +
      budget.total + ' pt запаса страницы' +
      (budget.recoverable ? ' (в том числе ' + budget.recoverable +
        ' pt из просветов)' : '') + '.'));
    if (pageLayout) {
      var others = (pageLayout.anchors || []).filter(function (id) {
        return id !== field.id;
      });
      var claimed = others.reduce(function (sum, id) {
        var other = (self.state.project.fields || []).filter(function (f) {
          return f.id === id;
        })[0];
        var e = other && other.expansion;
        return sum + (e ? Number(e.maxExtraRows || 1) * Number(e.rowHeight || 0) : 0);
      }, 0);
      section.appendChild(element('p', 'dtb-inspector-hint',
        others.length
          ? 'Ещё на этой странице: ' + others.join(', ') + ' — до ' +
            Math.round(claimed * 100) / 100 + ' pt. Совместно с этим полем — до ' +
            Math.round((claimed + rows * height) * 100) / 100 + ' pt из ' +
            budget.total + ' pt.'
          : 'Других расширяемых полей на этой странице нет.'));
    }

    var approved = input('checkbox', spec.reviewStatus === 'approved');
    approved.classList.add('dtb-control');
    approved.addEventListener('change', function () {
      patch({ reviewStatus: approved.checked ? 'approved' : 'suggested' });
    });
    section.appendChild(row('Правило проверено визуально', approved,
      'Проверьте на странице, что вставленная строка не задевает статичный ' +
      'текст, подпись или колонтитул.'));

    var remove = element('button', 'dtb-button is-danger', 'Убрать расширение');
    remove.type = 'button';
    remove.addEventListener('click', function () {
      self.state.updateField(field.id, {
        expansion: undefined, overflowStrategy: undefined
      }, 'remove layout expansion');
    });
    section.appendChild(remove);

    this.container.appendChild(section);
  };

  // ── The budget the whole page shares ───────────────────────────────────────
  //
  // A page has one amount of room. It is measured from the authoritative PDF
  // with tools/qa/measure_page_layout.py and stated once here, so two anchors
  // on the same page cannot each believe they own it.
  Inspector.prototype._renderPageBudget = function (field) {
    var self = this;
    var project = this.state.project;
    var spec = field.expansion;
    if (!spec) return;
    var index = spec.page != null ? Number(spec.page) : Number(field.page);
    var pageSize = (project.pageGeometry || [])[index] ||
      { width: 595.32, height: 841.92 };
    var section = this._section('Запас страницы ' + (index + 1));
    var layout = (project.pageLayout || {})[index];

    function commit(next) {
      var pageLayout = ns.schema.clone(project.pageLayout || {});
      if (next === undefined) delete pageLayout[index];
      else pageLayout[index] = next;
      self.state.update({ pageLayout: pageLayout }, 'edit page budget');
    }

    if (!layout) {
      section.appendChild(element('p', 'dtb-inspector-hint',
        'У страницы нет общего запаса: каждое поле объявляет свой. Общий ' +
        'запас задаётся один раз и делится между всеми полями страницы по ' +
        'порядку сверху вниз.'));
      var add = element('button', 'dtb-button is-primary', 'Задать запас страницы');
      add.type = 'button';
      add.addEventListener('click', function () {
        var suggested = ns.schema.suggestPageLayout(index, pageSize, {
          anchors: (project.fields || []).filter(function (f) {
            var e = f.expansion;
            return e && (e.page != null ? Number(e.page) : Number(f.page)) === index;
          }).map(function (f) { return f.id; })
        });
        commit(suggested);
      });
      section.appendChild(add);
      this.container.appendChild(section);
      return;
    }

    function patch(changes) {
      var next = ns.schema.clone(layout);
      Object.keys(changes).forEach(function (key) {
        if (changes[key] === undefined || changes[key] === '') delete next[key];
        else next[key] = changes[key];
      });
      commit(next);
    }

    [['fixedHeaderUntil', 'Фиксированная шапка до'],
     ['bodyBottom', 'Низ подвижного текста'],
     ['fixedFooterFrom', 'Фиксированный колонтитул от'],
     ['shiftToTop', 'Подвижный блок: до'],
     ['bottomClearance', 'Просвет до колонтитула']]
      .forEach(function (entry) {
        var control = input('number', layout[entry[0]] == null ? '' : layout[entry[0]],
          { step: 0.25 });
        control.classList.add('dtb-control');
        control.addEventListener('change', function () {
          var changes = {};
          changes[entry[0]] = control.value === '' ? undefined : Number(control.value);
          patch(changes);
        });
        section.appendChild(row(entry[1], control));
      });

    var budget = ns.schema.pageBudgetOf(
      Object.assign({}, layout, { pageHeight: pageSize.height }));
    section.appendChild(element('p', 'dtb-inspector-hint',
      'Запас страницы: ' + budget.bottomCapacity + ' pt внизу + ' +
      budget.recoverable + ' pt из просветов + ' +
      (budget.flowRecoverable || 0) + ' pt из переноса целого блока = ' +
      budget.total + ' pt. ' +
      'Поля страницы: ' + ((layout.anchors || []).join(', ') || '—') + '.'));

    // Reviewed whitespace recovery, one row per zone.
    (layout.compaction || []).forEach(function (zone, i) {
      var line = element('div', 'dtb-inspector-subrow');
      [['top', 'срез'], ['originalGap', 'просвет'], ['minGap', 'минимум']]
        .forEach(function (entry) {
          var control = input('number', zone[entry[0]] == null ? '' : zone[entry[0]],
            { step: 0.25 });
          control.classList.add('dtb-control');
          control.addEventListener('change', function () {
            var next = ns.schema.clone(layout);
            next.compaction[i][entry[0]] = control.value === ''
              ? undefined : Number(control.value);
            commit(next);
          });
          line.appendChild(row(entry[1], control));
        });
      var ok = input('checkbox', zone.reviewStatus === 'approved');
      ok.classList.add('dtb-control');
      ok.addEventListener('change', function () {
        var next = ns.schema.clone(layout);
        next.compaction[i].reviewStatus = ok.checked ? 'approved' : 'suggested';
        commit(next);
      });
      line.appendChild(row('проверено', ok,
        'Посмотрите на странице, что уменьшенный просвет не выглядит ошибкой ' +
        'вёрстки и не сближает два блока сверх приличного.'));
      var drop = element('button', 'dtb-button is-danger', 'Убрать зону');
      drop.type = 'button';
      drop.addEventListener('click', function () {
        var next = ns.schema.clone(layout);
        next.compaction.splice(i, 1);
        commit(next);
      });
      line.appendChild(drop);
      section.appendChild(line);
    });

    var addZone = element('button', 'dtb-button', 'Добавить зону уплотнения');
    addZone.type = 'button';
    addZone.addEventListener('click', function () {
      var next = ns.schema.clone(layout);
      next.compaction = (next.compaction || []).concat([{
        top: Number(layout.fixedHeaderUntil || 0),
        originalGap: 0, minGap: 0, reviewStatus: 'suggested', note: ''
      }]);
      commit(next);
    });
    section.appendChild(addZone);
    section.appendChild(element('p', 'dtb-inspector-hint',
      'Уплотнять можно только просвет между двумя целыми блоками и только ' +
      'выше первой точки вставки. Межстрочный интервал внутри абзаца, кегль и ' +
      'вертикальный масштаб не трогаются.'));

    // Last-resort reviewed movement of one complete trailing operator block to
    // the already-continuing next page. Every boundary stays explicit; an
    // incomplete or unreviewed rule is rejected by both builder and production.
    var flow = layout.crossPageFlow;
    if (flow) {
      section.appendChild(element('p', 'dtb-inspector-hint',
        'Перенос между страницами включается только после исчерпания нижнего ' +
        'запаса и проверенных просветов. Нумерация страниц в схеме начинается с 0.'));
      var flowRows = [
        ['targetPage', 'Целевая страница', 1],
        ['sourceFromTop', 'Исходный блок: от', 0.25],
        ['sourceToTop', 'Исходный блок: до', 0.25],
        ['sourceContentTop', 'Верх содержимого', 0.25],
        ['retainedBodyBottom', 'Низ оставшегося блока', 0.25],
        ['targetInsertionTop', 'Вставка на целевой странице', 0.25],
        ['targetShiftFromTop', 'Целевой блок: от', 0.25],
        ['targetShiftToTop', 'Целевой блок: до', 0.25],
        ['targetShift', 'Сдвиг целевого блока', 0.25],
        ['maxCumulativeShift', 'Максимальный сдвиг', 0.25],
        ['maxCascadeDepth', 'Глубина каскада', 1]
      ];
      flowRows.forEach(function (entry) {
        var control = input('number', flow[entry[0]] == null ? '' : flow[entry[0]],
          { step: entry[2] });
        control.classList.add('dtb-control');
        control.addEventListener('change', function () {
          var next = ns.schema.clone(layout);
          next.crossPageFlow[entry[0]] = control.value === ''
            ? undefined : Number(control.value);
          commit(next);
        });
        section.appendChild(row(entry[1], control));
      });
      var flowNote = input('text', flow.note || '');
      flowNote.classList.add('dtb-control');
      flowNote.addEventListener('change', function () {
        var next = ns.schema.clone(layout);
        next.crossPageFlow.note = flowNote.value;
        commit(next);
      });
      section.appendChild(row('Описание целого блока', flowNote));
      var flowApproved = input('checkbox', flow.reviewStatus === 'approved');
      flowApproved.classList.add('dtb-control');
      flowApproved.addEventListener('change', function () {
        var next = ns.schema.clone(layout);
        next.crossPageFlow.reviewStatus = flowApproved.checked
          ? 'approved' : 'suggested';
        commit(next);
      });
      section.appendChild(row('Перенос проверен', flowApproved,
        'Проверьте границы полного q…Q-блока, порядок чтения, целевую страницу ' +
        'и положение подписей, печатей и колонтитулов.'));
      var removeFlow = element('button', 'dtb-button is-danger',
        'Убрать перенос между страницами');
      removeFlow.type = 'button';
      removeFlow.addEventListener('click', function () {
        var next = ns.schema.clone(layout);
        delete next.crossPageFlow;
        commit(next);
      });
      section.appendChild(removeFlow);
    } else {
      var addFlow = element('button', 'dtb-button', 'Добавить перенос между страницами');
      addFlow.type = 'button';
      addFlow.addEventListener('click', function () {
        var next = ns.schema.clone(layout);
        next.crossPageFlow = {
          targetPage: Math.min(index + 1, (project.pageGeometry || []).length - 1),
          sourceFromTop: Number(layout.bodyBottom || 0),
          sourceToTop: Number(layout.shiftToTop || pageSize.height),
          sourceContentTop: Number(layout.bodyBottom || 0),
          retainedBodyBottom: Number(layout.bodyBottom || 0),
          targetInsertionTop: 0,
          targetShiftFromTop: 0,
          targetShiftToTop: pageSize.height,
          targetShift: 0,
          maxCumulativeShift: 0,
          maxCascadeDepth: 1,
          reviewStatus: 'suggested',
          note: ''
        };
        commit(next);
      });
      section.appendChild(addFlow);
    }

    this.container.appendChild(section);
  };

  // ── Continuation lines ─────────────────────────────────────────────────────
  //
  // One logical value, several explicitly mapped regions. The list below is the
  // flow order: «Строка 1» is the field's own printed slot, everything after it
  // is a continuation the value spills onto. Geometry is edited numerically
  // here and by dragging on the page; the final fit always comes from the
  // production engine.
  Inspector.prototype._renderFlowRegions = function (field) {
    var self = this;
    var section = this._section('Строки продолжения');
    var regions = ns.schema.flowRegions(field);
    var implicit = regions.length === 1 && regions[0].implicit;

    section.appendChild(element('p', 'dtb-inspector-hint',
      implicit
        ? 'У поля одна строка — его собственное место в форме. Добавьте строку ' +
          'продолжения, чтобы длинное значение переносилось, а не уменьшалось.'
        : 'Значение заполняет строки по порядку. Уменьшение кегля начинается ' +
          'только после того, как закончились все строки.'));

    if (!implicit) {
      regions.forEach(function (region, index) {
        section.appendChild(self._flowRegionRow(field, regions, region, index));
      });
    }

    var actions = element('div', 'dtb-inspector-actions');

    // A plain continuation: text only, for a place where the authoritative PDF
    // already prints a rule or provides an empty cell.
    var addPlain = element('button', 'dtb-button', 'Добавить строку продолжения');
    addPlain.type = 'button';
    addPlain.addEventListener('click', function () {
      self._appendRegion(field, regions, { withUnderline: false });
    });

    // A full Word-like line: baseline plus its own visible rule, for a place
    // where the form has blank space but no printed line to write on.
    var addFull = element('button', 'dtb-button is-primary',
      'Добавить полноценную строку продолжения');
    addFull.type = 'button';
    addFull.addEventListener('click', function () {
      self._appendRegion(field, regions, {
        withUnderline: true,
        underlineThickness: self._nearbyUnderlineThickness(field)
      });
    });

    // Pure geometry suggestion — the next likely baseline. It stays
    // unconfirmed, and validation blocks production export until reviewed.
    var addBelow = element('button', 'dtb-button', 'Добавить строку ниже');
    addBelow.type = 'button';
    addBelow.addEventListener('click', function () {
      self._appendRegion(field, regions, { withUnderline: false, suggestionOnly: true });
    });

    [addPlain, addFull, addBelow].forEach(function (button) { actions.appendChild(button); });
    section.appendChild(actions);
    section.appendChild(element('small', 'dtb-inspector-hint',
      'Предложенная геометрия не экспортируется, пока её не подтвердят: ' +
      'откройте страницу, проверьте положение и отметьте «Подтверждена».'));
    this.container.appendChild(section);
  };

  // Copy the weight of the nearest printed rule so a generated line starts out
  // matching the form instead of guessing.
  Inspector.prototype._nearbyUnderlineThickness = function (field) {
    var regions = ns.schema.flowRegions(field);
    for (var i = regions.length - 1; i >= 0; i -= 1) {
      if (regions[i].underlineThickness != null) return Number(regions[i].underlineThickness);
    }
    var siblings = (this.state.project.fields || []).filter(function (other) {
      return other.page === field.page && Array.isArray(other.flowRegions);
    });
    for (var j = 0; j < siblings.length; j += 1) {
      var found = (siblings[j].flowRegions || []).filter(function (region) {
        return region.underlineThickness != null;
      })[0];
      if (found) return Number(found.underlineThickness);
    }
    return 0.36;                       // measured weight of the Word underlines
  };

  Inspector.prototype._appendRegion = function (field, regions, options) {
    var self = this;
    var next = ns.schema.flowRegions(field);
    if (next.length === 1 && next[0].implicit) {
      delete next[0].implicit;         // materialise the field's own slot first
    }
    var region = ns.schema.suggestContinuation(field, next, options);
    if (options.suggestionOnly) region.generated = false;
    next.push(region);
    self.state.updateField(field.id, {
      flowRegions: next,
      overflowStrategy: 'flow'
    }, 'add continuation line');
  };

  Inspector.prototype._flowRegionRow = function (field, regions, region, index) {
    var self = this;
    var wrap = element('div', 'dtb-flow-region' +
      (region.reviewStatus === 'suggested' ? ' is-suggested' : ''));

    var head = element('div', 'dtb-flow-region-head');
    head.appendChild(element('strong', '', 'Строка ' + (index + 1) +
      (index === 0 ? ' · основная' : '')));
    if (region.reviewStatus === 'suggested') {
      head.appendChild(element('span', 'dtb-flow-region-badge', 'не подтверждена'));
    }

    function patch(changes) {
      var next = ns.schema.flowRegions(field);
      Object.keys(changes).forEach(function (key) {
        if (changes[key] === undefined || changes[key] === '') delete next[index][key];
        else next[index][key] = changes[key];
      });
      self.state.updateField(field.id, { flowRegions: next }, 'edit continuation line');
    }

    function move(delta) {
      var next = ns.schema.flowRegions(field);
      var target = index + delta;
      if (target < 0 || target >= next.length) return;
      var tmp = next[index]; next[index] = next[target]; next[target] = tmp;
      self.state.updateField(field.id, { flowRegions: next }, 'reorder continuation lines');
    }

    // Removing a region must never remove the logical field with it.
    function remove() {
      var next = ns.schema.flowRegions(field);
      next.splice(index, 1);
      if (next.length <= 1) {
        self.state.updateField(field.id, {
          flowRegions: undefined, overflowStrategy: undefined
        }, 'remove continuation line');
        return;
      }
      self.state.updateField(field.id, { flowRegions: next }, 'remove continuation line');
    }

    [['↑', function () { move(-1); }], ['↓', function () { move(1); }],
     ['×', remove]].forEach(function (action) {
      var button = element('button', 'dtb-icon-button', action[0]);
      button.type = 'button';
      button.addEventListener('click', action[1]);
      head.appendChild(button);
    });
    wrap.appendChild(head);

    [['page', 'Стр.', 1], ['left', 'Left', 0.25], ['baselineTop', 'Baseline', 0.25],
     ['width', 'Width', 0.25], ['maxLines', 'Строк', 1], ['maxFontSize', 'Макс. кегль', 0.25]]
      .forEach(function (entry) {
        var control = input('number', region[entry[0]] == null ? '' : region[entry[0]],
          { step: entry[2] });
        control.classList.add('dtb-control');
        control.addEventListener('change', function () {
          var changes = {};
          changes[entry[0]] = control.value === '' ? undefined : Number(control.value);
          patch(changes);
        });
        wrap.appendChild(row(entry[1], control));
      });

    var underline = input('checkbox', region.drawUnderline);
    underline.classList.add('dtb-control');
    underline.addEventListener('change', function () {
      patch({
        drawUnderline: underline.checked || undefined,
        generated: underline.checked || undefined,
        underlineThickness: underline.checked
          ? self._nearbyUnderlineThickness(field) : undefined
      });
    });
    wrap.appendChild(row('Рисовать линию', underline,
      'Обычная векторная линия в содержимом страницы — не поле формы и не подчёркивания.'));

    if (region.drawUnderline) {
      [['underlineLeft', 'Линия: left'], ['underlineWidth', 'Линия: длина'],
       ['underlineTop', 'Линия: top'], ['underlineThickness', 'Линия: толщина'],
       ['underlineOffset', 'Линия: отступ от baseline']]
        .forEach(function (entry) {
          var control = input('number', region[entry[0]] == null ? '' : region[entry[0]],
            { step: 0.05 });
          control.classList.add('dtb-control');
          control.addEventListener('change', function () {
            var changes = {};
            changes[entry[0]] = control.value === '' ? undefined : Number(control.value);
            patch(changes);
          });
          wrap.appendChild(row(entry[1], control));
        });
    }

    if (index > 0) {
      var approved = input('checkbox', region.reviewStatus === 'approved');
      approved.classList.add('dtb-control');
      approved.addEventListener('change', function () {
        patch({ reviewStatus: approved.checked ? 'approved' : 'suggested' });
      });
      wrap.appendChild(row('Подтверждена визуально', approved,
        'Пока не отмечено, production-экспорт заблокирован.'));
    }

    return wrap;
  };

  Inspector.prototype._renderFallbacks = function (field, formats) {
    var self = this;
    var section = this._section('Fallback formatters');
    var list = element('div', 'dtb-fallback-list');
    (field.fallbacks || []).forEach(function (name, index) {
      var line = element('div', 'dtb-fallback-item');
      line.appendChild(element('code', '', name));
      [['↑', -1], ['↓', 1], ['×', 0]].forEach(function (action) {
        var button = element('button', 'dtb-icon-button', action[0]);
        button.type = 'button';
        button.addEventListener('click', function () {
          var values = (field.fallbacks || []).slice();
          if (action[1] === 0) values.splice(index, 1);
          else {
            var target = index + action[1];
            if (target < 0 || target >= values.length) return;
            var tmp = values[index]; values[index] = values[target]; values[target] = tmp;
          }
          self.state.updateField(field.id, { fallbacks: values }, 'reorder fallbacks');
        });
        line.appendChild(button);
      });
      list.appendChild(line);
    });
    section.appendChild(list);
    var picker = select('', formats.filter(function (choice) { return choice.value; }));
    var add = element('button', 'dtb-button', 'Добавить fallback');
    add.type = 'button';
    add.addEventListener('click', function () {
      var values = (field.fallbacks || []).slice();
      if (picker.value && values.indexOf(picker.value) === -1) values.push(picker.value);
      self.state.updateField(field.id, { fallbacks: values }, 'add fallback');
    });
    section.appendChild(picker);
    section.appendChild(add);
    this.container.appendChild(section);
  };

  Inspector.prototype._renderCheckbox = function (field) {
    var section = this._section('Checkbox');
    [['glyphSize', 'Glyph size'], ['boxSize', 'Box size'], ['offsetX', 'Offset X'], ['offsetY', 'Offset Y'], ['thickness', 'Толщина'], ['inset', 'Inset']]
      .forEach(function (entry) {
        this._addFieldControl(section, field, entry[1], entry[0], input('number', field[entry[0]] == null ? '' : field[entry[0]], { step: 0.25 }), function (value) { return value === '' ? '' : Number(value); });
      }, this);
    this._addFieldControl(section, field, 'Mark style', 'markStyle', select(field.markStyle || 'check', ['check', 'cross', 'fill']), String);
    this._addFieldControl(section, field, 'Equals', 'equals', input('text', field.equals == null ? '' : Array.isArray(field.equals) ? field.equals.join(', ') : String(field.equals)), function (value) {
      if (!value.trim()) return undefined;
      return value.indexOf(',') !== -1 ? value.split(',').map(function (part) { return parseScalar(part); }) : parseScalar(value);
    });
    this._addFieldControl(section, field, 'Invert', 'invert', input('checkbox', field.invert), Boolean);
    this._addFieldControl(section, field, 'Группа', 'checkboxGroup', input('text', field.checkboxGroup || ''), String);
    this._addFieldControl(section, field, 'Тип группы', 'checkboxGroupKind', select(field.checkboxGroupKind || 'independent', [
      { value: 'independent', label: 'Independent' }, { value: 'mutually-exclusive', label: 'Mutually exclusive' },
      { value: 'conditional', label: 'Conditional' }, { value: 'explanatory', label: 'Explanatory / non-fillable' }
    ]), String);
    this._addFieldControl(section, field, 'Не экспортировать', 'explanatory', input('checkbox', field.explanatory), Boolean);
    this.container.appendChild(section);
  };

  Inspector.prototype._renderCondition = function (field) {
    var self = this;
    var section = this._section('Условие показа');
    var condition = field.showWhen || {};
    var mode = !field.showWhen ? 'always' : !Object.prototype.hasOwnProperty.call(condition, 'equals') ? 'truthy' :
      condition.equals === false ? 'false' : Array.isArray(condition.equals) ? 'one-of' : 'equals';
    var modeControl = select(mode, [
      { value: 'always', label: 'Всегда' }, { value: 'truthy', label: 'Источник truthy' },
      { value: 'false', label: 'Источник false' }, { value: 'equals', label: 'Равно значению' },
      { value: 'one-of', label: 'Одно из значений' }
    ]);
    var source = input('text', condition.source || '', { list: 'dtb-source-options' });
    var equals = input('text', Array.isArray(condition.equals) ? condition.equals.join(', ') : condition.equals == null ? '' : String(condition.equals));
    [modeControl, source, equals].forEach(function (control) { control.classList.add('dtb-control'); });
    function update() {
      if (modeControl.value === 'always') self.state.updateField(field.id, { showWhen: undefined }, 'clear condition');
      else {
        var next = { source: source.value };
        if (modeControl.value === 'false') next.equals = false;
        if (modeControl.value === 'equals') next.equals = parseScalar(equals.value);
        if (modeControl.value === 'one-of') next.equals = equals.value.split(',').map(function (part) { return parseScalar(part); });
        self.state.updateField(field.id, { showWhen: next }, 'edit condition');
      }
    }
    modeControl.addEventListener('change', update);
    source.addEventListener('change', update);
    equals.addEventListener('change', update);
    section.appendChild(row('Режим', modeControl));
    section.appendChild(row('Источник', source));
    section.appendChild(row('Значение / список', equals));
    this.container.appendChild(section);
  };

  Inspector.prototype._findWizardControl = function (source) {
    var key = source.split('.').slice(1).join('.');
    var wizard = this.state.project.wizard || {};
    var groups = source.indexOf('check.') === 0 ? ['checkFields'] : ['fields', 'companyFields'];
    for (var i = 0; i < groups.length; i += 1) {
      var list = wizard[groups[i]] || [];
      for (var j = 0; j < list.length; j += 1) if (list[j].key === key) return { group: groups[i], index: j, control: list[j] };
    }
    return null;
  };

  Inspector.prototype._renderWizard = function (field) {
    var self = this;
    var section = this._section('Wizard control');
    var found = this._findWizardControl(field.source);
    var providerSources = (((this.state.project.wizard || {}).normalizedProviders || {})[field.source] || []).slice();
    if ((this.state.project.wizard || {}).extraPassThroughToField && field.source.indexOf('extra.') === 0) providerSources.push('field.' + field.source.slice(6));
    var usage = (this.state.project.fields || []).filter(function (item) { return item.source === field.source || providerSources.indexOf(item.source) !== -1; });
    section.appendChild(element('p', 'dtb-inspector-hint', 'PDF overlays: ' + usage.length + ' · pages: ' + Array.from(new Set(usage.map(function (item) { return item.page + 1; }))).join(', ') + (providerSources.length ? ' · via production normalizer' : '')));
    if (!found) {
      section.appendChild(element('p', 'dtb-warning-text', 'Для источника нет wizard-контрола. Экспорт будет заблокирован.'));
      var create = element('button', 'dtb-button is-primary', 'Создать wizard-контрол');
      create.type = 'button';
      create.addEventListener('click', function () {
        var key = field.source.split('.').slice(1).join('.');
        var group = field.source.indexOf('check.') === 0 ? 'checkFields' : 'fields';
        self.state.commit('create wizard control', function (project) {
          project.wizard[group].push({ key: key, label: ns.sourceCatalog.labelFor(field.source), type: group === 'checkFields' ? 'checkbox' : 'text', required: !!field.required });
        });
      });
      section.appendChild(create);
      this.container.appendChild(section);
      return;
    }
    var control = found.control;
    function update(name, value) {
      self.state.commit('edit wizard control', function (project) {
        var target = project.wizard[found.group][found.index];
        if (value === undefined || value === '') delete target[name]; else target[name] = value;
      });
    }
    [
      ['Key', 'key', input('text', control.key), String],
      ['Label', 'label', input('text', control.label || ''), String],
      ['Type', 'type', select(control.type || 'text', ['text', 'textarea', 'date', 'number', 'select', 'radio', 'checkbox']), String],
      ['Required', 'required', input('checkbox', control.required), Boolean],
      ['Placeholder', 'placeholder', input('text', control.placeholder || ''), String],
      ['Help text', 'help', input('text', control.help || control.helpText || ''), String],
      ['Options (value|label per line)', 'options', document.createElement('textarea'), function (value) {
        return value.split('\n').filter(Boolean).map(function (line) { var parts = line.split('|'); return { value: parts[0], label: parts[1] || parts[0] }; });
      }],
      ['Default', 'default', input('text', control.default == null ? '' : control.default), parseScalar],
      ['Applicability', 'appliesTo', input('text', (control.appliesTo || []).join(', ')), function (value) { return value ? value.split(',').map(function (part) { return part.trim(); }) : undefined; }],
      ['Mutual exclusion group', 'mutualExclusionGroup', input('text', control.mutualExclusionGroup || ''), String],
      ['Multiple', 'multiple', input('checkbox', control.multiple), Boolean],
      ['Workflow-only', 'workflowOnly', input('checkbox', control.workflowOnly), Boolean],
      ['Workflow reason', 'workflowReason', input('text', control.workflowReason || ''), String]
    ].forEach(function (definition) {
      var widget = definition[2];
      if (definition[1] === 'options') widget.value = (control.options || []).map(function (option) { return typeof option === 'string' ? option : option.value + '|' + option.label; }).join('\n');
      widget.classList.add('dtb-control');
      widget.addEventListener('change', function () { update(definition[1], definition[3](widget.type === 'checkbox' ? widget.checked : widget.value)); });
      section.appendChild(row(definition[0], widget));
    });
    var condSource = input('text', control.showWhen && control.showWhen.source || '', { list: 'dtb-source-options' });
    var condEquals = input('text', control.showWhen && control.showWhen.equals != null ? String(control.showWhen.equals) : '');
    condSource.addEventListener('change', function () { update('showWhen', condSource.value ? { source: condSource.value, equals: parseScalar(condEquals.value) } : undefined); });
    condEquals.addEventListener('change', function () { update('showWhen', condSource.value ? { source: condSource.value, equals: parseScalar(condEquals.value) } : undefined); });
    section.appendChild(row('showWhen source', condSource));
    section.appendChild(row('showWhen equals', condEquals));
    this.container.appendChild(section);
  };

  ns.Inspector = Inspector;
}(typeof window !== 'undefined' ? window : this));
