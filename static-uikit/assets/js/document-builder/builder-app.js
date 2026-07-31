(function (global) {
  'use strict';

  var ns = global.CRMDocumentBuilder = global.CRMDocumentBuilder || {};

  function byId(id) { return document.getElementById(id); }
  function clone(value) { return ns.schema.clone(value); }

  function TemplateBuilderApp() {
    this.state = new ns.BuilderState();
    this.viewer = null;
    this.editor = null;
    this.inspector = null;
    this.wordFlowEditor = null;
    this.catalog = [];
    this.catalogAudit = null;
    this.sourceInfo = null;
    this.previewUrl = '';
    this.baseObjectUrl = '';
    this.revokedUrls = [];
    this.customFixtures = [];
    this.currentFit = null;
    this.previewInspection = null;
    this._analysisTimer = 0;
    this._toastTimer = 0;
    this.ready = false;
  }

  TemplateBuilderApp.prototype.init = function () {
    var self = this;
    if (global.location.protocol === 'file:') {
      byId('dtb-protocol-blocker').hidden = false;
      byId('dtb-app').hidden = true;
      document.title = 'HTTP required · PDF Template Builder';
      return Promise.resolve(this);
    }
    if (!/^https?:$/.test(global.location.protocol)) {
      return Promise.reject(new Error('Неподдерживаемый протокол: ' + global.location.protocol));
    }
    this._buildCatalog();
    this._populateProfiles();
    this._wireControls();
    this.viewer = new ns.PdfViewer({
      canvas: byId('dtb-pdf-canvas'),
      overlay: byId('dtb-overlay'),
      stage: byId('dtb-page-stage'),
      scroll: byId('dtb-canvas-scroll'),
      pageList: byId('dtb-page-list'),
      status: byId('dtb-pdf-status'),
      getTool: function () { return self.state.tool; },
      onRendered: function () {
        self._syncViewerReadouts();
        if (self.editor) self.editor.render();
      },
      onPageChanged: function (pageIndex) {
        self.state.pageIndex = pageIndex;
        self.state.emit('page');
      }
    });
    this.editor = new ns.OverlayEditor({
      state: this.state,
      viewer: this.viewer,
      svg: byId('dtb-overlay'),
      getPayload: function () { return self.getPayload(); },
      // Region assignments from the production engine's own layout, so the
      // canvas shows the text distributed exactly as it will be printed.
      getAssignments: function (fieldId) {
        if (!self.currentFit) return null;
        var entry = (self.currentFit.fields || []).filter(function (item) {
          return item.fieldId === fieldId;
        })[0];
        return entry && entry.result ? entry.result.assignments || null : null;
      },
      onCoordinates: function (point) { self._showCoordinates(point); },
      onMessage: this.message.bind(this)
    });
    this.inspector = new ns.Inspector({
      state: this.state,
      container: byId('dtb-inspector'),
      sourceDatalist: byId('dtb-source-options'),
      onMessage: this.message.bind(this)
    });
    this.wordFlowEditor = new ns.WordFlowEditor({
      state: this.state,
      container: byId('dtb-word-flow-editor'),
      inspectorContainer: byId('dtb-inspector'),
      listContainer: byId('dtb-word-flow-list'),
      count: byId('dtb-word-flow-count'),
      createButton: byId('dtb-create-word-flow'),
      fieldDatalist: byId('dtb-word-flow-field-options'),
      onMessage: this.message.bind(this)
    });
    this.state.subscribe(function (reason) { self.render(reason); });
    this.state.setProject(ns.schema.emptyProject());
    return this.viewer.init()
      .then(function () { return self._validateCatalogFiles(); })
      .then(function () {
        self.ready = true;
        document.documentElement.dataset.builderReady = 'true';
        self.message('Конструктор готов. Доступно production maps: ' + self.catalog.length + '.');
        return self;
      }).catch(function (error) {
        self.error(error);
        throw error;
      });
  };

  TemplateBuilderApp.prototype._buildCatalog = function () {
    var registry = global.CRMDocumentCatalog;
    var maps = global.CRMDocumentEngine && global.CRMDocumentEngine.fieldMaps || {};
    if (!registry || !Array.isArray(registry.documents)) throw new Error('Production document catalog не загружен.');
    var entries = [];
    registry.documents.forEach(function (doc) {
      if (doc.overlayTemplateId) {
        var direct = clone(doc);
        direct.catalogOwner = doc;
        direct.normalization = registry.normalization;
        entries.push(direct);
      }
      (doc.packageDocuments || []).forEach(function (child) {
        if (!child.overlayTemplateId) return;
        var nested = clone(child);
        nested.description = child.description || doc.description || '';
        nested.category = child.category || doc.category || '';
        nested.appliesTo = child.appliesTo || doc.appliesTo || [];
        nested.catalogOwner = doc;
        nested.normalization = registry.normalization;
        entries.push(nested);
      });
    });
    entries.sort(function (a, b) { return String(a.title).localeCompare(String(b.title), 'ru'); });
    var ids = {};
    var duplicate = [];
    entries.forEach(function (entry) {
      if (ids[entry.overlayTemplateId]) duplicate.push(entry.overlayTemplateId);
      ids[entry.overlayTemplateId] = true;
    });
    var missingMaps = entries.filter(function (entry) { return !maps[entry.overlayTemplateId]; }).map(function (entry) { return entry.overlayTemplateId; });
    var unreferencedMaps = Object.keys(maps).filter(function (id) { return !ids[id]; });
    this.catalogAudit = {
      productionIds: Object.keys(ids).sort(),
      duplicateTemplateIds: duplicate,
      missingMaps: missingMaps,
      unreferencedMaps: unreferencedMaps,
      hiddenIsbyul: !ids['anketa-isbyul'],
      transferRequisitesUnexposed: !ids['transfer-requisites'],
      pdfFailures: []
    };
    if (duplicate.length || missingMaps.length || unreferencedMaps.length || entries.length !== 18) {
      throw new Error('Нарушена целостность каталога: production=' + entries.length + ', missing maps=' + missingMaps.join(', ') + ', unreferenced=' + unreferencedMaps.join(', ') + '.');
    }
    if (!this.catalogAudit.hiddenIsbyul || !this.catalogAudit.transferRequisitesUnexposed) {
      throw new Error('Скрытый или статический документ ошибочно попал в builder catalog.');
    }
    this.catalog = entries;
    var select = byId('dtb-existing-template');
    entries.forEach(function (entry) {
      var option = document.createElement('option');
      option.value = entry.overlayTemplateId;
      option.textContent = entry.title + ' · ' + entry.overlayTemplateId;
      select.appendChild(option);
    });
    byId('dtb-catalog-count').textContent = String(entries.length);
  };

  TemplateBuilderApp.prototype._validateCatalogFiles = function () {
    var self = this;
    var maps = global.CRMDocumentEngine.fieldMaps;
    return Promise.all(this.catalog.map(function (entry) {
      var map = maps[entry.overlayTemplateId];
      return self.safeFetch(map.templateUrl, { method: 'HEAD' }).then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return { id: map.id, ok: true };
      }).catch(function (error) {
        return { id: map.id, ok: false, error: error.message };
      });
    })).then(function (results) {
      self.catalogAudit.pdfFailures = results.filter(function (result) { return !result.ok; });
      if (self.catalogAudit.pdfFailures.length) {
        throw new Error('Не найдены PDF для карт: ' + self.catalogAudit.pdfFailures.map(function (failure) { return failure.id; }).join(', ') + '.');
      }
      byId('dtb-catalog-status').textContent = '18/18 maps · 18/18 PDFs · registry synchronized';
      return self.catalogAudit;
    });
  };

  TemplateBuilderApp.prototype.safeFetch = function (url, options) {
    var absolute = new URL(url, global.location.href);
    if (absolute.origin !== global.location.origin) return Promise.reject(new Error('Внешние сетевые запросы запрещены: ' + absolute.origin));
    return fetch(absolute.href, options || {});
  };

  TemplateBuilderApp.prototype._populateProfiles = function () {
    var select = byId('dtb-profile');
    ns.fixtures.profiles.forEach(function (profile) {
      var option = document.createElement('option');
      option.value = profile.id;
      option.textContent = profile.title;
      select.appendChild(option);
    });
    select.value = this.state.profileId;
  };

  TemplateBuilderApp.prototype._wireControls = function () {
    var self = this;
    byId('dtb-existing-template').addEventListener('change', function () { if (this.value) self.openExisting(this.value); });
    byId('dtb-new-project').addEventListener('click', function () { self.newProject(); });
    byId('dtb-select-new-pdf').addEventListener('click', function () { byId('dtb-new-pdf-input').click(); });
    byId('dtb-replace-pdf').addEventListener('click', function () { byId('dtb-replace-pdf-input').click(); });
    byId('dtb-new-pdf-input').addEventListener('change', function () { if (this.files[0]) self.openNewPdf(this.files[0]); this.value = ''; });
    byId('dtb-replace-pdf-input').addEventListener('change', function () { if (this.files[0]) self.replacePdf(this.files[0]); this.value = ''; });
    byId('dtb-import-project').addEventListener('click', function () { byId('dtb-project-input').click(); });
    byId('dtb-project-input').addEventListener('change', function () { if (this.files[0]) self.importProject(this.files[0]); this.value = ''; });
    byId('dtb-import-fixtures').addEventListener('click', function () { byId('dtb-fixtures-input').click(); });
    byId('dtb-fixtures-input').addEventListener('change', function () { if (this.files[0]) self.importFixtures(this.files[0]); this.value = ''; });
    byId('dtb-save-draft').addEventListener('click', this.saveDraft.bind(this));
    byId('dtb-clear-draft').addEventListener('click', this.clearDraft.bind(this));
    byId('dtb-undo').addEventListener('click', this.state.undo.bind(this.state));
    byId('dtb-redo').addEventListener('click', this.state.redo.bind(this.state));
    byId('dtb-preview-pdf').addEventListener('click', function () { self.generatePreview(); });
    byId('dtb-validate').addEventListener('click', function () { self.validateCurrent(); });
    byId('dtb-run-all').addEventListener('click', function () { self.runAllProfiles(); });
    byId('dtb-export-project').addEventListener('click', this.exportProject.bind(this));
    byId('dtb-export-map').addEventListener('click', this.exportProductionMap.bind(this));
    byId('dtb-export-registry').addEventListener('click', this.exportRegistry.bind(this));
    byId('dtb-export-fixtures').addEventListener('click', this.exportFixtures.bind(this));
    byId('dtb-export-qa').addEventListener('click', this.exportQa.bind(this));
    byId('dtb-toggle-preview').addEventListener('click', function () { byId('dtb-final-preview').hidden = !byId('dtb-final-preview').hidden; });
    document.querySelectorAll('[data-tool]').forEach(function (button) {
      button.addEventListener('click', function () { self.state.tool = button.dataset.tool; self.state.emit('tool'); });
    });
    byId('dtb-prev-page').addEventListener('click', function () { self.goToPage(self.state.pageIndex - 1); });
    byId('dtb-next-page').addEventListener('click', function () { self.goToPage(self.state.pageIndex + 1); });
    byId('dtb-zoom-out').addEventListener('click', function () { self.viewer.setZoom(self.viewer.zoom / 1.1, 'custom'); });
    byId('dtb-zoom-in').addEventListener('click', function () { self.viewer.setZoom(self.viewer.zoom * 1.1, 'custom'); });
    byId('dtb-fit-width').addEventListener('click', function () { self.viewer.fit('fit-width'); });
    byId('dtb-fit-page').addEventListener('click', function () { self.viewer.fit('fit-page'); });
    byId('dtb-snap').addEventListener('change', function () { self.state.snapping = this.checked; });
    byId('dtb-mm').addEventListener('change', function () { self.state.mmDisplay = this.checked; });
    byId('dtb-outlines').addEventListener('change', function () { self.state.outlinesVisible = this.checked; self.editor.render(); });
    byId('dtb-profile').addEventListener('change', function () { self.state.profileId = this.value; self.state.payloadOverrides = {}; self.state.emit('profile'); });
    byId('dtb-payload-filter').addEventListener('input', this.renderPayload.bind(this));
    byId('dtb-field-filter').addEventListener('input', this.renderFieldList.bind(this));

    var metadata = [
      ['dtb-meta-id', 'templateId', String], ['dtb-meta-title', 'title', String],
      ['dtb-meta-description', 'description', String], ['dtb-meta-category', 'category', String],
      ['dtb-meta-pages', 'expectedPages', Number], ['dtb-meta-output', 'outputFilename', String],
      ['dtb-qa-status', 'qa.status', String]
    ];
    metadata.forEach(function (definition) {
      byId(definition[0]).addEventListener('change', function () {
        var value = definition[2](this.value);
        self.state.commit('edit project metadata', function (project) {
          if (definition[1] === 'qa.status') project.qa.status = value;
          else project[definition[1]] = value;
        });
      });
    });
    function updateApplies() {
      self.state.commit('edit applicability', function (project) {
        project.appliesTo = [];
        if (byId('dtb-applies-individual').checked) project.appliesTo.push('individual');
        if (byId('dtb-applies-company').checked) project.appliesTo.push('company');
      });
    }
    byId('dtb-applies-individual').addEventListener('change', updateApplies);
    byId('dtb-applies-company').addEventListener('change', updateApplies);

    global.addEventListener('beforeunload', function () { self.cleanupUrls(); });
    if (global.ResizeObserver) {
      var timer;
      new ResizeObserver(function () {
        clearTimeout(timer);
        timer = global.setTimeout(function () { if (self.viewer && self.viewer.pdf) self.viewer.render(); }, 120);
      }).observe(byId('dtb-canvas-scroll'));
    }
  };

  TemplateBuilderApp.prototype.render = function (reason) {
    if (!this.state.project) return;
    if (reason === 'identifier-protection' && this.state.lastIdentifierViolation) {
      this.message(this.state.lastIdentifierViolation.message, true);
    }
    if (reason === 'word-flow-protection' && this.state.lastWordFlowViolation) {
      this.message(this.state.lastWordFlowViolation.message, true);
    }
    this.renderMetadata();
    this.renderFieldList();
    this.inspector && this.inspector.setSources(ns.sourceCatalog.collect(global.CRMDocumentEngine, this.state.project));
    this.inspector && this.inspector.render();
    this.wordFlowEditor && this.wordFlowEditor.render();
    this.renderPayload();
    document.querySelectorAll('[data-tool]').forEach(function (button) { button.classList.toggle('is-active', button.dataset.tool === this.state.tool); }, this);
    byId('dtb-undo').disabled = !this.state.history.length;
    byId('dtb-redo').disabled = !this.state.future.length;
    if (this.viewer && this.viewer.pdf) {
      if (this.viewer.pageIndex !== this.state.pageIndex) this.viewer.setPage(this.state.pageIndex);
      else this.editor.render();
    }
    if (['model', 'project', 'profile', 'undo', 'redo'].indexOf(reason) !== -1) this._scheduleAnalysis();
  };

  TemplateBuilderApp.prototype.renderMetadata = function () {
    var project = this.state.project;
    var templateId = byId('dtb-meta-id');
    var identifierLocked = !!(ns.identifierProtection &&
      ns.identifierProtection.isTemplateProtected(project));
    templateId.value = project.templateId || '';
    templateId.readOnly = identifierLocked;
    templateId.title = identifierLocked ? ns.identifierProtection.WARNING : '';
    var identifierWarning = byId('dtb-meta-id-warning');
    if (identifierWarning) identifierWarning.hidden = !identifierLocked;
    byId('dtb-meta-title').value = project.title || '';
    byId('dtb-meta-description').value = project.description || '';
    byId('dtb-meta-category').value = project.category || '';
    byId('dtb-meta-pages').value = project.expectedPages || '';
    byId('dtb-meta-output').value = project.outputFilename || '';
    byId('dtb-qa-status').value = project.qa && project.qa.status || 'Draft';
    byId('dtb-applies-individual').checked = (project.appliesTo || []).indexOf('individual') !== -1;
    byId('dtb-applies-company').checked = (project.appliesTo || []).indexOf('company') !== -1;
    byId('dtb-pdf-hash').textContent = 'SHA-256: ' + (project.sourcePdfSha256 || '—');
  };

  TemplateBuilderApp.prototype.renderFieldList = function () {
    var self = this;
    var container = byId('dtb-field-list');
    var filter = byId('dtb-field-filter').value.toLowerCase();
    container.textContent = '';
    var fields = (this.state.project && this.state.project.fields || []).filter(function (field) {
      return !filter || (field.id + ' ' + (field.source || '')).toLowerCase().indexOf(filter) !== -1;
    });
    fields.forEach(function (field) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'dtb-field-item' + (field.id === self.state.selectedFieldId ? ' is-active' : '');
      var name = document.createElement('strong'); name.textContent = field.id;
      var source = document.createElement('span'); source.textContent = 'p.' + (field.page + 1) + ' · ' + (field.source || field.text || field.type || 'text');
      button.appendChild(name); button.appendChild(source);
      button.addEventListener('click', function () { self.state.selectField(field.id); });
      container.appendChild(button);
    });
    byId('dtb-field-count').textContent = String((this.state.project && this.state.project.fields || []).length);
  };

  TemplateBuilderApp.prototype.renderPayload = function () {
    if (!this.state.project) return;
    var self = this;
    var filter = byId('dtb-payload-filter').value.toLowerCase();
    var payload = this.getPayload();
    var rows = [];
    ['subject', 'fields', 'extraValues', 'checks'].forEach(function (namespace) {
      var prefix = namespace === 'fields' ? 'field' : namespace === 'extraValues' ? 'extra' : namespace === 'checks' ? 'check' : 'subject';
      Object.keys(payload[namespace] || {}).sort().forEach(function (key) {
        rows.push({ path: prefix + '.' + key, value: payload[namespace][key], namespace: prefix });
      });
    });
    var container = byId('dtb-payload-editor');
    container.textContent = '';
    var lastNamespace = '';
    rows.filter(function (row) { return !filter || row.path.toLowerCase().indexOf(filter) !== -1; }).forEach(function (entry) {
      if (entry.namespace !== lastNamespace) {
        container.appendChild(document.createElement('hr'));
        var heading = document.createElement('strong'); heading.textContent = entry.namespace + '.*'; container.appendChild(heading);
        lastNamespace = entry.namespace;
      }
      var wrap = document.createElement('label'); wrap.className = 'dtb-payload-row';
      var code = document.createElement('code'); code.textContent = entry.path; code.title = entry.path;
      var control = document.createElement('input');
      if (typeof entry.value === 'boolean') { control.type = 'checkbox'; control.checked = entry.value; }
      else { control.type = 'text'; control.value = entry.value == null ? '' : entry.value; }
      control.className = 'dtb-control';
      control.addEventListener('change', function () {
        self.state.payloadOverrides[entry.path] = control.type === 'checkbox' ? control.checked : control.value;
        self.state.emit('payload');
      });
      wrap.appendChild(code); wrap.appendChild(control); container.appendChild(wrap);
    });
  };

  TemplateBuilderApp.prototype._scheduleAnalysis = function () {
    var self = this;
    clearTimeout(this._analysisTimer);
    this._analysisTimer = global.setTimeout(function () {
      if (!self.state.project || !self.sourceInfo) return;
      ns.validation.analyzeProfile(self.state.project, self.state.profileId, self.state.payloadOverrides)
        .then(function (result) {
          self.currentFit = result;
          self.renderCurrentFit();
          // Redraw the page so the canvas preview shows the freshly computed
          // distribution across the continuation lines.
          self.editor.render();
        })
        .catch(function (error) { self.error(error); });
    }, 180);
  };

  TemplateBuilderApp.prototype.renderCurrentFit = function () {
    if (this.state.batchResults) return;
    var container = byId('dtb-fit-table');
    container.textContent = '';
    if (!this.currentFit) return;
    var table = document.createElement('table');
    var head = table.createTHead().insertRow();
    ['Field', ns.fixtures.profile(this.currentFit.profileId).title].forEach(function (text) { var th = document.createElement('th'); th.textContent = text; head.appendChild(th); });
    var body = table.createTBody();
    this.currentFit.fields.forEach(function (entry) {
      var row = body.insertRow(); row.insertCell().textContent = entry.fieldId;
      var cell = row.insertCell(); cell.textContent = entry.result.label; cell.dataset.status = entry.result.status; cell.className = 'dtb-fit-cell';
    });
    container.appendChild(table);
  };

  TemplateBuilderApp.prototype.renderBatch = function () {
    var self = this;
    var batch = this.state.batchResults;
    var container = byId('dtb-fit-table'); container.textContent = '';
    if (!batch) return;
    var table = document.createElement('table');
    var head = table.createTHead().insertRow();
    var fieldHead = document.createElement('th'); fieldHead.textContent = 'Field'; head.appendChild(fieldHead);
    batch.profiles.forEach(function (profile) { var th = document.createElement('th'); th.textContent = profile.profileId; head.appendChild(th); });
    var body = table.createTBody();
    (this.state.project.fields || []).forEach(function (field, fieldIndex) {
      var row = body.insertRow(); row.insertCell().textContent = field.id;
      batch.profiles.forEach(function (profile) {
        var entry = profile.fields[fieldIndex];
        var cell = row.insertCell(); cell.className = 'dtb-fit-cell'; cell.dataset.status = entry.result.status; cell.textContent = entry.result.label;
        cell.addEventListener('click', function () {
          self.state.profileId = profile.profileId; byId('dtb-profile').value = profile.profileId;
          self.goToPage(field.page); self.state.selectField(field.id); self.inspector.render();
        });
      });
    });
    container.appendChild(table);
  };

  TemplateBuilderApp.prototype.renderIssues = function () {
    var self = this;
    var container = byId('dtb-issues'); container.textContent = '';
    var validation = this.state.validation || { errors: [], warnings: [] };
    validation.errors.concat(validation.warnings).forEach(function (issue) {
      var node = document.createElement('div');
      node.className = 'dtb-issue' + (issue.level === 'error' ? ' is-error' : '');
      node.textContent = (issue.fieldId ? issue.fieldId + ' · ' : '') + issue.message;
      if (issue.fieldId) node.addEventListener('click', function () { self.goToPage(issue.page || 0); self.state.selectField(issue.fieldId); });
      container.appendChild(node);
    });
    byId('dtb-validation-summary').textContent = validation.errors.length + ' errors · ' + validation.warnings.length + ' warnings';
  };

  TemplateBuilderApp.prototype.getPayload = function () {
    var custom = this.customFixtures.find(function (profile) { return profile.id === this.state.profileId; }, this);
    if (custom) {
      var payload = clone(custom.payload);
      Object.keys(this.state.payloadOverrides).forEach(function (path) { ns.fixtures.assignPath(payload, path, this.state.payloadOverrides[path], true); }, this);
      return payload;
    }
    return ns.fixtures.payloadFor(this.state.profileId, this.state.project, this.state.payloadOverrides);
  };

  TemplateBuilderApp.prototype.newProject = function () {
    this._revokeBaseUrl();
    this.sourceInfo = null;
    this.state.sourcePdfBytes = null;
    this.state.runtimePdfUrl = '';
    if (this.viewer) this.viewer.destroy();
    byId('dtb-pdf-canvas').getContext('2d').clearRect(0, 0, byId('dtb-pdf-canvas').width, byId('dtb-pdf-canvas').height);
    byId('dtb-overlay').textContent = '';
    byId('dtb-page-list').textContent = '';
    byId('dtb-existing-template').value = '';
    this.state.setProject(ns.schema.emptyProject());
    this.message('Новый проект создан. Задайте метаданные и выберите чистый PDF.');
  };

  TemplateBuilderApp.prototype.openExisting = function (templateId) {
    var self = this;
    var entry = this.catalog.find(function (item) { return item.overlayTemplateId === templateId; });
    var map = global.CRMDocumentEngine.fieldMaps[templateId];
    if (!entry || !map) return Promise.reject(new Error('Field map не найден: ' + templateId));
    var nonSerializable = ns.schema.findNonSerializable(map);
    if (nonSerializable.length) return Promise.reject(new Error('Пользовательское правило — только чтение: ' + nonSerializable[0].path));
    this._revokeBaseUrl();
    this.state.setProject(ns.schema.fromProduction(map, entry));
    var appliesTo = this.state.project.appliesTo || [];
    var currentProfile = ns.fixtures.profile(this.state.profileId);
    if (appliesTo.length === 1 && appliesTo[0] === 'company' && currentProfile.kind !== 'company') {
      this.state.profileId = 'ru-company-normal';
    } else if (appliesTo.length === 1 && appliesTo[0] === 'individual' && currentProfile.kind !== 'individual') {
      this.state.profileId = 'ru-resident-normal';
    }
    byId('dtb-profile').value = this.state.profileId;
    byId('dtb-existing-template').value = templateId;
    this.message('Открывается ' + templateId + '…');
    return this.safeFetch(map.templateUrl).then(function (response) {
      if (!response.ok) throw new Error('PDF failed to load: HTTP ' + response.status);
      return response.arrayBuffer();
    }).then(function (bytes) {
      self.state.sourcePdfBytes = new Uint8Array(bytes);
      self.state.runtimePdfUrl = map.templateUrl;
      return self.viewer.load(self.state.sourcePdfBytes, map.id);
    }).then(function (info) {
      self.sourceInfo = info;
      self.state.sourceInfo = info;
      self.state.project.sourcePdfSha256 = info.sha256;
      self.state.project.pageGeometry = clone(info.pages);
      self.state.project.expectedPages = map.expectedPages;
      self.state.emit('pdf');
      return self.viewer.fit('fit-width');
    }).then(function () {
      return self.validateCurrent();
    }).catch(function (error) { self.error(error); throw error; });
  };

  TemplateBuilderApp.prototype.openNewPdf = function (file) {
    var self = this;
    if (!file || !/\.pdf$/i.test(file.name)) return Promise.reject(new Error('Выберите PDF-файл.'));
    return file.arrayBuffer().then(function (bytes) {
      self._revokeBaseUrl();
      self.baseObjectUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      self.state.runtimePdfUrl = self.baseObjectUrl;
      self.state.sourcePdfBytes = new Uint8Array(bytes);
      return self.viewer.load(self.state.sourcePdfBytes, file.name);
    }).then(function (info) {
      self.sourceInfo = info; self.state.sourceInfo = info;
      self.state.commit('attach new PDF', function (project) {
        project.sourcePdf = { name: file.name, committed: false };
        project.sourcePdfSha256 = info.sha256;
        project.expectedPages = info.pageCount;
        project.pageGeometry = clone(info.pages);
        if (project.templateId === 'new-document') {
          var id = file.name.replace(/\.pdf$/i, '').replace(/[^A-Za-z0-9._-]+/g, '-').toLowerCase();
          project.templateId = id || 'new-document';
          project.templateUrl = '../assets/document-pdf-templates/' + project.templateId + '.pdf';
          project.outputFilename = project.templateId + '.pdf';
        }
      });
      return self.viewer.fit('fit-width');
    }).then(function () { return self.validateCurrent(); })
      .catch(function (error) { self.error(new Error('PDF failed to load: ' + error.message)); throw error; });
  };

  TemplateBuilderApp.prototype.replacePdf = function (file) {
    var self = this;
    if (!this.sourceInfo || !this.state.sourcePdfBytes) return Promise.reject(new Error('Сначала откройте исходный PDF.'));
    var oldInfo = clone(this.sourceInfo);
    var oldBytes = this.state.sourcePdfBytes.slice();
    var oldRuntimeUrl = this.state.runtimePdfUrl;
    return file.arrayBuffer().then(function (bytes) {
      return self.viewer.load(new Uint8Array(bytes), file.name).then(function (newInfo) {
        var dimensions = [];
        var maxPages = Math.max(oldInfo.pages.length, newInfo.pages.length);
        for (var index = 0; index < maxPages; index += 1) {
          var oldPage = oldInfo.pages[index], newPage = newInfo.pages[index];
          if (!oldPage || !newPage || Math.abs(oldPage.width - newPage.width) > 0.01 || Math.abs(oldPage.height - newPage.height) > 0.01) dimensions.push(index + 1);
        }
        var textChanged = [];
        for (var textIndex = 0; textIndex < Math.max(oldInfo.textByPage.length, newInfo.textByPage.length); textIndex += 1) {
          if ((oldInfo.textByPage[textIndex] || '') !== (newInfo.textByPage[textIndex] || '')) textChanged.push(textIndex + 1);
        }
        self._revokeBaseUrl();
        self.baseObjectUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
        self.state.runtimePdfUrl = self.baseObjectUrl;
        self.state.sourcePdfBytes = new Uint8Array(bytes);
        self.sourceInfo = newInfo; self.state.sourceInfo = newInfo;
        self.state.commit('replace base PDF', function (project) {
          project.sourcePdf = { name: file.name, committed: false, replacement: true };
          project.sourcePdfSha256 = newInfo.sha256;
          project.expectedPages = newInfo.pageCount;
          project.pageGeometry = clone(newInfo.pages);
          project.fields.forEach(function (field) { field.reviewStatus = 'required'; });
          project.replacementReview = {
            oldHash: oldInfo.sha256,
            newHash: newInfo.sha256,
            oldPageCount: oldInfo.pageCount,
            newPageCount: newInfo.pageCount,
            changedPageDimensions: dimensions,
            changedTextPages: textChanged,
            pagesRequiringReview: Array.from(new Set(dimensions.concat(textChanged).concat(project.fields.map(function (field) { return field.page + 1; })))).sort(function (a, b) { return a - b; })
          };
        });
        return self.validateCurrent().then(function (validation) {
          var out = validation.errors.filter(function (entry) { return entry.code === 'out-of-bounds'; }).length;
          self.state.project.replacementReview.fieldsOutOfBounds = out;
          self.state.project.replacementReview.fieldsStillInBounds = self.state.project.fields.length - out;
          self.message('PDF заменён: ' + oldInfo.pageCount + ' → ' + newInfo.pageCount + ' стр.; размеры изменены на страницах: ' + (dimensions.join(', ') || 'нет') + '; outside: ' + out + '.');
          return self.state.project.replacementReview;
        });
      }).catch(function (error) {
        self.state.runtimePdfUrl = oldRuntimeUrl;
        self.state.sourcePdfBytes = oldBytes;
        return self.viewer.load(oldBytes, 'Восстановленный исходный PDF').then(function () { throw new Error('Invalid replacement PDF: ' + error.message); });
      });
    }).catch(function (error) { self.error(error); throw error; });
  };

  TemplateBuilderApp.prototype.validateCurrent = function () {
    var self = this;
    if (!this.sourceInfo) {
      var missing = { errors: [{ level: 'error', code: 'pdf-missing', message: 'Сначала откройте PDF.', fieldId: null, page: null }], warnings: [] };
      this.state.validation = missing; this.renderIssues(); return Promise.resolve(missing);
    }
    var structural = ns.validation.structural(this.state.project, this.sourceInfo, this.getPayload());
    this.state.validation = structural;
    return ns.validation.analyzeProfile(this.state.project, this.state.profileId, this.state.payloadOverrides).then(function (fit) {
      self.currentFit = fit;
      fit.fields.forEach(function (entry) {
        if (['overflow', 'missing', 'unsupported-glyph', 'error'].indexOf(entry.result.status) !== -1) {
          structural.errors.push({
            level: 'error', code: entry.result.status, fieldId: entry.fieldId, page: entry.page,
            message: entry.result.status === 'unsupported-glyph'
              ? 'Unsupported glyph: ' + entry.result.label + ' · profile ' + fit.profileId + '.'
              : entry.result.label + ' · profile ' + fit.profileId + '.'
          });
        }
      });
      var passed = structural.errors.length === 0;
      self.state.commit('validation status', function (project) {
        project.qa.automaticValidationPassed = passed;
        project.qa.lastValidatedAt = passed ? new Date().toISOString() : null;
        if (passed && ['Draft', 'Mapped'].indexOf(project.qa.status) !== -1) project.qa.status = 'Automatic validation passed';
      });
      self.state.validation = structural;
      self.renderIssues(); self.renderCurrentFit();
      return structural;
    }).catch(function (error) { self.error(error); throw error; });
  };

  TemplateBuilderApp.prototype.runAllProfiles = function () {
    var self = this;
    if (!this.sourceInfo) return Promise.reject(new Error('Сначала откройте PDF.'));
    byId('dtb-validation-summary').textContent = 'Проверяются 13 профилей…';
    return ns.validation.runAll(this.state.project, {}).then(function (batch) {
      self.state.batchResults = batch;
      self.renderBatch();
      var c = batch.counts;
      byId('dtb-validation-summary').textContent = 'normal ' + c.normal + ' · Word-flow ' + c.wordFlow + ' · shrink ' + c.shrink + ' · multiline ' + c.multiline + ' · fallback ' + c.fallback + ' · failures ' + c.failures + ' · missing ' + c.missing + ' · glyph ' + c.unsupportedGlyphs;
      return batch;
    }).catch(function (error) { self.error(error); throw error; });
  };

  TemplateBuilderApp.prototype.generatePreview = function () {
    var self = this;
    if (!this.state.runtimePdfUrl) return Promise.reject(new Error('Сначала откройте PDF.'));
    return this.validateCurrent().then(function (validation) {
      if (validation.errors.length) throw new Error('Экспорт заблокирован: ' + validation.errors[0].message);
      var url = new URL(self.state.runtimePdfUrl, global.location.href);
      if (url.protocol !== 'blob:' && url.origin !== global.location.origin) throw new Error('Внешние URL запрещены.');
      var template = ns.schema.toProduction(self.state.project, self.state.runtimePdfUrl);
      return global.CRMDocumentEngine.overlayRenderer.render(template, self.getPayload(), { validatePayload: true });
    }).then(function (blob) {
      self._revokePreviewUrl();
      self.previewUrl = URL.createObjectURL(blob);
      byId('dtb-final-frame').src = self.previewUrl;
      byId('dtb-final-preview').hidden = false;
      var download = byId('dtb-download-preview');
      download.href = self.previewUrl; download.download = self.state.project.outputFilename; download.classList.remove('is-disabled');
      return blob.arrayBuffer().then(function (bytes) {
        return self._inspectGenerated(new Uint8Array(bytes)).then(function (inspection) {
          self.previewInspection = inspection;
          self.message('Final PDF: ' + inspection.pageCount + ' pages · AcroForm ' + inspection.acroFormFields + ' · widgets ' + inspection.widgets + '.');
          return { blob: blob, inspection: inspection };
        });
      });
    }).catch(function (error) {
      if (error && error.fieldId) self.state.selectField(error.fieldId);
      self.error(error); throw error;
    });
  };

  TemplateBuilderApp.prototype._inspectGenerated = function (bytes) {
    var self = this;
    var docPromise = global.PDFLib.PDFDocument.load(bytes.slice(), { ignoreEncryption: true }).then(function (doc) {
      return { pageCount: doc.getPageCount(), acroFormFields: doc.getForm().getFields().length };
    });
    var pdfPromise = this.viewer.pdfjs.getDocument({ data: bytes.slice(), isEvalSupported: false, useWorkerFetch: false }).promise.then(function (pdf) {
      var jobs = [];
      for (var i = 1; i <= pdf.numPages; i += 1) jobs.push(pdf.getPage(i).then(function (page) { return page.getAnnotations({ intent: 'display' }); }));
      return Promise.all(jobs).then(function (pages) {
        var widgets = pages.reduce(function (sum, annotations) { return sum + annotations.filter(function (annotation) { return annotation.subtype === 'Widget'; }).length; }, 0);
        return pdf.destroy().then(function () { return widgets; });
      });
    });
    return Promise.all([docPromise, pdfPromise]).then(function (values) {
      values[0].widgets = values[1];
      values[0].noAppendedPages = values[0].pageCount === self.state.project.expectedPages;
      return values[0];
    });
  };

  TemplateBuilderApp.prototype.productionExportAllowed = function () {
    if (!this.state.validation) this.state.validation = ns.validation.structural(this.state.project, this.sourceInfo, this.getPayload());
    var blockingWarningCodes = { 'unused-wizard': true, 'review-required': true };
    var blocker = this.state.validation.errors[0] || this.state.validation.warnings.find(function (warning) { return blockingWarningCodes[warning.code]; });
    if (blocker) {
      console.warn('[DocumentTemplateBuilder] Export blocked:', blocker);
      this.message('Export blocked: ' + blocker.message, true);
      return false;
    }
    if (this.state.project.readOnlyRules && this.state.project.readOnlyRules.length) {
      console.warn('[DocumentTemplateBuilder] Custom rule is read-only:', this.state.project.readOnlyRules);
      this.message('Пользовательское правило — только чтение.', true);
      return false;
    }
    if (['Approved', 'Published'].indexOf(this.state.project.qa.status) === -1) {
      return global.confirm('Статус проекта «' + this.state.project.qa.status + '». Экспортировать production-файл с предупреждением?');
    }
    return true;
  };

  TemplateBuilderApp.prototype.exportProject = function () {
    var text = ns.io.exportProject(this.state.project);
    ns.io.download(this.state.project.templateId + '.builder.json', text, 'application/json');
    return text;
  };
  TemplateBuilderApp.prototype.exportProductionMap = function () {
    if (!this.productionExportAllowed()) return null;
    var text = ns.io.productionJs(this.state.project);
    ns.io.download(this.state.project.templateId + '.js', text, 'text/javascript');
    return text;
  };
  TemplateBuilderApp.prototype.exportRegistry = function () {
    if (!this.productionExportAllowed()) return null;
    var text = ns.io.exportRegistry(this.state.project);
    ns.io.download(this.state.project.templateId + '.registry.json', text, 'application/json');
    return text;
  };
  TemplateBuilderApp.prototype.exportFixtures = function () {
    var text = ns.io.exportFixtures(this.state.project);
    ns.io.download(this.state.project.templateId + '.fixtures.json', text, 'application/json');
    return text;
  };
  TemplateBuilderApp.prototype.exportQa = function () {
    var text = ns.io.exportQa(this.state.project, this.state.validation, this.state.batchResults);
    ns.io.download(this.state.project.templateId + '.qa-report.json', text, 'application/json');
    return text;
  };

  TemplateBuilderApp.prototype.importProject = function (file) {
    var self = this;
    return file.text().then(function (text) {
      var imported = ns.io.importProjectText(text);
      self.state.setProject(imported.project);
      if (imported.warnings.length) self.message(imported.warnings.length + ' unknown properties preserved.');
      return self.safeFetch(imported.project.templateUrl).then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.arrayBuffer();
      }).then(function (bytes) {
        self.state.sourcePdfBytes = new Uint8Array(bytes);
        self.state.runtimePdfUrl = imported.project.templateUrl;
        return self.viewer.load(self.state.sourcePdfBytes, imported.project.templateId);
      }).then(function (info) {
        self.sourceInfo = info; self.state.sourceInfo = info;
        self.state.emit('pdf');
        return self.validateCurrent();
      }).catch(function (error) {
        self.message('Проект импортирован; PDF нужно выбрать локально: ' + error.message, true);
        return imported;
      });
    }).catch(function (error) { self.error(error); throw error; });
  };

  TemplateBuilderApp.prototype.importFixtures = function (file) {
    var self = this;
    return file.text().then(function (text) {
      var data = ns.fixtures.importData(JSON.parse(text));
      self.customFixtures = data.profiles;
      var select = byId('dtb-profile');
      select.querySelectorAll('[data-custom]').forEach(function (option) { option.remove(); });
      data.profiles.forEach(function (profile) {
        var option = document.createElement('option'); option.dataset.custom = 'true'; option.value = profile.id; option.textContent = 'Imported · ' + profile.title; select.appendChild(option);
      });
      self.message('Импортировано synthetic fixtures: ' + data.profiles.length + '.');
      return data;
    }).catch(function (error) { self.error(error); throw error; });
  };

  TemplateBuilderApp.prototype.saveDraft = function () {
    var key = 'crm-document-template-builder:' + this.state.project.templateId;
    if (localStorage.getItem(key) && !global.confirm('Перезаписать локальный черновик ' + this.state.project.templateId + '?')) return false;
    localStorage.setItem(key, ns.io.exportProject(this.state.project));
    this.message('Черновик сохранён только в localStorage. Test payload overrides не сохранены.');
    return true;
  };

  TemplateBuilderApp.prototype.clearDraft = function () {
    var key = 'crm-document-template-builder:' + this.state.project.templateId;
    localStorage.removeItem(key);
    this.message('Локальный черновик удалён.');
    return true;
  };

  TemplateBuilderApp.prototype.goToPage = function (index) {
    if (!this.viewer || !this.viewer.pages.length) return Promise.resolve();
    this.state.pageIndex = Math.max(0, Math.min(this.viewer.pages.length - 1, Number(index)));
    this.state.emit('page');
    return this.viewer.setPage(this.state.pageIndex);
  };

  TemplateBuilderApp.prototype._syncViewerReadouts = function () {
    byId('dtb-page-readout').textContent = this.viewer.pages.length ? (this.viewer.pageIndex + 1) + ' / ' + this.viewer.pages.length : '— / —';
    byId('dtb-zoom-readout').textContent = Math.round(this.viewer.zoom * 100) + '%';
  };

  TemplateBuilderApp.prototype._showCoordinates = function (point) {
    var unit = this.state.mmDisplay ? ' mm' : ' pt';
    var factor = this.state.mmDisplay ? 25.4 / 72 : 1;
    byId('dtb-coordinate-readout').textContent = 'x ' + (point.left * factor).toFixed(2) + ' · y ' + (point.top * factor).toFixed(2) + unit;
  };

  TemplateBuilderApp.prototype._revoke = function (url) {
    if (!url) return;
    URL.revokeObjectURL(url);
    this.revokedUrls.push(url);
  };
  TemplateBuilderApp.prototype._revokePreviewUrl = function () { if (this.previewUrl) { this._revoke(this.previewUrl); this.previewUrl = ''; } };
  TemplateBuilderApp.prototype._revokeBaseUrl = function () { if (this.baseObjectUrl) { this._revoke(this.baseObjectUrl); this.baseObjectUrl = ''; } };
  TemplateBuilderApp.prototype.cleanupUrls = function () { this._revokePreviewUrl(); this._revokeBaseUrl(); };

  TemplateBuilderApp.prototype.message = function (message, isError) {
    var toast = byId('dtb-toast');
    toast.textContent = message; toast.hidden = false; toast.classList.toggle('is-error', !!isError);
    clearTimeout(this._toastTimer);
    this._toastTimer = global.setTimeout(function () { toast.hidden = true; }, 4500);
  };
  TemplateBuilderApp.prototype.error = function (error) {
    var message = error && error.message ? error.message : String(error);
    console.error('[DocumentTemplateBuilder]', error);
    this.message(message, true);
  };

  // A small stable API is intentionally exposed for the dedicated QA harness.
  ns.TemplateBuilderApp = TemplateBuilderApp;
  ns.constants = {
    protocolMessage: 'Конструктор должен быть открыт через локальный HTTP-сервер.',
    localModeMessage: 'Локальный режим — данные и документы не отправляются на сервер.'
  };
  ns.app = new TemplateBuilderApp();
  ns.app.readyPromise = ns.app.init();
}(typeof window !== 'undefined' ? window : this));
