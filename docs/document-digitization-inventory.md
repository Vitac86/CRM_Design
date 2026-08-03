# Document digitization inventory

Inventory of the client document forms being digitized for the Document Wizard.

**Source of truth (read-only):**
`Z:\6. Управление по работе с клиентами\Формы документов\для оцифровки`

Contents: **22 files — 19 DOCX, 2 PDF, 1 RAR.** The RAR (`для оцифровки.rar`)
is a redundant archive of the same 21 documents and adds nothing, so the
inventory covers **21 distinct source documents**. The directory is flat; there
are no subdirectories. Source files are never modified, renamed or moved.

Last surveyed: **2026-07-29** (re-scanned from the source directory; every
hash below was recomputed, not carried over).

Verified this survey: all 22 files are byte-distinct from one another, and
every migrated field map records the SHA-256 of the document it was built
from — all 11 recorded hashes match the authoritative file.

The committed browser-PDF inventory is independently locked by the
[full PDF-template audit](document-full-template-audit.md). Its QA gate verifies
the filename, byte length, page count and SHA-256 of all 22 source PDFs, checks
all 77 pages and every extracted source text line, and requires classification
coverage for every field in all 18 executable maps.

## Two regulations, colliding appendix numbers

Documents must be matched by **content**, not filename. Two different
regulations both number their appendices, and the numbers overlap:

| Regulation | Appendices present |
| --- | --- |
| Регламент брокерского обслуживания | ПРИЛОЖЕНИЕ 1А, 1В, 3, 4, 6, 7, 9, 10, 11, 14 |
| Регламент признания лица квалифицированным инвестором | Приложение № 1, № 3, № 11 |

Consequences, both verified:

* `Приложение 11 Уведомление риски.docx` is **not** a variant of
  `ПРИЛОЖЕНИЕ 11 К РЕГЛАМЕНТУ…`. It is *«Уведомление о последствиях признания
  физического лица квалифицированным инвестором»* from the qualification
  regulation.
* `Приложение1 физ л.docx` is **byte-identical (MD5 `8810ba2a…`)** to
  `static-uikit/reference/document-source-docx/Заявление о признании ФЛ квал.
  инвестором.docx`. It maps onto the existing `qualification-request-fl`
  entry — it is **not** a new document.

## Status legend

| Status | Meaning |
| --- | --- |
| ✅ migrated / dynamic production-ready | PDF base template committed, in-place field map complete, automated layout/structural QA covered, generates from the real wizard |
| ◐ static | Shipped as-is by design; correct pages, no dynamic values drawn |
| ▣ template only | Clean base template committed and verified, but no field map and not offered |
| ◌ hidden | Deliberately has no subject/catalogue exposure; reason recorded below |
| ◒ unexposed | Deliberately not offered; client-specific mapping would be required before exposure |
| ⛔ blocked | Cannot proceed; the exact reason is recorded below |
| ☐ pending | Not yet migrated; not offered in the wizard |

A document is **not** shown in the production wizard until its PDF mapping is
complete and validated. Visibility is decided solely by
`resolveRenderStrategy()` — there is no separate allowlist, so a document
without an overlay map cannot appear even by accident.

## Регламент брокерского обслуживания

| # | Source file | Document ID | Client type | Pages | HTML tpl | PDF tpl | In wizard | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | ПРИЛОЖЕНИЕ 1А … ЗАЯВЛЕНИЕ О ПРИСОЕДИНЕНИИ (ФЛ).docx | `accession-application-fl` | ФЛ | 3 | legacy | ✅ | ✅ | ✅ migrated |
| 2 | ПРИЛОЖЕНИЕ 1В … ЗАЯВЛЕНИЕ О ПРИСОЕДИНЕНИИ (ЮЛ).docx | `accession-application-yul` | ЮЛ | 2 | — | ✅ | ✅ | ✅ migrated |
| 3 | ПРИЛОЖЕНИЕ 3 … УВЕДОМЛЕНИЕ ОБ ОТКРЫТИИ … СЧЕТА.docx | `account-opening-notice` | оба | 2 | ✔ | ✅ | ✅ | ✅ migrated |
| 4 | ПРИЛОЖЕНИЕ 4 … РЕКВИЗИТЫ ДЛЯ ПЕРЕЧИСЛЕНИЯ ….docx | `transfer-requisites` | оба | 1 | — | ✅ | — | ◒ unexposed by decision; mapping required before exposure |
| 5 | ПРИЛОЖЕНИЕ 6 … ДОВЕРЕННОСТЬ.docx | `power-of-attorney` | оба | 4 | — | ✅ | ✅ | ✅ migrated |
| 6 | ПРИЛОЖЕНИЕ 7 … ФОРМЫ ПОРУЧЕНИЙ_____[1].docx | `order-forms` | оба | 4 | — | ✅ | — | ⛔ blocked — incomplete mapping |
| 7 | ПРИЛОЖЕНИЕ 9 … ОТКАЗ ОТ ПРЕДОСТАВЛЕНИЯ БРОКЕРУ ПРАВА ….docx | `broker-use-refusal-request` | оба | 1 | — | ✅ | ✅ | ✅ migrated |
| 8 | ПРИЛОЖЕНИЕ 10 … ОТКАЗ ИСПОЛНЕНИЯ РЕГЛАМЕНТА В ЦЕЛОМ.docx | `regulation-full-refusal-notice` | оба | 1 | — | ✅ | ✅ | ✅ migrated |
| 9 | ПРИЛОЖЕНИЕ 11 … ОТКАЗ ОТ ЧАСТИ УСЛУГ ПО РЕГЛАМЕНТУ.docx | `regulation-partial-refusal-notice` | оба | 1 | — | ✅ | ✅ | ✅ migrated |
| 10 | ПРИЛОЖЕНИЕ 14 … УСТАНОВЛЕНИЕ/ИЗМЕНЕНИЕ КОДОВОГО СЛОВА.docx | `code-word-request` | оба | 1 | ✔ | ✅ | ✅ | ✅ migrated |

## Регламент признания квалифицированным инвестором

| # | Source file | Document ID | Client type | Pages | HTML tpl | PDF tpl | In wizard | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 11 | Приложение1 физ л.docx | `qualification-request-fl` | ФЛ | 3 | ✔ | ✅ | ✅ | ✅ migrated |
| 12 | ЗАЯВЛЕНИЕ о признании Юр. Лица квал. инвестором.docx | `qualification-request-yul` | ЮЛ | 2 | ✔ | ✅ | ✅ | ✅ migrated |
| 13 | УВЕДОМЛЕНИЕ о признании лица квал. инвестором.docx | `qualification-notice` | оба | 1 | ✔ | ✅ | ✅ | ✅ migrated |
| 14 | Приложение 11 Уведомление риски.docx | `qualification-consequences-notice` | ФЛ | 1 | — | ✅ | ✅ | ✅ migrated |

## Анкеты

| # | Source file | Document ID | Client type | Pages | HTML tpl | PDF tpl | In wizard | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 15 | Анкета ФЛ.docx | `anketa-fl` | ФЛ | 4 | ✔ | ✅ | ✅ | ✅ migrated |
| 16 | Анкета ЮЛ.docx | `anketa-yul` | ЮЛ | 5 | ✔ | ✅ | ✅ | ✅ migrated |
| 17 | АНКЕТА ФЛ Упр. идент..docx | `anketa-fl-simplified-id` | ФЛ | 2 | — | ✅ | ✅ | ✅ migrated |
| 18 | Анкета ФЛ - ИП и СЗ.docx | `anketa-ip-sz` | ФЛ (ИП / частная практика) | 5 | — | ✅ | ✅ | ✅ migrated |
| 19 | Анкета ИСБЮЛ.docx | `anketa-isbyul` | ИСБЮЛ | 4 | — | ✅ | — | ◌ hidden by decision — no CRM subject model |

## Source PDFs (no DOCX supplied)

| # | Source file | Document ID | Client type | Pages | PDF tpl | In wizard | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 20 | УВЕДОМЛЕНИЯ.pdf | `client-notifications` | оба | 10 | ✅ | ✅ | ✅ migrated |
| 21 | Ключевая_информация_о_договоре_….pdf | `brokerage-key-information` | оба | 3 | ✅ | ✅ | ◐ static |

## Totals

| Metric | Count |
| --- | --- |
| Distinct source documents | **21** |
| ✅ dynamic production-ready and offered | **17** |
| ◐ static by design | **2** |
| ◌ hidden by decision | **1** |
| ◒ unexposed by decision | **1** |
| ⛔ blocked — incomplete mapping | **1** |

The last five rows are the **22 committed PDF-template statuses**. The source
directory has 21 distinct documents because `Risks.pdf`, one of the two static
templates, is an additional committed package asset with no source-directory
counterpart. The non-production-dynamic classifications are not
interchangeable: `anketa-isbyul` is hidden because the CRM has no subject
model, `transfer-requisites` is unexposed because its client-specific blanks
have no map, and `order-forms` is blocked because its retained map is
incomplete.

Per-suite totals are deliberately **not** restated here. They moved with every
change and were quietly wrong for several phases — the stress-only count read
23 against a matrix of 22, and two suite figures were hundreds of checks out of
date. The current numbers come from one place:

```bash
python static-uikit/tools/qa/run_all_qa.py
```

For the assembled correction branch that command reports **27 of 27 suites
passed**, including zero unexpected cases in the regression denominator. Only
that suite-level verdict is recorded here; the per-suite check counts stay
where the runner prints them. The release classification comes from
`static-uikit/tools/qa/ordinary-failures.json`.

The final status of all 22 templates — which are generated, which are offered
as a static download, which are hidden or unexposed, and why — is
[document-full-template-audit.md](document-full-template-audit.md), which is
generated from the executable maps and the wizard catalogue rather than
maintained by hand. In summary: 17 dynamic production-ready, 2 static by
design, 1 hidden by decision (`anketa-isbyul`, no CRM subject model), 1
unexposed by decision (`transfer-requisites`) and 1 blocked on incomplete
mapping (`order-forms`).

`order-forms` was counted as production-ready until manual review found it
generating almost entirely blank: 80 of its 93 printed fields have no source
and every field is optional, so nothing objected. It is no longer offered.
Every printed row, with the exact UMI name where one exists, is in
[order-forms-mapping-gap.md](order-forms-mapping-gap.md).

Static by design, issued unchanged because neither carries a client-specific
blank anywhere: `brokerage-key-information` (a disclosure sheet about the
product) and `Risks.pdf` (a 17-page declaration). Both are delivered with the
brokerage starter package.

`transfer-requisites` is a different case and is **not** one of the two static
by-design documents. It repeats the three payment-purpose sentences of the
account-opening notice — the same sample client codes and brokerage-agreement
number/date blanks — and also contains empty client deposit-account and
depository transfer-basis rows. Those values are client-specific. If the sheet
is ever offered, they must be mapped and validated first; until that separate
business decision it remains unexposed, with its PDF byte baseline locked.

## Manually exported templates

Word's PDF export hangs on the conversion workstation (isolated with a
one-line test document: `Documents.Open` and `ComputeStatistics` succeed,
`ExportAsFixedFormat` and `SaveAs2` never return). Rather than repair Office,
the six affected documents were exported by hand and the PDFs placed beside
their sources.

Each was matched to its Word original by normalized title, page count and
extracted-text overlap — never by appendix number, which collides across the
two regulations — then copied into the repository byte-identically.

| Template | Source SHA-256 (docx) | PDF SHA-256 | Pages |
| --- | --- | --- | --- |
| `account-opening-notice` | `39e0df89…` | `8e6a3922…` | 2 |
| `transfer-requisites` | `5ce12f3b…` | `7a4317aa…` | 1 |
| `power-of-attorney` | `e2138404…` | `a7bcaf8d…` | 4 |
| `order-forms` | `adf2f86d…` | `24e593d1…` | 4 |
| `qualification-consequences-notice` | `13b4d6e0…` | `471b0828…` | 1 |
| `qualification-notice` | `a097d95d…` | `2a9fab02…` | 1 |

All six carry zero AcroForm fields, zero widgets, zero annotations, no blank or
appended page, and page counts matching their sources.

### The company seal on ПРИЛОЖЕНИЕ 3

The re-supplied `account-opening-notice` template carries Investica's seal as a
raster image on **page 2 at (200.65, 647.30)–(329.25, 805.65)**, 129 × 158 pt.
It is present in the authoritative Z: source, in the committed template and in
generated output as the same object (`xref 38`) — **exactly one image in all
three**, so nothing duplicates or covers it. It is static template content and
is intended to appear on every generated document.

That is consistent with "signature areas blank": the seal is a printed part of
the form, while the «Подпись ответственного лица ______ /______» rules beside
it stay empty, as do all other signature and employee-completion areas. The
three payment-purpose Word-flow rows and the reviewed transfer-basis block are
laid out independently; the generated overlay neither duplicates nor covers
the seal.

> **Observation, not corrected:** these hand-exported PDFs retain a `/Author`
> value from whoever exported them. That is metadata only — nothing is visible
> on the page — and the repository already contains such values on
> `accession-application-fl.pdf` and `Risks.pdf`. Left as supplied so the
> committed template stays byte-identical to the approved export.

## Hidden and blocked documents — exact reason

| Document | Reason |
| --- | --- |
| Анкета ИСБЮЛ (`anketa-isbyul`) | **Hidden by decision — authoritative template available, but the CRM has no ИСБЮЛ subject model or required data sources.** The clean 4-page template is committed and verified, but none of the ~50 values the form asks for (код КИО, место присвоения, состав имущества в управлении, протектор, учредители) exist in any CRM record, and there is no «иностранная структура без образования юридического лица» subject type. It has no wizard card, no company applicability and no default values; ordinary Russian-company fields are deliberately *not* mapped onto it. |
| Формы поручений (`order-forms`) | **Blocked — incomplete mapping.** The retained 4-page map places 93 optional fields, but 90 are still operator workflow sources and only the three client-name occurrences reach normalized CRM data. It is explicitly `blockedIncompleteMapping`, not offered, and requires the separate field-by-field decisions in [order-forms-mapping-gap.md](order-forms-mapping-gap.md). |

## Per-document detail for the documents completed last

### `account-opening-notice` — ПРИЛОЖЕНИЕ 3, 2 pages, both subject kinds

Map `assets/js/document-field-maps/account-opening-notice.js`; output
`uvedomlenie-ob-otkrytii-scheta.pdf`; PDF SHA-256 `8e6a3922…`. The corrected
authoritative Z: DOCX is `39e0df89…`; the committed PDF is byte-identical to
its paired corrected Z: PDF.

**Static template content — never overlaid, verified to appear exactly once:**
§5 requisites (Получатель «ООО «Инвестика»», ИНН `7802953900`, Р/сч
`40701810700000002900`, Банк `АО "Райффайзенбанк"`, К/сч
`30101810200000000700`, БИК `044525700`), the whole page-2 депо table
(`HL2509080091`, `ML2508290147`, `MC0742000000`, `36MC0742000000F00`,
«НКО АО НРД», «№7420/ДНД от 29 августа 2025 г.»), transfer-basis items 1 and
3, and the company seal image on page 2 at
(200.65, 647.30)–(329.25, 805.65). Transfer-basis item 2 is dynamic, not static
template content.

**CRM:** client name, ИНН/document number, client code. The client code prints
four times: in the «Код клиента» cell of §1, and inside all three payment-purpose
sentences on page 2, where the source form prints a sample code instead of a
blank.

**Operator:** formation date, brokerage agreement number/date, depository
agreement number/date, three internal market accounts, счёт депо. The one
brokerage pair drives the page-1 cells and all three payment-purpose sentences;
the one depository pair drives the page-1 cells and page-2 transfer-basis item
2. Both depository values are required, have no defaults and are not guessed
from UMI.

The signing officer is **no longer asked for**: the updated authoritative
template prints «в лице Генерального Директора Козырева Александра
Юрьевича, действующего на основании Устава» itself, so there is no blank to
fill and the former spelling `Юрьвеича` is absent.

**Blank:** «Подпись ответственного лица» and all other employee-completion
signature areas.

### `qualification-notice` — reviewed recipient, body/date and instrument flow

Map `…/qualification-notice.js`; output
`uvedomlenie-o-priznanii-kvalinvestorom.pdf`; PDF SHA-256
`2a9fab02…`.

The recipient name and `umi.address.registration` are one reviewed Word-flow
block with a right-column first/hanging indent, so Russian and foreign
component-formatted addresses stay attached to «Адрес:» and render once. A
second semantic block owns the full organization name, its caption,
recognition wording and date. The `other` instrument branch has its own
reviewed multi-line underlined capacity.

Obsolete Word rules are removed as exact source-PDF paths with ordinal,
operator hash, template hash, owner block and approval proof — never with a
white rectangle. `moveTopLevelPaths` moves the surviving rules with their
owning expanded block. Focused scenarios cover short/long names, Russian and
foreign addresses, their combined case, body/date flow and long `other` text;
manual review-pack approval remains required.

### `power-of-attorney` — ПРИЛОЖЕНИЕ 6, 4 pages, both subject kinds

Map `…/power-of-attorney.js`; output `doverennost.pdf`; PDF SHA-256 `a7bcaf8d…`.

The file holds **two** powers of attorney — «от юридического лица» (pages 1–2)
and «от физического лица» (pages 3–4). The variant matching the subject is
filled and the other verified byte-for-byte blank. Page sizes are mixed
(595.56 × 842.04 and 595.32 × 841.92) and are preserved.

Both variants now pass ordinary and supported realistic-long fixtures. When
local reserve is exhausted, reviewed one-page flow moves a complete trailing
power from page 1 to page 2 or the final two lines of a power from page 3 to
page 4. The authoritative four-page PDF, fixed wording and page count do not
change; original content-stream operators are transferred exactly once.

**The powers are not selectable:** zero checkbox glyphs anywhere in the
document, no "other powers" line, no validity blank and no substitution option
— the wording fixes «сроком на три года без права передоверия».

**CRM:** legal name, ОГРН, ИНН, short name, executive, authority basis; and for
individuals name, citizenship, passport, issuing authority, issue date, address.
**Operator:** the поверенный only.

### `order-forms` — ПРИЛОЖЕНИЕ 7, 4 pages, both subject kinds

Map `…/order-forms.js`; output `poruchenie.pdf`; PDF SHA-256 `24e593d1…`.

**Status: `blocked-incomplete-mapping`; not offered.** The behavior below
describes the retained implementation scaffold, not a client-ready document.

Three separate order forms in one file, one registry entry. «Тип поручения»
selects one; the other two stay blank and all four pages are always emitted.

**Mutually exclusive groups:** primary/cancellation, вид сделки, вид рынка, вид
поручения, РЕПО с ЦК, валютный СВОП с ЦК, both trading-venue lists, both
currency rows, payout amount mode. **Independent:** the непокрытая-позиция
acknowledgement. **Explanatory, never marked:** the «(указать)» captions.

**Blank:** every «Заполняется ООО «Инвестика»» block and every signature rule.

### `anketa-ip-sz` — Приложение 18, 5 pages, individuals only

Map `…/anketa-ip-sz.js`; output `anketa-ip-chastnaya-praktika.pdf`;
source SHA-256 `6102dedd…`.

The filename abbreviates the second category as «СЗ», but the form never says
«самозанятый». Its own wording is **«Индивидуальный предприниматель»** and
**«Лицо, занимающееся частной практикой»**, and the two are kept distinct. The
CRM has no field recording that status, so the operator selects it with no
default.

**CRM:** full name, birth date and place, citizenship, identity document
(name, series+number, issue date, authority, department code), registration and
postal addresses, phone, e-mail, INN, SNILS, representative name.
**Operator:** status, role, completion mode, citizenship and tax-residency
branches with country lists, foreign-taxpayer answer, residence-permit block,
PDL status and relation, bank details, ОГРНИП block, private-practice block,
licensing block, website, beneficiary and beneficial-owner data, purposes,
goals, financial position, trustee and protector status, other information.

**39 checkboxes:** mutually exclusive — status (2), role (2), completion mode
(2), citizenship (2), tax residency (2), foreign taxpayer (2), PDL (3),
licensing (2), purposes (4), goals (4), financial position (2), trustee (2),
protector (2). Independent — eight US-taxpayer indicators in п. 31, any number
of which may be ticked.

**Blank:** «(подпись клиента)», «МП (при наличии)» and the entire page-5
«Для служебных отметок» block — verified zero overlay tokens on page 5.

### Questionnaire row ownership — all four offered questionnaire maps

`anketa-fl-simplified-id`, `anketa-ip-sz`, `anketa-fl`, and `anketa-yul` now
declare `tableOwnershipRequired`, an approved owning cell (or an explicit
approved exemption) for every dynamic field, and one measured table budget per
page/table. An owner locks the exact field/source/page, table and row IDs,
physical cell bounds, reviewed line count, next row, moved horizontal/vertical
borders and the growth budget.

The production renderer audits the planned ink, not only the declared field
box. It refuses text outside the owner cell, a baseline through a horizontal
border, overlapping dynamic ink, unreviewed extra lines, a broken vertical
border after growth, a duplicate one-logical-value group, or cumulative growth
above the table budget. Growing a row therefore moves every lower row and the
declared border set by the same delta. This closes the reported full-name,
bank-address, registration/OKVED and duplicated-address failures without
changing the authoritative PDF or reducing text below the 9 pt floor.

## `transfer-requisites` (ПРИЛОЖЕНИЕ 4) — unexposed, not static by design

The authoritative sheet has blank broker bank-requisite cells, but it also
contains client-specific content: three sample-code payment-purpose sentences
with brokerage agreement number/date blanks, empty trading/non-trading deposit
account rows, and an empty client depository agreement number/date in the
transfer-basis section. Calling it a pure static reference sheet was incorrect.

It has no field map and no wizard card. That is an intentional **unexposed**
status, not approval to issue the blank PDF and not a promotion to the two
static-by-design package documents. If product owners decide to offer it, the
client code, brokerage agreement pair, account rows and depository agreement
pair must first receive reviewed mappings and the same completeness gates as
the account-opening notice.

## Migrated document detail

### 1. `accession-application-fl` — Заявление о присоединении (ФЛ)

* **Base template:** `assets/document-pdf-templates/accession-application-fl.pdf`
  (3 pages, A4 595.32 × 841.92 pt, **0 AcroForm fields**).
* **Field map:** `assets/js/document-field-maps/accession-application-fl.js`
* **Output filename:** `zayavlenie-o-prisoedinenii-fl.pdf`

**CRM data used (no re-entry — taken from the subject card):**
`field.clientFullName`, `field.passportSeries`, `field.passportNumber`,
`field.passportIssuedBy`, `field.passportIssueDate`,
`field.registrationAddress`, `subject.phone`, `subject.email`.

**User-entered (transaction-specific only):** signing date; depository
agreement number and date; счёт депо type; торговый счёт депо type; report
delivery method; income payout destination; three tariff plan names. The
depository pair is required and starts empty because the workbook has no
printable UMI number/date. Every input has a corresponding position or checkbox
in the PDF — the wizard shows no input that generation ignores.

The e-mail address on the "По электронной почте ______" line is conditional
(`showWhen`): it prints only when e-mail delivery is selected.

**Wizard status:** offered to individual subjects, hidden for legal entities,
generated through the standard "Сформировать PDF" flow with the same status and
download behaviour as the starter package.

**Checkboxes (21 in the template, 20 mappable):**
§1 accession ×2 · §2 счёт депо ×3, торговый счёт депо ×3, operator ×1 ·
§3 report delivery ×4 · §4 markets ×3 · §5 agreements ×2 · §6 payout ×2.

> The 21st checkbox glyph, at (225.3, 597.91) on page 2, belongs to the sentence
> *«Проставление любого символа в графе ☐ означает согласие…»*. It is
> explanatory prose, not a control, and is deliberately excluded.

**Left blank by design:** the whole page 3 block *«Заполняется ООО
«Инвестика»»* (registration number, contract numbers/dates, internal client
code, officer position/name/signature) — completed by staff after printing.
Also the handwritten signature rule on page 2.

## Wizard categories and applicability

Documents are grouped into: *Документы и заявления клиента*, *Брокерское
обслуживание*, *Анкеты и идентификация*, *Квалифицированный инвестор*,
*Операционные заявки*. A client-side search over title, description, category
and maintained aliases sits above the list.

| Offered to individuals (`c-006`) | Offered to legal entities (`c-011`) |
| --- | --- |
| Стартовый пакет брокерского договора | Стартовый пакет брокерского договора |
| Заявление о присоединении (ФЛ) | Заявление о присоединении (ЮЛ) |
| Заявление об установлении/изменении кодового слова | Заявление об установлении/изменении кодового слова |
| Отказ от права использования средств и ценных бумаг | Отказ от права использования средств и ценных бумаг |
| Отказ от исполнения Регламента в целом | Отказ от исполнения Регламента в целом |
| Отказ от части услуг по Регламенту | Отказ от части услуг по Регламенту |
| Анкета физического лица | Анкета юридического лица |
| Анкета ФЛ (упрощённая идентификация) | — |
| Анкета (досье) ИП или лица, занимающегося частной практикой | — |
| Доверенность | Доверенность |
| Уведомление об открытии брокерского/депозитарного счета | Уведомление об открытии брокерского/депозитарного счета |
| Заявление о признании ФЛ квалифицированным инвестором | Заявление о признании ЮЛ квалифицированным инвестором |
| Уведомление о признании лица квалифицированным инвестором | Уведомление о признании лица квалифицированным инвестором |
| Уведомление о последствиях признания квалифицированным инвестором | — |
| Заявка на закрытие договора/счёта | Заявка на закрытие договора/счёта |

Verified in the real wizard: ФЛ-only forms never appear for a legal entity and
ЮЛ-only forms never appear for an individual.

**Package composition is unchanged.** «Стартовый пакет брокерского договора»
still emits exactly its three children (`client-notifications`,
`risks-declaration`, `brokerage-key-information`). Nothing was added to it
merely for being brokerage-related, and no package child is also offered as a
standalone card.

## Unresolved questions

1. **`Risks.pdf`** (17 pages, `assets/document-pdf-templates/Risks.pdf`) is
   shipped and offered in the starter package, but has **no counterpart in the
   source directory**. Its provenance and current legal version are unverified.
   It is deliberately left byte-unchanged rather than replaced by a guess.
2. **`zayavlenie-tip-in-fl.html` / `zayavlenie-tip-in-ul.html`** ("Заявление о
   присоединении Тип ИН") exist as legacy HTML templates with **no source
   DOCX**. Should they be dropped, or is a source document expected?
3. **`client-notifications`** (УВЕДОМЛЕНИЯ.pdf) — which values, if any, must be
   drawn into the original 10 pages? It is currently issued unmodified.
4. ~~**`transfer-requisites` classification.**~~ **Resolved for this release.**
   It contains client-specific sample-code/agreement blanks and deposit-account
   rows, so it is not static by design. It remains unexposed until a separate
   product decision and complete mapping are supplied.
5. ~~**Passport issue date format.**~~ **Resolved.** The date now prints as
   `«20» апреля 2008 г.` — day in the quotes, genitive month and four-digit
   year on the printed line. Exact glyph measurement of the 38.24 pt slot
   (513.69 → "г." at 551.93) showed every month fits: "мая 2020" at the full
   8.52 pt down to "сентября 2018" at 6.02 pt, above the 6.0 pt floor. The
   numeric `MM.YYYY` form and the `«20» 04 2008` fallback are not used.
6. **Signature name.** The `(_________)` slot holds ~11 characters. The renderer
   prints "Фамилия И.О.", falls back to the surname alone, and fails loudly if
   even that cannot fit (roughly beyond a 15-character surname).

## Source document defects (reported, not silently corrected)

| Document | Observation |
| --- | --- |
| ПРИЛОЖЕНИЕ 1А (ФЛ) | §8 contains the URL **`htths://www.investica.ru`** twice — "htths" should presumably be "https". Left exactly as written in the source. |
| ПРИЛОЖЕНИЕ 1А (ФЛ) | §2 uses "ООО Инвестика" without the usual «» quotation marks, inconsistent with the rest of the document. |
| ПРИЛОЖЕНИЕ 7 | Filename contains placeholder padding: `ФОРМЫ ПОРУЧЕНИЙ_____[1].docx`. |
| ПРИЛОЖЕНИЕ 14 | The body carries unresolved mail-merge tokens — `$FULLNAME$` (twice), `$INN$`, `$CLIENT_CODEWORD$` — instead of blank rules. Reported, not corrected in the source. |
| ПРИЛОЖЕНИЕ 14 | Prints `202__ г.`, i.e. three fixed year digits, so only the final digit can be filled. Writing a two-digit year would produce a five-digit year, so the renderer fills one digit and leaves the defect visible. |
| АНКЕТА ФЛ Упр. идент. | §11 reads «Укажите статус **бубличного** должностного лица» — "бубличного" should be "публичного". Left exactly as written. |
| УВЕДОМЛЕНИЕ о признании | The source PDF contains stray digit runs (`810768208285`, `11537152896293122689289629`) and obsolete vector rules where merge fields sat. The source stays unchanged; generated output removes only the reviewed, ordinal-and-SHA-locked operator paths owned by the recipient/body/instrument Word-flow blocks. |
| УВЕДОМЛЕНИЕ о признании | The register-entry date slot after «признанных квалифицированными инвесторами» is **10.86 pt** wide, measured from real glyph boxes. No date fits even at the 6 pt floor, so the slot is left blank rather than overprinted onto the "(дата)" caption. |
| Приложение 11 Уведомление риски | The broker's e-mail rule in clause 3 is **20.64 pt** wide — no address fits. The broker's own address is also not held in the CRM. Left blank. |
| ПРИЛОЖЕНИЕ 4 | The broker's own payment details (ИНН, Р/сч, Банк, К/сч, БИК) and the whole торговый/неторговый раздел table are blank in the authoritative source. |
| ПРИЛОЖЕНИЕ 3 | Same blank broker requisites. The «Код INV0000X» / «Код XXXXXXХ» sample-code paragraphs are **no longer left as printed**: each reviewed Word-flow row prints the CRM client code and the complete brokerage agreement number/date pair. The one dropped sample token per row is declared in `sourcePlaceholders`; every other token still has to match the authoritative PDF. |
| ПРИЛОЖЕНИЕ 3 | Resolved in the re-supplied authoritative template: «на основании Доверенности № ,» became fixed «на основании Устава», and the representative is printed as «Козырева Александра Юрьевича». The former `Юрьвеича` typo and obsolete 8.18 pt gap are absent. Transfer-basis item 2 is a separate nested Word-flow replacement for the required depository number/date pair. |
| ПРИЛОЖЕНИЕ 6 (ЮЛ) | «серии» ends its line with no rule after it, so series and number share the «№» rule; «дата выдачи _,» reserves 4.56 pt and stays blank. |
| ПРИЛОЖЕНИЕ 6 (ФЛ) | «выданный» reserves 50.2 pt against 114.5 pt for the same value in the legal-entity variant, so a normal issuing authority needs three wrapped lines. |
| ПРИЛОЖЕНИЕ 7 | Only the «Первичная подача заявки» row has underlined blanks; the «Отмена ранее поданной заявки» row has none, so its number and date go in the adjacent value column. |
| Анкета ФЛ - ИП и СЗ | п. 13 prints **«Должностного лица публичной международной Организации.» twice** — as both the second and third ПДЛ category. By 115-ФЗ the third should be the Russian state-official category. Left exactly as written; the third box is mapped by position. |
| Анкета ФЛ - ИП и СЗ | The filename says «ИП и СЗ», but the form's own wording is «Лицо, занимающееся частной практикой» — never «самозанятый». The form wording is used. |
