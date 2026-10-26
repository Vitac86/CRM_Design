(function (global) {
  'use strict';

  var ns = global.CRMDocumentBuilder = global.CRMDocumentBuilder || {};

  function BuilderState() {
    this.project = null;
    this.selectedFieldId = null;
    this.selectedWordFlowBlockId = null;
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
    this.lastIdentifierViolation = null;
    this.lastWordFlowViolation = null;
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
    var next = ns.schema.clone(project);
    if (ns.identifierProtection) ns.identifierProtection.attach(next);
    this.project = next;
    this.selectedFieldId = null;
    this.selectedWordFlowBlockId = null;
    this.pageIndex = 0;
    this.history = [];
    this.future = [];
    this.payloadOverrides = {};
    this.validation = null;
    this.batchResults = null;
    this.lastIdentifierViolation = null;
    this.lastWordFlowViolation = null;
    this.emit('project');
  };

  BuilderState.prototype.snapshot = function () {
    return ns.schema.clone(this.project);
  };

  BuilderState.prototype.commit = function (label, mutation) {
    if (!this.project) return false;
    var before = this.snapshot();
    mutation(this.project);
    if (before.identifierProtection && ns.identifierProtection) {
      var metadataChanged = JSON.stringify(this.project.identifierProtection || null) !==
        JSON.stringify(before.identifierProtection);
      var protectionProblems = metadataChanged
        ? [{
            code: 'protected-metadata',
            message: ns.identifierProtection.WARNING,
            path: 'identifierProtection'
          }]
        : ns.identifierProtection.validate(this.project, before.identifierProtection);
      if (protectionProblems.length) {
        this.project = before;
        this.lastIdentifierViolation = protectionProblems[0];
        this.emit('identifier-protection');
        return false;
      }
    }
    if (ns.schema.referencedFieldMutationProblems) {
      var referenceProblems = ns.schema.referencedFieldMutationProblems(before, this.project);
      if (referenceProblems.length) {
        this.project = before;
        this.lastWordFlowViolation = referenceProblems[0];
        this.emit('word-flow-protection');
        return false;
      }
    }
    var after = JSON.stringify(this.project);
    if (after === JSON.stringify(before)) return false;
    this.history.push({
      label: label,
      project: before,
      selectedFieldId: this.selectedFieldId,
      selectedWordFlowBlockId: this.selectedWordFlowBlockId
    });
    if (this.history.length > 100) this.history.shift();
    this.future = [];
    if (this.project.qa && label !== 'validation status') {
      this.project.qa.automaticValidationPassed = false;
      if (this.project.qa.status !== 'Draft') this.project.qa.status = 'Mapped';
    }
    this.emit('model');
    return true;
  };

  // A change to the project itself rather than to one field — the page budget
  // is the first of these, and it belongs to the page, not to any anchor on it.
  BuilderState.prototype.update = function (patch, label) {
    var self = this;
    return this.commit(label || 'edit project', function (project) {
      Object.keys(patch).forEach(function (key) { project[key] = patch[key]; });
      return self;
    });
  };

  BuilderState.prototype.undo = function () {
    if (!this.history.length || !this.project) return false;
    this.future.push({
      project: this.snapshot(),
      selectedFieldId: this.selectedFieldId,
      selectedWordFlowBlockId: this.selectedWordFlowBlockId
    });
    var entry = this.history.pop();
    this.project = entry.project;
    this.selectedFieldId = entry.selectedFieldId;
    this.selectedWordFlowBlockId = entry.selectedWordFlowBlockId || null;
    this.emit('undo');
    return true;
  };

  BuilderState.prototype.redo = function () {
    if (!this.future.length || !this.project) return false;
    this.history.push({
      label: 'redo',
      project: this.snapshot(),
      selectedFieldId: this.selectedFieldId,
      selectedWordFlowBlockId: this.selectedWordFlowBlockId
    });
    var entry = this.future.pop();
    this.project = entry.project;
    this.selectedFieldId = entry.selectedFieldId;
    this.selectedWordFlowBlockId = entry.selectedWordFlowBlockId || null;
    this.emit('redo');
    return true;
  };

  BuilderState.prototype.field = function (id) {
    var wanted = id || this.selectedFieldId;
    return this.project && (this.project.fields || []).find(function (field) { return field.id === wanted; }) || null;
  };

  BuilderState.prototype.selectField = function (id) {
    this.selectedFieldId = id || null;
    this.selectedWordFlowBlockId = null;
    var field = this.field();
    if (field) this.pageIndex = field.page;
    this.emit('selection');
  };

  BuilderState.prototype.addField = function (field) {
    var self = this;
    var changed = this.commit('add field', function (project) { project.fields.push(ns.schema.clone(field)); });
    if (changed) {
      this.selectedFieldId = field.id;
      this.selectedWordFlowBlockId = null;
      self.emit('selection');
    }
    return changed;
  };

  BuilderState.prototype.updateField = function (id, patch, label) {
    var renameSelection = patch.id && this.selectedFieldId === id ? patch.id : null;
    var changed = this.commit(label || 'update field', function (project) {
      var field = project.fields.find(function (item) { return item.id === id; });
      if (!field) return;
      Object.keys(patch).forEach(function (key) {
        if (patch[key] === undefined) delete field[key];
        else field[key] = ns.schema.clone(patch[key]);
      });
    });
    if (changed && renameSelection) this.selectedFieldId = renameSelection;
    return changed;
  };

  BuilderState.prototype.deleteSelected = function () {
    var id = this.selectedFieldId;
    if (!id) return false;
    var changed = this.commit('delete field', function (project) {
      project.fields = project.fields.filter(function (field) { return field.id !== id; });
    });
    if (changed) {
      this.selectedFieldId = null;
      this.emit('selection');
    }
    return changed;
  };

  BuilderState.prototype.wordFlowBlock = function (id) {
    var wanted = id || this.selectedWordFlowBlockId;
    return this.project && (this.project.wordFlowBlocks || []).find(function (block) {
      return block.id === wanted;
    }) || null;
  };

  BuilderState.prototype.selectWordFlowBlock = function (id) {
    this.selectedWordFlowBlockId = id || null;
    this.selectedFieldId = null;
    var block = this.wordFlowBlock();
    if (block) this.pageIndex = Number(block.page || 0);
    this.emit('selection');
  };

  BuilderState.prototype.uniqueWordFlowBlockId = function (base) {
    var stem = String(base || 'word-flow-block').replace(/[^A-Za-z0-9_-]+/g, '-') || 'word-flow-block';
    var ids = {};
    (this.project.wordFlowBlocks || []).forEach(function (block) { ids[block.id] = true; });
    (this.project.fields || []).forEach(function (field) { ids[field.id] = true; });
    if (!ids[stem]) return stem;
    var n = 2;
    while (ids[stem + '-' + n]) n += 1;
    return stem + '-' + n;
  };

  BuilderState.prototype.addWordFlowBlock = function (block) {
    var self = this;
    var copy = ns.schema.clone(block);
    var changed = this.commit('add Word-flow block', function (project) {
      project.wordFlowBlocks = project.wordFlowBlocks || [];
      project.wordFlowBlocks.push(copy);
      ns.schema.syncWordFlowReferences(project);
    });
    if (changed) {
      this.selectedWordFlowBlockId = copy.id;
      this.selectedFieldId = null;
      self.emit('selection');
    }
    return changed;
  };

  BuilderState.prototype.mutateWordFlowBlock = function (id, label, mutation) {
    return this.commit(label || 'edit Word-flow block', function (project) {
      var block = (project.wordFlowBlocks || []).find(function (item) { return item.id === id; });
      if (!block) return;
      var previousId = block.id;
      var previousExpansionPage = block.expansion
        ? Number(block.expansion.page != null ? block.expansion.page : block.page) : null;
      mutation(block, project);

      // Block IDs are layout identifiers, so an intentional rename is
      // editable. Keep the page-budget relationship intact rather than
      // leaving a stale anchor that production would refuse.
      if (block.id !== previousId) {
        Object.keys(project.pageLayout || {}).forEach(function (page) {
          var layout = project.pageLayout[page];
          layout.anchors = (layout.anchors || []).map(function (anchorId) {
            return anchorId === previousId ? block.id : anchorId;
          });
        });
      }

      var currentExpansionPage = block.expansion
        ? Number(block.expansion.page != null ? block.expansion.page : block.page) : null;
      if ((previousExpansionPage != null && !block.expansion) ||
          (previousExpansionPage != null && currentExpansionPage !== previousExpansionPage)) {
        Object.keys(project.pageLayout || {}).forEach(function (page) {
          var layout = project.pageLayout[page];
          layout.anchors = (layout.anchors || []).filter(function (anchorId) {
            return anchorId !== block.id;
          });
        });
        if (block.expansion && project.pageLayout && project.pageLayout[currentExpansionPage]) {
          var targetLayout = project.pageLayout[currentExpansionPage];
          if ((targetLayout.anchors || []).indexOf(block.id) === -1) {
            targetLayout.anchors = (targetLayout.anchors || []).concat([block.id]);
          }
        }
      }
      ns.schema.syncWordFlowReferences(project);
    });
  };

  BuilderState.prototype.updateWordFlowBlock = function (id, patch, label) {
    var self = this;
    var nextId = patch.id && patch.id !== id ? patch.id : null;
    var changed = this.mutateWordFlowBlock(id, label || 'edit Word-flow block', function (block) {
      Object.keys(patch).forEach(function (key) {
        if (patch[key] === undefined) delete block[key];
        else block[key] = ns.schema.clone(patch[key]);
      });
    });
    if (changed && nextId && this.selectedWordFlowBlockId === id) {
      this.selectedWordFlowBlockId = nextId;
      self.emit('selection');
    }
    return changed;
  };

  BuilderState.prototype.deleteSelectedWordFlowBlock = function () {
    var id = this.selectedWordFlowBlockId;
    if (!id) return false;
    var changed = this.commit('delete Word-flow block', function (project) {
      project.wordFlowBlocks = (project.wordFlowBlocks || []).filter(function (block) {
        return block.id !== id;
      });
      Object.keys(project.pageLayout || {}).forEach(function (page) {
        var layout = project.pageLayout[page];
        layout.anchors = (layout.anchors || []).filter(function (anchorId) {
          return anchorId !== id;
        });
      });
      ns.schema.syncWordFlowReferences(project);
    });
    if (changed) {
      this.selectedWordFlowBlockId = null;
      this.emit('selection');
    }
    return changed;
  };

  BuilderState.prototype.addWordFlowRun = function (blockId, run) {
    return this.mutateWordFlowBlock(blockId, 'add Word-flow run', function (block) {
      block.runs = block.runs || [];
      block.runs.push(ns.schema.clone(run));
    });
  };

  BuilderState.prototype.updateWordFlowRun = function (blockId, index, patch) {
    return this.mutateWordFlowBlock(blockId, 'edit Word-flow run', function (block) {
      var run = (block.runs || [])[index];
      if (!run) return;
      Object.keys(patch).forEach(function (key) {
        if (patch[key] === undefined) delete run[key];
        else run[key] = ns.schema.clone(patch[key]);
      });
    });
  };

  BuilderState.prototype.moveWordFlowRun = function (blockId, index, delta) {
    return this.mutateWordFlowBlock(blockId, 'move Word-flow run', function (block) {
      var runs = block.runs || [];
      var target = index + delta;
      if (target < 0 || target >= runs.length) return;
      var moved = runs.splice(index, 1)[0];
      runs.splice(target, 0, moved);
    });
  };

  BuilderState.prototype.deleteWordFlowRun = function (blockId, index) {
    return this.mutateWordFlowBlock(blockId, 'delete Word-flow run', function (block) {
      (block.runs || []).splice(index, 1);
    });
  };

  BuilderState.prototype.assignFieldToWordFlow = function (fieldId, blockId) {
    return this.commit('assign field to Word-flow', function (project) {
      (project.wordFlowBlocks || []).forEach(function (block) {
        block.runs = (block.runs || []).filter(function (run) {
          return !(run.type === 'fieldRef' && run.fieldId === fieldId && block.id !== blockId);
        });
        if (block.id === blockId && !block.runs.some(function (run) {
          return run.type === 'fieldRef' && run.fieldId === fieldId;
        })) {
          block.runs.push({ type: 'fieldRef', fieldId: fieldId });
        }
        if (!blockId) {
          block.runs = block.runs.filter(function (run) {
            return !(run.type === 'fieldRef' && run.fieldId === fieldId);
          });
        }
      });
      ns.schema.syncWordFlowReferences(project);
    });
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
    delete copy.layoutMode;
    delete copy.flowBlockId;
    delete copy.allowMultipleFlowReferences;
    this.addField(copy);
    return copy;
  };

  BuilderState.prototype.copySettings = function () {
    var field = this.field();
    if (!field) return false;
    var omitted = {
      id: true, source: true, page: true, left: true, top: true,
      baselineTop: true, layoutMode: true, flowBlockId: true,
      allowMultipleFlowReferences: true
    };
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
