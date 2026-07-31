(function (global) {
  'use strict';

  var ns = global.CRMDocumentBuilder = global.CRMDocumentBuilder || {};

  function BuilderState() {
    this.project = null;
    this.selectedFieldId = null;
    this.pageIndex = 0;
    this.tool = 'select';
    this.zoom = 1;
    this.zoomMode = 'fit-width';
    this.outlinesVisible = true;
    this.snapping = true;
    this.mmDisplay = false;
    this.profileId = 'ru-resident-normal';
    this.payloadOverrides = {};
    this.validation = null;
    this.batchResults = null;
    this.runtimePdfUrl = '';
    this.sourcePdfBytes = null;
    this.sourceInfo = null;
    this.history = [];
    this.future = [];
    this.clipboard = null;
    this.listeners = [];
  }

  BuilderState.prototype.subscribe = function (listener) {
    this.listeners.push(listener);
    var self = this;
    return function () {
      self.listeners = self.listeners.filter(function (entry) { return entry !== listener; });
    };
  };

  BuilderState.prototype.emit = function (reason) {
    this.listeners.slice().forEach(function (listener) { listener(reason); });
  };

  BuilderState.prototype.setProject = function (project) {
    this.project = ns.schema.clone(project);
    this.selectedFieldId = null;
    this.pageIndex = 0;
    this.history = [];
    this.future = [];
    this.payloadOverrides = {};
    this.validation = null;
    this.batchResults = null;
    this.emit('project');
  };

  BuilderState.prototype.snapshot = function () {
    return ns.schema.clone(this.project);
  };

  BuilderState.prototype.commit = function (label, mutation) {
    if (!this.project) return;
    var before = this.snapshot();
    mutation(this.project);
    var after = JSON.stringify(this.project);
    if (after === JSON.stringify(before)) return;
    this.history.push({ label: label, project: before, selectedFieldId: this.selectedFieldId });
    if (this.history.length > 100) this.history.shift();
    this.future = [];
    if (this.project.qa && label !== 'validation status') {
      this.project.qa.automaticValidationPassed = false;
      if (this.project.qa.status !== 'Draft') this.project.qa.status = 'Mapped';
    }
    this.emit('model');
  };

  // A change to the project itself rather than to one field — the page budget
  // is the first of these, and it belongs to the page, not to any anchor on it.
  BuilderState.prototype.update = function (patch, label) {
    var self = this;
    this.commit(label || 'edit project', function (project) {
      Object.keys(patch).forEach(function (key) { project[key] = patch[key]; });
      return self;
    });
  };

  BuilderState.prototype.undo = function () {
    if (!this.history.length || !this.project) return false;
    this.future.push({ project: this.snapshot(), selectedFieldId: this.selectedFieldId });
    var entry = this.history.pop();
    this.project = entry.project;
    this.selectedFieldId = entry.selectedFieldId;
    this.emit('undo');
    return true;
  };

  BuilderState.prototype.redo = function () {
    if (!this.future.length || !this.project) return false;
    this.history.push({ label: 'redo', project: this.snapshot(), selectedFieldId: this.selectedFieldId });
    var entry = this.future.pop();
    this.project = entry.project;
    this.selectedFieldId = entry.selectedFieldId;
    this.emit('redo');
    return true;
  };

  BuilderState.prototype.field = function (id) {
    var wanted = id || this.selectedFieldId;
    return this.project && (this.project.fields || []).find(function (field) { return field.id === wanted; }) || null;
  };

  BuilderState.prototype.selectField = function (id) {
    this.selectedFieldId = id || null;
    var field = this.field();
    if (field) this.pageIndex = field.page;
    this.emit('selection');
  };

  BuilderState.prototype.addField = function (field) {
    var self = this;
    this.commit('add field', function (project) { project.fields.push(ns.schema.clone(field)); });
    this.selectedFieldId = field.id;
    self.emit('selection');
  };

  BuilderState.prototype.updateField = function (id, patch, label) {
    if (patch.id && this.selectedFieldId === id) this.selectedFieldId = patch.id;
    this.commit(label || 'update field', function (project) {
      var field = project.fields.find(function (item) { return item.id === id; });
      if (!field) return;
      Object.keys(patch).forEach(function (key) {
        if (patch[key] === undefined) delete field[key];
        else field[key] = ns.schema.clone(patch[key]);
      });
    });
  };

  BuilderState.prototype.deleteSelected = function () {
    var id = this.selectedFieldId;
    if (!id) return;
    this.commit('delete field', function (project) {
      project.fields = project.fields.filter(function (field) { return field.id !== id; });
    });
    this.selectedFieldId = null;
    this.emit('selection');
  };

  BuilderState.prototype.uniqueFieldId = function (base) {
    var stem = String(base || 'field').replace(/[^A-Za-z0-9_-]+/g, '-') || 'field';
    var ids = {};
    (this.project.fields || []).forEach(function (field) { ids[field.id] = true; });
    if (!ids[stem]) return stem;
    var n = 2;
    while (ids[stem + '-' + n]) n += 1;
    return stem + '-' + n;
  };

  BuilderState.prototype.duplicateSelected = function () {
    var field = this.field();
    if (!field) return null;
    var copy = ns.schema.clone(field);
    copy.id = this.uniqueFieldId(field.id + '-copy');
    copy.left = Number(copy.left || 0) + 2;
    copy.top = Number(copy.top || 0) + 2;
    copy.baselineTop = Number(copy.baselineTop || 0) + 2;
    copy.reviewStatus = 'unreviewed';
    this.addField(copy);
    return copy;
  };

  BuilderState.prototype.copySettings = function () {
    var field = this.field();
    if (!field) return false;
    var omitted = { id: true, source: true, page: true, left: true, top: true, baselineTop: true };
    var settings = {};
    Object.keys(field).forEach(function (key) { if (!omitted[key]) settings[key] = ns.schema.clone(field[key]); });
    this.clipboard = settings;
    return true;
  };

  BuilderState.prototype.pasteSettings = function () {
    var field = this.field();
    if (!field || !this.clipboard) return false;
    this.updateField(field.id, this.clipboard, 'paste field settings');
    return true;
  };

  ns.BuilderState = BuilderState;
}(typeof window !== 'undefined' ? window : this));
