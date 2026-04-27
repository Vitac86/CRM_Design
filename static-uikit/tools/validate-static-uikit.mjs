#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve('static-uikit');
const pagesDir = path.join(rootDir, 'pages');
const umiP0Dir = path.join(rootDir, 'umi-p0');
const umiPagesDir = path.join(umiP0Dir, 'pages');
const manifestPath = path.join(umiP0Dir, 'manifest.json');
const integrationInventoryPath = path.join(umiP0Dir, 'integration-inventory.json');
const scanDirs = [
  pagesDir,
  path.join(rootDir, 'partials'),
  path.join(rootDir, 'assets', 'js'),
  umiP0Dir,
];
const textExt = new Set(['.html', '.js', '.mjs', '.css', '.md', '.json']);

const forbiddenExternalPattern = /(https?:\/\/|cdn|fonts\.googleapis|fonts\.gstatic|unpkg|jsdelivr|cloudflare|analytics|gtag|tagmanager|sentry|amplitude|mixpanel)/i;
const forbiddenApiPattern = /(fetch\(|XMLHttpRequest|axios|WebSocket|EventSource|localStorage|sessionStorage|history\.pushState)/;

const requiredP0Templates = [
  'layout/base.html',
  'partials/sidebar.html',
  'partials/topbar.html',
  'partials/page-header.html',
  'partials/filter-panel.html',
  'partials/table.html',
  'partials/badge.html',
  'partials/action-row.html',
  'partials/empty-state.html',
  'pages/dashboard.html',
  'pages/subjects.html',
  'pages/subject-card.html',
  'pages/requests.html',
  'pages/compliance.html',
  'pages/compliance-card.html',
  'pages/trading.html',
  'pages/error.html',
];

const requiredInventoryArrays = ['routes', 'entities', 'actions', 'forms', 'filters', 'statuses'];
const errors = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

function rel(file) {
  return path.relative(process.cwd(), file).replaceAll('\\', '/');
}

function addError(file, message, sample = '') {
  const suffix = sample ? ` :: ${sample}` : '';
  errors.push(`${rel(file)}: ${message}${suffix}`);
}

function parseJsonFile(file, label) {
  if (!fs.existsSync(file)) {
    addError(file, `${label} is missing`);
    return null;
  }
  const content = fs.readFileSync(file, 'utf8');
  try {
    return JSON.parse(content);
  } catch (error) {
    addError(file, `${label} is not valid JSON`, error.message);
    return null;
  }
}

function ensureManifestFilesExist(manifest, manifestFile) {
  if (!manifest || typeof manifest !== 'object') return;

  if (manifest.runtime !== false) {
    addError(manifestFile, 'manifest.runtime must be false');
  }
  if (manifest.buildStep !== false) {
    addError(manifestFile, 'manifest.buildStep must be false');
  }

  const layoutPath = manifest.layout && typeof manifest.layout.base === 'string' ? manifest.layout.base : null;
  if (!layoutPath) {
    addError(manifestFile, 'manifest.layout.base is required');
  } else if (!fs.existsSync(path.join(umiP0Dir, layoutPath))) {
    addError(manifestFile, 'manifest layout/base file does not exist', layoutPath);
  }

  if (!Array.isArray(manifest.partials)) {
    addError(manifestFile, 'manifest.partials must be an array');
  } else {
    manifest.partials.forEach((partialPath) => {
      if (typeof partialPath !== 'string') {
        addError(manifestFile, 'manifest.partials entries must be strings');
        return;
      }
      if (!fs.existsSync(path.join(umiP0Dir, partialPath))) {
        addError(manifestFile, 'manifest partial file does not exist', partialPath);
      }
    });
  }

  if (!Array.isArray(manifest.pages)) {
    addError(manifestFile, 'manifest.pages must be an array');
  } else {
    manifest.pages.forEach((pageItem, idx) => {
      if (!pageItem || typeof pageItem !== 'object') {
        addError(manifestFile, `manifest.pages[${idx}] must be an object`);
        return;
      }

      if (typeof pageItem.template !== 'string') {
        addError(manifestFile, `manifest.pages[${idx}].template is required`);
      } else if (!fs.existsSync(path.join(umiP0Dir, pageItem.template))) {
        addError(manifestFile, `manifest page template does not exist`, pageItem.template);
      }

      if (typeof pageItem.reference !== 'string') {
        addError(manifestFile, `manifest.pages[${idx}].reference is required`);
      } else {
        const referencePath = path.resolve(umiP0Dir, pageItem.reference);
        if (!fs.existsSync(referencePath)) {
          addError(manifestFile, `manifest page reference does not exist`, pageItem.reference);
        }
      }
    });
  }
}

function validateIntegrationInventory(inventory, inventoryFile) {
  if (!inventory || typeof inventory !== 'object') return;
  for (const key of requiredInventoryArrays) {
    if (!Array.isArray(inventory[key])) {
      addError(inventoryFile, `integration inventory field must be an array`, key);
    }
  }
}

function validateRequiredTemplates() {
  for (const templatePath of requiredP0Templates) {
    const absolute = path.join(umiP0Dir, templatePath);
    if (!fs.existsSync(absolute)) {
      addError(absolute, 'required P0 template/partial is missing');
    }
  }
}

const pageFiles = fs.existsSync(pagesDir) ? fs.readdirSync(pagesDir).filter((f) => f.endsWith('.html')) : [];
const umiPageFiles = fs.existsSync(umiPagesDir) ? fs.readdirSync(umiPagesDir).filter((f) => f.endsWith('.html')) : [];
const knownHtmlTargets = new Set([...pageFiles, ...umiPageFiles]);

const manifest = parseJsonFile(manifestPath, 'manifest.json');
ensureManifestFilesExist(manifest, manifestPath);

const inventory = parseJsonFile(integrationInventoryPath, 'integration-inventory.json');
validateIntegrationInventory(inventory, integrationInventoryPath);

validateRequiredTemplates();

const allFiles = scanDirs.flatMap((dir) => walk(dir)).filter((file) => textExt.has(path.extname(file)));

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');

  const lines = content.split(/\r?\n/);
  lines.forEach((line, idx) => {
    if (forbiddenExternalPattern.test(line)) {
      addError(file, `forbidden external/CDN/analytics pattern on line ${idx + 1}`, line.trim());
    }
    if (forbiddenApiPattern.test(line)) {
      addError(file, `forbidden API pattern on line ${idx + 1}`, line.trim());
    }
  });

  if (file.endsWith('.html')) {
    const dataHrefMatches = content.matchAll(/\bdata-href="([^"]+)"/g);
    for (const m of dataHrefMatches) {
      const target = m[1];
      if (/^[a-z]+:/i.test(target) || target.startsWith('#') || target.startsWith('/') || target.includes('{{')) continue;
      if (target.endsWith('.html') && !knownHtmlTargets.has(path.basename(target))) {
        addError(file, 'data-href target does not exist in static-uikit/pages or static-uikit/umi-p0/pages', target);
      }
    }

    const hrefMatches = content.matchAll(/\bhref="([^"]+)"/g);
    for (const m of hrefMatches) {
      const target = m[1];
      if (!target.endsWith('.html')) continue;
      if (/^[a-z]+:/i.test(target) || target.startsWith('/') || target.startsWith('#') || target.includes('{{')) continue;
      if (!knownHtmlTargets.has(path.basename(target))) {
        addError(file, 'href target does not exist in static-uikit/pages or static-uikit/umi-p0/pages', target);
      }
    }

    const formRegex = /<form\b([^>]*)>([\s\S]*?)<\/form>/g;
    for (const formMatch of content.matchAll(formRegex)) {
      const attrs = formMatch[1];
      const formInner = formMatch[2];
      if (!/\baction=/.test(attrs)) addError(file, 'form missing action attribute');
      if (!/\bmethod=/.test(attrs)) addError(file, 'form missing method attribute');
      if (!/\bdata-form=/.test(attrs)) addError(file, 'form missing data-form attribute');
      if (!/\bdata-action=/.test(attrs)) addError(file, 'form missing data-action attribute');

      const fieldRegex = /<(input|select|textarea)\b([^>]*)>/g;
      for (const fieldMatch of formInner.matchAll(fieldRegex)) {
        const tag = fieldMatch[1];
        const fieldAttrs = fieldMatch[2];
        const type = (fieldAttrs.match(/\btype="([^"]+)"/) || [])[1] || '';
        if (['submit', 'reset', 'button'].includes(type.toLowerCase())) continue;
        if (!/\bname=/.test(fieldAttrs)) {
          addError(file, `<${tag}> inside form is missing name attribute`, fieldMatch[0]);
        }
      }
    }
  }
}

for (const page of pageFiles) {
  const file = path.join(pagesDir, page);
  const content = fs.readFileSync(file, 'utf8');
  if (!/<body[^>]*\bdata-page="[^"]+"/i.test(content)) {
    addError(file, 'missing body[data-page]');
  }
  if (!/<section[^>]*class="[^"]*crm-page[^"]*"[^>]*\bdata-page="[^"]+"/i.test(content)) {
    addError(file, 'missing section.crm-page[data-page]');
  }
}

for (const page of umiPageFiles) {
  const file = path.join(umiPagesDir, page);
  const content = fs.readFileSync(file, 'utf8');

  if (!/<section[^>]*class="[^"]*crm-page[^"]*"[^>]*\bdata-page="[^"]+"/i.test(content)) {
    addError(file, 'missing section.crm-page[data-page] in umi-p0 page template');
  }

  const firstLines = content.split(/\r?\n/).slice(0, 12).join('\n');
  if (!/<!--\s*Reference:\s*static-uikit\/pages\/[^\n]+-->/i.test(firstLines)) {
    addError(file, 'missing near-top reference comment <!-- Reference: static-uikit/pages/... -->');
  }

  if (!/<!--\s*UMI TODO:/i.test(content)) {
    addError(file, 'missing UMI TODO comment <!-- UMI TODO: ... -->');
  }
}

if (errors.length) {
  console.error(`❌ static-uikit validation failed: ${errors.length} issue(s)`);
  errors.forEach((error, idx) => console.error(`${idx + 1}. ${error}`));
  process.exit(1);
}

console.log('✅ static-uikit validation passed');
