# Long-Text Overflow Hardening Audit

**Date:** 2026-05-20
**Branch:** main
**Author:** Vitaly

---

## Root Cause

The subject-card hero h1 (`.crm-subject-identity h1`) had `font-size`, `line-height`, and `color` but no wrapping constraints. A long unbroken string (e.g. a legal entity name without spaces) would expand the h1 past the flex/grid column boundary, pushing action buttons off-screen or causing horizontal page overflow. In registry tables, `.crm-row-main` already had `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;` but without `table-layout: fixed` the browser's auto-layout algorithm ignored colgroup widths and expanded the name column past its quota.

---

## Files Changed

| File | Change |
|---|---|
| `assets/css/pages/subject-card.css` | Hero h1 wrapping; identity container max-width; profile value wrapping; address field strong wrapping; subject code overflow-wrap; subject label max-width |
| `assets/css/components/tables.css` | `.crm-row-main` and `.crm-row-sub` explicit display:block + max-width + min-width; td/th min-width:0 |
| `assets/css/pages/subjects.css` | `table-layout: fixed; width: 100%` on subjects `.uk-table`; `max-width: 100%` on subjects `.crm-row-main` |
| `assets/css/crm-static.bundle.css` | Regenerated (auto-generated, not manually edited) |

---

## Part 1 — Subject-Card Hero Title Fix

**Selector:** `.crm-page[data-page="subject-card"] .crm-subject-identity h1`

Added:
```css
max-width: 100%;
overflow-wrap: anywhere;
word-break: normal;
hyphens: auto;
```

`overflow-wrap: anywhere` is the critical property — it allows breaks inside any character sequence including runs without spaces. `word-break: normal` preserves standard word-break for ordinary text. `hyphens: auto` adds soft hyphens where the UA dictionary supports them (Latin/Cyrillic with `lang` set).

**Selector:** `.crm-page[data-page="subject-card"] .crm-subject-identity`

Added: `max-width: 100%` to prevent the grid-item identity container from exceeding the allocated column.

---

## Part 2 — Hero Action Layout

The hero grid already had `grid-template-columns: minmax(0, 1fr) auto` and `.crm-subject-hero-main` already had `min-width: 0`. The existing 1180px breakpoint stacks actions below the title before overflow occurs. No additional changes needed.

---

## Part 3 — Detail/Profile Value Hardening

**`.crm-profile-value`** — added `overflow-wrap: anywhere; word-break: normal;`  
Long email addresses, org names in profile rows can now wrap without layout impact.

**`.crm-address-field strong`** — added `overflow-wrap: anywhere;`  
Prevents long street names or postal codes from overflowing the 3-column address grid.

**`.crm-subject-code`** — added `overflow-wrap: anywhere;`  
Cascades to the strong (client code) child; short codes are normal, long codes wrap.

---

## Part 4 — Other Pages/Selectors Checked

Checked selectors across:
- `subject-card.html`, `subject-card-individual.html` — fixed via subject-card.css
- `subjects.html` — fixed via subjects.css (table-layout: fixed)
- `compliance.html`, `compliance-card.html` — use `.crm-compliance-title-row h1` inside `.crm-detail-hero`; `.crm-detail-hero-main` already has `min-width: 0`. No immediate overflow risk from current demo data.
- `brokerage.html`, `trading-card.html`, `requests.html`, `agents.html` — registry tables; inherit `.crm-row-main` ellipsis from tables.css; no page-specific overflow risk identified beyond what shared tables.css now covers.
- `contract-wizard.html`, `contract-edit.html`, `subject-register.html`, `subject-edit.html` — form pages; field inputs already constrained by form layout; no layout-breaking overflow found.
- `.crm-detail-meta strong`, `.crm-contract-client-summary` — use flex-wrap; no single-value overflow risk in current demo data.

---

## Part 5 — Table Long-Name Guarantee

**Root cause for registry tables:** `table-layout: auto` (browser default) allows columns to expand past their colgroup `width` to fit content. Even with `.crm-row-main { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }`, the browser first lays out the table with unconstrained widths, then applies overflow/ellipsis — too late to prevent column expansion.

**Fix 1 — `tables.css` (shared, all registry tables):**
- `.crm-row-main`: added `display: block; max-width: 100%; min-width: 0;`
- `.crm-row-sub`: added `display: block; max-width: 100%; min-width: 0;`
- `.crm-table .uk-table th`: added `min-width: 0;`
- `.crm-table .uk-table td`: added `min-width: 0;`

**Fix 2 — `subjects.css` (scoped to subjects registry):**
```css
body[data-page="subjects"] .crm-subjects-table .uk-table {
  table-layout: fixed;
  width: 100%;
}
```
With `table-layout: fixed`, column widths are driven by `<col class="crm-col-name">` (`clamp(240px, 22vw, 270px)`). Content beyond that width is clipped. The existing `.crm-row-main` ellipsis then applies correctly.

`table-layout: fixed` was NOT added globally to all `.crm-table .uk-table` to avoid breaking tab-scoped tables in subject-card (documents, relations, history) which have no explicit colgroup widths.

---

## Part 6 — Badges, Tabs, Buttons

**`.crm-subject-label`** — added `max-width: 100%`. Badges in the hero use `inline-flex` and already wrap via `.crm-inline-badges { flex-wrap: wrap; }`. The `max-width: 100%` prevents a single badge from forcing the hero wider than its column.

Tabs and buttons already use `white-space: nowrap`; button containers use `flex-wrap: wrap`. No additional changes needed.

---

## Part 7 — Manual Test Strings

Do NOT commit. Use these in DevTools or local HTML edits for verification:

```
АО «Восток МайнингСистемсМайнингСистемсМайнингСистемсМайнингСистемсМайнингСистемс»

SuperLongCompanyNameWithoutSpacesSuperLongCompanyNameWithoutSpacesSuperLongCompanyNameWithoutSpaces

very.long.department.name.for.compliance.notifications@example-super-long-domain-name.ru
```

Expected in subject-card hero: text wraps within the left column; actions remain visible on the right (or below at ≤1180px).

Expected in subjects table: name column shows ellipsis; INN/type/residency/status columns remain aligned; table wrapper scrolls horizontally if total width > viewport; no page-level overflow.

---

## Part 8 — Validator

No new validator guards added. Existing validator fully passes after changes:

- G-check: `components/tables.css` — no duplicate selectors ✓
- G-check: `pages/subject-card.css` — no duplicate selectors ✓
- G-check: `pages/subjects.css` — no duplicate meta-chip selectors ✓

Manual QA recommended: open `subjects.html` in browser, paste long test string into a row name via DevTools, confirm ellipsis and no horizontal overflow.

---

## Part 9 — Bundle Results

```
npm run static:uikit:bundle
  ✓ Bundle written → static-uikit/assets/css/crm-static.bundle.css
  Sections inlined : 42 / 42
  Output size      : 243.5 KB

npm run static:uikit:bundle:check
  ✓ Bundle is up to date (42 / 42 sections, 243.5 KB)

npm run static:uikit:validate
  Errors   : 0
  Warnings : 0
  ✓ Validation passed.
```

---

---

## Registry Table Fixed-Layout Follow-up Notes

**Date:** 2026-05-20

### Registry/List Tables Audited

| Page | colgroup style | Table min-width in CSS | Fixed-layout outcome |
|---|---|---|---|
| subjects.html | crm-col-* (`width:`) | 1240px | ✅ Already applied (prior commit) |
| compliance.html | crm-col-* (`width:`) | 1120px | ✅ Applied in compliance.css |
| brokerage.html | crm-brokerage-col-* (`width:`) | none → added 1140px | ✅ Applied in brokerage.css |
| trading.html | mixed (`width:` + `min-width:`) | 1380px | ✅ Applied in trading.css |
| agents.html | all `min-width:` | none | ⛔ Deferred → ✅ Completed in follow-up commit |
| archive.html | all `min-width:` | 1100px | ⛔ Deferred → ✅ Completed in follow-up commit |
| trust-management.html | all `min-width:` | none | ⛔ Deferred → ✅ Completed in follow-up commit |
| requests.html | mixed, name col `min-width:` | none | ⛔ Deferred → ✅ Completed in follow-up commit |
| back-office.html | none | none | ⛔ Deferred → ✅ Completed in follow-up commit |

### Detail/Card Tables Intentionally Excluded

- subject-card.html document/relation/history tabs — no colgroup, content-driven widths
- compliance-card.html embedded tables — detail view, no colgroup
- middle-office-clients.html — re-classified in follow-up as a registry-like list and hardened

### Fixed-Layout Ownership

Page-scoped rules were used (no shared `.crm-registry-table .uk-table` rule in tables.css) because:
- `back-office.html` uses `.crm-registry-table` but has no colgroup
- `agents.html`, `archive.html`, `trust-management.html` use all-`min-width:` colgroups which are ignored by `table-layout: fixed`
- `requests.html` has no table `min-width` floor

### subjects.css Page-Specific Rule

Retained as-is. No shared component rule was added, so the existing `body[data-page="subjects"] .crm-subjects-table .uk-table { table-layout: fixed; width: 100%; }` remains the sole owner for subjects.

### Files Changed

| File | Change |
|---|---|
| `assets/css/pages/compliance.css` | Added `table-layout: fixed; width: 100%` to existing `.crm-compliance-table .uk-table` rule |
| `assets/css/pages/brokerage.css` | Added new `.crm-brokerage-table .uk-table` rule with `min-width: 1140px; table-layout: fixed; width: 100%` |
| `assets/css/pages/trading.css` | Added new `.crm-trading-table .uk-table` rule with `table-layout: fixed; width: 100%` (min-width: 1380px already present) |
| `assets/css/crm-static.bundle.css` | Regenerated (auto-generated) |

### Validator

Not enhanced — deferred as low-value. Adding a guard that checks every `.crm-registry-table` page has a `table-layout: fixed` rule would require parsing CSS selector coverage across files, which is brittle and likely to produce false positives on the deferred tables.

### Bundle Results

```
npm run static:uikit:bundle
  ✓ Bundle written → static-uikit/assets/css/crm-static.bundle.css
  Sections inlined : 42 / 42
  Output size      : 243.9 KB

npm run static:uikit:bundle:check
  ✓ Bundle is up to date (42 / 42 sections, 243.9 KB)

npm run static:uikit:validate
  Errors   : 0
  Warnings : 0
  ✓ Validation passed.
```

---

## Deferred Items

- ~~agents.html, trust-management.html~~ — completed in follow-up commit.
- ~~archive.html~~ — completed in follow-up commit.
- ~~requests.html~~ — completed in follow-up commit.
- ~~back-office.html~~ — completed in follow-up commit.
- `hyphens: auto` is effective only when the page has a `lang` attribute set correctly (e.g. `lang="ru"`). If HTML pages lack `lang`, hyphens won't trigger; `overflow-wrap: anywhere` is the primary break mechanism and works regardless.
- No `title` attributes were added to table cells; the task instructs not to mass-edit HTML only for titles.

---

## Remaining Registry Tables Fixed-Layout Completion Notes

**Date:** 2026-05-20

### Pages Audited

| Page | Classification | Outcome |
|---|---|---|
| agents.html | Registry/list — `.crm-registry-table` + `.crm-agents-table` + colgroup | ✅ Hardened |
| archive.html | Registry/list — `.crm-registry-table` + `.crm-archive-table` + colgroup | ✅ Hardened |
| trust-management.html | Registry/list — `.crm-registry-table` + `.crm-trust-management-table` + colgroup | ✅ Hardened |
| requests.html | Registry/list — `.crm-registry-table` + `.crm-requests-table` + colgroup | ✅ Hardened |
| back-office.html | Registry/list — `.crm-registry-table` + `.crm-back-office-table`, 2 cols, no prior colgroup | ✅ Hardened |
| middle-office-clients.html | Registry-like list — `.crm-table-card` + `.crm-table-wrapper`, colgroup with all `width:` | ✅ Hardened |

### Colgroup Changes (min-width → width)

`table-layout: fixed` ignores `min-width` on `<col>` — only `width` is used for column sizing.

| Page | Column(s) converted |
|---|---|
| agents.html | col1 `min-width:220px` → `width:220px`; col2 `min-width:180px` → `width:180px` |
| archive.html | col1 `min-width:260px` → `width:260px`; col3 `min-width:220px` → `width:220px`; col5 `min-width:190px` → `width:190px` |
| trust-management.html | col1 `min-width:220px` → `width:220px`; col2 `min-width:180px` → `width:180px` |
| requests.html | col2 `min-width:240px` → `width:240px`; col6 `min-width:180px` → `width:180px` |
| back-office.html | Added `<colgroup>` with `<col style="width:280px"/>` + `<col style="width:140px"/>` (total 420px = existing min-width) |

### Table Min-Width Floors

| Page | Source of min-width |
|---|---|
| agents.html | 1040px via `components/registry.css` comma group — no change needed |
| archive.html | 1100px via `pages/archive.css` — no change needed |
| trust-management.html | 1040px via `components/registry.css` comma group — no change needed |
| requests.html | 1040px via `components/registry.css` comma group — no change needed |
| back-office.html | 420px via `pages/back-office.css` — no change needed |
| middle-office-clients.html | `min-width: 1240px` on `.crm-table` div + `min-width: 1460px` added on `.uk-table` (= column sum) |

### Fixed-Layout Rules Added

| CSS file | Rule added |
|---|---|
| `pages/agents.css` | `.crm-page[data-page="agents"] .crm-agents-table .uk-table { table-layout: fixed; width: 100%; }` |
| `pages/archive.css` | `.crm-page[data-page="archive"] .crm-archive-table .uk-table { table-layout: fixed; width: 100%; }` |
| `pages/trust-management.css` | `.crm-page[data-page="trust-management"] .crm-trust-management-table .uk-table { table-layout: fixed; width: 100%; }` |
| `pages/requests.css` | `.crm-page[data-page="requests"] .crm-requests-table .uk-table { table-layout: fixed; width: 100%; }` |
| `pages/back-office.css` | `.crm-page[data-page="back-office"] .crm-back-office-table .uk-table { table-layout: fixed; width: 100%; }` |
| `pages/middle-office.css` | `body[data-page="middle-office-clients"] .crm-table-wrapper .uk-table { min-width: 1460px; table-layout: fixed; width: 100%; }` |

### Middle-Office-Clients Decision

Classified as a registry-like list page and hardened. It does not use `.crm-registry-table` class but follows the same visual pattern (`.crm-card.crm-table-card` + `.crm-table-wrapper` + `.crm-table` + `table.uk-table`). All colgroup columns already used `style="width:Xpx"` — no HTML changes needed. The page's `.crm-table-wrapper` already has `overflow-x: auto` from middle-office.css. No `crm-row-main` is used, so content in cells wraps rather than ellipsis, but columns are capped at declared widths and cannot push layout.

### Pages Not Hardened (Detail/Card Embedded Tables)

- `subject-card.html` document/relation/history tab tables — detail embedded, no colgroup, excluded
- `compliance-card.html` embedded tables — detail view, excluded

### Bundle Results

```
npm run static:uikit:bundle
  ✓ Bundle written → static-uikit/assets/css/crm-static.bundle.css
  Sections inlined : 42 / 42
  Output size      : 244.6 KB

npm run static:uikit:bundle:check
  ✓ Bundle is up to date (42 / 42 sections, 244.6 KB)

npm run static:uikit:validate
  Errors   : 0
  Warnings : 0
  ✓ Validation passed.
```

### Remaining Deferred Items

None. All registry/list tables across the static-uikit area now have `table-layout: fixed` protection with explicit `width:` colgroup values. Detail/card embedded tables are intentionally excluded.
