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
| ✅ migrated | PDF base template committed, in-place field map complete, visually QA'd, generates from the real wizard |
| ◐ static | Shipped as-is; correct pages, no dynamic values drawn |
| ▣ template only | Clean base template committed and verified, but no field map and not offered |
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
| 3 | ПРИЛОЖЕНИЕ 3 … УВЕДОМЛЕНИЕ ОБ ОТКРЫТИИ … СЧЕТА.docx | `account-opening-notice` | оба | 2 | ✔ | ✅ | — | ▣ template only |
| 4 | ПРИЛОЖЕНИЕ 4 … РЕКВИЗИТЫ ДЛЯ ПЕРЕЧИСЛЕНИЯ ….docx | `transfer-requisites` | оба | 1 | — | ✅ | — | ◐ static, not exposed |
| 5 | ПРИЛОЖЕНИЕ 6 … ДОВЕРЕННОСТЬ.docx | `power-of-attorney` | ЮЛ | 4 | — | ✅ | — | ▣ template only |
| 6 | ПРИЛОЖЕНИЕ 7 … ФОРМЫ ПОРУЧЕНИЙ_____[1].docx | `order-forms` | оба | 4 | — | ✅ | — | ▣ template only |
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
| 18 | Анкета ФЛ - ИП и СЗ.docx | `anketa-ip-sz` | ФЛ (ИП/СЗ) | 5 | — | ✅ | — | ▣ template only |
| 19 | Анкета ИСБЮЛ.docx | `anketa-isbyul` | ИСБЮЛ | 4 | — | ✅ | — | ⛔ blocked — mapping |

## Source PDFs (no DOCX supplied)

| # | Source file | Document ID | Client type | Pages | PDF tpl | In wizard | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 20 | УВЕДОМЛЕНИЯ.pdf | `client-notifications` | оба | 10 | ✅ | ✅ | ◐ static |
| 21 | Ключевая_информация_о_договоре_….pdf | `brokerage-key-information` | оба | 3 | ✅ | ✅ | ◐ static |

## Totals

| Metric | Count |
| --- | --- |
| Distinct source documents | **21** |
| ✅ migrated (in-place values, QA'd, generates from the real wizard) | **14** |
| ◐ static | **2** (1 exposed, 1 not) |
| ▣ template only (clean PDF committed and verified, no field map yet) | **4** |
| ⛔ blocked | **1** |

**Every source document now has a verified clean PDF base template.** The Word
export that previously blocked six of them was performed by hand and the
resulting PDFs supplied alongside their sources; each was matched to its Word
original by title, page count and extracted-text overlap and copied
byte-identically. What remains outstanding is coordinate mapping, not
conversion.

Migrated: приложения 1А, 1В, 9, 10, 11, 14, обе анкеты ФЛ/ЮЛ, анкета ФЛ
(упрощённая идентификация), оба заявления о признании квалифицированным
инвестором, and `client-notifications` (УВЕДОМЛЕНИЯ.pdf, which now has client
identity drawn onto its original pages instead of being issued blank).

Static: `brokerage-key-information` — a disclosure sheet with no client-specific
blanks, issued unchanged.

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
| `account-opening-notice` | `600f6fb1…` | `3e26d753…` | 2 |
| `transfer-requisites` | `5ce12f3b…` | `7a4317aa…` | 1 |
| `power-of-attorney` | `e2138404…` | `a7bcaf8d…` | 4 |
| `order-forms` | `adf2f86d…` | `24e593d1…` | 4 |
| `qualification-consequences-notice` | `13b4d6e0…` | `471b0828…` | 1 |
| `qualification-notice` | `a097d95d…` | `2a9fab02…` | 1 |

All six carry zero AcroForm fields, zero widgets, zero annotations, no blank or
appended page, and page counts matching their sources.

> **Observation, not corrected:** these hand-exported PDFs retain a `/Author`
> value from whoever exported them. That is metadata only — nothing is visible
> on the page — and the repository already contains such values on
> `accession-application-fl.pdf` and `Risks.pdf`. Left as supplied so the
> committed template stays byte-identical to the approved export.

## Blocked documents and the exact reason

| Document | Reason |
| --- | --- |
| Анкета ИСБЮЛ (`anketa-isbyul`) | **Blocked — authoritative template available, but the CRM has no ИСБЮЛ subject model or required data sources. Intentionally not exposed.** The clean 4-page template is committed and verified, but none of the ~50 values the form asks for (код КИО, место присвоения, состав имущества в управлении, протектор, учредители) exist in any CRM record, and there is no «иностранная структура без образования юридического лица» subject type. It has no wizard card, no company applicability and no default values; ordinary Russian-company fields are deliberately *not* mapped onto it. |

## Awaiting coordinate mapping (template only)

These four have a verified clean template but no field map, so
`resolveRenderStrategy()` returns `null` and none of them is selectable.

| Document | What is still needed |
| --- | --- |
| `account-opening-notice` (Прил. 3) | The document's substance is internal back-office data — brokerage and depositary contract numbers/dates, three market account numbers, the счёт депо number, and on page 2 the торговый/неторговый раздел numbers and междепозитарный договор. The CRM holds none of it, so mapping needs a decision on which values an operator types and which stay blank. The broker's own bank requisites (ИНН, Р/сч, Банк, К/сч, БИК) are **blank in the authoritative source**. |
| `power-of-attorney` (Прил. 6) | Legal-entity power of attorney (the form says «доверенность от юридического лица»), 4 pages, mixed page sizes. Needs the representative-selection pattern and a decision on the list of delegated powers. |
| `order-forms` (Прил. 7) | 4 pages and 45 checkbox glyphs covering several distinct order types in one file. Needs a decision on whether this is one wizard document or several before any map is written. |
| `anketa-ip-sz` (Прил. 18) | ~45 value cells and ~40 checkboxes. Identity, passport, address, contacts, INN and SNILS all come from the subject card; the ИП/ОГРНИП, private-practice, licence and FATCA blocks need form-specific inputs. |

## `transfer-requisites` (ПРИЛОЖЕНИЕ 4) — static, deliberately not exposed

This resolves an inventory question that was previously open. The appendix is a
reference sheet of the **broker's own** payment details, and it contains no
client-specific values at all. Its cells — Получатель, ИНН, Р/сч, Банк, К/сч,
БИК — plus the whole торговый/неторговый раздел table are **blank in the
authoritative source**.

So it needs no overlay and no wizard inputs, and it is not offered as a card:
issuing a client a requisites sheet whose requisites are empty would be worse
than not issuing one. The template is committed and ready should the broker
constants be supplied.

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

**User-entered (transaction-specific only):** signing date; счёт депо type;
торговый счёт депо type; report delivery method; income payout destination;
three tariff plan names. Every one of these has a corresponding position or
checkbox in the PDF — the wizard shows no input that generation ignores.

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
4. **`transfer-requisites`** (ПРИЛОЖЕНИЕ 4) appears to be a pure reference sheet
   of the broker's bank details with no client-specific values. Confirm whether
   it needs any dynamic data at all.
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
| УВЕДОМЛЕНИЕ о признании | Extracted text contains stray digit runs (`810768208285`, `11537152896293122689289629`) where merge fields sit, rather than blank rules. |
| УВЕДОМЛЕНИЕ о признании | The register-entry date slot after «признанных квалифицированными инвесторами» is **10.86 pt** wide, measured from real glyph boxes. No date fits even at the 6 pt floor, so the slot is left blank rather than overprinted onto the "(дата)" caption. |
| Приложение 11 Уведомление риски | The broker's e-mail rule in clause 3 is **20.64 pt** wide — no address fits. The broker's own address is also not held in the CRM. Left blank. |
| ПРИЛОЖЕНИЕ 4 | The broker's own payment details (ИНН, Р/сч, Банк, К/сч, БИК) and the whole торговый/неторговый раздел table are blank in the authoritative source. |
| ПРИЛОЖЕНИЕ 3 | Same blank broker requisites, plus «Код INV0000X» / «Код XXXXXXХ» placeholder codes left in the payment-purpose rows. |
