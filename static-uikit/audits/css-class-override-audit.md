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

`static-uikit/assets/css/crm-static.css` is a clean 45-line @import manifest. All 40 imported files listed below:

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

## Phase 0 / Phase 1 Implementation Notes

**Date:** 2026-05-14  
**Status:** Complete — bundle script created, initial bundle regenerated, three safe source cleanups applied, bundle regenerated again from cleaned sources.

### Bundle generation script

| Property | Value |
|----------|-------|
| Script path | `static-uikit/tools/build-css-bundle.mjs` |
| Command | `node static-uikit/tools/build-css-bundle.mjs` |
| npm script | `npm run static:uikit:bundle` |
| Runtime | Node.js ≥16, ESM (`"type": "module"` in root `package.json`) |

The script:
- Reads `static-uikit/assets/css/crm-static.css` (the canonical import manifest)
- Parses `@import url("...")` statements in order (also handles bare `@import "..."` syntax)
- Inlines each source file with a `/* ===== base/fonts.css ===== */` section marker
- Rewrites all relative `url()` references from each source file's directory to the bundle's directory (`assets/css/`) using Node.js `path.resolve` + `path.relative` — no hardcoded string substitution
- Writes the result to `static-uikit/assets/css/crm-static.bundle.css`
- Does NOT minify, reorder selectors, or transform CSS in any way
- Warns if `crm-static.css` contains non-`@import` rules (desired state: import-manifest only)
- Warns if any imported file is missing from disk

**Font URL rewriting verified:** `base/fonts.css` source uses `../../fonts/inter/...` (relative to `assets/css/base/`); the generated bundle correctly emits `../fonts/inter/...` (relative to `assets/css/`). Both resolve to `static-uikit/assets/fonts/inter/`.

### Bundle generation results

| Run | Trigger | Sections | Output size | Lines |
|-----|---------|----------|-------------|-------|
| Initial run (pre-cleanup) | Script first run | 40 | 246.7 KB | 10,099 |
| Final run (post-cleanup) | After source cleanups | 40 | 246.0 KB | 10,061 |

The previous bundle (manually maintained, pre-Phase 0) was 257,837 bytes / 10,139 lines. The new generated bundle is slightly smaller because extra blank lines and whitespace from the old manual process are not reproduced. CSS semantics are unchanged.

### CSS source cleanups performed

All three cleanups below are **exact-duplicate removals** — no property values were changed except the `border-radius` consolidation in `cards.css` which restores the effective runtime value (block 2 already won at 14px).

| # | File | Change | Lines removed |
|---|------|--------|---------------|
| DX-04 | `layout/app.css` | Removed exact duplicate `.crm-sidebar .crm-nav-link > span:first-child` block (canonical copy in `layout/sidebar.css`) | 7 |
| DX-05 | `layout/app.css` | Removed exact duplicate `.crm-sidebar .crm-nav-link svg.crm-nav-icon, .crm-sidebar .crm-nav-icon` block (canonical copy in `layout/sidebar.css`) | 12 |
| DX-06 | `layout/app.css` | Removed exact duplicate `.crm-sidebar .crm-nav-link [uk-icon]` block (canonical copy in `layout/sidebar.css`) | 8 |
| tabs-01 | `components/tabs.css` | Merged the two `.crm-tabs` blocks into one (block 1 had `display/flex-wrap/gap`, block 2 added `margin` — merged with no value change) | 4 |
| cards-01 | `components/cards.css` | Consolidated two `.crm-filter-panel` blocks into one: first block updated to `border-radius: 14px` (effective value block 2 had overridden to), second block deleted. `margin-bottom: 14px` preserved from first block. No visual change. | 5 |

**`layout/app.css`** reduced from 259 → 231 lines.  
**`components/tabs.css`**: `.crm-tabs` is now one canonical block.  
**`components/cards.css`**: `.crm-filter-panel` is now one canonical block.

### Audit items intentionally deferred

| Item | Reason for deferral |
|------|---------------------|
| DX-01: `:root` token split across `sidebar.css` and `topbar.css` | Requires moving tokens to `base/tokens.css` and deleting `:root` blocks — higher risk, Phase 2 |
| DX-02: `.crm-sidebar background` duplicate in `sidebar.css` | Depends on DX-01 resolution |
| DX-03: `.crm-sidebar-brand` partial duplicate | Depends on DX-01 resolution |
| DX-07–DX-15: remaining cross-file overrides | All are intentional cascade refinements or require architectural decisions — Phase 3–4 |
| `cards.css` @media (920px) responsive layout block | `.crm-sidebar-overlay` is unique to this block; sidebar animation approach (left vs transform) differs from `responsive.css` — requires Q8 to be answered before removal |
| `cards.css` @media print block | Currently the ONLY print rules for `.crm-sidebar`/`.crm-topbar`/`.crm-layout`/`.crm-page`; `print.css` is intentionally blank — cannot remove safely |
| Same-file duplicates in `tables.css` | Multiple blocks with differing font-sizes and property values; consolidation requires manual analysis to determine effective value for each property — Phase 3 |
| Undefined `--crm-layer-card-*` variables in `filters.css` / `modals.css` | Requires either defining the variables in `tokens.css` or adding fallback values — Phase 1 continuation |

### Validation commands run

```
node static-uikit/tools/build-css-bundle.mjs
  → ✓ Bundle written → static-uikit/assets/css/crm-static.bundle.css
    Sections inlined: 40
    Output size: 246.0 KB

node static-uikit/tools/validate-static-uikit.mjs
  → ERROR: static-uikit/tools/validate-static-uikit.mjs not found (directory did not exist before this task)
```

No automated HTML validation script exists. Bundle output was manually spot-checked:
- Section markers present for all 40 imported files
- Font URLs correctly rewritten to `../fonts/inter/...` and `../fonts/inter-tight/...`
- First and last sections confirmed (`base/fonts.css` → `print.css`)
- Bundle contains no `@import` directives (fully inlined)

---

*This audit was produced by static inspection of all source CSS files and HTML pages in `static-uikit/`. Phase 0/1 changes: bundle script created, three exact-duplicate source blocks removed. No visual changes were made. All findings are based on the state of the repository as of 2026-05-14.*

---

## Phase 1.5 / Phase 2 Preparation Notes

**Date:** 2026-05-14  
**Status:** Complete — token layer consolidated, undefined tokens defined, bundle regenerated and validated.

### Bundle script hardening (`static-uikit/tools/build-css-bundle.mjs`)

| Change | Detail |
|--------|--------|
| Removed unused import | `join` was imported from `'path'` but never used — removed |
| Missing imports are now build errors | Previously: `console.warn` + `continue` (silently produced an incomplete bundle). Now: `console.error` + `process.exit(1)` — build aborts with a clear error message |
| Section count check added | Script counts expected `@import` statements before processing; after writing the bundle, if `sectionCount !== expectedSections` the build fails with a mismatch error and does not write the bundle |
| Output line updated | `Sections inlined : 40 / 40` — shows both inlined and expected counts |

### Corrected import / section count

The audit previously stated "All 44 imported files" in §3. The actual count is **40** `@import` statements in `crm-static.css`, matching the 40 sections the build script reports. Corrected to 40.

### Tokens moved to `base/tokens.css` (Part 3)

All `:root` custom property declarations are now consolidated in `base/tokens.css` as the single canonical source. Values set to current effective runtime values (the values previously winning from the cascade tail).

| Token | Old value in `tokens.css` | Effective runtime value (before) | New value in `tokens.css` |
|-------|--------------------------|----------------------------------|---------------------------|
| `--crm-topbar-h` | `62px` (stale) | `64px` (topbar.css won) | **`64px`** |
| `--crm-sidebar-w` | `276px` (stale) | `270px` (topbar.css won) | **`270px`** |
| `--crm-page-max-w` | not defined | `1440px` (topbar.css only) | **`1440px`** |
| `--crm-page-pad-x` | not defined | `24px` (topbar.css only) | **`24px`** |
| `--crm-page-pad-y` | not defined | `22px` (topbar.css only) | **`22px`** |
| `--crm-card-radius` | not defined | `14px` (topbar.css only) | **`14px`** |
| `--crm-panel-radius` | not defined | `14px` (topbar.css only) | **`14px`** |

### `:root` blocks removed from layout files

| File | Change |
|------|--------|
| `layout/sidebar.css` | `:root { --crm-sidebar-w: 270px; --crm-topbar-h: 64px; }` block removed |
| `layout/topbar.css` | `:root { --crm-topbar-h: 64px; --crm-sidebar-w: 270px; --crm-page-max-w: 1440px; --crm-page-pad-x: 24px; --crm-page-pad-y: 22px; --crm-card-radius: 14px; --crm-panel-radius: 14px; }` block removed |

Both files verified: no `:root` block remains. The single `:root` block in the bundle is now exclusively in the `base/tokens.css` section.

### Missing layer tokens defined (Part 4) — intentional visual bug fix

The following tokens were previously **undefined** everywhere. Their usage in `filters.css` and `modals.css` was silently resolving to CSS initial values, causing:
- `.crm-filter-panel` (base selector, not inside `.crm-registry-page`): no border, no border-radius, no padding, no gap
- `.crm-modal .crm-modal-dialog`: no border, no border-radius (confirmed latent rendering bug from §1, item 4)

They are now defined in `base/tokens.css`:

```css
--crm-layer-card-border: 1px solid var(--crm-border);   /* resolves to: 1px solid #d7e0ef */
--crm-layer-card-radius: var(--crm-radius-lg);           /* resolves to: 14px */
--crm-layer-gap-sm: 12px;
```

**This is an intentional visual bug fix.** Elements using the base `.crm-filter-panel` selector (outside registry pages) and `.crm-modal .crm-modal-dialog` will now render with the correct border and border-radius that were previously missing.

### Duplicate declarations removed (Part 5)

| File | Selector | Property removed | Reason |
|------|----------|-----------------|--------|
| `layout/sidebar.css` | `.crm-sidebar` | `background: linear-gradient(...)` | Exact duplicate of `layout/app.css` — identical value |
| `layout/sidebar.css` | `.crm-sidebar-brand` | entire block (`height`, `padding`) | Both properties are exact duplicates of `layout/app.css` |

**Deferred (not removed — require further analysis or selector restructuring):**
- `layout/topbar.css` `.crm-toolbar, .crm-filter-panel, .crm-toolbar.crm-filter-panel` — `border-radius` and `padding` for `.crm-filter-panel` are now overridden by `filters.css` with the newly-defined tokens (same effective values), but the selector is grouped with `.crm-toolbar` which still needs it. Splitting the grouped selector is deferred to Phase 3.

### Source files changed

| File | Change summary |
|------|---------------|
| `static-uikit/tools/build-css-bundle.mjs` | Hardened: missing import → error+exit, section count check, removed unused `join` import |
| `static-uikit/assets/css/base/tokens.css` | Updated 2 stale values; added 7 layout/component tokens; defined 3 previously-undefined layer tokens |
| `static-uikit/assets/css/layout/sidebar.css` | Removed `:root` block; removed duplicate `background` from `.crm-sidebar`; removed duplicate `.crm-sidebar-brand` block |
| `static-uikit/assets/css/layout/topbar.css` | Removed `:root` block (all 7 properties) |
| `static-uikit/audits/css-class-override-audit.md` | Corrected import count "44" → "40" |

### Bundle regeneration result

| Property | Value |
|----------|-------|
| Command | `node static-uikit/tools/build-css-bundle.mjs` |
| Exit code | 0 |
| Sections inlined | 40 / 40 |
| Output size | 246.2 KB |

### Validation results

| Check | Result |
|-------|--------|
| `npm run static:uikit:bundle` | ✓ Exit 0 — 40/40 sections |
| `node static-uikit/tools/validate-static-uikit.mjs` | Script does not exist (still missing — deferred) |
| Real `@import` directives in bundle | 0 ✓ |
| Build-generated section markers (files) | 40 ✓ |
| Font URL paths (`../fonts/`) | 16 URLs, 0 bad paths ✓ |
| `:root` blocks in bundle | 1 (only in `base/tokens.css` section) ✓ |
| `sidebar.css` section has `:root` | No ✓ |
| `topbar.css` section has `:root` | No ✓ |
| New tokens present in bundle | All 10 confirmed via text search ✓ |

**Note on validation script:** `static-uikit/tools/validate-static-uikit.mjs` still does not exist. Creating it remains an open prerequisite for automated HTML/CSS validation.

### Deferred items

| Item | Reason for deferral |
|------|---------------------|
| `layout/topbar.css` grouped selector `.crm-toolbar, .crm-filter-panel` — split to remove dead `.crm-filter-panel` declarations | Requires selector restructuring; deferred to Phase 3 |
| DX-02: `.crm-sidebar` `background` in `topbar.css` | `topbar.css` `.crm-sidebar { box-shadow }` is also a duplicate of `app.css` — not in Part 5 scope, deferred |
| DX-07–DX-15: remaining cross-file overrides | Still intentional cascade refinements or require architectural decisions — Phase 3–4 |
| `cards.css` @media (920px) responsive layout block | Deferred per Phase 0/1 notes (sidebar animation approach conflict with responsive.css) |
| `cards.css` @media print block | Deferred per Phase 0/1 notes (only print rules for layout shell) |
| Same-file duplicates in `tables.css` | Phase 3 |
| `validate-static-uikit.mjs` creation | Prerequisite for automated validation — still missing |

---

## Validation Foundation Notes

**Date:** 2026-05-14  
**Status:** Complete — bundle check mode added, validator created, all scripts passing.

### Bundle `--check` mode

`static-uikit/tools/build-css-bundle.mjs` now accepts a `--check` flag:
- Generates bundle content in memory using the same logic as normal mode.
- Compares with the current `crm-static.bundle.css` byte-for-byte.
- Prints `✓ Bundle is up to date (40 / 40 sections, 246.2 KB)` and exits 0 if identical.
- Prints `ERROR: bundle is stale` and exits 1 if different.
- Does **not** write the bundle in check mode.
- All existing guards (missing imports → error+exit, section count mismatch → error+exit) still apply in check mode.

### Validation script

| Property | Value |
|----------|-------|
| Script path | `static-uikit/tools/validate-static-uikit.mjs` |
| Runtime | Node.js ≥16, ESM, zero npm dependencies |
| Exit code | 0 = no errors, 1 = one or more errors |

### npm scripts added

| Script | Command |
|--------|---------|
| `static:uikit:bundle:check` | `node static-uikit/tools/build-css-bundle.mjs --check` |
| `static:uikit:validate` | `node static-uikit/tools/validate-static-uikit.mjs` |

### Validator checks implemented

| Check | Description |
|-------|-------------|
| A. CSS manifest | File exists; contains only @import + blanks + comments; all imported files exist; no duplicate imports; import count (40); layer order (base → layout → components → pages → responsive → print) |
| B. Bundle | File exists; no real @import directives; section marker count matches manifest; bundle freshness (via --check); all 16 font URLs resolve to existing files; exactly one :root block in base/tokens.css section |
| C. HTML stylesheet refs | 29 pages: uikit.min.css required; crm-static.bundle.css required; crm-static.css forbidden; modular source CSS forbidden; no duplicate CSS loads; auth.css allowed only on auth pages |
| D. Partials | static-uikit/partials/ does not exist — reported, not an error |
| E. UMI packs | static-uikit/umi-p0/ and umi-p1/ do not exist — reported, not an error |
| F. Local assets | 296 local `<link href>`, `<script src>`, `<img src>` references across 29 pages — all resolve to existing files |
| G. Summary | Totals printed; exit code driven by error count |

### Validation results

```
npm run static:uikit:bundle
  → ✓ Bundle written → static-uikit/assets/css/crm-static.bundle.css
    Sections inlined : 40 / 40
    Output size      : 246.2 KB

npm run static:uikit:bundle:check
  → ✓ Bundle is up to date (40 / 40 sections, 246.2 KB)

npm run static:uikit:validate
  → A. CSS Manifest    — 6 checks, all ✓
  → B. Bundle          — 6 checks, all ✓
  → C. HTML Stylesheet — 29 pages, all ✓
  → D. Partials        — directory absent, skipped
  → E. UMI Packs       — umi-p0 and umi-p1 absent, skipped
  → F. Local Assets    — 296 refs across 29 pages, all ✓
  → Errors: 0 | Warnings: 0
  → ✓ Validation passed.
```

### Warnings/errors found

**None.** All 29 pages, 40 CSS imports, 296 local asset references, and the bundle passed without errors or warnings.

### Notes on absent directories

- `static-uikit/partials/` — does not exist. Validator skips section D gracefully and reports it as informational.
- `static-uikit/umi-p0/` and `umi-p1/` — do not exist. Validator skips section E gracefully. When these directories are created for UMI integration, the validator will automatically check them for modular-source-CSS references and missing file references.

### Deferred validation improvements

| Item | Priority |
|------|----------|
| Create `static-uikit/tools/validate-static-uikit.mjs` | ✓ Done |
| Add CSS property validation (e.g. confirm no undefined custom properties remain) | Future |
| Add HTML structural checks (e.g. confirm `<body data-page="...">` attribute is set) | Future |
| Add visual regression tooling | Future (separate concern) |

### Confirmation: no layout refactor performed

No CSS layout files were moved, renamed, or structurally changed in this task. `layout/app.css`, `layout/sidebar.css`, `layout/topbar.css`, and `layout/page.css` are unchanged. No selectors were moved between files. The only CSS-adjacent file changed is `build-css-bundle.mjs` (adding `--check` mode).

---

## Layout Ownership Cleanup Notes

**Date:** 2026-05-14
**Task type:** SAFE IMPLEMENTATION — Layout ownership cleanup.
**Status:** Complete — all files changed, bundle regenerated, all three checks passed.

### Files changed

| File | Nature of change |
|------|-----------------|
| `layout/app.css` | Reduced to shell-only (5 rules): `.crm-app`, global scrollbar, `.crm-layout` (minmax fix baked in), `.crm-main` |
| `layout/sidebar.css` | Became canonical owner of all sidebar + nav rules (sidebar shell, brand, nav container, sections, headings, groups, toggles, items, chevron, links, active/hover states, submenus, scrollbar, icon images) |
| `layout/topbar.css` | Reduced to topbar-only (sidebar/nav cross-concerns removed, page rule removed; merged effective values for owned selectors) |
| `layout/page.css` | `.crm-page` consolidated with effective values from topbar.css; `.crm-page h1/h2/h3/h4` moved in from app.css; `.crm-page-header` moved in from topbar.css; mobile `.crm-page` padding moved in from topbar.css @media block |
| `tools/validate-static-uikit.mjs` | Removed unused `basename` import (Part 6 minor cleanup) |

### `layout/app.css` reduction

Before: 230 lines (sidebar, nav, topbar, page, scrollbar, shell).
After: 22 lines (shell-only: `.crm-app`, scrollbar, `.crm-layout`, `.crm-main`).

The `grid-template-columns` value in `.crm-layout` was updated from `var(--crm-sidebar-w) 1fr` to `var(--crm-sidebar-w) minmax(0, 1fr)` — this adopts the effective runtime value that `topbar.css` was previously overriding via a separate `.crm-layout` block (now removed from topbar.css).

### Selectors moved from `app.css` to `sidebar.css`

| Selector | Effective value notes |
|----------|-----------------------|
| `.crm-sidebar` | Merged: all app.css props + `width: var(--crm-sidebar-w)` from sidebar.css; `box-shadow` topbar.css duplicate eliminated |
| `.crm-sidebar-brand` | Moved as-is |
| `.crm-sidebar-brand img` | Moved as-is |
| `.crm-sidebar nav` | Moved as-is |
| `.crm-nav-section` | Moved as-is |
| `.crm-nav-heading` | **Effective merged value**: `font-size: 10px` (topbar.css won), `letter-spacing: 0.11em` (topbar.css won), `padding: 8px 10px 5px` (topbar.css won), remaining props from app.css |
| `.crm-nav-item` | Moved as-is |
| `.crm-nav-chevron` | Moved as-is |
| `.crm-sidebar .crm-nav-group-toggle` | Merged: app.css had the complete rule (`width: 100%`, `text-align: left`, `font: inherit`) missing from sidebar.css |
| `.crm-nav-link` | Moved as-is (full base rule including `transition`) |
| `.crm-nav-link:hover` | Moved as-is |
| `.crm-nav-link.active` | **Effective merged value**: `background: rgba(120,162,255,0.24)` + `box-shadow` from topbar.css; `font-weight: 600` preserved from app.css; extended to include `.is-active` |
| `.crm-nav-submenu` | Moved as-is |
| `.crm-nav-submenu[hidden]` | Moved as-is |
| `.crm-sidebar .crm-nav-submenu .crm-nav-link` | Already in sidebar.css — duplicate removed from app.css |

### Selectors moved from `topbar.css` to `sidebar.css`

| Selector | Effective value notes |
|----------|-----------------------|
| `.crm-nav-heading` | Values moved into merged sidebar.css `.crm-nav-heading` (topbar.css values win for font-size, letter-spacing, padding — preserved in sidebar.css) |
| `.crm-nav-section + .crm-nav-section` | Moved as-is |
| `.crm-nav-link` (generic refinements) | Merged into sidebar.css base `.crm-nav-link` rule |
| `.crm-nav-link > span:first-child` | Moved verbatim — scoped `.crm-sidebar .crm-nav-link > span:first-child` (gap: 10px, higher specificity) still wins for sidebar elements, preserving effective value |
| `.crm-nav-link [uk-icon]` | `color: rgba(231,239,255,0.84)` added to scoped `.crm-sidebar .crm-nav-link [uk-icon]` rule in sidebar.css; topbar.css rule removed |
| `.crm-nav-link.active, .crm-nav-link.is-active` | Merged into sidebar.css with `font-weight: 600` added (was in app.css, never overridden) |
| `.crm-nav-group .crm-nav-submenu` | Moved as-is — same values as `.crm-sidebar .crm-nav-submenu` (already in sidebar.css) |
| `.crm-sidebar { box-shadow }` | Consolidated into merged `.crm-sidebar` in sidebar.css — duplicate eliminated |
| `.crm-layout` | Rule removed from topbar.css — effective value baked directly into app.css `.crm-layout` |

### Selectors moved from `app.css` to `topbar.css`

| Selector | Effective value notes |
|----------|-----------------------|
| `.crm-topbar` | **Effective merged**: `background: color-mix(...)` + `border-bottom: 1px solid #dbe4f1` + `gap: 10px` + `z-index: 120` from topbar.css; `display/align-items/justify-content/position/top/backdrop-filter` from app.css |
| `.crm-search` | **Effective merged**: base props from app.css + `max-width: 520px` from topbar.css |
| `.crm-search .uk-input` | **Effective merged**: `padding-left: 38px` + `background: var(--crm-input-bg)` from app.css; `border-color: #d4dfef` from topbar.css wins |
| `.crm-search-icon` | Moved from app.css as-is |
| `.crm-user` | **Effective merged**: base props from app.css + `gap: 11px` from topbar.css wins |
| `.crm-user > div:first-child > div` | **Effective merged**: `color`/`font-weight` from app.css + `font-size: 14px` from topbar.css wins |
| `.crm-user small` | Moved from app.css as-is |
| `.crm-avatar` | **Effective merged**: `width: 40px`/`height: 40px`/`font-size: 13px`/`box-shadow` from topbar.css win; `border-radius`/`background`/`color`/`display`/`font-weight` from app.css |
| `[data-sidebar-toggle]` | **Effective merged**: `display: none !important`/`border-radius`/`border-color`/`padding` `!important` from app.css; `min-width: 40px`/`width: 40px`/`height: 40px` from topbar.css win; `font-size`/`color`/`flex` from app.css |

### Selectors moved from `app.css` to `page.css`

| Selector | Effective value notes |
|----------|-----------------------|
| `.crm-page` | **Effective merged**: `max-width: none`/`padding: 20px 22px 30px` from page.css win; `width: min(100%,...)`/`margin: 0 auto`/`gap: 16px` moved in from topbar.css |
| `.crm-page h1` | Moved from app.css as-is |
| `.crm-page h2, .crm-page h3, .crm-page h4` | Moved from app.css as-is |

### Selectors moved from `topbar.css` to `page.css`

| Selector | Notes |
|----------|-------|
| `.crm-page-header` | Moved as-is |
| `@media (max-width: 920px) { .crm-page }` | Moved from topbar.css @media block into page.css @media block |

### Remaining intentional cross-file overrides (deferred)

| Item | File | Status |
|------|------|--------|
| Deferred component-layer overrides in `topbar.css` | `.crm-card`, `.crm-section`, `.crm-kpi-card`, `.crm-toolbar`, `.crm-table`, `.crm-button`, etc. | Deferred — not part of layout ownership scope |
| `topbar.css` button `border-radius: 10px !important` | `layout/topbar.css` | Deferred — component-layer concern, still in topbar.css |
| `components/cards.css` @media layout rules | Cards, responsive | Deferred from previous phase |
| `:root` blocks in sidebar.css and topbar.css | Already removed in Phase 1.5 | Complete |

### Import order

Import order in `crm-static.css` **was not changed**. Order remains:
`app.css → sidebar.css → topbar.css → page.css`

### Bundle regeneration

| Command | Result |
|---------|--------|
| `npm run static:uikit:bundle` | ✓ Exit 0 — 40/40 sections — 246.1 KB |
| `npm run static:uikit:bundle:check` | ✓ Bundle is up to date (40/40 sections, 246.1 KB) |
| `npm run static:uikit:validate` | ✓ Validation passed — 0 errors, 0 warnings |

### Validation details (post-cleanup)

```
A. CSS Manifest    — crm-static.css exists ✓, @import-only ✓, 40 files exist ✓, no duplicates ✓, layer order correct ✓
B. Bundle          — exists ✓, no real @import ✓, 40 markers ✓, up to date ✓, 16 font URLs resolved ✓, :root once in tokens.css ✓
C. HTML refs       — 29 pages, all pass ✓
D. Partials        — absent, skipped
E. UMI packs       — absent, skipped
F. Local assets    — 296 refs across 29 pages, all resolved ✓
Errors: 0 | Warnings: 0
```

### Confirmation: no HTML or class changes

No HTML files were modified. No class names were renamed or removed. No visual design was changed. The refactor is a pure structural ownership cleanup — the compiled bundle produces the same effective CSS output for every selector that was in use before the cleanup.

---

## Component Ownership Cleanup Notes

**Date:** 2026-05-14
**Task type:** SAFE IMPLEMENTATION — Component ownership cleanup after layout ownership cleanup.
**Status:** Complete — all files changed, bundle regenerated, all three checks passed.

### Overview

The deferred block `/* ── Deferred: component-layer overrides (cross-concern; cleanup deferred) ── */` was removed from `layout/topbar.css`. Every selector in that block was either already owned (and won) by the correct component file, or was moved into the correct component file to preserve effective computed values.

### Files changed

| File | Nature of change |
|------|-----------------|
| `layout/topbar.css` | Removed entire deferred component-layer block (88 lines) |
| `components/cards.css` | Added `.crm-section.uk-card-body` to padding selector group; added `.crm-kpi-card / .crm-form-card / .crm-create-panel / .crm-journal-table / .crm-compliance-queue { border-radius }` block; added `min-height: 32px` to `.crm-binary-control label` |
| `components/buttons.css` | Updated `border-radius` from `8px` to `10px` for both `.uk-button` and `.crm-button` base blocks |
| `components/tables.css` | Added `box-shadow` to first `.crm-table-wrapper` block; added `font-size: 13px` to `.crm-table .uk-table td` block; added `.crm-table-compact .uk-table th/td` compact padding block |
| `components/filters.css` | Added `.crm-toolbar.crm-filter-panel { background: #f3f7fe }` to shared filter panel primitives section |

### Selectors moved from `topbar.css` to `cards.css`

| Selector | Disposition |
|----------|-------------|
| `.crm-card { border-radius: var(--crm-card-radius) }` | Removed from topbar.css — `cards.css { border-radius: 12px }` already wins (later in cascade) |
| `.crm-section { border-radius: var(--crm-card-radius) }` | Removed from topbar.css — `cards.css { border-radius: 12px }` already wins |
| `.crm-card, .uk-card.crm-card { border-color / box-shadow }` | Removed from topbar.css — `cards.css { border: 1px solid #d4deee; box-shadow: var(--crm-shadow-sm) }` already wins |
| `.crm-card.uk-card-body / .uk-card.crm-card.uk-card-body { padding: 16px 18px }` | Removed from topbar.css — identical value already in `cards.css`; `.crm-section.uk-card-body` added to the existing selector group in `cards.css` |
| `.crm-kpi-card, .crm-form-card, .crm-create-panel, .crm-journal-table, .crm-compliance-queue { border-radius: var(--crm-card-radius) }` | Only in topbar.css — moved to `cards.css` as a new block; token `--crm-card-radius: 14px` is defined in `base/tokens.css` |
| `.crm-option-card { border-radius: 12px }` | Removed from topbar.css — `cards.css` already has identical value |
| `.crm-option-card.is-selected { border-color / background }` | Removed from topbar.css — `cards.css` later blocks already win with different (winning) values |
| `.crm-binary-control label { min-height: 32px }` | Only in topbar.css — merged into the complete `.crm-binary-control label` block in `cards.css` |

### Selectors moved from `topbar.css` to `buttons.css`

| Selector | Disposition |
|----------|-------------|
| `.crm-button, .uk-button.crm-button, .uk-button { border-radius: 10px !important }` | Removed from topbar.css. Existing `border-radius: 8px` declarations in `buttons.css` updated to `10px`. No `!important` required — `buttons.css` already wins over UIkit vendor CSS via cascade position. Visual radius is unchanged at 10px. |

### Selectors moved from `topbar.css` to `tables.css`

| Selector | Disposition |
|----------|-------------|
| `.crm-table-wrapper { border-radius: var(--crm-card-radius) }` | Removed — `tables.css { border-radius: 12px }` already wins |
| `.crm-table-wrapper { border-color: #d7e1ef }` | Removed — `tables.css { border: 1px solid var(--crm-border) }` already wins |
| `.crm-table-wrapper { box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05) }` | Only in topbar.css — added to the canonical first `.crm-table-wrapper` block in `tables.css`. `.crm-table-card .crm-table-wrapper { box-shadow: none }` already in `tables.css` resets it for card-wrapped tables. |
| `.crm-table .uk-table th { font-size/letter-spacing/color/padding/background }` | Removed from topbar.css — `tables.css` later block already wins with its own values |
| `.crm-table .uk-table td { padding: 11px 12px }` | Removed from topbar.css — `tables.css { padding: 12px 12px }` already wins |
| `.crm-table .uk-table td { font-size: 13px }` | topbar.css was the winning declaration (`.crm-table .uk-table td` specificity beats `.crm-table .uk-table` in tables.css). Added `font-size: 13px` to `.crm-table .uk-table td` block in `tables.css` to preserve effective value. |
| `.crm-table-compact .uk-table th, .crm-table-compact .uk-table td { padding-top/bottom: 10px }` | Only in topbar.css — moved to `tables.css` as a new labeled consolidation block |

### Selectors moved from `topbar.css` to `filters.css`

| Selector | Disposition |
|----------|-------------|
| `.crm-toolbar, .crm-filter-panel { border-radius / padding / border-color }` | Removed from topbar.css — `cards.css` wins for `.crm-toolbar`; `filters.css` wins for `.crm-filter-panel`. No new declarations needed. |
| `.crm-toolbar.crm-filter-panel { background: #f3f7fe }` | topbar.css was the winning declaration (two-class specificity beats single-class rules in cards.css / filters.css). Moved to `filters.css` shared filter panel primitives section with the same selector and value. |

### Decision-action variants (Part 5)

`.crm-decision-action.is-rework` and `.crm-decision-action.is-block` existed in the topbar.css deferred block with values `{ border-color: #efcf99; background: #fff5e3; color: #83521b }` and `{ border-color: #efc0c0; background: #feeeee; color: #9c3d3d }`.

`pages/compliance.css` already contains complete `.crm-decision-action.is-rework/.is-block` rules (with hover states) at a later cascade position, which WIN over the topbar.css values. The effective rendered values come from `compliance.css`. The topbar.css declarations were redundant — they were removed without adding duplicates. `pages/compliance.css` is the canonical owner.

### New component file created

None. All selectors were moved into existing files.

### Button radius — visual change confirmation

`.uk-button` and `.crm-button` `border-radius` in `components/buttons.css`:
- Before: `8px` (never actually computed — topbar.css `10px !important` overrode it)
- After: `10px` (no `!important` required — `buttons.css` wins over UIkit via cascade; `!important` removed from topbar.css)
- Effective visual radius: **unchanged at 10px**

### Remaining deferred items

| Item | Status |
|------|--------|
| `components/cards.css` `@media (max-width: 920px)` layout block | Still deferred — contains `.crm-sidebar-overlay` behavior; requires separate responsive-shell cleanup task |
| `components/cards.css` `@media print` block | Still deferred |
| Same-file duplicates in `tables.css` | Still deferred (Phase 3) |
| Undefined `--crm-layer-card-*` variables | Already fixed in Phase 1.5 |
| `components/cards.css` same-file `.crm-binary-control`, `.crm-option-card`, `.crm-filter-panel` duplicate blocks | Still deferred (Phase 3) |

### Bundle regeneration result

| Command | Result |
|---------|--------|
| `npm run static:uikit:bundle` | ✓ Exit 0 — 40/40 sections — 245.1 KB |
| `npm run static:uikit:bundle:check` | ✓ Bundle is up to date (40/40 sections, 245.1 KB) |
| `npm run static:uikit:validate` | ✓ Validation passed — 0 errors, 0 warnings |

### Validation details

```
A. CSS Manifest    — crm-static.css exists ✓, @import-only ✓, 40 files exist ✓, no duplicates ✓, layer order correct ✓
B. Bundle          — exists ✓, no real @import ✓, 40 markers ✓, up to date ✓, 16 font URLs resolved ✓, :root once in tokens.css ✓
C. HTML refs       — 29 pages, all pass ✓
D. Partials        — absent, skipped
E. UMI packs       — absent, skipped
F. Local assets    — 296 refs across 29 pages, all resolved ✓
Errors: 0 | Warnings: 0
```

### Confirmation: no HTML or class changes

No HTML files were modified. No class names were renamed or removed. No visual design was changed. The compiled bundle produces the same effective CSS output for every selector. `uikit.min.css` was not edited. `crm-static.bundle.css` was regenerated from source — not manually patched.

---

## Responsive Shell Cleanup Notes

**Date:** 2026-05-14
**Task type:** SAFE IMPLEMENTATION - Finish responsive shell cleanup.
**Status:** Complete - validator guard added, bundle regenerated, bundle check and validation passed.

### Files changed in this finishing pass

| File | Nature of change |
|------|-----------------|
| `tools/validate-static-uikit.mjs` | Added component boundary check for forbidden shell-level selectors in `components/cards.css` |
| `audits/css-class-override-audit.md` | Added these responsive shell cleanup notes and validation results |

Bundle handling: `assets/css/crm-static.bundle.css` was regenerated via the existing bundle script and remained content-equivalent to the checked-in bundle.

### Current CSS ownership confirmation

The earlier responsive shell cleanup commit already moved or removed:
- mobile shell rules from `components/cards.css`;
- print shell rules from `components/cards.css`;
- base `.crm-sidebar-overlay { display: none; }` from `components/cards.css`.

Final ownership:
- Mobile shell/sidebar/overlay behavior: `responsive.css`
- Print shell behavior: `print.css`
- Mobile topbar search width: `layout/topbar.css`

`components/cards.css` is clean from the shell-level selector boundary list:
`.crm-layout`, `.crm-sidebar`, `.crm-app.sidebar-open`, `.crm-sidebar-overlay`, `[data-sidebar-toggle]`, `.crm-topbar`, `.crm-search`, `.crm-page`.

### Validator guard added

`tools/validate-static-uikit.mjs` now includes a `G. Component Boundary Checks` section. It scans only `assets/css/components/cards.css`, strips block comments before scanning, and fails validation if any shell-level selector from the boundary list is present. The check does not forbid those selectors globally.

### Validation results

| Command | Result |
|---------|--------|
| `npm run static:uikit:bundle` | Exit 0 - 40/40 sections inlined - 244.6 KB |
| `npm run static:uikit:bundle:check` | Exit 0 - bundle up to date - 40/40 sections - 244.6 KB |
| `npm run static:uikit:validate` | Exit 0 - validation passed - 0 errors, 0 warnings |

New validator confirmation:

```
G. Component Boundary Checks
  components/cards.css contains no shell-level selectors
```

### Remaining deferred items

| Item | Status |
|------|--------|
| Same-file duplicate cleanup in `components/tables.css` | Deferred |
| Same-file duplicate cleanup in `components/cards.css` | Deferred |
| Possible future component normalization | Deferred |
| Optional visual regression tooling | Deferred |

---

## Current Override Metrics After Cleanup

**Date:** 2026-05-14
**Task type:** AUDIT / METRICS ONLY - no CSS, HTML, JS, bundle, or validator files were modified.
**Scope:** `static-uikit/assets/css/crm-static.css` and the 40 CSS files imported by it. The generated bundle, `uikit.min.css`, `pages/auth.css`, and `document-templates/` CSS are excluded from duplicate counts because they are not imported by `crm-static.css`.

### 1. Executive status

Yes, the project is materially closer to the "one canonical class owner" goal. The current source CSS no longer has the original broad layout cascade chain, token drift, shell rules inside `cards.css`, or duplicated table base blocks. Remaining duplicate pressure is now concentrated in page-scoped composition, responsive overrides, and a smaller number of component/page ownership seams.

Cleanup phases that directly reduced override chains:
- Token consolidation: `:root` now appears once in `base/tokens.css`.
- Layout ownership cleanup: `layout/app.css` is no longer the sidebar/topbar/page monolith.
- Component ownership cleanup: component-layer rules were removed from `layout/topbar.css` and moved to component files.
- Responsive shell cleanup: shell responsive/print rules were removed from `components/cards.css`.
- `tables.css` same-file table selector cleanup: the main table wrapper/table/cell duplicate blocks were consolidated.

Infrastructure and guardrail work:
- Bundle generation and bundle freshness checks.
- Validator manifest/bundle/source-of-truth checks.
- Validator guard for shell selectors in `components/cards.css`.
- Validator guard for duplicate top-level table selectors in `components/tables.css`.

### 2. Current duplicate selector count

Counting method: selectors inside comma-separated groups are counted individually. Cross-file duplicates count selectors that appear in more than one imported source file. Same-file duplicates count selectors repeated in one imported file across any context, including responsive and print contexts. The "same context cleanup candidates" column narrows this to repeated selectors in the same file and same at-rule context.

| Selector group | Cross-file duplicate selectors | Same-file repeated selectors, any context | Same-file same-context cleanup candidates |
|---|---:|---:|---:|
| Layout selectors | 1 | 0 | 0 |
| Component selectors | 1 | 9 | 9 |
| Page-specific selectors | 24 | 46 | 53 |
| Responsive selectors | 48 | 114 | 4 |
| Print selectors | 5 | 1 | 0 |
| UIkit override selectors | 1 | 10 | 11 |
| **Total** | **80** | **180** | **77** |

Notes:
- The 180 same-file count intentionally includes base plus responsive definitions. Most of those are legitimate responsive overrides.
- The actionable same-file cleanup queue is the 77 same-context duplicate selector blocks.
- `components/tabs.css` currently has no duplicate selector blocks.

### 3. Cross-file duplicate inventory

| Selector | Files | Legitimate or accidental | Current effective owner | Recommended next action |
|---|---|---|---|---|
| `.crm-nav-group .crm-nav-submenu` | `layout/sidebar.css`; `components/cards.css` | Needs cleanup: wrong owner | `layout/sidebar.css` should own nav submenu; `cards.css` currently overrides margin/padding | Remove the card-layer nav submenu rule or move any needed delta to sidebar ownership |
| `.crm-filter-panel` | `components/cards.css`; `components/filters.css` | Needs cleanup: wrong owner | `components/filters.css` wins for most values; `cards.css` still contributes margin/radius/padding earlier | Consolidate filter panel primitives in `filters.css`; remove or document any card-layer contribution |
| `.crm-form-card` | `components/cards.css`; `pages/contract-wizard.css` | Needs cleanup: should become modifier | `pages/contract-wizard.css` wins for contract-specific surface values; `cards.css` owns shared radius | Convert page-specific styling to a contract-scoped modifier or document as page composition |
| `.crm-mo-report-item.is-active` | `components/registry.css`; `pages/middle-office.css` | OK: page-scoped composition | `pages/middle-office.css` | Keep until page-scoped cleanup; verify it is intentionally middle-office specific |
| `.crm-mo-report-list-wrap` | `components/registry.css`; `pages/middle-office.css` | OK: page-scoped composition | `pages/middle-office.css` | Review during page-scoped cleanup |
| `.crm-page-header` | `layout/page.css`; `components/cards.css` | Needs cleanup: wrong owner | `components/cards.css` wins the base margin | Move page header spacing to `layout/page.css` or page-scoped selectors |
| `.crm-page[data-page="brokerage"] .crm-brokerage-actions` | `components/registry.css`; `pages/brokerage.css` | OK: page-scoped composition | `pages/brokerage.css` | Keep as page composition unless consolidated with registry action pattern |
| `.crm-page[data-page="brokerage"] .crm-filter-fields-row` | `components/registry.css`; `pages/brokerage.css` | OK: page-scoped composition | `pages/brokerage.css` | Review during registry/page cleanup |
| `.crm-page[data-page="compliance"] .crm-filter-fields-row` | `components/registry.css`; `pages/compliance.css` | OK: page-scoped composition | `pages/compliance.css` | Review during registry/page cleanup |
| `.crm-page[data-page="compliance"] .crm-filter-reset` | `components/registry.css`; `pages/compliance.css` | OK: page-scoped composition | `pages/compliance.css` | Review during registry/page cleanup |
| `.crm-page[data-page="depository"] .crm-dep-file-card` | `components/registry.css`; `pages/depository.css` | OK: page-scoped composition | `pages/depository.css` | Review during page-scoped cleanup |
| `.crm-page[data-page="depository"] .crm-dep-report-item.is-active` | `components/registry.css`; `pages/depository.css` | OK: page-scoped composition | `pages/depository.css` | Review during page-scoped cleanup |
| `.crm-page[data-page="depository"] .crm-dep-report-list-wrap` | `components/registry.css`; `pages/depository.css` | OK: page-scoped composition | `pages/depository.css` | Review during page-scoped cleanup |
| `.crm-page[data-page="depository"] .crm-dep-shell` | `components/registry.css`; `pages/depository.css` | OK: page-scoped composition | `pages/depository.css` | Review during page-scoped cleanup |
| `.crm-page[data-page="depository"] .crm-dep-toolbar-search-shell` | `components/registry.css`; `pages/depository.css` | OK: page-scoped composition | `pages/depository.css` | Review during page-scoped cleanup |
| `.crm-page[data-page="subject-register"] .reg-bank-add-form` | `components/subject-form.css`; `pages/subject-register.css` | OK: page-scoped composition | `pages/subject-register.css` | Keep or consolidate in subject-form ownership if reused |
| `.crm-page[data-page="subject-register"] .reg-group-title` | `components/subject-form.css`; `pages/subject-register.css` | OK: page-scoped composition | `pages/subject-register.css` | Keep or consolidate in subject-form ownership if reused |
| `.crm-page[data-page="subject-register"] .reg-step-header h2` | `components/subject-form.css`; `pages/subject-register.css` | OK: page-scoped composition | `pages/subject-register.css` | Keep or consolidate in subject-form ownership if reused |
| `body[data-page="middle-office-clients"] .crm-mo-shell` | `components/registry.css`; `pages/middle-office.css` | OK: page-scoped composition | `pages/middle-office.css` | Review during page-scoped cleanup |
| `body[data-page="subject-edit"] .crm-edit-form-card` | `components/subject-form.css`; `pages/subject-edit.css` | OK: page-scoped composition | `pages/subject-edit.css` | Keep or consolidate in subject-form ownership if reused |
| `body[data-page="subject-edit"] .crm-edit-title` | `components/subject-form.css`; `pages/subject-edit.css` | OK: page-scoped composition | `pages/subject-edit.css` | Keep or consolidate in subject-form ownership if reused |
| `body[data-page="subject-edit"] .crm-edit-toast` | `components/forms.css`; `pages/subject-edit.css` | OK: page-scoped composition | `pages/subject-edit.css` | Keep page-specific toast placement; consider moving shared toast primitive out of forms |
| `body[data-page="subject-edit"] .crm-form-section-head h3` | `components/subject-form.css`; `pages/subject-edit.css` | OK: page-scoped composition | `pages/subject-edit.css` | Keep or consolidate in subject-form ownership if reused |
| `body[data-page="subject-register"] .reg-bank-add-form` | `components/subject-form.css`; `pages/subject-register.css` | OK: page-scoped composition | `pages/subject-register.css` | Keep or consolidate in subject-form ownership if reused |
| `body[data-page="subject-register"] .reg-group-title` | `components/subject-form.css`; `pages/subject-register.css` | OK: page-scoped composition | `pages/subject-register.css` | Keep or consolidate in subject-form ownership if reused |
| `body[data-page="subject-register"] .reg-step-header h2` | `components/subject-form.css`; `pages/subject-register.css` | OK: page-scoped composition | `pages/subject-register.css` | Keep or consolidate in subject-form ownership if reused |
| `.crm-decision-panel` | `components/cards.css`; `pages/compliance.css` | Needs cleanup: should become modifier | `pages/compliance.css` wins in compliance page; `cards.css` owns generic panel | Rename/scope page version as a compliance modifier or page-scoped selector |
| `.crm-filter-search-input` | `components/filters.css`; `responsive.css` | OK: responsive override | `components/filters.css` base; `responsive.css` mobile | Keep |
| `.crm-footer-actions` | `layout/page.css`; `responsive.css` | OK: responsive override | `layout/page.css` base; `responsive.css` mobile | Keep |
| `.crm-main` | `layout/app.css`; `responsive.css` | OK: responsive override | `layout/app.css` base; `responsive.css` mobile | Keep |
| `.crm-mo-details-card` | `components/registry.css`; `pages/middle-office.css`; `responsive.css` | OK: responsive override | Page/base composition plus `responsive.css` mobile | Keep; review only if middle-office card primitive is extracted |
| `.crm-mo-details-grid` | `components/registry.css`; `pages/middle-office.css` | OK: page-scoped composition | `pages/middle-office.css` | Review during page-scoped cleanup |
| `.crm-page-actions` | `layout/page.css`; `pages/contract-wizard.css` | OK: responsive override | `layout/page.css` base; `pages/contract-wizard.css` responsive width | Keep |
| `.crm-page.crm-registry-page .crm-registry-filters.crm-filter-panel` | `components/filters.css`; `responsive.css` | OK: responsive override | `components/filters.css` base; `responsive.css` mobile | Keep |
| `.crm-page.crm-registry-page .crm-registry-filters.crm-filter-panel .crm-filter-actions` | `components/filters.css`; `responsive.css` | OK: responsive override | `components/filters.css` base; `responsive.css` mobile | Keep |
| `.crm-page.crm-registry-page .crm-registry-filters.crm-filter-panel .crm-filter-control` | `components/filters.css`; `responsive.css` | OK: responsive override | `components/filters.css` base; `responsive.css` mobile | Keep |
| `.crm-page.crm-registry-page .crm-registry-filters.crm-filter-panel .crm-filter-fields-row` | `components/filters.css`; `responsive.css` | OK: responsive override | `components/filters.css` base; `responsive.css` mobile | Keep |
| `.crm-page.crm-registry-page .crm-registry-filters.crm-filter-panel .crm-filter-reset` | `components/filters.css`; `responsive.css` | OK: responsive override | `components/filters.css` base; `responsive.css` mobile | Keep |
| `.crm-page[data-page="back-office"] .crm-back-office-shell .crm-filter-actions` | `components/registry.css`; `pages/back-office.css` | OK: page-scoped composition | `pages/back-office.css` | Review during page-scoped cleanup |
| `.crm-page[data-page="back-office"] .crm-back-office-shell .crm-filter-fields-row` | `components/registry.css`; `pages/back-office.css` | OK: page-scoped composition | `pages/back-office.css` | Review during page-scoped cleanup |
| `.crm-page[data-page="back-office"] .crm-page-header-row` | `components/registry.css`; `pages/back-office.css` | OK: page-scoped composition | `pages/back-office.css` | Review during page-scoped cleanup |
| `.crm-page[data-page="depository"] .crm-dep-details-card` | `components/registry.css`; `pages/depository.css`; `responsive.css` | OK: responsive override | `pages/depository.css` base; `responsive.css` mobile | Keep |
| `.crm-page[data-page="depository"] .crm-dep-details-grid` | `components/registry.css`; `pages/depository.css` | OK: page-scoped composition | `pages/depository.css` | Review during page-scoped cleanup |
| `.crm-page[data-page="requests"] .crm-requests-actions` | `components/registry.css`; `pages/requests.css` | OK: responsive override | `components/registry.css` base; `pages/requests.css` mobile | Keep but consolidate same-media duplicate in `requests.css` |
| `.crm-page[data-page="subject-card"] .crm-representative-form-grid` | `pages/subject-card.css`; `responsive.css` | OK: responsive override | `pages/subject-card.css` base; `responsive.css` mobile | Keep |
| `.crm-page[data-page="subject-card"] .crm-subject-card-shell` | `pages/subject-card.css`; `responsive.css` | OK: responsive override | `pages/subject-card.css` base; `responsive.css` mobile | Keep after page duplicate cleanup |
| `.crm-page[data-page="subject-card"] .crm-subject-detail-shell` | `pages/subject-card.css`; `responsive.css` | OK: responsive override | `pages/subject-card.css` base; `responsive.css` mobile | Keep after page duplicate cleanup |
| `.crm-page[data-page="subject-register"] .crm-address-display-line` | `components/address.css`; `pages/subject-register.css` | OK: page-scoped composition | `pages/subject-register.css` | Keep or consolidate in address module if reused identically |
| `.crm-page[data-page="subject-register"] .crm-address-edit-btn` | `components/address.css`; `pages/subject-register.css` | OK: page-scoped composition | `pages/subject-register.css` | Keep or consolidate in address module if reused identically |
| `.crm-page[data-page="subject-register"] .crm-address-part-field--wide` | `components/address.css`; `pages/subject-register.css` | OK: page-scoped composition | `pages/subject-register.css` | Keep or consolidate in address module if reused identically |
| `.crm-page[data-page="subject-register"] .crm-address-parts-actions` | `components/address.css`; `pages/subject-register.css` | OK: page-scoped composition | `pages/subject-register.css` | Keep or consolidate in address module if reused identically |
| `.crm-page[data-page="subject-register"] .crm-address-parts-grid` | `components/address.css`; `pages/subject-register.css` | OK: page-scoped composition | `pages/subject-register.css` | Keep or consolidate in address module if reused identically |
| `.crm-page[data-page="subject-register"] .reg-wizard-actions` | `components/subject-form.css`; `pages/subject-register.css`; `responsive.css` | OK: responsive override | `pages/subject-register.css` base; `responsive.css` mobile | Keep |
| `.crm-page[data-page="subject-register"] .reg-wizard-actions .reg-back` | `pages/subject-register.css`; `responsive.css` | OK: responsive override | `pages/subject-register.css` base; `responsive.css` mobile | Keep |
| `.crm-page[data-page="trading-card"] .crm-terminal-fields` | `pages/trading.css`; `responsive.css` | OK: responsive override | `pages/trading.css` base; `responsive.css` mobile | Keep |
| `.crm-page[data-page="trading"] .crm-page-header-row` | `components/registry.css`; `pages/trading.css` | OK: page-scoped composition | `pages/trading.css` | Review during page-scoped cleanup |
| `.crm-table-card` | `components/tables.css`; `responsive.css` | OK: responsive override | `components/tables.css` base; `responsive.css` mobile | Keep |
| `[data-sidebar-toggle]` | `layout/topbar.css`; `responsive.css` | OK: responsive override | `layout/topbar.css` base hidden state; `responsive.css` mobile visible state | Keep |
| `body` | `base/reset.css`; `responsive.css` | OK: responsive override | `base/reset.css` base; `responsive.css` mobile overflow guard | Keep |
| `body[data-page="middle-office-reports"] .crm-mo-split` | `pages/middle-office.css`; `responsive.css` | OK: responsive override | `pages/middle-office.css` base; `responsive.css` mobile | Keep |
| `body[data-page="subject-edit"] .crm-address-display-line` | `components/address.css`; `pages/subject-edit.css` | OK: page-scoped composition | `pages/subject-edit.css` | Keep or consolidate in address module if reused identically |
| `body[data-page="subject-edit"] .crm-address-edit-btn` | `components/address.css`; `pages/subject-edit.css` | OK: page-scoped composition | `pages/subject-edit.css` | Keep or consolidate in address module if reused identically |
| `body[data-page="subject-edit"] .crm-address-part-field--wide` | `components/address.css`; `pages/subject-edit.css` | OK: page-scoped composition | `pages/subject-edit.css` | Keep or consolidate in address module if reused identically |
| `body[data-page="subject-edit"] .crm-address-parts-actions` | `components/address.css`; `pages/subject-edit.css` | OK: page-scoped composition | `pages/subject-edit.css` | Keep or consolidate in address module if reused identically |
| `body[data-page="subject-edit"] .crm-address-parts-grid` | `components/address.css`; `pages/subject-edit.css` | OK: page-scoped composition | `pages/subject-edit.css` | Keep or consolidate in address module if reused identically |
| `body[data-page="subject-edit"] .crm-edit-header` | `components/subject-form.css`; `pages/subject-edit.css` | OK: responsive override | `pages/subject-edit.css` base and mobile | Keep; consolidate if subject-form owns shared header primitive |
| `body[data-page="subject-edit"] .crm-edit-header-actions` | `components/subject-form.css`; `pages/subject-edit.css` | OK: responsive override | `pages/subject-edit.css` base and mobile | Keep; consolidate if subject-form owns shared action primitive |
| `body[data-page="subject-register"] .crm-address-display-line` | `components/address.css`; `pages/subject-register.css` | OK: page-scoped composition | `pages/subject-register.css` | Keep or consolidate in address module if reused identically |
| `body[data-page="subject-register"] .crm-address-edit-btn` | `components/address.css`; `pages/subject-register.css` | OK: page-scoped composition | `pages/subject-register.css` | Keep or consolidate in address module if reused identically |
| `body[data-page="subject-register"] .crm-address-part-field--wide` | `components/address.css`; `pages/subject-register.css` | OK: page-scoped composition | `pages/subject-register.css` | Keep or consolidate in address module if reused identically |
| `body[data-page="subject-register"] .crm-address-parts-actions` | `components/address.css`; `pages/subject-register.css` | OK: page-scoped composition | `pages/subject-register.css` | Keep or consolidate in address module if reused identically |
| `body[data-page="subject-register"] .crm-address-parts-grid` | `components/address.css`; `pages/subject-register.css` | OK: page-scoped composition | `pages/subject-register.css` | Keep or consolidate in address module if reused identically |
| `body[data-page="subject-register"] .reg-wizard-actions` | `components/subject-form.css`; `pages/subject-register.css`; `responsive.css` | OK: responsive override | `pages/subject-register.css` base; `responsive.css` mobile | Keep |
| `body[data-page="subject-register"] .reg-wizard-actions .reg-back` | `pages/subject-register.css`; `responsive.css` | OK: responsive override | `pages/subject-register.css` base; `responsive.css` mobile | Keep |
| `.crm-layout` | `layout/app.css`; `responsive.css`; `print.css` | OK: print override | `layout/app.css` base; `responsive.css` mobile; `print.css` print | Keep |
| `.crm-page` | `layout/page.css`; `responsive.css`; `print.css` | OK: print override | `layout/page.css` base; responsive/print conditional overrides | Keep |
| `.crm-sidebar` | `layout/sidebar.css`; `responsive.css`; `print.css` | OK: print override | `layout/sidebar.css` base; responsive/print conditional overrides | Keep |
| `.crm-sticky-actions` | `layout/page.css`; `responsive.css` | OK: print override | `layout/page.css` base plus local print hide; `responsive.css` mobile | Keep |
| `.crm-topbar` | `layout/topbar.css`; `responsive.css`; `print.css` | OK: print override | `layout/topbar.css` base; responsive/print conditional overrides | Keep |
| `body[data-page="subject-edit"] .uk-form-label` | `components/subject-form.css`; `pages/subject-edit.css` | OK: UIkit bridge | `pages/subject-edit.css` | Keep as page-scoped UIkit bridge or document in bridge inventory |

### 4. Same-file duplicate inventory

Inventory below lists exact same-file, same-at-rule-context duplicate selector blocks. Same selectors repeated between base and responsive media contexts are counted in the metrics above, but are treated as intentional responsive overrides unless separately listed here.

| File | Selector | Occurrences | Final computed values clear? | Consolidate next? |
|---|---|---:|---|---|
| `components/address.css` | `.crm-page[data-page="subject-register"] .crm-address-row:last-child` | 2 | Yes - same-file cascade order is clear | Later, address/page cleanup |
| `components/address.css` | `body[data-page="subject-edit"] .crm-address-row:last-child` | 2 | Yes - same-file cascade order is clear | Later, address/page cleanup |
| `components/address.css` | `body[data-page="subject-register"] .crm-address-row:last-child` | 2 | Yes - same-file cascade order is clear | Later, address/page cleanup |
| `components/cards.css` | `.crm-binary-control` | 2 | Yes - later base block wins overlapping `gap` | Yes, cards cleanup |
| `components/cards.css` | `.crm-binary-control label` | 2 | Yes - later base block wins overlapping border/padding/color | Yes, cards cleanup |
| `components/cards.css` | `.crm-option-card` | 2 | Yes - later base block wins `min-height` | Yes, cards cleanup |
| `components/cards.css` | `.crm-option-card.is-selected` | 2 | Yes - later base block wins selected state values | Yes, cards cleanup |
| `components/filters.css` | `.crm-filter-panel` | 2 | Yes - second base block adds positioning/overflow only | Yes, filters cleanup |
| `components/forms.css` | `.uk-select` | 2 | Yes - both are base UIkit bridge blocks | Later, UIkit bridge cleanup |
| `components/registry.css` | `.crm-page[data-page="agents"] .crm-agents-actions` | 2 | Yes - later grouped block adds flex sizing | Later, page-scoped cleanup |
| `components/registry.css` | `.crm-page[data-page="agents"] .crm-agents-shell .crm-filter-pill-control` | 2 | Yes - later grouped block adds width clamp | Later, page-scoped cleanup |
| `components/registry.css` | `.crm-page[data-page="archive"] .crm-archive-actions` | 2 | Yes - later grouped block adds flex sizing | Later, page-scoped cleanup |
| `components/registry.css` | `.crm-page[data-page="archive"] .crm-archive-shell .crm-filter-pill-control` | 2 | Yes - later grouped block adds width clamp | Later, page-scoped cleanup |
| `components/registry.css` | `.crm-page[data-page="back-office"] .crm-back-office-shell .crm-filter-pill-control` | 2 | Yes - later grouped block adds width clamp | Later, page-scoped cleanup |
| `components/registry.css` | `.crm-page[data-page="brokerage"] .crm-brokerage-actions` | 2 | Yes - later grouped block adds flex sizing | Later, page-scoped cleanup |
| `components/registry.css` | `.crm-page[data-page="brokerage"] .crm-filter-pill-control` | 2 | Yes - later grouped block adds width clamp | Later, page-scoped cleanup |
| `components/registry.css` | `.crm-page[data-page="compliance"] .crm-filter-pill-control` | 2 | Yes - later grouped block adds width clamp | Later, page-scoped cleanup |
| `components/registry.css` | `.crm-page[data-page="requests"] .crm-requests-actions` | 2 | Yes - later grouped block adds flex sizing | Later, page-scoped cleanup |
| `components/registry.css` | `.crm-page[data-page="requests"] .crm-requests-shell .crm-filter-pill-control` | 2 | Yes - later grouped block adds width clamp | Later, page-scoped cleanup |
| `components/registry.css` | `.crm-page[data-page="trading"] .crm-trading-shell .crm-filter-pill-control` | 2 | Yes - later grouped block adds width clamp | Later, page-scoped cleanup |
| `components/registry.css` | `.crm-page[data-page="trust-management"] .crm-trust-management-actions` | 2 | Yes - later grouped block adds flex sizing | Later, page-scoped cleanup |
| `components/registry.css` | `.crm-page[data-page="trust-management"] .crm-trust-management-shell .crm-filter-pill-control` | 2 | Yes - later grouped block adds width clamp | Later, page-scoped cleanup |
| `components/registry.css` | `body[data-page="subjects"] .crm-filter-pill-control` | 2 | Yes - later grouped block adds width clamp | Later, page-scoped cleanup |
| `components/tables.css` | `.crm-list-actions` | 2 | Yes - second base block adds justify/wrap | Later, small table-adjacent cleanup |
| `components/tables.css` | `.crm-table-actions` | 2 | Yes - second base block adds justify/wrap | Later, small table-adjacent cleanup |
| `components/tables.css` | `.crm-table-head` | 2 | Yes - second base block adds head-specific border/padding | Later, small table-adjacent cleanup |
| `components/tables.css` | `.crm-table-meta` | 2 | Yes - second base block adds typography | Later, small table-adjacent cleanup |
| `pages/requests.css` | `.crm-page[data-page="requests"] .crm-request-create-actions` | 2 | Yes - same media context, later button layout follows | Yes, page-scoped cleanup |
| `pages/requests.css` | `.crm-page[data-page="requests"] .crm-requests-actions` | 2 | Yes - same media context, later rule adds flex behavior | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] .crm-contracts-accounts-section` | 2 | Yes - later base compact-pass block wins/adds gap | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] .crm-documents-actions` | 2 | Yes - later base compact-pass block wins/adds min-height/margin | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] .crm-documents-section` | 2 | Yes - later base compact-pass block wins/adds gap | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] .crm-flat-section` | 2 | Yes - later base compact-pass block wins/adds surface values | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] .crm-form-section-head` | 2 | Yes - later base compact-pass block wins/adds spacing | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] .crm-form-section-head h3` | 2 | Yes - later base compact-pass block wins/adds typography | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] .crm-history-header` | 2 | Yes - later base compact-pass block wins/adds header divider | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] .crm-history-section` | 2 | Yes - later base compact-pass block wins/adds gap | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] .crm-inline-badges` | 2 | Yes - later base block can override/add badge layout | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] .crm-profile-label` | 2 | Yes - later base compact-pass block wins/adds typography | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] .crm-profile-value` | 2 | Yes - later base compact-pass block wins/adds typography | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] .crm-relations-header` | 2 | Yes - later base compact-pass block wins/adds header divider | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] .crm-relations-section` | 2 | Yes - later base compact-pass block wins/adds gap | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] .crm-subject-actions` | 2 | Yes - later base compact-pass block wins/adds action layout | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] .crm-subject-actions` in `@media (max-width: 1180px)` | 2 | Yes - later media block wins/adds responsive action layout | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] .crm-subject-actions .crm-button` | 2 | Yes - later base compact-pass block wins/adds button sizing | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] .crm-subject-actions .uk-button` | 2 | Yes - later base compact-pass block wins/adds button sizing | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] .crm-subject-avatar` | 2 | Yes - later base compact-pass block wins/adds avatar sizing | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] .crm-subject-card-shell` | 2 | Yes - later base compact-pass block wins/adds shell values | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] .crm-subject-code` | 2 | Yes - later base compact-pass block wins/adds inline layout | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] .crm-subject-detail-shell` | 2 | Yes - later base compact-pass block wins/adds gap | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] .crm-subject-hero` | 2 | Yes - later base compact-pass block wins/adds hero layout | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] .crm-subject-hero` in `@media (max-width: 1180px)` | 2 | Yes - later media compact-pass block wins/adds responsive layout | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] .crm-subject-hero-main` | 2 | Yes - later base compact-pass block wins/adds flex layout | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] .crm-subject-identity h1` | 2 | Yes - later base compact-pass block wins/adds heading line-height | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] .crm-subject-label` | 2 | Yes - later base block can override/add label styling | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] .crm-subject-profile-section` | 2 | Yes - later base compact-pass block wins/adds surface values | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] .crm-subject-section-layout` | 2 | Yes - later base compact-pass block wins/adds gap | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] .crm-subject-tabs` | 2 | Yes - later base compact-pass block wins/adds tabs layout | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] .crm-subject-tabs > .uk-active > a` | 2 | Yes - later base compact-pass block wins/adds active tab values | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] .crm-subject-tabs > li > a` | 2 | Yes - later base compact-pass block wins/adds tab link sizing | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] .crm-subject-tabs-wrap` | 2 | Yes - later base compact-pass block wins/adds wrapper values | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] [data-tab-panel="accounts"] .crm-table .uk-table thead th` | 2 | Yes - later base table-header block wins/adds values | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] [data-tab-panel="contracts"] .crm-section-head-inline` | 2 | Yes - later base compact-pass block wins/adds header divider | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] [data-tab-panel="contracts"] .crm-table .uk-table thead th` | 2 | Yes - later base table-header block wins/adds values | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] [data-tab-panel="documents"] .crm-table .uk-table` | 2 | Yes - later base documents-table block wins/adds values | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] [data-tab-panel="documents"] .crm-table .uk-table thead th` | 2 | Yes - later base table-header block wins/adds values | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] [data-tab-panel="documents"] .crm-table .uk-table.crm-documents-table thead th` | 2 | Yes - later base documents-table block wins/adds values | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] [data-tab-panel="documents"] .crm-table-wrapper` | 3 | Yes - latest base block wins overlapping table wrapper values | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] [data-tab-panel="documents"] .crm-table-wrapper .crm-table` | 2 | Yes - later base documents-table block wins/adds values | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] [data-tab-panel="documents"] .crm-table-wrapper::after` | 2 | Yes - later base block wins/adds pseudo-element values | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] [data-tab-panel="history"] .crm-table .uk-table thead th` | 2 | Yes - later base table-header block wins/adds values | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] [data-tab-panel="profile"] .crm-card.crm-subject-profile-section` | 2 | Yes - later base compact-pass block wins/adds surface values | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] [data-tab-panel="profile"] .crm-subject-section-layout` | 2 | Yes - later base compact-pass block wins/adds gap | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] [data-tab-panel="profile"] .crm-table-wrapper` | 2 | Yes - later base compact-pass block wins/adds wrapper values | Yes, page-scoped cleanup |
| `pages/subject-card.css` | `.crm-page[data-page="subject-card"] [data-tab-panel="relations"] .crm-table .uk-table thead th` | 2 | Yes - later base table-header block wins/adds values | Yes, page-scoped cleanup |
| `pages/subject-edit.css` | `body[data-page="subject-edit"] .uk-textarea.crm-input` | 2 | Yes - later base UIkit bridge block wins/adds min-height | Later, UIkit bridge cleanup |
| `pages/subjects.css` | `body[data-page="subjects"] .crm-subjects-table .crm-subjects-meta-chip` | 2 | Yes - later base block wins/adds chip values | Yes, page-scoped cleanup |

Same-file exact duplicate counts by file:

| File | Count |
|---|---:|
| `pages/subject-card.css` | 46 |
| `components/registry.css` | 14 |
| `components/cards.css` | 4 |
| `components/tables.css` | 4 |
| `components/address.css` | 3 |
| `pages/requests.css` | 2 |
| `components/forms.css` | 1 |
| `components/filters.css` | 1 |
| `pages/subjects.css` | 1 |
| `pages/subject-edit.css` | 1 |
| `components/tabs.css` | 0 |

### 5. Top remaining override chains

| Rank | Selector/class | Why it matters | Current files involved | Recommended next task |
|---:|---|---|---|---|
| 1 | `pages/subject-card.css` subject-card selector cluster | 46 exact same-context duplicate selectors in one page file; highest count and highest local cleanup value | `pages/subject-card.css`; some responsive participation from `responsive.css` | Page-scoped override cleanup |
| 2 | Registry action/filter page-scoped groups | Shared registry selectors repeat across component and page files; many are page-specific compositions that can become cleaner shared primitives | `components/registry.css`; `pages/back-office.css`; `pages/brokerage.css`; `pages/compliance.css`; `pages/depository.css`; `pages/middle-office.css`; `pages/requests.css`; `pages/trading.css` | Page-scoped override cleanup |
| 3 | `.crm-filter-panel` | Shared component ownership is split between cards and filters; this is the clearest remaining cross-component duplicate | `components/cards.css`; `components/filters.css` | Filters/toolbar ownership cleanup |
| 4 | `.crm-option-card` / `.crm-option-card.is-selected` | Same-file component duplicates in `cards.css`; later base blocks silently win sizing/selected state | `components/cards.css` | Cards same-file duplicate cleanup |
| 5 | `.crm-binary-control` / `.crm-binary-control label` | Same-file component duplicates in `cards.css`; later base blocks silently win control spacing and label values | `components/cards.css` | Cards same-file duplicate cleanup |
| 6 | `.crm-nav-group .crm-nav-submenu` | Navigation selector still appears in `cards.css`, outside the canonical sidebar/nav owner | `layout/sidebar.css`; `components/cards.css` | Component ownership follow-up |
| 7 | `.crm-page-header` | Page header spacing is split between page layout and card/component file | `layout/page.css`; `components/cards.css` | Page-scoped override cleanup |
| 8 | Address subject register/edit selectors | Address primitives are shared, but page-scoped overrides duplicate selectors in subject page CSS | `components/address.css`; `pages/subject-register.css`; `pages/subject-edit.css` | Page-scoped override cleanup |
| 9 | `.crm-table-head`, `.crm-table-meta`, `.crm-table-actions`, `.crm-list-actions` | Table base duplicate cleanup is complete, but table-adjacent header/action blocks still repeat in `tables.css` | `components/tables.css` | Later small table-adjacent cleanup or validator expansion |
| 10 | UIkit bridges in subject pages | UIkit selectors are still repeated in page files; most are legitimate bridges, but not documented as a bridge layer | `components/forms.css`; `components/subject-form.css`; `pages/subject-card.css`; `pages/subject-edit.css` | UIkit bridge cleanup |

### 6. Progress summary against original audit

| Original issue | Current status |
|---|---|
| Bundle/source-of-truth ambiguity | Resolved. `crm-static.css` is the import manifest and `crm-static.bundle.css` is generated and checked for freshness. |
| Token overrides in layout files | Resolved. `:root` appears exactly once in `base/tokens.css`; validator confirms this in the bundle. |
| `layout/app.css` monolith | Resolved for the major chain. `app.css` now owns only the minimal app shell/grid/main basics. |
| `topbar.css` component-layer overrides | Resolved. Deferred component overrides were moved to component files and the button `!important` bridge was removed. |
| `cards.css` responsive/print shell rules | Resolved. Shell/mobile/print behavior is owned by `responsive.css` and `print.css`; validator guards against shell selectors returning to `cards.css`. |
| `tables.css` same-file table duplicates | Resolved for the targeted table wrapper/table/cell selectors. Remaining `tables.css` duplicates are table-adjacent action/header helpers, not the guarded table base selectors. |

Overall movement: the remaining duplicate selectors are now mostly intentional responsive/print rules or localized page-scoped composition. The accidental high-risk cross-file layout/component overrides from the original audit have been substantially reduced.

### 7. Recommended next implementation task

Recommended next task: **page-scoped override cleanup**.

Reason: the current metrics show page-scoped selectors are now the largest cleanup pool: 24 cross-file duplicate selectors and 53 same-context cleanup candidates. The highest-value concentration is `pages/subject-card.css` with 46 exact same-context duplicate selectors, followed by registry/page-scoped group duplication in `components/registry.css`.

Do not perform this task as part of this audit.

### 8. Acceptance criteria for the next implementation task

Measurable acceptance criteria for page-scoped override cleanup:
- Reduce exact same-file same-context duplicate selectors in `pages/subject-card.css` from 46 to 0.
- Reduce exact same-file same-context duplicate selectors in `pages/requests.css`, `pages/subjects.css`, and `pages/subject-edit.css` from 4 combined to 0, or document any intentionally retained bridge selector.
- Preserve legitimate base plus responsive pairs; responsive overrides must remain in media contexts or `responsive.css`.
- Do not introduce unscoped generic component overrides in page CSS; page rules should stay page-scoped or become documented component modifiers.
- Keep `components/tabs.css` at 0 duplicate selectors.
- After implementation, regenerate the bundle and require `npm.cmd run static:uikit:bundle:check` and `npm.cmd run static:uikit:validate` to pass with 0 errors.

### Validation results for this audit

Initial direct `npm run ...` attempts in PowerShell failed because `npm.ps1` is blocked by the local execution policy. Equivalent `npm.cmd` invocations were run successfully:

| Command | Result |
|---|---|
| `npm run static:uikit:bundle:check` | Could not run via PowerShell `npm.ps1` execution policy |
| `npm run static:uikit:validate` | Could not run via PowerShell `npm.ps1` execution policy |
| `npm.cmd run static:uikit:bundle:check` | Exit 0 - bundle is up to date, 40 / 40 sections, 243.9 KB |
| `npm.cmd run static:uikit:validate` | Exit 0 - validation passed, 29 pages checked, 296 local asset refs checked, 0 errors, 0 warnings |

---

## Tables Same-File Duplicate Cleanup Notes

**Date:** 2026-05-14
**Task type:** SAFE IMPLEMENTATION - tables.css same-file duplicate consolidation.
**Status:** Complete - table duplicate selectors consolidated, validator enhanced, bundle regenerated, bundle check and validation passed.

### Files changed

| File | Nature of change |
|------|-----------------|
| `assets/css/components/tables.css` | Consolidated same-file duplicate table wrapper, table shell, UIkit table, and table cell selector blocks |
| `tools/validate-static-uikit.mjs` | Added conservative duplicate selector guard for top-level `components/tables.css` table selectors |
| `assets/css/crm-static.bundle.css` | Regenerated from source CSS via the existing bundle script |
| `audits/css-class-override-audit.md` | Added these tables duplicate cleanup notes and validation results |

### Duplicate selectors consolidated

Consolidated exact same-file duplicate blocks for:
- `.crm-table-wrapper`
- `.crm-table`
- `.crm-table .uk-table`
- `.crm-table .uk-table th`
- `.crm-table .uk-table td`
- `.crm-table .uk-table td:first-child`
- `.crm-table .uk-table th, .crm-table .uk-table td`

The compact density block remains as a single intentional grouped rule:
- `.crm-table-compact .uk-table th, .crm-table-compact .uk-table td`

### Final table structure

`components/tables.css` now has one canonical base block for:
- table wrapper: `position`, final `overflow: auto`, max width, border, radius, background, shadow, scrollbar styling, and stable gutter;
- table shell: border, radius, final `overflow: auto`, background;
- inner UIkit table: `margin: 0`, final `min-width: 100%`, and `font-size: 14px`;
- header cells: final color, typography, uppercase treatment, bottom border, padding, and nowrap;
- body cells: final vertical alignment, padding, `font-size: 13px`, text color, line height, weight, and nowrap;
- first body cell: final darker color, medium weight, and normal wrapping.

The scoped card variants remain separate and intentional:
- `.crm-table-card .crm-table-wrapper`
- `.crm-table-card .crm-table`

### Media-query and duplicate notes

No table duplicate was intentionally kept among the exact duplicate targets. The old `@media (max-width: 959px) { .crm-table .uk-table { min-width: 840px; } }` rule was removed because it was dead in the previous cascade: the later `.crm-table .uk-table { min-width: 100%; }` block always won. The responsive `.crm-table-wrapper::after` width adjustment remains because it is still effective.

### Validator enhancement

`tools/validate-static-uikit.mjs` now checks `components/tables.css` for duplicate top-level definitions of these exact selectors:
- `.crm-table-wrapper`
- `.crm-table`
- `.crm-table .uk-table`
- `.crm-table .uk-table th`
- `.crm-table .uk-table td`
- `.crm-table .uk-table td:first-child`

The check strips block comments and only counts top-level exact selector blocks, so selector groups, scoped overrides such as `.crm-table-card .crm-table-wrapper`, and media-query rules are not treated as duplicates.

### Validation results

| Command | Result |
|---------|--------|
| `npm run static:uikit:bundle` | Exit 0 - 40/40 sections inlined - 243.9 KB |
| `npm run static:uikit:bundle:check` | Exit 0 - bundle up to date - 40/40 sections - 243.9 KB |
| `npm run static:uikit:validate` | Exit 0 - validation passed - 0 errors, 0 warnings |

New validator confirmation:

```
G. Component Boundary Checks
  components/cards.css contains no shell-level selectors
  components/tables.css contains no duplicate top-level table selector definitions
```

### Remaining deferred items

| Item | Status |
|------|--------|
| Same-file duplicate cleanup in `components/cards.css` | Deferred |
| Possible future component normalization | Deferred |
| Optional visual regression tooling | Deferred |
