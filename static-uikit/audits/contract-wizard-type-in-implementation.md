# Contract Wizard — Type IN Application Type Implementation

**Date:** 2026-05-15
**Branch:** main
**Task type:** SAFE IMPLEMENTATION — contract wizard application type tabs + Type IN application flow

---

## Files Changed

### New files
| File | Purpose |
|------|---------|
| `static-uikit/assets/document-templates/zayavlenie-tip-in-fl.html` | Type IN document template — Appendix 1A (individuals) |
| `static-uikit/assets/document-templates/zayavlenie-tip-in-ul.html` | Type IN document template — Appendix 1B (legal entities / foreign structures) |
| `static-uikit/assets/css/document-templates/zayavlenie-tip-in-fl.css` | Document template styles for zayavlenie-tip-in-fl.html |
| `static-uikit/assets/css/document-templates/zayavlenie-tip-in-ul.css` | Document template styles for zayavlenie-tip-in-ul.html (adds `.applicant-table` for legal entity fields) |

### Modified files
| File | Change summary |
|------|---------------|
| `static-uikit/pages/contract-wizard.html` | Added application type tab switcher; moved person type selector to shared area; wrapped existing sections in standard panel; added Type IN panel with individual and legal sub-panels |
| `static-uikit/assets/css/pages/contract-wizard.css` | Added `.crm-contract-application-switch`, `.crm-contract-application-tab`, `.crm-type-in-note`, `.crm-legal-text-preview`, `.crm-type-in-backoffice` styles |
| `static-uikit/assets/js/crm-static.js` | Extended `collectData()` with Type IN fields and checks; added contract wizard tab IIFE |

---

## Tabs Added

Two application type tabs were added at the top of the contract wizard form:

| Tab ID | Label | Type |
|--------|-------|------|
| `app-tab-standard` | Заявление о присоединении | `standard` (default, aria-selected=true) |
| `app-tab-type-in` | Заявление о присоединении Тип ИН | `type-in` |

ARIA attributes used: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, `role="tabpanel"`, `hidden` on inactive panel.

---

## Person Type Selector

The `name="personType"` radio group (legal / individual / entrepreneur) was moved to a shared position **above both panels**, inside the `<form>` but outside the panel `<div>` wrappers. Both application type flows read the same selector state.

---

## Type IN Individual/Legal Behavior

**Data attributes used:**
- `data-type-in-person-panel="individual"` — shown for `individual` and `entrepreneur`
- `data-type-in-person-panel="legal"` — shown for `legal`

**Default state:** When the Type IN tab is opened, the legal sub-panel is shown by default (matching the pre-selected `legal` personType on the page).

**Individual sub-panel content** (Appendix 1A source):
- Заявитель: ФИО, документ, серия, номер, кем выдан, дата выдачи, гражданство, дата рождения, адрес регистрации, представитель, документ-основание
- Присоединение (к Регламенту при обслуживании иностранных инвесторов; к Депозитарному договору)
- Счёт депо типа «Ин» + оператор
- Получение отчётов (4 варианта)
- Брокерское обслуживание + тарифы (ФР + СР MOEX), note about derivatives not yet offered
- Банковский счёт типа «Ин» (org, BIC/SWIFT, account, currency)
- Подтверждения: language confirmation + collapsible legal text block
- Контактные данные (телефон, email)
- Бэк-офис (collapsible `<details>`: reg number, contracts, client code, depo account, officer)

**Legal sub-panel content** (Appendix 1B source):
- Заявитель: полное наименование, иностранное наименование, страна регистрации, рег. номер, дата и орган регистрации, ИНН (при наличии), адрес, ФИО и должность подписанта, документ полномочий, реквизиты доверенности/представитель
- Same subsequent sections as individual with legal-specific wording (no passport fields, no birth date)

---

## ИП Mapping Decision

`entrepreneur` is mapped to the **individual (FL) Type IN sub-panel** (`data-type-in-person-panel="individual"`).

A helper note `<p id="tin-entrepreneur-note" class="crm-type-in-note">` reading _"Для ИП используется вариант заявления для физических лиц."_ is shown by JavaScript when `personType === 'entrepreneur'` and the Type IN panel is active.

For the export button, `entrepreneur` maps to the `zayavlenie-tip-in-fl` template (same as `individual`). No separate ИП Type IN template exists in the DOCX source material.

---

## Document Templates Added

| Template file | Source | Used when |
|---------------|--------|-----------|
| `zayavlenie-tip-in-fl.html` | DOCX Appendix 1А | Type IN tab + individual or entrepreneur |
| `zayavlenie-tip-in-ul.html` | DOCX Appendix 1В | Type IN tab + legal |

Templates follow the existing pattern: `document-template-base.css` + template-specific CSS, `data-doc-field` and `data-doc-check` attributes filled by the existing `fillTemplateDoc()` JS function.

Field prefix convention: `tin-` for FL template, `tin-ul-` for UL template.

---

## Export Button Switching Behavior

The single `[data-action="export-statement"]` button's data-attributes are updated by the `syncExportButton()` function in `crm-static.js`. The existing fetch-and-fill export IIFE reads `data-template-url` at click time, so attribute updates take effect immediately.

| Application type | Person type | `data-document-template` | `data-template-url` | Button label |
|-----------------|------------|--------------------------|---------------------|--------------|
| standard | any | `zayavlenie-o-prisoedinenii-fl` | `…/zayavlenie-o-prisoedinenii-fl.html` | Выгрузить заявление |
| type-in | individual | `zayavlenie-tip-in-fl` | `…/zayavlenie-tip-in-fl.html` | Выгрузить заявление Тип ИН |
| type-in | entrepreneur | `zayavlenie-tip-in-fl` | `…/zayavlenie-tip-in-fl.html` | Выгрузить заявление Тип ИН |
| type-in | legal | `zayavlenie-tip-in-ul` | `…/zayavlenie-tip-in-ul.html` | Выгрузить заявление Тип ИН |

---

## Validation Commands and Results

```
npm run static:uikit:bundle
  ✓ Bundle written → static-uikit/assets/css/crm-static.bundle.css
    Sections inlined : 40 / 40
    Output size      : 240.7 KB

npm run static:uikit:bundle:check
  ✓ Bundle is up to date (40 / 40 sections, 240.7 KB)

npm run static:uikit:validate
  ✓ Validation passed.
    Pages checked           : 29
    CSS imports in manifest : 40
    Bundle section markers  : 40
    Local assets checked    : 296
    Errors                  : 0
    Warnings                : 0
```

---

## Deferred Items

- **Real DOCX/PDF export** — the document templates are static HTML used for print-to-PDF via browser. Backend PDF generation (real DOCX rendering, server-side fill) is deferred to UMI.CMS integration.
- **Form validation** — no `data-crm-required` validation was added to Type IN fields; this can be added in a subsequent pass when business rules are confirmed.
- **Derivatives note language** — the "не осуществляется" note in the Срочный рынок row uses a generic placeholder. Should be updated once official regulatory text is confirmed with the legal team.
- **Demo field values** — `collectData()` uses static demo strings for Type IN fields (same pattern as existing standard template). UMI.CMS should provide server-side data binding for real client data.
