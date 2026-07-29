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
    this._renderFallbacks(field, formats);
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
