# CSS Duplicate and Class Combination Audit

**Project:** Investika CRM static UI handoff  
**Scope source of truth:** `static-uikit/` only  
**Audit type:** CSS duplicate and HTML class-combination audit only  
**Implementation status:** CSS cleanup Tasks A-D2 completed; HTML/JS class-combination simplification remains deferred.

Task C status note (2026-05-08): DONE - pagination/footer/page-size chip styles were consolidated into shared CRM pagination classes in `components/tables.css`; page CSS now keeps only compact middle-office/depository overrides.

Task D2 status note (2026-05-08): corrected / DONE - `components/tables.css` internal housekeeping cleanup complete. Removed 2 outdated single-property rules (`.crm-table .uk-table th { white-space: nowrap }` and `.crm-table .uk-table td { vertical-align: middle }`), merged 2 inline `.crm-table-wrapper` blocks into one, consolidated duplicate `.crm-table tbody tr:hover` rules. Bundle regenerated with all 37 CSS sections, zero @import statements. No HTML/JS/page CSS changed.

Form/search cleanup status note (2026-05-08): DONE - registry filter/search overrides were moved out of `components/forms.css` into `components/tables.css`; exact search shell/icon duplicates and duplicate search-input sizing declarations were removed because `components/filters.css` already supplies them. Generic CRM form-control rules were left unchanged. Bundle regenerated; no HTML/JS/page CSS changed.

Filter/table overlap cleanup status note (2026-05-08): DONE - removed redundant registry search-row width, registry filter-actions flex alignment, and registry panel box-sizing/overflow declarations where shared filter primitives already provide the same computed styles. Registry-specific spacing, sizing, colors, and table placement remain unchanged. Bundle regenerated; no HTML/JS/forms/page CSS changed.

Forms internal cleanup status note (2026-05-08): checked / SKIPPED - no safe same-file duplicate was found in `components/forms.css`. The apparent `min-height: 36px` overlap is retained for separate CRM-only and UIkit control contracts. No CSS/bundle regeneration needed; no HTML/JS/filter/table/page CSS changed.

Task D6 address/FIAS status note (2026-05-08): DONE - duplicated subject register/edit address rows, address display/editor controls, FIAS panel, combobox, preview, fallback, and same-address note styles were extracted to `components/address.css`. Page CSS keeps only page-specific address section spacing, register-only FL address blocks, and each page's responsive breakpoint rules. HTML/JS/classes/hooks/data attributes were not changed; `crm-static.css` now imports the address component and the bundle was regenerated with 38 CSS sections.

Task D11 source CSS readability/header consistency status note (2026-05-08): DONE - `components/address.css`, `components/subject-form.css`, and `components/registry.css` were reformatted for source readability without behavior changes. `crm-static.bundle.css` header was normalized to the stable generated bundle format. No HTML/JS/classes/hooks/data attributes were changed.

Task D11b source CSS formatting correction status note (2026-05-08): DONE - `components/address.css`, `components/subject-form.css`, and `components/registry.css` are now readable multi-line source CSS files. No selectors, property values, or CSS behavior were changed. No HTML/JS/classes/hooks/data attributes were changed.

Task D11c source CSS formatting correction status note (2026-05-08): corrected / DONE - `components/address.css`, `components/subject-form.css`, and `components/registry.css` were actually reformatted as readable multi-line source CSS files with selector-line opening braces. No selectors, property values, or CSS behavior were changed. No HTML/JS/classes/hooks/data attributes were changed.

---

## 1. Executive summary

CSS duplicate cleanup is feasible, but it should start with very small CSS-only edits. The safest work is inside single component files where identical declarations already target equivalent button/date/table primitives. Cross-page consolidation is also possible, but it has more cascade risk because many page files intentionally restyle shared registry/table/filter structures.

HTML class-combination reduction is **not** recommended now. The pages use a deliberate UIkit + CRM composition model: UIkit classes provide baseline component behavior/layout, while `crm-*` classes provide project-specific visual language and JS hook semantics. Reducing combinations should be a separate follow-up after CSS-only cleanup and visual smoke checks.

Recommended order:

1. CSS-only duplicate cleanup.
2. Visual smoke check.
3. Class-combination audit follow-up.
4. Only then optional HTML class simplification.

Top 5 safest cleanup candidates:

1. `components/buttons.css`: consolidate the identical default/secondary button colors for `.crm-button-secondary`, `.uk-button.crm-button-secondary`, and `.uk-button-default`.
2. `components/forms.css`: consolidate the duplicated date-picker indicator hiding rules.
3. `components/buttons.css`: inspect duplicated base button sizing between `.crm-button`, `.uk-button.crm-button`, and `.uk-button` before touching page CSS.
4. `components/tables.css`: merge repeated same-selector `.crm-table-wrapper` housekeeping only while preserving current final computed values.
5. Footer/page-size chip styling: later consolidate repeated `.crm-footer-chip` active/disabled/focus patterns, but keep the existing page-specific selectors until checked.

Top 5 risky areas not to touch yet:

1. HTML `uk-* + crm-*` combinations, especially form controls, buttons, grids, tables, icons, tabs, and switchers.
2. `responsive.css`, because it intentionally wins late in the cascade and documents why its overrides exist.
3. Registry/table shells where `.crm-table`, `.crm-table-wrapper`, page-specific table classes, and `uk-table` interact.
4. JS state and data hooks: `.is-active`, `.is-selected`, `.is-filter-hidden`, `.is-page-hidden`, `.is-disabled`, `.is-sorted-*`, `.crm-footer-chip`, `data-*` hooks.
5. Document-template CSS under `assets/css/document-templates/`; it must remain isolated from app CSS.

Final high-level verdict: **Ready for CSS-only cleanup**, starting with `static-uikit/assets/css/components/buttons.css` only. **Do not simplify HTML class combinations now.**

---

## 2. Methodology

Inspected files:

- `static-uikit/assets/css/crm-static.css`
- `static-uikit/assets/css/base/*.css`
- `static-uikit/assets/css/layout/*.css`
- `static-uikit/assets/css/components/*.css`
- `static-uikit/assets/css/pages/*.css`
- `static-uikit/assets/css/responsive.css`
- `static-uikit/assets/css/print.css`
- `static-uikit/pages/*.html`
- `static-uikit/assets/js/crm-static.js`
- `static-uikit/assets/js/pages/*.js`

Explicitly not audited as source CSS:

- `static-uikit/assets/css/uikit.min.css` internals
- `static-uikit/assets/css/crm-static.bundle.css`
- `static-uikit/assets/css/document-templates/*`, except for the handoff note that document CSS must stay isolated
- React/Vite source, public assets, old packs, partials, manifests, validators, and previous audit docs

Duplicate candidates were detected by:

- reading the import order from `crm-static.css`;
- scanning exact repeated selectors, repeated selector blocks, and repeated property/value groups across CSS modules;
- separating exact same-file duplicates from cross-page repeated patterns;
- checking whether repeated declarations are part of state, responsive, print, or page-specific cascade overrides.

HTML class combinations were detected by scanning `class` attributes in `static-uikit/pages/*.html` and counting same-element combinations containing at least one `uk-*` and one `crm-*` class. The scan found 672 class attributes that combine UIkit and CRM classes.

JS/data-hook dependencies were considered by scanning:

- `querySelector`, `querySelectorAll`, `closest`, `matches`;
- `classList.add/remove/toggle/contains`;
- generated `className`;
- `data-*` attributes read or written by JS;
- generated markup in global search, FIAS, document wizard, bank-account editing, subject-card document upload, and agent lookup.

The generated bundle was not used as source of truth because `crm-static.bundle.css` is a handoff artifact generated from the modular CSS entrypoint. It may flatten import boundaries and obscure whether a duplicate belongs to a source module, page override, responsive override, or generated output. Cleanup should happen only in modular source CSS, then the bundle should be regenerated in a later implementation step.

---

## 3. High-confidence CSS duplicate candidates

The table below lists duplicate declarations that can be cleaned without changing HTML, provided the cleanup preserves current computed styles and import order. `Low` means the duplicate is exact and tightly scoped. `Medium` means the duplicate is real, but cascade/import/page coverage must be checked manually. No `High` candidate is recommended as a first cleanup.

| ID | Area | Selectors | Files | Duplicate declarations | Why likely safe | Safe cleanup idea | Risk | Required manual checks |
|----|------|-----------|-------|------------------------|-----------------|-------------------|------|------------------------|
| D01 | Buttons | `.crm-button-secondary`, `.uk-button.crm-button-secondary`, `.uk-button-default` | `static-uikit/assets/css/components/buttons.css` | `background: #fff`; `border: 1px solid var(--crm-input-border)`; `color: var(--crm-text-secondary)` | Exact same declarations in the same file and same button visual role | Merge the repeated declarations into one selector list or keep a single shared rule before variants | Low | Buttons in `dashboard.html`, `subjects.html`, `agents.html`, `subject-card.html`; hover/disabled states |
| D02 | Buttons | `.crm-button`, `.uk-button.crm-button`, `.uk-button`; later `.crm-button`, `.uk-button.crm-button`, `.uk-button` in topbar layer | `components/buttons.css`, `layout/topbar.css` | `min-height`, `border-radius`, `font-size`, `font-weight` overlap | Repeated base sizing is visible and centralized enough to inspect | First only document/inspect; if cleaned later, preserve final topbar computed values (`38px`, `10px`) or move to one intentional layer | Medium | All pages with header actions, registry actions, filter reset, mobile sidebar toggle |
| D03 | Buttons | `.crm-button-primary`, `.uk-button.crm-button-primary`; topbar repeat | `components/buttons.css`, `layout/topbar.css` | primary shadow and radius-related button variant overlap | Variant overlap is explicit and selector set is small | Keep color/border in `buttons.css`; avoid duplicate shadow/radius unless topbar intentionally overrides density | Medium | Primary buttons on `agents.html`, `subject-card.html`, `document-wizard.html`, `trading-card.html` |
| D04 | Forms/date fields | `input[type="date"]::-webkit-calendar-picker-indicator`; `.crm-date-field .crm-date-input::-webkit-calendar-picker-indicator` | `components/forms.css` | `opacity: 0` | Exact property with same purpose in one file | Combine selectors into one rule, keep both selectors | Low | Date triggers on `archive.html`, `depository.html`, `middle-office-reports.html`, `subject-card.html`, `subject-register.html` |
| D05 | Forms/filter inputs | `.crm-input`, `.crm-select`; `.uk-input`, `.uk-select`, `.uk-textarea`; page-specific `.crm-filter-search-input` | `components/forms.css`, `components/filters.css`, page CSS | repeated `min-height`, `height`, `border-radius`, `font-size` | Repetition is real, but some `crm-*` classes may be generated without UIkit classes | Do not remove CRM fallback rules; later consolidate only shared search/date sizing into explicit filter/date primitives | Medium | Generated fields from `document-wizard.js` and `fias-address.js`; native date field icon alignment |
| D06 | Tables | `.crm-table-wrapper` repeated blocks | `components/tables.css` | `border-radius: 12px`; `overflow`/`overflow-x`/`overflow-y`; `max-width`; scrollbar declarations | Same selector repeats in one source file | Merge same-selector housekeeping into one block while preserving the current final `overflow` behavior | Medium | Registry tables on desktop/mobile; horizontal scroll; wrapper radius clipping |
| D07 | Tables | `.crm-table .uk-table`, `.crm-table .uk-table th`, `.crm-table .uk-table td` repeated base blocks | `components/tables.css`, `layout/topbar.css` | `margin`, `min-width`, `font-size`, `padding`, `color`, header background | Real duplication, but later rules intentionally override earlier density/base table pass | Treat as a staged table audit, not first cleanup; preserve final computed values selector by selector | Medium | `subjects.html`, `agents.html`, `compliance.html`, `middle-office-clients.html`, `depository.html` |
| D08 | Filter panels | `.crm-filter-search-icon` across registry/search pages and shared filters | `components/filters.css`, `pages/agents.css`, `archive.css`, `back-office.css`, `brokerage.css`, `compliance.css`, `requests.css`, `search-results.css`, `trading.css`, `trust-management.css` | `position: absolute`; `left: 14px`; `top: 50%`; `transform`; `width/height: 16px`; `color`; `pointer-events: none` | Declaration set is effectively identical across many filter search shells | Later extract to shared `.crm-filter-search-icon`; keep page-specific selectors only for deviations | Medium | All registry filters and global search-looking filter inputs; mobile `responsive.css` rules |
| D09 | Filter panels | `.crm-filter-search-input` in agents/archive/requests/search-results/trust-management and shared filters | Same as D08 plus `components/filters.css` | `width: 100%`; `height/min-height: 40px`; `padding: 0 12px 0 44px`; `border-radius`; `box-sizing` | Consistent search field construction | Later extract a shared 40px search-input primitive; do not change `data-filter-search` or generated date wrappers | Medium | Registry filters at 480px/640px/900px breakpoints |
| D10 | Pagination/footer chips | page-size/nav groups and chips across registry pages | `pages/agents.css`, `archive.css`, `back-office.css`, `brokerage.css`, `compliance.css`, `depository.css`, `middle-office.css`, `requests.css`, `subjects.css`, `trading.css`, `trust-management.css` | repeated `display: flex; align-items: center; gap: 8px`; chip active state; disabled nav button state | The HTML already uses `crm-footer-chip` for page-size chips | Later consolidate chip states under `.crm-footer-chip`; use selector lists for nav buttons unless a shared class is added in a separate HTML task | Medium | Pagination JS: `data-page-size-group`, `.crm-footer-chip`, `data-pagination-nav`, `is-disabled` |
| D11 | Registry shells | `.crm-agents-shell`, `.crm-archive-shell`, `.crm-requests-shell`; similar back-office/brokerage/trading/trust shells | Page CSS files | repeated shell card declarations: `display: grid`, `gap: 16px`, `padding`, `border`, `border-radius: 18px`, `background`, `box-shadow`, `box-sizing`, `min/max-width` | These page shells are visually the same registry pattern | Later extract shared registry-shell declarations while keeping page-specific selector list; no HTML change required if selectors are grouped | Medium | All registry shell pages plus responsive shell padding rules |
| D12 | Sort indicators | page-scoped `.crm-th-sort` | `pages/brokerage.css`, `compliance.css`, `subjects.css`, `trading.css`, `trust-management.css` | `font-size: 11px`; `margin-left: 5px`; `opacity: 0.55` | Exact sort glyph style repeated on sortable tables | Move to shared sortable-table style if it does not conflict with `[data-sortable-table] .crm-th-sort` opacity rules | Medium | Sorting click/focus states and `aria-sort` on sortable registry pages |
| D13 | Sidebar/topbar icons | `.crm-sidebar .crm-nav-link svg.crm-nav-icon`, `.crm-sidebar .crm-nav-icon` | `layout/app.css`, `layout/sidebar.css` | exact 24px icon sizing/flex/display block set | Exact declaration set duplicated between base shell and sidebar parity layer | Keep one source of truth only after verifying import order and sidebar parity intent | Medium | Sidebar icons, active groups, mobile off-canvas sidebar |
| D14 | FIAS/address widgets | `.crm-fias-*`, `.crm-address-parts-*` in subject edit/register | `pages/subject-edit.css`, `pages/subject-register.css` | repeated combobox menu, preview, panel, footer, address-parts editor/input styles | Same FIAS/address module appears in both subject edit and register flows | Later extract a shared FIAS/address component stylesheet; keep generated class names unchanged | Medium | `subject-edit.html`, `subject-edit-individual.html`, `subject-register.html`; `fias-address.js` generated markup |
| D15 | Subject-card tab tables | `[data-tab-panel="documents"]`, `relations`, `contracts`, `accounts`, `history` table wrapper/table rules | `pages/subject-card.css` | repeated table-wrapper, inner table, `thead`, `th` declarations across tab panels | Repetition is grouped in selector lists already, so cleanup can remain local | Keep grouped selector lists; only remove redundant earlier single-panel blocks after visual verification | Medium | `subject-card.html`, `subject-card-individual.html`, tab switching and document table actions |

Notes:

- Do not treat repeated `background`, `border-radius`, `padding`, or `font-size` alone as a cleanup candidate. These are common design tokens and often intentional page-density overrides.
- The safest first actual cleanup remains **D01 in `components/buttons.css` only**.

---

## 4. Intentional overlaps - do not remove blindly

| Overlap | Why it exists | What could break if removed | Future cleanup possible? |
|---------|---------------|-----------------------------|--------------------------|
| `.uk-button` + `.crm-button` | UIkit provides button baseline; CRM provides project sizing/colors and selectors such as `.uk-button.crm-button` | Button height, padding, text transform, disabled state, focus state, filter reset buttons, generated FIAS buttons | Maybe, after `.crm-button` fully replaces the UIkit baseline and all button states are visually checked |
| `.uk-button-default` + `.crm-button` / `.crm-button-ghost` / `.crm-button-secondary` | UIkit default button surface combines with CRM variant styling | Default/ghost border and hover states can drift; some pages rely on both classes | Maybe later, but not during initial cleanup |
| `.uk-input` / `.uk-select` / `.uk-textarea` + `.crm-input` / `.crm-select` | UIkit normalizes form controls; CRM supplies tokens and page-specific density | Inputs/selects may lose base reset, height, select arrow behavior, focus styling, or generated FIAS/document-wizard compatibility | Maybe later after a full standalone CRM form-control implementation |
| `.uk-table` + CRM table wrappers or table-specific classes | Registry tables usually use a CRM wrapper (`.crm-table`, `.crm-table-wrapper`) around a UIkit table; detail tables often use `uk-table uk-table-divider uk-table-small crm-*-table` | Table divider, hover, compact spacing, sticky/overflow wrappers, CSV/sort selectors | Keep for now; direct simplification is risky |
| `.uk-card` + `.crm-card` | UIkit card/body padding combines with CRM surface/border/radius | Card body spacing and page-header/create-panel layout can change | Maybe later for low-frequency cards |
| `uk-grid`, `uk-width-*`, `uk-switcher`, `uk-tab`, `uk-icon` with CRM classes/attributes | UIkit layout and JS behavior are active dependencies | Responsive grids, tabs/switchers, rendered icons | Do not simplify unless replacing the UIkit behavior |
| `.crm-badge` + `.success/.warning/.danger/.info/.muted` and page status variants | Base badge geometry is shared; status/page variants intentionally set semantic color | Status colors and table chips can become semantically wrong | Possible only through a tokenized badge-status system |
| `.active`, `.is-active`, `.is-selected`, `.is-disabled`, `.is-invalid`, `.is-filter-hidden`, `.is-page-hidden`, `.is-sorted-*` | State classes are toggled by JS or represent UI states | Filters, pagination, sorting, selectable controls, auth validation, tabs/cards | Do not remove; only rename with JS+HTML migration |
| Page-specific table/header colors | Registry pages use similar but not always identical table density and status semantics | Header contrast, row hover, column width, sort visibility | Possible after page-by-page visual regression |
| `responsive.css` overrides | It is imported late and intentionally wins specificity/cascade ties | Mobile sidebar, filter panel wrapping, table overflow, footer stacking, subject-card tabs | Do not clean during duplicate cleanup except in a dedicated responsive audit |
| `print.css` and document-template CSS | `print.css` is intentionally minimal; document templates have isolated print styles | UMI/PHP document output can inherit app UI styles accidentally | Keep isolated |

---

## 5. UIkit + CRM class combinations in HTML

Frequency scale used here:

- High: 100+ occurrences or a cross-site shell pattern.
- Medium: 20-99 occurrences.
- Low: fewer than 20 occurrences.

Inventory from `static-uikit/pages/*.html`:

| Combination | Approx. frequency | Role of `uk-*` | Role of `crm-*` | Can simplify later? | Required checks before simplification |
|-------------|-------------------|----------------|-----------------|---------------------|--------------------------------------|
| `uk-button uk-button-text crm-link-action` | High, about 260 | UIkit text-button reset/inline action baseline | CRM link color, weight, no-decoration action style | Maybe | Link/action visual parity, keyboard focus, table row action spacing |
| `uk-input crm-input` | High, about 173 including date/search variants | UIkit input baseline | CRM sizing, colors, generated form compatibility | Maybe | Every form page; FIAS generated fields; document wizard generated fields; focus and disabled states |
| `uk-button crm-button` | High, about 142 | UIkit button baseline | CRM height/radius/font and variants | Maybe | All primary/default/ghost/secondary buttons; disabled buttons; mobile sidebar toggle |
| `uk-button uk-button-default crm-button` | High, about 107 | UIkit default button surface | CRM common button size and page variants | Maybe | Ghost/filter reset/export/edit buttons; hover/focus/disabled states |
| `uk-icon` attribute on CRM elements | High, about 102 | UIkit icon renderer | CRM icon wrapper positioning, size, color | No | UIkit JS/icon rendering; sidebar chevrons, search icon, date/calendar triggers |
| `uk-button crm-button-primary` | Medium, about 35 | UIkit button baseline | CRM primary color/shadow/variant | Maybe | Header actions, wizard actions, bank/document actions |
| `uk-grid-small` / `uk-width-*` + `crm-form-grid` | Medium, about 32 class attrs plus many child width classes | UIkit grid and responsive columns | CRM form grouping/spacing hook | No for now | Full form-grid replacement would require new responsive CSS and visual regression |
| `uk-select crm-select` | Medium, about 28 | UIkit select baseline | CRM select sizing/appearance | Maybe | Select arrow, height, disabled/focus, generated selects in document wizard |
| `uk-textarea crm-input` | Low, about 9 | UIkit textarea baseline | CRM shared input visual | Maybe | Address outputs, compliance notes, document wizard textareas |
| `uk-card uk-card-body crm-card` | Low, 3 direct instances | UIkit card body padding | CRM card surface/radius/border | Maybe | Error page, requests create panel, subject-register page header |
| `uk-table ... crm-*-table` | Low direct same-element, about 12; direct `uk-table crm-table` not found | UIkit table/divider/hover/small classes | CRM page-specific table styling | Keep as-is | Dashboard and subject-card tab tables; do not confuse with wrapper `.crm-table` |
| `uk-switcher crm-subject-switcher` / `uk-switcher crm-trading-switcher` | Low | UIkit switcher JS | CRM tab-panel styling hook | No | UIkit JS dependency |

Important finding: direct same-element `uk-table crm-table` was not found. The common pattern is wrapper composition:

- outer CRM wrapper such as `.crm-table-wrapper` / `.crm-table`;
- inner `table.uk-table`;
- sometimes a table-specific CRM class such as `.crm-documents-table`.

This means table class simplification cannot be a simple class removal. It would require a table architecture pass.

Conservative recommendation: keep all `uk-* + crm-*` combinations as-is until CSS-only duplicate cleanup is complete and visually verified.

---

## 6. JS/CSS contract check

Do not touch the following during duplicate cleanup. These are classes/data hooks used directly by JS, state classes added/removed by JS, or generated markup classes.

| Class / data hook | JS file | Behavior | Risk if changed |
|-------------------|---------|----------|-----------------|
| `.crm-app`, `.crm-sidebar`, `[data-sidebar-toggle]`, `.sidebar-open`, `.crm-sidebar-overlay` | `assets/js/crm-static.js` | Mobile sidebar open/close; JS injects overlay button | Sidebar stops opening/closing or overlay loses styling |
| `.crm-option-grid`, `.crm-option-card`, `.is-selected` | `assets/js/crm-static.js`, `pages/subject-register.js` | Radio-card selection state | Registration/wizard option cards lose selected state |
| `.crm-binary-control`, `.is-active` | `assets/js/crm-static.js`, `pages/subject-register.js` | Binary pill/radio selected state | Binary controls no longer show active state |
| `.crm-radio-tile`, `.crm-check-row`, `.is-active`, `.is-selected` | `assets/js/crm-static.js` | Tile/check-row state sync | Check/radio cards lose visual state |
| `[data-auth-form]`, `[data-auth-required]`, `[data-auth-error-for]`, `[data-auth-alert]`, `.is-invalid` | `assets/js/crm-static.js` | Auth form validation | Validation messaging and invalid state break |
| `.crm-filter-panel`, `.crm-registry-filters`, `.crm-filter-menu`, `.crm-filter-option`, `.crm-filter-trigger-value`, `.is-filter-menu-open`, `.is-selected` | `assets/js/crm-static.js` | Custom filter menus and reset state | Filters stop applying or menu z-index/selected state breaks |
| `[data-filter]`, `[data-filter-search]`, `[data-filter-option]`, `[data-filter-value]`, `tbody tr[data-filter-*]`, `[data-action="reset-filters"]` | `assets/js/crm-static.js`, `pages/middle-office.js` | Static table/list filtering | Search/filter behavior breaks |
| `.is-filter-hidden`, `.is-page-hidden`, `[data-page-size-group]`, `.crm-footer-chip`, `[data-page-size-value]`, `[data-pagination-nav]`, `.is-disabled` | `assets/js/crm-static.js`, `pages/middle-office.js` | Client-side pagination and footer chips | Rows show wrong page, disabled nav styling breaks |
| `[data-sortable-table]`, `.crm-th-sort-button`, `th[data-sort-key]`, `.crm-th-sort`, `.is-sorted-asc`, `.is-sorted-desc`, `[data-sort-value]` | `assets/js/crm-static.js` | Sortable registry tables | Sorting UI and `aria-sort` state break |
| `[data-action="export-table-csv"]`, `[data-export-filename]`, `[data-export-ignore]`, `.crm-export-ignore`, `.crm-th-label` | `assets/js/crm-static.js`, `pages/middle-office.js` | CSV export | Wrong columns exported or export cannot find table |
| `[data-date-trigger]`, `[data-date-picker-trigger]`, `[data-date-input]`, `.crm-date-field`, `.crm-filter-date-control`, `.crm-dep-date-wrap` | `assets/js/crm-static.js` | Native date picker trigger | Calendar buttons stop opening related date inputs |
| `.crm-search`, `.is-search-preview-open`, generated `.crm-search-preview`, `.crm-search-preview-results`, `.crm-search-preview-item`, `.crm-search-preview-empty`, `[data-role="global-search-*"]` | `assets/js/crm-static.js` | Global search preview generated markup | Search preview loses styling or accessibility wiring |
| `[data-entity="request-create-panel"]`, `[data-action="toggle-request-create"]`, `[data-action="close-request-create"]` | `assets/js/crm-static.js` | Requests create panel | Panel toggle breaks |
| `[data-agent-form]`, `[data-entity="agent-subject-search"]`, generated `.crm-agents-subject-lookup`, `.crm-agents-subject-option`, `[data-action="select-agent-subject"]` | `assets/js/crm-static.js` | Agent subject lookup | Agent creation subject picker breaks |
| `[data-entity="bank-account-form"]`, `[data-entity="bank-account-list"]`, generated `.crm-bank-account-card`, `[data-action="edit-bank-account"]`, `[data-action="submit-bank-account-form"]` | `assets/js/pages/subject-card.js` | Subject card bank account editing | Bank cards/forms stop updating |
| `[data-entity="document-form"]`, `[data-role="document-dropzone"]`, `[data-role="document-file-input"]`, `[data-role="document-file-preview"]`, `.is-dragover`, `.is-error`, `[data-action="submit-document-form"]` | `assets/js/pages/subject-card.js` | Subject card document upload | Upload preview/dropzone styling and validation break |
| `.crm-modal-open`, `[data-role="representative-modal"]`, `[data-action="open-representative-modal"]`, `[data-action="close-representative-modal"]` | `assets/js/pages/subject-card.js`, `pages/trading-card.js` | Modal open/close body state | Modal scroll/backdrop behavior can break |
| `[data-address-module]`, `[data-fias-address-widget]`, `[data-fias-field]`, `[data-fias-panel]`, `[data-address-output]`, `[data-address-same-as]`, generated `.crm-fias-*`, `.crm-address-parts-*` | `assets/js/pages/fias-address.js`, `pages/subject-edit.js`, `pages/subject-register.js` | FIAS address module and manual address parts editor | Address widget/rendered combobox/editor breaks |
| `.crm-wizard-step-active`, `.crm-wizard-step-done`, `.is-disabled`, generated `.reg-bank-row` | `assets/js/pages/subject-register.js` | Subject registration wizard and bank rows | Wizard steps and bank row state break |
| `.crm-docwiz-*`, `.crm-input-error`, `.is-checked`, `[data-doc-id]`, `[data-field-key]`, `[data-check-key]`, `[data-doc-field]`, `[data-doc-check]` | `assets/js/pages/document-wizard.js`, `assets/js/crm-static.js` | Document wizard generated form fields and template filling | Generated document fields/checkmarks break |
| `.crm-mo-report-item`, `.crm-mo-detail-field-value`, `.crm-mo-status-*`, `[data-detail]`, `[data-entity="mo-report-list"]`, `[data-role="mo-report-pagination"]` | `assets/js/pages/middle-office.js` | Middle-office master-detail reports list | Detail panel, filters, pagination, status styling break |
| `[data-action="contract-edit-save"]`, `[data-action="contract-edit-draft"]`, `[data-action="contract-edit-export"]`, generated `.crm-contract-edit-toast` | `assets/js/pages/contract-edit.js` | Contract edit feedback/toast | Save/draft/export feedback breaks |
| `[data-action="issue-terminal"]`, `[data-action="reset-terminal-password"]`, `[data-role="terminal-password-modal"]`, generated `.crm-trading-toast` | `assets/js/pages/trading-card.js` | Trading card actions and terminal password modal | Trading actions/modal feedback break |
| `[data-action="export-statement"]`, `[data-template-url]`, `[data-pdf-endpoint]`, `[data-document-template]`, `[data-doc-field]`, `[data-doc-check]` | `assets/js/crm-static.js` | Statement/document export handoff | PDF/print document generation breaks |

Depository note: no dedicated `depository.js` exists in the inspected `assets/js/pages` list. `depository.html` still participates in generic date/filter/pagination behavior through `crm-static.js` hooks and page-specific `crm-dep-*` classes, so those selectors should be preserved.

---

## 7. CSS-only cleanup plan

This plan is for a future implementation pass. It does not require HTML or JS changes.

### Task A: buttons.css duplicate cleanup — **DONE 2026-05-08**

Goal: remove the smallest exact duplicate in button variant declarations.

Allowed files:

- `static-uikit/assets/css/components/buttons.css`

Forbidden files:

- all HTML, JS, `crm-static.bundle.css`, `README.md`, `INDEX.html`, React/Vite files, old packs, partials, manifests, validators, document templates

Exact selectors to inspect:

- `.crm-button-secondary`
- `.uk-button.crm-button-secondary`
- `.uk-button-default`
- `.crm-button`
- `.uk-button.crm-button`
- `.uk-button`
- `.crm-button-primary`
- `.uk-button.crm-button-primary`

Expected changes:

- First cleanup should only consolidate identical `background`, `border`, `color` declarations shared by secondary/default buttons.
- No page-specific CSS changes.
- No HTML/JS changes.

Acceptance criteria:

- Computed styles for default, secondary, ghost, primary, disabled, and hover buttons remain unchanged.
- No selector used by JS or HTML is removed.

Manual checks:

- `dashboard.html`
- `subjects.html`
- `subject-card.html`
- `agents.html`
- `document-wizard.html`

Risk level: Low.

### Task B: forms/date fields cleanup — date-picker indicator duplicate cleanup **DONE 2026-05-08**

Goal: consolidate exact date-picker indicator hiding and inspect duplicated form-control sizing.

Allowed files:

- `static-uikit/assets/css/components/forms.css`
- optionally `static-uikit/assets/css/components/filters.css` only after the date-only change is verified

Forbidden files:

- HTML, JS, bundle, document-template CSS, page CSS during the first date-only step

Exact selectors to inspect:

- `input[type="date"]::-webkit-calendar-picker-indicator`
- `.crm-date-field .crm-date-input::-webkit-calendar-picker-indicator`
- `.crm-date-field .crm-date-input`
- `.crm-date-trigger`
- `.crm-input`
- `.crm-select`
- `.uk-input`
- `.uk-select`
- `.uk-textarea`

Expected changes:

- Combine exact date-picker indicator opacity rules.
- Do not remove `.crm-input` or `.crm-select` fallback sizing yet.

Acceptance criteria:

- Date trigger still opens the native date picker.
- Calendar icon alignment remains unchanged.
- Generated fields from document wizard and FIAS still match form styling.

Manual checks:

- `archive.html`
- `middle-office-reports.html`
- `depository.html`
- `subject-card.html`
- `subject-register.html`

Risk level: Low for indicator rule; Medium for broader form-control sizing.

### Task C: pagination/footer chips consolidation

Goal: reduce repeated registry footer chip/nav declarations without changing HTML.

Allowed files:

- relevant page CSS files under `static-uikit/assets/css/pages/`
- optionally a component CSS file only if the current import order is preserved

Forbidden files:

- HTML, JS, bundle, generated artifacts

Exact selectors to inspect:

- `.crm-footer-chip`
- `*-footer-chip`
- `*-footer-chip.is-active`
- `*-footer-nav-button`
- `*-footer-nav-button:disabled`
- `*-footer-page-size`
- `*-footer-nav`
- depository/middle-office pagination equivalents

Expected changes:

- Prefer shared `.crm-footer-chip` styles for chips already carrying that class.
- Keep page-specific nav-button selectors unless a later HTML task adds a shared nav-button class.
- Preserve `data-page-size-group`, `data-page-size-value`, and `data-pagination-nav` behavior.

Acceptance criteria:

- JS pagination still toggles `.is-active`, `.is-disabled`, and `aria-*`.
- Footer wraps correctly at `max-width: 480px`.

Manual checks:

- `subjects.html`
- `agents.html`
- `middle-office-reports.html`
- `depository.html`
- `trading.html`

Risk level: Medium.

### Task D: registry shell/table/filter cleanup

Goal: consolidate repeated registry shell, filter search, and table wrapper patterns after button/forms cleanup.

Allowed files:

- `static-uikit/assets/css/components/filters.css`
- `static-uikit/assets/css/components/tables.css`
- selected page CSS files under `static-uikit/assets/css/pages/`

Forbidden files:

- HTML, JS, bundle, document templates

Exact selectors to inspect:

- `.crm-registry-shell`
- page shells such as `.crm-agents-shell`, `.crm-archive-shell`, `.crm-requests-shell`, `.crm-trading-shell`
- `.crm-registry-filters.crm-filter-panel`
- `.crm-filter-search-shell`
- `.crm-filter-search-icon`
- `.crm-filter-search-input`
- `.crm-filter-fields-row`
- `.crm-filter-actions`
- `.crm-table-wrapper`
- `.crm-table`
- `.crm-table-card`
- `.crm-th-sort`

Expected changes:

- Start with exact cross-page selector-list consolidation for repeated filter icon/search declarations.
- Do not rewrite `.crm-table` architecture in the same task.
- Keep page-specific selectors where they carry different widths, colors, scroll behavior, or responsive fixes.

Acceptance criteria:

- Registry filters apply.
- Tables scroll horizontally without page overflow.
- Sort indicators and row hover states remain visible.
- Empty-state visibility remains correct after filters.

Manual checks:

- `subjects.html`
- `agents.html`
- `brokerage.html`
- `compliance.html`
- `trading.html`
- `trust-management.html`
- `middle-office-reports.html`
- `depository.html`

Risk level: Medium.

### Task E: token duplication check

Goal: clarify duplicated shell tokens and sidebar/topbar parity declarations.

Allowed files:

- `static-uikit/assets/css/base/tokens.css`
- `static-uikit/assets/css/layout/app.css`
- `static-uikit/assets/css/layout/sidebar.css`
- `static-uikit/assets/css/layout/topbar.css`
- `static-uikit/assets/css/responsive.css` only for inspection, not first edits

Forbidden files:

- HTML, JS, bundle, page CSS during first token check

Exact selectors/tokens to inspect:

- `:root`
- `--crm-topbar-h`
- `--crm-sidebar-w`
- `.crm-layout`
- `.crm-sidebar`
- `.crm-sidebar-brand`
- `.crm-nav-link`
- `.crm-nav-icon`
- `[data-sidebar-toggle]`

Expected changes:

- Prefer documenting the winning token source before editing.
- Only remove exact duplicate declarations after confirming import order and computed values.

Acceptance criteria:

- Desktop sidebar width/topbar height unchanged.
- Mobile off-canvas sidebar and overlay unchanged.
- Active nav link styling unchanged.

Manual checks:

- `dashboard.html`
- `subjects.html`
- `subject-card.html`
- `document-wizard.html`

Risk level: Medium to High. This should not be the first cleanup.

---

## 8. Future HTML class-combination simplification plan

This is not for immediate implementation. Default recommendation: keep combinations as-is until CSS-only cleanup is complete and visually verified.

| Current combination | Feasibility | UIkit dependency | Required visual regression checks | UIkit JS dependency? | Recommendation |
|---------------------|-------------|------------------|-----------------------------------|----------------------|----------------|
| `<button class="uk-button crm-button crm-button-primary">` to `<button class="crm-button crm-button-primary">` | Possible later | UIkit button CSS baseline | All primary/default/ghost/secondary buttons; disabled/focus/hover; mobile sidebar toggle | Usually no for button class itself | Maybe simplify later |
| `<button class="uk-button uk-button-default crm-button">` to `<button class="crm-button">` or CRM default variant | Possible later but needs variant redesign | UIkit default button CSS | Filter reset, export, edit/cancel buttons, document/bank actions | Usually no | Maybe simplify later |
| `<input class="uk-input crm-input">` to `<input class="crm-input">` | Possible only after standalone form CSS | UIkit input CSS baseline | Forms, filters, date inputs, generated document wizard fields, FIAS fields | No UIkit JS, but generated JS emits both classes | Maybe simplify later |
| `<select class="uk-select crm-select">` to `<select class="crm-select">` | Possible only after standalone select CSS | UIkit select CSS baseline | Native select arrow, height, focus, disabled, generated selects | No UIkit JS, but generated JS emits both classes | Maybe simplify later |
| `<textarea class="uk-textarea crm-input">` to `<textarea class="crm-input">` | Possible only after textarea styling exists | UIkit textarea baseline | Address outputs, notes, generated document fields | No direct UIkit JS | Maybe simplify later |
| `<table class="uk-table ... crm-*-table">` to CRM-only table classes | Low feasibility now | UIkit table/divider/hover/small CSS | Dashboard tables, subject-card tab tables, row hover, compact density, CSV/sort selectors | No UIkit JS for `uk-table`, but CSS dependency is strong | Keep as-is |
| Wrapper `.crm-table` + inner `.uk-table` composition | Low feasibility now | UIkit table CSS plus CRM overflow wrapper | Every registry and detail table; responsive overflow | No direct UIkit JS | Keep as-is |
| `uk-grid`, `uk-width-*`, `crm-form-grid` | Low feasibility unless replacing UIkit grid | UIkit grid/responsive width classes | Subject edit/register, contract wizard/edit, mobile collapse | UIkit grid behavior/CSS dependency | Do not simplify |
| `uk-card uk-card-body crm-card` | Medium feasibility | UIkit card spacing/body | Error page, request create panel, subject-register header | No strong UIkit JS | Maybe simplify later |
| `uk-icon` attribute on CRM wrappers | Not feasible without replacing icon rendering | UIkit icon renderer | Sidebar chevrons, search icon, calendar triggers, upload icon | Yes, UIkit icon attribute behavior | Do not simplify |
| `uk-switcher` / `uk-tab` with CRM classes | Not feasible without replacing tab/switcher behavior | UIkit switcher/tab behavior | Subject-card tabs, trading-card tabs | Yes | Do not simplify |

Checks required before any simplification:

- capture current computed styles for affected components;
- run visual smoke checks on desktop and mobile;
- confirm no JS emits the old class combination;
- confirm UIkit JS does not depend on the removed class/attribute;
- confirm UMI/PHP templates preserve all `crm-*`, `uk-*`, `is-*`, and `data-*` hooks until migration is stable.

---

## 9. UMI/PHP handoff impact

- Keeping current classes is safest for UMI/PHP transfer.
- CSS duplicate cleanup is safe for UMI only when visual output is unchanged.
- HTML class simplification should not be part of the initial UMI migration.
- PHP templates/includes should preserve `crm-*`, `uk-*`, `is-*`, and `data-*` hooks.
- `crm-static.bundle.css` should be regenerated after future CSS cleanup, but it must not be edited manually.
- Document CSS under `assets/css/document-templates/` must stay isolated from app UI CSS.
- UMI/PHP templates should preserve the current modular source CSS strategy or consume a regenerated bundle from the same source modules.

---

## 10. Final recommendations

Should we do CSS duplicate cleanup? **Yes**, but only as small CSS-only tasks with visual checks.

Should we simplify HTML class combinations now? **No**.

Recommended first cleanup task: **Task A, `static-uikit/assets/css/components/buttons.css` only**, starting with the exact duplicate declarations shared by `.crm-button-secondary`, `.uk-button.crm-button-secondary`, and `.uk-button-default`.

Recommended manual pages to check after future cleanup:

- `dashboard.html`
- `subjects.html`
- `subject-card.html`
- `subject-card-individual.html`
- `subject-register.html`
- `subject-edit-individual.html`
- `agents.html`
- `middle-office-reports.html`
- `depository.html`
- `document-wizard.html`

Final verdict: **Ready for CSS-only cleanup**.

HTML class-combination simplification verdict: **Do not proceed now**.

Needs more investigation before:

- table architecture cleanup;
- topbar/sidebar token cleanup;
- class-combination reduction;
- document-template CSS changes.

---

## Cleanup Status Notes

- 2026-05-13: DONE Batch registry class-combination cleanup — unused page-specific hooks removed from HTML; registry/page headers normalized to `crm-page-header crm-page-header-row` across all 9 normal registry/list pages (subjects, agents, archive, back-office, brokerage, compliance, requests, trading, trust-management). Task A: removed footer-chip page prefixes (`crm-*-footer-chip`), unused page header/action hooks (`crm-subjects-header`, `crm-brokerage-header`, `crm-compliance-header`, `crm-compliance-actions`), and unused registry card hooks (`crm-subjects-registry`, `crm-back-office-registry`, `crm-brokerage-registry`, `crm-compliance-registry`, `crm-trading-registry`); also removed `crm-mo-clients-footer-chip` from middle-office-clients.html. Task B: removed `crm-registry-header` and all `crm-*-header` header-element classes; CSS selectors in `components/registry.css` migrated from `.crm-registry-header` / `.crm-*-header` to `.crm-page-header-row` (scoped under `.crm-page.crm-registry-page` and `[data-page="..."]`); responsive breakpoint selectors in `pages/back-office.css` and `pages/trading.css` similarly migrated. JS-contract classes (`crm-filter-panel`, `crm-registry-filters`, `crm-registry-shell`, `crm-registry-table`, `crm-footer-chip`, `crm-pagination-chip`, etc.) preserved. No JS files changed. No data-* hooks removed. Bundle regenerated with 40 CSS sections, zero real `@import` directives, font URLs kept as `../fonts/...`. No mojibake.

- 2026-05-08: DONE Task D10 remaining registry/list CSS consolidation - extended `components/registry.css` to cover the remaining shared registry/list patterns for agents, back-office, trading, middle-office, and depository. Extracted shared registry header/title/action sizing, filter row/pill/action/reset sizing, agents 1040px table sizing, middle-office/depository shell/header/search/filter/date controls, report-list cards, empty-list spacing, report item base/hover/active support, details grid/cards, file card support, actions, and pagination sizing. Page CSS keeps page-specific inline agent form, back-office counterparty search/add behavior, trading action/menu/table width and card/detail styles, middle-office client table width/body/permissions plus report-specific max-height/title/status/toast details, and depository split/max-height/active color/file text/toast details. HTML/JS/classes/hooks/data attributes were not changed or renamed; `crm-static.bundle.css` was regenerated with no real `@import` directives and font URLs kept as `../fonts/...`.

- 2026-05-08: DONE Task D9 registry/list shared CSS extraction - created `components/registry.css`; moved shared registry shell/table surface styles out of `components/tables.css`; extracted repeated registry header/action rows, list filter row/pill/menu/action sizing, filter reset sizing, registry table top spacing, and shared 1040px table widths from the registry/list page CSS. Page CSS keeps page-specific title/subtitle variables, request create panel, archive date field, brokerage cell/column/mobile overrides, compliance colors/badges/detail-card styles, subjects table width and badge variants. HTML/JS/classes/hooks/data attributes unchanged; `crm-static.css` imports `components/registry.css`; `crm-static.bundle.css` regenerated with no real `@import` directives and font URLs kept as `../fonts/...`.

- 2026-05-08: DONE Task D8 subject create/edit shared CSS extraction - moved shared subject title resets, label casing/weight, form action-row flex alignment, and subject panel radius declarations into `components/subject-form.css`. Page CSS keeps wizard-specific grids/states, edit-shell/header details, address/FIAS spacing/responsive rules, and page-specific form controls. HTML/JS/classes/hooks/data attributes unchanged; `crm-static.css` imports the component and `crm-static.bundle.css` was regenerated.

- 2026-05-08: DONE Task D7 layout chrome cleanup - removed duplicate sidebar brand/nav spacing, submenu link sizing, and mobile sidebar width declarations from `layout/topbar.css` because `layout/sidebar.css` already owns the equivalent sidebar-scoped rules. HTML/JS/classes/hooks/data attributes unchanged; regenerated `crm-static.bundle.css`.

- 2026-05-08: DONE Task A — `components/buttons.css` duplicate cleanup completed.
- 2026-05-08: DONE Task B — forms/date-picker indicator duplicate cleanup completed.
- 2026-05-08: DONE Task C — pagination/footer/page-size chip styles consolidated into shared CRM pagination classes.
- 2026-05-08: DONE Task D1 — consolidated obvious registry shell, filter/search, table wrapper, header/body, scrollbar, and sizing-support duplicates into shared component CSS; page-specific widths, controls, and layout exceptions remain local. Regenerated `crm-static.bundle.css`.
- 2026-05-08: corrected / DONE Task D2 — `components/tables.css` housekeeping correction completed and bundle regenerated without `@import`.
- 2026-05-08: DONE Task D4 — removed safe topbar/button duplicate declarations that were already supplied by `components/buttons.css`; kept the existing topbar radius override and preserved all selectors/classes. Regenerated `crm-static.bundle.css`.
