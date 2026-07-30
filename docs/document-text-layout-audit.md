# Text-layout audit — 18 production maps, 621 fields

Measured on 2026-07-30 against the committed base templates, with the
production layout engine and the real embedded font.

Reproduce with:

```bash
python static-uikit/tools/qa/dump_field_maps.py --out maps.json
python static-uikit/tools/qa/measure_field_room.py --maps maps.json
python static-uikit/tools/qa/run_document_regression.py
```

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

Vertical room per field, measured from the committed templates:

| Room available | Fields |
| --- | --- |
| ≥ 12 pt | 152 |
| 11–12 pt | 169 |
| 10–11 pt | 45 |
| 9–10 pt | 21 |
| < 9 pt | 10 |

### Documents that keep a smaller preferred size, and why

| Document | Preferred | Reason (measured) |
| --- | --- | --- |
| `anketa-fl`, `anketa-fl-simplified-id`, `anketa-ip-sz`, `anketa-yul` | 11 pt | table rows hold 11.25 pt |
| `order-forms` | 10 pt | order-table rows hold 10 pt |
| `qualification-consequences-notice` | 11 pt | body rows hold 11 pt |
| the other 13 documents | 12 pt | the form has the room |

A further **92 individual rows** carry a measured exception below their
document's preferred size. Each records its measurement in a comment beside the
value, in a `ROW_SIZE` table or as a named constant. The tightest:

| Field | Room | Preferred | Note |
| --- | --- | --- | --- |
| `order-forms/securityPrice` | 0.76 pt | 10 pt | kept at the size already in production |
| `accession-application-yul/tariffDerivatives` | 7.60 pt | 9 pt | policy floor |
| `accession-application-fl/tariffStock`, `tariffDerivatives`, `tariffCurrency` | 8.89 pt | 9 pt | policy floor |
| `accession-application-yul/companyOgrn`, `companyLegalAddress` | 8.98 pt | 9 pt | policy floor |

Ten rows have less than 9 pt of measured room and are printed at 9 pt anyway,
because the floor is absolute. They are the rows listed above.

## 4. Capacity added

| Change | Where |
| --- | --- |
| Value cells use their whole measured box | all four анкеты — 160 cells |
| Fixed-height cells derive leading from the size | 23 fields across 8 documents |
| Reviewed Word-like continuation lines | 6 (below) |
| Safe formatter fallback added | `accession-application-fl/passportIssueMonthYear` |

### Generated continuation lines

Each is a baseline plus a visible rule, drawn as ordinary vector page content
and matching the form's own underlines — 0.36 pt thick, 1.5 pt below the
baseline, measured at 1200 dpi from the printed rules on the same page.

| Document | Field | Page | Baseline | Left | Width | Thickness | Max size | Reference underline | Review |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `accession-application-fl` | `registrationAddress` | 0 | 148.70 | 56.6 | 501.0 | 0.36 | 9.5 | identity paragraph rules, p0 | approved |
| `accession-application-fl` | `passportIssuedBy` | 0 | 157.70 | 56.6 | 501.0 | 0.36 | 9.5 | identity paragraph rules, p0 | approved |
| `accession-application-fl` | `signatureName` | 1 | 778.00 | 400.3 | 46.7 | 0.36 | 9.5 | signature parentheses, p1 | approved |
| `accession-application-fl` | `tariffStock` | 0 | 481.00 | 437.7 | 119.9 | 0.36 | 9.5 | tariff column rules, p0 | approved |
| `accession-application-fl` | `tariffDerivatives` | 0 | 520.60 | 437.7 | 119.9 | 0.36 | 9 | tariff column rules, p0 | approved |
| `accession-application-fl` | `tariffCurrency` | 0 | 541.50 | 437.7 | 119.9 | 0.36 | 9.5 | tariff column rules, p0 | approved |

Blank bands they occupy, from `measure_field_room.py --gaps`: 140.22–159.95
(identity paragraph), 472.19–502.75 / 512.99–522.79 / 533.03–545.00 (tariff
column), 773.31–800.00 (below the signature block).

Verified against the base template: **no vector rule is added when a
continuation region receives no text**, so a short value leaves the form exactly
as printed.

## 5. Structural QA of generated PDFs

234 document × profile combinations, 137 rendered:

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
| Cyrillic extractable | 126/137 (the rest are Latin-only profiles) |
| Latin extractable | 125/137 |
| Vector rules added (reviewed continuation lines) | 706 |

## 5a. Reclassification after dynamic page expansion

The first pass of this audit assumed that a value which does not fit needs
either an existing blank line or nothing at all, and concluded that several
documents — power-of-attorney above all — were blocked. That conclusion was
withdrawn: pages have vertical reserve even when their bodies have no blank
band, and a document can grow a row.

Every remaining case was re-examined against six questions: is the mapped width
wrong; is the test value realistic; is the field naturally expandable; is it an
exact short identifier that should fit once mapped correctly; does the page have
reserve; and would shifting the lower section preserve the legal structure.

| Classification | Fields | Notes |
| --- | --- | --- |
| Mapping correction | 0 | `measure_slot_widths.py` found no field mapped materially narrower than its printed blank. The maps sit 2–4 pt inside each rule, which is the correct inset. |
| Normal wrapping / existing continuation space | — | already solved in the previous phase (анкета cells, Appendix 1A continuation lines) |
| Dynamic layout expansion | 13 | see below |
| Fixture defect, not a layout problem | 3 | a "long" city was a 17-character sentence, likewise an authority basis and a security issuer |
| Extreme stress only | 41 | fails only in the deliberately maximal profiles |
| Genuine source limitation | 7 | fails with ordinary values and the page has no room left |

### Fields given dynamic layout expansion

All thirteen are names, addresses or exact values that the form's own blanks
cannot hold. Every anchor was verified to sit on a clean cut with
`check_expansion_anchors.py`.

| Document | Field | Page | Anchor | Rows × height | Reserve | Style |
| --- | --- | --- | --- | --- | --- | --- |
| `qualification-notice` | `recipientName` | 1 | 181.20 | 2 × 14 | 250.0 | underline |
| `qualification-notice` | `clientName` | 1 | 297.60 | 2 × 14 | 250.0 | underline |
| `client-notifications` | `registrationAddress` | 9 | 339.10 | 1 × 14 | 17.86 | underline |
| `broker-use-refusal-request` | `clientName` | 1 | 196.46 | 2 × 14 | 323.87 | underline |
| `regulation-full-refusal-notice` | `clientName` | 1 | 203.30 | 2 × 14 | 259.79 | underline |
| `regulation-partial-refusal-notice` | `clientName` | 1 | 183.14 | 2 × 14 | 122.24 | underline |
| `account-opening-notice` | `clientName` | 1 | 279.65 | 2 × 14 | 32.48 | underline |
| `qualification-request-fl` | `quarterlyTransactionsValueMillions` | 1 | 679.53 | 1 × 14 | 113.86 | underline |
| `anketa-yul` | `bankAddress` | 3 | 289.00 | 2 × 16.92 | 70.9 | table-row |
| `power-of-attorney` | `ulOgrn` | 1 | 159.74 | 1 × 14 | 37.05 | underline |
| `power-of-attorney` | `ulInn` | 1 | 159.74 | 1 × 14 | 37.05 | underline |
| `power-of-attorney` | `flPrincipalCitizenship` | 3 | 128.66 | 1 × 14 | 32.13 | underline |
| `power-of-attorney` | `flAttorneyIssueDate` | 3 | 237.38 | 1 × 14 | 32.13 | underline |

### Anchors that had to be dropped

Six fields were given an expansion that the page could not honour: no insertion
point within ±30 pt leaves every drawing block wholly on one side, so the
content cannot be split there at all. They keep their previous behaviour and
appear in the limitations below.

`broker-use-refusal-request/clientPrintedName`, `code-word-request/clientFullName`,
`qualification-consequences-notice/applicantFullName`,
`qualification-notice/registerEntryOrgName`,
`regulation-full-refusal-notice/clientPrintedName`,
`regulation-partial-refusal-notice/clientPrintedName`.

### Expansion capacity of every page

Measured as the free space beneath the lowest content. Every one of the 77
template pages has room for at least one 14 pt row; the tightest are
`client-notifications` page 6 (18.98 pt) and page 9 (21.86 pt), and
`power-of-attorney` pages 1–4 (36–41 pt, two rows each). Several pages have
100 pt or more.

## 5b. Power-of-attorney: withdrawn conclusion

The previous audit recorded this document as not production-ready and needing a
revised Word source. That was wrong on one point of fact: it looked for blank
bands **inside the body** and found none, and stopped there. The pages have
36–41 pt of unused space at the foot, which is two inserted rows each.

Re-checked in order:

* **Is the map correct?** Yes. The printed blanks really are 27.48 pt for a
  10-digit ИНН, 54.36 pt for a 13-digit ОГРН, 20.40 pt for «Россия» and
  37.44 pt for a date. The map is 2–4 pt inside each rule — the correct inset.
* **Can the text start earlier or use the whole blank?** No; the blanks are
  bounded by printed text on both sides.
* **Does a formatter add characters?** No.
* **Is there page reserve?** Yes — and that is the answer.

Each of the four fields that failed on ordinary values now takes one inserted
row. The short printed slot stays blank and the complete exact value prints
unbroken on the ruled row immediately below its label, keeping it attached to
the label it belongs to.

Power-of-attorney ordinary-value failures: **12 → 4**. It stays in the registry.
The four that remain (`ulAuthorityBasis`, `ulAttorneyName`, `ulAttorneyCitizenship`,
`flAttorneyCitizenship`) sit on pages whose two rows are already committed to the
ИНН, ОГРН, citizenship and date above.

## 6. Remaining source-layout limitations

61 fields still cannot print their longest supported value at 9 pt. These are
**not** silent failures: the wizard names the field, the value length, the
available lines and the reason, and refuses to emit a document rather than
printing something unreadable.

For 43 of them the problem appears only in the deliberately extreme "long"
profiles. **18 field/value combinations fail with ordinary values**, and 12 of
those are in one document.

### `power-of-attorney` — the source form needs wider blanks

This is the significant finding. The ФЛ and ЮЛ доверенность are dense justified
prose with inline blanks of 18–51 pt and 18.1 pt line spacing. There is **no
blank band anywhere in the body** — `measure_field_room.py --gaps` over the full
page height returns only the header gaps and the bottom margin — so there is
nowhere to place a reviewed continuation line, and priority 3 of the
continuation policy does not apply.

Fields that cannot hold ordinary values at 9 pt:

| Field | Slot | Ordinary value that does not fit |
| --- | --- | --- |
| `flPrincipalCitizenship` | 18.5 pt | «Россия» (6 characters) |
| `ulInn` | 27.2 pt | a 10-digit ИНН |
| `ulOgrn` | 51.0 pt | a 13-digit ОГРН |
| `flAttorneyIssueDate` | 35.5 pt | a 10-character date |
| `ulCity`, `ulAuthorityBasis`, `ulAttorneyName`, `ulExecutiveName`, `flAttorneyCitizenship`, `ulAttorneyCitizenship` | 17–47 pt | ordinary names, cities and grounds |

Before this change these were drawn at 4.5–5.5 pt, which is precisely the
unreadable output the business decision rejects. **Under the 9 pt policy this
document is not production-ready**: the source Word form needs wider blanks and
the base template must be regenerated.

That regeneration is blocked for an unrelated reason — Word's PDF export hangs
on this workstation, so `tools/docx-to-pdf.ps1` cannot rebuild any base template
here. See the Office export issue before planning this work.

### Everything else — long-profile-only limitations

The tables below list every remaining field. "Ordinary values too = yes" marks
the ones that fail in day-to-day use rather than only under the extreme
fixtures; those are the ones worth widening a form for.

* **no space left** — the value needs more lines than the form provides at 9 pt.
* **unbreakable token** — one word is wider than every approved line and has no
  separator to break at. Splitting it would mean inventing hyphenation.

#### `accession-application-fl`

| Field | Longest value | Lines | Regions | Reason | Ordinary values too |
| --- | --- | --- | --- | --- | --- |
| `clientEmail` | 62 chars | 1 | 1 | no space left | no |
| `clientFullName` | 89 chars | 1 | 1 | no space left | no |
| `signatureName` | 26 chars | 2 | 2 | unbreakable token | no |

#### `accession-application-yul`

| Field | Longest value | Lines | Regions | Reason | Ordinary values too |
| --- | --- | --- | --- | --- | --- |
| `clientEmail` | 62 chars | 1 | 1 | no space left | no |

#### `account-opening-notice`

| Field | Longest value | Lines | Regions | Reason | Ordinary values too |
| --- | --- | --- | --- | --- | --- |
| `clientName` | 89 chars | 1 | 1 | no space left | no |
| `paymentPurposeCurrency` | 27 chars | 1 | 1 | no space left | no |
| `paymentPurposeDerivatives` | 27 chars | 1 | 1 | no space left | no |
| `paymentPurposeStock` | 27 chars | 1 | 1 | no space left | no |

#### `anketa-fl`

| Field | Longest value | Lines | Regions | Reason | Ordinary values too |
| --- | --- | --- | --- | --- | --- |
| `bankAddress` | 65 chars | 1 | 1 | no space left | **yes** |
| `birthPlace` | 65 chars | 1 | 1 | no space left | **yes** |
| `fullName` | 89 chars | 1 | 1 | no space left | no |
| `otherInformation` | 75 chars | 1 | 1 | no space left | no |
| `passportIssuedBy` | 79 chars | 1 | 1 | no space left | no |

#### `anketa-fl-simplified-id`

| Field | Longest value | Lines | Regions | Reason | Ordinary values too |
| --- | --- | --- | --- | --- | --- |
| `clientFullName` | 89 chars | 1 | 1 | no space left | no |
| `pdlDetails` | 75 chars | 1 | 1 | no space left | no |

#### `anketa-yul`

| Field | Longest value | Lines | Regions | Reason | Ordinary values too |
| --- | --- | --- | --- | --- | --- |
| `bankAddress` | 65 chars | 1 | 1 | no space left | **yes** |
| `email` | 62 chars | 1 | 1 | no space left | no |
| `licenceAuthority` | 79 chars | 1 | 1 | no space left | no |
| `licensedActivities` | 75 chars | 1 | 1 | no space left | no |
| `managementStructure` | 75 chars | 1 | 1 | no space left | no |
| `otherInformation` | 75 chars | 1 | 1 | no space left | no |
| `signatoryPosition` | 41 chars | 1 | 1 | no space left | no |
| `taxResidenceCountry` | 75 chars | 1 | 1 | no space left | no |

#### `broker-use-refusal-request`

| Field | Longest value | Lines | Regions | Reason | Ordinary values too |
| --- | --- | --- | --- | --- | --- |
| `clientName` | 89 chars | 1 | 1 | no space left | no |
| `clientPrintedName` | 24 chars | 1 | 1 | no space left | no |
| `contractNumber` | 47 chars | 1 | 1 | no space left | no |

#### `client-notifications`

| Field | Longest value | Lines | Regions | Reason | Ordinary values too |
| --- | --- | --- | --- | --- | --- |
| `clientFullName` | 89 chars | 1 | 1 | no space left | no |
| `passportIssuedBy` | 145 chars | 1 | 1 | no space left | no |
| `registrationAddress` | 172 chars | 1 | 1 | no space left | no |

#### `code-word-request`

| Field | Longest value | Lines | Regions | Reason | Ordinary values too |
| --- | --- | --- | --- | --- | --- |
| `clientFullName` | 89 chars | 1 | 1 | no space left | no |

#### `order-forms`

| Field | Longest value | Lines | Regions | Reason | Ordinary values too |
| --- | --- | --- | --- | --- | --- |
| `otherInformation` | 75 chars | 1 | 1 | no space left | no |
| `securityIssuer` | 79 chars | 1 | 1 | no space left | no |
| `tradeClientName` | 89 chars | 1 | 1 | no space left | no |

#### `power-of-attorney`

| Field | Longest value | Lines | Regions | Reason | Ordinary values too |
| --- | --- | --- | --- | --- | --- |
| `flAttorneyCitizenship` | 14 chars | 1 | 1 | no space left | **yes** |
| `flAttorneyIssueDate` | 10 chars | 1 | 1 | no space left | **yes** |
| `flAttorneyName` | 24 chars | 1 | 1 | unbreakable token | no |
| `flPrincipalCitizenship` | 14 chars | 1 | 1 | unbreakable token | **yes** |
| `flPrincipalIssuedBy` | 79 chars | 200 | 1 | unbreakable token | no |
| `ulAttorneyCitizenship` | 14 chars | 1 | 1 | no space left | **yes** |
| `ulAttorneyIssuedBy` | 79 chars | 2 | 1 | no space left | no |
| `ulAttorneyName` | 41 chars | 1 | 1 | no space left | **yes** |
| `ulAttorneyPassport` | 75 chars | 1 | 1 | no space left | no |
| `ulAuthorityBasis` | 79 chars | 1 | 1 | no space left | **yes** |
| `ulCity` | 75 chars | 1 | 1 | no space left | **yes** |
| `ulExecutiveName` | 41 chars | 1 | 1 | no space left | no |
| `ulInn` | 10 chars | 1 | 1 | unbreakable token | **yes** |
| `ulOgrn` | 13 chars | 1 | 1 | unbreakable token | **yes** |

#### `qualification-consequences-notice`

| Field | Longest value | Lines | Regions | Reason | Ordinary values too |
| --- | --- | --- | --- | --- | --- |
| `applicantFullName` | 46 chars | 1 | 1 | no space left | no |

#### `qualification-notice`

| Field | Longest value | Lines | Regions | Reason | Ordinary values too |
| --- | --- | --- | --- | --- | --- |
| `clientName` | 89 chars | 1 | 1 | no space left | no |
| `recipientName` | 89 chars | 1 | 1 | no space left | no |
| `registerEntryOrgName` | 89 chars | 1 | 1 | no space left | **yes** |

#### `qualification-request-fl`

| Field | Longest value | Lines | Regions | Reason | Ordinary values too |
| --- | --- | --- | --- | --- | --- |
| `contractNumber` | 27 chars | 1 | 1 | no space left | no |
| `quarterlyTransactionsValueMillions` | 16 chars | 1 | 1 | no space left | **yes** |
| `signatureName` | 24 chars | 1 | 1 | no space left | no |

#### `qualification-request-yul`

| Field | Longest value | Lines | Regions | Reason | Ordinary values too |
| --- | --- | --- | --- | --- | --- |
| `supportingDocument1` | 75 chars | 1 | 1 | no space left | no |

#### `regulation-full-refusal-notice`

| Field | Longest value | Lines | Regions | Reason | Ordinary values too |
| --- | --- | --- | --- | --- | --- |
| `clientName` | 89 chars | 1 | 1 | no space left | no |
| `clientPrintedName` | 24 chars | 1 | 1 | no space left | no |
| `contractNumber` | 47 chars | 1 | 1 | no space left | no |

#### `regulation-partial-refusal-notice`

| Field | Longest value | Lines | Regions | Reason | Ordinary values too |
| --- | --- | --- | --- | --- | --- |
| `clientName` | 89 chars | 1 | 1 | no space left | no |
| `clientPrintedName` | 24 chars | 1 | 1 | no space left | no |
| `contractNumber` | 47 chars | 1 | 1 | no space left | no |

## 7. Fields with no value in some profiles

22 fields report a missing required value under the `missing-optional` and
`minimum-required` fixture profiles - 16 of them in `anketa-ip-sz`, which marks
fields required that those profiles strip. That is a payload question, not a
layout one, and `run_document_regression.py` reports it separately so it cannot
be mistaken for an overflow.

## 8. Print overrides

**None configured.** No production field sets `allowPrintOverride`. The
mechanism exists and is covered by the wizard tests, but every remaining
overflow sits on a name, an identifier or an address, none of which an operator
may abbreviate.
