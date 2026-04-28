# Standalone HTML5/UIkit QA Checklist

## Local run
- [ ] Run `node static-uikit/tools/validate-static-uikit.mjs`
- [ ] Run `npm run build`
- [ ] Start `python -m http.server 8080`
- [ ] Open `http://localhost:8080/static-uikit/pages/dashboard.html`

## Pages
- [ ] All 20 standalone pages open
- [ ] Sidebar/topbar present on every page
- [ ] No broken local links (`href`/`data-href`)
- [ ] No external CDN/API/analytics URLs
- [ ] `body[data-page]` matches `section.crm-page[data-page]`
- [ ] Forms do not submit to external URLs
- [ ] Tables are scrollable on mobile
- [ ] Mobile sidebar opens/closes
- [ ] Data hooks (`data-*`) are present for integration

## Handoff
- [ ] Standalone pages are visual reference for UMI.CMS integration
- [ ] UMI packs are extraction packs (not runtime)
- [ ] React/Vite prototype is not modified
