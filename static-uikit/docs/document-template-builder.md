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

## Continuation lines

One logical field, one source value, several explicitly mapped regions the
value flows through in order. This is how a long address reaches an approved
second line instead of being shrunk.

Select a text field and use the **Строки продолжения** section:

| Action | What it creates |
| --- | --- |
| `Добавить строку продолжения` | a text-only region, for a place the form already prints a rule or leaves an empty cell |
| `Добавить полноценную строку продолжения` | the Word-like version: a baseline **and** its own visible rule |
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

### Workflow

1. Select the logical field.
2. Press **Добавить расширяемую строку**. The field is marked layout-expandable
   and a starting definition appears.
3. Set the insertion anchor — where the row opens.
4. Set the movable block: `Подвижный блок: от` … `до`. Everything below `до`
   stays fixed, which is how a page with a footer keeps its footer.
5. Set the bottom reserve — the measured free space under the lowest movable
   content. It is the most the block may travel.
6. Set the maximum number of rows this field may insert.
7. Choose `Строка с подчёркиванием` or `Пустая строка таблицы`.
8. Press **Взять толщину соседней линии** to copy the weight of a printed rule
   nearby, then adjust the row's baseline and rule offsets.
9. Read the shift preview: the inspector reports the movement at zero, one and
   the maximum row count against the reserve.
10. Look at the page. The canvas draws the insertion anchor, the end of the
    movable block, and one preview rectangle per row that could open.
11. Tick **Правило проверено визуально**.

Until step 11, `reviewStatus` stays `suggested` and production export is
blocked.

### What blocks export

* the movable block is undefined or empty;
* the maximum expansion exceeds the declared reserve;
* the movable block runs past the page bottom;
* a required number is missing — nothing is inferred at runtime;
* the inserted row's width or rule thickness is missing;
* the rule has not been visually reviewed.

An inserted row that would overlap another field on the page is reported as a
warning, since that field may itself be moving.

### Finding a workable anchor

A page can only be split where no drawing block crosses the line.
`static-uikit/tools/qa/check_expansion_anchors.py --suggest` asks the
production expander to try every declared anchor and scans nearby for the
closest one that works. Run it after moving an anchor; six anchors were dropped
during this work because their pages had no clean cut within ±30 pt.

### Round trip

Expansion definitions survive builder JSON and production JS export unchanged,
alongside flow regions, overflow strategy, sizes, line height, maximum lines and
print-override permission. All 18 maps still round-trip semantically and no
property is silently discarded.

### Migrating an existing map

1. Open it; imported minimums below 9 pt are reported immediately.
2. Raise the minimum to 9 and re-check the preferred size against the row.
   `static-uikit/tools/qa/measure_field_room.py` reports the real room.
3. Where the value can be longer than the slot, add continuation regions.
4. Keep existing safe fallbacks; add one where a shorter rendering is legally
   equivalent.
5. Run the profiles again and confirm the field reports `flow` rather than
   `overflow`.

Known source-layout limitations across the 18 production maps are recorded in
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
wizard controls, fixtures, QA state, and replacement review. Builder-only field
geometry/review properties are omitted from production output.

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

The 18 evaluated maps contain 621 fields. Before this builder, seven fields used
inline functions: contract number/date prefixes in three refusal documents and
the final year digit in `code-word-request`. They were migrated without behavior
change to named renderer formatters `prefixNumber`, `prefixFrom`, and
`dateYearLastDigit`.

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
`tools/document-template-builder-qa.html`. It runs the 34 builder checks against
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
