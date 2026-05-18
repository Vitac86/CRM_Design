# CSS Class Ownership and Proliferation Audit

**Date:** 2026-05-18
**Scope:** `static-uikit/` — all CSS source files, HTML pages, and JS files
**Author:** Claude Code (automated audit)
**Type:** AUDIT ONLY — no CSS, HTML, or JS was changed during this audit

---

## Methodology

1. Read `crm-static.css` manifest to enumerate all 40 imported CSS source files.
2. Read all 40 source CSS files in full; catalogued every class selector and its scoping pattern (`body[data-page]`, `.crm-page[data-page]`, or unscoped).
3. Read all 29 HTML pages to identify which classes appear in `class=` attributes.
4. Grepped all 9 JS files to identify classes toggled programmatically via `classList`.
5. Cross-referenced CSS definitions against HTML/JS usage to find dead CSS, orphan classes, wrong owners, and duplicate definitions.
6. Ran `npm run static:uikit:bundle:check` and `npm run static:uikit:validate` without modifying any file.

**Exclusions:** `crm-static.bundle.css`, `uikit.min.css`, generated/minified/vendor files, document-template HTML/CSS.

---

## Part 1 — Class Inventory

### Source files
| Layer | Count | Files |
|-------|-------|-------|
| base | 3 | tokens.css, reset.css, typography.css |
| layout | 4 | app.css, sidebar.css, topbar.css, page.css |
| components | 7 | cards.css, buttons.css, forms.css, tables.css, filters.css, registry.css, address.css |
| pages | 24 | contract-wizard.css, subject-register.css, subject-edit.css, subject-card.css, subjects.css, compliance.css, dashboard.css, trading.css, middle-office.css, depository.css, agents.css, archive.css, brokerage.css, requests.css, back-office.css, trust-management.css, document-wizard.css, contract-edit.css, auth.css, and others |
| responsive | 1 | responsive.css |
| print | 1 | print.css |
| **Total** | **40** | in manifest |

**HTML pages:** 29 (in `static-uikit/pages/`)
**JS files:** 9 (in `static-uikit/assets/js/`)

### Class category breakdown (estimated)

| Category | Approx. count | Representative examples |
|----------|--------------|------------------------|
| Shared layout | ~25 | `crm-page`, `crm-sticky-actions`, `crm-page-actions`, `crm-sidebar`, `crm-topbar` |
| Shared component | ~130 | `crm-card`, `crm-table`, `crm-filter-panel`, `crm-option-card`, `crm-button`, `crm-address-*` |
| Page-specific | ~160 | `reg-*`, `crm-subject-*`, `crm-trading-*`, `crm-mo-*`, `crm-dep-*`, `crm-dashboard-*` |
| UIkit bridge | ~10 | `uk-button`, `uk-input`, `uk-select`, `uk-textarea`, `uk-radio` |
| JS state / utility | ~18 | `is-active`, `is-selected`, `is-disabled`, `sidebar-open`, `is-filter-menu-open` |
| **Total unique tokens** | **~340** | across 40 source CSS files |

---

## Part 2 — Class Ownership Classification

### 2a. Shared layout — `layout/*.css`

**Owner: `layout/page.css`**
`.crm-page`, `.crm-page-header`, `.crm-grid-2`, `.crm-split-view`,
`.crm-sticky-actions`, `.crm-sticky-actions > .crm-page-actions:only-child`,
`.crm-page-actions`, `.crm-header-actions`, `.crm-footer-actions`,
`.crm-launcher-*` (launcher index page only)

**Owner: `layout/app.css`**
`.crm-app`, `.crm-layout`, `.crm-main`

**Owner: `layout/sidebar.css`**
`.crm-sidebar`, `.crm-sidebar-brand`, `.crm-nav`, `.crm-nav-link`,
`.crm-nav-group`, `.crm-nav-submenu`, `.crm-nav-icon`

**Owner: `layout/topbar.css`**
`.crm-topbar`, `.crm-search`, `.crm-search-preview*`, `.crm-user`, `.crm-avatar`

### 2b. Shared components — `components/*.css`

**`components/cards.css`:** `.crm-card`, `.crm-toolbar`, `.crm-section`, `.crm-form-card`,
`.crm-page-header-row`, `.crm-register-header`, `.crm-breadcrumbs`,
`.crm-option-grid`, `.crm-option-card`, `.crm-binary-control`,
`.crm-step-note`, `.crm-register-card`, `.crm-check-row`, `.crm-radio-tile`,
`.crm-detail-header`, `.crm-action-row`, `.crm-report-list`, `.crm-report-item`

**`components/buttons.css`:** `.uk-button` (override), `.crm-button`, `.crm-button-primary`,
`.crm-button-secondary`, `.crm-button-ghost`, `.crm-link-action`

**`components/forms.css`:** `.crm-form-grid`, `.crm-input`, `.crm-select`, `.uk-input`/`.uk-textarea`/`.uk-select`/`.uk-radio` (override), `.uk-form-label`, `.crm-date-field`, `.crm-date-trigger`, `.crm-date-input`

**`components/tables.css`:** `.crm-table-wrapper`, `.crm-table`, `.crm-table-head`,
`.crm-table-meta`, `.crm-table-actions`, `.crm-list-actions`,
`.crm-row-main`, `.crm-row-sub`, `.crm-row-actions`,
`.crm-col-*`, `.crm-pagination*`, `.crm-footer-chip`,
`.crm-th-sort-button`, `.crm-table-card`, `.crm-empty-state*`

**`components/filters.css`:** `.crm-filter-panel`, `.crm-filter-search`, `.crm-filter-grid`,
`.crm-filter-field`, `.crm-filter-actions`, `.crm-filter-menu`,
`.crm-filter-trigger`, `.crm-filter-dropdown`, `.crm-filter-option`

**`components/address.css`:** `.crm-address-rows`, `.crm-address-row`, `.crm-address-row-head`,
`.crm-address-output`, `.crm-address-display-line`,
`.crm-address-parts-editor`, `.crm-address-parts-grid`,
`.crm-address-part-field`, `.crm-fias-*`, `.crm-address-mode-note`,
`.crm-address-manual-fields`, `.crm-address-full-preview`
(all scoped to `body[data-page="subject-register"]` and `body[data-page="subject-edit"]`)

**`components/registry.css`:** `.crm-registry-shell`, `.crm-registry-filters`, `.crm-registry-table`,
`.crm-mo-*` (shared mo classes), `.crm-dep-*`, page-scoped action classes

### 2c. Page-specific — `pages/*.css`

| CSS file | Prefix(es) | Data-page scope |
|----------|-----------|-----------------|
| subject-register.css | `reg-*` | `body[data-page="subject-register"]`, `.crm-page[data-page="subject-register"]` |
| subject-edit.css | `crm-edit-*`, `crm-subject-edit-*` | `body[data-page="subject-edit"]` |
| subject-card.css | `crm-subject-*`, `crm-profile-*`, `crm-bank-account-*`, `crm-document-*`, `crm-relations-*`, `crm-history-*` | `.crm-page[data-page="subject-card"]` |
| contract-wizard.css | `crm-wizard-*`, `crm-detail-*`, `crm-contract-*` | **UNSCOPED** (see Part 3) |
| contract-edit.css | `crm-contract-edit-*` | `body[data-page="contract-edit"]` |
| trading.css | `crm-trading-*` | `.crm-page[data-page="trading"]`, `.crm-page[data-page="trading-card"]` |
| middle-office.css | `crm-mo-*` | `body[data-page="middle-office-*"]` + some unscoped |
| depository.css | `crm-dep-*` | `.crm-page[data-page="depository"]` |
| dashboard.css | `crm-dashboard-*` | `body[data-page="dashboard"]` + some unscoped |
| subjects.css | `crm-subjects-*`, `crm-button-export-light` | `body[data-page="subjects"]` |
| compliance.css | `crm-compliance-*`, `crm-doc-checklist*` | `.crm-page[data-page="compliance"]`, `.crm-page[data-page="compliance-card"]` (partial) |

### 2d. UIkit bridge
`uk-button`, `uk-input`, `uk-select`, `uk-textarea`, `uk-radio`, `uk-card`, `uk-table`, `uk-form-label` — defined by UIkit, selectively overridden in `components/buttons.css`, `components/forms.css`, `components/cards.css`.

### 2e. JS state and utility classes
Toggled dynamically; no single CSS file "owns" all of them:
`is-active`, `is-selected`, `is-disabled`, `is-checked`, `is-filter-menu-open`,
`is-filter-hidden`, `is-page-hidden`, `is-sorted-asc`, `is-sorted-desc`,
`sidebar-open`, `active`, `expanded`, `is-search-preview-open`,
`crm-modal-open`, `is-dragover`, `is-error`, `is-invalid`, `is-visible`

---

## Part 3 — Wrong-Owner Page CSS Usage

Classes defined in a page CSS file without a `[data-page]` scope guard, but used across pages that page CSS does not own.

### Finding 3-1 — `.crm-wizard-shell` · HIGH confidence

**Defined in:** `pages/contract-wizard.css` — unscoped (no `[data-page]` guard)
**Used by HTML:** `contract-wizard.html`, `contract-edit.html`, `document-wizard.html`, `subject-register.html` (4 pages)
**Risk:** Any future contract-wizard-specific change to `.crm-wizard-shell` would affect all 4 pages. The class's semantic scope ("wizard shell") is clearly broader than one page.
**Correct owner:** A new `components/wizard.css` file.

### Finding 3-2 — `.crm-wizard-steps`, `.crm-wizard-step`, `.crm-wizard-step-active` · HIGH confidence

**Defined in:** `pages/contract-wizard.css` — unscoped
**Used by HTML:** `contract-wizard.html`, `document-wizard.html`, `subject-register.html`
**Used by JS:** `subject-register.js` and `document-wizard.js` — both manipulate `crm-wizard-step-active` and `crm-wizard-step-done` via `classList`
**Risk:** 3 HTML pages and 2 JS files depend on step-indicator classes housed in a single page CSS file.
**Correct owner:** `components/wizard.css`

### Finding 3-3 — `.crm-detail-hero`, `.crm-detail-hero-main`, `.crm-detail-meta`, `.crm-detail-actions`, `.crm-detail-tabs` · HIGH confidence

**Defined in:** `pages/contract-wizard.css` — unscoped
**Used by HTML:** `contract-wizard.html`, `subject-card.html`, `subject-card-individual.html`, `trading-card.html`
**Risk:** 4 pages depend on detail-layout classes that are conceptually a shared layout primitive (a page hero area with actions and tab navigation), not a contract-wizard specific feature.
**Correct owner:** `components/detail-layout.css` (new) or a `layout/` file.

### Finding 3-4 — `body[data-page="subject-edit"] .crm-edit-toast` in `components/forms.css` · HIGH confidence

**Defined in:** `components/forms.css` — a shared component file, but with a full page-scope guard
**Should be in:** `pages/subject-edit.css`
**Risk:** Developers looking for subject-edit–specific rules will not look in forms.css. The rule can interfere with future form refactors. It breaks the "components are unscoped shared primitives" contract.

### Finding 3-5 — `.crm-doc-checklist`, `.crm-doc-checklist-item` · MEDIUM confidence

**Defined in:** `pages/compliance.css` — unscoped (no `[data-page]` guard) at top-level
**Used by HTML:** `compliance-card.html` only (confirmed by grep)
**Risk:** The rules appear dead when reading `compliance.css` in isolation (they don't match the compliance page's data-page value `"compliance"`), but are actually live on `compliance-card.html`. The correct scope guard is `[data-page="compliance-card"]`.

### Finding 3-6 — `.crm-button-export-light` · MEDIUM confidence (duplicate definition)

**Defined in:** `pages/subjects.css` (scoped to `body[data-page="subjects"]`)
**Also defined in:** `pages/compliance.css` (different scope)
**Used by:** `subjects.html`, `compliance.html`, `brokerage.html`
**Risk:** `brokerage.html` uses this class but has no scoped CSS definition for it in `pages/brokerage.css`. The button silently relies on a subjects.css or compliance.css definition leaking through. This is a cross-page CSS dependency with no explicit contract.
**Correct owner:** A single definition in `components/buttons.css` with no page scope.

### Finding 3-7 — `.crm-trading-toast` in `pages/trading.css` · LOW confidence (unscoped)

**Defined in:** `pages/trading.css` — unscoped at top level
**Used by JS:** `trading-card.js` only
**Risk:** An unscoped class in a page file; low risk given the narrow JS usage but inconsistent with the scoping pattern used by other toast classes.

---

## Part 4 — Unnecessary One-off Wrapper Classes

### Finding 4-1 — `crm-actions` orphan class · HIGH confidence

**Occurrences:** 7 elements across `subject-register.html`, `contract-wizard.html`, `contract-edit.html`
**Pattern:** Always paired with `crm-page-actions`:
```html
<div class="crm-page-actions crm-actions">
```
**Issue:** `crm-actions` has **no CSS definition** in any source CSS file. It carries zero styling. It is either a legacy semantic annotation or was intended for a style that was never written. The `crm-page-actions` class does all visual work.
**Recommendation:** Remove `crm-actions` from all 7 elements. Pure HTML change; no CSS or JS impact.

### Finding 4-2 — `subject-section` bare class · MEDIUM confidence

**Occurrences:** Multiple elements in `subject-card.html` and `subject-card-individual.html`
**Issue:** This class breaks the `crm-` naming convention used everywhere else. It is referenced in `pages/subject-card.css` as `.subject-section .crm-form-section-head { ... }`, making it a live styling hook — but with an inconsistent name.
**Recommendation:** Rename to `crm-subject-section` in HTML and CSS. Find-replace in 3 files.

### Finding 4-3 — `crm-profile-section` orphan class · MEDIUM confidence

**Occurrences:** 5 elements in `subject-card.html` / `subject-card-individual.html`
**Issue:** No CSS definition in any source file. Appears alongside `crm-card` and `crm-form-card` as a semantic annotation with no style effect.
**Recommendation:** Remove from HTML, or add a CSS definition if a styling need is identified.

### Finding 4-4 — `crm-subject-form-layout` orphan class · MEDIUM confidence

**Occurrences:** 2 elements in `subject-card.html` / `subject-card-individual.html`
**Issue:** No CSS definition. Same orphan pattern as `crm-profile-section`.
**Recommendation:** Remove from HTML.

---

## Part 5 — Stacked Class Chains

Elements where multiple CRM classes stack in ways that create ambiguity or redundancy:

### Chain 5-1 — `crm-page-actions crm-actions` (7 elements)
```html
<div class="crm-page-actions crm-actions">
```
Present in `subject-register.html`, `contract-wizard.html`, `contract-edit.html`. `crm-actions` is undefined (see Finding 4-1). The pair communicates two names for one thing.

### Chain 5-2 — `crm-wizard-shell crm-docwiz-shell` (document-wizard.html)
```html
<div class="crm-wizard-shell crm-docwiz-shell">
```
The page-specific `crm-docwiz-shell` is layered over the shared `crm-wizard-shell`. This pattern is intentional (page override on top of shared base) but only makes sense once shared wizard classes are in a components file.

### Chain 5-3 — `crm-wizard-shell crm-contract-edit-shell` (contract-edit.html)
Same pattern as Chain 5-2.

### Chain 5-4 — `crm-trading-hero crm-detail-hero` (trading-card.html)
```html
<div class="crm-trading-hero crm-detail-hero">
```
Stacks a page-specific name (`crm-trading-hero`) with a shared layout name (`crm-detail-hero`, defined in contract-wizard.css). The dual-class approach is necessary now because `crm-detail-hero` is unscoped in contract-wizard.css — a page-specific modifier class is needed on top.

### Chain 5-5 — Subject card compound card elements
```html
<div class="crm-card crm-form-card crm-section crm-subject-profile-section crm-profile-section">
```
4 real CRM classes + 1 orphan (`crm-profile-section`). Each layer adds incremental style but the result is a 5-class chain where the semantic purpose is unclear.

---

## Part 6 — Page-Specific Prefix Leakage

| Prefix | Defined in | Used by (all pages) | Leakage? |
|--------|-----------|---------------------|----------|
| `crm-wizard-*` | `pages/contract-wizard.css` (unscoped) | contract-wizard, contract-edit, document-wizard, subject-register | **YES** — 3 of 4 pages are not contract-wizard |
| `crm-detail-*` | `pages/contract-wizard.css` (unscoped) | contract-wizard, subject-card, subject-card-individual, trading-card | **YES** — 3 of 4 pages are not contract-wizard |
| `crm-wizard-actions` | `pages/contract-wizard.css` (unscoped, comment guard only) | contract-wizard, contract-edit, document-wizard | **BORDERLINE** — shared by design but without formal data-page scope |
| `reg-*` | `pages/subject-register.css` | subject-register only | No leakage — correctly scoped |
| `crm-subject-*` | `pages/subject-card.css` | subject-card, subject-card-individual | No leakage — correctly scoped |
| `crm-trading-*` | `pages/trading.css` | trading, trading-card | No leakage |
| `crm-mo-*` | `middle-office.css` / `registry.css` | middle-office pages | No leakage (shared via registry component) |
| `crm-dep-*` | `pages/depository.css` | depository | No leakage |
| `crm-dashboard-*` | `pages/dashboard.css` | dashboard | No leakage |
| `crm-edit-*` | `pages/subject-edit.css` | subject-edit | No leakage — correctly scoped |

**Summary:** All prefix leakage originates from `pages/contract-wizard.css`. This is the sole file responsible for both Part 3 Findings 3-1, 3-2, and 3-3.

---

## Part 7 — Classes with Unclear Owner

### 7-1. `.crm-button-export-light` — duplicate cross-file definition
- Defined: `pages/subjects.css` (scoped to subjects page)
- Also defined: `pages/compliance.css` (different scope)
- Used: `subjects.html`, `compliance.html`, `brokerage.html`
- The two definitions may have drifted; brokerage.html depends on one definition with no explicit ownership.

### 7-2. `body[data-page="subject-edit"] .crm-edit-toast` — page rule in component file
- Defined: `components/forms.css` (page-scoped rule inside shared file)
- Single-page scope in a multi-page file violates component boundary.

### 7-3. `.crm-doc-checklist`, `.crm-doc-checklist-item` — scope mismatch
- Defined: `pages/compliance.css` (no `[data-page]` guard)
- Used: `compliance-card.html` only (page with `data-page="compliance-card"`)
- The rules are effectively scoped by HTML context but the CSS does not express this — they appear dead until the correct page is found.

### 7-4. `.crm-trading-toast` — unscoped in page file
- Defined: `pages/trading.css` (top-level, unscoped)
- Set by: `trading-card.js` only
- Inconsistent with other toast classes (`.crm-contract-edit-toast` also unscoped in contract-edit.css).

### 7-5. `.crm-wizard-actions` — shared by three wizard pages, unscoped
- Defined: `pages/contract-wizard.css` (unscoped, comment guard added in last cleanup)
- Used: `contract-wizard.html`, `contract-edit.html`, `document-wizard.html`
- Currently acceptable per documented decision; flagged here for completeness. The comment guard prevents misuse but a formal `[data-page]` scope on each wizard page would be stronger.

---

## Part 8 — Summary Metrics

| Metric | Value |
|--------|-------|
| CSS source files (in manifest) | 40 |
| HTML pages | 29 |
| JS source files | 9 |
| Estimated unique CRM class tokens | ~340 |
| **Dead CSS classes** (defined, confirmed not used in any HTML) | **8 confirmed** |
| **Orphan HTML classes** (used in HTML, no source CSS definition) | **4 confirmed** |
| **Wrong-owner / unscoped cross-page definitions** | **7 findings** (3-1 through 3-7) |
| **Duplicate class definitions** across page CSS files | **1** (crm-button-export-light) |
| Pages affected by contract-wizard.css prefix leakage | 3 additional pages |
| Stacked chain instances with ≥1 orphan class | 7+ elements |
| JS state classes | 18 |
| UIkit bridge classes overridden | ~10 |

### Dead CSS confirmed (defined but not used in any HTML page)

| Class | File | Confidence |
|-------|------|-----------|
| `.crm-decision-panel` | `components/cards.css` | High |
| `.crm-kpi-card` | `components/cards.css` | High |
| `.crm-journal-table` | `components/cards.css` | High |
| `.crm-compliance-queue` | `components/cards.css` | High |
| `.crm-register-actions` | `components/cards.css` | High |
| `.crm-decision-hero` | `pages/compliance.css` (unscoped) | Medium |
| `.crm-risk-summary` | `pages/compliance.css` (unscoped) | Medium |
| `.crm-compliance-card-layout` | `pages/compliance.css` (unscoped) | Medium |

### Orphan HTML classes confirmed (used in HTML, no source CSS definition)

| Class | HTML pages | Occurrences |
|-------|-----------|-------------|
| `crm-actions` | subject-register.html, contract-wizard.html, contract-edit.html | 7 |
| `crm-profile-section` | subject-card.html, subject-card-individual.html | 5 |
| `crm-subject-form-layout` | subject-card.html, subject-card-individual.html | 2 |
| `subject-section` | subject-card.html, subject-card-individual.html | multiple (has CSS reference but breaks naming convention) |

---

## Part 9 — Top 15 Cleanup Candidates

Ranked by: (pages affected × scope of fix) + class system clarity gain

| Rank | Task | Impact | Effort | Files touched |
|------|------|--------|--------|---------------|
| 1 | **Extract shared wizard classes to `components/wizard.css`**: move `.crm-wizard-shell`, `.crm-wizard-steps`, `.crm-wizard-step`, `.crm-wizard-step-active`, `.crm-wizard-step-done` out of `pages/contract-wizard.css` | 4 HTML pages + 2 JS files freed from wrong-owner dependency | Medium | contract-wizard.css, new wizard.css, crm-static.css |
| 2 | **Extract shared detail-layout classes to `components/detail-layout.css`**: move `.crm-detail-hero`, `.crm-detail-hero-main`, `.crm-detail-meta`, `.crm-detail-actions`, `.crm-detail-tabs`, `.crm-subject-summary` | 4 HTML pages freed | Medium | contract-wizard.css, new detail-layout.css, crm-static.css |
| 3 | **Remove `crm-actions` orphan class** from all 7 HTML elements | Removes undefined class from 3 pages; no CSS/JS impact | Low | subject-register.html, contract-wizard.html, contract-edit.html |
| 4 | **Consolidate `.crm-button-export-light`** to `components/buttons.css` | Fixes brokerage.html's implicit dependency; removes cross-page duplicate | Low | subjects.css, compliance.css, buttons.css |
| 5 | **Remove dead CSS from `components/cards.css`**: delete `.crm-decision-panel`, `.crm-kpi-card`, `.crm-journal-table`, `.crm-compliance-queue`, `.crm-register-actions` | Reduces cards.css cognitive overhead | Low | cards.css |
| 6 | **Move `body[data-page="subject-edit"] .crm-edit-toast` from `components/forms.css` to `pages/subject-edit.css`** | Restores component boundary correctness | Very Low | forms.css, subject-edit.css |
| 7 | **Scope `.crm-doc-checklist` and `.crm-doc-checklist-item` to `[data-page="compliance-card"]`** in `pages/compliance.css` | Eliminates apparent dead CSS; adds explicit scope | Very Low | compliance.css |
| 8 | **Scope `.crm-trading-toast` to `[data-page="trading-card"]`** in `pages/trading.css` | Consistent toast scoping across page CSS files | Very Low | trading.css |
| 9 | **Scope `.crm-contract-edit-toast` to `[data-page="contract-edit"]`** in `pages/contract-edit.css` | Same as above | Very Low | contract-edit.css |
| 10 | **Remove dead CSS from `pages/compliance.css`**: delete `.crm-decision-hero`, `.crm-risk-summary`, `.crm-compliance-card-layout` and related unscoped dead classes | Reduces compliance.css noise | Low | compliance.css (verify first) |
| 11 | **Rename `subject-section` → `crm-subject-section`** in HTML and CSS | Restores naming convention | Low | subject-card.html, subject-card-individual.html, subject-card.css |
| 12 | **Remove orphan class `crm-profile-section`** from 5 HTML elements | Removes undefined decoration | Very Low | subject-card.html, subject-card-individual.html |
| 13 | **Remove orphan class `crm-subject-form-layout`** from 2 HTML elements | Same | Very Low | subject-card.html, subject-card-individual.html |
| 14 | **Add validator G-extra 5**: detect dead CSS tokens in `components/cards.css` | Prevents future accumulation of dead component CSS | Low | validate-static-uikit.mjs |
| 15 | **Add formal `[data-page]` scope to `.crm-wizard-actions`** (currently comment-guarded only) | Strengthens ownership enforcement beyond the current comment guard | Medium | contract-wizard.css (scope to 3 pages) |

---

## Part 10 — Recommended Next Implementation Task

**Task: Extract shared wizard infrastructure classes from `pages/contract-wizard.css` into a new `components/wizard.css` file.**

**Scope:**
1. Create `static-uikit/assets/css/components/wizard.css` with the following classes moved from `pages/contract-wizard.css`:
   - `.crm-wizard-shell` (grid layout, 12px gap)
   - `.crm-wizard-steps` (3-column grid, 8px gap)
   - `.crm-wizard-step` (flex row, step indicator base state)
   - `.crm-wizard-step strong` (step number badge)
   - `.crm-wizard-step-active` (active state styles)
   - All responsive overrides for these classes (already in contract-wizard.css `@media (max-width: 960px)`)
2. Add `./components/wizard.css` to `crm-static.css` manifest after the other `components/` imports.
3. Leave wizard-page-specific classes in `pages/contract-wizard.css` and scope them to `[data-page="contract-wizard"]` where they are not already scoped.
4. Regenerate `crm-static.bundle.css`.

**Why this task first:**
- Highest wrong-owner impact: 4 HTML pages + 2 JS files currently depend on a class defined in contract-wizard.css with no page guard.
- Pure CSS restructuring: zero HTML changes, zero JS changes.
- Immediately verifiable: existing `npm run static:uikit:validate` passes without modification.
- Unblocks Candidate #2: once wizard classes are in a component, the detail-layout classes can be extracted in the same pattern.
- Follows the established scoping precedent already proven during the `reg-sticky-actions` cleanup.

**Definition of done:**
- `components/wizard.css` exists and is imported in `crm-static.css` before pages.
- `pages/contract-wizard.css` contains no unscoped `.crm-wizard-shell`, `.crm-wizard-steps`, or `.crm-wizard-step` rules.
- All 4 pages (contract-wizard.html, contract-edit.html, document-wizard.html, subject-register.html) continue to render correctly.
- `npm run static:uikit:bundle:check` passes.
- `npm run static:uikit:validate` passes with 0 errors, 0 warnings.

---

## Part 11 — Validation Results

### Bundle check

```
npm run static:uikit:bundle:check

> node static-uikit/tools/build-css-bundle.mjs --check

✓ Bundle is up to date (40 / 40 sections, 243.0 KB)
```

### Full validation

```
npm run static:uikit:validate

── A. CSS Manifest ──
  ✓ crm-static.css exists
  ✓ crm-static.css contains only @import, blanks, and comments
  ✓ all 40 imported files exist
  ✓ no duplicate import paths
  · import count: 40
  ✓ import layer order is correct (base → layout → components → pages → responsive → print)

── B. Bundle ──
  ✓ crm-static.bundle.css exists
  ✓ bundle contains no real @import directives
  ✓ bundle has 40 section markers matching 40 manifest imports
  ✓ bundle is up to date with source CSS
  ✓ all 16 unique font URL(s) resolve to existing files
  ✓ :root appears exactly once, inside the base/tokens.css section

── C. HTML Stylesheet References ──
  · found 29 HTML page(s) in static-uikit\pages
  ✓ all 29 pages pass stylesheet reference checks

── D. Partials ──
  · static-uikit/partials/ does not exist — skipping partials check

── E. UMI Packs ──
  · static-uikit/umi-p0/ does not exist — skipping
  · static-uikit/umi-p1/ does not exist — skipping

── F. Local Asset Existence ──
  ✓ all 296 local asset reference(s) across 29 pages resolve to existing files

── G. Component / Page Boundary Checks ──
  ✓ components/cards.css contains no shell-level selectors
  ✓ components/cards.css contains no duplicate top-level card/control selector definitions
  ✓ components/tables.css contains no duplicate top-level table selector definitions
  ✓ components/registry.css contains no duplicate targeted action/filter selectors in the same at-rule context
  ✓ pages/subject-card.css contains no duplicate selector definitions in the same at-rule context
  ✓ components/filters.css contains no duplicate top-level filter-panel selector definitions
  ✓ components/address.css contains no duplicate top-level address-row :last-child selector definitions
  ✓ pages/contract-wizard.css contains no bare top-level .crm-form-card selector
  ✓ pages/compliance.css contains no bare .crm-decision-panel selector
  ✓ pages/requests.css contains no duplicate responsive selector definitions in the same at-rule context
  ✓ pages/subjects.css contains no duplicate meta-chip selector definitions in the same at-rule context
  ✓ components/forms.css contains no duplicate top-level .uk-select definitions
  ✓ pages/subject-edit.css contains no duplicate top-level body[data-page="subject-edit"] .uk-textarea.crm-input definitions
  ✓ components/cards.css contains no broad UIkit/form/button focus selectors
  ✓ pages/subject-register.html does not contain removed class "reg-sticky-actions"
  ✓ pages/subject-register.html does not contain removed class "reg-sticky-actions-main"
  ✓ pages/subject-register.css contains no ".reg-sticky-actions" selectors

── H. Summary ──
  Pages checked           : 29
  CSS imports in manifest : 40
  Bundle section markers  : 40
  UMI packs               : 0 (of 2)
  Local assets checked    : 296
  Errors                  : 0
  Warnings                : 0

✓ Validation passed.
```

---

## Files Changed

**No files were changed during this audit.**

- CSS files changed: 0
- HTML files changed: 0
- JS files changed: 0
- Bundle regenerated: No

This document (`static-uikit/audits/class-ownership-proliferation-audit.md`) is the only file created.

---

## Summary

| Category | Result |
|----------|--------|
| CSS source files audited | 40 |
| HTML pages audited | 29 |
| JS files audited | 9 |
| Unique CRM class tokens | ~340 estimated |
| Dead CSS classes | 8 confirmed |
| Orphan HTML classes | 4 confirmed |
| Wrong-owner / scope-missing findings | 7 |
| Duplicate definitions | 1 (crm-button-export-light) |
| Cleanup candidates ranked | 15 |
| Recommended next task | Extract wizard classes to components/wizard.css |
| Bundle check | ✓ Up to date (40/40, 243.0 KB) |
| Validation | ✓ Errors: 0, Warnings: 0 |

---

## Wizard Infrastructure Ownership Cleanup Notes

**Date:** 2026-05-18

### Files changed

| File | Change |
|------|--------|
| `static-uikit/assets/css/components/wizard.css` | Created (new file) |
| `static-uikit/assets/css/pages/contract-wizard.css` | Removed shared wizard classes |
| `static-uikit/assets/css/crm-static.css` | Added `./components/wizard.css` import (41 total) |
| `static-uikit/tools/validate-static-uikit.mjs` | Added G-extra 5 guard |

### Classes moved to `components/wizard.css`

- `.crm-wizard-shell`
- `.crm-wizard-steps`
- `.crm-wizard-step`
- `.crm-wizard-step strong`
- `.crm-wizard-step-active`
- `.crm-wizard-step-active strong`
- `.crm-wizard-actions` — moved; used by contract-wizard, contract-edit, document-wizard (3 pages); declarations are generic wizard action tweaks (`margin-top: 2px; bottom: 12px`)
- `@media (max-width: 960px) { .crm-wizard-steps }` — responsive rule split out; `.crm-contract-client-summary` and `.crm-radio-grid` remain in contract-wizard.css responsive block

### `.crm-wizard-actions` decision

**Moved** to `components/wizard.css`. The class is shared by exactly the three wizard pages (contract-wizard, contract-edit, document-wizard) and its declarations are a generic wizard footer helper, not contract-wizard-specific. The existing comment guard in contract-wizard.css documented this intent; formalising it in components/wizard.css is the correct resolution.

### `.crm-wizard-step-done` decision

**Not moved.** Currently defined only in `pages/subject-register.css`, scoped to `body[data-page="subject-register"]`. The `document-wizard.js` does not toggle `crm-wizard-step-done` (confirmed by JS read — it only uses `crm-wizard-step-active`). No global definition needed at this time.

### HTML / JS class names

No HTML class names were changed. No JS class names were changed. All four pages (contract-wizard.html, contract-edit.html, document-wizard.html, subject-register.html) continue to receive wizard infrastructure styles via `components/wizard.css`, which loads before page CSS in the cascade.

### Cascade preservation

`components/wizard.css` loads before all `pages/*.css` imports. Page-specific overrides in `subject-register.css` (`.crm-wizard-step-done`) continue to win over base component definitions.

### Manifest import update

- Before: 40 imports
- After: 41 imports (added `./components/wizard.css` after `./components/modals.css`)

### Build and validation results

| Check | Result |
|-------|--------|
| `npm run static:uikit:bundle` | ✓ Bundle written — 41/41 sections, 243.1 KB |
| `npm run static:uikit:bundle:check` | ✓ Bundle is up to date (41/41 sections, 243.1 KB) |
| `npm run static:uikit:validate` | ✓ Errors: 0, Warnings: 0 |

New validator check added: **G-extra 5** — fails if `pages/contract-wizard.css` contains unscoped definitions for `.crm-wizard-shell`, `.crm-wizard-steps`, `.crm-wizard-step`, or `.crm-wizard-step-active`.

### Remaining class ownership candidates

| Rank | Task |
|------|------|
| 1 | **Extract shared detail-layout classes** (`.crm-detail-hero`, `.crm-detail-hero-main`, `.crm-detail-meta`, `.crm-detail-actions`, `.crm-detail-tabs`) from `pages/contract-wizard.css` to a new `components/detail-layout.css` — 4 pages affected |
| 2 | **Consolidate `.crm-button-export-light`** to `components/buttons.css` — removes cross-page duplicate between subjects.css and compliance.css; fixes brokerage.html implicit dependency |
| 3 | **Dead CSS cleanup in `components/cards.css`** — remove `.crm-decision-panel`, `.crm-kpi-card`, `.crm-journal-table`, `.crm-compliance-queue`, `.crm-register-actions` |
| 4 | **Move `body[data-page="subject-edit"] .crm-edit-toast`** from `components/forms.css` to `pages/subject-edit.css` — restores component boundary |
| 5 | **Compliance checklist scoping** — scope `.crm-doc-checklist`, `.crm-doc-checklist-item` to `[data-page="compliance-card"]` in compliance.css |
| 6 | **`subject-section` rename** — rename bare class to `crm-subject-section` in subject-card.html, subject-card-individual.html, subject-card.css |
| 7 | **Remove orphan `crm-profile-section`** from 5 elements in subject-card.html / subject-card-individual.html |
| 8 | **Remove orphan `crm-subject-form-layout`** from 2 elements in subject-card.html / subject-card-individual.html |

---

## Orphan crm-actions Class Cleanup Notes

**Date:** 2026-05-18

### Files changed

| File | Change |
|------|--------|
| `static-uikit/pages/subject-register.html` | Removed `crm-actions` from 5 class attributes |
| `static-uikit/pages/contract-wizard.html` | Removed `crm-actions` from 1 class attribute |
| `static-uikit/pages/contract-edit.html` | Removed `crm-actions` from 1 class attribute |
| `static-uikit/tools/validate-static-uikit.mjs` | Fixed stale error message (line 1114); added G-extra 6 orphan guard |

**CSS files changed:** 0
**JS files changed:** 0
**Bundle regenerated:** No (HTML-only change; bundle confirmed up to date at 41/41 sections, 243.1 KB)

### crm-actions occurrences removed

**7 total** — all elements previously carrying `class="crm-page-actions crm-actions"` now carry `class="crm-page-actions"`.

| File | Occurrences removed |
|------|---------------------|
| `subject-register.html` | 5 |
| `contract-wizard.html` | 1 |
| `contract-edit.html` | 1 |

### Verification

- **No CSS definition for `.crm-actions` exists** — confirmed by grep across all 41 CSS source files; zero matches.
- **No JS dependency on `crm-actions` exists** — confirmed by grep across all 9 JS source files; zero matches.
- **`crm-page-actions` is unchanged** — class remains on all affected elements; visual and layout behavior is unaffected.
- **`crm-sticky-actions`, `crm-wizard-actions`, `crm-button`, `crm-button-primary`, `data-action` attributes** — all untouched.

### Validator enhancement

**Implemented** — G-extra 6 added to `validate-static-uikit.mjs`:
- Iterates all 29 pages under `static-uikit/pages/`.
- Fails with an error if any page contains the class token `crm-actions`.
- Message: `pages/<file> contains orphan class "crm-actions" which has no CSS definition — remove it; use "crm-page-actions" directly`.
- Stale error message on line 1114 (previously advertised `crm-page-actions crm-actions` as the replacement for `reg-sticky-actions-main`) corrected to `crm-page-actions`.

### Build and validation results

| Check | Result |
|-------|--------|
| `npm run static:uikit:bundle:check` | ✓ Bundle is up to date (41/41 sections, 243.1 KB) |
| `npm run static:uikit:validate` | ✓ Errors: 0, Warnings: 0 |

New validator check: **G-extra 6** — fails if any HTML page under `static-uikit/pages/` contains orphan class `crm-actions`.

### Remaining class ownership candidates

| Rank | Task |
|------|------|
| 1 | **Dead CSS cleanup in `components/cards.css`** — remove `.crm-decision-panel`, `.crm-kpi-card`, `.crm-journal-table`, `.crm-compliance-queue`, `.crm-register-actions` |
| 2 | **Move `body[data-page="subject-edit"] .crm-edit-toast`** from `components/forms.css` to `pages/subject-edit.css` — restores component boundary |
| 3 | **Compliance checklist scoping** — scope `.crm-doc-checklist`, `.crm-doc-checklist-item` to `[data-page="compliance-card"]` in compliance.css |
| 4 | **`subject-section` rename** — rename bare class to `crm-subject-section` in HTML and CSS |
| 5 | **Remove orphan `crm-profile-section`** from 5 elements in subject-card.html / subject-card-individual.html |
| 6 | **Remove orphan `crm-subject-form-layout`** from 2 elements in subject-card.html / subject-card-individual.html |

---

## Detail Layout Ownership Cleanup Notes

**Date:** 2026-05-18

### Files changed

| File | Change |
|------|--------|
| `static-uikit/assets/css/components/detail-layout.css` | Created (new file) |
| `static-uikit/assets/css/pages/contract-wizard.css` | Removed shared detail-layout classes and responsive rules |
| `static-uikit/assets/css/crm-static.css` | Added `./components/detail-layout.css` import (42 total) |
| `static-uikit/tools/validate-static-uikit.mjs` | Added G-extra 7 guard |
| `static-uikit/audits/class-ownership-proliferation-audit.md` | Fixed duplicate row in wizard notes table; updated remaining candidates in orphan-actions notes |

### Classes moved to `components/detail-layout.css`

- `.crm-detail-layout`
- `.crm-detail-hero`
- `.crm-detail-hero-main`
- `.crm-detail-meta`
- `.crm-detail-actions`
- `.crm-detail-tabs`

### Responsive rules moved / split

| Rule | Action |
|------|--------|
| `@media (max-width: 1200px) { .crm-detail-actions { align-items: flex-start; } }` | Moved in full to `components/detail-layout.css` |
| `@media (max-width: 960px) { .crm-detail-hero { flex-direction: column; } }` | Moved to `components/detail-layout.css` |
| `@media (max-width: 960px) { .crm-detail-actions { width: 100%; } }` | Split from combined `.crm-detail-actions, .crm-page-actions` selector; detail part moved to `components/detail-layout.css` |
| `@media (max-width: 960px) { .crm-detail-actions .uk-button { width: 100%; } }` | Split from combined selector; detail part moved to `components/detail-layout.css` |
| `@media (max-width: 960px) { .crm-page-actions { width: 100%; } }` | Kept in `pages/contract-wizard.css` (unrelated selector, not a detail-layout class) |
| `@media (max-width: 960px) { .crm-page-actions .uk-button { width: 100%; } }` | Kept in `pages/contract-wizard.css` |

### HTML / JS class names

No HTML class names were changed. No JS class names were changed. All four pages (subject-card.html, subject-card-individual.html, trading-card.html, contract-wizard.html) continue to receive detail-layout styles via `components/detail-layout.css`, which loads before page CSS in the cascade.

### Cascade preservation

`components/detail-layout.css` loads before all `pages/*.css` imports. Page-specific overrides in `pages/subject-card.css` (`.crm-page[data-page="subject-card"] .crm-subject-hero`, `.crm-subject-actions`, etc.) and `pages/trading.css` (`.crm-page[data-page="trading-card"] .crm-trading-hero`, etc.) continue to win over base component definitions. The `crm-trading-hero crm-detail-hero` dual-class pattern on `trading-card.html` continues to work correctly.

### `.crm-subject-summary` decision

Not moved. Used only in `contract-wizard.html` (confirmed by grep — zero matches in other pages). Correctly stays in `pages/contract-wizard.css`.

### `.crm-radio-grid` decision

Not moved. Used only in the contract wizard context and remains in `pages/contract-wizard.css`.

### Manifest import update

- Before: 41 imports
- After: 42 imports (added `./components/detail-layout.css` after `./components/wizard.css`)

### Validator enhancement

**Implemented** — G-extra 7 added to `validate-static-uikit.mjs`:
- Checks `pages/contract-wizard.css` for unscoped definitions of `.crm-detail-layout`, `.crm-detail-hero`, `.crm-detail-hero-main`, `.crm-detail-meta`, `.crm-detail-actions`, `.crm-detail-tabs`.
- Fails if any are found; passes if they live in `components/detail-layout.css`.

### Build and validation results

| Check | Result |
|-------|--------|
| `npm run static:uikit:bundle` | ✓ Bundle written — 42/42 sections, 243.3 KB |
| `npm run static:uikit:bundle:check` | ✓ Bundle is up to date (42/42 sections, 243.3 KB) |
| `npm run static:uikit:validate` | ✓ Errors: 0, Warnings: 0 |

### Remaining class ownership candidates

| Rank | Task |
|------|------|
| 1 | **Dead CSS cleanup in `components/cards.css`** — remove `.crm-decision-panel`, `.crm-kpi-card`, `.crm-journal-table`, `.crm-compliance-queue`, `.crm-register-actions` |
| 2 | **Move `body[data-page="subject-edit"] .crm-edit-toast`** from `components/forms.css` to `pages/subject-edit.css` — restores component boundary |
| 3 | **Compliance checklist scoping** — scope `.crm-doc-checklist`, `.crm-doc-checklist-item` to `[data-page="compliance-card"]` in compliance.css |
| 4 | **`subject-section` rename** — rename bare class to `crm-subject-section` in HTML and CSS |
| 5 | **Remove orphan `crm-profile-section`** from 5 elements in subject-card.html / subject-card-individual.html |
| 6 | **Remove orphan `crm-subject-form-layout`** from 2 elements in subject-card.html / subject-card-individual.html |

---

## Export Light Button Ownership Cleanup Notes

**Date:** 2026-05-18

### Files changed

| File | Change |
|------|--------|
| `static-uikit/assets/css/components/buttons.css` | Added canonical `.crm-button-export-light` definition |
| `static-uikit/assets/css/pages/subjects.css` | Removed page-scoped `.crm-button-export-light` block |
| `static-uikit/assets/css/pages/compliance.css` | Removed page-scoped `.crm-button-export-light` block |
| `static-uikit/tools/validate-static-uikit.mjs` | Added G-extra 8 guard |

### Pages where `.crm-button-export-light` is used

- `pages/subjects.html`
- `pages/compliance.html`
- `pages/brokerage.html`

All three use the class on the same button pattern: `uk-button uk-button-default crm-button crm-button-secondary crm-button-export-light` (export CSV action in registry header actions).

### CSS files where it was previously defined

| File | Selector | Font-size |
|------|----------|-----------|
| `pages/subjects.css` | `.crm-page[data-page="subjects"] .crm-button-export-light` | `12px` |
| `pages/compliance.css` | `.crm-page[data-page="compliance"] .crm-button-export-light` | `13px` |

### Final canonical owner

`components/buttons.css` — unscoped `.crm-button-export-light`.

Canonical properties (subjects.css definition taken as authoritative):
- `min-height: 36px; height: 36px;`
- `padding: 0 14px;`
- `border-radius: 999px;`
- `border-color: color-mix(in srgb, var(--crm-umi-border) 88%, transparent);`
- `background: color-mix(in srgb, var(--crm-umi-surface) 85%, var(--crm-primary-soft) 15%);`
- `color: var(--crm-umi-text-secondary);`
- `font-size: 12px;`
- `font-weight: 500;`
- `box-shadow: none;`

### Font-size decision (compliance override)

`compliance.css` had `font-size: 13px`. No explicit visual requirement was documented for this value. The subjects.css value (`12px`) was chosen as the canonical value. No page-specific compliance override was kept.

### Page-specific override retained

None. Both page-scoped definitions were removed in full.

### HTML / JS unchanged

No HTML class names were changed. No JS files were touched. All three pages (subjects.html, compliance.html, brokerage.html) receive the export-light styles via `components/buttons.css`, which loads before page CSS in the cascade. `brokerage.html` now has an explicit component owner for this class for the first time.

### Validator enhancement

**Implemented** — G-extra 8 added to `validate-static-uikit.mjs`:
- Fails if `pages/subjects.css` contains `.crm-button-export-light`.
- Fails if `pages/compliance.css` contains `.crm-button-export-light`.
- Fails if `components/buttons.css` does not contain `.crm-button-export-light`.

### Build and validation results

| Check | Result |
|-------|--------|
| `npm run static:uikit:bundle` | ✓ Bundle written — 42/42 sections, 243.1 KB |
| `npm run static:uikit:bundle:check` | ✓ Bundle is up to date (42/42 sections, 243.1 KB) |
| `npm run static:uikit:validate` | ✓ Errors: 0, Warnings: 0 |

### Remaining class ownership candidates

| Rank | Task |
|------|------|
| 1 | **Dead CSS cleanup in `components/cards.css`** — remove `.crm-decision-panel`, `.crm-kpi-card`, `.crm-journal-table`, `.crm-compliance-queue`, `.crm-register-actions` |
| 2 | **Move `body[data-page="subject-edit"] .crm-edit-toast`** from `components/forms.css` to `pages/subject-edit.css` — restores component boundary |
| 3 | **Compliance checklist scoping** — scope `.crm-doc-checklist`, `.crm-doc-checklist-item` to `[data-page="compliance-card"]` in compliance.css |
| 4 | **`subject-section` rename** — rename bare class to `crm-subject-section` in HTML and CSS |
| 5 | **Remove orphan `crm-profile-section`** from 5 elements in subject-card.html / subject-card-individual.html |
| 6 | **Remove orphan `crm-subject-form-layout`** from 2 elements in subject-card.html / subject-card-individual.html |

---

## Cards Dead CSS Cleanup Notes

**Date:** 2026-05-18

### Files changed

| File | Change |
|------|--------|
| `static-uikit/assets/css/components/cards.css` | Removed confirmed dead class definitions |
| `static-uikit/tools/validate-static-uikit.mjs` | Added G-extra 9 guard |

### Classes verified as unused

All five candidate classes were confirmed unused by grepping all HTML pages under `static-uikit/pages/`, all JS files under `static-uikit/assets/js/`, and all source CSS files (excluding `crm-static.bundle.css`, `uikit.min.css`). Zero matches found outside `components/cards.css` and the generated bundle.

| Class | HTML matches | JS matches | Source CSS matches (excl. cards.css) |
|-------|-------------|-----------|--------------------------------------|
| `.crm-decision-panel` | 0 | 0 | 0 |
| `.crm-kpi-card` | 0 | 0 | 0 |
| `.crm-journal-table` | 0 | 0 | 0 |
| `.crm-compliance-queue` | 0 | 0 | 0 |
| `.crm-register-actions` | 0 | 0 | 0 |

### Classes removed

| Class | Location in cards.css | Removal type |
|-------|----------------------|--------------|
| `.crm-kpi-card` | Grouped selector with `.crm-form-card`, `.crm-create-panel`, `.crm-journal-table`, `.crm-compliance-queue` | Removed from group; group kept for live selectors |
| `.crm-journal-table` | Same grouped selector | Removed from group |
| `.crm-compliance-queue` | Same grouped selector | Removed from group |
| `.crm-register-actions` | Standalone rule | Entire rule removed |
| `.crm-decision-panel` | Standalone rule | Entire rule removed |

Live selectors preserved in the grouped border-radius rule: `.crm-form-card`, `.crm-create-panel`.

### Classes intentionally kept

None — all five candidates were confirmed dead and removed.

### Verification method

- `Grep` across `static-uikit/pages/*.html` — 0 matches for all five classes.
- `Grep` across `static-uikit/assets/js/` — 0 matches for all five classes.
- `Grep` across `static-uikit/assets/css/*.css` (all source files) — matches only in `components/cards.css` (source) and `crm-static.bundle.css` (generated; excluded from scope).

### Validator enhancement

**Implemented** — G-extra 9 added to `validate-static-uikit.mjs`:
- Reads `components/cards.css` and checks for any of the five dead class tokens using `makeSelectorBoundaryRegex`.
- Fails with an error if any dead class definition is found.
- Check label: `components/cards.css contains no confirmed dead class definitions`.

### Bundle generation result

`npm run static:uikit:bundle` — ✓ Bundle written — 42/42 sections, 242.9 KB

### Bundle check result

`npm run static:uikit:bundle:check` — ✓ Bundle is up to date (42/42 sections, 242.9 KB)

### Validation result

`npm run static:uikit:validate` — ✓ Errors: 0, Warnings: 0

### Remaining class ownership candidates

| Rank | Task |
|------|------|
| 1 | **`subject-section` rename** — rename bare class to `crm-subject-section` in `subject-card.html`, `subject-card-individual.html`, `subject-card.css` |
| 2 | **Remove orphan `crm-profile-section`** from 5 elements in `subject-card.html` / `subject-card-individual.html` |
| 3 | **Remove orphan `crm-subject-form-layout`** from 2 elements in `subject-card.html` / `subject-card-individual.html` |

---

## Subject Edit Toast Ownership Cleanup Notes

**Date:** 2026-05-18

### Files changed

| File | Change |
|------|--------|
| `static-uikit/assets/css/components/forms.css` | Removed `body[data-page="subject-edit"] .crm-edit-toast` rule |
| `static-uikit/assets/css/pages/subject-edit.css` | Added moved `body[data-page="subject-edit"] .crm-edit-toast` rule (sizing/layout supplement) |
| `static-uikit/tools/validate-static-uikit.mjs` | Added G-extra 10 guard |

### CSS rule moved

```css
/* Removed from: components/forms.css */
/* Added to:     pages/subject-edit.css */

body[data-page="subject-edit"] .crm-edit-toast {
  left: auto;
  width: max-content;
  max-width: min(360px, calc(100vw - 48px));
  box-sizing: border-box;
  line-height: 1.4;
}
```

### Previous owner

`components/forms.css` — a shared component file that should contain only unscoped form primitives. The rule was page-scoped and had no business in this file.

### Final owner

`pages/subject-edit.css` — the rule is added as a separate block after the existing `.crm-edit-toast.is-visible` rule, within the "Save feedback" section of the file.

### Usage verification

| Location | Class usage | Details |
|----------|-------------|---------|
| `pages/subject-edit.html` line 619 | `class="crm-edit-toast"` | On `body[data-page="subject-edit"]` — covered |
| `pages/subject-edit-individual.html` line 719 | `class="crm-edit-toast"` | Also on `body[data-page="subject-edit"]` (`data-subject-kind="individual"`) — covered |
| `assets/js/pages/subject-edit.js` | No direct class reference | JS uses `[data-entity="edit-toast"]` to find the element; toggles only `is-visible` |
| All other HTML pages | 0 matches | `crm-edit-toast` is not used on any other page |

### Cascade preservation

`pages/subject-edit.css` loads **after** `components/forms.css` in the cascade (pages load after components). Moving the rule to `subject-edit.css` does not weaken it — cascade order is unchanged or improved. The properties in the moved rule (`left`, `width`, `max-width`, `box-sizing`, `line-height`) have zero overlap with the existing base toast rule already in `subject-edit.css` (`position`, `right`, `bottom`, `z-index`, `background`, `color`, `font-size`, `padding`, `border-radius`, `box-shadow`, `opacity`, `transform`, `transition`, `pointer-events`), so both rules apply additively with no conflicts.

### HTML / JS unchanged

No HTML files were changed. No JS files were changed.

### Validator enhancement

**Implemented** — G-extra 10 added to `validate-static-uikit.mjs`:
- Fails if `components/forms.css` contains `body[data-page="subject-edit"] .crm-edit-toast`.
- Fails if `pages/subject-edit.css` does not contain `.crm-edit-toast`.
- Check labels: `components/forms.css contains no body[data-page="subject-edit"] .crm-edit-toast rule` and `pages/subject-edit.css contains .crm-edit-toast definition`.

### Bundle generation result

`npm run static:uikit:bundle` — ✓ Bundle written — 42/42 sections, 242.9 KB

### Bundle check result

`npm run static:uikit:bundle:check` — ✓ Bundle is up to date (42/42 sections, 242.9 KB)

### Validation result

`npm run static:uikit:validate` — ✓ Errors: 0, Warnings: 0

### Remaining class ownership candidates

| Rank | Task |
|------|------|
| 1 | **`subject-section` rename** — rename bare class to `crm-subject-section` in `subject-card.html`, `subject-card-individual.html`, `subject-card.css` |
| 2 | **Remove orphan `crm-profile-section`** from 5 elements in `subject-card.html` / `subject-card-individual.html` |
| 3 | **Remove orphan `crm-subject-form-layout`** from 2 elements in `subject-card.html` / `subject-card-individual.html` |

---

## Compliance Checklist Scoping Cleanup Notes

**Date:** 2026-05-18

### Files changed

| File | Change |
|------|--------|
| `static-uikit/assets/css/pages/compliance.css` | Scoped `.crm-doc-checklist*` selectors to `.crm-page[data-page="compliance-card"]` |
| `static-uikit/tools/validate-static-uikit.mjs` | Added G-extra 11 guard |

### Checklist selectors scoped

| Before | After |
|--------|-------|
| `.crm-doc-checklist` | `.crm-page[data-page="compliance-card"] .crm-doc-checklist` |
| `.crm-doc-checklist-item` | `.crm-page[data-page="compliance-card"] .crm-doc-checklist-item` |
| `.crm-doc-checklist-item strong` | `.crm-page[data-page="compliance-card"] .crm-doc-checklist-item strong` |
| `.crm-doc-checklist-item p` | `.crm-page[data-page="compliance-card"] .crm-doc-checklist-item p` |

All declarations preserved exactly — no values changed.

### Usage verification

| Location | Finding |
|----------|---------|
| `pages/compliance-card.html` | 4 elements use `crm-doc-checklist` / `crm-doc-checklist-item` (lines 240–262) |
| `pages/compliance.html` | 0 matches — class absent |
| All other HTML pages | 0 matches |
| All 9 JS files | 0 matches — no JS dependency |
| CSS definition (before) | `pages/compliance.css` — unscoped, no `[data-page]` guard |

### HTML / JS unchanged

No HTML files were changed. No JS files were changed.

### Visual behavior preservation

The compliance-card checklist layout is unchanged. All four rules preserve their exact declarations. The compliance registry page (`data-page="compliance"`) has no checklist elements and is unaffected. No unrelated compliance-card selectors were touched.

### Validator enhancement

**Implemented** — G-extra 11 added to `validate-static-uikit.mjs`:
- Uses `collectRuleSelectorEntriesByContext` to scan `pages/compliance.css` for entries where any selector-list part exactly equals `.crm-doc-checklist` or `.crm-doc-checklist-item` (i.e., an unscoped bare definition).
- Fails with an error if any such unscoped entry is found.
- Check label: `pages/compliance.css .crm-doc-checklist* selectors are scoped to .crm-page[data-page="compliance-card"]`.

### Bundle generation result

`npm run static:uikit:bundle` — ✓ Bundle written — 42/42 sections, 243.1 KB

### Bundle check result

`npm run static:uikit:bundle:check` — ✓ Bundle is up to date (42/42 sections, 243.1 KB)

### Validation result

`npm run static:uikit:validate` — ✓ Errors: 0, Warnings: 0

New validator check: **G-extra 11** — fails if `pages/compliance.css` contains unscoped bare definitions for `.crm-doc-checklist` or `.crm-doc-checklist-item`.

### Remaining class ownership candidates

| Rank | Task |
|------|------|
| 1 | **`subject-section` rename** — rename bare class to `crm-subject-section` in `subject-card.html`, `subject-card-individual.html`, `subject-card.css` |
| 2 | **Remove orphan `crm-profile-section`** from 5 elements in `subject-card.html` / `subject-card-individual.html` |
| 3 | **Remove orphan `crm-subject-form-layout`** from 2 elements in `subject-card.html` / `subject-card-individual.html` |

---

## Subject Card Class Cleanup Notes

**Date:** 2026-05-18

### Files changed

| File | Change |
|------|--------|
| `static-uikit/pages/subject-card.html` | Renamed `subject-section` → `crm-subject-section` (1 element); removed `crm-profile-section` (3 elements); removed `crm-subject-form-layout` (1 element) |
| `static-uikit/pages/subject-card-individual.html` | Renamed `subject-section` → `crm-subject-section` (1 element); removed `crm-profile-section` (2 elements); removed `crm-subject-form-layout` (1 element) |
| `static-uikit/assets/css/pages/subject-card.css` | Renamed selector `.subject-section .crm-form-section-head` → `.crm-subject-section .crm-form-section-head` |
| `static-uikit/tools/validate-static-uikit.mjs` | Added G-extra 12 guard |

### `subject-section` rename result

**Renamed** `subject-section` → `crm-subject-section` in both HTML pages and `subject-card.css`.

- `subject-card.html` (addresses article): `subject-section` → `crm-subject-section`
- `subject-card-individual.html` (addresses article): `subject-section` → `crm-subject-section`
- `subject-card.css`: `.subject-section .crm-form-section-head` → `.crm-subject-section .crm-form-section-head`

All CSS declarations preserved exactly. No other subject-card classes touched.

### `crm-profile-section` removal result

**Removed** from 5 HTML elements (3 in `subject-card.html`, 2 in `subject-card-individual.html`).

Class had no CSS definition in any source file and no JS dependency. Elements retain all live classes: `crm-card`, `crm-form-card`, `crm-section`, `crm-subject-profile-section`. No visual change.

### `crm-subject-form-layout` removal result

**Removed** from 2 HTML elements (1 in each page). Class had no CSS definition and no JS dependency. Elements retain `crm-subject-section-layout`. No visual change.

### JS unchanged

Zero JS files were changed. Grep across all 9 JS files under `static-uikit/assets/js/` confirmed zero matches for `subject-section`, `crm-profile-section`, and `crm-subject-form-layout`.

### Visual behavior preservation

- `crm-subject-section` is defined in `subject-card.css` (renamed selector) — styling preserved exactly.
- `crm-profile-section` and `crm-subject-form-layout` had no CSS definitions — removal is visually inert.
- All other classes on affected elements (`crm-card`, `crm-form-card`, `crm-section`, `crm-subject-profile-section`) are unchanged.

### Validator enhancement

**Implemented** — G-extra 12 added to `validate-static-uikit.mjs`:
- Fails if `subject-card.html` or `subject-card-individual.html` contains class token `subject-section`.
- Fails if either page contains class token `crm-profile-section`.
- Fails if either page contains class token `crm-subject-form-layout`.
- Fails if `subject-card.css` contains `.subject-section` (bare unrenamed selector).
- Passes if `subject-card.css` contains `.crm-subject-section`.

### Bundle generation result

`npm run static:uikit:bundle` — ✓ Bundle written — 42/42 sections, 243.1 KB

### Bundle check result

`npm run static:uikit:bundle:check` — ✓ Bundle is up to date (42/42 sections, 243.1 KB)

### Validation result

`npm run static:uikit:validate` — ✓ Errors: 0, Warnings: 0

New validator check: **G-extra 12** — guards subject-card class naming and orphan removal.

### Remaining class ownership candidates

None from the subject-card class cleanup scope. The class ownership / proliferation audit for this scope is complete. Optional remaining work: visual regression testing of subject-card pages, and a final global audit pass.
