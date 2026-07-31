# The seven ordinary-value failures — measured, classified, resolved

Reproduced on the `387af77` baseline against the committed templates with the
production engine and the real embedded font. Machine-readable companion:
`static-uikit/tools/qa/ordinary-failures.json`.

```bash
python static-uikit/tools/qa/dump_field_maps.py --out static-uikit/tools/qa/maps.json
python static-uikit/tools/qa/run_document_regression.py
python static-uikit/tools/qa/audit_ordinary_failures.py
python static-uikit/tools/qa/measure_page_layout.py --doc power-of-attorney
```

## 1. How a profile is classified

| Class | Profiles | Release gate |
| --- | --- | --- |
| ordinary | `ru-resident-short`, `ru-resident-normal`, `ru-company-normal`, `en-nonresident-normal`, `en-company-normal`, `mixed-ru-en`, `missing-optional`, `maximum-checkboxes`, `minimum-required` | **blocking** |
| realistic-long | the `-long` profiles, for the fields documented as expandable — full legal names, addresses, issuing authorities | **blocking** |
| stress | the `-long` profiles for everything else | not blocking |

18 maps × 13 profiles = 234 combinations. On the baseline: **7 ordinary
failures**, 14 realistic-long-only, 27 stress-only, 0 structural problems,
smallest generated size 9.0 pt.

## 2. The matrix

Every number below is measured from the authoritative PDF, not estimated. Text
widths are the real embedded Liberation Serif at 9 pt, the readability floor.

### 2.1 `anketa-fl` / `bankAddress` — p1

| | |
| --- | --- |
| Label / source | Полный адрес банка с указанием страны — `extra.bank-address` |
| Subject kind / variant | individual; no variant condition |
| Formatter / fallbacks | none |
| Fixture, value | `en-nonresident-normal`, `en-company-normal` — «27 King George the Fifth Avenue, London, United Kingdom, SW1A 2AA» |
| Length, shape | 65 chars; spaces yes, hyphen no, no unbreakable token |
| Sizes | preferred 11 pt, minimum 9 pt |
| Printed cell | 305.69–318.65, value column 319.27–566.37; mapped 237.0 pt wide |
| Regions | 1 primary, 0 continuation; capacity 1 line |
| Required at 9 pt | 267.71 pt — 30.71 pt more than the cell holds |
| Page reserve | body ends 777.58, no fixed footer, 64.34 pt free |
| Local row geometry | table pitch 13.44 pt (12.96 pt cell + 0.48 pt border) |
| Error | `no-space` — «SW1A 2AA» unplaced |
| **Classification** | **suitable for dynamic inserted row** |

A foreign bank address is ordinary for a nonresident. The анкета is a table, so
the Word-like answer is a real inserted table row with the same verticals and
0.48 pt border weight — the same treatment `anketa-yul/bankAddress` already has.

### 2.2 `anketa-fl` / `birthPlace` — p0

| | |
| --- | --- |
| Label / source | Место рождения — `field.client-birth-place` |
| Fixture, value | `en-*-normal` — «27 King George the Fifth Avenue, London, United Kingdom, SW1A 2AA» |
| Required at 9 pt | 267.71 pt in a 237.0 pt cell |
| **Classification** | **fixture defect** |

The fixture's fallback synthesiser matched the source key on `/address|place/`
and fed a full street address into a place of birth. A place of birth is
«London, United Kingdom» — 93.24 pt at 9 pt, 124.32 pt at 12 pt — and fits the
cell four times over. The realistic long form «город Санкт-Петербург,
Российская Федерация» is 182.65 pt at 9 pt and also fits on one line.

### 2.3 `power-of-attorney` / `ulAttorneyName` — p0, ЮЛ variant

| | |
| --- | --- |
| Label / source | Поверенный — `extra.extra-attorney-name` |
| Variant | `subject.kind = company` |
| Fixture, value | `ru-company-normal` — «Соколов Алексей Михайлович» |
| Required at 9 pt | 117.99 pt |
| Mapped slot | 107.0 pt (printed rule 381.43–491.37 = 109.94 pt) |
| **Classification** | **mapping-width defect** |

The sentence «…настоящей доверенностью уполномочивает гр. ____» wraps in the
source: the 109.94 pt rule is followed by a **second printed rule of 99.36 pt**
at 56.54–155.90 on the next line, immediately before «, далее именуемого
«Поверенный»». The map declared only the first, reporting 107 pt of printed room
where the form provides 206 pt across two rules. With both rules mapped the
ordinary value prints on two printed lines at the preferred 12 pt and no page
expansion is involved at all.

### 2.4 `power-of-attorney` / `ulAuthorityBasis` — p0, ЮЛ variant

| | |
| --- | --- |
| Label / source | Основание полномочий — `field.client-rep-authority` |
| Fixture, value | `ru-company-normal` — «ГУ МВД России по г. Москве»; `en-company-normal` — «United Kingdom Passport Office» |
| Mapped slot | 96.0 pt (printed rule 56.54–155.90 = 99.36 pt) |
| **Classification** | **fixture defect + mapping-width defect** |

Two independent defects on one field.

*Fixture.* `defaultValue` tests `/authority|issued|issuer/` before
`/authority-?basis|basis/`, so a key named `client-rep-authority` was given an
*issuing authority*. The field holds the document a representative acts under:
«Устава», «Устава общества», «Доверенности № …». «Устава общества» is 64.96 pt
at 9 pt and 86.62 pt at 12 pt — inside the printed rule.

*Mapping.* «…действующего на основании ____» also wraps: a 39.50 pt rule at
492.58–532.08 ends the first line and the 99.36 pt rule continues it on the
next. The map used only the second.

### 2.5 `power-of-attorney` / `ulAttorneyCitizenship` — p0, ЮЛ variant

| | |
| --- | --- |
| Source | `extra.extra-attorney-citizenship` |
| Fixture, value | `en-company-normal` — «United Kingdom» |
| Required at 9 pt | 60.75 pt |
| Printed blank | 30.72 pt at 460.66–491.38, bounded by «паспорт гражданина» and «, серии» |
| Continuation rules | none — the next line's rules belong to the passport number |
| Page reserve | body ends 756.96, page number fixed at 789.97, 33.01 pt free; two reviewed block gaps recover 11.00 pt more |
| Local row geometry | pitch 18.12 pt, body 10.56 pt, ink 11.69 pt, rule 0.48 pt at +1.20 → minimum row 12.0 pt |
| **Classification** | **suitable for dynamic inserted row** |

### 2.6 `power-of-attorney` / `flAttorneyCitizenship` — p2, ФЛ variant

The ФЛ half of the same blank: printed 29.76 pt at 241.61–271.37, «United
Kingdom» needs 60.75 pt at 9 pt. Fails in `en-nonresident-normal`. Page 3 of the
file ends its body at 761.98 with the page number fixed at 794.77 — 32.79 pt
free and no block gap inside the body to recover from, so this page also draws
on its top margin. **Classification: suitable for dynamic inserted row.**

Note the asymmetry that keeps this out of the ordinary Russian case: «Россия» is
26.45 pt at 9 pt, which fits the ФЛ 29.76 pt blank but *not* the 20.40 pt
principal blank on the same page.

### 2.7 `qualification-notice` / `registerEntryOrgName` — p0, company variant

| | |
| --- | --- |
| Label / source | Ф.И.О. / наименование организации — `field.client-full-name` |
| Variant | `subject.kind = company`; mutually exclusive with `registerEntryPersonName` |
| Fixture, value | `ru-company-normal` — «АО «Тестовые инвестиции»»; `en-company-normal` — «North Star Investments Ltd.» |
| Required at 9 pt | 107.78 pt / 100.49 pt |
| Printed blank | 93.14 pt at 229.01–322.15, mapped 89.0 pt |
| Page reserve | body ends 554.34; page height 841.92; **287.58 pt free** |
| Local row geometry | pitch 11.52 pt, body 9.96 pt, ink 11.03 pt, rule 0.48 pt at +1.08 → minimum row 11.5 pt |
| **Classification** | **suitable for a larger complete operator-block cut** |

This is the anchor the previous phase recorded as having *no clean cut within
±30 pt*. That conclusion came from probing with a shift band that ended at the
page's own content bottom (554.5), which splits the trailing block and makes
every candidate straddle. Probing the real movable band finds a clean cut at
**484.95 pt** — immediately under the complete printed line the field sits on,
with 13 drawing blocks moving. The page has 287 pt of reserve, so a single
11.5 pt row costs nothing the form needs.

## 3. Summary of causes

| Cause | Fields |
| --- | --- |
| Fixture defect | 2 — `anketa-fl/birthPlace`, `power-of-attorney/ulAuthorityBasis` (also a mapping defect) |
| Mapping-width defect (unmapped printed continuation rule) | 2 — `power-of-attorney/ulAttorneyName`, `power-of-attorney/ulAuthorityBasis` |
| Suitable for a dynamic inserted row | 3 — `anketa-fl/bankAddress`, `power-of-attorney/ulAttorneyCitizenship`, `power-of-attorney/flAttorneyCitizenship` |
| Suitable for a larger complete operator-block cut | 1 — `qualification-notice/registerEntryOrgName` |
| Incorrect maximum preallocation | 0 of the seven — but see §4 |
| Unnecessarily large generated-row pitch | 0 of the seven — but see §5 |
| Genuine physical source limitation | **0** |

## 4. A separate defect found while reproducing them

`expansionDemands` asked the page for rows whenever a field was *not drawn*,
without distinguishing "does not fit" from "not part of this document". A field
switched off by `showWhen`, an empty optional value and a missing required value
all took `maxExtraRows` and marked themselves insufficient.

The power of attorney holds both variants in one four-page file, so every
generated document paid for the variant it was not printing:

| Subject | Page shifted for nothing | Cost |
| --- | --- | --- |
| company | p2 — `flPrincipalCitizenship`, `flAttorneyIssueDate` | 28 pt |
| individual | p0 — `ulOgrn`, `ulInn` | 28 pt |

Those 28 pt also moved the page number down with the rest of the band, because
`shiftToTop` ran past it. Both are fixed in this phase; see
`docs/document-pdf-generation.md`.

## 5. Row pitch

Every anchor used a generic 14 pt row. Measured from the forms themselves:

| Document | Body size | Line pitch | Ink height | Rule below baseline | Rule weight | Smallest honest row |
| --- | --- | --- | --- | --- | --- | --- |
| `power-of-attorney` | 10.56 pt | 18.12 pt | 11.69 pt | 1.20 pt | 0.48 pt | 12.0 pt |
| `qualification-notice` | 9.96 pt | 11.52 pt | 11.03 pt | 1.08 pt | 0.48 pt | 11.5 pt |
| `anketa-fl` p1 (table) | 9.48 pt | 13.44 pt | 10.50 pt | border | 0.48 pt | 13.44 pt |

The generic 14 pt row was not the cause of any of the seven, but it is 2 pt more
than the power of attorney needs per row — and on a page with 33 pt of reserve
that is the difference between two rows and three.
