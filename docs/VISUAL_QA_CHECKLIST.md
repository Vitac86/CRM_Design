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

## Open manual-review findings — NOT visually accepted

Recorded 2026-08-03. These were found by manual visual review and are **not**
fixed. Nothing in this repository may describe them as accepted, and the
automated suite does not currently catch them: every suite below is green while
these defects are on the page, which is exactly why they are written down here.

### `qualification-notice` — recipient block escapes its column

Screenshots `qualification-notice__ru-company-normal__ordinary__p1` and
`__ru-company-long__realistic-long__p1`.

* «Кому:» and «Адрес:» are right-aligned near x 760, but a value that needs a
  second line starts its continuation at the **far left page margin**, so the
  address reads as two unrelated blocks. Visible even in the ordinary fixture:
  `ул. Тверская, д. 14, кв. 38` sits alone at the left margin.
* In the body sentence «ООО «Инвестика» настоящим уведомляет, что …» a
  horizontal rule crosses the middle of the organization name, and the
  qualification date `29.07.2026` is struck through by the rule belonging to
  its own field.
* The `(Ф.И.О./ наименование организации)` caption detaches from the field it
  labels once the name wraps.

Required: treat the recipient name, the recipient address, the body
organization name, the date and the instrument section as five separate
reviewed blocks; grow the recipient block downward instead of wrapping to the
page margin; keep every rule clear of glyphs.

### Individual questionnaires — row ownership

`anketa-fl-simplified-id` and `anketa-ip-sz`, and any full individual
questionnaire sharing the same table machinery. Manual review reports values
crossing into the following row (full name into birth date, bank address into
the bank-INN row, registration place into OKVED), values crossing horizontal
borders, and duplicated address components.

Required: an owning row per field, measured original row boundaries, growth of
the owning row with every lower row and border moved by the same delta, and one
shared page/table expansion budget.

### Why the suite is green anyway

The geometry suites ask whether a value is inside the box its map names. They
do not ask whether that box is the right box, whether a continuation region
belongs to the same visual block as its label, or whether a printed rule passes
through a glyph. Closing these findings means adding those questions, not only
moving coordinates.
