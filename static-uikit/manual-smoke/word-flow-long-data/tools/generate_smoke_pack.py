"""Build the manual smoke pack: fixtures, PDFs, structural reports, manifests.

    python generate_smoke_pack.py

Every PDF is produced by the production renderer through
`smoke_engine.SmokeBrowser`. Nothing is edited afterwards, no builder
approximation is used, and Word/LibreOffice are never involved.

Structural verification reuses the production inspector
(`tools/qa/run_document_regression.inspect`) rather than a second
implementation, and adds the two Word-flow invariants that need the generated
file: the reviewed legal block must still be present, exactly once.
"""

from __future__ import annotations

import collections
import csv
import json
import os
import re
import sys

import fitz  # pymupdf

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

from smoke_engine import TEMPLATES, SmokeBrowser  # noqa: E402
from smoke_profiles import MASTER_PROFILES, PROFILES_BY_ID, VALUES  # noqa: E402
from smoke_cases import CASES, LADDERS, STRESS_CASES  # noqa: E402
from smoke_repair import classify, step_down  # noqa: E402
from run_document_regression import inspect as production_inspect  # noqa: E402

FIXTURES = os.path.join(ROOT, "fixtures")
PDFS = os.path.join(ROOT, "generated-pdfs")
REPORTS = os.path.join(ROOT, "reports")

WORD_OR_PUNCTUATION = re.compile(r"[^\W_]+|[^\s\w]", re.UNICODE)

# The longest printed phrase each reviewed Word-flow block owns, filled from
# the committed maps at run time so the legal-block check looks for something
# concrete rather than a hard-coded string.
BLOCK_PHRASES: dict[tuple[str, str], str] = {}


# ── Helpers ──────────────────────────────────────────────────────────────────

def normalise(value: str) -> str:
    text = re.sub(r"_+", " ", str(value or ""))
    text = text.replace(" ", " ").replace(" ", " ").replace(" ", " ")
    return re.sub(r"\s+", " ", text).strip()


def longest_static_phrase(block: dict) -> str:
    """The longest printed phrase the reviewed block owns.

    Used as the legal-block fingerprint: it has to appear in the generated page
    exactly as often as it appears in the authoritative template — once. Fewer
    means a legal block went missing, more means the static text was drawn on
    top of the source instead of replacing it.
    """
    best = ""
    for run in block.get("runs") or []:
        if run.get("type", "static") != "static":
            continue
        text = normalise(run.get("text", ""))
        if len(text) > len(best):
            best = text
    return best


def tokens(value: str) -> list[str]:
    """Words and punctuation only — the production static-equivalence rule.

    Mirrors `check_word_flow_static_equivalence.py` / `pdf-text-layout.js`:
    blank underscores are geometry and whitespace is not meaningful. Without
    this, a slot nobody filled extracts as «№ ,» from the source and «№,» from
    the redrawn block, and a correct render looks like a lost legal block.
    """
    return WORD_OR_PUNCTUATION.findall(normalise(value))


def needle_for(phrase: str) -> list[str]:
    """The tokens of a static run that a filled-in value cannot contaminate.

    A static run sits between two blanks, so its first and last token touch
    whatever was written into them: «… дата выдачи «20» апреля 2008г., …»
    tokenises as `2008г` where the empty source form tokenises as `г`. Dropping
    one token at each end keeps the comparison about the legal text itself.
    """
    parts = tokens(phrase)
    return parts[1:-1] if len(parts) >= 6 else parts


def phrase_count(page, needle: list[str]) -> int:
    """How often a token sequence occurs in a page's text.

    Not `search_for`: that returns one rectangle per *line* a match spans, so
    a phrase wrapped over three lines counts three times and a re-wrapped
    Word-flow replacement never agrees with its source.
    """
    if not needle:
        return 0
    haystack = tokens(page.get_text("text"))
    return sum(1 for i in range(len(haystack) - len(needle) + 1)
               if haystack[i:i + len(needle)] == needle)


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", str(value).lower()).strip("-")


# Wizard slots the production fixture engine fills from its own constants. Those
# constants are the repository's synthetic test data, but this pack states that
# every value in it comes from its own library — so the identifier-shaped ones
# are replaced with this pack's, which are chosen to sit outside every assigned
# real range.
SANITISE = (
    (re.compile(r"\bbik\b|\bbic\b|bic-swift", re.I), VALUES["bank_bic"]),
    (re.compile(r"corr(espondent)?-account", re.I), VALUES["bank_corr_account"]),
    (re.compile(r"settlement-account|bank-account|personal-account", re.I),
     VALUES["bank_account"]),
    (re.compile(r"bank-inn", re.I), VALUES["inn_ul"]),
    (re.compile(r"^phone$|mobile-phone|landline-phone", re.I), VALUES["ru_phone"]),
    (re.compile(r"portfolio", re.I), VALUES["bank_account"]),
)


def sanitise(wizard_keys, overrides: dict) -> dict:
    """Replace production-fixture identifier defaults this case did not set."""
    out = dict(overrides)
    for key in wizard_keys:
        path = "extra." + key
        if path in out:
            continue
        for pattern, value in SANITISE:
            if pattern.search(key):
                out[path] = value
                break
    return out


# ── Scenario measurement ─────────────────────────────────────────────────────

def measured_facts(measurement: dict, target: str | None) -> dict:
    word_flow = measurement.get("wordFlow") or {}
    rows = measurement.get("rows") or {}
    cross = measurement.get("crossPage") or []
    added = None
    if target and target in word_flow:
        added = word_flow[target]
    elif target and target in rows:
        added = rows[target]
    return {
        "addedLines": added,
        "wordFlowBlocks": {k: v for k, v in word_flow.items() if v is not None},
        "insertedRows": rows,
        "crossPageActive": bool(cross),
        "crossPage": cross,
    }


def fit(browser, doc_id, base_profile, overrides, english, block_sources=None,
        protected=frozenset(), rounds=16):
    """Ask the engine, and step a refused value down its ladder until it fits.

    Returns the overrides that actually rendered, the final measurement and the
    list of substitutions made, so the report can say exactly which slot could
    not hold which realistic-long value.

    `protected` paths are never shortened. A ladder uses this to keep the very
    value it is stretching: without it, an unrelated slot elsewhere on the page
    would drag the whole scenario back down and the rung would measure nothing.
    """
    current = dict(overrides)
    substitutions: list[dict] = []
    measurement = browser.measure(doc_id, base_profile, current)
    for _ in range(rounds):
        if measurement.get("ok"):
            return current, measurement, substitutions
        changed = False
        blocked = []
        for overflow in measurement.get("overflows") or []:
            source = overflow.get("source")
            if not source:
                blocked.append(overflow)
                continue
            if source in protected:
                continue
            value = current.get(source, overflow.get("value"))
            nxt = step_down(source, value, english)
            if nxt is None or nxt == value:
                continue
            current[source] = nxt
            substitutions.append({
                "source": source, "fieldId": overflow.get("fieldId"),
                "from": value, "to": nxt,
                "reason": overflow.get("message"),
                "diagnostics": overflow,
                **classify(source, value, nxt, overflow),
            })
            changed = True

        # A reviewed Word-flow block reports no single source — it is the whole
        # paragraph that no longer fits. Step down the longest value that block
        # actually prints; the map says which sources those are.
        if not changed and blocked:
            candidate = None
            for overflow in blocked:
                owned = (block_sources or {}).get(overflow.get("fieldId")) or []
                paths = owned or list(current)
                for path in paths:
                    if path in protected:
                        continue
                    value = current.get(path)
                    if not isinstance(value, str) or len(value) < 12:
                        continue
                    nxt = step_down(path, value, english)
                    if nxt is None or nxt == value:
                        continue
                    if candidate is None or len(value) > len(candidate[1]):
                        candidate = (path, value, nxt)
                if candidate:
                    break
            if candidate:
                path, value, nxt = candidate
                current[path] = nxt
                substitutions.append({
                    "source": path, "fieldId": blocked[0].get("fieldId"),
                    "from": value, "to": nxt,
                    "reason": blocked[0].get("message"),
                    "diagnostics": blocked[0],
                    **classify(path, value, nxt, blocked[0]),
                })
                changed = True

        if not changed:
            break
        measurement = browser.measure(doc_id, base_profile, current)
    return current, measurement, substitutions


def sweep_ladder(browser, entry, log, block_sources=None,
                 wizard_keys=None) -> list[dict]:
    """Walk one ladder, measuring every rung, and pick the reportable ones.

    Each rung is fitted first: an unrelated slot elsewhere on the page must not
    decide whether this anchor's scenario is reachable. The value the ladder is
    stretching is protected, so what the rung finally measures is still the
    scenario it was written to produce.
    """
    profile = PROFILES_BY_ID[entry["profile"]]
    accumulated = dict(profile["overrides"])
    accumulated.update(entry["base"])
    accumulated = sanitise(wizard_keys or (), accumulated)
    target = entry["target"]
    protected = {path for _name, step in entry["rungs"] for path in step}
    rungs = []
    for name, step in entry["rungs"]:
        accumulated.update(step)
        overrides, measurement, substitutions = fit(
            browser, entry["doc"], profile["base"], dict(accumulated),
            profile["language"] == "en", block_sources, frozenset(protected))
        facts = measured_facts(measurement, target)
        rungs.append({
            "rung": name, "overrides": overrides, "ok": measurement.get("ok"),
            "facts": facts,
            "overflows": measurement.get("overflows") or [],
            "substitutions": substitutions,
            "failed": measurement.get("failed", False),
            "message": measurement.get("message"),
        })
        log.append({
            "doc": entry["doc"], "target": target, "rung": name,
            "ok": measurement.get("ok"), "addedLines": facts["addedLines"],
            "crossPageActive": facts["crossPageActive"],
            "substitutions": len(substitutions),
            "overflowFields": [o["fieldId"] for o in measurement.get("overflows") or []],
        })

    usable = [r for r in rungs if r["ok"]]

    # Which rung plays which required role. Every role is decided by what the
    # engine reported for that rung, never by where it sits in the list.
    roles: dict[int, list[str]] = {id(r): [] for r in usable}

    def assign(role, rung):
        if rung is not None:
            roles[id(rung)].append(role)

    zero = next((r for r in usable if r["facts"]["addedLines"] == 0), None)
    assign("no-expansion", zero)
    one = next((r for r in usable if (r["facts"]["addedLines"] or 0) == 1), None)
    assign("one-added-line", one)
    if usable:
        deepest = max(usable, key=lambda r: (r["facts"]["addedLines"] or 0))
        if (deepest["facts"]["addedLines"] or 0) > 0:
            assign("max-reviewed", deepest)

    flow_rungs = [r for r in usable if r["facts"]["crossPageActive"]]
    if flow_rungs:
        assign("cross-page-inactive",
               next((r for r in usable if not r["facts"]["crossPageActive"]), None))
        assign("cross-page-min", flow_rungs[0])
        if flow_rungs[-1] is not flow_rungs[0]:
            assign("cross-page-max", flow_rungs[-1])

    refused = next((r for r in rungs if not r["ok"]), None)

    out = []
    for rung in usable:
        played = roles[id(rung)]
        out.append({
            "doc": entry["doc"], "profile": entry["profile"],
            "scenario": rung["rung"], "folder": entry["folder"],
            "variant": entry["variant"],
            "priority": entry["priority"] and bool(played),
            "overrides": rung["overrides"],
            "target": target, "rung": rung["rung"], "facts": rung["facts"],
            "scenarioRoles": played,
            "notes": (f"Ladder «{target}» — measured: "
                      f"{rung['facts']['addedLines']} added line(s), "
                      f"cross-page {'active' if rung['facts']['crossPageActive'] else 'inactive'}"
                      + (f"; role: {', '.join(played)}" if played else "")),
        })
    return out, refused, rungs


# ── Structural verification ──────────────────────────────────────────────────

def verify(pdf_bytes: bytes, path: str, doc_facts: dict, render_result: dict,
           active_blocks: list[dict], payload: dict, language: str) -> dict:
    """Structural verdict. Reuses the production inspector, then adds the
    two Word-flow invariants that can only be checked on the drawn file."""
    template_path = os.path.join(TEMPLATES, doc_facts["templateId"])
    checks: list[tuple[str, bool, str]] = []

    exists = os.path.isfile(path)
    size = os.path.getsize(path) if exists else 0
    checks.append(("file exists", exists, path))
    checks.append(("file is non-empty", size > 0, f"{size} bytes"))

    result = production_inspect(
        pdf_bytes, template_path, doc_facts["expectedPages"],
        render_result.get("reviewedRanges"),
        render_result.get("reviewedFontSizes"),
        render_result.get("deterministic", False),
    )
    problems = list(result["problems"])

    base = fitz.open(template_path)
    generated = fitz.open(stream=pdf_bytes, filetype="pdf")

    checks.append(("page count equals the authoritative template",
                   generated.page_count == base.page_count,
                   f"{generated.page_count} vs {base.page_count}"))
    checks.append(("no appended page",
                   generated.page_count == doc_facts["expectedPages"],
                   f"{generated.page_count} vs declared {doc_facts['expectedPages']}"))
    checks.append(("zero AcroForm fields", not generated.is_form_pdf, ""))
    widgets = sum(1 for page in generated for _ in page.widgets())
    checks.append(("zero widget annotations", widgets == 0, str(widgets)))
    generated_annots = sum(len(list(page.annots())) for page in generated)
    base_annots = sum(len(list(page.annots())) for page in base)
    checks.append(("no new annotation", generated_annots == base_annots,
                   f"{generated_annots} vs {base_annots}"))
    checks.append(("no rasterisation — painted images unchanged",
                   not any("painted images changed" in p for p in problems), ""))
    checks.append(("no protected vector rule lost",
                   not any("protected vector rule" in p for p in problems), ""))
    # Extractability is asserted for the script the profile is written in.
    # Asserting both would fail correct renders: an English-language profile on
    # a Russian form draws no Cyrillic of its own, and a Russian one may print
    # no Latin at all on a given form. The other script is still reported.
    checks.append(("generated text is extractable",
                   bool(result["cyrillic"] or result["latin"]), ""))
    if language == "en":
        checks.append(("Latin extractable", bool(result["latin"]), ""))
    else:
        checks.append(("Cyrillic extractable", bool(result["cyrillic"]), ""))
    smallest = result["smallestDynamicSize"]
    checks.append(("no dynamic text below 9 pt outside reviewed locked runs",
                   not any(" pt — «" in p for p in problems),
                   f"smallest drawn {smallest} pt"))
    checks.append(("repeated generation is byte-for-byte deterministic",
                   bool(render_result.get("deterministic")), ""))
    checks.append(("every drawn line stays inside the page",
                   not any("outside the page" in p for p in problems), ""))

    latin_used = bool(result["latin"])

    # Word-flow invariants: the reviewed legal block is present, exactly once.
    for block in active_blocks:
        needle = needle_for(block["phrase"])
        page_index = block["page"]
        if len(needle) < 4 or page_index >= generated.page_count:
            continue
        want = phrase_count(base[page_index], needle)
        if want != 1:
            # The phrase is not unique in the authoritative page, so «exactly
            # once» would not mean anything here. Say so instead of passing.
            checks.append((f"legal block «{block['id']}» comparable",
                           False,
                           f"phrase occurs {want}× in the template — skipped"))
            continue
        got = phrase_count(generated[page_index], needle)
        checks.append((f"legal block «{block['id']}» present", got >= 1,
                       f"found {got}× on page {page_index + 1}"))
        checks.append((f"legal block «{block['id']}» not duplicated",
                       got == want,
                       f"generated {got}× vs template {want}×"))

    generated.close()
    base.close()

    failures = [(name, detail) for name, ok, detail in checks if not ok]
    return {
        "status": "PASS" if not failures and not problems else "FAIL",
        "checks": [{"check": n, "ok": bool(o), "detail": d} for n, o, d in checks],
        "checksRun": len(checks),
        "checksPassed": len(checks) - len(failures),
        "failures": [{"check": n, "detail": d} for n, d in failures],
        "engineProblems": problems,
        "pages": result["pages"],
        "smallestDynamicSize": smallest,
        "cyrillic": bool(result["cyrillic"]),
        "latin": latin_used,
        "addedRules": result["addedRules"],
    }


# ── Main ─────────────────────────────────────────────────────────────────────

def main() -> int:
    for folder in (FIXTURES, PDFS, REPORTS):
        os.makedirs(folder, exist_ok=True)
    for sub in ("subjects", "documents", "profiles"):
        os.makedirs(os.path.join(FIXTURES, sub), exist_ok=True)
    for sub in ("individual", "company", "power-of-attorney", "accession",
                "other-documents"):
        os.makedirs(os.path.join(PDFS, sub), exist_ok=True)

    browser = SmokeBrowser()
    calibration: list[dict] = []
    known_limits: list[dict] = []
    try:
        # Measured blank space under every mapped field, from the
        # authoritative PDFs, so a substitution can be classified instead of
        # merely counted.
        room_path = os.path.join(REPORTS, "field-room.json")
        if os.path.isfile(room_path):
            with open(room_path, encoding="utf-8") as fh:
                browser.load_field_room(json.load(fh))
        else:
            print("note: reports/field-room.json missing — substitutions will "
                  "be classified without measured room. Produce it with "
                  "tools/qa/measure_field_room.py --maps ... --out ...")

        facts = browser.facts()
        for doc_id, template in browser.maps().items():
            for block in template.get("wordFlowBlocks") or []:
                BLOCK_PHRASES[(doc_id, block["id"])] = longest_static_phrase(block)

        # Master profiles and their subject payloads.
        for profile in MASTER_PROFILES:
            with open(os.path.join(FIXTURES, "profiles", profile["id"] + ".json"),
                      "w", encoding="utf-8") as fh:
                json.dump({
                    "id": profile["id"], "letter": profile["letter"],
                    "title": profile["title"], "description": profile["description"],
                    "baseProductionProfile": profile["base"],
                    "subjectKind": profile["subjectKind"],
                    "language": profile["language"],
                    "lengthClass": profile["lengthClass"],
                    "stressOnly": profile.get("stressOnly", False),
                    "synthetic": True,
                    "overrides": profile["overrides"],
                }, fh, ensure_ascii=False, indent=1)

            # The subject half on its own, so a synthetic client can be reused
            # against any document without dragging a document's wizard values
            # along with it.
            subject = {path: value
                       for path, value in profile["overrides"].items()
                       if path.startswith("subject.")}
            with open(os.path.join(FIXTURES, "subjects", profile["id"] + ".json"),
                      "w", encoding="utf-8") as fh:
                json.dump({
                    "id": profile["id"], "title": profile["title"],
                    "subjectKind": profile["subjectKind"],
                    "language": profile["language"],
                    "lengthClass": profile["lengthClass"],
                    "synthetic": True,
                    "note": "subject.* paths only; the production fixture "
                            "engine fills everything else this document needs",
                    "subject": subject,
                }, fh, ensure_ascii=False, indent=1)

        with open(os.path.join(FIXTURES, "values-library.json"), "w",
                  encoding="utf-8") as fh:
            json.dump({"synthetic": True, "values": VALUES}, fh,
                      ensure_ascii=False, indent=1)

        # Every scenario: explicit cases first, then the measured ladder rungs.
        planned = [dict(c, source="case") for c in CASES]
        for entry in LADDERS:
            picked, refused, rungs = sweep_ladder(
                browser, entry, calibration,
                {b["id"]: b["sources"]
                 for b in facts[entry["doc"]]["wordFlowBlocks"]},
                facts[entry["doc"]]["wizardKeys"])
            planned.extend(dict(p, source="ladder") for p in picked)
            if refused:
                known_limits.append({
                    "doc": entry["doc"], "target": entry["target"],
                    "rung": refused["rung"],
                    "overflowFields": [o["fieldId"] for o in refused["overflows"]],
                    "messages": [o.get("message") for o in refused["overflows"]],
                    "classification": "realistic-long value the source layout "
                                      "cannot hold — recorded, not fixed here",
                })
        planned.extend(dict(c, source="stress") for c in STRESS_CASES)

        # Deterministic order and numbering.
        folder_rank = {"power-of-attorney": 0, "accession": 1, "individual": 2,
                       "company": 3, "other-documents": 4}
        planned.sort(key=lambda c: (
            0 if c.get("priority") else 1,
            folder_rank.get(c["folder"], 9), c["doc"], c["variant"],
            c["scenario"], c["profile"]))

        manifest: list[dict] = []
        generation: list[dict] = []
        structural: list[dict] = []
        sequence = 0

        for entry in planned:
            doc_id = entry["doc"]
            profile = PROFILES_BY_ID[entry["profile"]]
            doc_facts = facts[doc_id]
            overrides = dict(profile["overrides"])
            overrides.update(entry.get("overrides") or {})
            if entry["source"] == "ladder":
                overrides = entry["overrides"]

            # Ladder rungs were already measured and only accepted rungs got
            # here; the stress profile is meant to be refused. Everything else
            # is fitted to the slots the source form really gives it.
            # «Maximum applicable checkbox branches» means the branches this
            # document really has: the check sources come from its own map, so
            # a company-only form gets its own keys rather than another form's.
            if entry["scenario"] == "max-branches":
                for source in doc_facts["checkSources"]:
                    overrides.setdefault(source, True)

            # Profile G's whole point is that optional values are absent, so it
            # is the one profile that must not have anything put back.
            if profile["id"] != "smoke-optional-empty":
                overrides = sanitise(doc_facts["wizardKeys"], overrides)

            block_sources = {b["id"]: b["sources"]
                             for b in doc_facts["wordFlowBlocks"]}
            substitutions: list[dict] = []
            if entry["source"] == "case":
                overrides, _, substitutions = fit(
                    browser, doc_id, profile["base"], overrides,
                    profile["language"] == "en", block_sources)
                for item in substitutions:
                    known_limits.append({
                        "doc": doc_id, "profile": profile["id"],
                        "scenario": entry["scenario"],
                        "source": item["source"], "fieldId": item["fieldId"],
                        "refusedValue": item["from"], "usedValue": item["to"],
                        "messages": [item["reason"]],
                        "category": item.get("category"),
                        "why": item.get("why"),
                        "refusedLength": len(str(item["from"] or "")),
                        "usedLength": len(str(item["to"] or "")),
                        "lineCapacity": (item.get("diagnostics") or {}).get("lineCapacity"),
                        "regionCount": (item.get("diagnostics") or {}).get("regionCount"),
                        "minFontSize": (item.get("diagnostics") or {}).get("minFontSize"),
                        "preferredFontSize": (item.get("diagnostics") or {}).get("preferredFontSize"),
                        "classification": "source slot cannot hold this "
                                          "realistic-long value — a shorter "
                                          "plausible value was used instead",
                    })

            sequence += 1
            subject_kind = entry.get("variant") or profile["subjectKind"]
            name = (f"{sequence:02d}__{doc_id}__{slug(subject_kind)}"
                    f"__{slug(entry['scenario'])}")
            fixture_name = (f"{doc_id}__{profile['id']}"
                            f"__{slug(entry['scenario'])}.json")

            rendered = browser.render(doc_id, profile["base"], overrides)
            stress = entry["source"] == "stress" or profile.get("stressOnly")

            record = {
                "sequence": sequence,
                "documentId": doc_id,
                "documentTitle": doc_facts["title"],
                "templateId": doc_facts["templateId"],
                "subjectProfile": profile["id"],
                "subjectProfileTitle": profile["title"],
                "subjectKind": subject_kind,
                "scenario": entry["scenario"],
                "variant": entry.get("variant") or "",
                "lengthClass": profile["lengthClass"],
                "fixtureJson": fixture_name,
                "priority": bool(entry.get("priority")),
                "stressOnly": bool(stress),
                "notes": entry.get("notes", ""),
                "expectedPages": doc_facts["expectedPages"],
                "valueSubstitutions": len(substitutions),
                "scenarioRoles": entry.get("scenarioRoles") or [],
                "ladderTarget": entry.get("target") or "",
            }

            if not rendered.get("ok"):
                record.update({
                    "pdfFilename": "", "pdfPath": "", "pageCount": None,
                    "structuralStatus": "NOT GENERATED",
                    "manualReviewStatus": "not-reviewed",
                    "generationStatus": "REFUSED",
                    "generationMessage": rendered.get("message"),
                    "overflowFields": [o.get("fieldId")
                                       for o in rendered.get("overflows") or []],
                    "wordFlowBlocksExercised": [],
                    "tableCellAnchorsExercised": [],
                    "crossPageRuleExercised": False,
                    "expectedInsertedLines": None,
                    "expectedCrossPageActivation": False,
                })
                manifest.append(record)
                generation.append({
                    "sequence": sequence, "documentId": doc_id,
                    "profile": profile["id"], "scenario": entry["scenario"],
                    "status": "REFUSED", "stressOnly": bool(stress),
                    "message": rendered.get("message"),
                    "overflows": rendered.get("overflows") or [],
                })
                if not stress:
                    known_limits.append({
                        "doc": doc_id, "profile": profile["id"],
                        "scenario": entry["scenario"],
                        "overflowFields": [o.get("fieldId")
                                           for o in rendered.get("overflows") or []],
                        "messages": [o.get("message")
                                     for o in rendered.get("overflows") or []],
                        "classification": "realistic-long case refused by the "
                                          "engine — recorded for review",
                    })
                print(f"{sequence:3d} REFUSED  {doc_id}/{entry['scenario']}",
                      flush=True)
                continue

            pdf_bytes = rendered["bytes"]
            out_dir = os.path.join(PDFS, entry["folder"])
            os.makedirs(out_dir, exist_ok=True)
            pdf_path = os.path.join(out_dir, name + ".pdf")
            with open(pdf_path, "wb") as fh:
                fh.write(pdf_bytes)

            payload = rendered["payload"]
            with open(os.path.join(FIXTURES, "documents", fixture_name),
                      "w", encoding="utf-8") as fh:
                json.dump({
                    "synthetic": True,
                    "documentId": doc_id,
                    "documentTitle": doc_facts["title"],
                    "templateId": doc_facts["templateId"],
                    "subjectProfile": profile["id"],
                    "baseProductionProfile": profile["base"],
                    "scenario": entry["scenario"],
                    "variant": entry.get("variant") or "",
                    "pdf": os.path.relpath(pdf_path, ROOT).replace("\\", "/"),
                    "overrides": overrides,
                    "valueSubstitutions": substitutions,
                    "payload": payload,
                }, fh, ensure_ascii=False, indent=1)

            # Which reviewed blocks are actually live for this payload.
            measurement = browser.measure(doc_id, profile["base"], overrides)
            live = measurement.get("wordFlow") or {}
            active_blocks = []
            raw_blocks = {b["id"]: b for b in doc_facts["wordFlowBlocks"]}
            for block_id, added in live.items():
                if added is None or block_id not in raw_blocks:
                    continue
                block = raw_blocks[block_id]
                active_blocks.append({
                    "id": block_id, "page": block["page"],
                    "phrase": BLOCK_PHRASES.get((doc_id, block_id), ""),
                    "addedLines": added,
                })

            verdict = verify(pdf_bytes, pdf_path, doc_facts, rendered,
                             active_blocks, payload, profile["language"])
            rows = measurement.get("rows") or {}
            anchors = [a["id"] for a in doc_facts["expansionAnchors"]
                       if rows.get(a["id"])]
            cross = measurement.get("crossPage") or []

            record.update({
                "pdfFilename": name + ".pdf",
                "pdfPath": os.path.relpath(pdf_path, ROOT).replace("\\", "/"),
                "pageCount": verdict["pages"],
                "structuralStatus": verdict["status"],
                "manualReviewStatus": "not-reviewed",
                "generationStatus": "OK",
                "generationMessage": "",
                "overflowFields": [],
                "wordFlowBlocksExercised": [b["id"] for b in active_blocks],
                "tableCellAnchorsExercised": anchors,
                "crossPageRuleExercised": bool(cross),
                "expectedInsertedLines": sum(
                    (b["addedLines"] or 0) for b in active_blocks) + sum(
                    rows.get(a, 0) for a in anchors),
                "expectedCrossPageActivation": bool(cross),
                "smallestDynamicSize": verdict["smallestDynamicSize"],
                "deterministic": bool(rendered.get("deterministic")),
            })
            manifest.append(record)
            generation.append({
                "sequence": sequence, "documentId": doc_id,
                "profile": profile["id"], "scenario": entry["scenario"],
                "status": "OK", "pdf": record["pdfPath"],
                "bytes": len(pdf_bytes),
                "deterministic": bool(rendered.get("deterministic")),
                "wordFlow": {b["id"]: b["addedLines"] for b in active_blocks},
                "insertedRows": rows, "crossPage": cross,
            })
            structural.append({
                "sequence": sequence, "pdf": record["pdfFilename"],
                "documentId": doc_id, "profile": profile["id"],
                "scenario": entry["scenario"], **verdict,
            })
            flag = "PASS" if verdict["status"] == "PASS" else "FAIL"
            print(f"{sequence:3d} {flag}  {record['pdfFilename']} "
                  f"({verdict['checksPassed']}/{verdict['checksRun']} checks)",
                  flush=True)
    finally:
        browser.stop()

    # ── Reports ─────────────────────────────────────────────────────────────
    with open(os.path.join(REPORTS, "generation-report.json"), "w",
              encoding="utf-8") as fh:
        json.dump({"synthetic": True, "cases": generation,
                   "calibration": calibration, "knownLimits": known_limits},
                  fh, ensure_ascii=False, indent=1)

    with open(os.path.join(REPORTS, "generation-report.csv"), "w",
              encoding="utf-8-sig", newline="") as fh:
        writer = csv.writer(fh, delimiter=";")
        writer.writerow(["sequence", "documentId", "profile", "scenario",
                         "status", "pdf", "bytes", "deterministic"])
        for row in generation:
            writer.writerow([row["sequence"], row["documentId"], row["profile"],
                             row["scenario"], row["status"], row.get("pdf", ""),
                             row.get("bytes", ""), row.get("deterministic", "")])

    # ── Every substitution, classified ──────────────────────────────────────
    #
    # A count of "226 values were shortened" is not evidence. Each one says
    # which slot refused which value, how much room the slot had, and which of
    # the review's nine categories it falls into — so categories 4 to 7, the
    # ones that are production defects rather than paper limits, cannot hide
    # inside the total.
    substitutions = [limit for limit in known_limits if limit.get("category")]
    by_category = collections.Counter(s["category"] for s in substitutions)
    with open(os.path.join(REPORTS, "substitution-review.json"), "w",
              encoding="utf-8") as fh:
        json.dump({
            "synthetic": True,
            "total": len(substitutions),
            "byCategory": dict(sorted(by_category.items())),
            "categoriesThatAreProductionDefects": [
                "4-missing-wrapping-configuration",
                "5-missing-continuation-region",
                "6-missing-dynamic-expansion-anchor",
                "7-broken-preflight-render-geometry",
            ],
            "howCategoriesAreDecided": (
                "From what the engine reported about the slot and from the "
                "blank space measured under it in the authoritative PDF "
                "(reports/field-room.json, produced by "
                "tools/qa/measure_field_room.py). A one-line slot with less "
                "than 11 pt free below it is a physical limit; with more, it "
                "is a candidate for a continuation region."),
            "note": (
                "Categories 4-7 are *candidates for layout review*, not "
                "confirmed defects. Measured blank space below a slot proves "
                "there is paper there; it does not prove a continuation line "
                "belongs there — the space may be another field's, or the "
                "form may intend the value to be abbreviated. Each one needs "
                "the same measure-and-review pass the re-cut anchors had. "
                "Category 7 is empty: the preflight/render geometry defect "
                "this review started from is fixed."),
            "substitutions": substitutions,
        }, fh, ensure_ascii=False, indent=1)

    with open(os.path.join(REPORTS, "substitution-review.csv"), "w",
              encoding="utf-8-sig", newline="") as fh:
        writer = csv.writer(fh, delimiter=";")
        writer.writerow(["documentId", "fieldId", "source", "originalValue",
                         "substitutedValue", "originalLength",
                         "substitutedLength", "preferredSize", "minimumSize",
                         "availableRegions", "lineCapacity", "failureReason",
                         "category", "why"])
        for row in substitutions:
            writer.writerow([
                row.get("doc"), row.get("fieldId"), row.get("source"),
                row.get("refusedValue"), row.get("usedValue"),
                row.get("refusedLength"), row.get("usedLength"),
                row.get("preferredFontSize"), row.get("minFontSize"),
                row.get("regionCount"), row.get("lineCapacity"),
                (row.get("messages") or [""])[0], row.get("category"),
                row.get("why"),
            ])

    with open(os.path.join(REPORTS, "structural-report.json"), "w",
              encoding="utf-8") as fh:
        json.dump({
            "synthetic": True,
            "totalPdfs": len(structural),
            "passed": sum(1 for s in structural if s["status"] == "PASS"),
            "failed": sum(1 for s in structural if s["status"] != "PASS"),
            "checksRun": sum(s["checksRun"] for s in structural),
            "checksPassed": sum(s["checksPassed"] for s in structural),
            "results": structural,
        }, fh, ensure_ascii=False, indent=1)

    with open(os.path.join(REPORTS, "visual-review-template.csv"), "w",
              encoding="utf-8-sig", newline="") as fh:
        writer = csv.writer(fh, delimiter=";")
        writer.writerow(["sequence", "pdfFilename", "documentTitle",
                         "subjectKind", "scenario", "priority",
                         "reviewStatus", "defectDescription", "notes"])
        for row in manifest:
            if not row.get("pdfFilename"):
                continue
            writer.writerow([row["sequence"], row["pdfFilename"],
                             row["documentTitle"], row["subjectKind"],
                             row["scenario"],
                             "PRIORITY" if row["priority"] else "",
                             "not-reviewed", "", ""])

    with open(os.path.join(ROOT, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump({"synthetic": True, "generatedBy": "generate_smoke_pack.py",
                   "items": manifest}, fh, ensure_ascii=False, indent=1)

    columns = ["sequence", "pdfFilename", "documentId", "documentTitle",
               "templateId", "subjectProfile", "subjectKind", "scenario",
               "variant", "fixtureJson", "pageCount",
               "wordFlowBlocksExercised", "tableCellAnchorsExercised",
               "crossPageRuleExercised", "expectedInsertedLines",
               "expectedCrossPageActivation", "structuralStatus",
               "manualReviewStatus", "notes"]
    with open(os.path.join(ROOT, "manifest.csv"), "w", encoding="utf-8-sig",
              newline="") as fh:
        writer = csv.writer(fh, delimiter=";")
        writer.writerow(columns)
        for row in manifest:
            writer.writerow([
                ", ".join(row[c]) if isinstance(row.get(c), list) else row.get(c, "")
                for c in columns])

    ok = sum(1 for s in structural if s["status"] == "PASS")
    print(f"\nPDFs generated : {len(structural)}")
    print(f"structural PASS: {ok}/{len(structural)}")
    print(f"refused        : {sum(1 for g in generation if g['status'] == 'REFUSED')}")
    print(f"known limits   : {len(known_limits)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
