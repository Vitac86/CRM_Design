#!/usr/bin/env node
/**
 * build-css-bundle.mjs
 *
 * Concatenates all CSS files imported by crm-static.css into a single
 * distribution bundle (crm-static.bundle.css).
 *
 * - Preserves import order from the manifest exactly.
 * - Inserts section markers: /* ===== base/tokens.css ===== *\/
 * - Rewrites relative url() references so paths resolve correctly
 *   from the bundle's location (assets/css/) rather than each
 *   source file's subdirectory.
 * - Does NOT minify, reorder, or transform any CSS.
 *
 * Usage:
 *   node static-uikit/tools/build-css-bundle.mjs          # build
 *   node static-uikit/tools/build-css-bundle.mjs --check  # verify bundle is current
 *
 * Or via npm:
 *   npm run static:uikit:bundle
 *   npm run static:uikit:bundle:check
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const CHECK_MODE = process.argv.includes('--check');

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// Paths relative to the repo root (two levels up from tools/)
const REPO_ROOT   = resolve(__dirname, '../..');
const MANIFEST    = resolve(REPO_ROOT, 'static-uikit/assets/css/crm-static.css');
const BUNDLE_OUT  = resolve(REPO_ROOT, 'static-uikit/assets/css/crm-static.bundle.css');
const MANIFEST_DIR = dirname(MANIFEST);
const BUNDLE_DIR   = dirname(BUNDLE_OUT);

const BUNDLE_HEADER = `/*!
 * Инвестика CRM static UI — generated CSS bundle
 * Runtime convenience artifact for UMI/PHP.
 * Source of truth: crm-static.css plus modular CSS files.
 * Do not edit this bundle manually for feature/style work.
 * Regenerate the bundle after modular CSS changes.
 */
`;

// Match both @import url("...") and @import "..." syntaxes.
// Captures the path value (group 1).
const IMPORT_URL_RE   = /^\s*@import\s+url\(\s*['"]?([^)'"]+?)['"]?\s*\)\s*;/;
const IMPORT_PLAIN_RE = /^\s*@import\s+['"]([^'"]+)['"]\s*;/;

/**
 * Rewrites every relative url(...) in a CSS string so the reference
 * resolves correctly from BUNDLE_DIR instead of sourceDir.
 */
function rewriteUrls(content, sourceDir) {
  return content.replace(
    /url\(\s*(['"]?)([^)'"]*?)\1\s*\)/g,
    (_match, quote, rawUrl) => {
      const url = rawUrl.trim();
      // Leave data URIs and absolute URLs unchanged.
      if (
        url === '' ||
        url.startsWith('data:') ||
        url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('//')  ||
        url.startsWith('/')
      ) {
        return _match;
      }
      const absPath  = resolve(sourceDir, url);
      const relPath  = relative(BUNDLE_DIR, absPath).replace(/\\/g, '/');
      return `url(${quote}${relPath}${quote})`;
    }
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

if (!existsSync(MANIFEST)) {
  console.error(`ERROR: manifest not found: ${MANIFEST}`);
  process.exit(1);
}

const manifestSource = readFileSync(MANIFEST, 'utf8');
const manifestLines  = manifestSource.split('\n');

// Count the total number of @import statements in the manifest.
// Used to verify no imports were silently skipped.
const expectedSections = manifestLines.filter(
  line => IMPORT_URL_RE.test(line) || IMPORT_PLAIN_RE.test(line)
).length;

const chunks = [BUNDLE_HEADER];
let sectionCount = 0;
let warnNonImport = false;

for (const line of manifestLines) {
  const m = IMPORT_URL_RE.exec(line) || IMPORT_PLAIN_RE.exec(line);

  if (m) {
    const importPath = m[1].trim();
    const sourcePath = resolve(MANIFEST_DIR, importPath);
    const label      = importPath.replace(/^\.\//, ''); // e.g. "base/fonts.css"
    const sourceDir  = dirname(sourcePath);

    if (!existsSync(sourcePath)) {
      console.error(`ERROR: imported file not found: ${importPath}`);
      console.error('Build aborted — fix missing import before regenerating the bundle.');
      process.exit(1);
    }

    let content = readFileSync(sourcePath, 'utf8');
    content = rewriteUrls(content, sourceDir);

    chunks.push(`\n/* ===== ${label} ===== */\n${content}`);
    sectionCount++;
    continue;
  }

  // Non-import, non-blank, non-comment lines in the manifest are unexpected.
  const trimmed = line.trim();
  if (
    trimmed !== '' &&
    !trimmed.startsWith('/*') &&
    !trimmed.startsWith('*') &&
    !trimmed.startsWith('//')
  ) {
    console.warn(`WARNING: non-@import rule in manifest — included as-is: ${line.trim()}`);
    chunks.push(line + '\n');
    warnNonImport = true;
  }
}

if (warnNonImport) {
  console.warn(
    'WARNING: crm-static.css contains non-@import rules. ' +
    'Desired state: @import directives only.'
  );
}

if (sectionCount !== expectedSections) {
  console.error(
    `ERROR: section count mismatch — expected ${expectedSections} imports, inlined ${sectionCount}.`
  );
  console.error('Build aborted — bundle was not written.');
  process.exit(1);
}

const bundleContent  = chunks.join('');
const bundleRelative = relative(process.cwd(), BUNDLE_OUT).replace(/\\/g, '/');
const sizeKB         = (Buffer.byteLength(bundleContent, 'utf8') / 1024).toFixed(1);

if (CHECK_MODE) {
  if (!existsSync(BUNDLE_OUT)) {
    console.error('ERROR (--check): bundle file does not exist.');
    console.error(`  Run: npm run static:uikit:bundle`);
    process.exit(1);
  }
  const currentContent = readFileSync(BUNDLE_OUT, 'utf8');
  if (bundleContent === currentContent) {
    console.log(`✓ Bundle is up to date (${sectionCount} / ${expectedSections} sections, ${sizeKB} KB)`);
    process.exit(0);
  } else {
    console.error('ERROR: bundle is stale — source CSS has changed since last bundle generation.');
    console.error(`  Run: npm run static:uikit:bundle`);
    process.exit(1);
  }
}

writeFileSync(BUNDLE_OUT, bundleContent, 'utf8');
console.log(`✓ Bundle written → ${bundleRelative}`);
console.log(`  Sections inlined : ${sectionCount} / ${expectedSections}`);
console.log(`  Output size      : ${sizeKB} KB`);
