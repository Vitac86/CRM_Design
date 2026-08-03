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

## Filter layout regression checks

Проверить на 1440 / 1280 / 1024 / 768 / 390px:
- [ ] `/requests`
- [ ] `/subjects`
- [ ] `/compliance`
- [ ] `/middle-office/clients`
- [ ] `/middle-office/reports`
- [ ] `/depository`
- [ ] `/trading`
- [ ] `/documents`
- [ ] `/brokerage`
- [ ] `/trust-management`
- [ ] `/archives`
- [ ] `/agents`

Критерии:
- [ ] select/input filters не растягиваются на всю ширину на desktop.
- [ ] filter card не становится чрезмерно высокой.
- [ ] reset/export buttons не перекрывают поля.
- [ ] mobile layout переносится в одну колонку без горизонтального overflow.

## Table controls and labels consistency

Проверить:
- [ ] поиск расположен сверху панели.
- [ ] фильтры расположены ниже поиска.
- [ ] actions справа или корректно перенесены при переносе строк.
- [ ] на desktop select filters остаются compact (не растягиваются на всю ширину панели).
- [ ] на mobile filters stack без horizontal overflow.
- [ ] тип клиента отображается одинаково во всех таблицах.
- [ ] вид договора отображается одинаково.
- [ ] резидентство отображается одинаково.
- [ ] статусы отображаются одинаково.

Маршруты для проверки:
- [ ] `/subjects`
- [ ] `/requests`
- [ ] `/compliance`
- [ ] `/middle-office/clients`
- [ ] `/middle-office/reports`
- [ ] `/depository`
- [ ] `/trading`
- [ ] `/documents`
- [ ] `/brokerage`
- [ ] `/trust-management`
- [ ] `/archives`
- [ ] `/agents`

## Document correction review — implementation complete, manual approval pending

Recorded 2026-08-03. The previously open document findings are implemented and
have dedicated fail-closed automated checks. They are **not yet manually
accepted**: the remaining release action is to inspect the synthetic
`static-uikit/manual-smoke/manual-findings-fix` review pack at high zoom and
sign off the items below. The completed pack covers 6 affected documents and
24 scenarios: 24 PDFs, 24 fixture JSON files, 73 full-page PNGs and 84 block
close-ups. Its automated pack gates report zero failures; all 115 manual
checklist items remain deliberately unchecked. `review.json` SHA-256 is
`a530978bf2cf59a59a5b96a131f9b90d1a424701c9fcdd28a217fa938fec33bb`
— rebuilding the pack twice from the same tree reproduces that byte exactly,
so the fingerprint identifies the pack a reviewer is looking at.
A green automated run does not mark these boxes.

### Account-opening notice and depository agreement pair

- [ ] Page 1 prints «Козырева Александра Юрьевича» exactly; the former
  `Юрьвеича` spelling is absent and no surrounding text moved.
- [ ] The depository agreement number and date shown in both accession forms
  and the account-opening notice match the two requested operator values.
- [ ] Page 2 item 2 «Основание для перевода» reads as one sentence with the
  number and date; item 3 remains present once; no empty source sentence is
  visible behind the replacement.
- [ ] The number/date inputs start empty, have no current-date default, survive
  Back/reselection for the same document, and do not leak to another document.

No printable depository agreement number/date exists in UMI. These are
required workflow inputs only for `accession-application-fl`,
`accession-application-yul`, and `account-opening-notice`; that limitation is
intentional and must remain visible during review.

### `qualification-notice`

- [ ] Short and long recipient names stay in the reviewed right-hand column;
  every continuation begins at the same hanging indent.
- [ ] Russian and foreign formatted registration addresses appear exactly once
  and remain attached to «Адрес:».
- [ ] The body organization name, its caption, the recognition wording, and the
  date remain in reading order when the name wraps.
- [ ] Underlines sit below glyphs and travel with their owning block; none
  strikes through the organization name or date.
- [ ] The `other` instrument branch has enough reviewed underlined lines and
  the unused source rule is absent only in that branch.

Review short, long-name, Russian-address, foreign-address, combined-long,
body/date, and long-`other` scenarios separately.

### Four questionnaires — physical table ownership

- [ ] `anketa-fl-simplified-id`, `anketa-ip-sz`, `anketa-fl`, and `anketa-yul`
  keep every rendered value inside its declared owning row/cell.
- [ ] Full name, registration/address, bank, licence/authority, and free-text
  stress cases do not enter the next row or cross a horizontal/vertical rule.
- [ ] When an owning row grows, every lower row and each declared table border
  moves by the same delta; vertical borders continue through the inserted row.
- [ ] A formatted address or other one-logical-value group is rendered once;
  no duplicated address components remain.
- [ ] The review metadata identifies the field/source, owner row/cell, line
  count, expansion count, cumulative shift, font size, and render fingerprint.

The renderer and Template Builder now reject missing/unreviewed ownership,
wrong field/source links, overlapping cells, ink outside the reviewed cell,
border intersections, discontinuous grown borders, duplicate logical values,
and shared table-budget overruns. Manual approval therefore checks the actual
page appearance, not whether those declarations exist.

### Final gate

- [ ] Run the canonical `python static-uikit/tools/qa/run_all_qa.py` after all
  branch changes are assembled; record its result in the final handoff rather
  than copying a mutable check count into this file.
- [ ] Inspect every affected ordinary and realistic-long close-up in the review
  pack and record manual visual approval.
