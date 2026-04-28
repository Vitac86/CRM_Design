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
- `assets/js/pages/subject-card.js` — page-only behavior для `subject-card` и подключается только там, где реально нужен.
- Subject-card данные (профиль/адреса/представители) остаются server-rendered/static-template-first: JS их не генерирует.

