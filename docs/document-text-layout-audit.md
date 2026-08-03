# Text-layout audit — 18 production maps, 621 fields

Measured against the committed base templates, with the production layout engine
and the real embedded font.

Reproduce with:

```bash
python static-uikit/tools/qa/dump_field_maps.py --out static-uikit/tools/qa/maps.json
python static-uikit/tools/qa/measure_field_room.py --maps static-uikit/tools/qa/maps.json
python static-uikit/tools/qa/measure_page_layout.py
python static-uikit/tools/qa/run_document_regression.py
python static-uikit/tools/qa/audit_ordinary_failures.py
python static-uikit/tools/qa/check_full_template_audit.py
```

The complete, generated audit is [document-full-template-audit.md](document-full-template-audit.md).
Its machine-readable companion, `static-uikit/tools/qa/document-full-template-audit.json`,
covers all 22 committed PDFs, all 77 pages, every extracted source-PDF text line,
and every current field. The original 621 field ID/source pairs are an immutable
compatibility floor; additive fields are reported and classified separately.

## 1. Scope

| | Count |
| --- | --- |
| Documents (field maps) | 18 |
| Fields total | 621 |
| Dynamic text fields | 397 |
| Checkbox fields | 224 |
| Single-line text fields | 321 |
| Multiline text fields | 76 |
| Fields with safe formatter fallbacks | 21 |

## 2. Before: every dynamic field could render unreadably

| Minimum font size | Fields |
| --- | --- |
| 4.5 pt | 1 |
| 4.8 pt | 1 |
| 5.2 pt | 1 |
| 5.5 pt | 4 |
| 6.0 pt | 380 |
| 6.5 pt | 3 |
| 7.0 pt | 7 |

**All 397 dynamic text fields permitted rendering below 9 pt.** 34 of them also
had a *preferred* size below 9 pt. That is the failure the business decision
targets: a valid client value was reduced to an unreadable size, or the document
simply refused to generate and the manager had no way forward.

## 3. After: measured sizes, hard floor

Minimum font size is now **9 pt on all 397 fields**. Preferred sizes were chosen
per field from the room measured in the authoritative PDF — never by a blanket
replacement:

| Preferred size | Fields |
| --- | --- |
| 12 pt | 152 |
| 11.5 pt | 6 |
| 11 pt | 150 |
| 10.5 pt | 24 |
| 10 pt | 38 |
| 9.5 pt | 7 |
| 9 pt | 20 |

Nothing below 9 pt. The rule applied to each field was:

```
room      = min(clearance_above / ascent, clearance_below / descent)
preferred = max( largest of [12, 11.5, 11, 10.5, 10, 9.5, 9] that fits room,
                 the size the document already used in production,
                 9 )
            capped at 12
```

Never dropping below the size already in production matters: those sizes are
proven on paper, and the measurement is conservative (it uses the font's
typographic ascent, not its cap height).

### Documents that keep a smaller preferred size, and why

| Document | Preferred | Reason (measured) |
| --- | --- | --- |
| `anketa-fl`, `anketa-fl-simplified-id`, `anketa-ip-sz`, `anketa-yul` | 11 pt | table rows hold 11.25 pt |
| `order-forms` | 10 pt | order-table rows hold 10 pt |
| `qualification-consequences-notice` | 11 pt | body rows hold 11 pt |
| the other 13 documents | 12 pt | the form has the room |

A further **92 individual rows** carry a measured exception below their
document's preferred size. Each records its measurement in a comment beside the
value, in a `ROW_SIZE` table or as a named constant.

## 4. A cell may only use the room it has

A multiline cell is bounded by `maxHeight`, measured with
`measure_field_room.py` as the clear space beneath its baseline inside its own
horizontal band. A cell with no bound is not generous — it is unbounded, and a
long value runs straight through whatever the form prints below it.

Two maps built their fields from a named list of properties that omitted
`maxHeight`, so six cells were unbounded and four of them really did overprint:

| Field | Clear space | Lines at 9 pt |
| --- | --- | --- |
| `power-of-attorney/ulAttorneyIssuedBy` | 8.71 pt | 1 |
| `power-of-attorney/ulAttorneyAddress` | 8.71 pt | 1 |
| `power-of-attorney/flPrincipalAddress` | 8.71 pt | 1 |
| `power-of-attorney/flAttorneyIssuedBy` | 8.71 pt | 1 |
| `power-of-attorney/flPrincipalIssuedBy` | 26.83 pt | 3 |
| `power-of-attorney/flAttorneyAddress` | 26.74 pt | 3 |
| `qualification-notice/recipientAddress` | 36.97 pt | 4 |

`run_visual_geometry_tests.py` now fails if any drawn glyph covers a printed one.

## 5. Where a document grows a row

A value that does not fit its printed blank is not necessarily unprintable: a
page has vertical reserve even when its body has no blank band, and the
generated document can grow a row the way Word would have. Thirty-three anchors,
four compaction zones and three cross-page transfers do so. All 43 source,
target, anchor and compaction boundaries are verified to sit on a clean operator
cut with `check_expansion_anchors.py`.

### The budget belongs to the page

A page has one amount of room, not one per field. `template.pageLayout[n]`
states it once, measured with `measure_page_layout.py`:

```
bottomCapacity = fixedFooterFrom - bottomClearance - bodyBottom
recoverable    = sum over compaction zones of (originalGap - minGap)
budget         = bottomCapacity + recoverable
```

For an approved cross-page rule, the page can additionally recover the band
between `retainedBodyBottom` and `bodyBottom`. That capacity is available only
after bottom reserve and reviewed compaction are exhausted, and only when the
whole declared source block can be transferred to the immediately following
page.

Every active anchor draws on that budget in top-to-bottom order, so capacity an
anchor does not need is left to the ones below it. Only the scenario being
printed spends anything: a field switched off by `showWhen`, an empty optional
value and a missing required value all cost zero. Compaction is applied lazily
and only as far as the rows actually need, so a document that expands by nothing
is the form exactly as printed.

The fixed footer never moves. `shiftToTop` is bounded by the page's measured
`fixedFooterFrom`, and a configuration that reaches it is refused.

| Page | Budget | Bottom | Recoverable white space |
| --- | --- | --- | --- |
| `power-of-attorney` p1 (ЮЛ) | 61.36 | 27.01 | top margin 2.25→1.5 cm (21.35) + two header gaps (13.00) |
| `power-of-attorney` p3 (ФЛ) | 44.42 | 29.79 | top margin 2.0→1.5 cm (14.63) |
| `qualification-notice` p1 | 230.88 | 230.88 | — |
| `qualification-consequences-notice` p1 | 199.53 | 199.53 | — |
| `order-forms` p1 | 43.28 | 43.28 | — |
| `anketa-fl` p2 | 34.34 | 34.34 | — |

### Rows are the form's own, not a standard 14 pt

Measured per document with `measure_page_layout.py --row`:

| Document | Body | Pitch | Ink | Rule below baseline | Weight | Generated row |
| --- | --- | --- | --- | --- | --- | --- |
| `power-of-attorney` | 10.56 pt | 18.12 | 11.69 | 1.20 | 0.48 | 12.0 (ЮЛ) / 11.0 (ФЛ) |
| `qualification-notice` | 9.96 pt | 11.52 | 11.03 | 1.08 | 0.48 | 11.5 |
| `qualification-consequences-notice` | 9.96 pt | 11.52 | 11.03 | 1.08 | 0.48 | 11.5 |
| `anketa-fl` p2 (table) | 9.48 pt | 13.44 | 10.50 | border | 0.48 | 13.44 |
| `order-forms` p1 (table) | 9.00 pt | 20.40 | 9.96 | border | 0.48 | 20.40 |

The ФЛ доверенность uses an 11.0 pt row carrying 9.5 pt text rather than the
12.0 pt row of its own body: that page needs a fourth row and 44.42 pt is what
it has. The text stays well above the 9 pt floor.

### Every anchor

| Document | Field | Page | Anchor | Max rows × height | Style |
| --- | --- | --- | --- | --- | --- |
| `qualification-notice` | `recipientName` | 1 | 181.20 | 2 × 11.5 | underline |
| `qualification-notice` | `clientName` | 1 | 297.60 | 2 × 11.5 | underline |
| `qualification-notice` | `registerEntryOrgName` | 1 | 484.95 | 2 × 11.5 | underline |
| `qualification-consequences-notice` | `applicantFullName` | 1 | 210.49 | 2 × 11.5 | underline |
| `accession-application-fl` | `clientFullName` | 1 | 101.70 | 1 × 10.5 | underline |
| `anketa-fl` | `passportIssuedBy` | 1 | 503.59 | 1 × 13.44 | table-row |
| `anketa-yul` | `licenceAuthority` | 3 | 193.94 | 1 × 17.4 | table-row |
| `client-notifications` | `clientFullName` | 9 | 280.00 | 1 × 12.5 | underline |
| `client-notifications` | `passportIssuedBy` | 9 | 302.00 | 1 × 12.5 | underline |
| `client-notifications` | `registrationAddress` | 9 | 339.10 | 1 × 14 | underline |
| `code-word-request` | `clientFullName` | 1 | 238.75 | 1 × 13 | underline |
| `broker-use-refusal-request` | `clientName` | 1 | 196.46 | 2 × 14 | underline |
| `regulation-full-refusal-notice` | `clientName` | 1 | 203.30 | 2 × 14 | underline |
| `regulation-partial-refusal-notice` | `clientName` | 1 | 183.14 | 2 × 14 | underline |
| `account-opening-notice` | `clientName` | 1 | 279.65 | 2 × 14 | underline |
| `qualification-request-fl` | `quarterlyTransactionsValueMillions` | 1 | 679.53 | 1 × 14 | underline |
| `anketa-yul` | `bankAddress` | 3 | 289.00 | 2 × 16.92 | table-row |
| `anketa-fl` | `bankAddress` | 2 | 318.65 | 2 × 13.44 | table-row |
| `order-forms` | `tradeClientName` | 1 | 228.02 | 2 × 20.40 | table-row |
| `power-of-attorney` | `ulOgrn` | 1 | 159.74 | 1 × 12 | underline |
| `power-of-attorney` | `ulInn` | 1 | 159.74 | 1 × 12 | underline |
| `power-of-attorney` | `ulCity` | 1 | 135.30 | 1 × 12 | underline |
| `power-of-attorney` | `ulExecutiveName` | 1 | 196.00 | 1 × 12 | underline |
| `power-of-attorney` | `ulAttorneyName` | 1 | 232.00 | 1 × 12 | underline |
| `power-of-attorney` | `ulAttorneyCitizenship` | 1 | 232.00 | 1 × 12 | underline |
| `power-of-attorney` | `ulAttorneyIssuedBy` | 1 | 250.49 | 1 × 12 | underline |
| `power-of-attorney` | `ulAttorneyAddress` | 1 | 268.61 | 1 × 12 | underline |
| `power-of-attorney` | `flPrincipalCitizenship` | 3 | 128.66 | 1 × 11 | underline |
| `power-of-attorney` | `flPrincipalIssuedBy` | 3 | 146.78 | 1 × 11 | underline |
| `power-of-attorney` | `flPrincipalAddress` | 3 | 183.14 | 1 × 11 | underline |
| `power-of-attorney` | `flAttorneyCitizenship` | 3 | 219.00 | 1 × 11 | underline |
| `power-of-attorney` | `flAttorneyIssuedBy` | 3 | 219.00 | 1 × 11 | underline |
| `power-of-attorney` | `flAttorneyIssueDate` | 3 | 237.38 | 1 × 11 | underline |

Each generated row is a baseline plus a visible rule, drawn as ordinary vector
page content at the weight the form uses on that page. No rule is drawn where no
text landed, so a short value leaves the form exactly as printed.

### Anchors deliberately not configured

The printed name in the signature block of
`broker-use-refusal-request`, `regulation-full-refusal-notice` and
`regulation-partial-refusal-notice` sits inside one drawing block together with
the signature rule and the caption; nothing within 50 pt below it leaves every
block wholly on one side.

All five other candidates an earlier phase recorded as impossible are now
configured. `qualification-notice/registerEntryOrgName` and
`qualification-consequences-notice/applicantFullName` needed the probe to use
the real movable band. `power-of-attorney/ulCity`,
`code-word-request/clientFullName` and
`accession-application-fl/clientFullName` use the nearest complete cut that
keeps the label and its own printed answer together. The exact cuts are part of
the 43-boundary check above.

## 5a. Power of attorney

This document carries a доверенность from a legal entity on pages 1–2 and one
from an individual on pages 3–4 of the same file, and it is the tightest form in
the set. Four separate things were wrong with it.

**It paid for the variant it was not printing.** Every generated доверенность
moved 28 pt of the other variant's pages for nothing, and spent reserve the
printed variant needed, because a field switched off by `showWhen` was asking
for rows. Fixed in the engine, not in the map.

**Its page numbers moved.** The movable band ran past the footer, so an expanded
доверенность carried its page number 28 pt down the sheet.

**Four of its cells had no height** — see §4.

**Two printed rules were unmapped.** «…действующего на основании ___» and
«уполномочивает гр. ___» both wrap in the source: the blank ends one line and
continues at the start of the next before the sentence resumes. The map declared
only the second rule of each pair, reporting 96 pt and 107 pt of room where the
form gives 138.86 pt and 206.36 pt.

Ordinary-value result, by subject:

| Subject | Rows needed | Budget | Result |
| --- | --- | --- | --- |
| Russian legal entity | 4 × 12 = 48 | 61.36 | passes |
| Foreign legal entity | 5 × 12 = 60 | 61.36 | passes |
| Russian individual | 4 × 11 = 44 | 44.42 | passes |
| Foreign individual | 6 × 11 = 66 | 44.42 + 36.24 cross-page | **passes** |

## 5b. Reviewed cross-page flow

A доверенность given by a **foreign individual** needs six continuation rows on
page 3: citizenship for the principal and for the attorney, both issuing
authorities, the registration address and the date of issue. The page has
44.42 pt — 29.79 pt above its page number plus 14.63 pt of top margin taken down
to 1.5 cm — which is four rows of 11 pt.

The approved solution uses the existing source wording and page count. A
complete balanced block containing the final two lines of an enumerated power is
removed from page 3's content stream and inserted before its continuation on
page 4. The existing page-4 content moves down 36.24 pt, freeing the remaining
two rows on page 3. Page 4 has ample measured reserve.

The legal-entity half has a second reviewed rule: when a realistic-long company
scenario exhausts page 1, the final complete ten-line power moves to page 2 and
the existing page-2 body moves 181.20 pt. Client notifications has the third
rule, moving its final complete page-9 paragraph to page 10 and shifting the
existing target body 53.76 pt.

Each rule names an explicit source band, retained body bottom, target insertion,
target movable band, exact shift, one-page cascade limit and approval status.
Production and the Builder reject missing, unreviewed or multi-page cascades.
Source/target resources are merged only when same-named resources refer to the
same object. The original operator bytes are transferred exactly once; they are
not copied, clipped into bands, rasterised or reconstructed.

## 6. Structural QA of generated PDFs

234 document × profile combinations, 177 rendered:

| Check | Result |
| --- | --- |
| Structural problems | **0** |
| Smallest dynamic font size in any output | **9.0 pt** |
| Clipping (text outside its page) | none |
| Appended pages | none |
| Page count matches the map | all |
| AcroForm fields | 0 |
| Widget annotations | 0 |
| Base template vector rules lost | 0 |
| Cyrillic / Latin extractable | yes, both |

`run_structural_pdf_tests.py` checks every document as printed and fully
expanded, with pymupdf and pypdf together: every original show-text
operator survives exactly once document-wide, no original operator is lost, the
added `q … cm … Q` wrappers remain balanced, the static text is complete under
both parsers, and nothing is rasterised. Document-wide ownership is intentional
for the three cross-page rules; the same original operator never remains on both
pages.

`run_visual_geometry_tests.py` checks what a generated row looks like — weight,
measure, the text sitting on the rule with its descenders clear, one pitch per
anchor, no rule without text, inserted verticals on printed columns, no printed
glyph covered, and an explicitly activated cross-page case.

Per-suite check counts are not quoted anywhere in this file. They move with
every change, and a number that has to be edited by hand to stay true will not
be; `python static-uikit/tools/qa/run_all_qa.py` prints the current ones.

## 7. Overflow by profile class

| Class | Fields | Release gate |
| --- | --- | --- |
| ordinary | **0** | pass |
| realistic-long only | **0** for supported subject variants and configured realistic fields | pass |
| stress only | 23 | not a gate |
| only in a subject the document does not apply to | 2 | not a gate |

The release rerun resolves the earlier long-name, company-name, address, city
and issuing-authority failures through the measured anchors listed above. The
three short printed-name signature slots use their existing initials/surname
fallbacks; deliberately oversized double-surname fixtures remain stress tests,
not realistic-long fields.

### Stress-only

23 fields fail only in the deliberately maximal profiles — 62-character e-mail
addresses, 47-character contract numbers and 75-character synthetic sentences in
free-text cells. They are not a release gate, and no artificial input limit has
been imposed on exact legal values to make them pass.

## 8. Print overrides

**None configured.** No production field sets `allowPrintOverride`. The
mechanism exists and is covered by the wizard tests, but every remaining
overflow sits on a name, an identifier or an address, none of which an operator
may abbreviate.
