# cards.css ownership audit (static-uikit)

Scope: `static-uikit/assets/css/components/cards.css` (migration-era monolith) with cross-check against current component/layout/page CSS ownership.

## Ownership map for current `components/cards.css`

| Selector/group (in cards.css) | Current responsibility | Proposed owner file | Risk level | Recommended action |
|---|---|---|---|---|
| `.crm-card`, `.crm-section`, `.crm-toolbar`, shared surface radius/shadow/padding | Generic card/surface primitives reused across pages | `assets/css/components/cards.css` | Low | Keep in place; treat as the long-term minimal core for cards.css. |
| `.crm-page-header*`, `.crm-page-actions`, `.crm-header-actions`, page shell responsive padding | Page header/actions and shell-level layout helpers | `assets/css/layout/page.css` | Medium | Incrementally move in follow-up PRs after usage inventory on standalone + UMI templates. |
| `.crm-filter-panel` duplicates | Shared filter container primitive | `assets/css/components/filters.css` | Medium | Do not move now; deduplicate with existing filter ownership in a narrow PR. |
| `.uk-input`, `.uk-select`, `.uk-textarea`, `.uk-form-label`, `.uk-radio`, select/date decoration, `.crm-form-grid`, `.crm-input`, `.crm-select` | Shared form control visuals and states | `assets/css/components/forms.css` | High | Move only in small validated batches; watch for cascade/focus regressions. |
| `.uk-button`, `.uk-button-default`, `.crm-button`, `.crm-button-primary`, `.crm-button-ghost`, `.crm-link-action`, disabled/focus button states | Shared button/link action primitives | `assets/css/components/buttons.css` | High | Keep frozen in this PR; later migrate by variant group with visual snapshots. |
| `.crm-table`, `.crm-table-wrapper`, `.uk-table` th/td/divider/hover/nowrap rules, scrollbar-gutter | Shared registry table shell + table behaviors | `assets/css/components/tables.css` | High | Follow table ownership after explicit audit; preserve colgroup behavior unchanged. |
| `.crm-tabs` and active tab item styles | Shared tabs component wrapper | `assets/css/components/tabs.css` | Low | Candidate for early safe extraction in a dedicated PR. |
| `.crm-inline-badges` | Inline badge layout utility | `assets/css/components/badges.css` (or keep in cards until badge utility pass) | Medium | Optional follow-up with badge maintainers; no semantic color changes. |
| `.crm-grid-2`, `.crm-split-view`, `.crm-sticky-actions`, `.crm-footer-actions` | Shared content/grid/action layout utilities | `assets/css/layout/page.css` (or page-specific file when narrow use) | Medium | Inventory consumers first; then move utility-by-utility. |
| Global scrollbar selectors (`*::-webkit-scrollbar*`) | Global UI chrome rules, not card-specific | `assets/css/layout/app.css` | Medium | Evaluate separately; move only if global layering is confirmed safe. |
| Sidebar/nav/topbar responsive selectors (`.crm-layout`, `.crm-sidebar*`, `.crm-topbar`, `.crm-nav*`, `[data-sidebar-toggle]`) | Navigation/layout responsive behavior | `assets/css/layout/sidebar.css` and/or `assets/css/layout/topbar.css` | High | Requires coordination with layout CSS import order; defer to dedicated layout PR. |
| Dashboard KPI/selectors (`.crm-kpi-*`, `.crm-dashboard-card`) | Dashboard-only KPI/card presentation | `assets/css/pages/dashboard.css` | Medium | Gradually move after confirming no cross-page reuse. |
| Register/option/binary/selectable controls (`.crm-option-*`, `.crm-binary-control`, `.crm-check-row`, `.crm-radio-tile`, `.crm-register-*`) | Register/wizard form patterns and selectable controls | `assets/css/pages/subject-register.css` and shared `assets/css/components/forms.css` | High | Split by ownership: page-specific structure vs shared selectable control primitives. |
| Detail/report selectors (`.crm-detail-header`, `.crm-decision-panel`, `.crm-action-row`, `.crm-report-*`) | Detail card/report page-specific styles | `assets/css/pages/compliance-card.css`, `assets/css/pages/trading-card.css`, `assets/css/pages/subject-card.css` (by usage) | Medium | Map per-page usage first; then move page by page. |
| `.crm-error-state`, `.crm-error-card` | Error page styling | `assets/css/pages/error.css` (or keep under page-specific owner) | Low | Move with an error-page cleanup PR. |
| Print/mobile blocks (`@media print`, mobile overrides for detail/report/option grid) | Cross-cutting responsive/print behavior mixed with page/layout rules | Mixed: `layout/page.css`, layout files, and page files | High | Decompose last, after base ownership moves stabilize. |

## Proposed decomposition order (safe, incremental)
1. Freeze `components/cards.css` to generic card surfaces only for new work.
2. Move low-risk isolated groups first (`.crm-tabs`, clearly dashboard-only KPI blocks).
3. Move layout-owned shell/header/sidebar rules next with import-order checks.
4. Move forms/buttons/tables in narrow PR slices with validator + build + visual smoke checks.
5. Move page-specific detail/register/report rules last, page-by-page.
6. Final pass: keep `components/cards.css` as minimal shared card primitives only.

## Non-goals for this audit PR
- No selector migration in bulk.
- No visual redesign.
- No JS/runtime behavior changes.
