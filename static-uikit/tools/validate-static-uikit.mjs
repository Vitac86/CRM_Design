#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve('static-uikit');
const pagesDir = path.join(rootDir, 'pages');
const launcherFile = path.join(rootDir, 'index.html');

const packs = [
  {
    name: 'umi-p0',
    dir: path.join(rootDir, 'umi-p0'),
    requiredTemplates: [
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
      'pages/error.html'
    ]
  },
  {
    name: 'umi-p1',
    dir: path.join(rootDir, 'umi-p1'),
    requiredTemplates: [
      'pages/contract-wizard.html',
      'pages/brokerage.html',
      'pages/trust-management.html',
      'pages/agents.html',
      'pages/middle-office-clients.html',
      'pages/middle-office-reports.html',
      'pages/depository.html',
      'pages/back-office.html',
      'pages/trading-card.html',
      'pages/administration.html',
      'pages/archive.html',
      'partials/report-split-view.html',
      'partials/report-delivery-status.html',
      'partials/contract-form-section.html',
      'partials/admin-section-card.html',
      'partials/archive-table.html',
      'partials/trading-terminal-list.html'
    ]
  }
];

const scanDirs = [
  pagesDir,
  path.join(rootDir, 'partials'),
  path.join(rootDir, 'assets', 'js'),
  ...packs.map((pack) => pack.dir)
];
const textExt = new Set(['.html', '.js', '.mjs', '.css', '.md', '.json']);

const forbiddenExternalPattern = /(https?:\/\/(?!localhost(?::\d+)?|127\.0\.0\.1(?::\d+)?|\{\{)|fonts\.googleapis|fonts\.gstatic|unpkg|jsdelivr|cloudflare|googletagmanager|gtag\(|sentry|amplitude|mixpanel)/i;
const forbiddenApiPattern = /(fetch\(|new\s+XMLHttpRequest|axios\(|new\s+WebSocket|new\s+EventSource|localStorage\.|sessionStorage\.|history\.pushState)/;

const requiredInventoryArrays = ['routes', 'entities', 'actions', 'forms', 'filters', 'statuses'];
const hookKeys = {
  'data-entity': 'entities',
  'data-action': 'actions',
  'data-form': 'forms',
  'data-filter': 'filters',
  'data-status': 'statuses'
};

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

function ensureManifestFilesExist(manifest, manifestFile, packDir, packName) {
  if (!manifest || typeof manifest !== 'object') return;

  if (manifest.runtime !== false) addError(manifestFile, `${packName}: manifest.runtime must be false`);
  if (manifest.buildStep !== false) addError(manifestFile, `${packName}: manifest.buildStep must be false`);

  if (packName === 'umi-p0') {
    const layoutPath = manifest.layout && typeof manifest.layout.base === 'string' ? manifest.layout.base : null;
    if (!layoutPath) addError(manifestFile, 'umi-p0: manifest.layout.base is required');
    else if (!fs.existsSync(path.join(packDir, layoutPath))) addError(manifestFile, 'umi-p0: manifest layout/base file does not exist', layoutPath);
  }

  if (!Array.isArray(manifest.partials)) {
    addError(manifestFile, `${packName}: manifest.partials must be an array`);
  } else {
    manifest.partials.forEach((partialPath) => {
      if (typeof partialPath !== 'string') {
        addError(manifestFile, `${packName}: manifest.partials entries must be strings`);
        return;
      }
      if (!fs.existsSync(path.join(packDir, partialPath))) addError(manifestFile, `${packName}: manifest partial file does not exist`, partialPath);
    });
  }

  if (!Array.isArray(manifest.pages)) {
    addError(manifestFile, `${packName}: manifest.pages must be an array`);
  } else {
    manifest.pages.forEach((pageItem, idx) => {
      if (!pageItem || typeof pageItem !== 'object') {
        addError(manifestFile, `${packName}: manifest.pages[${idx}] must be an object`);
        return;
      }

      if (typeof pageItem.template !== 'string') addError(manifestFile, `${packName}: manifest.pages[${idx}].template is required`);
      else if (!fs.existsSync(path.join(packDir, pageItem.template))) addError(manifestFile, `${packName}: manifest page template does not exist`, pageItem.template);

      if (typeof pageItem.reference !== 'string') addError(manifestFile, `${packName}: manifest.pages[${idx}].reference is required`);
      else {
        const referencePath = path.resolve(packDir, pageItem.reference);
        if (!fs.existsSync(referencePath)) addError(manifestFile, `${packName}: manifest page reference does not exist`, pageItem.reference);
      }
    });
  }
}

function validateIntegrationInventory(inventory, inventoryFile, packName) {
  if (!inventory || typeof inventory !== 'object') return false;
  let isValid = true;
  for (const key of requiredInventoryArrays) {
    if (!Array.isArray(inventory[key])) {
      addError(inventoryFile, `${packName}: integration inventory field must be an array`, key);
      isValid = false;
    }
  }
  return isValid;
}

function validateRequiredTemplates(pack) {
  for (const templatePath of pack.requiredTemplates) {
    const absolute = path.join(pack.dir, templatePath);
    if (!fs.existsSync(absolute)) addError(absolute, `${pack.name}: required template/partial is missing`);
  }
}

function collectPackHtmlFiles(pack) {
  const files = [];
  for (const dirName of ['pages', 'partials', 'layout']) {
    const dirPath = path.join(pack.dir, dirName);
    if (!fs.existsSync(dirPath)) continue;
    files.push(...walk(dirPath).filter((file) => file.endsWith('.html')));
  }
  return files;
}

function validatePackHooks(pack, inventory) {
  const packHtmlFiles = collectPackHtmlFiles(pack);

  for (const file of packHtmlFiles) {
    const content = fs.readFileSync(file, 'utf8');

    for (const [attrName, inventoryKey] of Object.entries(hookKeys)) {
      const attrRegex = new RegExp(`\\b${attrName}="([^"]*)"`, 'g');
      for (const match of content.matchAll(attrRegex)) {
        const value = match[1].trim();

        if (!value) {
          addError(file, `${attrName} has empty value`);
          continue;
        }

        if (/{{[\s\S]*?}}/.test(value)) continue;

        if (!inventory[inventoryKey].includes(value)) {
          addError(file, `${attrName} "${value}" is missing from ${pack.name} integration-inventory.${inventoryKey}`);
        }
      }
    }
  }
}

const pageFiles = fs.existsSync(pagesDir) ? fs.readdirSync(pagesDir).filter((f) => f.endsWith('.html')) : [];
const packPageFiles = packs.flatMap((pack) => {
  const packPagesDir = path.join(pack.dir, 'pages');
  if (!fs.existsSync(packPagesDir)) return [];
  return fs.readdirSync(packPagesDir).filter((f) => f.endsWith('.html')).map((file) => ({ packName: pack.name, file: path.join(packPagesDir, file) }));
});
const knownHtmlTargets = new Set([...pageFiles, ...packPageFiles.map(({ file }) => path.basename(file))]);

for (const pack of packs) {
  const manifestPath = path.join(pack.dir, 'manifest.json');
  const inventoryPath = path.join(pack.dir, 'integration-inventory.json');

  const manifest = parseJsonFile(manifestPath, 'manifest.json');
  ensureManifestFilesExist(manifest, manifestPath, pack.dir, pack.name);

  const inventory = parseJsonFile(inventoryPath, 'integration-inventory.json');
  const inventoryValid = validateIntegrationInventory(inventory, inventoryPath, pack.name);
  if (inventoryValid) validatePackHooks(pack, inventory);

  validateRequiredTemplates(pack);
}

const allFiles = scanDirs.flatMap((dir) => walk(dir)).filter((file) => textExt.has(path.extname(file)));
if (fs.existsSync(launcherFile)) allFiles.push(launcherFile);

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');

  const lines = content.split(/\r?\n/);
  lines.forEach((line, idx) => {
    if (forbiddenExternalPattern.test(line)) addError(file, `forbidden external/CDN/analytics pattern on line ${idx + 1}`, line.trim());
    if (forbiddenApiPattern.test(line)) addError(file, `forbidden API pattern on line ${idx + 1}`, line.trim());
  });

  if (file.endsWith('.html')) {
    const dataHrefMatches = content.matchAll(/\bdata-href="([^"]+)"/g);
    for (const m of dataHrefMatches) {
      const target = m[1];
      if (/^[a-z]+:/i.test(target) || target.startsWith('#') || target.startsWith('/') || target.includes('{{')) continue;
      if (target.endsWith('.html') && !knownHtmlTargets.has(path.basename(target))) addError(file, 'data-href target does not exist in static-uikit/pages or umi pack pages', target);
    }

    const hrefMatches = content.matchAll(/\bhref="([^"]+)"/g);
    for (const m of hrefMatches) {
      const target = m[1];
      if (!target.endsWith('.html')) continue;
      if (/^[a-z]+:/i.test(target) || target.startsWith('/') || target.startsWith('#') || target.includes('{{')) continue;

      if (target.includes('/')) {
        const resolved = path.resolve(path.dirname(file), target);
        if (!fs.existsSync(resolved)) addError(file, 'href target path does not exist', target);
        continue;
      }

      if (!knownHtmlTargets.has(path.basename(target))) addError(file, 'href target does not exist in static-uikit/pages or umi pack pages', target);
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
        if (!/\bname=/.test(fieldAttrs)) addError(file, `<${tag}> inside form is missing name attribute`, fieldMatch[0]);
      }
    }
  }
}


function validateStaticUikitLauncher() {
  if (!fs.existsSync(launcherFile)) {
    addError(launcherFile, 'static-uikit/index.html is missing');
    return;
  }

  const content = fs.readFileSync(launcherFile, 'utf8');

  if (!/<body[^>]*\bdata-page="static-uikit-index"/i.test(content)) {
    addError(launcherFile, 'missing body[data-page="static-uikit-index"]');
  }

  const hrefMatches = content.matchAll(/\bhref="([^"]+)"/g);
  for (const m of hrefMatches) {
    const target = m[1].trim();
    if (!target || target.startsWith('#') || target.startsWith('{{')) continue;
    if (/^[a-z]+:/i.test(target) || target.startsWith('//')) {
      addError(launcherFile, 'contains external URL in href', target);
      continue;
    }

    if (/^(pages\/.*\.html|umi-p0\/.+|umi-p1\/.+)/.test(target)) {
      const absolute = path.resolve(rootDir, target);
      if (!fs.existsSync(absolute)) addError(launcherFile, 'launcher href target does not exist', target);
    }
  }

  const srcMatches = content.matchAll(/\bsrc="([^"]+)"/g);
  for (const m of srcMatches) {
    const target = m[1].trim();
    if (!target || target.startsWith('{{')) continue;
    if (/^[a-z]+:/i.test(target) || target.startsWith('//')) {
      addError(launcherFile, 'contains external URL in src', target);
    }
  }

  const lines = content.split(/\r?\n/);
  lines.forEach((line, idx) => {
    if (forbiddenExternalPattern.test(line)) addError(launcherFile, `forbidden external/CDN pattern on line ${idx + 1}`, line.trim());
    if (forbiddenApiPattern.test(line)) addError(launcherFile, `forbidden API pattern on line ${idx + 1}`, line.trim());
  });
}

validateStaticUikitLauncher();

for (const page of pageFiles) {
  const file = path.join(pagesDir, page);
  const content = fs.readFileSync(file, 'utf8');
  if (!/<body[^>]*\bdata-page="[^"]+"/i.test(content)) addError(file, 'missing body[data-page]');
  if (!/<section[^>]*class="[^"]*crm-page[^"]*"[^>]*\bdata-page="[^"]+"/i.test(content)) addError(file, 'missing section.crm-page[data-page]');
  if (!/<input[^>]*\bname="global-search"/i.test(content)) addError(file, 'missing topbar global search input[name="global-search"]');
  if (!/<button[^>]*\bdata-sidebar-toggle\b/i.test(content)) addError(file, 'missing sidebar toggle button[data-sidebar-toggle]');

  const buttonRegex = /<button\b([^>]*)>/gi;
  for (const match of content.matchAll(buttonRegex)) {
    const attrs = match[1];
    if (!/\btype="[^"]+"/i.test(attrs)) {
      addError(file, '<button> is missing required type attribute', match[0]);
    }
  }

  const elementRegex = /<([a-z0-9-]+)\b([^>]*)>/gi;
  for (const match of content.matchAll(elementRegex)) {
    const attrs = match[2];
    const classValue = (attrs.match(/\bclass="([^"]+)"/i) || [])[1] || '';
    const classTokens = classValue.split(/\s+/).filter(Boolean);
    if (!classTokens.includes('crm-empty-state')) continue;

    if (!/\bdata-entity="empty-state"/i.test(attrs)) {
      addError(file, 'crm-empty-state block must include data-entity="empty-state"', match[0]);
    }
    if (/\bdemo-hidden\b/i.test(attrs) && !/\bhidden\b/i.test(attrs)) {
      addError(file, 'demo-hidden empty-state must use native hidden attribute', match[0]);
    }
  }
}

for (const { packName, file } of packPageFiles) {
  const content = fs.readFileSync(file, 'utf8');
  if (!/<section[^>]*class="[^"]*crm-page[^"]*"[^>]*\bdata-page="[^"]+"/i.test(content)) addError(file, `missing section.crm-page[data-page] in ${packName} page template`);

  const firstLines = content.split(/\r?\n/).slice(0, 12).join('\n');
  if (!/<!--\s*Reference:\s*static-uikit\/pages\/[^\n]+-->/i.test(firstLines)) addError(file, 'missing near-top reference comment <!-- Reference: static-uikit/pages/... -->');
  if (!/<!--\s*UMI TODO:/i.test(content)) addError(file, 'missing UMI TODO comment <!-- UMI TODO: ... -->');
}

if (errors.length) {
  console.error(`❌ static-uikit validation failed: ${errors.length} issue(s)`);
  errors.forEach((error, idx) => console.error(`${idx + 1}. ${error}`));
  process.exit(1);
}

console.log('✅ static-uikit validation passed');
console.log(`Checked packs: ${packs.map((pack) => pack.name).join(', ')}`);
console.log(`Checked standalone pages: ${pageFiles.length}`);
console.log('Checked inventory hooks: actions/forms/filters/statuses/entities');
