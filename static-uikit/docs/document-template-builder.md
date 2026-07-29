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

Fit analysis embeds the same fonts and calls `CRMDocumentEngine.textLayout`.
Results distinguish normal, shrink, multiline, fallback, overflow, missing
required value, and unsupported glyph. Actual font character sets are checked;
errors include the character and Unicode code point.

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
