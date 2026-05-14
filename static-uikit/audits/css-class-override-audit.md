# CSS Class Override Audit

**Project:** Инвестика CRM — static-uikit  
**Audit date:** 2026-05-14  
**Auditor:** CSS Override / Selector Conflict Audit  
**Source of truth:** `static-uikit/` only  
**Version:** 1.0  
**Status:** Audit only — no CSS, HTML, JS, or bundle files were modified.

---

## 1. Executive Summary

The static-uikit CSS architecture is layered (base → layout → components → pages → responsive → print), uses a single `crm-static.css` import manifest, and has undergone significant cleanup through Tasks A–D and Batches 1–3 (May 2026). Several high-confidence duplicates were consolidated. However, **five structural problems remain** that are the focus of this report:

| # | Problem | Severity | Files |
|---|---------|----------|-------|
| 1 | `layout/app.css` is a legacy monolith defining sidebar, topbar, AND page shell — the other layout files provide refinement overrides rather than being canonical owners | High | `app.css`, `sidebar.css`, `topbar.css`, `page.css` |
| 2 | `:root` CSS custom property values are split across three files with conflicting definitions; the token values in `base/tokens.css` are silently overridden by layout files | High | `tokens.css`, `sidebar.css`, `topbar.css` |
| 3 | `components/cards.css` contains responsive and print overrides for **layout-layer** classes (`.crm-layout`, `.crm-sidebar`, `.crm-topbar`, `.crm-page`), duplicating rules that also exist in `responsive.css` | High | `cards.css`, `responsive.css` |
| 4 | Three CSS custom properties (`--crm-layer-card-border`, `--crm-layer-card-radius`, `--crm-layer-gap-sm`) are used in `filters.css` and `modals.css` without fallback values and are **not defined anywhere** | Medium | `filters.css`, `modals.css`, `tables.css` |
| 5 | `layout/topbar.css` contains a cross-concern `!important` button radius override and nav-link rules that belong in `components/buttons.css` and `layout/sidebar.css` | Medium | `topbar.css`, `buttons.css` |

**Overall verdict:** The source CSS is functionally correct today. The bundle (`crm-static.bundle.css`) is the runtime file, is generated from the source, and is the actual stylesheet used by all HTML pages. The refactor risk is medium: the cascade depends on the current import order, and `!important` chains make some overrides fragile. The undefined custom properties are a latent visual bug for `.crm-modal-dialog` and bare `.crm-filter-panel` elements.

**Top 5 highest-risk areas:**
1. The `:root` multi-file token chain (effective values differ from `tokens.css` authoring intent)
2. `layout/app.css` as a first-pass monolith (every layout-layer class is defined twice)
3. `layout/topbar.css` button `border-radius: 10px !important` (cross-layer concern, breaks single-responsibility)
4. Undefined `--crm-layer-card-*` variables in `modals.css` and `filters.css` (silent visual bugs)
5. Duplicate mobile sidebar rules in `cards.css` vs `responsive.css` (both define the same off-canvas behavior)

---

## 2. Current Stylesheet Architecture

### Directory structure

```
static-uikit/assets/css/
├── crm-static.css              ← canonical entrypoint / import manifest (45 lines, @import only)
├── crm-static.bundle.css       ← generated distribution artifact (257 KB, 10 139 lines)
├── uikit.min.css               ← UIkit 3.x vendor (284 KB, not edited)
├── base/
│   ├── fonts.css               ← @font-face for Inter + Inter Tight
│   ├── tokens.css              ← CSS custom properties (:root)
│   └── reset.css               ← box-sizing, body defaults, scrollbar
├── layout/
│   ├── app.css                 ← legacy monolith: sidebar + topbar + page + scrollbar + nav (259 lines)
│   ├── sidebar.css             ← sidebar parity/refinement overrides + :root re-declarations (138 lines)
│   ├── topbar.css              ← topbar + search preview + nav + button override + :root re-declarations (332 lines)
│   └── page.css                ← launcher page + crm-page refinements + sticky actions + media queries (187 lines)
├── components/
│   ├── cards.css               ← cards, toolbar, option grid, check/radio tiles, focus ring, + layout @media (411 lines)
│   ├── buttons.css             ← .uk-button override + CRM button variants (81 lines)
│   ├── forms.css               ← inputs, selects, textarea, date field, radio (133 lines)
│   ├── subject-form.css        ← shared subject form headings/actions (34 lines)
│   ├── address.css             ← FIAS address module (474 lines)
│   ├── badges.css              ← .crm-badge + 5 semantic variants (52 lines)
│   ├── tables.css              ← table wrapper, head, body, pagination, col utilities (435 lines)
│   ├── tabs.css                ← .crm-tabs + UIkit tab override (28 lines)
│   ├── filters.css             ← filter panel, dropdown, trigger (314 lines)
│   ├── registry.css            ← shared registry / list-page patterns (683 lines)
│   └── modals.css              ← modal dialog border/radius (6 lines)
├── pages/
│   └── [21 page CSS files]     ← page-scoped styles, all imported in crm-static.css
├── responsive.css              ← mobile breakpoints only (439 lines, 18 documented sections)
├── print.css                   ← intentionally blank ("styles moved incrementally")
└── document-templates/         ← isolated print template CSS, not in scope
```

### Cascade layer order (effective)

```
1. uikit.min.css          (vendor, not edited)
2. base/fonts.css
3. base/tokens.css         ← :root tokens FIRST definition
4. base/reset.css
5. layout/app.css          ← sidebar + topbar + page FIRST definitions
6. layout/sidebar.css      ← :root OVERRIDES tokens; sidebar REFINEMENTS over app.css
7. layout/topbar.css       ← :root OVERRIDES tokens and sidebar; topbar REFINEMENTS over app.css; nav-link + button CROSS-CONCERN
8. layout/page.css         ← crm-page THIRD definition; launcher-only selectors
9. components/cards.css    ← .crm-filter-panel FIRST; + layout @media (wrong layer)
10. components/buttons.css
11. components/forms.css
12. components/subject-form.css
13. components/address.css
14. components/badges.css
15. components/tables.css  ← .crm-table-wrapper MULTIPLE DEFINITIONS in same file
16. components/tabs.css    ← .crm-tabs DUPLICATE DEFINITION in same file
17. components/filters.css ← .crm-filter-panel SECOND (undefined-var overrides cards.css)
18. components/registry.css
19. components/modals.css
20. pages/[21 files]       ← page-scoped overrides
21. responsive.css         ← intentional late-cascade responsive overrides
22. print.css              ← intentionally blank
```

---

## 3. CSS Import Order from crm-static.css

`static-uikit/assets/css/crm-static.css` is a clean 45-line @import manifest. All 44 imported files listed below:

```css
@import "./base/fonts.css";
@import "./base/tokens.css";
@import "./base/reset.css";

@import "./layout/app.css";
@import "./layout/sidebar.css";
@import "./layout/topbar.css";
@import "./layout/page.css";

@import "./components/cards.css";
@import "./components/buttons.css";
@import "./components/forms.css";
@import "./components/subject-form.css";
@import "./components/address.css";
@import "./components/badges.css";
@import "./components/tables.css";
@import "./components/tabs.css";
@import "./components/filters.css";
@import "./components/registry.css";
@import "./components/modals.css";

@import "./pages/dashboard.css";
@import "./pages/subjects.css";
@import "./pages/subject-card.css";
@import "./pages/contract-wizard.css";
@import "./pages/contract-edit.css";
@import "./pages/subject-register.css";
@import "./pages/subject-edit.css";
@import "./pages/brokerage.css";
@import "./pages/trust-management.css";
@import "./pages/requests.css";
@import "./pages/back-office.css";
@import "./pages/archive.css";
@import "./pages/agents.css";
@import "./pages/compliance.css";
@import "./pages/middle-office.css";
@import "./pages/trading.css";
@import "./pages/depository.css";
@import "./pages/document-wizard.css";
@import "./pages/error.css";
@import "./pages/search-results.css";

@import "./responsive.css";
@import "./print.css";
```

**Previously reported issues now resolved:**
- P1-01: `crm-static.css` no longer contains CSS rules after @import (4 sidebar-brand rules were moved to `layout/sidebar.css`)
- P1-02: `subject-register.html` and `subject-edit-individual.html` no longer double-load CSS
- P1-03: `agents.css` and `depository.css` are now imported in `crm-static.css` (lines 33 and 38)

**Cascade effects of current import order:**

The layout layer creates a deliberate cascade chain:
- `app.css` provides FIRST definitions for all shell selectors (`.crm-sidebar`, `.crm-topbar`, `.crm-page`, `.crm-nav-link`, etc.)
- `sidebar.css` re-declares a subset of those selectors as parity corrections (always wins over `app.css` for matching selectors because it loads later)
- `topbar.css` re-declares another subset (wins over both `app.css` and `sidebar.css`)
- `page.css` re-declares `.crm-page` again (wins over `topbar.css`)

This means the "canonical" definition for most layout selectors is **not** in `app.css` — it is in the last file that defines that selector. The layout layer is therefore a cascade chain, not clean single-responsibility files.

---

## 4. Bundle / Runtime Stylesheet Relationship

### Which pages load which CSS

| CSS source | Pages that link it |
|-----------|-------------------|
| `assets/css/uikit.min.css` | ALL 29 HTML pages |
| `assets/css/crm-static.bundle.css` | ALL 29 HTML pages |
| `assets/css/pages/auth.css` | `login.html`, `register.html`, `forgot-password.html` only |

**Critical finding: Every HTML page loads `crm-static.bundle.css`, not `crm-static.css`.** The modular source CSS and `crm-static.css` are **not** directly served to browsers. The bundle is the current production runtime stylesheet.

### Bundle characteristics

| Property | Value |
|----------|-------|
| File | `static-uikit/assets/css/crm-static.bundle.css` |
| Size | 257,837 bytes |
| Lines | 10,139 |
| @import directives | None (bundle is fully inlined) |
| Section markers | Yes: `/* ===== base/fonts.css ===== */` etc. |
| Font URL path | `../fonts/` (adjusted from source's `../../fonts/`) |
| Header comment | "generated CSS bundle / Runtime convenience artifact for UMI/PHP" |
| Manual editing instruction | "Do not edit this bundle manually for feature/style work. Regenerate the bundle after modular CSS changes." |

### Is the bundle generated or manually maintained?

The bundle is **generated**, not manually maintained:
- The header comment explicitly states it is a generated artifact
- Cleanup status notes in `CSS_DUPLICATE_AND_CLASS_COMBINATION_AUDIT.md` record "Bundle regenerated" after every CSS change (Tasks A, B, C, D, D2, D4, D6–D11, Batch 2, Batch 3)
- Font URL paths differ from source (`../fonts/` vs `../../fonts/`) — consistent with a concatenation build step that resolves relative paths

### Does the bundle differ from source CSS?

Yes, in one known respect: font `url()` paths are adjusted. All other CSS rules appear to be a straightforward inline concatenation of the source files in import order.

### Does the bundle contain rules not in source? Or vice-versa?

No evidence of bundle-only rules was found. The bundle appears to be a direct concatenation of all source CSS files in `crm-static.css` import order.

### Bundle generation script

**No build script or `tools/` directory exists** in `static-uikit/`. The mechanism that produced the bundle is undocumented. This is a process risk: if source CSS is modified, the bundle must be manually regenerated using an undocumented process.

### Recommended source of truth

The preferred canonical source of truth is:
- **`static-uikit/assets/css/`** modular CSS files (the source)
- **`crm-static.css`** as the import manifest / entrypoint
- **`crm-static.bundle.css`** as a generated distribution artifact — must not be manually edited for feature/style work

---

## 5. Duplicate Selector Inventory

### Cross-file duplicates

The following selectors are defined in more than one source file. In each case the **last file in the import order wins** for any shared property.

---

**DX-01 — `:root` CSS custom property values**

| Property | `tokens.css` value | `sidebar.css` value | `topbar.css` value | Effective (runtime) |
|----------|--------------------|---------------------|---------------------|---------------------|
| `--crm-sidebar-w` | `276px` | `270px` | `270px` | **270px** (topbar.css wins) |
| `--crm-topbar-h` | `62px` | `64px` | `64px` | **64px** (topbar.css wins) |
| `--crm-page-max-w` | not defined | not defined | `1440px` | **1440px** |
| `--crm-page-pad-x` | not defined | not defined | `24px` | **24px** |
| `--crm-page-pad-y` | not defined | not defined | `22px` | **22px** |
| `--crm-card-radius` | not defined | not defined | `14px` | **14px** |
| `--crm-panel-radius` | not defined | not defined | `14px` | **14px** |

**Classification:** Accidental drift between layers. The `tokens.css` values for `--crm-sidebar-w` (276px) and `--crm-topbar-h` (62px) are never used at runtime because `sidebar.css` and `topbar.css` override them. Tokens added in `topbar.css` were not backfilled to `tokens.css`.  
**Canonical owner:** `base/tokens.css` (all custom properties should be defined once, here).  
**Action:** In a future refactor, move all `:root` token declarations to `tokens.css` and remove the `:root` blocks from `sidebar.css` and `topbar.css`.

---

**DX-02 — `.crm-sidebar`**

| File | Properties defined | Notes |
|------|-------------------|-------|
| `layout/app.css` | `font-family`, `background`, `color`, `padding`, `position`, `top`, `height`, `overflow-y`, `box-shadow`, `scrollbar-width`, `scrollbar-color` | First/base definition |
| `layout/sidebar.css` | `width`, `background` | Parity refinement — width intended to match the updated token; background repeats the same gradient |

**Classification:** Intentional parity/override. `sidebar.css` is the designated parity file.  
**Conflicting properties:** `background` (both define the same gradient — exact duplicate).  
**Action:** Remove the duplicate `background` from `sidebar.css`. Move `width` to `tokens.css` via `--crm-sidebar-w` (which `app.css` already uses). Then `sidebar.css`'s `.crm-sidebar` block becomes unnecessary.

---

**DX-03 — `.crm-sidebar-brand`**

| File | Properties | Notes |
|------|-----------|-------|
| `layout/app.css` | `height`, `flex-shrink`, `display`, `align-items`, `justify-content`, `padding`, `border-bottom`, `margin`, `border-radius`, `overflow` | Full definition |
| `layout/sidebar.css` | `height`, `padding` | Refinement — same values as app.css; exact duplicate for `height` |

**Classification:** Partial duplicate. `height: var(--crm-topbar-h)` and `padding: 0 18px` appear in both files with identical values.  
**Action:** Remove duplicate properties from `sidebar.css`; keep only genuine refinements.

---

**DX-04 — `.crm-sidebar .crm-nav-link > span:first-child`**

| File | Properties |
|------|-----------|
| `layout/app.css` L86–93 | `display: inline-flex; align-items: center; gap: 10px; min-width: 0; flex: 1 1 0;` |
| `layout/sidebar.css` L37–44 | **Identical** `display: inline-flex; align-items: center; gap: 10px; min-width: 0; flex: 1 1 0;` |

**Classification:** Exact duplicate — accidental.  
**Action:** Remove from one file. Canonical owner: `layout/sidebar.css` (the parity file).

---

**DX-05 — `.crm-sidebar .crm-nav-link svg.crm-nav-icon, .crm-sidebar .crm-nav-icon`**

| File | Properties |
|------|-----------|
| `layout/app.css` L93–105 | `width: 24px; height: 24px; min-width: 24px; max-width: 24px; min-height: 24px; max-height: 24px; flex: 0 0 24px; display: block; color: currentColor; overflow: visible;` |
| `layout/sidebar.css` L45–57 | **Identical** same 10 declarations |

**Classification:** Exact duplicate — accidental.  
**Action:** Remove from `app.css`. Canonical owner: `layout/sidebar.css`.

---

**DX-06 — `.crm-sidebar .crm-nav-link [uk-icon]`**

| File | Properties |
|------|-----------|
| `layout/app.css` L107–114 | `width: 16px; height: 16px; flex: 0 0 16px; display: inline-flex; align-items: center; justify-content: center;` |
| `layout/sidebar.css` L59–66 | **Identical** same 6 declarations |

**Classification:** Exact duplicate — accidental.  
**Action:** Remove from `app.css`. Canonical owner: `layout/sidebar.css`.

---

**DX-07 — `.crm-topbar`**

| File | Properties |
|------|-----------|
| `layout/app.css` | `height`, `background`, `border-bottom`, `display`, `align-items`, `justify-content`, `gap`, `padding`, `position`, `top`, `z-index`, `backdrop-filter` |
| `layout/topbar.css` | `height`, `gap`, `padding`, `border-bottom-color`, `background`, `z-index` |

**Classification:** Intentional cascade refinement. `topbar.css` refines/corrects the app.css values.  
**Conflicting properties:** `height`, `gap`, `padding`, `background`, `z-index` (topbar.css wins).  
**Action:** After resolving DX-01 (token cleanup), consider whether `app.css`'s `.crm-topbar` definition is still needed or if `topbar.css` can own it entirely.

---

**DX-08 — `.crm-search` and `.crm-search .uk-input`**

| File | `.crm-search` properties | `.crm-search .uk-input` properties |
|------|--------------------------|-------------------------------------|
| `layout/app.css` | `position: relative; width: min(560px,100%); flex: 1 1 auto; min-width: 0;` | `padding-left: 38px; border-radius: 10px; border-color; background; height: 40px; font-size: 13px;` |
| `layout/topbar.css` | `max-width: 520px;` | `height: 40px; border-radius: 10px; border-color: #d4dfef; font-size: 13px;` |

**Classification:** Intentional refinement. `topbar.css` narrows the max-width and corrects the border color.  
**Conflicting properties in `.crm-search .uk-input`:** `height`, `border-radius`, `font-size` (identical values — exact duplicate).  
**Action:** Remove duplicated identical values from `topbar.css`.

---

**DX-09 — `.crm-user`, `.crm-user > div:first-child > div`, `.crm-avatar`**

| Selector | `app.css` | `topbar.css` | Effective |
|----------|-----------|--------------|-----------|
| `.crm-user` | `gap: 10px` | `gap: 11px` | **11px** |
| `.crm-user > div:first-child > div` | `font-size: 13px; font-weight: 600; color: var(--crm-text)` | `font-size: 14px` | font-size: **14px**, weight/color from app.css |
| `.crm-avatar` | `width/height: 36px; font-size: 12px; box-shadow: 0 8px 14px rgba(...)` | `width/height: 40px; font-size: 13px; box-shadow: 0 8px 16px rgba(...)` | topbar.css values win |

**Classification:** Intentional refinement overrides.  
**Action:** If app.css is retained as a skeleton, this cascade is acceptable. Long-term, these selectors should be owned by `topbar.css` only.

---

**DX-10 — `[data-sidebar-toggle]`**

Defined in 4 places:

| File | Declaration | Notes |
|------|-------------|-------|
| `layout/app.css` L230–241 | `display: none !important; border-radius: 8px !important; border-color !important; min-width/width/height: 38px; padding: 0 !important; font-size: 20px; color; flex: 0 0 auto;` | Base hidden state |
| `layout/topbar.css` L217–220 | `min-width: 40px; width: 40px; height: 40px;` | Refinement (no display override, no !important) |
| `components/cards.css` L99 | `display: inline-flex !important; align-items: center; justify-content: center;` | Mobile override inside `@media (max-width: 920px)` — **wrong file** |
| `responsive.css` L88–92 | `display: inline-flex !important; align-items: center; justify-content: center;` | Mobile override — correct file |

**Classification:**
- `app.css` + `topbar.css`: intentional base/parity (acceptable cascade)
- `cards.css` @media block: **accidental wrong-file** responsive rule — duplicates `responsive.css`
- `responsive.css`: correct location for the mobile override

**The `!important` chain explains itself:** `app.css` uses `display: none !important` to guarantee the button stays hidden on desktop; `responsive.css` then uses `display: inline-flex !important` to guarantee it appears on mobile. This is a documented pattern in `responsive.css` comment: "overrides display:none !important in app.css". The `cards.css` mobile version is a stranded duplicate of the `responsive.css` rule.

---

**DX-11 — `.crm-page`**

| File | Key properties | Notes |
|------|---------------|-------|
| `layout/app.css` | `padding: 20px 24px 30px; max-width: 1480px;` | Base definition |
| `layout/topbar.css` | `width: min(100%, var(--crm-page-max-w)); margin: 0 auto; padding: var(--crm-page-pad-y) var(--crm-page-pad-x) max(...); gap: 16px;` | Refinement — wins for all shared properties |
| `layout/page.css` | `max-width: none; padding: 20px 22px 30px;` | Launcher-specific override — wins for max-width/padding |

**Classification:** Three-file cascade chain. The page.css definition is for the launcher page but uses a generic `.crm-page` selector, affecting ALL pages loaded after topbar.css.  
**Effective runtime values:** `max-width: none` (page.css), `padding: 20px 22px 30px` (page.css), but `margin: 0 auto` and `gap: 16px` from topbar.css still apply (page.css doesn't override those).  
**Action:** The launcher rules in `page.css` should be scoped under `.crm-launcher-page .crm-page` or a dedicated wrapper to avoid silently mutating `.crm-page` for non-launcher pages.

---

**DX-12 — `.crm-layout`**

| File | Properties |
|------|-----------|
| `layout/app.css` | `display: grid; grid-template-columns: var(--crm-sidebar-w) 1fr; min-height: 100vh;` |
| `layout/topbar.css` | `grid-template-columns: var(--crm-sidebar-w) minmax(0, 1fr);` |

**Classification:** Intentional refinement — `minmax(0, 1fr)` is a common fix for grid overflow.  
**Action:** Move `.crm-layout` ownership to `topbar.css` or create a dedicated `layout/shell.css`.

---

**DX-13 — `.crm-nav-link` (base, not `.crm-sidebar .crm-nav-link`)**

| File | Properties |
|------|-----------|
| `layout/app.css` | `display: flex; align-items: center; justify-content: space-between; color; text-decoration; border-radius; padding; min-height; font-size; font-weight; line-height; letter-spacing; transition` |
| `layout/topbar.css` | `min-height: 38px; padding: 8px 11px; border-radius: 8px; line-height: 1.4;` |

**Classification:** `topbar.css` refines nav-link dimensions. These nav-link properties have nothing to do with the topbar — they belong in `sidebar.css`.  
**Action:** Move the `.crm-nav-link` refinement from `topbar.css` to `sidebar.css` or `app.css`.

---

**DX-14 — `.crm-nav-link.active, .crm-nav-link.is-active`**

| File | Properties |
|------|-----------|
| `layout/app.css` | `background: var(--crm-sidebar-active); color: #fff; font-weight: 600; box-shadow: inset 0 0 0 1px rgba(175, 201, 255, 0.2);` |
| `layout/sidebar.css` | `background: rgba(120, 162, 255, 0.24); color: #fff; box-shadow: inset 0 0 0 1px rgba(176, 202, 255, 0.26);` |
| `layout/topbar.css` | Same values as sidebar.css: `background: rgba(120, 162, 255, 0.24); color: #fff; box-shadow: inset 0 0 0 1px rgba(176, 202, 255, 0.26);` |

**Classification:** Sidebar.css and topbar.css are identical — exact duplicate. app.css uses a CSS variable (`--crm-sidebar-active = rgba(120, 162, 255, 0.22)`) while the later files use a slightly different hardcoded value (`0.24`). Topbar.css's copy of this rule is misplaced (nav-link active state is a sidebar concern, not topbar).  
**Action:** Remove duplicate from `topbar.css`. Evaluate whether to consolidate `sidebar.css` and `app.css` values via the token.

---

**DX-15 — `.crm-filter-panel`**

Defined in at least 3 component files plus many page files.

| File | Key properties | Notes |
|------|---------------|-------|
| `components/cards.css` (two blocks) | `border-radius: 12px / 14px; padding: 10px / 12px; margin-bottom: 14px; background: var(--crm-surface-muted)` | First + second definition, same file |
| `components/filters.css` | `border: var(--crm-layer-card-border); border-radius: var(--crm-layer-card-radius); background: #f6f9ff; padding: var(--crm-layer-gap-sm); gap: var(--crm-layer-gap-sm); display: grid;` | **Undefined variables** override cards.css |
| `components/registry.css` | `.crm-registry-filters.crm-filter-panel` (higher specificity scope) | Page-composition override |
| `pages/*.css` | Page-scoped overrides with highest specificity | Intentional per-page variants |

**Classification:** `cards.css` own duplicate is a same-file issue (see §6). `filters.css` override is an unintentional breakage — the undefined custom properties silently strip the `border`, `border-radius`, `padding`, and `gap` values, leaving the base `.crm-filter-panel` with no border radius. Only the higher-specificity `.crm-page.crm-registry-page .crm-registry-filters.crm-filter-panel` selector rescues the visual from registry pages.

---

### Mobile/responsive duplicate rules in `cards.css`

`components/cards.css` lines 70–111 contain `@media (max-width: 920px)` and `@media print` blocks that define layout-layer overrides:

```css
/* In cards.css — WRONG LAYER */
@media (max-width: 920px) {
  .crm-layout { grid-template-columns: 1fr; }
  .crm-sidebar { position: fixed; left: -100%; width: 272px; z-index: 20; transition: left .2s; }
  .crm-app.sidebar-open .crm-sidebar { left: 0; }
  [data-sidebar-toggle] { display: inline-flex !important; ... }
  .crm-topbar { padding: 0 14px; }
  .crm-search { width: auto; }
  .crm-page { padding: 16px 14px 24px; }
}

@media print {
  .crm-sidebar, .crm-topbar { display: none !important; }
  .crm-layout { grid-template-columns: 1fr; }
  .crm-page { padding: 0; }
}
```

`responsive.css` defines the SAME sidebar off-canvas behavior at the same breakpoint (920px). The `cards.css` version uses `left: -100%` / `left: 0` animation while `responsive.css` uses `transform: translateX(-100%)` / `transform: translateX(0)`. These are **conflicting approaches** to the same behavior. Since `responsive.css` loads last (import position 43 vs position 9 for cards.css), `responsive.css` wins for all shared properties. The `cards.css` mobile sidebar code is dead/overridden for those transform/transition properties.

---

## 6. Same-File Duplicate Selectors

### `components/tables.css`

| Selector | Instances | Properties repeated | Assessment |
|----------|-----------|---------------------|------------|
| `.crm-table-wrapper` | 3 blocks | `border-radius: 12px`, `overflow`, `max-width`, `scrollbar-*` | Accidental fragmentation; last block wins per property |
| `.crm-table` | 2 blocks | `border`, `border-radius`, `overflow`, `background` | Accidental fragmentation |
| `.crm-table .uk-table` | 3 blocks | `margin`, `min-width`, `font-size` | Accidental fragmentation; `font-size` goes from `14px` → `13px` across blocks |
| `.crm-table .uk-table th` | 2 blocks | `padding`, `color`, `font-size`, `background` | Fragmented density pass |
| `.crm-table .uk-table td` | 2 blocks | `padding`, `color`, `vertical-align`, `line-height` | Fragmented density pass |
| `.crm-table .uk-table td:first-child` | 2 blocks | `color: #24324d; font-weight: 500` / `white-space: normal` | Different properties — not exact duplicate but same selector |

**Note:** The `CSS_DUPLICATE_AND_CLASS_COMBINATION_AUDIT.md` Task D2 (2026-05-08) states these were partially consolidated, but the same-file duplication remains visible in the current file.

### `components/tabs.css`

| Selector | Instances | Properties |
|----------|-----------|-----------|
| `.crm-tabs` | 2 blocks | Block 1: `display: flex; flex-wrap: wrap; gap: 6px;` Block 2: `margin: 12px 0 14px;` |

**Classification:** Intentional split (structural vs spacing), but should be merged into one block for clarity.

### `components/cards.css`

| Selector | Instances | Notes |
|----------|-----------|-------|
| `.crm-filter-panel` | 2 blocks | Block 1 (L38–42): `background`, `border`, `border-radius: 12px`, `padding: 10px`, `margin-bottom: 14px`. Block 2 (L252–255): `border-radius: 14px`, `padding: 12px`. Second block overrides first for matching properties. |
| `.crm-option-card` | 3 blocks | L187–203 (base), L258–260 (min-height override), L394–398 (strong child). Not exact duplicates but same base selector. |
| `.crm-binary-control` | 2 blocks | L205–208 (base `gap: 8px`) and L268–270 (`gap: 10px`). Last wins: `gap: 10px`. |
| `.crm-binary-control label` | 2 blocks | L211–217 (base, 5 properties) and L272–283 (expanded, 9 properties including same ones). Second block overrides first. |

---

## 7. High-Risk Cross-File Overrides

### The layout cascade chain (highest structural risk)

The following chain governs every app shell selector. For any property defined in multiple files, the winner is the **last file** in the import order:

```
Selector               → app.css   → sidebar.css → topbar.css → page.css   → Effective
─────────────────────────────────────────────────────────────────────────────────────────
.crm-sidebar              ✓            ✓ wins                                 sidebar.css
.crm-sidebar-brand        ✓            ✓ wins                                 sidebar.css (partially)
.crm-nav-link             ✓                          ✓ wins                   topbar.css
.crm-nav-link.active      ✓            ✓                ✓ wins               topbar.css (misplaced)
.crm-topbar               ✓                          ✓ wins                   topbar.css
.crm-search               ✓                          ✓ wins                   topbar.css
.crm-avatar               ✓                          ✓ wins                   topbar.css
[data-sidebar-toggle]     ✓                          ✓ wins                   topbar.css
.crm-layout               ✓                          ✓ wins                   topbar.css
.crm-page                 ✓                          ✓           ✓ wins       page.css
:root (all tokens)        tokens.css   ✓              ✓ wins                  topbar.css (for shared props)
```

### `topbar.css` button override (`!important` cross-concern)

`layout/topbar.css` line 289–291:
```css
.crm-button,
.uk-button.crm-button,
.uk-button {
  border-radius: 10px !important;
}
```

This layout file forces `border-radius: 10px !important` on all buttons — including the UIkit `.uk-button` class. It overrides `components/buttons.css` which sets `border-radius: 8px` without `!important`. The `!important` ensures this layout-file rule wins regardless of cascade position.

**Risk:** Any future attempt to set button border-radius in `buttons.css` will silently fail unless also using `!important`. A layout file should not dictate component sizing.  
**Classification:** Cross-concern override — should be in `components/buttons.css`.

---

## 8. Page-Specific Component Overrides

### Pattern: page CSS overrides `.crm-badge` colors

`subjects.css` redefines badge colors under `body[data-page="subjects"] .crm-subjects-table .crm-badge.*`:
- `success` badge: `background: #d7e7e7; color: #075d4a; border-color: #a4c9c5` (darker than default)
- `info`, `warning`, `danger`: similarly adjusted

**Affected pages:** `subjects.html`  
**Risk:** Low — the scope is tight and the intent is clear.  
**Recommended pattern:** These could become modifier classes (`.crm-badge--subjects-success`) or a `data-variant` attribute style. For now the scoped override is acceptable.

---

### Pattern: page CSS overrides `.crm-table .uk-table th/td`

Nearly every registry page CSS file overrides table header and cell styling:
- `registry.css`: `.crm-page.crm-registry-page .crm-registry-table .uk-table th/td { padding, color, font-size, background, border }`
- `subjects.css`: `body[data-page="subjects"] .crm-subjects-table .uk-table tbody td { padding: 8px 12px }`
- `dashboard.css`: `body[data-page="dashboard"] .crm-dashboard-table th, td { padding: 11px 14px !important; vertical-align: middle !important }`

**Classification:** Intentional page-palette overrides. Well-scoped via `body[data-page]` or `.crm-page[data-page]`.  
**Risk:** Medium — the `!important` in dashboard.css is unnecessary given the high specificity of the `body[data-page]` ancestor.  
**Recommended future pattern:** Consolidate base table density in `tables.css`; keep page-specific values in page CSS with high-specificity selectors (no `!important` needed).

---

### Pattern: `forms.css` contains a page-scoped rule

`components/forms.css` line 41–47:
```css
body[data-page="subject-edit"] .crm-edit-toast {
  left: auto;
  width: max-content;
  max-width: min(360px, calc(100vw - 48px));
  box-sizing: border-box;
  line-height: 1.4;
}
```

A `.crm-edit-toast` rule scoped to `body[data-page="subject-edit"]` is inside a **component** file. The toast is a page-specific element, not a reusable form primitive.  
**Recommended fix:** Move to `pages/subject-edit.css`.

---

### Pattern: `page.css` overrides `.crm-page` for launcher page

`layout/page.css` contains:
```css
.crm-page {
  max-width: none;
  padding: 20px 22px 30px;
}
```

This uses a **generic selector** that affects ALL pages, not just the launcher. The intent is to set launcher-specific `.crm-page` dimensions, but the selector leaks.  
**Affected pages:** All pages (the values override topbar.css's `min(..., 1440px)` max-width).  
**Recommended fix:** Scope the launcher overrides: `.crm-launcher-page .crm-page { ... }` or use a dedicated `.crm-page--launcher` modifier.

---

## 9. Responsive and Print Overrides

### `responsive.css` — overall assessment

`responsive.css` (439 lines, 18 sections) is well-documented and well-organized. Each section has a comment explaining the breakpoint, why the override exists, and which file it is overriding. The specificity strategy is documented in the file header.

**Intentional overrides confirmed:**

| Section | Breakpoint | Selector | Override target | Assessment |
|---------|-----------|----------|-----------------|------------|
| 2. App shell sidebar | ≤920px | `.crm-sidebar` | `layout/app.css` position | Expected — off-canvas |
| 2. App shell overlay | ≤920px | `.crm-sidebar-overlay` | `layout/app.css` display | Expected |
| 2. Hamburger button | ≤920px | `[data-sidebar-toggle]` | `app.css` `display: none !important` | Expected — documented override |
| 3. Topbar compress | ≤768px | `.crm-user > div:first-child` | `layout/app.css` user info | Expected |
| 4. Page padding | ≤480px | `.crm-page` | `layout/topbar.css` padding | Expected |
| 5. Page header | ≤768px | `.crm-page[data-page] .crm-page-header-row` | `components/registry.css` | Expected — column stack |
| 7. Filter search | ≤480px | `.crm-filter-search-shell` / `...input` | `components/filters.css` | Expected — uses `!important` to override width constraints |
| 9. Sticky actions | ≤768px | `.crm-sticky-actions` | `layout/page.css` | Expected — unstick on mobile |
| 16. Filter panel | ≤480px | `.crm-page.crm-registry-page .crm-registry-filters...` | `components/filters.css` | Expected — 2-per-row layout |
| 17. Middle-office master-detail | ≤768px | `body[data-page="middle-office-reports"] .crm-mo-split` | `pages/middle-office.css` | Expected — documented reason for page-scoped responsive |

**Concern — `responsive.css` contains page-scoped rules:**

Several sections target specific pages (`body[data-page="subjects"]`, `.crm-page[data-page="archive"]`, etc.). These are currently in `responsive.css` because the page CSS files set the desktop layout with high specificity that the generic responsive selectors cannot override. This is documented and intentional, but creates a maintenance coupling: if a page CSS selector changes, the responsive.css counterpart must also change.

### Print coverage

`print.css` is intentionally blank. Print overrides exist in two places:

| File | Rule | Classification |
|------|------|---------------|
| `components/cards.css` L105–111 | `@media print { .crm-sidebar, .crm-topbar { display: none !important } }` | **Wrong layer** — layout concern in component file |
| `layout/page.css` L184–186 | `@media print { .crm-sticky-actions { display: none !important } }` | Acceptable for page-level layout element |

The `cards.css` print block should be moved to `responsive.css` or `print.css` to consolidate print behavior.

---

## 10. UIkit Overrides

UIkit overrides are scattered across 6 source files. There is no dedicated UIkit bridge file.

### Inventory

| Selector | File | Purpose | Risk |
|----------|------|---------|------|
| `.uk-button { border-radius: 8px; min-height: 36px; ... }` | `components/buttons.css` | Reset UIkit button sizing to CRM spec | Low — intentional |
| `.uk-button:disabled, .uk-button[disabled]` | `components/buttons.css` | CRM disabled state | Low |
| `.uk-button-default { background: #fff; border; color }` | `components/buttons.css` | UIkit default button = CRM secondary | Low |
| `.uk-button.crm-button, .uk-button { border-radius: 10px !important }` | `layout/topbar.css` | Cross-concern radius override | **High** — wrong file, `!important` |
| `.uk-input, .uk-select, .uk-textarea { border-color; border-radius; background; ... }` | `components/forms.css` | CRM form control skin | Low — intentional |
| `.uk-form-label { color; font-size; text-transform; ... }` | `components/forms.css` | CRM label style | Low |
| `a, .uk-link { text-decoration: none }` | `components/cards.css` | Global link reset | Medium — very broad selector |
| `.uk-button:focus, .uk-button:focus-visible, .uk-input:focus-visible, ...` | `components/cards.css` | Focus ring for UIkit elements | Medium — broad multi-class selector in cards.css |
| `.crm-card, .uk-card.crm-card { ... }` | `components/cards.css` | UIkit card + CRM card combo | Low |
| `.uk-card.crm-card.uk-card-body { padding }` | `components/cards.css` | UIkit card body spacing | Low |
| `.crm-table .uk-table { margin; min-width; font-size }` | `components/tables.css` | Strips UIkit table margins | Low — intentional |
| `.crm-table .uk-table th/td { ... }` | `components/tables.css` | CRM table density | Low — intentional |
| `.crm-tabs > .uk-active > a { background; color; border }` | `components/tabs.css` | UIkit active tab override | Low |
| `.uk-radio { border-color; width; height }` | `components/forms.css` | Radio button reset | Low |
| `.uk-radio:checked { ... }` | `components/forms.css` | Radio button active | Low |

**Recommendation:** Consolidate all UIkit selector overrides into a dedicated `components/uikit-overrides.css` file (do not implement in this task). The file `layout/topbar.css`'s button radius override should be moved to `components/buttons.css` first (highest risk item).

**Selectors combining CRM and UIkit classes:**
- `.uk-card.crm-card` — composition OK
- `.uk-button.crm-button-primary` — composition OK
- `.uk-button.crm-button.crm-button-secondary` — composition OK
- `.crm-search .uk-input` — descendant OK

These combinations are intentional composition patterns, not overrides to worry about.

---

## 11. `!important` Usage

Complete inventory of `!important` in source CSS (excluding bundle):

### Layout files

| File | Selector | Property | Reason | Fix |
|------|----------|----------|--------|-----|
| `layout/app.css` L145 | `.crm-nav-submenu[hidden]` | `display: none` | Match HTML `hidden` attribute behavior reliably | Keep — `[hidden]` parity is legitimate |
| `layout/app.css` L231 | `[data-sidebar-toggle]` | `display: none` | Guarantee button is hidden on desktop against UIkit overrides | Could be replaced with higher specificity |
| `layout/app.css` L232 | `[data-sidebar-toggle]` | `border-radius: 8px` | Prevent UIkit button override | Move to `buttons.css`, no `!important` needed |
| `layout/app.css` L233 | `[data-sidebar-toggle]` | `border-color` | Prevent UIkit override | Move to `buttons.css` |
| `layout/app.css` L237 | `[data-sidebar-toggle]` | `padding: 0` | Prevent UIkit padding | Move to `buttons.css` |
| `layout/topbar.css` L93 | `[data-sidebar-toggle]` | `display: none` | Duplicate of app.css L231 | Remove — redundant |
| `layout/topbar.css` L291 | `.crm-button, .uk-button.crm-button, .uk-button` | `border-radius: 10px` | Enforce 10px radius over buttons.css 8px | Move to `buttons.css`, remove `!important` |
| `layout/page.css` L185 | `@media print { .crm-sticky-actions }` | `display: none` | Print hide | Legitimate print use |

### Component files

| File | Selector | Property | Reason | Fix |
|------|----------|----------|--------|-----|
| `components/forms.css` L3 | `.crm-input, .crm-select` | `min-height: 36px` | Override UIkit baseline | Lower `!important` risk if specificity is raised |
| `components/forms.css` L38 | `.crm-input.uk-form-danger` (multiple) | `border-color: #e53935` | UIkit form-danger is overriding CRM danger color | Raise specificity instead |
| `components/forms.css` L64 | `.uk-select` | `padding-right: 34px` | Custom arrow positioning conflicts with UIkit | Acceptable — UIkit overrides are strong here |
| `components/forms.css` L83–84 | `.crm-date-field .crm-date-input` | `padding-right: 40px; background-image: none` | Override UIkit select arrow on date input | Acceptable |
| `components/buttons.css` L75 | `.crm-link-action` | `text-decoration: none` | Override UIkit link underline | Could use `text-decoration: none` without `!important` if specificity is right |
| `components/cards.css` L99 | `@media ≤920px { [data-sidebar-toggle] }` | `display: inline-flex` | Mobile hamburger show — duplicates responsive.css | Remove from `cards.css` (keep in `responsive.css`) |
| `components/cards.css` L107 | `@media print { .crm-topbar }` | `display: none` | Print hide | Move to `print.css` or `responsive.css` |

### Page files

| File | Selector | Property | Reason | Fix |
|------|----------|----------|--------|-----|
| `pages/dashboard.css` L240 | `.crm-dashboard-table, .uk-table` | `min-width: 0` | Prevent UIkit `min-width` on dashboard table | Use higher specificity instead |
| `pages/dashboard.css` L351–352 | `body[data-page="dashboard"] .crm-dashboard-table th/td` | `padding: 11px 14px; vertical-align: middle` | Override `tables.css` table padding | Unnecessary — `body[data-page]` already has high specificity |
| `pages/document-wizard.css` L198 | `.crm-input-error` or similar | `border-color: #c0392b` | Validation state override | Raise specificity |
| `pages/search-results.css` L131, L238 | Filter-state selectors | `display: none` | Conditional show/hide (JS state) | Acceptable if JS-driven |
| `pages/subject-card.css` L1597 | Some element | `border-radius: 9px` | Specificity war | Raise specificity or use modifier class |

### Responsive overrides

| File | Selector | Property | Reason | Classification |
|------|----------|----------|--------|---------------|
| `responsive.css` L89 | `[data-sidebar-toggle]` | `display: inline-flex` | Override `app.css`'s `display: none !important` | Necessary cascade break — documented |
| `responsive.css` L182–183 | `.crm-filter-search-shell` | `width/max-width: 100%` | Override `filters.css` width constraint | Acceptable — well-documented |
| `responsive.css` L187–188 | `.crm-filter-search-input` | `width/max-width: 100%` | Override `filters.css` constraint | Acceptable |

**Total `!important` count in source CSS:** ~25 occurrences across 8 files.

**Summary:** Most `!important` declarations exist to fight UIkit baseline overrides. The highest-risk item is `topbar.css` L291 (button radius in a layout file). The most redundant item is `topbar.css` L93 (`[data-sidebar-toggle]` hide, duplicating `app.css` L231). The `cards.css` mobile block `!important` rules should be removed (they duplicate `responsive.css`).

---

## 12. Dead or Suspicious Selectors

### Confirmed: not found in any HTML page

| Selector | File | Classification | Action |
|----------|------|---------------|--------|
| `.crm-launcher-page` | `layout/page.css` | Dead / launcher-page-only | Keep for future launcher; scope under launcher wrapper |
| `.crm-launcher-hero` | `layout/page.css` | Dead | As above |
| `.crm-launcher-grid` | `layout/page.css` | Dead | As above |
| `.crm-launcher-card` | `layout/page.css` | Dead | As above |
| `.crm-launcher-links` | `layout/page.css` | Dead | As above |
| `.crm-launcher-link` | `layout/page.css` | Dead | As above |
| `.crm-launcher-meta` | `layout/page.css` | Dead | As above |
| `.crm-launcher-code` | `layout/page.css` | Dead | As above |
| `.crm-launcher-badges` | `layout/page.css` | Dead | As above |
| `.crm-split-view` | `layout/page.css` | Uncertain — not found in pages | Confirm usage or remove later |

### Deprecated tokens (intentionally kept)

| Token | File | Notes |
|-------|------|-------|
| `--crm-c24-*` (12 aliases) | `base/tokens.css` | Marked "Deprecated compatibility aliases kept for migration from PR #255 naming." Not used in any CSS file inspected. Remove after UMI migration confirms `--crm-umi-*` coverage. |

### Integration-only / JS-state classes (do not remove)

Classes that appear in CSS but may not be visible in static HTML — added by JS at runtime:
- `.sidebar-open`, `.is-active`, `.is-selected`, `.is-disabled`, `.is-invalid`, `.is-filter-hidden`, `.is-page-hidden`, `.is-sorted-asc`, `.is-sorted-desc`, `.crm-search-preview-*` (generated), `.crm-modal-open`

---

## 13. HTML Usage Hotspots

### Pages with the most cross-file override exposure

| Page | High-risk classes used | Risk | Affected components | Validation priority |
|------|----------------------|------|---------------------|---------------------|
| `subject-card.html` | `.crm-page[data-page="subject-card"]`, `.crm-card`, `.crm-table`, `.crm-subject-tabs`, `.uk-switcher` | **Very High** | cards, tables, tabs, form, address, pagination | P0 after refactor |
| `subjects.html` | `.crm-registry-shell`, `.crm-filter-panel`, `.crm-registry-filters`, `.crm-badge.*`, `.crm-table` | High | registry, filters, tables, badges | P0 |
| `compliance.html` | `.crm-compliance-queue`, `.crm-decision-panel`, `.crm-table`, `.crm-badge` | High | cards, tables, badges, layout | P1 |
| `middle-office-reports.html` | `.crm-mo-split`, `.crm-mo-details-card`, `.crm-mo-report-item` | High | registry, master-detail, pagination | P1 |
| `trading.html` + `trading-card.html` | `.crm-terminal-fields`, `.crm-trading-shell`, `.crm-modal-*` | High | layout, modals, tables | P1 |
| `subject-register.html` | `.crm-option-card`, `.crm-binary-control`, `.crm-fias-*`, `.crm-address-*` | High | cards, forms, address | P1 |
| `dashboard.html` | `.crm-dashboard-kpi-card`, `.crm-dashboard-table` | Medium | cards, tables | P2 |
| `search-results.html` | `.crm-search-result-*`, filter controls | Medium | registry, filters | P2 |

---

## 14. Recommended Target CSS Structure

The following structure is compatible with plain CSS, static HTML5, and UMI.CMS. It requires no Sass, PostCSS, Tailwind, CSS Modules, or build system.

### Proposed canonical layout

```
static-uikit/assets/css/
├── crm-static.css              ← @import manifest only (no CSS rules)
├── base/
│   ├── fonts.css               ← @font-face only
│   ├── tokens.css              ← ALL :root custom properties (single source)
│   └── reset.css               ← minimal reset
├── layout/
│   ├── shell.css               ← .crm-app, .crm-layout, .crm-main, scrollbar (NEW — extracted from app.css)
│   ├── sidebar.css             ← canonical .crm-sidebar owner (absorbs app.css sidebar rules, removes :root block)
│   ├── topbar.css              ← canonical .crm-topbar + search preview owner (removes nav-link and :root blocks)
│   └── page.css                ← canonical .crm-page owner (launcher rules scoped under .crm-launcher-page wrapper)
├── components/
│   ├── cards.css               ← .crm-card, .crm-section, .crm-option-card, .crm-binary-control, .crm-check-row
│   │                             (remove @media blocks — move to responsive.css and print.css)
│   ├── buttons.css             ← all .uk-button + .crm-button* (absorb topbar.css button radius here, no !important)
│   ├── forms.css               ← all form primitives (remove subject-edit toast rule)
│   ├── subject-form.css        ← shared subject form headings/actions
│   ├── address.css             ← FIAS address module
│   ├── badges.css              ← .crm-badge + variants
│   ├── tables.css              ← consolidate 3 .crm-table-wrapper / 3 .crm-table/.uk-table blocks into one each
│   ├── tabs.css                ← merge two .crm-tabs blocks
│   ├── filters.css             ← define --crm-layer-card-border / --crm-layer-card-radius / --crm-layer-gap-sm OR use fallbacks
│   ├── registry.css            ← shared registry patterns
│   ├── modals.css              ← define fallbacks for --crm-layer-card-* OR use hardcoded values
│   └── uikit-overrides.css     ← NEW: all .uk-* selector overrides consolidated here
├── pages/
│   └── [21 page CSS files]     ← no change to page CSS ownership
├── responsive.css              ← all @media breakpoints (absorb mobile block from cards.css, print block from cards.css)
└── print.css                   ← absorb @media print blocks from cards.css and page.css
```

### Required changes to achieve the above (summary only — implementation is a future task)

1. **`base/tokens.css`:** Add missing tokens (`--crm-sidebar-w: 270px`, `--crm-topbar-h: 64px`, `--crm-page-max-w: 1440px`, `--crm-page-pad-x: 24px`, `--crm-page-pad-y: 22px`, `--crm-card-radius: 14px`, `--crm-panel-radius: 14px`). Define `--crm-layer-card-border`, `--crm-layer-card-radius`, `--crm-layer-gap-sm`.

2. **`layout/sidebar.css`:** Remove `:root` block. Remove exact-duplicate selectors that are already identical in `app.css` (DX-04, DX-05, DX-06 above).

3. **`layout/topbar.css`:** Remove `:root` block. Remove nav-link rules (move to `sidebar.css`). Move button radius rule to `components/buttons.css` (remove `!important`).

4. **`layout/app.css`:** After the above, `app.css` becomes the true "first-pass skeleton". Over time it can be renamed `layout/shell.css` and pared down to only the rules no other layout file defines.

5. **`components/cards.css`:** Remove `@media (max-width: 920px)` block (already covered better in `responsive.css`). Remove `@media print` block (move to `print.css`). Merge same-file `.crm-filter-panel`, `.crm-binary-control`, `.crm-binary-control label`, `.crm-option-card` duplicate blocks.

6. **`components/tables.css`:** Merge 3 `.crm-table-wrapper` blocks, 2–3 `.crm-table` blocks, and 3 `.crm-table .uk-table` blocks into single canonical declarations.

7. **`components/tabs.css`:** Merge 2 `.crm-tabs` blocks.

8. **`components/filters.css` and `components/modals.css`:** Replace undefined custom property references with either (a) hardcoded fallback values or (b) reference to newly-defined tokens from `tokens.css`.

9. **`components/buttons.css`:** Add button radius canonical value here. Remove `!important` from `topbar.css` and set appropriate specificity.

10. **`layout/page.css`:** Scope launcher rules under `.crm-launcher-page` wrapper. Move `@media print` block to `print.css`.

---

## 15. Future Refactor Plan

### Phase 0: Snapshot and validation baseline

- Screenshot / browser-inspect all 29 HTML pages at desktop (1440px) and mobile (375px)
- Identify pages most dependent on the layout cascade chain: `dashboard.html`, `subjects.html`, `subject-card.html`, `subject-register.html`, `compliance.html`, `trading-card.html`, `middle-office-reports.html`, `depository.html`
- Document current effective values for: `--crm-sidebar-w`, `--crm-topbar-h`, `border-radius` on `.uk-button`, `.crm-filter-panel` border and padding, `.crm-modal-dialog` border/radius
- Confirm that `crm-static.bundle.css` is regenerated and matches source after each phase
- **No build script exists** — before Phase 1, write a minimal concatenation script (e.g., `node tools/build-bundle.mjs`) that: reads import order from `crm-static.css`, inline-concatenates all files in order, adjusts font paths, writes `crm-static.bundle.css` with the standard header. This is a prerequisite for all subsequent phases.

### Phase 1: Fix undefined custom properties (immediate — zero visual risk)

**Files:** `components/filters.css`, `components/modals.css`, `base/tokens.css`  
**Changes:**
- Add missing token definitions to `tokens.css`: `--crm-layer-card-border: 1px solid #d4deee`, `--crm-layer-card-radius: 12px`, `--crm-layer-gap-sm: 12px` (or match whatever the `tables.css` fallback values imply)
- OR: replace `var(--crm-layer-card-border)` in `filters.css` and `modals.css` with hardcoded fallback values

**Risk:** Very low — visually restores properties that are currently resolving to their CSS initial values.

### Phase 2: Token consolidation (`tokens.css` as single `:root` source)

**Files:** `base/tokens.css`, `layout/sidebar.css`, `layout/topbar.css`  
**Changes:**
- Add `--crm-sidebar-w: 270px`, `--crm-topbar-h: 64px`, `--crm-page-max-w: 1440px`, etc. to `tokens.css` with their currently-effective values
- Remove the `:root` blocks from `sidebar.css` and `topbar.css`
- Verify no computed value change by comparing token usage in browser DevTools

**Risk:** Low — changing only where tokens are declared, not their values.

### Phase 3: Exact duplicate selector removal

**Files:** `layout/app.css`, `layout/sidebar.css`, `layout/topbar.css`, `components/cards.css`, `components/tables.css`, `components/tabs.css`  
**Changes (one at a time, visual-check between each):**
1. Remove DX-04, DX-05, DX-06 exact duplicates from `app.css` (keep in `sidebar.css`)
2. Remove duplicate `background` from `sidebar.css` `.crm-sidebar` block (DX-02)
3. Remove `display: none !important` duplicate from `topbar.css` L93 (DX-10)
4. Remove `height` + `padding` duplicate from `sidebar.css` `.crm-sidebar-brand` block (DX-03)
5. Remove identical `height/border-radius/font-size` from `topbar.css` `.crm-search .uk-input` (DX-08)
6. Remove `.crm-nav-link.active, .crm-nav-link.is-active` from `topbar.css` (DX-14, misplaced nav rule)
7. Merge 3 `.crm-table-wrapper` blocks in `tables.css` into one canonical block
8. Merge 3 `.crm-table .uk-table` blocks in `tables.css` into one
9. Merge 2 `.crm-tabs` blocks in `tabs.css` into one
10. Merge 2 `.crm-filter-panel` blocks in `cards.css` into one (resolve which border-radius wins: 12px vs 14px)
11. Merge 2 `.crm-binary-control` blocks in `cards.css` into one

### Phase 4: Cross-concern rule migration

**Files:** `layout/topbar.css`, `components/buttons.css`, `components/cards.css`, `layout/page.css`, `print.css`, `responsive.css`  
**Changes:**
1. Move `.crm-nav-link` base and `span:first-child` rules from `topbar.css` to `sidebar.css`
2. Move button `border-radius: 10px` from `topbar.css` to `buttons.css` (no `!important` — use selector specificity)
3. Move `@media (max-width: 920px)` block from `cards.css` to `responsive.css` (or delete if `responsive.css` already covers it)
4. Move `@media print` block from `cards.css` to `print.css`
5. Move `@media print` block from `page.css` to `print.css`
6. Scope launcher rules in `page.css` under `.crm-launcher-page` wrapper
7. Move `.crm-edit-toast` rule from `forms.css` to `subject-edit.css`

### Phase 5: `!important` reduction

After Phase 3 and 4, many `!important` declarations can be removed:
- `[data-sidebar-toggle]` button styling `!important` in `app.css` → remove after raising specificity in `buttons.css`
- `border-radius: 10px !important` in `topbar.css` → already moved in Phase 4
- Dashboard table `padding !important` → remove (high-specificity `body[data-page]` is sufficient)
- Cards.css mobile `!important` → already moved in Phase 4

### Phase 6: Bundle regeneration and sync

- Run the build script created in Phase 0
- Compare `crm-static.bundle.css` with previous version using `diff` or checksum
- Validate that all 29 HTML pages render correctly in browser
- Verify UMI packs (if added later) reference the expected stylesheet

### Phase 7: Final validation

- Visual regression check of P0/P1 priority pages
- Confirm `.crm-modal-dialog` renders with correct border/radius (fixed in Phase 1)
- Confirm `.crm-filter-panel` renders with correct border/radius on all pages
- Confirm mobile sidebar (920px) works correctly using transform-based approach from `responsive.css`
- Confirm button border-radius is consistently 10px across all pages
- Document any remaining intentional overrides with inline comments

---

## 16. Acceptance Criteria for Future Refactor

The CSS architecture refactor is complete when all of the following are true:

- [ ] `base/tokens.css` is the single source for all CSS custom property declarations; `--crm-sidebar-w`, `--crm-topbar-h`, `--crm-layer-card-border`, `--crm-layer-card-radius`, `--crm-layer-gap-sm`, `--crm-page-max-w`, `--crm-page-pad-x`, `--crm-page-pad-y`, `--crm-card-radius`, `--crm-panel-radius` are all defined here
- [ ] `layout/sidebar.css`, `layout/topbar.css` contain no `:root` blocks
- [ ] `crm-static.css` contains only `@import` directives (no CSS rules)
- [ ] Each reusable layout selector (`.crm-sidebar`, `.crm-topbar`, `.crm-page`, `.crm-layout`, `.crm-nav-link`) has one canonical owner file; the other layout files do not redefine the same property on the same selector
- [ ] The 3 `.crm-table-wrapper` blocks in `tables.css` are consolidated into one
- [ ] The 3 `.crm-table .uk-table` blocks in `tables.css` are consolidated into one
- [ ] The 2 `.crm-tabs` blocks in `tabs.css` are consolidated into one
- [ ] The 2 `.crm-filter-panel` blocks in `cards.css` are consolidated into one
- [ ] `filters.css` and `modals.css` do not reference undefined custom properties without fallbacks
- [ ] `components/cards.css` contains no `@media` blocks — all responsive rules in `responsive.css` or `print.css`
- [ ] `layout/topbar.css` contains no button styling rules and no nav-link rules
- [ ] No new `!important` declarations are added; existing `!important` count is equal or lower
- [ ] `crm-static.bundle.css` is generated by a documented, reproducible build script
- [ ] All 29 HTML pages continue to load `uikit.min.css` + `crm-static.bundle.css` correctly
- [ ] Auth pages additionally load `auth.css` (unchanged)
- [ ] Visual appearance of all 29 pages is unchanged from the Phase 0 baseline except for intentionally approved fixes
- [ ] The `.crm-modal-dialog` has a visible border and border-radius (confirms Phase 1 fix)
- [ ] The static HTML5 validation passes for all pages in scope

---

## 17. Validation Results

### `node static-uikit/tools/validate-static-uikit.mjs`

**Result:** Cannot run — `static-uikit/tools/` directory does not exist. The validator script is referenced in the task brief but is not present in the repository.

**Impact:** No automated validation is possible. Manual browser inspection is the current validation method.

### `npm run build`

**Result:** Not attempted. The `package.json` build script runs Vite/TypeScript for the React `src/` application — it does not build or regenerate `crm-static.bundle.css`. There is no npm script for bundle regeneration.

### `static-uikit/umi-p0/`, `static-uikit/umi-p1/`, `static-uikit/partials/`

**Result:** These directories do not exist. The audit scope items for UMI packs and partials were not found on disk.

### Manual findings validated

- All 29 HTML pages confirmed to load `crm-static.bundle.css` (grep over pages/*.html)
- Bundle confirmed to contain no real `@import` directives (grep over bundle file)
- Bundle section markers confirmed (`/* ===== base/fonts.css ===== */` etc.)
- Undefined custom properties confirmed via grep: `--crm-layer-card-border`, `--crm-layer-card-radius`, `--crm-layer-gap-sm` — used without definition in `filters.css` and `modals.css`
- `!important` inventory confirmed via grep across all source CSS files
- Launcher classes confirmed absent from all `pages/*.html` files

---

## 18. Open Questions / Manual Review Needed

| # | Question | Files | Priority |
|---|----------|-------|----------|
| Q1 | What is the actual visual appearance of `.crm-modal-dialog` elements today? Do they render with a visible border and radius (i.e., does some other rule supply those values at higher specificity), or is this a confirmed rendering bug? | `components/modals.css`, HTML pages with modals | High |
| Q2 | What is the visual appearance of bare `.crm-filter-panel` elements that are NOT inside `.crm-page.crm-registry-page`? The `filters.css` block with undefined vars overrides the `cards.css` values. | `components/filters.css`, `components/cards.css` | High |
| Q3 | Which precise mechanism was used to generate `crm-static.bundle.css` in past cleanup tasks? Was it a custom Node.js script, a manual concatenation, or another tool? This must be documented before Phase 0. | Cleanup history / developer knowledge | High |
| Q4 | Is the `--crm-sidebar-w: 276px` value in `tokens.css` a design intent that was incorrectly corrected to `270px` in `sidebar.css` and `topbar.css`, or should `tokens.css` be updated to `270px`? | `base/tokens.css`, layout files | Medium |
| Q5 | Are `.crm-launcher-*` classes used by the `INDEX.html` file at the root of `static-uikit/`? If yes, scope them accordingly; if no, remove them. | `layout/page.css`, `static-uikit/INDEX.html` | Medium |
| Q6 | Is `.crm-split-view` (defined in `layout/page.css`) used anywhere outside the inspected pages? Possibly in documentation or prototypes? | `layout/page.css` | Low |
| Q7 | Are the deprecated `--crm-c24-*` token aliases referenced in any UMI/PHP templates or external scripts outside the `static-uikit/` directory? | `base/tokens.css`, UMI integration | Low |
| Q8 | What is the expected behavior of the mobile sidebar at 920px? `cards.css` uses `left: -100%` / `left: 0` with `transition: left .2s` while `responsive.css` uses `transform: translateX(-100%)` / `transform: translateX(0)` with a cubic-bezier transition. Since `responsive.css` loads last, the transform approach wins — is this the intended behavior? | `components/cards.css`, `responsive.css` | Medium |
| Q9 | Should `subject-edit-individual.html` and its CSS (`pages/subject-edit.css`) cover only the individual flow, or does `subject-edit.css` already handle both entity types? If the individual variant needs separate overrides, where should they live? | `pages/subject-edit.css`, `pages/subject-edit-individual.html` | Low |
| Q10 | The `dashboard.css` `!important` on table padding at L351–352 — was this added to override a specific UIkit or `tables.css` rule that was resisting a non-important override? If the specificity of `body[data-page="dashboard"]` is sufficient, remove `!important`. | `pages/dashboard.css`, `components/tables.css` | Low |

---

*This audit was produced by static inspection of all source CSS files and HTML pages in `static-uikit/`. No CSS, HTML, JS, bundle files, or UMI files were modified. All findings are based on the state of the repository as of 2026-05-14.*
