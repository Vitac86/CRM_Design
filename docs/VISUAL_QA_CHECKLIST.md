# VISUAL QA Checklist (Layout / Responsive Hardening)

## 1) Desktop 1440px
- [ ] Sidebar is visible and fixed on the left.
- [ ] Topbar is sticky and stays visible while scrolling page content.
- [ ] Tables scroll only inside table wrappers (page itself does not horizontally scroll).
- [ ] Dashboard / Subjects / Requests / card pages render without layout regressions.

## 2) Laptop 1280px
- [ ] Desktop sidebar remains visible.
- [ ] Topbar and main content alignment stay stable.
- [ ] Filter rows and header controls remain aligned and do not overlap.

## 3) Tablet 1024px
- [ ] Navigation switches to drawer mode.
- [ ] Content uses full width without reserved left sidebar space.
- [ ] No uncontrolled horizontal overflow on main pages.

## 4) Tablet/Mobile 768px
- [ ] Menu button is visible in topbar.
- [ ] Sidebar opens as drawer and overlay appears.
- [ ] Overlay click closes drawer.
- [ ] Escape closes drawer.
- [ ] Navigation click closes drawer.
- [ ] Filter controls wrap to multiple rows.

## 5) Mobile 390px
- [ ] No page-level horizontal scroll on body/root.
- [ ] Topbar content does not overflow.
- [ ] Modals keep content within viewport and scroll vertically when needed.
- [ ] Table horizontal scrolling happens only inside table containers.

## 6) Critical routes
- [ ] `/dashboard`
- [ ] `/subjects`
- [ ] `/subjects/:id`
- [ ] `/subjects/register`
- [ ] `/requests`
- [ ] `/compliance`
- [ ] `/compliance/:id`
- [ ] `/middle-office`
- [ ] `/middle-office/clients`
- [ ] `/middle-office/reports`
- [ ] `/depository`
- [ ] `/trading`
- [ ] `/trading/:id`
- [ ] `/documents`
- [ ] `/agents`
- [ ] `/administration`
- [ ] `/archives`

## Notes
- Visual QA remains a manual step and must be executed for all viewport groups above.
- If a route has a complex data table or modal flow, verify both empty and filled states.
