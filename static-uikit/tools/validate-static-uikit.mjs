#!/usr/bin/env node
/**
 * validate-static-uikit.mjs
 *
 * Deterministic, dependency-free validator for the static-uikit project.
 *
 * Checks:
 *   A. CSS manifest (crm-static.css) — existence, structure, import order
 *   B. Bundle (crm-static.bundle.css) — freshness, section markers, font paths, :root
 *   C. HTML pages — required/forbidden CSS refs, auth-page rules
 *   D. Partials directory — existence and CSS loading
 *   E. UMI pack directories — CSS reference audit
 *   F. Local asset existence — <link href>, <script src>, <img src>
 *   G. Component boundary checks — cards.css shell selectors, tables.css duplicate selectors
 *   H. Summary and exit code
 *
 * Usage:
 *   node static-uikit/tools/validate-static-uikit.mjs
 *   npm run static:uikit:validate
 *
 * Exit 0 — no errors
 * Exit 1 — one or more errors
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, relative, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// ── Paths ─────────────────────────────────────────────────────────────────────

const REPO_ROOT    = resolve(__dirname, '../..');
const STATIC_ROOT  = resolve(REPO_ROOT, 'static-uikit');
const ASSETS_DIR   = resolve(STATIC_ROOT, 'assets');
const ASSETS_CSS   = resolve(ASSETS_DIR, 'css');
const ASSETS_FONTS = resolve(ASSETS_DIR, 'fonts');
const MANIFEST     = resolve(ASSETS_CSS, 'crm-static.css');
const BUNDLE       = resolve(ASSETS_CSS, 'crm-static.bundle.css');
const CARDS_CSS    = resolve(ASSETS_CSS, 'components/cards.css');
const TABLES_CSS   = resolve(ASSETS_CSS, 'components/tables.css');
const FORMS_CSS    = resolve(ASSETS_CSS, 'components/forms.css');
const BUTTONS_CSS  = resolve(ASSETS_CSS, 'components/buttons.css');
const REGISTRY_CSS = resolve(ASSETS_CSS, 'components/registry.css');
const SUBJECT_CARD_CSS  = resolve(ASSETS_CSS, 'pages/subject-card.css');
const SUBJECT_EDIT_CSS  = resolve(ASSETS_CSS, 'pages/subject-edit.css');
const FILTERS_CSS       = resolve(ASSETS_CSS, 'components/filters.css');
const ADDRESS_CSS       = resolve(ASSETS_CSS, 'components/address.css');
const CONTRACT_WIZARD_CSS = resolve(ASSETS_CSS, 'pages/contract-wizard.css');
const COMPLIANCE_CSS      = resolve(ASSETS_CSS, 'pages/compliance.css');
const REQUESTS_CSS        = resolve(ASSETS_CSS, 'pages/requests.css');
const PAGES_DIR    = resolve(STATIC_ROOT, 'pages');
const PARTIALS_DIR = resolve(STATIC_ROOT, 'partials');
const UMI_P0_DIR   = resolve(STATIC_ROOT, 'umi-p0');
const UMI_P1_DIR   = resolve(STATIC_ROOT, 'umi-p1');
const BUILD_SCRIPT = resolve(__dirname, 'build-css-bundle.mjs');

const AUTH_PAGES = new Set(['login.html', 'register.html', 'forgot-password.html']);

// Expected layer order for CSS imports
const LAYER_ORDER = ['base', 'layout', 'components', 'pages', 'responsive', 'print'];

// Broad UIkit/form/button focus selectors that must NOT appear in cards.css.
// Card/control-specific focus selectors (.crm-option-card, .crm-binary-control, etc.) are allowed.
const CARDS_FORBIDDEN_FOCUS_SELECTORS = [
  '.uk-button:focus',
  '.uk-button:focus-visible',
  '.uk-input:focus-visible',
  '.uk-select:focus-visible',
  '.uk-textarea:focus-visible',
  'a:focus-visible',
  '.crm-nav-link:focus-visible',
  '.crm-nav-group-toggle:focus-visible',
];

const CARDS_FORBIDDEN_SHELL_SELECTORS = [
  '.crm-layout',
  '.crm-sidebar',
  '.crm-app.sidebar-open',
  '.crm-sidebar-overlay',
  '[data-sidebar-toggle]',
  '.crm-topbar',
  '.crm-search',
  '.crm-page',
];

const CARDS_DUPLICATE_SELECTOR_CHECKS = [
  '.crm-option-card',
  '.crm-option-card.is-selected',
  '.crm-binary-control',
  '.crm-binary-control label',
];

const TABLES_DUPLICATE_SELECTOR_CHECKS = [
  '.crm-table-wrapper',
  '.crm-table',
  '.crm-table .uk-table',
  '.crm-table .uk-table th',
  '.crm-table .uk-table td',
  '.crm-table .uk-table td:first-child',
  '.crm-table-head',
  '.crm-table-meta',
  '.crm-table-actions',
  '.crm-list-actions',
];

const FILTERS_DUPLICATE_SELECTOR_CHECKS = [
  '.crm-filter-panel',
];

const ADDRESS_LAST_CHILD_DUPLICATE_CHECKS = [
  'body[data-page="subject-register"] .crm-address-row:last-child',
  '.crm-page[data-page="subject-register"] .crm-address-row:last-child',
  'body[data-page="subject-edit"] .crm-address-row:last-child',
];

const REGISTRY_ACTION_FILTER_DUPLICATE_CHECKS = [
  '.crm-page[data-page="agents"] .crm-agents-actions',
  '.crm-page[data-page="archive"] .crm-archive-actions',
  '.crm-page[data-page="brokerage"] .crm-brokerage-actions',
  '.crm-page[data-page="requests"] .crm-requests-actions',
  '.crm-page[data-page="trust-management"] .crm-trust-management-actions',
  '.crm-page[data-page="agents"] .crm-agents-shell .crm-filter-pill-control',
  '.crm-page[data-page="archive"] .crm-archive-shell .crm-filter-pill-control',
  '.crm-page[data-page="back-office"] .crm-back-office-shell .crm-filter-pill-control',
  '.crm-page[data-page="brokerage"] .crm-filter-pill-control',
  '.crm-page[data-page="compliance"] .crm-filter-pill-control',
  '.crm-page[data-page="requests"] .crm-requests-shell .crm-filter-pill-control',
  '.crm-page[data-page="trading"] .crm-trading-shell .crm-filter-pill-control',
  '.crm-page[data-page="trust-management"] .crm-trust-management-shell .crm-filter-pill-control',
  'body[data-page="subjects"] .crm-filter-pill-control',
];

// ── Reporting ─────────────────────────────────────────────────────────────────

let errors   = 0;
let warnings = 0;

function err(msg)  { console.error(`  ✗ ERROR: ${msg}`); errors++; }
function warn(msg) { console.warn(`  ⚠ WARN:  ${msg}`); warnings++; }
function ok(msg)   { console.log(`  ✓ ${msg}`); }
function info(msg) { console.log(`  · ${msg}`); }
function section(title) { console.log(`\n── ${title} ──`); }

// ── Helpers ───────────────────────────────────────────────────────────────────

const IMPORT_URL_RE   = /^\s*@import\s+url\(\s*['"]?([^)'"]+?)['"]?\s*\)\s*;/;
const IMPORT_PLAIN_RE = /^\s*@import\s+['"]([^'"]+)['"]\s*;/;

function parseManifestImports(source) {
  const imports = [];
  for (const line of source.split('\n')) {
    const m = IMPORT_URL_RE.exec(line) || IMPORT_PLAIN_RE.exec(line);
    if (m) imports.push(m[1].trim());
  }
  return imports;
}

function classifyImport(importPath) {
  const p = importPath.replace(/^\.\//, '');
  if (p.startsWith('base/'))       return 'base';
  if (p.startsWith('layout/'))     return 'layout';
  if (p.startsWith('components/')) return 'components';
  if (p.startsWith('pages/'))      return 'pages';
  if (p === 'responsive.css')      return 'responsive';
  if (p === 'print.css')           return 'print';
  return 'unknown';
}

function stripCssBlockComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, match => {
    const newlineCount = (match.match(/\n/g) || []).length;
    return '\n'.repeat(newlineCount);
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function makeSelectorBoundaryRegex(selector) {
  const escaped = escapeRegExp(selector);
  if (selector.startsWith('.')) {
    return new RegExp(`(^|[^_a-zA-Z0-9-])${escaped}(?![_a-zA-Z0-9-])`);
  }
  return new RegExp(escaped);
}

function normalizeSelectorPrelude(selector) {
  return selector.replace(/\s+/g, ' ').trim();
}

function collectTopLevelRuleSelectors(source) {
  const selectors = [];
  let depth = 0;
  let preludeStart = 0;
  let inString = null;
  let escaped = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === inString) {
        inString = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = char;
      continue;
    }

    if (char === '{') {
      const prelude = source.slice(preludeStart, i).trim();
      if (depth === 0 && prelude && !prelude.startsWith('@')) {
        selectors.push(normalizeSelectorPrelude(prelude));
      }
      depth++;
      continue;
    }

    if (char === '}') {
      depth = Math.max(0, depth - 1);
      if (depth === 0) preludeStart = i + 1;
    }
  }

  return selectors;
}

function splitSelectorList(selectorPrelude) {
  const selectors = [];
  let start = 0;
  let parenDepth = 0;
  let bracketDepth = 0;
  let inString = null;
  let escaped = false;

  for (let i = 0; i < selectorPrelude.length; i++) {
    const char = selectorPrelude[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === inString) {
        inString = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = char;
      continue;
    }

    if (char === '(') parenDepth++;
    if (char === ')') parenDepth = Math.max(0, parenDepth - 1);
    if (char === '[') bracketDepth++;
    if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1);

    if (char === ',' && parenDepth === 0 && bracketDepth === 0) {
      selectors.push(normalizeSelectorPrelude(selectorPrelude.slice(start, i)));
      start = i + 1;
    }
  }

  selectors.push(normalizeSelectorPrelude(selectorPrelude.slice(start)));
  return selectors.filter(Boolean);
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split('\n').length;
}

function collectRuleSelectorEntriesByContext(source) {
  const entries = [];
  const contextStack = [];
  const blockStack = [];
  let preludeStart = 0;
  let inString = null;
  let escaped = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === inString) {
        inString = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = char;
      continue;
    }

    if (char === '{') {
      const prelude = source.slice(preludeStart, i).trim();
      if (prelude.startsWith('@')) {
        contextStack.push(normalizeSelectorPrelude(prelude));
        blockStack.push({ type: 'atrule' });
      } else if (prelude) {
        const context = contextStack.length ? contextStack.join(' / ') : 'base';
        const line = lineNumberAt(source, preludeStart);
        for (const selector of splitSelectorList(prelude)) {
          entries.push({ context, selector, line });
        }
        blockStack.push({ type: 'rule' });
      } else {
        blockStack.push({ type: 'block' });
      }
      preludeStart = i + 1;
      continue;
    }

    if (char === '}') {
      const block = blockStack.pop();
      if (block?.type === 'atrule') contextStack.pop();
      preludeStart = i + 1;
    }
  }

  return entries;
}

function findDuplicateSelectorContexts(entries) {
  const byKey = new Map();
  for (const entry of entries) {
    const key = `${entry.context}\u0000${entry.selector}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(entry.line);
  }

  return [...byKey.entries()]
    .filter(([, lines]) => lines.length > 1)
    .map(([key, lines]) => {
      const [context, selector] = key.split('\u0000');
      return { context, selector, lines };
    });
}

/** Resolve a path relative to a page HTML file (strips fragment). */
function resolvePageRef(ref, pageDir) {
  const withoutFragment = ref.split('#')[0];
  if (!withoutFragment) return null; // pure fragment
  return resolve(pageDir, withoutFragment);
}

function isLocalRef(ref) {
  if (!ref) return false;
  const r = ref.trim();
  return (
    r !== '' &&
    !r.startsWith('http://') &&
    !r.startsWith('https://') &&
    !r.startsWith('//') &&
    !r.startsWith('mailto:') &&
    !r.startsWith('tel:') &&
    !r.startsWith('data:') &&
    !r.startsWith('#') &&
    !r.includes('{') && // template placeholder
    !r.includes('%7B')
  );
}

/** Extract href/src values from a tag string. */
function extractAttr(tag, attr) {
  const re = new RegExp(`\\b${attr}\\s*=\\s*["']([^"']+)["']`, 'i');
  const m  = re.exec(tag);
  return m ? m[1] : null;
}

/** Find all <link>, <script src>, <img src> local refs in HTML. */
function extractHtmlRefs(html) {
  const refs = [];

  // <link ...> tags
  for (const m of html.matchAll(/<link\b([^>]+)>/gi)) {
    const tag  = m[1];
    const href = extractAttr(tag, 'href');
    if (href) refs.push({ tag: 'link', attr: 'href', value: href });
  }

  // <script src="..."> tags
  for (const m of html.matchAll(/<script\b([^>]+)>/gi)) {
    const tag = m[1];
    const src = extractAttr(tag, 'src');
    if (src) refs.push({ tag: 'script', attr: 'src', value: src });
  }

  // <img src="..."> tags
  for (const m of html.matchAll(/<img\b([^>]+)>/gi)) {
    const tag = m[1];
    const src = extractAttr(tag, 'src');
    if (src) refs.push({ tag: 'img', attr: 'src', value: src });
  }

  return refs;
}

/** Extract only stylesheet href values from HTML. */
function extractStylesheetHrefs(html) {
  const hrefs = [];
  for (const m of html.matchAll(/<link\b([^>]+)>/gi)) {
    const tag = m[1];
    const rel = extractAttr(tag, 'rel') || '';
    const href = extractAttr(tag, 'href') || '';
    if (rel.toLowerCase() === 'stylesheet' || href.endsWith('.css')) {
      hrefs.push(href);
    }
  }
  return hrefs;
}

function walkDir(dir) {
  if (!existsSync(dir)) return [];
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...walkDir(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

// ── Section A: CSS Manifest ───────────────────────────────────────────────────

section('A. CSS Manifest');

let manifestImports = [];

if (!existsSync(MANIFEST)) {
  err(`crm-static.css not found: ${relative(REPO_ROOT, MANIFEST)}`);
} else {
  ok('crm-static.css exists');
  const manifestSrc   = readFileSync(MANIFEST, 'utf8');
  const manifestLines = manifestSrc.split('\n');
  manifestImports     = parseManifestImports(manifestSrc);

  // A1 — manifest contains only @import, blanks, and comments
  let hasNonImport = false;
  for (const line of manifestLines) {
    const t = line.trim();
    if (
      t === '' ||
      t.startsWith('//') ||
      t.startsWith('/*') ||
      t.startsWith('*') ||
      IMPORT_URL_RE.test(line) ||
      IMPORT_PLAIN_RE.test(line)
    ) continue;
    err(`crm-static.css contains a non-@import rule: ${t}`);
    hasNonImport = true;
  }
  if (!hasNonImport) ok('crm-static.css contains only @import, blanks, and comments');

  // A2 — all imported files exist
  let allExist = true;
  for (const imp of manifestImports) {
    const abs = resolve(ASSETS_CSS, imp.replace(/^\.\//, ''));
    if (!existsSync(abs)) {
      err(`imported file missing: ${imp}`);
      allExist = false;
    }
  }
  if (allExist) ok(`all ${manifestImports.length} imported files exist`);

  // A3 — no duplicate imports
  const seen = new Set();
  let hasDup = false;
  for (const imp of manifestImports) {
    if (seen.has(imp)) {
      err(`duplicate import: ${imp}`);
      hasDup = true;
    }
    seen.add(imp);
  }
  if (!hasDup) ok('no duplicate import paths');

  // A4 — import count
  info(`import count: ${manifestImports.length}`);

  // A5 — import layer order
  const layers = manifestImports.map(classifyImport);
  let layerError = false;

  // Verify order: base → layout → components → pages → responsive → print
  const seenLayers = [];
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    if (layer === 'unknown') {
      warn(`unrecognised import layer for: ${manifestImports[i]}`);
      continue;
    }
    const expectedIdx   = LAYER_ORDER.indexOf(layer);
    const lastSeenLayer = seenLayers[seenLayers.length - 1] ?? 'base';
    const lastIdx       = LAYER_ORDER.indexOf(lastSeenLayer);
    if (expectedIdx < lastIdx) {
      err(
        `import order violation: "${manifestImports[i]}" (${layer}) comes after ` +
        `a "${lastSeenLayer}" import — expected order: base → layout → components → pages → responsive → print`
      );
      layerError = true;
    }
    seenLayers.push(layer);
  }

  // Last two must be responsive.css then print.css
  const last2 = manifestImports.slice(-2);
  if (last2[0] && !last2[0].endsWith('responsive.css')) {
    err(`second-to-last import must be responsive.css, got: ${last2[0]}`);
    layerError = true;
  }
  if (last2[1] && !last2[1].endsWith('print.css')) {
    err(`last import must be print.css, got: ${last2[1]}`);
    layerError = true;
  }

  if (!layerError) ok('import layer order is correct (base → layout → components → pages → responsive → print)');
}

// ── Section B: Bundle ─────────────────────────────────────────────────────────

section('B. Bundle');

if (!existsSync(BUNDLE)) {
  err(`bundle not found: ${relative(REPO_ROOT, BUNDLE)}`);
} else {
  ok('crm-static.bundle.css exists');

  const bundleSrc   = readFileSync(BUNDLE, 'utf8');
  const bundleLines = bundleSrc.split('\n');

  // B1 — no real @import directives (at line start, outside comments)
  const realImports = bundleLines.filter(l => /^@import\s/.test(l.trim()));
  if (realImports.length > 0) {
    realImports.forEach(l => err(`bundle contains a real @import directive: ${l.trim()}`));
  } else {
    ok('bundle contains no real @import directives');
  }

  // B2 — section markers: one per manifest import
  const fileMarkerRe = /\/\* ===== ([a-z][\w/-]*\.css) ===== \*\//g;
  const bundleMarkers = [...bundleSrc.matchAll(fileMarkerRe)].map(m => m[1]);
  if (bundleMarkers.length !== manifestImports.length) {
    err(
      `bundle has ${bundleMarkers.length} file-level section markers but manifest has ` +
      `${manifestImports.length} imports`
    );
  } else {
    ok(`bundle has ${bundleMarkers.length} section markers matching ${manifestImports.length} manifest imports`);
  }

  // B3 — bundle freshness (run build --check)
  if (existsSync(BUILD_SCRIPT)) {
    const result = spawnSync(process.execPath, [BUILD_SCRIPT, '--check'], { encoding: 'utf8' });
    if (result.status === 0) {
      ok('bundle is up to date with source CSS');
    } else {
      const msg = (result.stdout + result.stderr).trim().replace(/\n/g, ' ');
      err(`bundle is stale: ${msg}`);
    }
  } else {
    warn('build-css-bundle.mjs not found — cannot verify bundle freshness');
  }

  // B4 — font URLs resolve to existing files
  const fontUrlRe = /url\(\s*['"]?([^)'"\s]+fonts\/[^)'"\s]+?)['"]?\s*\)/g;
  const fontRefs  = [...bundleSrc.matchAll(fontUrlRe)].map(m => m[1]);
  const uniqueFont = [...new Set(fontRefs)];
  let fontErrors = 0;
  for (const ref of uniqueFont) {
    // Paths in bundle are relative to assets/css/ (e.g. ../fonts/inter/...)
    const absFont = resolve(dirname(BUNDLE), ref);
    if (!existsSync(absFont)) {
      err(`bundle font URL does not resolve to an existing file: ${ref}`);
      fontErrors++;
    }
  }
  if (fontErrors === 0) ok(`all ${uniqueFont.length} unique font URL(s) resolve to existing files`);

  // B5 — only one :root block; must be in the base/tokens.css section
  const rootMatches = [...bundleSrc.matchAll(/^:root\s*\{/gm)];
  if (rootMatches.length === 0) {
    warn('bundle contains no :root block — expected exactly one (in base/tokens.css)');
  } else if (rootMatches.length > 1) {
    err(`bundle contains ${rootMatches.length} :root blocks — expected exactly 1 (in base/tokens.css)`);
  } else {
    // Verify it falls within the tokens.css section
    const rootOffset = rootMatches[0].index;
    const tokensMarkerIdx = bundleSrc.indexOf('/* ===== base/tokens.css ===== */');
    const nextMarkerAfterTokens = bundleSrc.indexOf('/* ===== ', tokensMarkerIdx + 1);
    if (
      tokensMarkerIdx !== -1 &&
      rootOffset > tokensMarkerIdx &&
      (nextMarkerAfterTokens === -1 || rootOffset < nextMarkerAfterTokens)
    ) {
      ok(':root appears exactly once, inside the base/tokens.css section');
    } else {
      err(':root block exists but is not inside the base/tokens.css section — unexpected location');
    }
  }
}

// ── Section C: HTML Stylesheet References ────────────────────────────────────

section('C. HTML Stylesheet References');

let htmlPageCount = 0;
let cssCheckErrors = 0;

if (!existsSync(PAGES_DIR)) {
  err(`pages directory not found: ${relative(REPO_ROOT, PAGES_DIR)}`);
} else {
  const pageFiles = readdirSync(PAGES_DIR)
    .filter(f => f.endsWith('.html'))
    .sort();

  htmlPageCount = pageFiles.length;
  info(`found ${htmlPageCount} HTML page(s) in ${relative(REPO_ROOT, PAGES_DIR)}`);

  for (const pageFile of pageFiles) {
    const pagePath   = join(PAGES_DIR, pageFile);
    const pageHtml   = readFileSync(pagePath, 'utf8');
    const cssHrefs   = extractStylesheetHrefs(pageHtml);
    const isAuthPage = AUTH_PAGES.has(pageFile);

    const normalise = h => h.replace(/^\.\.\//, '').replace(/\\/g, '/');

    // C1 — must have uikit.min.css
    const hasUikit = cssHrefs.some(h => normalise(h) === 'assets/css/uikit.min.css');
    if (!hasUikit) {
      err(`[${pageFile}] missing required stylesheet: assets/css/uikit.min.css`);
      cssCheckErrors++;
    }

    // C2 — must have crm-static.bundle.css
    const hasBundle = cssHrefs.some(h => normalise(h) === 'assets/css/crm-static.bundle.css');
    if (!hasBundle) {
      err(`[${pageFile}] missing required stylesheet: assets/css/crm-static.bundle.css`);
      cssCheckErrors++;
    }

    // C3 — must NOT reference crm-static.css (the source manifest)
    if (cssHrefs.some(h => normalise(h) === 'assets/css/crm-static.css')) {
      err(`[${pageFile}] references crm-static.css directly — pages must load crm-static.bundle.css`);
      cssCheckErrors++;
    }

    // C4 — must NOT reference modular source CSS (layout/, components/, base/)
    const modularPrefixes = ['assets/css/layout/', 'assets/css/components/', 'assets/css/base/'];
    for (const h of cssHrefs) {
      const n = normalise(h);
      if (modularPrefixes.some(p => n.startsWith(p))) {
        err(`[${pageFile}] references modular source CSS directly: ${h}`);
        cssCheckErrors++;
      }
    }

    // C5 — no duplicate CSS links
    const normHrefs = cssHrefs.map(normalise);
    const seen = new Set();
    for (const h of normHrefs) {
      if (seen.has(h)) {
        err(`[${pageFile}] loads the same CSS file twice: ${h}`);
        cssCheckErrors++;
      }
      seen.add(h);
    }

    // C6 — auth page rules
    const hasAuthCss = cssHrefs.some(h => normalise(h) === 'assets/css/pages/auth.css');
    if (isAuthPage && !hasAuthCss) {
      warn(`[${pageFile}] is an auth page but does not load pages/auth.css`);
    }
    if (!isAuthPage && hasAuthCss) {
      err(`[${pageFile}] is not an auth page but loads pages/auth.css`);
      cssCheckErrors++;
    }
  }

  if (cssCheckErrors === 0) ok(`all ${htmlPageCount} pages pass stylesheet reference checks`);
}

// ── Section D: Partials ───────────────────────────────────────────────────────

section('D. Partials');

if (!existsSync(PARTIALS_DIR)) {
  info('static-uikit/partials/ does not exist — skipping partials check');
} else {
  const partialFiles = walkDir(PARTIALS_DIR);
  info(`found ${partialFiles.length} file(s) in partials/`);
  const htmlPartials = partialFiles.filter(f => f.endsWith('.html'));
  let partialCssRefs = 0;
  for (const pf of htmlPartials) {
    const html  = readFileSync(pf, 'utf8');
    const hrefs = extractStylesheetHrefs(html);
    if (hrefs.length > 0) {
      warn(`partial ${relative(STATIC_ROOT, pf)} loads stylesheet(s): ${hrefs.join(', ')} — verify this does not cause duplicate loading in assembled pages`);
      partialCssRefs += hrefs.length;
    }
  }
  if (partialCssRefs === 0) ok('no stylesheet links found in partials');
}

// ── Section E: UMI Packs ──────────────────────────────────────────────────────

section('E. UMI Packs');

for (const [label, dir] of [['umi-p0', UMI_P0_DIR], ['umi-p1', UMI_P1_DIR]]) {
  if (!existsSync(dir)) {
    info(`static-uikit/${label}/ does not exist — skipping`);
    continue;
  }

  const umiFiles = walkDir(dir);
  info(`${label}: found ${umiFiles.length} file(s)`);

  let umiErrors = 0;
  for (const uf of umiFiles) {
    const content   = readFileSync(uf, 'utf8');
    const relPath   = relative(STATIC_ROOT, uf);

    // Fail: references modular source CSS
    const modularRe = /assets\/css\/(layout|components|base)\//g;
    let m;
    while ((m = modularRe.exec(content)) !== null) {
      err(`[${relPath}] references modular source CSS: ${m[0]}`);
      umiErrors++;
    }

    // Warn: references crm-static.css instead of bundle
    if (content.includes('crm-static.css') && !content.includes('crm-static.bundle.css')) {
      warn(`[${relPath}] references crm-static.css — verify integration intent (expected: crm-static.bundle.css)`);
    }

    // Report what CSS it references
    const cssRefs = [...content.matchAll(/crm-static(?:\.bundle)?\.css/g)].map(x => x[0]);
    if (cssRefs.length > 0) info(`  ${relPath}: CSS refs → ${[...new Set(cssRefs)].join(', ')}`);
  }

  if (umiErrors === 0) ok(`${label}: no modular-source-CSS references found`);
}

// ── Section F: Local Asset Existence ─────────────────────────────────────────

section('F. Local Asset Existence');

let assetErrors = 0;
let assetChecked = 0;

if (existsSync(PAGES_DIR)) {
  const pageFiles = readdirSync(PAGES_DIR).filter(f => f.endsWith('.html')).sort();

  for (const pageFile of pageFiles) {
    const pagePath = join(PAGES_DIR, pageFile);
    const pageDir  = dirname(pagePath);
    const pageHtml = readFileSync(pagePath, 'utf8');
    const refs     = extractHtmlRefs(pageHtml);

    for (const { tag, attr, value } of refs) {
      if (!isLocalRef(value)) continue;
      assetChecked++;

      const absPath = resolvePageRef(value, pageDir);
      if (!absPath) continue;

      if (!existsSync(absPath)) {
        err(`[${pageFile}] missing local asset (${tag} ${attr}): ${value}`);
        assetErrors++;
      }
    }
  }

  if (assetErrors === 0) {
    ok(`all ${assetChecked} local asset reference(s) across ${pageFiles.length} pages resolve to existing files`);
  }
}

// ── Section G: Component Boundary Checks ─────────────────────────────────────

section('G. Component / Page Boundary Checks');

if (!existsSync(CARDS_CSS)) {
  err(`components/cards.css not found: ${relative(REPO_ROOT, CARDS_CSS)}`);
} else {
  const cardsRelPath = relative(ASSETS_CSS, CARDS_CSS).replace(/\\/g, '/');
  const cardsSource  = stripCssBlockComments(readFileSync(CARDS_CSS, 'utf8'));
  const cardsSelectors = collectTopLevelRuleSelectors(cardsSource);
  let hasShellSelector = false;

  for (const selector of CARDS_FORBIDDEN_SHELL_SELECTORS) {
    if (makeSelectorBoundaryRegex(selector).test(cardsSource)) {
      err(`${cardsRelPath} contains shell-level selector "${selector}"`);
      hasShellSelector = true;
    }
  }

  if (!hasShellSelector) {
    ok('components/cards.css contains no shell-level selectors');
  }

  let hasDuplicateCardSelector = false;

  for (const selector of CARDS_DUPLICATE_SELECTOR_CHECKS) {
    const count = cardsSelectors.filter(found => found === selector).length;
    if (count > 1) {
      err(`${cardsRelPath} contains ${count} top-level definitions for "${selector}"`);
      hasDuplicateCardSelector = true;
    }
  }

  if (!hasDuplicateCardSelector) {
    ok('components/cards.css contains no duplicate top-level card/control selector definitions');
  }
}

if (!existsSync(TABLES_CSS)) {
  err(`components/tables.css not found: ${relative(REPO_ROOT, TABLES_CSS)}`);
} else {
  const tablesRelPath = relative(ASSETS_CSS, TABLES_CSS).replace(/\\/g, '/');
  const tablesSource  = stripCssBlockComments(readFileSync(TABLES_CSS, 'utf8'));
  const selectors     = collectTopLevelRuleSelectors(tablesSource);
  let hasDuplicateTableSelector = false;

  for (const selector of TABLES_DUPLICATE_SELECTOR_CHECKS) {
    const count = selectors.filter(found => found === selector).length;
    if (count > 1) {
      err(`${tablesRelPath} contains ${count} top-level definitions for "${selector}"`);
      hasDuplicateTableSelector = true;
    }
  }

  if (!hasDuplicateTableSelector) {
    ok('components/tables.css contains no duplicate top-level table selector definitions');
  }
}

if (!existsSync(REGISTRY_CSS)) {
  err(`components/registry.css not found: ${relative(REPO_ROOT, REGISTRY_CSS)}`);
} else {
  const registryRelPath = relative(ASSETS_CSS, REGISTRY_CSS).replace(/\\/g, '/');
  const registrySource  = stripCssBlockComments(readFileSync(REGISTRY_CSS, 'utf8'));
  const selectorEntries = collectRuleSelectorEntriesByContext(registrySource);
  const duplicateContexts = findDuplicateSelectorContexts(selectorEntries)
    .filter(duplicate => REGISTRY_ACTION_FILTER_DUPLICATE_CHECKS.includes(duplicate.selector));

  for (const duplicate of duplicateContexts) {
    err(
      `${registryRelPath} contains duplicate targeted action/filter selector "${duplicate.selector}" ` +
      `in context "${duplicate.context}" at lines ${duplicate.lines.join(', ')}`
    );
  }

  if (duplicateContexts.length === 0) {
    ok('components/registry.css contains no duplicate targeted action/filter selectors in the same at-rule context');
  }
}

if (!existsSync(SUBJECT_CARD_CSS)) {
  err(`pages/subject-card.css not found: ${relative(REPO_ROOT, SUBJECT_CARD_CSS)}`);
} else {
  const subjectCardRelPath = relative(ASSETS_CSS, SUBJECT_CARD_CSS).replace(/\\/g, '/');
  const subjectCardSource  = stripCssBlockComments(readFileSync(SUBJECT_CARD_CSS, 'utf8'));
  const selectorEntries    = collectRuleSelectorEntriesByContext(subjectCardSource);
  const duplicateContexts  = findDuplicateSelectorContexts(selectorEntries);

  for (const duplicate of duplicateContexts) {
    err(
      `${subjectCardRelPath} contains duplicate selector "${duplicate.selector}" ` +
      `in context "${duplicate.context}" at lines ${duplicate.lines.join(', ')}`
    );
  }

  if (duplicateContexts.length === 0) {
    ok('pages/subject-card.css contains no duplicate selector definitions in the same at-rule context');
  }
}

if (!existsSync(FILTERS_CSS)) {
  err(`components/filters.css not found: ${relative(REPO_ROOT, FILTERS_CSS)}`);
} else {
  const filtersRelPath = relative(ASSETS_CSS, FILTERS_CSS).replace(/\\/g, '/');
  const filtersSource  = stripCssBlockComments(readFileSync(FILTERS_CSS, 'utf8'));
  const filtersSelectors = collectTopLevelRuleSelectors(filtersSource);
  let hasDuplicateFilterSelector = false;

  for (const selector of FILTERS_DUPLICATE_SELECTOR_CHECKS) {
    const count = filtersSelectors.filter(found => found === selector).length;
    if (count > 1) {
      err(`${filtersRelPath} contains ${count} top-level definitions for "${selector}"`);
      hasDuplicateFilterSelector = true;
    }
  }

  if (!hasDuplicateFilterSelector) {
    ok('components/filters.css contains no duplicate top-level filter-panel selector definitions');
  }
}

if (!existsSync(ADDRESS_CSS)) {
  err(`components/address.css not found: ${relative(REPO_ROOT, ADDRESS_CSS)}`);
} else {
  const addressRelPath = relative(ASSETS_CSS, ADDRESS_CSS).replace(/\\/g, '/');
  const addressSource  = stripCssBlockComments(readFileSync(ADDRESS_CSS, 'utf8'));
  const addressSelectors = collectTopLevelRuleSelectors(addressSource);
  let hasDuplicateAddressLastChild = false;

  for (const selector of ADDRESS_LAST_CHILD_DUPLICATE_CHECKS) {
    const count = addressSelectors.filter(found => found === selector).length;
    if (count > 1) {
      err(`${addressRelPath} contains ${count} top-level definitions for "${selector}"`);
      hasDuplicateAddressLastChild = true;
    }
  }

  if (!hasDuplicateAddressLastChild) {
    ok('components/address.css contains no duplicate top-level address-row :last-child selector definitions');
  }
}

if (!existsSync(CONTRACT_WIZARD_CSS)) {
  err(`pages/contract-wizard.css not found: ${relative(REPO_ROOT, CONTRACT_WIZARD_CSS)}`);
} else {
  const cwRelPath  = relative(ASSETS_CSS, CONTRACT_WIZARD_CSS).replace(/\\/g, '/');
  const cwSource   = stripCssBlockComments(readFileSync(CONTRACT_WIZARD_CSS, 'utf8'));
  const cwTopLevel = collectTopLevelRuleSelectors(cwSource);
  let hasBareFormCard = false;

  for (const prelude of cwTopLevel) {
    for (const part of splitSelectorList(prelude)) {
      if (part === '.crm-form-card') {
        err(
          `${cwRelPath} contains bare top-level ".crm-form-card" selector — ` +
          `must be scoped (e.g. .crm-page[data-page="contract-wizard"] .crm-form-card)`
        );
        hasBareFormCard = true;
        break;
      }
    }
    if (hasBareFormCard) break;
  }

  if (!hasBareFormCard) {
    ok('pages/contract-wizard.css contains no bare top-level .crm-form-card selector');
  }
}

if (!existsSync(COMPLIANCE_CSS)) {
  err(`pages/compliance.css not found: ${relative(REPO_ROOT, COMPLIANCE_CSS)}`);
} else {
  const complianceRelPath = relative(ASSETS_CSS, COMPLIANCE_CSS).replace(/\\/g, '/');
  const complianceSource  = stripCssBlockComments(readFileSync(COMPLIANCE_CSS, 'utf8'));
  const complianceEntries = collectRuleSelectorEntriesByContext(complianceSource);
  let hasBareDecisionPanel = false;

  for (const entry of complianceEntries) {
    for (const part of splitSelectorList(entry.selector)) {
      if (part === '.crm-decision-panel') {
        err(
          `${complianceRelPath} contains bare ".crm-decision-panel" selector ` +
          `(context: "${entry.context}", line ${entry.line}) — ` +
          `must be scoped, e.g. .crm-page[data-page="compliance-card"] .crm-decision-panel`
        );
        hasBareDecisionPanel = true;
      }
    }
  }

  if (!hasBareDecisionPanel) {
    ok('pages/compliance.css contains no bare .crm-decision-panel selector');
  }
}

// G-extra 0: No same-context responsive duplicates in pages/requests.css
const REQUESTS_RESPONSIVE_DUPLICATE_CHECKS = [
  '.crm-page[data-page="requests"] .crm-request-create-actions',
  '.crm-page[data-page="requests"] .crm-requests-actions',
];

if (!existsSync(REQUESTS_CSS)) {
  err(`pages/requests.css not found: ${relative(REPO_ROOT, REQUESTS_CSS)}`);
} else {
  const requestsRelPath = relative(ASSETS_CSS, REQUESTS_CSS).replace(/\\/g, '/');
  const requestsSource  = stripCssBlockComments(readFileSync(REQUESTS_CSS, 'utf8'));
  const requestsEntries = collectRuleSelectorEntriesByContext(requestsSource);
  const duplicateContexts = findDuplicateSelectorContexts(requestsEntries)
    .filter(d => REQUESTS_RESPONSIVE_DUPLICATE_CHECKS.includes(d.selector));

  for (const duplicate of duplicateContexts) {
    err(
      `${requestsRelPath} contains duplicate selector "${duplicate.selector}" ` +
      `in context "${duplicate.context}" at lines ${duplicate.lines.join(', ')}`
    );
  }

  if (duplicateContexts.length === 0) {
    ok('pages/requests.css contains no duplicate responsive selector definitions in the same at-rule context');
  }
}

// G-extra 1: No duplicate top-level .uk-select in components/forms.css
if (!existsSync(FORMS_CSS)) {
  err(`components/forms.css not found: ${relative(REPO_ROOT, FORMS_CSS)}`);
} else {
  const formsRelPath  = relative(ASSETS_CSS, FORMS_CSS).replace(/\\/g, '/');
  const formsSource   = stripCssBlockComments(readFileSync(FORMS_CSS, 'utf8'));
  const formsSelectors = collectTopLevelRuleSelectors(formsSource);
  const ukSelectCount  = formsSelectors.filter(s => s === '.uk-select').length;
  if (ukSelectCount > 1) {
    err(`${formsRelPath} contains ${ukSelectCount} top-level ".uk-select" definitions — expected exactly 1`);
  } else {
    ok('components/forms.css contains no duplicate top-level .uk-select definitions');
  }
}

// G-extra 2: No duplicate top-level body[data-page="subject-edit"] .uk-textarea.crm-input in pages/subject-edit.css
if (!existsSync(SUBJECT_EDIT_CSS)) {
  err(`pages/subject-edit.css not found: ${relative(REPO_ROOT, SUBJECT_EDIT_CSS)}`);
} else {
  const subjectEditRelPath  = relative(ASSETS_CSS, SUBJECT_EDIT_CSS).replace(/\\/g, '/');
  const subjectEditSource   = stripCssBlockComments(readFileSync(SUBJECT_EDIT_CSS, 'utf8'));
  const subjectEditSelectors = collectTopLevelRuleSelectors(subjectEditSource);
  const textareaBridgeCount  = subjectEditSelectors.filter(
    s => s === 'body[data-page="subject-edit"] .uk-textarea.crm-input'
  ).length;
  if (textareaBridgeCount > 1) {
    err(
      `${subjectEditRelPath} contains ${textareaBridgeCount} top-level ` +
      `"body[data-page=\\"subject-edit\\"] .uk-textarea.crm-input" definitions — expected exactly 1`
    );
  } else {
    ok('pages/subject-edit.css contains no duplicate top-level body[data-page="subject-edit"] .uk-textarea.crm-input definitions');
  }
}

// G-extra 3: No broad UIkit/form/button focus selectors remaining in components/cards.css
if (existsSync(CARDS_CSS)) {
  const cardsRelPath2   = relative(ASSETS_CSS, CARDS_CSS).replace(/\\/g, '/');
  const cardsSource2    = stripCssBlockComments(readFileSync(CARDS_CSS, 'utf8'));
  const cardsSelectors2 = collectTopLevelRuleSelectors(cardsSource2);
  let hasForbiddenFocus = false;
  for (const selector of CARDS_FORBIDDEN_FOCUS_SELECTORS) {
    if (cardsSelectors2.includes(selector)) {
      err(`${cardsRelPath2} contains broad focus selector "${selector}" — should be owned by the correct component/layout file`);
      hasForbiddenFocus = true;
    }
  }
  if (!hasForbiddenFocus) {
    ok('components/cards.css contains no broad UIkit/form/button focus selectors');
  }
}

// ── Section H: Summary ───────────────────────────────────────────────────────

section('H. Summary');

console.log(`  Pages checked           : ${htmlPageCount}`);
console.log(`  CSS imports in manifest : ${manifestImports.length}`);
const bundleMarkerCount = existsSync(BUNDLE)
  ? [...readFileSync(BUNDLE, 'utf8').matchAll(/\/\* ===== [a-z][\w/-]*\.css ===== \*\//g)].length
  : 0;
console.log(`  Bundle section markers  : ${bundleMarkerCount}`);
console.log(`  UMI packs               : ${[UMI_P0_DIR, UMI_P1_DIR].filter(existsSync).length} (of 2)`);
console.log(`  Local assets checked    : ${assetChecked}`);
console.log(`  Errors                  : ${errors}`);
console.log(`  Warnings                : ${warnings}`);

if (errors === 0) {
  console.log('\n✓ Validation passed.');
} else {
  console.error(`\n✗ Validation FAILED with ${errors} error(s).`);
}

process.exit(errors > 0 ? 1 : 0);
