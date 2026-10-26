"""Browser driver for the manual smoke pack.

Everything here goes through the *production* renderer:

    CRMDocumentEngine.overlayRenderer.preflight(template, payload)
    CRMDocumentEngine.overlayRenderer.render(template, payload)

and the *production* payload builder:

    CRMDocumentBuilder.schema.fromProduction(template, catalogEntry)
    CRMDocumentBuilder.fixtures.payloadFor(baseProfileId, project, overrides)

The catalog entry is flattened exactly the way the Template Builder does it
(`builder-app.js` `_buildCatalog`), so the wizard keys a document really has —
including the ones a packaged document inherits from its catalog owner — are
the ones the fixtures fill. Nothing is reimplemented and no identifier is
renamed.

The QA page `tools/document-map-audit.html` is reused as the host page because
the production maps resolve `templateUrl` against `location.href`, so the page
has to sit one directory below the served `static-uikit/` root. The document
catalog lives in `pages/document-wizard.js`, which the audit page does not
load, so it is appended at runtime; that module publishes
`window.CRMDocumentCatalog` before it returns for a non-wizard page.
"""

from __future__ import annotations

import base64
import json
import os
import sys

QA = os.path.abspath(os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "..", "..", "tools", "qa"))
if QA not in sys.path:
    sys.path.insert(0, QA)

from headless_browser import STATIC_UIKIT, Chrome, Server  # noqa: E402

TEMPLATES = os.path.join(STATIC_UIKIT, "assets", "document-pdf-templates")

# ── Helpers installed into the page ──────────────────────────────────────────

INSTALL = r"""
(function () {
  var reg = window.CRMDocumentCatalog;
  var maps = window.CRMDocumentEngine.fieldMaps;

  // The Template Builder's own catalog flattening, so a packaged document
  // (client-notifications) inherits its owner's wizard fields.
  var entries = {};
  reg.documents.forEach(function (doc) {
    function attach(node, owner) {
      if (!node.overlayTemplateId) return;
      var flat = JSON.parse(JSON.stringify(node));
      flat.description = node.description || owner.description || '';
      flat.category = node.category || owner.category || '';
      flat.appliesTo = node.appliesTo || owner.appliesTo || [];
      flat.catalogOwner = owner;
      flat.normalization = reg.normalization;
      entries[node.overlayTemplateId] = flat;
    }
    attach(doc, doc);
    (doc.packageDocuments || []).forEach(function (child) { attach(child, doc); });
  });

  var projects = {};
  function projectFor(docId) {
    if (!projects[docId]) {
      projects[docId] = CRMDocumentBuilder.schema.fromProduction(
        maps[docId], entries[docId] || null);
    }
    return projects[docId];
  }

  function payloadFor(docId, baseProfile, overrides) {
    return CRMDocumentBuilder.fixtures.payloadFor(
      baseProfile, projectFor(docId), overrides || {});
  }

  window.__smoke = {
    entries: entries,
    projectFor: projectFor,
    payloadFor: payloadFor,

    // Catalog + map facts the manifest needs.
    facts: function () {
      var out = {};
      Object.keys(maps).forEach(function (id) {
        var t = maps[id], e = entries[id] || {};
        out[id] = {
          id: id,
          title: t.title || id,
          templateId: String(t.templateUrl || '').split('/').pop(),
          templateUrl: t.templateUrl,
          expectedPages: t.expectedPages,
          appliesTo: t.appliesTo || [],
          outputFilename: t.outputFilename,
          catalogTitle: e.title || null,
          catalogCategory: e.category || null,
          wordFlowBlocks: (t.wordFlowBlocks || []).map(function (b) {
            // Which payload paths this reviewed paragraph actually prints:
            // its runs name production field ids, and those fields carry the
            // source. Repair needs this so it shortens a value the block is
            // really printing instead of an unrelated long one.
            var sources = [];
            (b.runs || []).forEach(function (run) {
              if (run.type !== 'fieldRef' || !run.fieldId) return;
              (t.fields || []).forEach(function (field) {
                if (field.id === run.fieldId && field.source &&
                    sources.indexOf(field.source) === -1) {
                  sources.push(field.source);
                }
              });
            });
            return {
              id: b.id, page: b.page, fontSize: b.fontSize,
              fontSizeLocked: !!b.fontSizeLocked,
              initialLineCount: (b.frame || {}).initialLineCount,
              maxExtraRows: (b.expansion || {}).maxExtraRows || 0,
              showWhen: b.showWhen || null,
              sources: sources
            };
          }),
          checkSources: (t.fields || []).filter(function (f) {
            return (f.type || 'text') === 'check' && f.source;
          }).map(function (f) { return f.source; }),
          wizardKeys: (function () {
            var wizard = projectFor(id).wizard || {};
            var keys = [];
            ['fields', 'companyFields'].forEach(function (group) {
              (wizard[group] || []).forEach(function (control) {
                if (control.key && keys.indexOf(control.key) === -1) {
                  keys.push(control.key);
                }
              });
            });
            return keys;
          }()),
          expansionAnchors: (t.fields || []).filter(function (f) {
            return f.expansion;
          }).map(function (f) {
            return {
              id: f.id, source: f.source || null, page: f.page,
              maxExtraRows: f.expansion.maxExtraRows || 0,
              rowHeight: f.expansion.rowHeight
            };
          }),
          crossPageRules: Object.keys(t.pageLayout || {}).filter(function (p) {
            return (t.pageLayout[p] || {}).crossPageFlow;
          }).map(function (p) {
            var flow = t.pageLayout[p].crossPageFlow;
            return {
              sourcePage: Number(p), targetPage: flow.targetPage,
              maxCascadeDepth: flow.maxCascadeDepth,
              reviewStatus: flow.reviewStatus
            };
          })
        };
      });
      return out;
    },

    // Decide a layout without drawing: this is what measures a scenario.
    measure: function (docId, baseProfile, overrides) {
      var t = maps[docId];
      var payload = payloadFor(docId, baseProfile, overrides);
      return CRMDocumentEngine.overlayRenderer.preflight(t, payload)
        .then(function (pf) {
          var wordFlow = {}, rows = {}, flows = [];
          pf.fingerprint.split('\n').forEach(function (line) {
            var word = line.match(/^word:([^@=]+)@[\d.]+ locked=\w+ add=(\d+)/);
            if (word) { wordFlow[word[1]] = Number(word[2]); return; }
            var inactive = line.match(/^word:([^=]+)=(.+)$/);
            if (inactive) { wordFlow[inactive[1]] = null; return; }
            var page = line.match(/^p(\d+) shift=(.*) rows=(.*) recovered=(\S*) flow=(\S*) err=(.*)$/);
            if (page) {
              (page[3] ? page[3].split(',') : []).forEach(function (row) {
                var id = row.split('@')[0];
                if (id) rows[id] = (rows[id] || 0) + 1;
              });
              if (page[5]) {
                flows.push({ sourcePage: Number(page[1]), target: page[5] });
              }
            }
          });
          return JSON.stringify({
            ok: pf.ok,
            overflows: (pf.overflows || []).map(function (o) {
              // Enough about the slot for a substitution to be classified
              // rather than merely counted: what the engine refused, how much
              // room it had, and whether the map gave it any way to grow.
              var field = (maps[docId].fields || []).filter(function (f) {
                return f.id === o.fieldId;
              })[0] || {};
              return { fieldId: o.fieldId, reason: o.reason, source: o.source,
                       message: o.message, valueLength: o.valueLength,
                       value: o.value,
                       lineCapacity: o.lineCapacity,
                       regionCount: o.regionCount,
                       minFontSize: o.minFontSize,
                       preferredFontSize: o.preferredFontSize,
                       hasExpansion: !!field.expansion,
                       hasFlowRegions: !!(field.flowRegions &&
                                          field.flowRegions.length > 1),
                       overflowStrategy: field.overflowStrategy || null,
                       roomBelow: (window.__smokeRoom &&
                                   window.__smokeRoom[docId] &&
                                   window.__smokeRoom[docId][o.fieldId]) };
            }),
            expansion: pf.expansion || [],
            summary: pf.summary,
            wordFlow: wordFlow,
            rows: rows,
            crossPage: flows,
            reviewedRanges: (pf.reviewedRanges || []).map(function (r) {
              return r.page;
            }),
            payload: payload
          });
        }, function (error) {
          return JSON.stringify({ ok: false, failed: true,
            message: String(error && error.message || error),
            overflows: (error && error.overflows) || [] });
        });
    },

    // Draw it twice: the PDF, and a determinism check on the exact same input.
    //
    // The reviewed-range suppression and the exact locked source sizes are
    // reported alongside, because the production structural inspector needs
    // both to tell an approved 8.52 pt reviewed run apart from a legacy field
    // drawn below the 9 pt readability floor.
    render: function (docId, baseProfile, overrides) {
      var t = maps[docId];
      var payload = payloadFor(docId, baseProfile, overrides);
      var reviewedRanges = [];
      var reviewedFontSizes = {};
      CRMDocumentEngine.overlayRenderer.activeReviewedRangePages(t, payload)
        .forEach(function (group) {
          var sizes = [];
          group.blocks.forEach(function (block) {
            [block.fontSize, block.minFontSize].forEach(function (size) {
              if (Number(size) > 0) sizes.push(Number(size));
            });
            (block.runs || []).forEach(function (run) {
              if (Number(run.fontSize) > 0) sizes.push(Number(run.fontSize));
            });
          });
          reviewedFontSizes[group.page] = Array.from(new Set(sizes));
        });
      return CRMDocumentEngine.overlayRenderer.render(t, payload, {
        onReviewedRanges: function (entries) {
          reviewedRanges = entries.map(function (entry) {
            return { page: entry.page, inspection: entry.suppression };
          });
        }
      })
        .then(function (first) {
          return CRMDocumentEngine.overlayRenderer.render(t, payload)
            .then(function (second) {
              return Promise.all([first.arrayBuffer(), second.arrayBuffer()]);
            });
        })
        .then(function (buffers) {
          var a = new Uint8Array(buffers[0]), b = new Uint8Array(buffers[1]);
          var deterministic = a.length === b.length;
          for (var i = 0; deterministic && i < a.length; i += 1) {
            if (a[i] !== b[i]) deterministic = false;
          }
          var s = '';
          for (var j = 0; j < a.length; j += 0x8000) {
            s += String.fromCharCode.apply(null, a.subarray(j, j + 0x8000));
          }
          return JSON.stringify({ ok: true, deterministic: deterministic,
                                  pdf: btoa(s), payload: payload,
                                  reviewedRanges: reviewedRanges,
                                  reviewedFontSizes: reviewedFontSizes });
        }, function (error) {
          return JSON.stringify({ ok: false,
            message: String(error && error.message || error),
            overflows: (error && error.overflows) || [] });
        });
    }
  };
  return true;
}())
"""


class SmokeBrowser:
    """One headless browser with the production engine and catalog loaded."""

    def __init__(self) -> None:
        self.server = Server()
        self.browser = Chrome()
        self.browser.goto(self.server.base + "/tools/document-map-audit.html")
        self.browser.eval(
            "new Promise(function (resolve, reject) {"
            "  var s = document.createElement('script');"
            "  s.src = '../assets/js/pages/document-wizard.js';"
            "  s.onload = function () { resolve(true); };"
            "  s.onerror = function () { reject(new Error('document-wizard.js failed to load')); };"
            "  document.head.appendChild(s);"
            "})",
            await_promise=True,
        )
        if not self.browser.eval("!!window.CRMDocumentCatalog"):
            raise RuntimeError("production document catalog did not load")
        self.browser.eval(INSTALL)

    def facts(self) -> dict:
        return json.loads(self.browser.eval("JSON.stringify(window.__smoke.facts())"))

    def load_field_room(self, measurements: dict) -> None:
        """Give the page the measured blank space under every mapped field.

        Classifying a substitution needs to know whether the paper has room to
        continue on. `reports/field-room.json` comes from the production
        measuring tool (`tools/qa/measure_field_room.py`), which reads the
        authoritative PDFs; without it, a one-line printed rule and a slot whose
        wrapping nobody configured look identical.
        """
        room = {
            doc: {row["id"]: row.get("below") for row in rows}
            for doc, rows in (measurements or {}).items()
        }
        self.browser.eval("window.__smokeRoom = " +
                          json.dumps(room, ensure_ascii=False) + "; true")

    def maps(self) -> dict:
        """The committed field maps themselves, functions stripped."""
        return json.loads(self.browser.eval(
            "JSON.stringify(window.CRMDocumentEngine.fieldMaps,"
            " function (key, value) {"
            "   return typeof value === 'function' ? '[function]' : value; })"))

    def measure(self, doc_id: str, base_profile: str, overrides: dict) -> dict:
        return json.loads(self.browser.eval(
            "window.__smoke.measure(%s, %s, %s)" % (
                json.dumps(doc_id), json.dumps(base_profile),
                json.dumps(overrides, ensure_ascii=False)),
            await_promise=True))

    def render(self, doc_id: str, base_profile: str, overrides: dict) -> dict:
        result = json.loads(self.browser.eval(
            "window.__smoke.render(%s, %s, %s)" % (
                json.dumps(doc_id), json.dumps(base_profile),
                json.dumps(overrides, ensure_ascii=False)),
            await_promise=True))
        if result.get("pdf"):
            result["bytes"] = base64.b64decode(result.pop("pdf"))
        return result

    def stop(self) -> None:
        try:
            self.browser.stop()
        finally:
            self.server.stop()
