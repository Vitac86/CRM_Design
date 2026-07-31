# Browser-only PDF template builder

`tools/document-template-builder.html` is a developer tool for placing dynamic
text and checkbox overlays on a prepared PDF. It does not edit legal/static PDF
content and is not linked from the production CRM navigation.

## Start safely

The builder requires HTTP because PDF.js workers, `fetch()`, fonts, and committed
PDFs are origin-scoped browser resources. Opening it with `file://` shows:

> Конструктор должен быть открыт через локальный HTTP-сервер.

Run `static-uikit/start-template-builder.cmd`. The launcher:

- asks Windows for an available loopback port;
- starts `python -m http.server` bound only to `127.0.0.1`;
- records the exact PID, URL, port, and stop command under `%TEMP%`;
- opens `/tools/document-template-builder.html`;
- never terminates an existing Python, Chrome, console, or other process.

Before stopping a server from a saved launch record, verify that the PID still
belongs to the expected loopback `http.server` command. This prevents a stale
record from stopping an unrelated process after Windows reuses a PID:

```powershell
$builderServerPid = <recorded-pid>
$builderPort = <recorded-port>
$builderRoot = 'P:\Kolosov\CRM_Design\static-uikit'
$server = Get-CimInstance Win32_Process -Filter "ProcessId = $builderServerPid"
$expected = "-m http.server $builderPort --bind 127.0.0.1 --directory $builderRoot"
if (-not $server -or $server.Name -notlike 'python*.exe' -or $server.CommandLine -notlike "*$expected*") {
  throw 'The recorded PID is not the expected Template Builder server.'
}
Stop-Process -Id $builderServerPid
```

The launcher and its record never execute a stop command automatically; they do
not terminate by image name and do not consume old PID records.

The local HTTP process serves committed files only. There is no upload endpoint,
telemetry, analytics, CDN, external font, external API, or backend PDF service.

## Existing-template workflow

1. Choose a document from **Existing templates**. The list is derived from the
   frozen read-only production wizard catalog and the actual loaded field maps.
2. The builder loads the committed PDF, all fields, fonts, wizard controls,
   applicability, page count, and metadata automatically.
3. Select a field on the canvas or in the field list, edit it, and run validation.
4. Generate the real PDF and inspect it visually before exporting review files.

All 18 production overlay maps are available. `anketa-isbyul` remains hidden,
and static `transfer-requisites` is not exposed.

Template coverage is closed by `tools/qa/check_full_template_audit.py`. The
checked-in JSON/Markdown matrices cover all 22 PDFs and 77 pages, preserve the
621 original field ID/source pairs as a compatibility floor, and require every
additive runtime field to receive a section and layout classification. The same
gate refuses source-PDF byte or SHA-256 changes.

Existing production identifiers are deliberately read-only. The template ID,
every imported field ID and source path, and every imported wizard-control key
keep the values used by the production forms. The inspector shows the reason:

> Идентификатор существующей переменной используется production-формами и не может быть изменён.

New fields and controls remain editable. Once a new field is referenced by a
Word-flow block its ID is also locked until that reference is removed; its
source path stays editable because it is not part of the imported compatibility
floor. Import, undo/redo, direct state mutation, and every export path enforce
the same rule rather than relying only on disabled inputs.

## New-template workflow

1. Click **Новый шаблон**.
2. Set the ASCII template ID, title, description, category, ФЛ/ЮЛ applicability,
   expected page count, and output filename.
3. Click **Выбрать PDF для нового шаблона** and select a clean PDF.
4. Draw and configure overlays, create their wizard providers, run all fixtures,
   and inspect a production-rendered PDF.

The PDF stays in memory through a Blob URL. The exported project records its
filename and SHA-256, not the PDF bytes.

## Canvas and field editing

Available tools are selection, panning, text, multiline text, checkbox, and
static overlay text. Drag to create. Select a field to move it, resize from its
corner, or move the red baseline handle independently. PDF points are the source
of truth; canvas pixels are only a zoomed display.

The inspector exposes `left`, `top`, `width`, `height`, `baselineTop`, and
`baselineShift`. Production export uses `baselineTop`; it never guesses a
baseline from the visual rectangle.

Keyboard shortcuts:

- `Ctrl+Z`, `Ctrl+Shift+Z`, `Ctrl+Y` — undo/redo;
- arrows — 0.25 pt nudge;
- `Shift+arrow` — 1 pt nudge;
- `Alt+arrow` — keyboard resize (with Shift for 1 pt);
- `Ctrl+C`, `Ctrl+V` — duplicate a field with a stable new ID;
- `Delete` — remove selected field;
- `Escape` — cancel drawing and return to selection.

Shortcuts are ignored while an input, textarea, select, or editable element is
active. Fields can be locked, duplicated, deleted, moved to another page, and
have their outlines hidden temporarily.

## Precision helpers

Snapping uses page edges/centres, existing field edges and baselines, and PDF.js
text-content geometry (including reliable checkbox glyph text where present).
Snapping is optional and never creates or classifies fields automatically.
The toolbar shows zoom-aware cursor coordinates; millimetres can be displayed in
addition to the authoritative points. The compact page list records each page's
actual point dimensions, including mixed portrait/landscape PDFs.

## Sources and wizard controls

The inspector contains a searchable, categorized source tree and always shows
the technical path. Supported namespaces are `subject.*`, `field.*`, `extra.*`,
and `check.*`. Advanced raw paths remain possible but are validated.

Selecting an `extra.*` or `check.*` source shows its wizard provider, usage
count, and pages. Missing providers can be created. Controls support text,
textarea, date, number, select, radio, checkbox, required state, placeholder,
help, options, default, applicability, `showWhen`, mutual-exclusion group,
multiple selection, and documented workflow-only inputs. Displayed unused
controls or missing required providers block production export.

Conditions are declarative only: truthy, false, equals one value, or equals one
of several values. Arbitrary JavaScript cannot be entered.

## Checkboxes

Checkboxes expose source, `equals`, `invert`, page, `left`, `baselineTop`, glyph
and box sizes, mark style, offsets, thickness, and inset. Builder annotations can
group them as independent, mutually exclusive, conditional, or explanatory.
Explanatory squares are retained in the project but omitted from the production
map. Fast preview reflects selected/unselected payload state; the real PDF uses
the production checkbox renderer.

## Typography, formatters, and overflow

The committed Liberation Serif regular, bold, and italic fonts are available.
Starting/minimum size, alignment, multiline behavior, lines, line height,
maximum height, and baseline shift use point values with quarter-point controls.

The formatter selector is populated from the production renderer, including
Russian date parts/month names, initials, surname, uppercase, trim,
`prefixNumber`, `prefixFrom`, and `dateYearLastDigit`. Fallbacks are ordered and
can be moved up/down. No arbitrary formatter code or generic truncation exists.

Fit analysis calls the production entry point,
`CRMDocumentEngine.overlayRenderer.layoutField()`, with the same embedded fonts
production uses. The builder does not have its own layout: what you see here is
what the generated PDF will contain. Results distinguish normal, shrink,
multiline, flow, fallback, overflow, missing required value, and unsupported
glyph. Actual font character sets are checked; errors include the character and
Unicode code point.

### Readable size policy

Dynamic text at 7 pt is not acceptably readable on a printed form, so the
builder enforces the same two numbers production does:

* **preferred size 12 pt** — the default for every new text field;
* **minimum size 9 pt** — a hard floor.

A new text field is created at 12 pt / 9 pt with a line height that suits 12 pt
text, and wraps automatically when the region you drew is tall enough for more
than one line. Wrapping onto another line is always preferable to shrinking.

You cannot save a production minimum below 9 pt. Importing an older map that
has one reports

```
Минимальный размер ниже допустимых 9 pt
```

and blocks production export until it is corrected. The floor applies only to
text the engine draws — static legal text already printed in the base PDF is
untouched.

## Word-flow blocks

Use a Word-flow block when a source paragraph contains interleaved legal text,
filled values, spaces, and paragraph structure that must reflow as one unit.
This is different from a continuation line: a continuation line distributes
one field value across independent form rows, while a Word-flow block lays out
an ordered run stream inside one reviewed rectangular frame.

Choose **Создать Word-подобный блок заполнения** in the left panel, then edit:

- the page and frame (`left`, `baselineTop`, `width`, initial line count);
- source font, locked size/minimum, leading, paragraph spacing, alignment,
  justification threshold, first-line indent, and hanging indent;
- static-text, existing-field-reference, space, line-break, paragraph-break,
  and spacer runs, including bold/italic/underline decoration where applicable;
- optional reviewed expansion, its page budget, anchors, compaction zones, and
  cross-page settings;
- the reviewed source replacement range, expected block/page counts, source
  SHA-256, template SHA-256, and the original static text.

A field-reference run selects an existing business field ID; it does not create
a replacement source variable. The Builder marks that field with
`layoutMode: 'flow-reference'` and the block's `flowBlockId`, so the value is
rendered only in the run stream and cannot also appear as an independent
overlay. Removing or moving the run synchronizes those markers. Validation
rejects missing or duplicated references, cross-block ownership, an independent
double render, an unlocked source font size, unreviewed source ranges, stale
hashes, and expansion rules that exceed the page budget.

The canvas shows the block frame and its referenced fields; the inspector can
jump between either side of the relationship. Run all synthetic profiles and
inspect the generated PDF before approving the replacement and expansion
metadata. Source text and hashes are evidence, not editable shortcuts around
the committed PDF.

## Continuation lines

One logical field, one source value, several explicitly mapped regions the
value flows through in order. This is how a long address reaches an approved
second line instead of being shrunk.

Select a text field and use the **Строки продолжения** section:

| Action | What it creates |
| --- | --- |
| `Добавить строку продолжения` | a text-only region, for a place the form already prints a rule or leaves an empty cell |
| `Добавить полноценную строку продолжения` | a form-row version: a baseline **and** its own visible rule (not paragraph Word flow) |
| `Добавить строку ниже` | a pure geometry suggestion — the next likely baseline, computed from the line height |

Regions are listed in flow order as `Строка 1 · основная`, `Строка 2`, … Each
one can be moved up or down, deleted, or edited by exact coordinates (page,
left, baseline, width, lines, maximum size). Deleting a continuation never
deletes the logical field. Selecting the field highlights all of its regions on
the page and shows the value distributed across them exactly as the production
engine assigned it.

The text baseline and the rule are edited separately: `Линия: left`, `длина`,
`top`, `толщина` and `отступ от baseline`. A new full line copies the weight of
the nearest printed underline as its starting value, so it begins already
matching the form.

### Nothing unreviewed reaches a client

A generated line is created with `reviewStatus: 'suggested'` and **production
export stays blocked** until you open the page, check the position at high zoom
and tick `Подтверждена визуально`. Validation reports it as
`flow-region-unreviewed` until then. Replacing the base PDF marks every flow
region for review again.

Validation also checks that every region is inside its page, has a positive
width, has leading sufficient for its font size, has a size cap at or above the
floor, does not overlap another region of the same field, and does not cross a
neighbouring dynamic field.

### Rules, not underscores

The rule is drawn as ordinary PDF vector page content. Never draw underscores
as text characters, never use repeated `_` glyphs to imitate a rule, and never
create a line at generation time that nobody has approved. The intended result
is a document that looks as though the continuation line had been added to the
Word form before it was exported.

Use this priority when a value does not fit:

1. an existing printed line in the authoritative PDF;
2. an existing blank table row or approved empty cell;
3. an explicitly mapped and visually approved generated continuation line;
4. a field-specific overflow — only when none of the above is possible.

## Page-section expansion

A continuation line needs somewhere to go. When the form has no blank line but
the page has vertical reserve, the document can grow the row instead: content
below an anchor moves down and a real row opens. There is still one
authoritative PDF — nothing is duplicated on disk, and the variation exists
only in the generated file.

Only a few fields should ever be expandable: company names, addresses, and an
issuing authority where ordinary values prove the need. Identifiers, dates and
citizenship are expected to fit through correct mapping and the 9 pt minimum.
Check the mapping first — `static-uikit/tools/qa/measure_slot_widths.py`
compares every field against the printed blank it sits in.

### The budget belongs to the page, not to the field

A page has one amount of room. **Запас страницы** states it once and every
anchor on that page shares it, in top-to-bottom order, so capacity one anchor
does not use is left to the ones below it:

| Control | What it is |
| --- | --- |
| Фиксированная шапка до | nothing above this ever moves |
| Низ подвижного текста | the lowest movable content, measured |
| Фиксированный колонтитул от | the page number. It never moves. |
| Подвижный блок: до | the bottom of the movable band; it may not reach the footer |
| Просвет до колонтитула | the white space kept between the two |
| Зона уплотнения | a reviewed gap between two **complete** blocks, and the smallest it may become |

```
запас = (колонтитул − просвет − низ текста) + Σ (просвет − минимум)
```

`static-uikit/tools/qa/measure_page_layout.py --doc <id>` produces every one of
those numbers from the committed PDF, including finding the fixed footer, the
blank bands between complete blocks and the page's own line pitch. Take them
from it rather than from the canvas.

A page's own top margin is a compaction zone whose upper block is the sheet
edge. Compaction is applied lazily: a document that expands by nothing never
compacts anything.

### Reviewed cross-page flow

When bottom reserve and approved compaction still cannot fund the active rows,
**Перенос полного блока на следующую страницу** can transfer one complete
balanced source block to the immediately following page. The page inspector
edits the same production properties: source band and first content top,
retained source-body bottom, target page and insertion top, target movable band,
exact/max target shift, one-page cascade limit, review note and approval.

The canvas marks the fixed header/footer plus the transfer's source band and
shows the target page number. This is a reviewed operator-level transformation,
not text re-entry: the original block is removed from its source content stream
once and inserted on the target once. The Builder does not infer bands or offer
automatic legal-text reflow.

### Workflow

1. Measure the page: `measure_page_layout.py --doc <id>` for the reserve and the
   block gaps, `--row <id> <page> <baseline> [left width]` for the row geometry.
2. Select the logical field.
3. Press **Добавить расширяемую строку**. The field is marked layout-expandable
   and a starting definition appears.
4. Set the insertion anchor — where the row opens.
5. In **Запас страницы**, press **Задать запас страницы** if the page has none
   yet, and enter the measured numbers. Add a compaction zone only where a real
   gap separates two complete blocks, and tick its own review box.
6. Set the row height to the one the form uses — *not* a standard 14 pt — and
   the maximum row size to the size the form itself is set in.
7. Set the maximum number of rows this field may insert.
8. Choose `Строка с подчёркиванием` or `Пустая строка таблицы`.
9. Press **Взять толщину соседней линии** to copy the weight of a printed rule
   nearby, then set the row's baseline and rule offsets from the measurement.
10. Read the previews: the movement at zero, one and the maximum row count
    against the page budget, how much of that budget comes from recovered white
    space, and what the other anchors on the page have already spoken for.
11. Look at the page. The canvas draws the insertion anchor, the end of the
    movable block, and one preview rectangle per row that could open.
12. Tick **Правило проверено визуально**.

Until step 12, `reviewStatus` stays `suggested` and production export is
blocked.

### What blocks export

Of the page budget:

* `bodyBottom` or `shiftToTop` missing;
* the movable body overlapping the fixed footer;
* the movable block reaching the fixed footer — a page number must not move;
* the movable block running past the page bottom;
* a compaction zone with no minimum, an impossible one, or one nobody has
  looked at;
* a page whose budget cannot pay for even one row of an anchor it lists;
* an anchor listed that does not exist, has no expansion, or expands another
  page.

Of a cross-page rule:

* any source, retained-body, target-band, insertion or shift number missing;
* a target other than the immediately following page;
* a target band outside that page or an insertion outside the band;
* a requested shift above its declared maximum;
* a cascade depth other than one;
* missing review note or approval.

Of the anchor:

* a required number missing — nothing is inferred at runtime;
* a `bottomReserve` of its own beside a page budget — the reserve of a page is
  stated once;
* the field not listed in that page's anchors;
* an insertion point above the fixed header, or rows that would reach the
  fixed footer;
* the inserted row's width or rule thickness missing;
* the rule not visually reviewed;
* a minimum font size below 9 pt anywhere in the document.

An inserted row that would overlap another field on the page is reported as a
warning, since that field may itself be moving; so is a compaction zone below
the first insertion point, which the planner will not use.

### Finding a workable anchor

A page can only be split where no drawing block crosses the line.
`static-uikit/tools/qa/check_expansion_anchors.py --suggest` asks the
production expander to try every declared anchor **and every compaction zone**,
and scans nearby for the closest cut that works. Run it after moving either.

Two things to know before concluding that a page has no clean cut:

* probe against the **real movable band**, not the page's content bottom. A band
  that ends where the content ends cuts the trailing block in half, and then
  every candidate straddles. Two anchors were wrongly rejected that way.
* a clean cut in the wrong place is still no. Three candidates were refused
  because the only available cut separates a label from what it labels — a date
  rule from its own caption, a client's name from «следующее кодовое слово:»,
  «выдан» from the blank it introduces.

### Round trip

Expansion definitions and the page budget survive builder JSON and production JS
export unchanged, alongside flow regions, overflow strategy, sizes, line height,
maximum lines and print-override permission. `pageLayout` is a first-class
project property, not an opaque passenger in `productionProperties`. All 18 maps
still round-trip semantically, budget and anchors included, and no property is
silently discarded. The three production `crossPageFlow` rules also round-trip
exactly; editing one to incomplete or unreviewed blocks export.

### Migrating an existing map

1. Open it; imported minimums below 9 pt are reported immediately.
2. Raise the minimum to 9 and re-check the preferred size against the row.
   `static-uikit/tools/qa/measure_field_room.py` reports the real room.
3. Bound every multiline cell with the height `measure_field_room.py` reports
   for it. A cell with no bound is unbounded, and a long value runs through
   whatever the form prints below it.
4. Where the value can be longer than the slot, add continuation regions.
5. Keep existing safe fallbacks; add one where a shorter rendering is legally
   equivalent.
6. Where the page needs inserted rows, give it a page budget rather than a
   reserve per field; the builder will refuse the second one.
7. Run the profiles again and confirm the field reports `flow` rather than
   `overflow`.

The release overflow classification and remaining non-blocking stress cases
across the 18 production maps are recorded in
[docs/document-text-layout-audit.md](../../docs/document-text-layout-audit.md).

## Test profiles and payload editor

Thirteen committed synthetic profiles cover:

- short/normal/long Russian resident individuals;
- normal/long Russian legal entities;
- normal/long English nonresident individuals;
- normal/long foreign legal entities;
- mixed Russian/English data;
- missing optional values;
- maximum checkbox selections;
- minimum required values.

Examples include apostrophes, hyphenated names, `№ AB-7789`, long Russian and
English names, authorities, addresses, companies, IDs, accounts, agreements,
and emails. Only Russian and English are supported. The searchable payload editor
updates fast preview, fit analysis, and final preview. Overrides are not
autosaved. Fixture import accepts only JSON explicitly marked `synthetic: true`.

## Real PDF preview and batch validation

The canvas overlay is labelled as a positioning preview. **Сформировать тестовый
PDF** calls the exact production overlay renderer, which uses the production
text fitter, checkbox renderer, fonts, overflow errors, and top-left baseline
conversion. Output is a Blob URL with unchanged page count, no appended page,
no AcroForm fields, and no widgets. Previous Blob URLs are revoked.

**Запустить все тестовые профили** produces a field/profile matrix. Selecting a
cell switches profile, page, and field. Structural errors and warnings are
separate and cover IDs, page counts/dimensions, bounds, fonts, formatters,
sources/providers, duplicate positions, conditions/groups, filenames/URLs,
forms/widgets, replacement review, and QA state.

## Replacing a base PDF

**Заменить базовый PDF** calculates the new SHA-256, compares page count,
dimensions, and extracted text, retains old overlay coordinates, marks every
field for review, re-renders the file, and immediately revalidates. The summary
records old/new hashes, changed pages, fields inside/outside bounds, and pages
requiring review. Out-of-bounds fields and unreviewed replacement geometry block
production export. Automatic text-anchor transfer is intentionally deferred.

## Project schema, drafts, import, and export

Schema version 1 is mandatory. Unsupported newer schemas fail safely. Unknown
properties are retained and reported. Executable JavaScript is rejected; there
is no `eval` or `new Function`. Future migrations pass through
`project-schema.js:migrate()`.

The project contains metadata, template URL/hash/page geometry, fonts, fields,
first-class `wordFlowBlocks`, wizard controls, fixtures, QA state, and
replacement review. Word-flow runs, typography, frame, spacing, expansion, and
source-replacement metadata survive Builder JSON and production-map round trips.
Referenced fields retain `layoutMode` and `flowBlockId`; unrelated Builder-only
field geometry/review properties are omitted from production output. Import
migrates an older opaque `productionProperties.wordFlowBlocks` value into the
first-class collection without changing its data.

**Сохранить черновик** writes only project JSON to `localStorage`, keyed by
template ID, after an overwrite warning. Payload overrides and generated PDFs
are not persisted. **Очистить черновик** removes that key.

Exports are downloaded for review and never written into the repository:

1. `<id>.builder.json`;
2. `<id>.js` production field map;
3. `<id>.registry.json`;
4. `<id>.fixtures.json`;
5. `<id>.qa-report.json`;
6. generated test PDF.

Property ordering, indentation, field order, final newline, and assigned IDs are
deterministic. Production JS contains no timestamp or executable formatter.
Only Approved/Published projects export without a warning.

QA states are Draft, Mapped, Automatic validation passed, Visual review passed,
Approved, and Published. Automatic validation never marks visual review passed.

## Declarative compatibility audit

The immutable compatibility floor across the 18 evaluated maps contains 621
field ID/source pairs; classified additive fields may raise the current total.
Before this builder, seven fields used inline functions: contract number/date
prefixes in three refusal documents and the final year digit in
`code-word-request`. They were migrated without behavior change to named
renderer formatters `prefixNumber`, `prefixFrom`, and `dateYearLastDigit`.

After migration, all 18 maps contain only JSON-compatible primitives, arrays,
and plain objects. No inline condition functions, computed map values without a
source path, custom prototypes, cycles, or unsupported objects remain. The
browser QA harness performs a semantic map → builder → map round-trip for every
document and verifies deterministic output.

If a future map introduces a function or custom object, import labels it
`Пользовательское правило — только чтение` and production export remains blocked
until the behavior is replaced or explicitly preserved outside this schema.

## QA

Serve the directory and open
`tools/document-template-builder-qa.html`. It runs the 68 builder checks against
the actual PDF.js worker and production renderer. Also run the established
document harness and the repository structural validation before integration.

### Add a new production document

1. Prepare a clean PDF.
2. Open the builder.
3. Create fields.
4. Assign sources.
5. Configure wizard inputs.
6. Run all fixtures.
7. Inspect a real generated PDF.
8. Export files.
9. Review the Git diff.
10. Add production registration.
11. Run the full document regression.
12. Approve and commit.

### Modify an existing document

1. Open the committed template from the catalog.
2. Export a builder project as a review backup.
3. If the base changed, use **Заменить базовый PDF** and review every field.
4. Adjust fields, baselines, sources, wizard controls, and conditions.
5. Run all 13 profiles and inspect failures.
6. Generate and visually inspect the real PDF.
7. Mark visual review explicitly; set Approved only after review.
8. Export the map/project/registry/fixtures/QA report.
9. Review the Git diff; never mass-normalize unchanged maps.
10. Run all production document and structural regressions.

## Known limitations

OCR, automatic classification of all lines/squares, automatic coordinate
transfer across heavily changed PDFs, direct repository/Git writes, collaborative
editing, ZIP output, DOCX editing, languages beyond Russian/English, and
server-side storage are intentionally out of scope. Browser support targets
modern desktop Chrome, Edge, Firefox, and Safari; the tool is desktop-oriented.
