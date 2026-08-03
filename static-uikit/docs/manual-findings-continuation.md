# Manual-findings correction — continuation log

Working branch: `feature/document-template-builder`. Nothing is pushed.

This file exists because the correction phase outlived more than one agent
session. It records what is finished, what each commit contains, which tests
were run, and the exact next command — so the work can be picked up again
without re-deriving it from the diff.

## Baseline

| Marker | Commit |
| --- | --- |
| Known completed baseline | `80300c7` — corrected status claims and recorded open work |
| Protected, never rewritten | `a39c899`, `bb5ea4b`, `c2b37bc`, `5c19545`, `80300c7` |
| Already present when this continuation started | `ae398f6` — account-opening representative spelling |

`80300c7` is still an ancestor of `HEAD`. No commit has been amended, squashed,
rebased or reset. `.vscode/` is untracked and stays that way. The generated
review pack under `static-uikit/manual-smoke/manual-findings-fix/` is
git-excluded; no PDF or screenshot from it is committed.

## Continuation matrix

State as found at the start of this continuation, measured by reproducing the
tests and reading the generated output — not by reading commit titles.

| Workstream | Complete | Partial | Not started | Evidence |
| --- | ---: | ---: | ---: | --- |
| Representative spelling | ✓ | | | Committed in `ae398f6`. Authoritative PDF replaced (SHA `5ca829a6…` → `8e6a3922…`); text extraction of the committed template gives `Юрьевича` ×1, `Юрьвеича` ×0, `Тестовое значение` ×0. `check_accession_blocks.py` gates all three. |
| Depository agreement | | ✓ | | Implemented in the working tree, uncommitted: workflow/operator-input policy in `umi-registry.js`, required validated wizard inputs, four printed occurrences, `check_umi_registry.py --self-test` depository gates. |
| Qualification notice | | ✓ | | Implemented, uncommitted: recipient hanging-indent block, semantic groups, eight reviewed `sourcePathSuppressions`, `run_qualification_notice_layout_tests.py` (new, untracked). |
| Questionnaire ownership | | ✓ | | Implemented, uncommitted: `table-ownership.js` (new, untracked), owner/budget declarations in all four questionnaire maps, `run_table_ownership_tests.py` (new, untracked). |
| Shared-mechanism sweep | | ✓ | | Ownership and rule-intersection validators wired into `pdf-overlay-renderer.js` for every map; accession/PoA/notice maps re-checked. |
| Template Builder | | ✓ | | Implemented, uncommitted: builder validation, schema, inspector, source catalogue and builder QA page. |
| Review pack | | ✓ | | Pack present on disk (24 PDFs, 157 images) but its `review.json` fingerprint recorded in `VISUAL_QA_CHECKLIST.md` was stale. |
| Canonical QA | | ✓ | | Combined `run_all_qa.py` was **red**: 24/27 suites. Three failures — see below. |
| Documentation | | ✓ | | Rewritten, but four files still said the canonical result was “pending”. |

Nothing was restarted and nothing was discarded. The three canonical-run
failures were the unfinished part.

## What this continuation fixed

1. **`run_visual_geometry_tests.py` — 3 failing checks.**
   `qualification-notice` now suppresses the printed instrument rule and draws
   its own reviewed continuation rules from `otherInstruments`’ `flowRegions`,
   so those rules travel with the expansion above them. The harness only knew
   about Word-flow block decorations, so a correctly moved reviewed rule was
   reported as a stray vector. The harness now also reads the field-level
   `drawUnderline` regions the layout engine actually assigned — the same
   collector `run_expansion_tests.py` already uses. The independent geometric
   checks (weight, printed measure, text sitting on the rule, descenders clear)
   are unchanged and still run over every drawn rule.

2. **`audit_regression_denominator.py` — 3 unexplained cases.**
   The shared page/table budget introduced a fourth refusal reason,
   `reserve-exceeded`, which the classifier did not know, so three fail-closed
   refusals landed in `UNEXPECTED`. `reserve-exceeded` means the owning row
   could grow but only by pushing a signature or an employee-only block off its
   reviewed place — the same class of answer as a slot with no room — so it is
   now accounted for as `physical-limit` and named separately in the reason
   text. `row-ownership` and `straddle` deliberately still fall through to
   `UNEXPECTED`: those say the map is wrong, not that the paper is full.

3. **`check_identifier_manifest.py` — 1 compatibility failure.**
   `qualification-notice/recipientAddress` moved from the registry-`unresolved`
   `field.client-postal-address` to the composed adapter target
   `umi.address.registration`, which is what makes the recipient block render
   one validated formatted address instead of raw components. That is a
   deliberate, reviewed source change, so the compatibility floor was
   regenerated with `--write`. The regenerated manifest differs in exactly
   three rows: that source, and the two new `transferBasisDepository*` fields.

4. **Review-pack fingerprint and four stale “pending” claims** in
   `VISUAL_QA_CHECKLIST.md`, `document-digitization-inventory.md`,
   `document-pdf-generation.md`, `document-text-layout-audit.md` and
   `document-template-builder.md`.

## Canonical QA

```
python static-uikit/tools/qa/run_all_qa.py
```

**27 of 27 suites passed** in the combined run (280 s), with no isolated
reruns. Regression denominator: 234 cases — 187 rendered, 25 physical limits,
19 not applicable, 3 branches the profile did not select, **0 unexpected**.
Smallest drawn client value: 9 pt. Release-blocking fields covered: 10/10.

The one sub-9 pt figure the structural suite prints (8.04 pt) is a reviewed
source-typography size, not a client value: text below the floor passes only
when it matches a size the source page itself locks, and
`audit_ordinary_equality.py` reports the smallest *client* value as 9 pt.

## Review pack

`static-uikit/manual-smoke/manual-findings-fix/` — regenerate with:

```
python static-uikit/tools/qa/build_final_review_pack.py
```

24 PDFs, 24 fixture JSON files, 73 full-page images, 84 close-ups, 6 documents,
24 scenarios, 0 generation failures, all 115 checklist items deliberately
unchecked. Rebuilding from the same tree reproduces `review.json` byte for
byte; its SHA-256 is
`a530978bf2cf59a59a5b96a131f9b90d1a424701c9fcdd28a217fa938fec33bb`.
Synthetic data only. Neither Word nor LibreOffice is invoked.

## Commits in this continuation

Each is additive; none rewrites history.

1. Add reviewed source-path suppression and table-cell ownership to the engine
2. Bind the depository agreement number and date to required operator input
3. Fix the qualification-notice recipient, body, date and instrument layout
4. Give every questionnaire table value one owning row
5. Synchronize the Template Builder with the corrected layout semantics
6. Complete the review pack, canonical QA and documentation

The previous agent left the whole implementation as one interdependent working
tree, so these six commits are layered slices of it rather than six
independently developed changes: the engine first, then the maps that declare
the new features, then the builder that round-trips them, then the runner and
the documentation. The canonical suite is verified green on the assembled
tree; the per-phase suites named below all pass in that same combined run.

| Commit | Focused suites |
| --- | --- |
| 1 | page expansion, table-cell expansion, structural PDF, reviewed operator ranges |
| 2 | UMI registry (+ self-test, incl. depository gates), Document Wizard, accession blocks (+ self-test) |
| 3 | qualification notice layout, page expansion, visual geometry, expansion anchors, Word-flow static equivalence |
| 4 | questionnaire table ownership, table-cell expansion, visual reading flow, document regression, regression denominator |
| 5 | Template Builder QA, identifier manifest |
| 6 | full canonical `run_all_qa.py` |

## Remaining work

Automated work is finished. What remains is not a code task:

- [ ] A person opens `static-uikit/manual-smoke/manual-findings-fix/index.html`
      at high zoom and signs off the 115 items in its `CHECKLIST.md` and the
      matching section of `docs/VISUAL_QA_CHECKLIST.md`.

Known limitations that are deliberate and must stay visible during that review:

- The depository agreement number and date are **operator inputs**, not UMI
  fields. The workbook has no printable pair: `id_depo_dogovora_lk` is an
  internal LK object ID and `depozitarnyj_dogovor` is a checkbox. Both inputs
  are required and validated for the three documents that print them, are never
  defaulted to today, and block generation when absent.
- `order-forms` stays `blocked-incomplete-mapping` and is not offered. See
  `docs/order-forms-mapping-gap.md`.
- Three regression cases refuse to render because the reviewed page reserve is
  spent, not because a value is wrong. They are pinned by name in
  `run_table_ownership_tests.py` so a silent “pass” cannot replace them.

## Exact next command

```
python static-uikit/tools/qa/run_all_qa.py
```

Then open the review pack. Nothing else is queued.
