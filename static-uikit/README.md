# Static UIKit Handoff

## Scope
- `static-uikit/` is the handoff target.
- `static-uikit/INDEX.html` is the launcher for the standalone prototype pages.
- React/Vite is not the source of truth for this static handoff.
- `administration.html` is placeholder / developer-owned.

## Final handoff package
- `INDEX.html`
- `README.md`
- `pages/`
- `assets/`

## Not included in final handoff
- UMI/P0/P1 packs
- `partials/`
- `HANDOFF_MANIFEST.json`
- stale validation tools
- React/Vite source files
- `src/`
- `public/`
- `package.json`
- `vite.config.*`

## How to open
From the repo root:

```bash
python -m http.server 8080
```

Open:

```text
http://localhost:8080/static-uikit/INDEX.html
```

From `static-uikit/`:

```bash
python -m http.server 8080
```

Open:

```text
http://localhost:8080/INDEX.html
```

Open the project via uppercase `INDEX.html`. Do not assume lowercase `index.html` works on case-sensitive servers.

No `npm run build` is required for the static handoff.

## Folder structure
- `INDEX.html` - launcher.
- `pages/` - standalone HTML prototype pages.
- `assets/css/` - UIkit, `crm-static.css`, components, pages, responsive, and print styles.
- `assets/js/` - UIkit, `crm-static.js`, and page scripts when explicitly linked.
- `assets/brand/`, `assets/icons/`, `assets/fonts/` - required static assets.

## Runtime scripts
Global scripts:

- `assets/js/uikit.min.js`
- `assets/js/uikit-icons.min.js`
- `assets/js/crm-static.js`

Current explicit page-specific script includes:

- `contract-edit.html` -> `assets/js/pages/contract-edit.js`
- `middle-office-clients.html` -> `assets/js/pages/middle-office.js`
- `middle-office-reports.html` -> `assets/js/pages/middle-office.js`
- `subject-card.html` -> `assets/js/pages/subject-card.js`
- `subject-edit.html` -> `assets/js/pages/subject-edit.js`
- `subject-edit-individual.html` -> `assets/js/pages/subject-edit.js`
- `subject-register.html` -> `assets/js/pages/subject-register.js`
- `trading-card.html` -> `assets/js/pages/trading-card.js`

Treat page-specific scripts as active only when the matching HTML file explicitly links them.

## Page inventory
Core / auth:

- `dashboard.html`
- `login.html`
- `register.html`

Subjects / contracts:

- `subjects.html`
- `subject-card.html`
- `subject-register.html`
- `subject-edit.html`
- `subject-edit-individual.html`
- `contract-wizard.html`
- `contract-edit.html`

Compliance:

- `compliance.html`
- `compliance-card.html`

Trading / brokerage / trust:

- `brokerage.html`
- `trading.html`
- `trading-card.html`
- `trust-management.html`

Operations:

- `agents.html`
- `requests.html`
- `middle-office-clients.html`
- `middle-office-reports.html`
- `depository.html`
- `back-office.html`
- `archive.html`

System:

- `administration.html` - placeholder / developer-owned.
- `error.html` - static fallback/prototype page.

## Known limitations
- Static sample data only.
- Prototype JavaScript only; not backend or business logic.
- Tables intentionally use horizontal scroll on mobile.
- Some pages may have explicit page CSS links in addition to `crm-static.css` imports; do not remove unless visually checked.
