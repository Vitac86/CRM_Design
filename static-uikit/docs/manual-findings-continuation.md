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
| Manual-findings correction closed at | `2b7db0f` — review pack, canonical QA and documentation |
| Second pass closed at | `b54d381` — both corrected findings shown in the review pack |

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

As built for this first pass: 24 PDFs, 24 fixture JSON files, 73 full-page
images, 84 close-ups, 6 documents, 24 scenarios, 0 generation failures, all 115
checklist items deliberately unchecked, `review.json` SHA-256
`a530978bf2cf59a59a5b96a131f9b90d1a424701c9fcdd28a217fa938fec33bb`. **Superseded
by the second pass below**, which rebuilds the same directory with three more
documents; those numbers are kept only as the record of what was reviewed when.
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
- `order-forms` was `blocked-incomplete-mapping` when this pass was written
  and is now offered: the values that a mistake would make expensive come from
  closed option lists or from the instrument reference data, the branch a
  manager did not fill cannot reach the paper, and every branch is driven
  through the real page by `tools/qa/run_order_forms_tests.py`. See
  `docs/order-forms-mapping-gap.md` for the rows still waiting for an exact UMI
  source — the payout bank block above all.
- Three regression cases refuse to render because the reviewed page reserve is
  spent, not because a value is wrong. They are pinned by name in
  `run_table_ownership_tests.py` so a silent “pass” cannot replace them.

## Second pass — two remaining manual-review findings

Started from `2b7db0f` with a clean tree. Two findings, both closed.

### 1. The depository paragraph sat under a 51 pt gap

Manual review rejected item 2 of «Основание для перевода» on page 2 of the
account-opening notice: the depository-agreement sentence read as a detached
block rather than the next item of the list.

The leading was never wrong — every step *inside* the paragraph measured the
source's own 12.96 pt. `account-opening-transfer-basis` replaces a reviewed
span nested two operator levels deep inside one top-level `q…Q` block, because
Word exported items 2 and 3 that way, so suppression leaves its marker inside
that parent. When a payment-purpose row inserted higher up the page moved the
parent, `shiftPageContent` wrapped it in `q 1 0 0 1 0 -delta cm … Q` and the
replacement inserted at the marker inherited that translation — while
`drawWordFlowBlock` had already added the same page shift to its own baselines.
The paragraph was drawn one whole shift too low: 37.80 pt, which turned the
13.35 pt step out of item 1 into 51.15 pt.

`Expander.graphicsStateAt` now reads the graphics state in force at each marker
and `replaceReviewedRangeContents` cancels its translation, so a replacement is
placed in page space whatever the shift did around it. Where nothing moved the
parent the state is the identity and no wrapper is emitted, so no other
document's bytes change; a rotated or scaled state is refused rather than
approximated.

Measured after the fix, with three rows inserted above: item 1 → item 2 =
13.35 pt, item 2 line 1 → line 2 = 12.96 pt, line 2 → item 3 = 12.96 pt, and
82.20 pt of clearance before the signature line.

`run_transfer_basis_paragraph_tests.py` covers ordinary, long and the longest
reference the whole document accepts, each as printed and expanded, and pins
two references the form refuses. `--self-test` feeds the rejected geometry back
through the same verdict function and requires it to fail.

### 2. A real passport authority did not fit three questionnaires

Eight «кем выдан» fields exist, across five documents, enumerated from the live
maps rather than listed by hand:

| Document | Field | Source | Page | Mechanism |
| --- | --- | --- | ---: | --- |
| `accession-application-fl` | `passportIssuedBy` | `field.passportIssuedBy` | 1 | word-flow block |
| `anketa-fl` | `passportIssuedBy` | `field.client-passport-issued-by` | 1 | growable table row |
| `anketa-fl-simplified-id` | `idIssuedBy` | `field.client-passport-issued-by` | 1 | growable table row |
| `anketa-ip-sz` | `idIssuedBy` | `field.client-passport-issued-by` | 1 | growable table row |
| `client-notifications` | `passportIssuedBy` | `field.passportIssuedBy` | 9 | word-flow block |
| `power-of-attorney` | `ulAttorneyIssuedBy` | `extra.extra-attorney-issued-by` | 1 | word-flow block |
| `power-of-attorney` | `flPrincipalIssuedBy` | `field.client-passport-issued-by` | 3 | word-flow block |
| `power-of-attorney` | `flAttorneyIssuedBy` | `extra.extra-attorney-issued-by` | 3 | word-flow block |

Both `field.*` paths resolve to one exact UMI field, `umi.phys.pass_issuer`;
the attorney's issuer is the representative's own passport and is an operator
input, because the attorney is not the CRM subject.
`order-forms/securityIssuer` matches the same name shape and is the issuer of a
security, not of a passport — recorded in the suite so it is provably
considered and excluded.

Three questionnaires refused the department name a current Russian passport
carries (111 characters), each one line short. `anketa-fl-simplified-id` and
`anketa-ip-sz` had a two-line cell that could not grow at all and now open one
reviewed band; `anketa-fl` grew by one band and now grows by two, which still
fits its page's own 30.50 pt reserve. The continuation baseline is offset to
the cell's line pitch, not the row grid, so a wrapped authority keeps one
rhythm instead of stepping 15.42 pt in the middle of a sentence.

Everything else passed unchanged: the five word-flow slots took all five
authority names as they were.

### Remaining physical limit

`power-of-attorney-ul-intro` carries eleven values in one justified paragraph.
Past its third extra line the page shift moves some of the form's own printed
ruled blanks across the replacement, because those are top-level path units the
reviewed text range does not cover. Reaching it needs a single 255-character
«authority» — two full department names concatenated. Every production profile
grows the paragraph by at most one line, and that bound is pinned in
`run_passport_authority_tests.py`: if a profile ever grows it further the suite
fails, and those paths have to be suppressed the way `qualification-notice`
suppresses its own.

### Canonical QA for this pass

```
python static-uikit/tools/qa/run_all_qa.py
```

**31 of 31 suites passed** in one combined run (409 s), no isolated reruns.
Four suites are new since the first pass: the transfer-basis paragraph and its
gates, and the passport issuing authority and its gates. Regression
denominator: 0 unexpected. Smallest drawn client value: 9 pt. Values below the
floor: 0.

### Commits

1. `ae395d7` — Place a reviewed replacement in page space, not in its parent's
   shifted space
2. `7f43fa1` — Let the questionnaires print the department name a real passport
   carries
3. this pass's documentation and refreshed review pack

### Review pack

Rebuilt: 33 PDFs, 33 fixture JSON files, 118 full-page images, 103 close-ups,
9 documents, 33 scenarios, 0 generation failures, 143 manual checklist items,
all unchecked. `review.json` SHA-256
`ebbaec9731abd6428b37353348d27e1f9d0bbab616c6fa0332000a8535108ca7`.
New cards: `authority-ordinary` and `authority-long` for
`accession-application-fl`, `client-notifications` and `power-of-attorney`, and
`passport-authority-long` for each of the three corrected questionnaires. The
grown issuer row is a scenario of its own because the combined long fixtures
already spend their page's reviewed reserve on the name and bank rows.
**Superseded by the third pass below**, which rebuilds the same directory with
four more `anketa-yul` scenarios.

## Third pass — the legal entity's full firm name

Started from `b54d381` with a clean tree (`.vscode/` untracked). One finding,
closed.

### A real full firm name did not fit row 1 of the legal-entity questionnaire

Manual review showed the ordinary value fitting «Полное фирменное
наименование», and the row is exactly one printed 13.44 pt band (rules
183.02 → 196.46) holding **one** line at its reviewed 10.5 pt. Its value cell
is 222.9 pt wide, so it takes «АО «Тестовые инвестиции»» (125.70 pt) and very
little else. The full name the register carries — «Акционерное общество
«Международные инвестиционные технологии и инфраструктурные решения»» — is
463.30 pt and wraps to three lines, and the form refused it outright with
`no-space`. A `maxHeight` change could not be the answer either: the cell has
11.92 pt and two lines need 17.10 pt even at the 9 pt floor, so a taller box
would only reach into row 2.

The анкета is a table, so the answer is the mechanism row 3 already uses. Row 1
is now a growable table row cut at **196.22** — where its own vertical rules
stop, with its bottom rule just under them — with a 13.44 pt pitch and a
reviewed maximum of **two** extra bands. The rows below move down by whole
pitches, the printed bottom rule travels with them and closes the enlarged
cell, and the row's seven vertical centre-lines are continued exactly where the
printed ones stop. The continuation keeps the cell's own 0.95 leading
(`continuesParagraph`), so a wrapped name reads as one name instead of stepping
onto the row grid, and no font drops below 9 pt.

Old capacity: 1 printed line, ~42 characters. New capacity: 1 line unchanged
for short values, up to 3 lines and 658.50 pt of Cyrillic for a long one. The
longest realistic name measured as accepted is the 129-character «Публичное
акционерное общество «Межрегиональная инвестиционно-промышленная и
инфраструктурная компания технологического развития»»; both that ceiling and
the 151-character name past it are pinned in the suite.

### Scope

Every field in every map bound to `umi.company.origname` was enumerated through
the exact UMI registry — five compatibility paths
(`field.client-full-legal-name`, `field.client-full-name`,
`field.clientFullName`, `subject.displayName`, `subject.fullLegalName`) and 24
company-capable fields across 13 documents — and each was rendered with the
same five names. `anketa-yul/fullLegalName` was the only fixed, non-growable
table cell among them and the only one that refused anything: every other place
is a Word-flow block, an already growable row (`account-opening-notice`,
`broker-use-refusal-request`, `order-forms`, both refusal notices, all at two
bands), a reviewed continuation region, or an inline slot that already took all
five. The three questionnaires a natural person fills in use the same registry
paths for a ФИО, apply to individuals only, and are named in the suite so their
exclusion is proved rather than assumed. No shared configuration was changed.

### Remaining physical limit

Page 1's reviewed reserve is 33.82 pt — the 61.82 pt bottom margin less a
reviewed 28 pt print margin. Two 13.44 pt bands fit, so row 1 may take a
three-line name, or row 1 and row 3 may open one band each in the same render.
Three 13.44 pt bands (40.32 pt) do not, so a three-line company name together
with a three-line foreign name refuses the second with `reserve-exceeded`, and
a 151-character four-part holding name is refused rather than shortened.
Raising that ceiling means spending the reviewed print margin, which is a
visual-approval decision and not a code one.

### Canonical QA for this pass

```
python static-uikit/tools/qa/run_all_qa.py
```

**33 of 33 suites passed** in one combined run (423 s), no isolated reruns. Two
suites are new since the second pass: the legal-entity full name row and its
gates. Regression denominator: 234 cases — 187 rendered, 25 physical limits,
0 unexpected, unchanged from the second pass. Smallest drawn client value:
9 pt. Values below the floor: 0. No template PDF byte changed.

### Commits

1. `Allow the legal-entity full name row to grow` — the map, the focused suite,
   its place in the canonical runner, the reviewed-anchor inventories, the
   review-pack scenarios and this documentation.

### Review pack

Rebuilt: 37 PDFs, 37 fixture JSON files, 138 full-page images, 127 close-ups,
9 documents, 37 scenarios, 0 generation failures, 171 manual checklist items,
all unchecked. `review.json` SHA-256
`e41b540cd1ef5e5c1b7f5da36434cf6e29516bb7625b60e74d6c6f76b109a404`.
New cards for `anketa-yul`: `legal-name-short`, `legal-name-long-ru`,
`legal-name-long-foreign` and `legal-name-with-foreign-row`, plus a new
`full-legal-name` close-up on every `anketa-yul` card and a taller `names` crop
so the grown block stays inside it. Row 1 is a set of scenarios of its own
because the generic long fixtures spend page 1's reserve on the registration
rows, where a long company name would only prove that the budget refuses.

## Exact next command

```
python static-uikit/tools/qa/run_all_qa.py
```

Then open the review pack. Nothing else is queued.
