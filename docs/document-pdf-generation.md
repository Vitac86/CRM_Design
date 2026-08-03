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

Step 2 is skipped entirely when the field declares `tokenBreak: 'none'`. That
is for a slot holding one exact reference the document owner's format does not
allow to be broken *anywhere* — `БД-2026/000417-СПБ` contains a slash and two
hyphens the wrapper would gladly use, but «БД-2026/» on the printed blank and
«000417-СПБ» underneath reads as two different references. Such a token goes
whole to a wider approved line, or the field overflows and says so.

There is no dictionary hyphenation, and nothing is ever invented.

Long names, addresses, issuing authorities and contract numbers are **never
silently clipped or truncated**. Empty optional values simply leave the printed
line blank.

## 6b. Dynamic page-section expansion

Some values cannot fit however carefully the field is mapped, and some pages
have no blank band to put a continuation line in. Rather than refusing the
document, the generated file can grow the row it needs — the way the row would
have been inserted in Word before the PDF was exported.

**There is still exactly one authoritative PDF per document.** No
`…-short.pdf` / `…-long.pdf`, no resident/non-resident variants, no
company-name-length templates. The variation exists only inside the output
Blob, and the committed template is never modified.

### The two continuation mechanisms

| | When | What moves |
| --- | --- | --- |
| **A. Existing empty space** — `flowRegions` | the form already leaves a printed rule or a blank cell | nothing; the text simply continues there |
| **B. Inserted layout row** — `expansion` | there is no blank line, but the page has vertical reserve | the page section below the anchor moves down and a real row opens |

Both are declarative. Use A wherever the form allows it; B only when it does
not.

### C. Reflowing the printed line itself

There is a third answer, and where it applies it is the best one: replace the
reviewed source blocks that paint the line and lay the same wording out again
with the value in it. A printed blank is usually not the width the *line* has —
«По электронной почте ______(необходимо указать адрес электронной почты)» gives
an address 93.4 pt of underscores on a text column running to 557 pt, and the
instruction after it can simply move right, exactly as it would in Word.

Prefer this when the space under a slot belongs to something else. On both
accession forms the paper below that line is the «По системе ЭДО» row: writing
there would attach the address to a different delivery method, and one form has
no page reserve left anyway. Reflowing costs no budget, moves nothing and keeps
the value on the line the form drew for it.

A reference inside such a block may set `blankWhenEmpty: true`. The printed
blank belongs to the form's wording, not to the value, so an empty — or
`showWhen`-hidden — reference then keeps its rule at the measured width from
`decoration.minWidth` instead of deleting it from the document. Validation
refuses the flag without that width.

### Which fields may expand

Not many. The candidates are long client data:

* full legal company name, and an abbreviated or foreign name where used;
* legal, registration, residential, postal and foreign addresses;
* a registration or passport issuing authority where ordinary realistic values
  demonstrate a real need.

Identifiers and normally short values — ИНН, КПП, ОГРН, passport series and
number, account number, dates, citizenship, client code — should fit through
correct field mapping and the 9 pt minimum. Audit them, but do not open a
continuation area without evidence. `tools/qa/measure_slot_widths.py` compares
every mapped width against the printed blank it sits in and is the first thing
to run when a short value does not fit: the map may simply be wrong.

Power-of-attorney is the exception that proves the rule. Its ИНН, ОГРН,
citizenship, authority and date slots are genuinely 20–54 pt wide, the map is
correct, and the values are exact — so each takes an inserted row, printing the
complete value unbroken on the ruled line directly beneath its label. A 10-digit
ИНН is never split.

It is also the form that exhausts its local page reserve. A foreign-individual
variant needs six rows where the page itself funds four. Its reviewed
`crossPageFlow` transfers a complete trailing power to the following page and
recovers the remaining room; all six exact values then print at or above 9 pt.
See `docs/document-text-layout-audit.md` §5b for the measured boundaries.

### The schema — the field's row

```js
{
  id: 'clientName',
  source: 'field.client-full-name',
  overflowStrategy: 'expand-layout',
  expansion: {
    page: 0,
    insertionTop: 297.6,      // where a row opens
    shiftFromTop: 297.6,      // top of the movable block
    rowHeight: 11.5,          // measured from the form, NOT a standard 14
    maxExtraRows: 2,          // the most THIS field may insert
    maxFontSize: 9.5,         // the size the form itself is set in
    lineStyle: 'underline',   // 'underline' | 'table-row'
    reviewStatus: 'approved', // production refuses anything else
    line: {
      left: 99.3, width: 435.7,
      baselineOffset: 8.9,    // text baseline inside the row
      ruleOffset: 9.98,       // baseline + the measured rule offset
      ruleThickness: 0.48     // matched to a printed rule nearby
    }
  }
}
```

A `table-row` additionally takes `rowLeft`, `rowWidth`, `borders`, `columns`
and optional `bottomSegments` / `topSegments`, so an inserted row reproduces
the table it joins — including rules that break at column boundaries.

Nothing is inferred at runtime. Every one of those numbers must be present, and
validation rejects the field if any is missing.

### The schema — the page's budget

A page has one amount of room, not one per field. It is stated once, on the
template, and every anchor on that page shares it:

```js
pageLayout: {
  0: {
    fixedHeaderUntil: 0,        // nothing above this ever moves
    bodyBottom: 756.96,         // lowest movable content, measured
    fixedFooterFrom: 789.97,    // the page number. Never moves, ever.
    shiftToTop: 783.0,          // bottom of the movable band; excludes the footer
    bottomClearance: 6.0,       // white space kept between the two
    compaction: [               // reviewed gaps between two COMPLETE blocks
      { top: 62.60, originalGap: 63.85, minGap: 42.5,
        reviewStatus: 'approved', note: 'верхнее поле, 2.25 → 1.5 см' }
    ],
    anchors: ['ulOgrn', 'ulInn', 'ulAttorneyCitizenship']
  }
}
```

```
bottomCapacity = fixedFooterFrom - bottomClearance - bodyBottom
recoverable    = sum over compaction zones of (originalGap - minGap)
budget         = bottomCapacity + recoverable
```

If those two sources are insufficient, an approved `crossPageFlow` may add one
more measured term:

```js
crossPageFlow: {
  targetPage: 3,
  sourceFromTop: 725.90, sourceToTop: 788.00,
  sourceContentTop: 731.02, retainedBodyBottom: 725.86,
  targetInsertionTop: 55.92,
  targetShiftFromTop: 55.90, targetShiftToTop: 788.00,
  targetShift: 36.24, maxCumulativeShift: 36.24,
  maxCascadeDepth: 1,
  reviewStatus: 'approved'
}
```

The source band must contain only complete balanced drawing blocks. The engine
removes those original operator bytes from the source page once, merges any
required page resources without name collisions, and prepends the same bytes to
the target page under a translation matrix. It then moves the target page's
existing content by the declared amount. No block is copied, reconstructed or
rasterised. Cascading beyond one following page and unreviewed rules are
rejected.

`measure_page_layout.py` produces every one of those numbers from the committed
PDF, including detecting the fixed footer: a trailing block separated from the
body by several line pitches and narrower than 120 pt is a page number, and a
page number never moves.

A field may not also state a `bottomReserve` of its own beside a page budget —
that is the duplication the page budget replaced, and validation rejects it. A
map written before the page budget existed keeps working: its anchors all
described the same page, so the smallest of their reserves is that page's
budget.

### Recovering reviewed white space

A compaction zone names the gap between two **complete** blocks, the minimum a
human approved for it, and therefore how much it may release. It is spent
lazily, in declaration order, and only as far as the inserted rows actually
need — a document that expands by nothing never compacts anything.

A page's own top margin is a compaction zone whose upper block is the sheet
edge. That is how the доверенность pays for its rows: 2.25 cm → 1.5 cm on the
legal-entity page, 2.0 cm → 1.5 cm on the individual one.

What may never be recovered: line height inside a paragraph, the font size, the
vertical scale of anything, an individual table cell without a row rule, or a
gap below the first insertion point — the planner refuses that last one, because
recovering it would move the anchor's own row.

### Only the scenario being printed pays

Rows are asked for by values that are really going to be drawn. A field switched
off by `showWhen`, an empty optional value and a missing required value cost the
page nothing. This matters most where one file carries two documents: the
доверенность holds a legal-entity variant on pages 1–2 and an individual one on
pages 3–4, and a доверенность for a company must spend nothing on page 3.

Anchors are then allocated top to bottom against the one budget, so capacity an
anchor does not use is left to the ones below it, and the plan reports where the
room went:

```
ulOgrn                 1 row × 12 pt   cumulative 12   remaining 49.36
ulInn                  1 row × 12 pt   cumulative 24   remaining 37.36
ulAttorneyCitizenship  1 row × 12 pt   cumulative 36   remaining 25.36
```

### How the page actually moves

`pdf-page-expander.js` rewrites the page's own content stream. Word writes each
drawing as a self-contained balanced `q … Q` block with an absolute text
matrix, so a block is moved by wrapping it — and nothing else — in
`q 1 0 0 1 0 dy cm … Q`. Every operator still appears exactly once.

Text stays text, rules stay rules, images stay images. Nothing is rasterised,
no page or section becomes a screenshot, and no legal block is whited out and
redrawn.

The alternative — embedding the page as a Form XObject and drawing it once per
band with different clips — was implemented, measured and rejected: it renders
correctly and pymupdf reads it correctly, but any extractor that ignores clip
paths sees every operator once per band. On Appendix 1A that produced six
occurrences of a phrase that appears twice, at 1.68× the file size. Rewriting
the stream gives two occurrences at 0.98×, with the page's extracted text
identical to the base character for character.

Content that would straddle an insertion line cannot be split, so the expander
reports it instead of guessing. `tools/qa/check_expansion_anchors.py` asks the
production expander to try every declared anchor and scans nearby for a clean
one; run it after changing any anchor.

### One plan for static content and overlays

```js
{ page: 0, shifts: [ { fromTop: 297.6, toTop: 830, delta: 14 } ] }
```

The same plan moves the page content and every dynamic element below the
anchor: text fields, checkbox marks, generated underlines, printed signature
transcripts, further continuation regions and conditional fields. Field maps
stay written in the template's own coordinates; the transformation is applied
at render time, never baked into the map.

Several expandable fields may share a page. Anchors are processed top to bottom,
shifts accumulate, a later anchor's rows open below what an earlier one already
opened, and a coordinate's total shift is the sum of every band containing it:

```
company name inserts 1 row   → +14 pt
legal address inserts 2 rows → +28 pt
content below the address    → +42 pt
```

### Reserve, and the footer

Expansion is allowed only while `cumulative shift ≤ page budget`. `shiftToTop`
bounds the movable block and may not reach `fixedFooterFrom`, so a page with a
fixed footer keeps it fixed: top section fixed, middle section expandable,
footer fixed. Signature blocks and footer spacing are never moved or compressed
unless the map says so explicitly. When the budget runs out the field that could
not be paid for gets a field-specific error naming it and the reason — and only
that field: the anchors already granted rows keep them.

### When the value fits

Nothing happens. No shift, no inserted row, no rule. The output matches the
non-expanded baseline apart from the normal dynamic text — verified in QA by
comparing the drawn vector rules against the base template.

## 6a. Preflight

Loading the committed template, checking the map against it and embedding the
fonts is `Renderer.open`. Deciding which fields need rows, what each page's plan
is and where every line of every value lands is `Renderer.decide`.

`Renderer.preflight` runs both and stops. `render` runs both and draws. There is
no second implementation of the decision for them to disagree over, so a
preflight that succeeds cannot be followed by a generation that fails for the
same payload.

`decide` also returns a **fingerprint**: a deterministic, readable summary of
every page shift, every inserted row and every line of every value with the size
and region it landed in. `render` hands it to `onPlan`, and
`run_expansion_tests.py` compares the two over 18 maps × 6 profiles.

If any value cannot be printed, `render` throws a `DocumentOverflowError`
carrying every diagnostic at once, and no Blob is produced for a document that
cannot be printed.

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

### Three kinds of valid

A layout can be right in one of these senses and wrong in another. Keep them
apart, because a document that passes the first two can still be unacceptable:

| | asks | proved by |
|---|---|---|
| **structural** | is the value complete, is the PDF sound, is nothing below the readability floor, is any source content lost? | `run_structural_pdf_tests.py`, `audit_ordinary_equality.py` |
| **geometric** | does it overlap, cross a rule, leave its cell, or land outside a reviewed band? | `run_visual_geometry_tests.py`, `run_preflight_render_agreement_tests.py` |
| **reading flow** | does the result still read as one field a person typed? | `run_visual_flow_tests.py` |

The third one exists because two defects reached a visual review with every
other suite green.

**The payment reference.** The account-opening notice prints
«…брокерское обслуживание №\_\_\_\_\_\_\_\_\_ дата\_\_. ФОНДОВЫЙ РЫНОК» in a
bordered cell. The printed blank is 49.68 pt; a real reference is 101.17 pt, so
the reference was moved whole to the row's third printed line — approved,
inside the cell, at a legal size, and 95 pt to the right of a still-empty «№»,
underneath the market name. It read as a caption someone had dropped in.

**The grown row.** A foreign legal name needs three lines in a two-line cell,
so the row grows. The third line was placed at the row's own 13.44 pt pitch
while the two above it kept the cell's 9.975 pt leading. One value, two
rhythms: a paragraph that stops and a second entry that starts.

Both are now rules rather than opinions:

- an exact reference is **one whole token** — a slash or a hyphen inside it is
  not a break opportunity (`tokenBreak: 'none'`, `keepTogether`);
- it stays on the same line as the token that **introduces** it, with no gap
  (`keepWithNext` after «№»), and the sentence continues after it;
- a value's own printed lines keep **one step**. A continuation may start
  further left than the first line — Word does that when the first line began
  after a printed label — but never further right;
- a row grown to finish a sentence keeps the sentence's leading, not the row's
  pitch (`expansion.line.continuesParagraph`); its height, borders and rules do
  not move;
- printed **sample** content is replaced by the CRM value it stands for, and
  the swap is declared (`sourcePlaceholders`), not assumed.

### Reviewed source placeholders

A blank printed as underscores is geometry: `_+` normalises away and the
legal-text gates never see it. A few forms instead print a *sample value* where
a real one belongs — the account-opening notice prints «Код INV0000X» in two
payment-purpose rows and «Код XXXXXXХ» in the third. Those are ordinary letters
and digits, indistinguishable from the wording around them, so they can only be
dropped where the map says so:

```js
sourcePlaceholders: [
  { text: 'INV0000X', fieldId: 'paymentPurposeClientCode',
    reviewStatus: 'approved',
    note: 'sample client code printed by the source form' }
]
```

The placeholder must be approved and must name a field the block actually
resolves, so it can never remove wording that no value replaces. Everything
else in the paragraph still has to match the authoritative PDF token for token
— `sourceStaticText` keeps the sample verbatim, which is the proof the map
transcribed the block rather than edited it.

One CRM value may print in several reviewed paragraphs. The field declares
every owner and opts in explicitly:

```js
layoutMode: 'flow-reference',
flowBlockId: ['…-stock', '…-currency', '…-derivatives'],
allowMultipleFlowReferences: true
```

```bash
cd static-uikit && python -m http.server 8000
# http://localhost:8000/tools/document-qa-harness.html
```

The harness renders each fixture with the **production engine** and offers the
result for download. Fixtures cover: normal individual, long full name, long
issuing authority, long registration address, missing optional values, all
checkboxes on, all off. All fixture data is obviously fictional; **never commit
generated PDFs containing real personal data.**

`run_visual_geometry_tests.py --keep out/` writes the synthetic examples this
checklist is meant to be applied to: no expansion, one inserted row, the maximum
approved rows, two anchors on one page, both доверенность variants, a company
name in a table, an address in a table row and an activated cross-page transfer.
The same run also *measures* the
claims below that can be measured — rule weight and measure, text sitting on the
rule with its descenders clear, one pitch per anchor, no rule without text, and
no printed glyph covered.

For every page of every migrated document, confirm at high zoom, at normal
viewing scale and at print scale:

- [ ] dynamic text looks manually typed into the original form
- [ ] page count unchanged; no page added or lost
- [ ] all static legal text unchanged
- [ ] long values do not overlap other content
- [ ] Cyrillic renders correctly (including `ё`, `№`, `«»`)
- [ ] checkmarks are inside the intended boxes
- [ ] the original blank underline is still visible beneath inserted text
- [ ] no blue fields, borders, focus rectangles, labels or form styling
- [ ] no appended data/confirmation sheet
- [ ] an inserted row looks like a row the form printed itself
- [ ] page numbers, headers and footers are where the template put them
- [ ] no unexplained empty row
- [ ] every line of one value is the same distance from the last
- [ ] a continuation reads as the rest of the sentence, not as a new entry
- [ ] an exact reference sits where the wording introduces it, whole
- [ ] no sample value the form printed survives next to a real one

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
7. Bound every multiline cell with the `maxHeight`
   `measure_field_room.py` reports for it. A cell with no bound is not
   generous — it is unbounded, and a long value runs through whatever the form
   prints below it.
8. Where a page needs inserted rows, measure it once with
   `measure_page_layout.py` and give the template a `pageLayout` entry rather
   than a `bottomReserve` per field.
9. Take the row height from `measure_page_layout.py --row`, not from habit.
10. Re-run `tools/qa/run_document_regression.py`,
    `check_expansion_anchors.py`, `run_structural_pdf_tests.py` and
    `run_visual_geometry_tests.py`, and check the reports.

## 14. QA entry points

| Command | What it proves |
| --- | --- |
| `run_layout_specs.py` | the layout engine, against the real embedded font |
| `run_document_regression.py` | every map × every RU/EN profile, plus PDF structure |
| `run_expansion_tests.py` | page budgets, scenario allocation, white-space recovery, preflight/render agreement |
| `run_structural_pdf_tests.py` | every original operator exactly once, read by pymupdf *and* pypdf |
| `run_visual_geometry_tests.py` | what a generated row looks like, measured; writes the QA examples with `--keep` |
| `run_wizard_tests.py` | the Document Wizard end to end |
| `run_builder_qa.py` | the Template Builder |
| `check_expansion_anchors.py` | every anchor and compaction zone sits on a clean operator cut |
| `measure_page_layout.py` | a page's reserve, its fixed footer, its block gaps and its row geometry |
| `audit_ordinary_failures.py` | the failure matrix, split into ordinary / realistic-long / stress |
| `audit_ordinary_equality.py` | no ordinary payload is shortened, and every value it draws comes back out of the PDF character for character |
| `build_ordinary_review_pack.py` | writes the local, git-excluded visual-review pack for a layout change that needs a person to look at it |

All under `static-uikit/tools/qa/`.

There is no Node on the target workstation, so these drive Chrome over the
DevTools protocol. The same pages open by hand in any browser over
`python -m http.server` if you want to watch.

Known source-layout limitations are recorded in
[document-text-layout-audit.md](document-text-layout-audit.md).
