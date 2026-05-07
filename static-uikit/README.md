# Static UIKit Handoff

## Scope
- `static-uikit/` is the final handoff package.
- `static-uikit/INDEX.html` is the launcher for the standalone prototype pages.
- This package is static HTML5 + UIkit page markup. It is **not** a ready-made UMI.CMS template pack.
- UMI.CMS developers will later split static pages into templates, includes, layouts, loops, and data bindings.
- React/Vite source files are **not** the source of truth for this handoff.
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
- stale validation tools (`tools/validate-static-uikit.mjs`)
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

```
http://localhost:8080/static-uikit/INDEX.html
```

From `static-uikit/`:

```bash
python -m http.server 8080
```

Open:

```
http://localhost:8080/INDEX.html
```

Open via uppercase `INDEX.html`. Do not assume lowercase `index.html` works on case-sensitive servers.

No `npm run build` is required for the static handoff.

## Folder structure
- `INDEX.html` — launcher.
- `pages/` — standalone HTML prototype pages.
- `assets/css/` — UIkit, `crm-static.css`, components, pages, responsive, and print styles.
- `assets/js/` — UIkit, `crm-static.js`, and page scripts when explicitly linked.
- `assets/brand/`, `assets/icons/`, `assets/fonts/` — required static assets.

## Runtime scripts
Global scripts:

- `assets/js/uikit.min.js`
- `assets/js/uikit-icons.min.js`
- `assets/js/crm-static.js`

Page-specific scripts (active only when the matching HTML file explicitly links them):

- `contract-edit.html` → `assets/js/pages/contract-edit.js`
- `document-wizard.html` → `assets/js/pages/document-wizard.js`
- `middle-office-clients.html` → `assets/js/pages/middle-office.js`
- `middle-office-reports.html` → `assets/js/pages/middle-office.js`
- `subject-card.html` → `assets/js/pages/subject-card.js`
- `subject-edit.html` → `assets/js/pages/subject-edit.js`
- `subject-edit-individual.html` → `assets/js/pages/subject-edit.js`
- `subject-register.html` → `assets/js/pages/subject-register.js`
- `trading-card.html` → `assets/js/pages/trading-card.js`

## Page-specific CSS
`crm-static.css` already bundles most page CSS via `@import`. The files below are **not** included in `crm-static.css` and are loaded only when their matching page explicitly links them:

- `login.html`, `register.html`, `forgot-password.html` → `assets/css/pages/auth.css`
- `agents.html` → `assets/css/pages/agents.css`
- `depository.html` → `assets/css/pages/depository.css`

Avoid adding direct page CSS links when the file is already bundled by `crm-static.css`, unless a visual check confirms a deliberate cascade exception.

## Page inventory
Auth:

- `login.html`
- `register.html`
- `forgot-password.html`

Core:

- `dashboard.html`

Subjects / contracts:

- `subjects.html`
- `subject-card.html`
- `subject-card-individual.html`
- `subject-register.html`
- `subject-edit.html`
- `subject-edit-individual.html`
- `document-wizard.html`
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
- `back-office.html` — counterparties registry (Бэк-офис module); inline INN lookup for adding new counterparties from an external source.
- `archive.html`

System:

- `administration.html` — placeholder / developer-owned.
- `search-results.html` — full-page global search results.
- `error.html` — static fallback/prototype page.

## Global search
- The header includes a live search preview (client-side, UIkit dropdown).
- `search-results.html` is the full search results page layout.
- UMI.CMS should replace client-side search with server-side search and route to this template.

## Static filters
All list-page filters (subjects, compliance, trading, etc.) are **client-side demo behavior only**. No server requests are made; JavaScript hides/shows table rows in the browser.

### Markup contract

| Element | Attribute | Purpose |
|---|---|---|
| Filter control (input, hidden) | `data-filter="<name>"` | Stable filter key; used to match against row attributes. |
| Custom dropdown option | `data-filter-option` + `data-filter-value="<value>"` | Selectable option inside a `.crm-filter-menu`. |
| Table row | `data-filter-<name>="<value>"` | The value the filter key is matched against. |
| Reset button | `data-action="reset-filters"` | Clears all filter controls and restores full row visibility. |

`data-filter` names and `data-filter-*` row attributes are the stable UI hooks that connect controls to data.

### UMI.CMS integration
Replace client-side filter logic with server-side filtering and pagination. The `data-filter` attribute names on controls and the `data-filter-*` attributes on rows can be preserved as semantic hints, but the JS row-hiding behavior should be superseded by server-rendered result sets.

## Document templates

Print-ready HTML templates for client-facing documents live in `assets/document-templates/`.

| Template file | Document |
|---|---|
| `zayavlenie-o-prisoedinenii-fl.html` | Заявление о присоединении (для физических лиц) |
| `anketa-fl.html` | Анкета ФЛ |
| `anketa-yul.html` | Анкета ЮЛ |
| `qualification-request-fl.html` | Заявление о признании ФЛ квалифицированным инвестором |
| `qualification-request-yul.html` | Заявление о признании ЮЛ квалифицированным инвестором |
| `qualification-notice.html` | Уведомление о признании лица квалифицированным инвестором |
| `account-opening-notice.html` | Уведомление об открытии брокерского-депозитарного счета |
| `code-word-request.html` | Заявление об установлении/замене кодового слова |

Document template styles are intentionally externalized from the HTML files and live in `assets/css/document-templates/`:

| CSS file | Purpose |
|---|---|
| `document-template-base.css` | Shared document styles: A4 layout, field/checkbox primitives, page-break helpers, print rules |
| `document-template-forms.css` | Shared questionnaire/request/notice styles for the Document Wizard templates |
| `zayavlenie-o-prisoedinenii-fl.css` | Statement-specific styles: header, clauses, market table, signature block |

The document template font stack is `Arial, Helvetica, sans-serif` for cross-platform stability. No proprietary font files are included and no `@font-face` declarations are used. Times New Roman is not used as a primary font. UMI.CMS/backend can pin or replace fonts server-side if exact legal print fidelity requires a specific typeface.

Document template CSS must remain external. Do not add inline `style` attributes to new document templates.

### Contract statement export

The "Выгрузить заявление" button is exposed in both `contract-wizard.html` and `contract-edit.html`.

In the static handoff, this action fetches the existing HTML template, fills it via `DOMParser`, opens the filled print-ready document in a new tab, and automatically invokes the browser print dialog. The user should select **Save as PDF** in the print dialog. External stylesheet `href` values are resolved to absolute URLs before the document is written to the blank window so styles load correctly, and the print dialog is delayed until stylesheets have loaded. It does not use html2pdf, html2canvas, or any rasterization library.

Direct high-quality PDF download should be implemented by UMI.CMS/backend using a server-side renderer such as headless Chrome, Puppeteer, wkhtmltopdf, or an equivalent tool. `html2pdf` / `html2canvas` intentionally is not used for this legal statement because it rasterizes the document, producing heavier PDFs without a reliable selectable text layer. The `data-doc-field` and `data-doc-check` attributes on the template elements serve as stable data-binding hooks for the backend renderer.

### Document Wizard

`pages/document-wizard.html` is a static demo wizard for additional client documents. The normal entry point is the subject card → Documents tab → "Открыть Document Wizard". The wizard reads `?subject=<id>`, shows the selected demo subject summary, links back to the correct subject card, and filters documents by subject kind:

- company subjects see ЮЛ-only forms plus shared notices/requests;
- individual subjects see ФЛ-only forms plus shared notices/requests.

The wizard includes:

- Анкета ФЛ
- Анкета ЮЛ
- Заявление о признании ФЛ квалифицированным инвестором
- Заявление о признании ЮЛ квалифицированным инвестором
- Уведомление о признании лица квалифицированным инвестором
- Уведомление об открытии брокерского-депозитарного счета
- Заявление об установлении/замене кодового слова

It explicitly excludes "Заявление о присоединении": that document remains part of the contract flow only (`contract-wizard.html` / `contract-edit.html`) through the existing "Выгрузить заявление" button.

The Document Wizard output is HTML plus the browser print dialog. It does not use html2pdf, jsPDF, html2canvas, or rasterization. `assets/js/pages/document-wizard.js` resolves relative stylesheet URLs in fetched templates to absolute URLs before writing the filled document to a blank tab, waits for stylesheets to load with a timeout fallback, then invokes `print()`.

The wizard uses static demo subject data and client-side field binding only. Future UMI.CMS integration should replace this with backend subject data binding and, if needed, server-side PDF rendering.

## Client-side demo pagination
Registry list pages (subjects, requests, compliance, trading, agents, etc.) include client-side demo pagination driven by `crm-static.js`.

- Page-size chips (25 / 50 / 100) slice visible tbody rows to the selected window.
- Prev / Next buttons navigate between pages; the page indicator updates to show `N из M`.
- Filtering and search narrow the row set first; pagination then slices within that filtered result.
- Sorting reorders all non-filtered rows and resets to page 1.

**This is static preview only.** UMI.CMS integration must replace this with server-side pagination, filtering, and search for real datasets.

Stable HTML hooks used by the pagination engine:

| Element | Hook | Purpose |
|---|---|---|
| Page-size container | `data-page-size-group` | Groups the 25 / 50 / 100 chips |
| Page-size chip | `data-page-size-value="N"` + `.crm-footer-chip` | Chip value and active-state class |
| Page indicator span | text matching `N из N` | Updated by JS to reflect current/total pages |
| Prev button | `aria-label` containing "Предыдущая" | Tagged by JS with `data-pagination-nav="prev"` |
| Next button | `aria-label` containing "Следующая" | Tagged by JS with `data-pagination-nav="next"` |

CSS classes written by JS (safe to style or remove in UMI.CMS):

| Class | Applied to | Meaning |
|---|---|---|
| `.is-filter-hidden` | `<tr>` | Row hidden by an active filter/search |
| `.is-page-hidden` | `<tr>` | Row hidden because it falls outside the current page window |

## Client-side CSV export

Registry list pages (subjects, archive, requests, compliance, brokerage, trading, trust-management, agents, middle-office-clients, etc.) include a client-side CSV export triggered by buttons with `data-action="export-table-csv"`.

- Export collects the currently visible rows only — respects active filters, search, and pagination state.
- Delimiter is `;` (semicolon) for Russian Excel compatibility. File starts with UTF-8 BOM.
- Columns marked `data-export-ignore` on their `<th>` (e.g. "Действия") are excluded from the output.

**This is static demo behavior only.** UMI.CMS integration must replace this with server-side CSV export for real datasets and full filtered result sets (not just the current page window).

Stable HTML hooks used by the CSV export engine:

| Element | Hook | Purpose |
|---|---|---|
| Export button | `data-action="export-table-csv"` | Triggers CSV export for the nearest registry table |
| Export button | `data-export-filename="name.csv"` | Output filename; falls back to `<body data-page>.csv` |
| Export button | `data-export-scope="nearest"` | Documents that nearest-scope table detection is used |
| Column header `<th>` | `data-export-ignore` | Excludes that column (and its cells) from the CSV |

## FIAS-assisted address input

Pages `subject-edit-individual.html` and `subject-register.html` include FIAS-assisted structured address input for Russian-resident individual clients.

**How it works (static demo):**
- `assets/js/pages/fias-address.js` — shared module; initialises every `[data-fias-address-widget]` block on the page with isolated per-widget state.
- `fias.html` — standalone FIAS prototype (reference/demo, kept for handoff context).
- Three address blocks per form: registration (primary), actual/residential, postal/correspondence.
- Actual and postal default to "Совпадает с адресом регистрации" (hidden, mirroring registration values). Unchecking reveals an independent FIAS widget.
- Cascading reset: changing region, division type, or any parent level clears all dependent levels.
- If FIAS API is unavailable, a non-blocking fallback banner is shown and manual text fields are revealed.
- Non-resident and UL flows do not use FIAS widgets; non-resident FL shows simple manual address fields.

**Security / integration note:**
- `MASTER_TOKEN = "pass"` in `fias-address.js` is a static demo placeholder only. Do not use it in production.
- UMI.CMS / backend must provide secure server-side FIAS API access (token, proxy, or integration). The token should never be embedded in client-side JS in production.
- Page-specific CSS for FIAS widgets is in `assets/css/pages/subject-edit.css` and `assets/css/pages/subject-register.css`.

## Known limitations
- Static sample data only.
- Prototype JavaScript only; not backend or business logic.
- Tables intentionally use horizontal scroll on mobile.
- No pages carry redundant direct page CSS links; all page-specific CSS is loaded via `crm-static.css` except for the intentional exceptions listed in "Page-specific CSS" above.
