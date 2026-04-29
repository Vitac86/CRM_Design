# Filter/select pattern audit (static-uikit)

## Shared registry pattern (current baseline)
- Canonical registry filter structure is: `form.crm-registry-filters.crm-filter-panel` + one `.crm-filter-search-row` + one `.crm-filter-fields-row`.
- Shared reusable primitives live in `assets/css/components/filters.css` (`.crm-filter-panel`, `.crm-filter-search-row`, `.crm-filter-fields-row`, `.crm-filter-control`, `.crm-filter-field`, `.crm-filter-actions`, `.crm-filter-reset`).

## Subjects compact variant (page-scoped for now)
- `pages/subjects.html` uses compact pill-style controls: `.crm-filter-pill-control`, `.crm-filter-pill`, `.crm-filter-pill-label`, `.crm-filter-pill-select`.
- Subjects-only compact behavior/visuals are intentionally scoped in `assets/css/pages/subjects.css`.

## Deferred follow-ups
- Align page CSS that still styles registry filters outside shared component contract.
- Decide whether `.crm-filter-pill*` becomes a generic cross-page primitive or remains page-specific.
- Normalize legacy registry pages to reduce page-level filter overrides incrementally (no broad redesign).
