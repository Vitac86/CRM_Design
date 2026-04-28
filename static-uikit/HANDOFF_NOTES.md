# HTML5/UIkit Handoff Notes

## What is included
- Standalone HTML demo pages in `static-uikit/pages/`
- Reusable HTML fragments in `static-uikit/partials/`
- UMI P0 extraction pack in `static-uikit/umi-p0/`
- UMI P1 extraction pack in `static-uikit/umi-p1/`
- Local UIkit, CSS, JS and fonts assets
- Static validator

## What is not included
- React runtime
- Vite build for `static-uikit`
- CDN assets
- Google Fonts
- External APIs
- Analytics
- SPA router
- fetch/XHR/WebSocket/localStorage/sessionStorage logic

## Before handoff
Run:

```bash
node static-uikit/tools/validate-static-uikit.mjs
npm run build
```

## Local review

From repository root:

```bash
python -m http.server 8080
```

Open:

```text
http://localhost:8080/static-uikit/pages/dashboard.html
```

## Notes for UMI.CMS integration

- Treat `pages/*.html` as visual/reference standalone pages.
- Treat `partials/` as reusable source fragments.
- Treat `umi-p0/` and `umi-p1/` as extraction packs, not runtime.
- Replace placeholders like `{{ ... }}` with project-specific UMI.CMS template syntax.
- Keep assets local.
- `assets/js/crm-static.js` должен оставаться global-only (layout/navigation/forms/tabs behavior).
- Reusable form controls (`.crm-option-card`, `.crm-binary-control`, `.crm-radio-tile`, `.crm-check-row`) также принадлежат `crm-static.js` и только синхронизируют `.is-selected`/`.is-active` с native input checked state.
- `assets/js/pages/subject-card.js` — page-only behavior для `subject-card` и подключается только там, где реально нужен.
- Любой новый page-specific скрипт размещается только в `assets/js/pages/<page>.js`, защищается page guard и не используется для data rendering.
- UMI template должен подключать page-specific script только для своего matching page template (без глобального include на весь pack).
- Subject-card данные (профиль/адреса/представители) остаются server-rendered/static-template-first: JS их не генерирует.
- Карта ownership по standalone страницам и page scripts: `static-uikit/PAGE_SCRIPT_AUDIT.md`.
- Для UMI P0/P1 шаблонов сервер должен рендерить `checked` и соответствующие `.is-selected`/`.is-active` консистентно; `crm-static.js` после этого поддерживает только синхронизацию при взаимодействии пользователя.


## UMI extraction pack contract
- `umi-p0/` and `umi-p1/` are extraction packs only (not runtime).
- Server renders page data and selected/active control states (static-template-first).
- `assets/js/crm-static.js` stays global-only; it does not render data.
- Page script includes are template-specific; `assets/js/pages/subject-card.js` is only for subject-card when representative/address interactions are present.
- Selectable controls (`.crm-option-card`, `.crm-binary-control`, `.crm-radio-tile`, `.crm-check-row`) must be emitted with consistent `checked` + `.is-selected`/`.is-active`.

## Registry/list-page pattern
- Registry/list pages are kept `server-rendered/static-template-first`: demo rows and hooks are static HTML skeletons for UMI.CMS rendering.
- Canonical registry shape: page header/title hook, registry filter panel, `crm-table-wrapper -> crm-table -> table.uk-table`, and `crm-empty-state[data-entity="empty-state"]`.
- Keep registry table wrappers overflow-safe: horizontal scrolling belongs to `.crm-table-wrapper` only, not to the full page canvas.
- Keep empty states inside the registry shell/card but outside table markup (`table/thead/tbody/tr`) and hidden in demo mode via native `hidden`.
- `crm-static.js` stays global-only and reusable (row `data-href`, reset helpers, non-submitting behavior), with no page runtime rendering; UMI templates render registry rows server-side.

## Non-registry page contracts (card/detail/wizard/admin)
- Audited pages: `subject-register.html`, `contract-wizard.html`, `compliance-card.html`, `trading-card.html`, `administration.html`.
- Require `body[data-page]` == `section.crm-page[data-page]` and `h1[data-entity="page-title"]`.
- Wizard step groups (`.crm-wizard-steps`) must expose `aria-label` and exactly one current step (`aria-current="step"` or `data-status="current"`).
- Forms based on `.crm-register-card` / `.crm-contract-wizard-form` must include `.crm-form-section` with heading (`h2/h3` or `.crm-form-section-head`).
- Sticky/footer action containers must keep explicit button `type`; non-submit actions (export/download/view/open/print/resend/restore) must use `type="button"`.
- Keep `crm-static.js` global-only; no runtime rendering/data hydration. Selectable controls are server-rendered with consistent `checked` + `.is-selected`/`.is-active`.
- See `CARD_DETAIL_PAGE_AUDIT.md` for per-page mapping and follow-up notes.
