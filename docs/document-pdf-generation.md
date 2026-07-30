# Browser-only document generation

How the Document Wizard turns a client card into a finished, printable PDF that
looks as if somebody opened the original Word form and typed the values onto
its blank lines.

See also: [document-digitization-inventory.md](document-digitization-inventory.md).

## 1. How it works

```
Word .docx  ──[ build time, once, on a developer PC ]──►  clean PDF base template
                                                                │  (committed)
                                                                ▼
 CRM subject data ─► normalised payload ─► field map ─► pdf-lib page.drawText()
                                                                │
                                                                ▼
                                                     finished static PDF (download)
```

At **runtime the browser only**:

1. `fetch()`es the committed PDF base template (a local static asset),
2. `fetch()`es the local Liberation Serif TTF,
3. draws text and checkbox marks onto the existing pages with **pdf-lib**,
4. hands the bytes to the user as a Blob download.

### Why nothing native is required at runtime

The expensive, fragile step — rendering a Word document's layout — is done
**once, at build time**, and its result (the PDF) is committed. What remains at
runtime is only "draw this string at this coordinate", which pdf-lib does in
pure JavaScript.

So the running CRM needs **no** backend PDF service, LibreOffice, Microsoft
Word, Java, Python, Node, Puppeteer, wkhtmltopdf, native executable, DLL,
Linux `.so`, browser extension, Adobe Acrobat, CDN or external conversion
service. There is **no runtime DOCX→PDF conversion**.

Everything loaded is a local static asset:

| Asset | Purpose |
| --- | --- |
| `assets/vendor/pdf-lib.min.js` | PDF read/write |
| `assets/vendor/fontkit.umd.min.js` | TTF embedding + subsetting |
| `assets/fonts/pdf/LiberationSerif-*.ttf` | Cyrillic-capable serif body font |
| `assets/document-pdf-templates/*.pdf` | Word-derived base templates |
| `assets/js/document-engine/*.js` | The renderer |
| `assets/js/document-field-maps/*.js` | Per-document coordinates |

### Supported browsers

Modern desktop **Chrome, Edge, Firefox, Safari**. JavaScript is required.
Internet Explorer is not supported. The engine is ES5-style and uses only
`fetch`, `Promise`, `Blob`, `URL` and `URLSearchParams`.

## 2. Module layout

| File | Responsibility |
| --- | --- |
| `document-engine/pdf-text-layout.js` | measuring, word wrapping, shrink-to-fit, alignment |
| `document-engine/pdf-checkbox-renderer.js` | vector marks inside existing checkboxes |
| `document-engine/pdf-overlay-renderer.js` | orchestration, coordinate conversion, formatters, validation, errors |
| `document-field-maps/<doc-id>.js` | one document's coordinates — **no rendering logic** |
| `pages/document-wizard.js` | wizard UI, payload normalisation, download/upload |

Document-specific coordinates never live in the renderer, and the renderer
never contains a per-document branch.

## 3. Converting a Word file into a base template

On a workstation with Microsoft Word:

```bash
powershell -ExecutionPolicy Bypass -File static-uikit/tools/docx-to-pdf.ps1 \
    -Src "C:\work\ПРИЛОЖЕНИЕ 1А ….docx" \
    -Dst "static-uikit/assets/document-pdf-templates/accession-application-fl.pdf"
```

* Opens the source **read-only**; source files are never modified.
* Exports content only — no markup, no comments, no PDF/A.
* Exports to a local temp file, then moves it into place (Word can block for a
  long time writing straight to a mapped network drive).
* **One document per invocation.** Driving several documents from one
  long-lived Word automation session proved unreliable — Word blocks inside
  `ExportAsFixedFormat` and never returns. A fresh process per file is slower
  but deterministic.

Then verify the result:

* page count matches the Word document,
* `AcroForm` field count is **0**,
* no extra page was appended.

Rules for a base template: original static layout only; **no appended form
page**; no visible blue fields, borders, highlights, labels or helper text; no
example client data baked in; legal wording untouched. Anything that looks like
a typo or an outdated reference goes into the inventory's *Source document
defects* table — it is never silently corrected.

Use stable lowercase ASCII filenames.

## 4. Determining coordinates

**Never estimate coordinates from a font width table.** These forms are
justified, so Word stretches inter-word spacing; an estimated offset drifts by
tens of points across a line — enough to print a passport number on top of the
word beside it. (This exact bug was caught in visual QA and is why the probe
reads real glyph boxes.)

```bash
pip install pymupdf          # developer workstation only
python static-uikit/tools/probe-pdf-coords.py TEMPLATE.pdf --page 0
python static-uikit/tools/probe-pdf-coords.py TEMPLATE.pdf --find "Тарифный план"
```

It reports, with exact positions:

* `blank` — runs of underscores (the fill-in rules), with `left`, `width`, `top`;
* `checkbox` — every checkbox glyph;
* `anchor` — spans matching a search string, including where the span **ends**,
  for values that follow a printed label with no underline.

Copy `left`, `top` (→ `baselineTop`) and `width` straight into the field map.
Re-run the probe whenever a template is regenerated: if Word repaginates, every
coordinate must be re-measured.

### Coordinate system

Field maps are authored **top-left**, because that is how a template is read on
screen and how the probe reports:

| Key | Meaning |
| --- | --- |
| `left` | x of the left edge, in points |
| `baselineTop` | distance from the **top of the page** down to the text **baseline** |

The renderer converts internally: `pdfY = pageHeight - baselineTop`. Anchoring
to the baseline (not a box) is deliberate — it puts text exactly on the printed
rule, which is what "typed on the line" means.

## 5. Field definition schema

```js
{
  id: 'clientFullName',            // used in error messages; must be unique
  source: 'field.clientFullName',  // payload path
  type: 'text',                    // 'text' | 'check' | 'static'
  page: 0,                         // 0-based
  left: 114.0,
  baselineTop: 99.26,
  width: 203.9,
  label: 'Адрес регистрации',      // shown to the manager on an overflow
  font: 'legalSerif',
  fontSize: 12,                    // preferred size — 12 pt unless the form
                                   // physically cannot take it
  minFontSize: 9,                  // hard floor, never below 9
  align: 'left',                   // 'left' | 'center' | 'right'
  multiline: false,
  lineHeight: 13.5,                // fixed leading, in points
  lineHeightRatio: 0.95,           // …or leading as a ratio of the size, for a
                                   // printed cell of fixed height
  maxLines: 2,
  maxHeight: 27,                   // the height of the printed box
  format: 'dateRu',                // optional formatter
  fallbacks: ['surname'],          // shorter renderings to try if too wide
  required: true,                  // fail if empty
  optional: true,                  // suppress "source missing" validation
  baselineShift: 0,                // fine vertical nudge
  tokenBreak: 'anywhere',          // reviewed mid-token split, identifiers only
  allowPrintOverride: false,       // see §12
  overflowStrategy: 'flow',        // 'flow' when flowRegions are declared
  flowRegions: [ /* see below */ ],
  showWhen: {                      // draw only when a condition holds
    source: 'extra.report-delivery',
    equals: 'email'
  }
}
```

### Readable size policy

Dynamic text at 7 pt is not acceptably readable on a printed form, so two
numbers govern every field this engine draws:

| Constant | Value | Meaning |
| --- | --- | --- |
| `MIN_DYNAMIC_FONT_SIZE` | 9 pt | never draw dynamic text below this |
| `PREFERRED_DYNAMIC_FONT_SIZE` | 12 pt | default for a new field |

Both live in `assets/js/document-engine/pdf-text-layout.js` and are the single
source of truth: the renderer's validation rejects a map that configures a
smaller minimum, the layout engine clamps one that slips through, and the
Template Builder refuses to save one.

The floor applies only to text the engine draws. **Static legal text already
embedded in the base PDF is never touched.**

New fields default to 12 pt. Existing fields use 12 pt wherever the form's own
geometry allows it; a smaller preferred size survives only where the row is
physically shorter, and the measurement is recorded next to the value in the
map. No field has a minimum below 9 pt.

### Continuation regions (`flowRegions`)

One logical value may flow through several explicitly mapped regions, so a long
address continues on an approved line instead of shrinking:

```js
{
  id: 'registrationAddress',
  source: 'field.registrationAddress',
  overflowStrategy: 'flow',
  flowRegions: [
    { page: 0, left: 217.7, baselineTop: 138.38, width: 339.9, maxLines: 1 },
    {
      page: 0, left: 56.6, baselineTop: 148.70, width: 501.0, maxLines: 1,
      maxFontSize: 9.5,            // this band cannot hold more
      generated: true,             // no printed rule here — we draw one
      reviewStatus: 'approved',    // and a human has looked at it
      drawUnderline: true, underlineThickness: 0.36, underlineOffset: 1.6
    }
  ]
}
```

Regions are rendered in order. Each one carries its own `page`, `left`,
`baselineTop`, `width` and line capacity, and the widths may differ. Word
distribution is deterministic: the same value always produces the same lines.

A field **without** `flowRegions` keeps working unchanged — its own geometry is
treated as an implicit first region, so no existing map had to be rewritten to
retain its behaviour.

Region properties beyond the geometry above:

| Property | Meaning |
| --- | --- |
| `maxFontSize` | largest size this region can physically hold |
| `lineHeightRatio` | leading as a ratio of the size, for a fixed-height cell |
| `firstLineIndent` | indent applied to the region's first line only |
| `drawUnderline` | draw a rule under the lines that receive text |
| `underlineLeft` / `underlineWidth` / `underlineTop` | explicit rule geometry |
| `underlineThickness` / `underlineOffset` / `underlineColor` | rule appearance |
| `generated` | this line does not exist in the authoritative PDF |
| `reviewStatus` | `'approved'` is required before a generated line may print |

### Word-like continuation lines

Where the authoritative form has no printed rule to continue on, a region may
declare one. Use this order:

1. an existing printed line in the authoritative PDF;
2. an existing blank table row or approved empty cell;
3. an explicitly mapped and visually approved generated continuation line;
4. a field-specific overflow error, only when none of the above is possible.

A generated line is ordinary PDF vector page content — never an AcroForm
control, an annotation, an image, or a run of `_` glyphs. It is drawn only
under the lines that actually receive text, so a short value leaves the form
exactly as printed. Match the weight and the drop of the form's own rules: on
Appendix 1A those were measured at **0.36 pt thick, 1.5 pt below the baseline**
from a 1200 dpi rendering, and those numbers are in the map.

`tools/qa/measure_field_room.py --gaps <doc> <page> <left> <right> <top> <bottom>`
lists the blank bands on a page, which is where a continuation line may go.

### Conditional values (`showWhen`)

Some printed lines belong to one branch of a mutually exclusive choice. In
Appendix 1A the "По электронной почте ______" line must carry the address only
when e-mail delivery is chosen, and stay blank for офис / почта / ЭДО. Express
that with `showWhen`; `equals` may be an array, and omitting it means "draw
when the source is truthy".

Without such a condition the value would print under every option — a defect
that structural checks do not catch and only visual QA reveals.

### Field source paths

| Namespace | Resolves to | Example |
| --- | --- | --- |
| `subject.*` | the client card record | `subject.email` |
| `field.*` | normalised values from `buildFields()` | `field.passportSeries` |
| `extra.*` | wizard inputs, keyed by field `key` | `extra.report-delivery` |
| `check.*` | wizard checkboxes, keyed by `key` | `check.market-stock` |

An unknown namespace or missing key resolves to `undefined`, which validation
reports rather than silently drawing nothing.

### Built-in formatters

`dateRu` (DD.MM.YYYY) · `dateDay` · `monthOnly` · `dateMonthGenitive` ·
`dateYear4` · `dateMonthYearGenitive` ("апреля 2008") · `dateMonthYear` ·
`dateMonthYearShort` (MM.YYYY) · `dateYear2` · `initials` ("Ковалёв Д.О.") ·
`surname` · `upper` · `trim`. A `format` may also be a function.

### Russian document dates

`CRMDocumentEngine.overlayRenderer.ruDateParts(value)` splits a date (ISO or
`DD.MM.YYYY`) into the parts these forms print separately:

```js
ruDateParts('20.04.2008')
// -> { day: '20', monthGenitive: 'апреля', monthNumber: '04', year: '2008' }
```

Russian legal forms read `«__» ________ 20__ г.` and are filled in with the
month **spelled out in the genitive** — "20 апреля 2008", never "20 04.2008".
Use `dateDay` for the quoted slot and `dateMonthYearGenitive` (or
`dateMonthGenitive` + `dateYear4` when the form really does print two separate
rules) for the rest. Returns `null` for an unparseable value, so the slot is
simply left blank.

Month names are long, so measure the slot before mapping and let shrink-to-fit
absorb the difference: in Appendix 1A the 38.24 pt slot renders "мая 2020" at
the full 8.52 pt and the longest name, "сентября 2018", at 6.02 pt.

## 6. Text fitting

`assets/js/document-engine/pdf-text-layout.js` owns this decision completely.
The overlay renderer, the Document Wizard preflight and the Template Builder
all call it; none of them re-implements wrapping.

An extra approved line is always better than smaller text, so for one logical
value the order is:

1. apply the primary `format`;
2. start at the configured preferred size, normally 12 pt;
3. attempt wrapping across **all** approved regions at that size;
4. preserve words and explicit line breaks;
5. if the complete value still does not fit, reduce the size by 0.25 pt;
6. recalculate the **entire** wrapping layout at every size;
7. stop at 9 pt;
8. try each declared legally safe `fallbacks` formatter, repeating the same
   process;
9. only then raise a field-specific overflow error.

Never "shrink first, then try multiline".

The result carries explicit region assignments, and the renderer draws exactly
those:

```js
{
  fits: true, size: 11.5, strategy: 'flow', shrunk: true,
  lines: [
    { regionIndex: 0, page: 0, text: '125009, Россия, г. Москва,' },
    { regionIndex: 1, page: 0, text: 'ул. Тверская, д. 14, кв. 38' }
  ]
}
```

### Wrapping Russian and English

Values wrap on whitespace. Repeated whitespace collapses, explicit newlines
survive, and a value can never start or end with an empty printed line.
Punctuation, apostrophes and hyphens stay with their word, so
`Александров-Смирнов`, `O'Connor` and `Smith-Jones` are kept whole wherever
they fit. A token made only of punctuation is merged into the word before it,
so no line ever holds punctuation alone.

A token wider than its line is handled deterministically, in this order:

1. move it to a wider approved region, if one exists further down;
2. split it at a separator it already contains — a hyphen in a double surname,
   a slash in a contract number, a dot in a domain — keeping the separator on
   the first line;
3. if the field declares `tokenBreak: 'anywhere'`, split at an arbitrary
   character. This is a reviewed decision for machine identifiers, never for
   legal wording;
4. otherwise report that the token itself cannot fit at 9 pt.

There is no dictionary hyphenation, and nothing is ever invented.

Long names, addresses, issuing authorities and contract numbers are **never
silently clipped or truncated**. Empty optional values simply leave the printed
line blank.

## 6a. Preflight

`render()` lays out every visible field — with the fonts actually embedded in
that document — *before* it draws anything. If any value cannot be printed it
throws a `DocumentOverflowError` carrying every diagnostic at once, and no Blob
is produced for a document that cannot be printed.

Each diagnostic carries the document, the user-facing label, the field id, the
length of the value, the minimum size, the number of approved lines available
and the exact reason. The Document Wizard turns that into an actionable panel:
an operator-entered `extra.*` value gets a button back to its input with every
other entered value preserved, while CRM legal or identity data is never
silently altered and the manager is told the map needs widening instead of
being asked to shorten a legal name.

## 7. Checkboxes

Marks are drawn **into the checkbox already present in the base PDF**; the
template's own `☐` is never redrawn, covered or replaced, and surrounding text
never shifts.

```js
check('marketStock', 'check.market-stock', true, 0, 62.1, 471.07)

// mutually exclusive: several definitions share one normalised value
check('depoOwner',   'extra.depo-account-type', 'owner',   0, 56.6, 249.5)
check('depoNominee', 'extra.depo-account-type', 'nominee', 0, 56.6, 260.3)
```

`equals` may be an array, and one CRM value may drive several marks by
repeating definitions. Styles: `check` (default), `cross`, `fill`.

Marks are **vector strokes, not glyphs** — Liberation Serif has no `✓`/`✗`, so a
glyph mark could fall back to a missing-glyph box in some viewers.

Mappings are driven by normalised business values, never by UI element IDs.

## 8. Adding a new document

1. Convert the `.docx` (§3) and commit the PDF under
   `assets/document-pdf-templates/`.
2. Probe coordinates (§4).
3. Create `assets/js/document-field-maps/<doc-id>.js`.
4. Add a `<script>` tag for it in `pages/document-wizard.html`.
5. Add a `DOCUMENTS[]` entry in `pages/document-wizard.js` with
   `overlayTemplateId: '<doc-id>'`, plus only the genuinely missing inputs.
6. Add fixtures and run visual QA (§9).
7. Update the inventory.

Only step 5 makes the document visible to users — do it last.

## 9. Visual QA

```bash
cd static-uikit && python -m http.server 8000
# http://localhost:8000/tools/document-qa-harness.html
```

The harness renders each fixture with the **production engine** and offers the
result for download. Fixtures cover: normal individual, long full name, long
issuing authority, long registration address, missing optional values, all
checkboxes on, all off. All fixture data is obviously fictional; **never commit
generated PDFs containing real personal data.**

For every page of every migrated document, confirm at 100 % zoom:

- [ ] dynamic text looks manually typed into the original form
- [ ] page count unchanged; no page added or lost
- [ ] all static legal text unchanged
- [ ] long values do not overlap other content
- [ ] Cyrillic renders correctly (including `ё`, `№`, `«»`)
- [ ] checkmarks are inside the intended boxes
- [ ] the original blank underline is still visible beneath inserted text
- [ ] no blue fields, borders, focus rectangles, labels or form styling
- [ ] no appended data/confirmation sheet

Test the output in the Chrome/Edge viewer, the Firefox viewer, and Adobe Reader
where available.

### Testing Cyrillic

Cyrillic failure is silent — a wrong font yields blanks or boxes. Check that
`ё`, `№`, `«` and `»` all render, and that extracted text still matches:

```bash
python -c "from pypdf import PdfReader; print(PdfReader('out.pdf').pages[0].extract_text()[:400])"
```

## 10. Validation and error reporting

Before drawing, every template is validated for: duplicate field ids, missing
template file, missing/unknown field sources, invalid page indexes, rectangles
outside the page, unsupported field types, unknown fonts, `minFontSize` greater
than `fontSize`, an unexpected page count (`expectedPages`), **a preferred or
minimum size below the 9 pt readability floor**, and, for every continuation
region: a valid page, a positive width, geometry inside the page, adequate
leading, no duplicate positions, sane underline geometry and — for a generated
line — an `approved` review status.

Problems are logged to the console in full and surfaced in the wizard as a
readable message. Required fields are never silently skipped.

## 11. Upload behaviour

Unchanged and still optional. With no `CRM_DOCUMENT_UPLOAD_ENDPOINT` (or
`data-document-upload-endpoint`) configured, generated documents **stay in the
browser** and are only offered as a download. When an internal endpoint is
configured, files are posted in one multipart request. Nothing is ever sent to
an external service.


## 12. Print overrides

A field map may set `allowPrintOverride: true` to let an operator supply a
different **printed** wording for one generation. Use it only where manual
abbreviation is legally and operationally acceptable.

  - the CRM value is never changed;
  - the override affects only the document being generated, and is dropped when
    another document is selected;
  - it is never enabled by default for names, identifiers, passport numbers,
    tax numbers or any other exact legal value;
  - the wizard labels the input as text used only for printing;
  - the override travels in the generated document payload as
    `payload.printOverrides[fieldId]`;
  - nothing is ever shortened automatically.

Do not add print overrides broadly to paper over a mapping defect. If a value
does not fit, the document map is the thing to fix.

## 13. Migrating an existing map

1. Set `minFontSize` to 9 for every dynamic text field.
2. Measure the row with `tools/qa/measure_field_room.py --maps maps.json` and
   raise `fontSize` to the largest half-point step the room allows, capped at
   12 pt and never below what the document already used in production.
3. Record the measurement in a comment next to any field that cannot reach
   12 pt.
4. Where the value can genuinely be longer than the slot, add continuation
   regions in this order: printed line → blank cell → reviewed generated line.
5. Keep existing safe formatter `fallbacks`; add one where a shorter rendering
   is legally equivalent (a numeric date for a spelled-out month, for example).
6. Decouple `glyphSize` on checkboxes from the body-size constant — a checkbox
   mark is geometry over a printed box, not dynamic text.
7. Re-run `tools/qa/run_document_regression.py` and check the report.

## 14. QA entry points

| Command | What it proves |
| --- | --- |
| `python static-uikit/tools/qa/run_layout_specs.py` | the layout engine, against the real embedded font |
| `python static-uikit/tools/qa/run_document_regression.py` | every map × every RU/EN profile, plus PDF structure |
| `python static-uikit/tools/qa/run_wizard_tests.py` | the Document Wizard end to end |
| `python static-uikit/tools/qa/run_builder_qa.py` | the Template Builder |

There is no Node on the target workstation, so these drive Chrome over the
DevTools protocol. The same pages open by hand in any browser over
`python -m http.server` if you want to watch.

Known source-layout limitations are recorded in
[document-text-layout-audit.md](document-text-layout-audit.md).
