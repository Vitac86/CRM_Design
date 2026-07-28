# Document digitization inventory

Inventory of the client document forms being digitized for the Document Wizard.

**Source of truth (read-only):**
`Z:\6. Управление по работе с клиентами\Формы документов\для оцифровки`

Contents: **22 files — 19 DOCX, 2 PDF, 1 RAR.** The RAR (`для оцифровки.rar`)
is a redundant archive of the same 21 documents and adds nothing, so the
inventory covers **21 distinct source documents**. The directory is flat; there
are no subdirectories. Source files are never modified, renamed or moved.

Last surveyed: **2026-07-28**.

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
| ✅ migrated | PDF base template committed, in-place field map complete, visually QA'd, offered in the wizard |
| ◐ static | Shipped as-is; correct pages, but no dynamic values drawn yet |
| ☐ pending | Not yet migrated; not offered in the wizard |

A document is **not** shown in the production wizard until its PDF mapping is
complete and validated.

## Регламент брокерского обслуживания

| # | Source file | Document ID | Client type | Pages | HTML tpl | PDF tpl | In wizard | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | ПРИЛОЖЕНИЕ 1А … ЗАЯВЛЕНИЕ О ПРИСОЕДИНЕНИИ (ФЛ).docx | `accession-application-fl` | ФЛ | 3 | legacy | ✅ | ✅ | ✅ migrated |
| 2 | ПРИЛОЖЕНИЕ 1В … ЗАЯВЛЕНИЕ О ПРИСОЕДИНЕНИИ (ЮЛ).docx | `accession-application-yul` | ЮЛ | 2 | — | — | — | ☐ pending |
| 3 | ПРИЛОЖЕНИЕ 3 … УВЕДОМЛЕНИЕ ОБ ОТКРЫТИИ … СЧЕТА.docx | `account-opening-notice` | оба | 2 | ✔ | — | — | ☐ pending |
| 4 | ПРИЛОЖЕНИЕ 4 … РЕКВИЗИТЫ ДЛЯ ПЕРЕЧИСЛЕНИЯ ….docx | `transfer-requisites` | оба | 1 | — | — | — | ☐ pending |
| 5 | ПРИЛОЖЕНИЕ 6 … ДОВЕРЕННОСТЬ.docx | `power-of-attorney` | оба | 4 | — | — | — | ☐ pending |
| 6 | ПРИЛОЖЕНИЕ 7 … ФОРМЫ ПОРУЧЕНИЙ_____[1].docx | `order-forms` | оба | 4 | — | — | — | ☐ pending |
| 7 | ПРИЛОЖЕНИЕ 9 … ОТКАЗ ОТ ПРЕДОСТАВЛЕНИЯ БРОКЕРУ ПРАВА ….docx | `broker-use-refusal-request` | оба | 1 | — | — | — | ☐ pending |
| 8 | ПРИЛОЖЕНИЕ 10 … ОТКАЗ ИСПОЛНЕНИЯ РЕГЛАМЕНТА В ЦЕЛОМ.docx | `regulation-full-refusal-notice` | оба | 1 | — | — | — | ☐ pending |
| 9 | ПРИЛОЖЕНИЕ 11 … ОТКАЗ ОТ ЧАСТИ УСЛУГ ПО РЕГЛАМЕНТУ.docx | `regulation-partial-refusal-notice` | оба | 1 | — | — | — | ☐ pending |
| 10 | ПРИЛОЖЕНИЕ 14 … УСТАНОВЛЕНИЕ/ИЗМЕНЕНИЕ КОДОВОГО СЛОВА.docx | `code-word-request` | оба | 1 | ✔ | — | — | ☐ pending |

## Регламент признания квалифицированным инвестором

| # | Source file | Document ID | Client type | Pages | HTML tpl | PDF tpl | In wizard | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 11 | Приложение1 физ л.docx | `qualification-request-fl` | ФЛ | 3 | ✔ | — | — | ☐ pending |
| 12 | ЗАЯВЛЕНИЕ о признании Юр. Лица квал. инвестором.docx | `qualification-request-yul` | ЮЛ | 2 | ✔ | — | — | ☐ pending |
| 13 | УВЕДОМЛЕНИЕ о признании лица квал. инвестором.docx | `qualification-notice` | оба | 1 | ✔ | — | — | ☐ pending |
| 14 | Приложение 11 Уведомление риски.docx | `qualification-consequences-notice` | ФЛ | 1 | — | — | — | ☐ pending |

## Анкеты

| # | Source file | Document ID | Client type | Pages | HTML tpl | PDF tpl | In wizard | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 15 | Анкета ФЛ.docx | `anketa-fl` | ФЛ | 4 | ✔ | — | — | ☐ pending |
| 16 | Анкета ЮЛ.docx | `anketa-yul` | ЮЛ | 5 | ✔ | — | — | ☐ pending |
| 17 | АНКЕТА ФЛ Упр. идент..docx | `anketa-fl-simplified-id` | ФЛ | 2 | — | — | — | ☐ pending |
| 18 | Анкета ФЛ - ИП и СЗ.docx | `anketa-fl-ip-sz` | ФЛ (ИП/СЗ) | 5 | — | — | — | ☐ pending |
| 19 | Анкета ИСБЮЛ.docx | `anketa-isbyul` | ИСБЮЛ | 4 | — | — | — | ☐ pending |

## Source PDFs (no DOCX supplied)

| # | Source file | Document ID | Client type | Pages | PDF tpl | In wizard | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 20 | УВЕДОМЛЕНИЯ.pdf | `client-notifications` | оба | 10 | ✅ | ✅ | ◐ static |
| 21 | Ключевая_информация_о_договоре_….pdf | `brokerage-key-information` | оба | 3 | ✅ | ✅ | ◐ static |

## Totals

| Metric | Count |
| --- | --- |
| Distinct source documents | **21** |
| ✅ migrated (in-place values, QA'd) | **1** |
| ◐ static (correct pages, no dynamic values) | **2** |
| ☐ pending | **18** |

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
three tariff plan names.

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

## Unresolved questions

1. **`Risks.pdf`** (17 pages, `assets/document-pdf-templates/Risks.pdf`) is
   shipped and offered in the starter package, but has **no counterpart in the
   source directory**. Its provenance and current legal version are unverified.
2. **`zayavlenie-tip-in-fl.html` / `zayavlenie-tip-in-ul.html`** ("Заявление о
   присоединении Тип ИН") exist as legacy HTML templates with **no source
   DOCX**. Should they be dropped, or is a source document expected?
3. **`client-notifications`** (УВЕДОМЛЕНИЯ.pdf) — which values, if any, must be
   drawn into the original 10 pages? It is currently issued unmodified.
4. **`transfer-requisites`** (ПРИЛОЖЕНИЕ 4) appears to be a pure reference sheet
   of the broker's bank details with no client-specific values. Confirm whether
   it needs any dynamic data at all.
5. **Passport issue date format.** The printed slot «__» ______г. is 38 pt wide
   — too narrow for a spelled-out month ("апреля 2008" ≈ 46 pt at 8.5 pt). The
   map currently prints `MM.YYYY` (e.g. «20» 04.2008 г.). Confirm acceptable.
6. **Signature name.** The `(_________)` slot holds ~11 characters. The renderer
   prints "Фамилия И.О.", falls back to the surname alone, and fails loudly if
   even that cannot fit (roughly beyond a 15-character surname).

## Source document defects (reported, not silently corrected)

| Document | Observation |
| --- | --- |
| ПРИЛОЖЕНИЕ 1А (ФЛ) | §8 contains the URL **`htths://www.investica.ru`** twice — "htths" should presumably be "https". Left exactly as written in the source. |
| ПРИЛОЖЕНИЕ 1А (ФЛ) | §2 uses "ООО Инвестика" without the usual «» quotation marks, inconsistent with the rest of the document. |
| ПРИЛОЖЕНИЕ 7 | Filename contains placeholder padding: `ФОРМЫ ПОРУЧЕНИЙ_____[1].docx`. |
