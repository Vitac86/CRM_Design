# UMI P0 Handoff Checklist

## Before integration
- [ ] Confirm final UMI.CMS template syntax.
- [ ] Confirm asset web-root paths.
- [ ] Confirm P0 routes.
- [ ] Confirm status dictionary mapping.
- [ ] Confirm permissions model.
- [ ] Confirm forms submit strategy.
- [ ] Confirm GET filters strategy.
- [ ] Confirm placeholders `{{ ... }}` replacement plan.
- [ ] Confirm error page fallback behavior.
- [ ] Confirm row-click routes for card pages.

## Files to transfer first
- [ ] layout/base.html
- [ ] partials/sidebar.html
- [ ] partials/topbar.html
- [ ] partials/page-header.html

## First P0 pages
- [ ] pages/dashboard.html
- [ ] pages/subjects.html
- [ ] pages/subject-card.html
- [ ] pages/requests.html
- [ ] pages/compliance.html
- [ ] pages/compliance-card.html
- [ ] pages/trading.html
- [ ] pages/error.html

## Validation
- [ ] Run `node static-uikit/tools/validate-static-uikit.mjs`
- [ ] Run `npm run build`
- [ ] Check no external network dependencies
- [ ] Check standalone pages still open


## Static extraction contract
- [ ] Confirm runtime=false/buildStep=false (extraction only).
- [ ] Confirm templates are server-rendered/static-template-first (no JS data rendering).
- [ ] Confirm only local assets are used.
- [ ] Confirm page-specific scripts are included only on matching templates (subject-card only when needed).
- [ ] Confirm selectable controls render checked + .is-active/.is-selected consistently server-side.
