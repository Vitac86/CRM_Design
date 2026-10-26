"""Focused questionnaire table-cell ownership and runtime-ink QA.

The ordinary layout checks prove that text stays in the box named by a map.
This suite independently proves that the named box is the reviewed source-PDF
cell: every dynamic questionnaire field has one exact owner (or an approved
non-table exemption), actual planned ink stays in that cell, grown rows keep
their borders, and shared table budgets are respected.

All payloads are synthetic fixtures.

    python static-uikit/tools/qa/run_table_ownership_tests.py
"""

from __future__ import annotations

import json
import sys

from headless_browser import Chrome, Server


DOCUMENT_PROFILES = {
    "anketa-fl-simplified-id": (
        "ru-resident-normal", "ru-resident-long",
        "en-nonresident-normal", "en-nonresident-long",
    ),
    "anketa-ip-sz": (
        "ru-resident-normal", "ru-resident-long",
        "en-nonresident-normal", "en-nonresident-long",
    ),
    "anketa-fl": (
        "ru-resident-normal", "ru-resident-long",
        "en-nonresident-normal", "en-nonresident-long",
    ),
    "anketa-yul": (
        "ru-company-normal", "ru-company-long",
        "en-company-normal", "en-company-long",
    ),
}

# Ordinary Russian fixtures preserve the source rows. The ordinary foreign
# address/name strings need these few reviewed continuation rows even though
# they are not the stress fixtures; pinning the exact count prevents quiet
# geometry growth from being reclassified as "ordinary" later.
EXPECTED_NORMAL_EXPANSIONS = {
    ("anketa-fl-simplified-id", "en-nonresident-normal"): 1,
    ("anketa-ip-sz", "en-nonresident-normal"): 2,
    ("anketa-fl", "en-nonresident-normal"): 1,
    ("anketa-yul", "en-company-normal"): 1,
}

# The generic long fixture deliberately maximizes every unrelated free-text
# slot at once. These exact source-PDF limits are not ownership defects: the
# engine must refuse them before drawing because supporting them would move a
# signature/employee block or exceed the reviewed table reserve. Pin them so a
# 0-page "pass" can never be hidden by an ownership-only assertion.
EXPECTED_FAIL_CLOSED = {
    ("anketa-ip-sz", "ru-resident-long"): {
        ("email", "no-space"), ("otherInformation", "no-space"),
    },
    ("anketa-ip-sz", "en-nonresident-long"): {
        ("email", "no-space"), ("otherInformation", "no-space"),
        ("ipRegistrationPlace", "reserve-exceeded"),
    },
    ("anketa-fl", "ru-resident-long"): {
        ("otherInformation", "no-space"),
    },
    ("anketa-yul", "ru-company-long"): {
        ("email", "no-space"), ("managementStructure", "no-space"),
        ("licensedActivities", "no-space"),
        ("otherInformation", "no-space"),
        ("pre2002RegistrationDocument", "reserve-exceeded"),
        ("pre2002RegistrationAuthority", "reserve-exceeded"),
    },
    ("anketa-yul", "en-company-long"): {
        ("email", "no-space"), ("managementStructure", "no-space"),
        ("licensedActivities", "no-space"),
        ("otherInformation", "no-space"),
        ("pre2002RegistrationDocument", "reserve-exceeded"),
        ("pre2002RegistrationAuthority", "reserve-exceeded"),
    },
}


PROBE = r"""
(async function (documentId, profileId) {
  const template = CRMDocumentEngine.fieldMaps[documentId];
  const project = CRMDocumentBuilder.schema.fromProduction(template, null);
  const payload = CRMDocumentBuilder.fixtures.payloadFor(profileId, project);
  try {
    const result = await CRMDocumentEngine.overlayRenderer.preflight(
      template, payload);
    return JSON.stringify({
      ok: result.ok,
      fingerprint: result.fingerprint,
      overflows: result.overflows || [],
      audit: result.ownershipAudit || {},
      ownerCount: (template.cellOwnership || []).length,
      exemptionCount: (template.ownershipExemptions || []).length,
      dynamicCount: (template.fields || []).filter(function (field) {
        return (field.type || 'text') !== 'static';
      }).length,
      budgetCount: (template.tableBudgets || []).length
    });
  } catch (error) {
    return JSON.stringify({ error: String(error && error.message || error) });
  }
}(__DOCUMENT__, __PROFILE__))
"""


MUTATIONS = r"""
(async function () {
  const O = CRMDocumentEngine.tableOwnership;
  const R = CRMDocumentEngine.overlayRenderer;
  const source = CRMDocumentEngine.fieldMaps['anketa-fl-simplified-id'];
  const project = CRMDocumentBuilder.schema.fromProduction(source, null);
  const normal = CRMDocumentBuilder.fixtures.payloadFor(
    'ru-resident-normal', project);
  const longPayload = CRMDocumentBuilder.fixtures.payloadFor(
    'ru-resident-long', project);
  const pages = Array.from({ length: source.expectedPages || 1 }, function () {
    return { width: 595.28, height: 841.89 };
  });
  function clone() { return JSON.parse(JSON.stringify(source)); }
  function problems(template) { return O.validateTemplate(template, pages); }
  async function rejected(template, payload) {
    try {
      const result = await R.preflight(template, payload || normal);
      return !result.ok && (result.overflows || []).some(function (entry) {
        return entry.reason === 'row-ownership';
      });
    } catch (error) {
      return true;
    }
  }
  function activeOwner(template, predicate) {
    const fields = {};
    (template.fields || []).forEach(function (field) { fields[field.id] = field; });
    return (template.cellOwnership || []).filter(function (owner) {
      return (!predicate || predicate(owner, fields[owner.fieldId])) &&
        fields[owner.fieldId] && !fields[owner.fieldId].showWhen;
    })[0];
  }

  const checks = {};
  let t = clone();
  const removed = t.cellOwnership.shift();
  checks.missingOwner = problems(t).some(function (problem) {
    return problem.indexOf(removed.fieldId + ': dynamic field has no') !== -1;
  });

  t = clone();
  t.cellOwnership[0].source = 'field.deliberately-wrong-source';
  checks.sourceMismatch = problems(t).some(function (problem) {
    return problem.indexOf('source must exactly match') !== -1;
  });

  t = clone();
  const a = t.cellOwnership[0], b = t.cellOwnership[1];
  b.page = a.page;
  b.bounds = JSON.parse(JSON.stringify(a.bounds));
  delete a.variantGroup; delete b.variantGroup;
  delete a.allowOverlapWith; delete b.allowOverlapWith;
  const bField = (t.fields || []).filter(function (field) {
    return field.id === b.fieldId;
  })[0];
  bField.page = a.page;
  delete bField.showWhen;
  checks.overlappingOwners = problems(t).some(function (problem) {
    return problem.indexOf('claim overlapping cell geometry') !== -1;
  });

  t = clone();
  const repeatA = t.cellOwnership[0], repeatB = t.cellOwnership[1];
  const repeatBField = (t.fields || []).filter(function (field) {
    return field.id === repeatB.fieldId;
  })[0];
  repeatB.source = repeatA.source;
  repeatBField.source = repeatA.source;
  delete repeatBField.showWhen;
  checks.unexplainedDuplicateSource = problems(t).some(function (problem) {
    return problem.indexOf('needs one explained sourceRepeatGroup') !== -1;
  });

  t = clone();
  const growing = activeOwner(t, function (owner) { return owner.canGrow; });
  growing.affectedBorders.vertical = [0, 1];
  checks.brokenVerticalBorders = problems(t).some(function (problem) {
    return problem.indexOf('vertical borders must exactly match') !== -1;
  });

  t = clone();
  const tooSmall = activeOwner(t);
  tooSmall.bounds.bottom = tooSmall.bounds.top + 1;
  checks.actualInkOutsideOwner = await rejected(t, normal);

  t = clone();
  const borderOwner = activeOwner(t, function (owner) { return !owner.canGrow; });
  const borderField = (t.fields || []).filter(function (field) {
    return field.id === borderOwner.fieldId;
  })[0];
  const region = (borderField.regions || [borderField])[0];
  const baseline = Number(region.baselineTop || borderOwner.bounds.bottom - 1);
  borderOwner.affectedBorders = borderOwner.affectedBorders || {};
  borderOwner.affectedBorders.horizontal = [baseline - 1];
  checks.borderThroughText = await rejected(t, normal);

  t = clone();
  const active = (t.cellOwnership || []).filter(function (owner) {
    const field = (t.fields || []).filter(function (item) {
      return item.id === owner.fieldId;
    })[0];
    return field && !field.showWhen;
  }).slice(0, 2);
  active.forEach(function (owner) { owner.renderOnceGroup = 'mutation-duplicate'; });
  checks.duplicateLogicalValue = await rejected(t, normal);

  t = clone();
  const budgetOwner = activeOwner(t, function (owner) { return owner.canGrow; });
  const budget = (t.tableBudgets || []).filter(function (item) {
    return item.id === budgetOwner.budgetId;
  })[0];
  budget.maxGrowth = 0;
  checks.tableBudgetExceeded = await rejected(t, longPayload);

  return JSON.stringify(checks);
}())
"""


class Checks:
    def __init__(self) -> None:
        self.rows: list[tuple[str, bool, str]] = []

    def check(self, name: str, passed: bool, detail: str = "") -> None:
        self.rows.append((name, bool(passed), detail))

    def report(self) -> int:
        failed = [row for row in self.rows if not row[1]]
        for name, passed, detail in self.rows:
            if not passed:
                print(f"FAIL  {name}\n      {detail}")
        print(
            f"\nQuestionnaire table ownership: "
            f"{len(self.rows) - len(failed)}/{len(self.rows)} checks passed"
        )
        return 1 if failed else 0


def evaluate(browser: Chrome, document: str, profile: str) -> dict:
    script = (PROBE.replace("__DOCUMENT__", json.dumps(document))
              .replace("__PROFILE__", json.dumps(profile)))
    return json.loads(browser.eval(script, await_promise=True))


def main() -> int:
    checks = Checks()
    server, browser = Server(), Chrome()
    try:
        browser.goto(server.base + "/tools/document-map-audit.html")
        live = set(json.loads(browser.eval(
            "JSON.stringify(Object.keys(CRMDocumentEngine.fieldMaps).filter(" 
            "id => CRMDocumentEngine.fieldMaps[id].tableOwnershipRequired))")))
        expected = set(DOCUMENT_PROFILES)
        checks.check("exact production ownership inventory", live == expected,
                     f"live={sorted(live)} expected={sorted(expected)}")

        for document, profiles in DOCUMENT_PROFILES.items():
            for profile in profiles:
                result = evaluate(browser, document, profile)
                label = f"{document}/{profile}"
                checks.check(label + " preflight", not result.get("error"),
                             result.get("error", ""))
                if result.get("error"):
                    continue
                audit = result.get("audit") or {}
                violations = audit.get("violations") or []
                metrics = audit.get("metrics") or []
                overflows = result.get("overflows") or []
                actual_refusals = {
                    (entry.get("fieldId"), entry.get("reason"))
                    for entry in overflows
                }
                expected_refusals = EXPECTED_FAIL_CLOSED.get(
                    (document, profile), set()
                )
                checks.check(
                    label + " explicit preflight outcome",
                    (not expected_refusals and result.get("ok") and
                     not actual_refusals) or
                    (bool(expected_refusals) and not result.get("ok") and
                     actual_refusals == expected_refusals),
                    json.dumps({
                        "ok": result.get("ok"),
                        "actual": sorted(actual_refusals),
                        "expected": sorted(expected_refusals),
                    }, ensure_ascii=False),
                )
                row_overflows = [entry for entry in overflows
                                 if entry.get("reason") == "row-ownership"]
                checks.check(label + " zero ownership violations",
                             not violations and not row_overflows,
                             json.dumps({"violations": violations,
                                         "rowOverflows": row_overflows},
                                        ensure_ascii=False)[:1800])
                checks.check(label + " complete owner metrics",
                             len(metrics) == result.get("ownerCount") and
                             result.get("dynamicCount") ==
                             result.get("ownerCount") +
                             result.get("exemptionCount") and
                             all(entry.get("fieldId") and entry.get("source") and
                                 entry.get("tableId") and entry.get("rowId") and
                                 entry.get("bounds") for entry in metrics),
                             json.dumps(result, ensure_ascii=False)[:1200])
                drawn = [entry for entry in metrics if entry.get("drawn")]
                checks.check(label + " 9pt client-value floor",
                             bool(drawn) and all(
                                 float(entry.get("fontSize") or 0) >= 9
                                 for entry in drawn),
                             json.dumps(drawn, ensure_ascii=False)[:1200])
                source_slots: dict[tuple[str, int, str], list[dict]] = {}
                for entry in drawn:
                    key = (entry.get("source"), entry.get("page"),
                           entry.get("tableId"))
                    source_slots.setdefault(key, []).append(entry)
                duplicate_slots = {
                    "|".join(map(str, key)):
                        [entry["fieldId"] for entry in entries]
                    for key, entries in source_slots.items()
                    if key[0] and len(entries) > 1 and not (
                        entries[0].get("sourceRepeatGroup") and
                        len({entry.get("sourceRepeatGroup")
                             for entry in entries}) == 1
                    )
                }
                checks.check(label + " no duplicated logical value/address",
                             not duplicate_slots,
                             json.dumps(duplicate_slots, ensure_ascii=False))
                checks.check(label + " ownership in fingerprint",
                             "ownership=" in (result.get("fingerprint") or ""))
                expansion_count = sum(
                    int(entry.get("rowExpansionCount") or 0) for entry in metrics
                )
                if profile.endswith("-normal"):
                    expected_rows = EXPECTED_NORMAL_EXPANSIONS.get(
                        (document, profile), 0
                    )
                    checks.check(label + " original row geometry",
                                 expansion_count == expected_rows,
                                 f"rowExpansionCount={expansion_count}; "
                                 f"expected={expected_rows}")
                else:
                    checks.check(label + " reviewed long-row growth",
                                 expansion_count > 0,
                                 f"rowExpansionCount={expansion_count}")

        mutations = json.loads(browser.eval(MUTATIONS, await_promise=True))
        for name, passed in mutations.items():
            checks.check("mutation rejects " + name, passed,
                         json.dumps(mutations, ensure_ascii=False))
        checks.check("all mutation gates executed", len(mutations) == 9,
                     json.dumps(mutations, ensure_ascii=False))
        checks.check("no failed asset requests", not browser.requests,
                     "\n".join(browser.requests[-20:]))
    finally:
        browser.stop()
        server.stop()
    return checks.report()


if __name__ == "__main__":
    sys.exit(main())
