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
| 3 | ПРИЛОЖЕНИЕ 3 … УВЕДОМЛЕНИЕ ОБ ОТКРЫТИИ … СЧЕТА.docx | `account-opening-notice` | оба | 2 | ✔ | — | — | ⛔ blocked — conversion |
| 4 | ПРИЛОЖЕНИЕ 4 … РЕКВИЗИТЫ ДЛЯ ПЕРЕЧИСЛЕНИЯ ….docx | `transfer-requisites` | оба | 1 | — | — | — | ⛔ blocked — conversion |
| 5 | ПРИЛОЖЕНИЕ 6 … ДОВЕРЕННОСТЬ.docx | `power-of-attorney` | оба | 4 | — | — | — | ⛔ blocked — conversion |
| 6 | ПРИЛОЖЕНИЕ 7 … ФОРМЫ ПОРУЧЕНИЙ_____[1].docx | `order-forms` | оба | 4 | — | — | — | ⛔ blocked — conversion |
| 7 | ПРИЛОЖЕНИЕ 9 … ОТКАЗ ОТ ПРЕДОСТАВЛЕНИЯ БРОКЕРУ ПРАВА ….docx | `broker-use-refusal-request` | оба | 1 | — | ✅ | ✅ | ✅ migrated |
| 8 | ПРИЛОЖЕНИЕ 10 … ОТКАЗ ИСПОЛНЕНИЯ РЕГЛАМЕНТА В ЦЕЛОМ.docx | `regulation-full-refusal-notice` | оба | 1 | — | ✅ | ✅ | ✅ migrated |
| 9 | ПРИЛОЖЕНИЕ 11 … ОТКАЗ ОТ ЧАСТИ УСЛУГ ПО РЕГЛАМЕНТУ.docx | `regulation-partial-refusal-notice` | оба | 1 | — | ✅ | ✅ | ✅ migrated |
| 10 | ПРИЛОЖЕНИЕ 14 … УСТАНОВЛЕНИЕ/ИЗМЕНЕНИЕ КОДОВОГО СЛОВА.docx | `code-word-request` | оба | 1 | ✔ | ✅ | ✅ | ✅ migrated |

## Регламент признания квалифицированным инвестором

| # | Source file | Document ID | Client type | Pages | HTML tpl | PDF tpl | In wizard | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 11 | Приложение1 физ л.docx | `qualification-request-fl` | ФЛ | 3 | ✔ | ✅ | ✅ | ✅ migrated |
| 12 | ЗАЯВЛЕНИЕ о признании Юр. Лица квал. инвестором.docx | `qualification-request-yul` | ЮЛ | 2 | ✔ | ✅ | ✅ | ✅ migrated |
| 13 | УВЕДОМЛЕНИЕ о признании лица квал. инвестором.docx | `qualification-notice` | оба | 1 | ✔ | — | — | ⛔ blocked — conversion |
| 14 | Приложение 11 Уведомление риски.docx | `qualification-consequences-notice` | ФЛ | 1 | — | — | — | ⛔ blocked — conversion |

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
| ✅ migrated (in-place values, QA'd, generates from the real wizard) | **12** |
| ◐ static (correct pages, no dynamic values) | **1** |
| ▣ template only (clean PDF committed, no field map yet) | **1** |
| ⛔ blocked | **7** |

Migrated: приложения 1А, 1В, 9, 10, 11, 14, обе анкеты ФЛ/ЮЛ, анкета ФЛ
(упрощённая идентификация), оба заявления о признании квалифицированным
инвестором, and `client-notifications` (УВЕДОМЛЕНИЯ.pdf, which now has client
identity drawn onto its original pages instead of being issued blank).

Static: `brokerage-key-information` — a disclosure sheet with no client-specific
blanks, issued unchanged.

## Blocked documents and the exact reason

| Document | Reason |
| --- | --- |
| ПРИЛОЖЕНИЕ 3, 4, 6, 7 · УВЕДОМЛЕНИЕ о признании · Приложение 11 Уведомление риски | **No PDF base template can currently be produced.** Word's PDF export hangs on the conversion workstation — see below. Everything else about these six is understood; they need only the one-time conversion. |
| Анкета ИСБЮЛ (`anketa-isbyul`) | **Unresolved business mapping.** The clean 4-page template is committed and verified, but the CRM has no «иностранная структура без образования юридического лица» subject type, and none of the ~50 values the form asks for (код КИО, место присвоения, состав имущества в управлении, протектор, учредители) exist in any CRM record. Exposing it on ordinary Russian legal entities would be misleading. Needs a business decision on the subject type and data source first. |

### The conversion blocker, precisely

`docx-to-pdf.ps1` cannot produce new templates on this workstation. Isolated
with a trivially small, newly created document containing one line of text:
Word COM connects, `Documents.Open` succeeds and `ComputeStatistics(2)` returns
the correct page count, but both `ExportAsFixedFormat` and `SaveAs2(…, 17)`
never return.

So it is **not** the source documents, the Cyrillic filenames, the network
drive or Protected View. Ruled out in turn: mark-of-the-web (`Unblock-File`), a
stale `Word\Resiliency` key with an orphaned `.asd` recovery file (both
cleared), copying the sources to a local disk, running Word visible rather than
hidden, and one-process-per-file (already the documented approach). Repairing
the Office installation was deliberately not attempted.

This affects **build-time only**. Nothing about the browser runtime changes:
the twelve migrated documents generate from committed PDFs with no native
dependency whatsoever.

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
