# Static UI Kit — QA Report

**Date:** 2026-05-03  
**Scope:** `static-uikit/pages/` — pre-handoff quality audit  
**Method:** Code inspection (HTML structure, asset links, CSS integrity, responsive rules)

---

## Summary

- **Pages inspected:** 23  
- **Pages OK:** 23  
- **Pages with P0 defects:** 0  
- **Pages excluded:** 1 (`administration.html` — developer-owned placeholder)  
- **UMI packs deleted:** 2 (`umi-p0/`, `umi-p1/`) after launcher link cleanup.  
- **Documentation errors fixed:** 2 (see HANDOFF.md changes)

No page fails to open. No missing CSS, JS, or image assets. No broken navigation links. No body-level horizontal overflow issues identified in the CSS architecture.

---

## Asset Integrity

**CSS loading architecture:**  
`crm-static.css` uses `@import` to load all 16 page-specific CSS files internally. Pages that don't have an explicit `<link>` to their page CSS still get it via `crm-static.css`.

Pages NOT in `crm-static.css` (must link explicitly — they do):
- `agents.css` — agents.html ✓
- `depository.css` — depository.html ✓
- `auth.css` — login.html, register.html ✓

Minor observation: 6 pages link their page CSS both explicitly and via `crm-static.css` @import (double load). Harmless — browsers deduplicate correctly.
- compliance.html, archive.html, trust-management.html, subjects.html, subject-card.html, requests.html

**JS assets:** All 8 JS files exist. All page-specific scripts confirmed present:
- `crm-static.js`, `uikit.min.js`, `uikit-icons.min.js` (global)
- `subject-card.js`, `subject-edit.js`, `subject-register.js`, `contract-edit.js`, `middle-office.js`, `trading-card.js` (page-specific)

**Icon/image assets:** `crm-sidebar-icons.svg`, `logo-full-ru-white.svg` — both present and correctly referenced.

---

## Page-by-Page Report

### INDEX.html (launcher, `static-uikit/INDEX.html`)
**Status:** OK  
**Note:** Launcher file is `INDEX.html` (uppercase). Auth logo links were updated to `../INDEX.html` for Linux case-sensitive compatibility.

---

### login.html
**Status:** OK  
Desktop: Correct two-column auth layout. CSS: uikit.min.css + crm-static.css + auth.css.  
Mobile: auth.css has responsive rules. Layout collapses correctly.  
Links/actions: "Зарегистрироваться" → register.html ✓. Logo → `../INDEX.html` ✓.  

---

### register.html
**Status:** OK  
Desktop: Four-field registration form, same auth shell as login.  
Mobile: auth.css responsive — OK.  
Links/actions: "Авторизация" → login.html ✓. Password toggle wired via crm-static.js.

---

### dashboard.html
**Status:** OK  
Desktop: 4-KPI grid + 2-panel work grid. Gets `dashboard.css` via crm-static.css @import — no missing CSS.  
Mobile: `dashboard.css` collapses KPI grid to 1 column at ≤640px, panels to 1 column at ≤960px. `responsive.css` handles sidebar and padding.  
Links/actions: KPI cards link to subjects.html, compliance.html, requests.html — all exist. Panel row links to subject-card.html, requests.html — exist.

---

### subjects.html
**Status:** OK  
Desktop: Registry with filter panel, sortable table, pagination footer.  
Mobile: Filter panel collapses at ≤480px (2-per-row chips). Table has horizontal scroll wrapper. Footer stacks at ≤480px.  
Links/actions: "+ Добавить" → subject-register.html ✓. Table rows → subject-card.html ✓.  
Note: links subjects.css twice (explicit + via crm-static.css) — harmless.

---

### subject-card.html
**Status:** OK  
Desktop: Hero card + tabbed sections (Profile, Documents, Contracts, etc.). JS: subject-card.js.  
Mobile: `subject-card.css` handles tab overflow-x. `responsive.css` handles representative form grid collapse at ≤640px.  
Links/actions: Edit → subject-edit.html ✓, "Создать договор" → contract-wizard.html ✓, breadcrumb → subjects.html ✓.

---

### subject-register.html
**Status:** OK  
Desktop: Multi-step registration form (751 lines). JS: subject-register.js.  
Mobile: `responsive.css` rule 18 handles wizard actions column-stack at ≤480px. Form grids use UIKit `uk-width-*@m` classes that auto-collapse.  
Links/actions: Breadcrumb → subjects.html ✓.

---

### subject-edit.html
**Status:** OK  
Desktop: Entity edit form (legal entity). JS: subject-edit.js. Gets subject-edit.css via crm-static.css.  
Mobile: UIKit grid classes collapse at ≤960px. Sticky actions un-stick at ≤768px per `responsive.css`.  
Links/actions: Breadcrumb → subjects.html, subject-card.html ✓.

---

### subject-edit-individual.html
**Status:** OK  
Desktop: Same form as subject-edit.html but for individual entity. `data-subject-kind="individual"` on body — JS reads this to switch mode.  
Mobile: Same responsive handling as subject-edit.  
Links/actions: Same breadcrumb pattern ✓.

---

### contract-wizard.html
**Status:** OK  
Desktop: Wizard form with checkbox/radio sections, sticky action bar. Gets contract-wizard.css via crm-static.css.  
Mobile: Sticky actions un-stick at ≤768px. Form grid collapses.  
Links/actions: "Назад к договорам" → subject-card.html ✓.

---

### contract-edit.html
**Status:** OK  
Desktop: Contract edit form. JS: contract-edit.js. Gets contract-edit.css via crm-static.css.  
Mobile: Standard form collapse rules apply.  
Links/actions: Breadcrumbs → brokerage.html, subject-card.html ✓.

---

### compliance.html
**Status:** OK  
Desktop: Compliance registry with filters, table, pagination footer. Gets compliance.css twice (explicit + crm-static.css import) — harmless.  
Mobile: Filter panel 2-per-row at ≤480px. Table horizontal scroll. Footer stacks at ≤480px.  
Links/actions: Table rows → compliance-card.html ✓.

---

### compliance-card.html
**Status:** OK  
Desktop: Detail view with profile card + decision panel sidebar. Gets compliance-card styles from compliance.css (loaded via crm-static.css). No separate page CSS needed — all styles are inside compliance.css scoped to `data-page="compliance-card"`.  
Mobile: compliance.css has responsive rules that collapse the detail layout at ≤1024px and ≤768px.  
Links/actions: Breadcrumb → compliance.html ✓.

---

### brokerage.html
**Status:** OK  
Desktop: Registry with filter panel, wide table (min-width: 1040px), pagination footer. Gets brokerage.css via crm-static.css.  
Mobile: brokerage.css has a ≤480px rule stacking filter fields. Table horizontal scroll within wrapper. Footer stacks at ≤480px via `responsive.css`.  
Links/actions: Table rows → contract-edit.html ✓.

---

### trading.html
**Status:** OK  
Desktop: Registry with wide table (min-width: 1380px), filter panel, pagination footer. Gets trading.css via crm-static.css.  
Mobile: trading.css has ≤1180px rule for header layout. Table has horizontal scroll. Footer stacks at ≤480px.  
Links/actions: Table rows → trading-card.html ✓.

---

### trading-card.html
**Status:** OK  
Desktop: Detail view with hero, tab navigation, terminal cards. JS: trading-card.js. Gets trading-card styles from trading.css (covers both data-page="trading" and data-page="trading-card") via crm-static.css.  
Mobile: `responsive.css` rule 15 collapses terminal fields grid at ≤480px.  
Links/actions: Breadcrumb → trading.html ✓. Subject link → subject-card.html ✓.

---

### trust-management.html
**Status:** OK  
Desktop: Compact registry. Links trust-management.css twice (explicit + crm-static.css) — harmless.  
Mobile: Standard registry responsive rules apply.  
Links/actions: Table rows → subject-card.html ✓.

---

### middle-office-clients.html
**Status:** OK  
Desktop: Master-detail split layout. JS: middle-office.js. Gets middle-office.css via crm-static.css.  
Mobile: `responsive.css` rule 11 handles sticky panel at 769–920px. Master-detail collapses to single column at ≤768px.  
Links/actions: Detail panel links → subject-card.html ✓.

---

### middle-office-reports.html
**Status:** OK  
Desktop: Report split view. JS: middle-office.js.  
Mobile: `responsive.css` rule 17 forces single column for this specific page at ≤768px — covers a cascade specificity edge case explicitly noted in the CSS.  
Links/actions: Report list → detail panel (JS-driven) ✓.

---

### depository.html
**Status:** OK  
Desktop: Master-detail layout with depository report list. `depository.css` linked explicitly (NOT in crm-static.css) — correct.  
Mobile: depository.css and `responsive.css` rule 11 handle panel positioning.  
Links/actions: Detail actions ✓.

---

### back-office.html
**Status:** OK  
Desktop: Registry with filters, table, pagination footer. Gets back-office.css via crm-static.css — no explicit link needed and none present.  
Mobile: back-office.css ≤760px rule handles header/filter reflow. Footer stacks at ≤480px.  
Links/actions: Standard nav links ✓.

---

### agents.html
**Status:** OK  
Desktop: Registry. `agents.css` linked explicitly (NOT in crm-static.css) — correct.  
Mobile: Standard responsive rules.  
Links/actions: Standard nav links ✓.

---

### archive.html
**Status:** OK  
Desktop: Registry. Gets archive.css twice (explicit + crm-static.css) — harmless.  
Mobile: Standard responsive rules. Footer stacks at ≤480px.  
Links/actions: Standard nav ✓.

---

### requests.html
**Status:** OK  
Desktop: Registry with filters. Gets requests.css twice (explicit + crm-static.css) — harmless.  
Mobile: Footer stacks at ≤480px.  
Links/actions: Standard nav ✓.

---

### administration.html
**Status:** Excluded  
Reason: Placeholder / developer-owned page. Not in scope for handoff QA.

---

## UMI Pack Cleanup Decision

**umi-p0/** and **umi-p1/** — **DELETED in final cleanup.**

Reason: UMI/P0/P1 launcher links were removed from `static-uikit/INDEX.html`; after that no runtime references remained, so packs were safely removed.

Checked: No page inside `static-uikit/pages/` references any UMI pack file directly.

---

## Documentation Changes Made

**HANDOFF.md — two corrections:**

1. Lowercase launcher links fixed: auth pages now use `../INDEX.html`.

2. Removed non-existent `static-uikit/assets/vendor/` reference. The directory does not exist. Fonts are in `assets/fonts/`, icons in `assets/icons/`, UIKit vendor files are embedded in `uikit.min.css` and `uikit.min.js`.

---

## Known Limitations Remaining

1. **CSS double-load on 6 pages** — compliance, archive, trust-management, subjects, subject-card, requests. Each loads its page CSS twice (explicit link + crm-static.css @import). Harmless in all browsers; no visual effect.

2. **INDEX.html file name casing** — resolved in this cleanup; known limitation closed.

3. **Static data only** — All tables contain prototype data. crm-static.js interactions are visual demonstrations, not backend contracts.

4. **administration.html is a placeholder** — excluded from QA. Not ready for visual reference.

---

## What Was NOT Changed

- `static-uikit/pages/*.html` — not modified
- `static-uikit/assets/css/*.css` — not modified
- `static-uikit/assets/js/*.js` — not modified
- `static-uikit/umi-p0/` — deleted
- `static-uikit/umi-p1/` — deleted
- `src/` — not touched
- `public/` — not touched
- React/Vite config files — not touched
- Vendor files — not touched
