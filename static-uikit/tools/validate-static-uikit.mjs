#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve('static-uikit');
const pagesDir = path.join(rootDir, 'pages');
const launcherFile = path.join(rootDir, 'index.html');
const partialsDir = path.join(rootDir, 'partials');
const handoffManifestFile = path.join(rootDir, 'HANDOFF_MANIFEST.json');
const handoffNotesFile = path.join(rootDir, 'HANDOFF_NOTES.md');
const requiredHandoffChecks = [
  'node static-uikit/tools/validate-static-uikit.mjs',
  'npm run build'
];
const requiredHandoffNotesSnippets = [
  'Standalone HTML demo pages',
  'UMI P0 extraction pack',
  'UMI P1 extraction pack',
  'node static-uikit/tools/validate-static-uikit.mjs',
  'npm run build',
  'extraction packs',
  'server-rendered/static-template-first',
  'global-only',
  'checked',
  '.is-selected',
  '.is-active'
];

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
const expectedStandalonePages = [
  'dashboard.html',
  'subjects.html',
  'subject-card.html',
  'subject-register.html',
  'contract-wizard.html',
  'brokerage.html',
  'trust-management.html',
  'agents.html',
  'requests.html',
  'compliance.html',
  'compliance-card.html',
  'middle-office-clients.html',
  'middle-office-reports.html',
  'depository.html',
  'back-office.html',
  'trading.html',
  'trading-card.html',
  'administration.html',
  'archive.html',
  'error.html'
];
const requiredStandaloneAssetRefs = [
  '../assets/css/uikit.min.css',
  '../assets/css/crm-static.css',
  '../assets/js/uikit.min.js',
  '../assets/js/uikit-icons.min.js',
  '../assets/js/crm-static.js'
];
const hookKeys = {
  'data-entity': 'entities',
  'data-action': 'actions',
  'data-form': 'forms',
  'data-filter': 'filters',
  'data-status': 'statuses'
};
const nonSubmitActionPrefixes = ['export', 'download', 'resend', 'view', 'open', 'restore', 'print'];
const standalonePageScriptRegistry = {
  'subject-card.html': ['../assets/js/pages/subject-card.js']
};
const sharedPageUtilities = new Set([]);

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

function validateRegistryFilterPanelStructure(file, content) {
  const filterFormRegex = /<form\b([^>]*)class="([^"]*\bcrm-registry-filters\b[^"]*\bcrm-filter-panel\b[^"]*)"([^>]*)>([\s\S]*?)<\/form>/gi;
  for (const match of content.matchAll(filterFormRegex)) {
    const formOpenTag = `<form ${match[1]}class="${match[2]}"${match[3]}>`;
    const inner = match[4];

    const searchRows = inner.match(/<div[^>]*class="[^"]*\bcrm-filter-search-row\b[^"]*"/gi) || [];
    if (searchRows.length !== 1) addError(file, 'registry filter panel must include exactly one .crm-filter-search-row', formOpenTag);

    if (!/<div[^>]*class="[^"]*\bcrm-filter-fields-row\b[^"]*"/i.test(inner)) {
      addError(file, 'registry filter panel is missing .crm-filter-fields-row', formOpenTag);
    }
  }

  const panelBlocks = content.match(/<form\b[^>]*class="[^"]*\bcrm-registry-filters\b[^"]*\bcrm-filter-panel\b[^"]*"[^>]*>[\s\S]*?<\/form>/gi) || [];
  for (const panel of panelBlocks) {
    if (/<div[^>]*class="[^"]*\bcrm-card\b[^"]*\bcrm-table\b[^"]*"/i.test(panel)) {
      addError(file, '.crm-card.crm-table must not be inside .crm-filter-panel form');
    }
  }
}

function validateFormControlPatterns(file, content) {
  function validateControl(selector, checker) {
    const regex = new RegExp(`<([a-z0-9-]+)\\b([^>]*)class="([^"]*\\b${selector}\\b[^"]*)"([^>]*)>([\\s\\S]*?)<\\/\\1>`, 'gi');
    for (const match of content.matchAll(regex)) checker(match);
  }

  validateControl('crm-option-card', (match) => {
    const attrs = `${match[2]} ${match[4]}`;
    const inner = match[5];
    const hasRadio = /<input\b[^>]*\btype="radio"[^>]*>/i.test(inner);
    const isLinkTile = /\bhref="/i.test(attrs) || /\bdata-href="/i.test(attrs);
    if (!hasRadio && !isLinkTile) addError(file, '.crm-option-card must contain input[type="radio"] unless it is a link/action tile');
    if (hasRadio) {
      const selected = /\bis-selected\b/.test(match[3]);
      const checked = /<input\b[^>]*\btype="radio"[^>]*\bchecked\b[^>]*>/i.test(inner);
      if (selected && !checked) addError(file, '.crm-option-card.is-selected must contain checked radio');
      if (checked && !selected) addError(file, '.crm-option-card with checked radio must include .is-selected');
    }
  });

  validateControl('crm-radio-tile', (match) => {
    const inner = match[5];
    const hasRadio = /<input\b[^>]*\btype="radio"[^>]*>/i.test(inner);
    if (!hasRadio) addError(file, '.crm-radio-tile must contain input[type="radio"]');
    const selected = /\bis-selected\b/.test(match[3]);
    const checked = /<input\b[^>]*\btype="radio"[^>]*\bchecked\b[^>]*>/i.test(inner);
    if (selected && !checked) addError(file, '.crm-radio-tile.is-selected must contain checked radio');
    if (checked && !selected) addError(file, '.crm-radio-tile with checked radio must include .is-selected');
  });

  validateControl('crm-binary-control', (match) => {
    const inner = match[5];
    for (const labelMatch of inner.matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label>/gi)) {
      const labelClass = (labelMatch[1].match(/\bclass="([^"]+)"/i) || [])[1] || '';
      const labelInner = labelMatch[2];
      const hasRadio = /<input\b[^>]*\btype="radio"[^>]*>/i.test(labelInner);
      if (!hasRadio) addError(file, '.crm-binary-control labels must contain input[type="radio"]');
      const active = /\bis-active\b/.test(labelClass);
      const checked = /<input\b[^>]*\btype="radio"[^>]*\bchecked\b[^>]*>/i.test(labelInner);
      if (active && !checked) addError(file, '.crm-binary-control label.is-active must contain checked radio');
      if (checked && !active) addError(file, '.crm-binary-control label with checked radio must include .is-active');
    }
  });

  validateControl('crm-check-row', (match) => {
    const inner = match[5];
    const hasInput = /<input\b[^>]*\btype="(?:checkbox|radio)"[^>]*>/i.test(inner);
    if (!hasInput) addError(file, '.crm-check-row must contain input[type="checkbox"|"radio"]');
    const active = /\bis-active\b/.test(match[3]);
    const checked = /<input\b[^>]*\btype="(?:checkbox|radio)"[^>]*\bchecked\b[^>]*>/i.test(inner);
    if (active && !checked) addError(file, '.crm-check-row.is-active must contain checked input');
    if (checked && !active) addError(file, '.crm-check-row with checked input must include .is-active');
  });
}

function validateStandalonePageScriptRegistry(pageFiles) {
  const scriptDir = path.join(rootDir, 'assets', 'js', 'pages');
  const pageScripts = fs.existsSync(scriptDir) ? fs.readdirSync(scriptDir).filter((file) => file.endsWith('.js')) : [];
  const owners = new Map();

  for (const [page, scripts] of Object.entries(standalonePageScriptRegistry)) {
    const pageFile = path.join(pagesDir, page);
    if (!pageFiles.includes(page)) addError(pageFile, 'registered page script owner page does not exist');
    if (!Array.isArray(scripts) || !scripts.length) {
      addError(pageFile, 'registered page scripts must be a non-empty array');
      continue;
    }

    const pageContent = fs.existsSync(pageFile) ? fs.readFileSync(pageFile, 'utf8') : '';
    const crmStaticIndex = findScriptIndex(pageContent, '../assets/js/crm-static.js');

    scripts.forEach((scriptPath) => {
      const resolved = path.resolve(pagesDir, scriptPath);
      if (!fs.existsSync(resolved)) addError(pageFile, 'registered page script file does not exist', scriptPath);

      owners.set(scriptPath, (owners.get(scriptPath) || 0) + 1);

      const scriptIndex = findScriptIndex(pageContent, scriptPath);
      if (scriptIndex < 0) addError(pageFile, 'registered page script is missing from owning standalone page', scriptPath);
      if (crmStaticIndex >= 0 && scriptIndex >= 0 && scriptIndex < crmStaticIndex) {
        addError(pageFile, 'page script must be loaded after ../assets/js/crm-static.js', scriptPath);
      }
    });
  }

  for (const page of pageFiles) {
    const pageFile = path.join(pagesDir, page);
    const content = fs.readFileSync(pageFile, 'utf8');
    const ownerScripts = new Set(standalonePageScriptRegistry[page] || []);
    const pageScriptRefs = [...content.matchAll(/<script[^>]*\bsrc="(\.\.\/assets\/js\/pages\/[^"]+)"[^>]*>/gi)].map((m) => m[1]);
    for (const ref of pageScriptRefs) {
      if (!ownerScripts.has(ref)) addError(pageFile, 'standalone page includes page script it does not own', ref);
    }
  }

  for (const scriptName of pageScripts) {
    const refPath = `../assets/js/pages/${scriptName}`;
    if (sharedPageUtilities.has(refPath)) continue;
    const ownerCount = owners.get(refPath) || 0;
    if (ownerCount !== 1) addError(path.join(scriptDir, scriptName), 'every page script must be owned by exactly one standalone page registry entry');
  }
}

function validatePageScriptsAndGlobalPurity() {
  const crmStaticFile = path.join(rootDir, 'assets', 'js', 'crm-static.js');
  const scriptDir = path.join(rootDir, 'assets', 'js', 'pages');
  const pageScripts = fs.existsSync(scriptDir) ? fs.readdirSync(scriptDir).filter((file) => file.endsWith('.js')).map((file) => path.join(scriptDir, file)) : [];

  if (fs.existsSync(crmStaticFile)) {
    const content = fs.readFileSync(crmStaticFile, 'utf8');
    for (const scriptFile of pageScripts) {
      const token = `assets/js/pages/${path.basename(scriptFile)}`;
      if (content.includes(token) || content.includes(`../${token}`)) addError(crmStaticFile, 'crm-static.js must not reference page-only script paths', token);
    }
    if (/body\.getAttribute\(['"]data-page['"]\)\s*===\s*['"][a-z0-9-]+['"]/.test(content) || /\[data-page=['"][a-z0-9-]+['"]\]/.test(content)) {
      addError(crmStaticFile, 'crm-static.js must not contain concrete page guards by data-page');
    }
    if (!/function\s+escapeCssValue\s*\(/.test(content)) {
      addError(crmStaticFile, 'crm-static.js must define local escapeCssValue helper before building name-based selectors');
    }
    if (/CSS\.escape\(/.test(content.replace(/function\s+escapeCssValue\s*\([\s\S]*?\}\n/, ''))) {
      addError(crmStaticFile, 'crm-static.js must not call CSS.escape directly outside escapeCssValue helper');
    }
  }

  const forbiddenDataPattern = /window\.[a-z0-9_]*data/i;
  const forbiddenRendererPattern = /(render[A-Z][a-zA-Z0-9]*|create[A-Z][a-zA-Z0-9]*(?:Row|Card))\s*\(/;
  const forbiddenMutations = [/innerHTML\s*=/, /createElement\(/, /insertAdjacentHTML\s*\(/];

  for (const scriptFile of pageScripts) {
    const content = fs.readFileSync(scriptFile, 'utf8');
    const guardPattern = /(body\.getAttribute\(['"]data-page['"]\)\s*===\s*['"][a-z0-9-]+['"]|\.crm-page\[data-page=['"][a-z0-9-]+['"]\])/;
    if (!guardPattern.test(content)) addError(scriptFile, 'page script must include a concrete page guard');
    if (forbiddenDataPattern.test(content)) addError(scriptFile, 'page script must not contain window.*Data demo models');
    if (forbiddenRendererPattern.test(content)) addError(scriptFile, 'page script must be behavior-only and must not include render/create row/card style renderers');
    forbiddenMutations.forEach((pattern) => {
      if (pattern.test(content)) addError(scriptFile, 'page script must not generate page data/content via DOM insertion APIs', pattern.toString());
    });
  }
}



function validateUmiPageScriptNotes() {
  for (const pack of packs) {
    const pagesPath = path.join(pack.dir, 'pages');
    if (!fs.existsSync(pagesPath)) continue;
    const packPages = fs.readdirSync(pagesPath).filter((f) => f.endsWith('.html'));
    for (const page of packPages) {
      const scripts = standalonePageScriptRegistry[page];
      if (!scripts || !scripts.length) continue;
      const file = path.join(pagesPath, page);
      const content = fs.readFileSync(file, 'utf8');
      const mentionsScript = scripts.some((scriptPath) => content.includes(scriptPath) || content.includes(path.basename(scriptPath)));
      const hasUmiNote = /UMI NOTE:[^\n]*(page script|include[^\n]*assets\/js\/pages)/i.test(content);
      if (!mentionsScript && !hasUmiNote) {
        addError(file, 'UMI template with standalone page-script owner must include script path or UMI NOTE about include requirement', scripts.join(', '));
      }
    }
  }
}

function validateUmiRuntimeDataContract(file, content) {
  if (!/\/umi-p[01]\//.test(file.replaceAll('\\', '/'))) return;
  const forbiddenDataPattern = /window\.[a-z0-9_]*data/i;
  const forbiddenRendererPattern = /(render[A-Z][a-zA-Z0-9]*|create[A-Z][a-zA-Z0-9]*(?:Row|Card|Profile))\s*\(/;
  if (forbiddenDataPattern.test(content)) addError(file, 'UMI pack templates/scripts must not contain window.*Data runtime models');
  if (forbiddenRendererPattern.test(content)) addError(file, 'UMI pack templates/scripts must not include runtime render/create helpers');
}

function validateHandoffManifest() {
  const handoffManifest = parseJsonFile(handoffManifestFile, 'HANDOFF_MANIFEST.json');
  if (!handoffManifest || typeof handoffManifest !== 'object') return;

  if (handoffManifest.runtime !== false) addError(handoffManifestFile, 'handoff manifest runtime must be false');
  if (handoffManifest.buildStep !== false) addError(handoffManifestFile, 'handoff manifest buildStep must be false');
  if (handoffManifest.localAssetsOnly !== true) addError(handoffManifestFile, 'handoff manifest localAssetsOnly must be true');
  if (handoffManifest.reactVitePrototypeUntouched !== true) addError(handoffManifestFile, 'handoff manifest reactVitePrototypeUntouched must be true');

  if (!handoffManifest.safetyConstraints || typeof handoffManifest.safetyConstraints !== 'object') {
    addError(handoffManifestFile, 'handoff manifest safetyConstraints must be an object');
  } else {
    for (const [key, value] of Object.entries(handoffManifest.safetyConstraints)) {
      if (value !== true) addError(handoffManifestFile, 'handoff manifest safetyConstraints values must be true', key);
    }
  }

  for (const [field, expectDir] of [
    ['standalonePages', false],
    ['partials', false],
    ['localAssets', true]
  ]) {
    const entries = handoffManifest[field];
    if (!Array.isArray(entries)) {
      addError(handoffManifestFile, `handoff manifest ${field} must be an array`);
      continue;
    }

    for (const entry of entries) {
      if (typeof entry !== 'string') {
        addError(handoffManifestFile, `handoff manifest ${field} entries must be strings`);
        continue;
      }

      const normalized = entry.replace(/\\/g, '/');
      const target = path.join(rootDir, entry);
      const isFontsDir = normalized.endsWith('assets/fonts/') || normalized.endsWith('assets/fonts');

      if (isFontsDir) {
        if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
          addError(handoffManifestFile, 'handoff manifest localAssets fonts directory is missing', entry);
          continue;
        }
        const fontFiles = walk(target).filter((file) => file.endsWith('.woff2'));
        if (!fontFiles.length) addError(handoffManifestFile, 'handoff manifest fonts directory must contain at least one .woff2 file', entry);
        continue;
      }

      if (!fs.existsSync(target)) {
        addError(handoffManifestFile, `handoff manifest ${field} entry does not exist`, entry);
        continue;
      }

      if (expectDir && normalized.endsWith('/')) {
        if (!fs.statSync(target).isDirectory()) addError(handoffManifestFile, 'handoff manifest localAssets directory entry must be a directory', entry);
      }
    }
  }

  if (!Array.isArray(handoffManifest.umiPacks)) {
    addError(handoffManifestFile, 'handoff manifest umiPacks must be an array');
  } else {
    handoffManifest.umiPacks.forEach((pack, idx) => {
      if (!pack || typeof pack !== 'object') {
        addError(handoffManifestFile, `handoff manifest umiPacks[${idx}] must be an object`);
        return;
      }

      for (const field of ['root', 'manifest', 'inventory', 'checklist']) {
        if (typeof pack[field] !== 'string') {
          addError(handoffManifestFile, `handoff manifest umiPacks[${idx}].${field} must be a string`);
          continue;
        }
        const target = path.join(rootDir, pack[field]);
        if (!fs.existsSync(target)) addError(handoffManifestFile, `handoff manifest umiPacks[${idx}].${field} path does not exist`, pack[field]);
      }
    });
  }

  if (!Array.isArray(handoffManifest.requiredChecks)) {
    addError(handoffManifestFile, 'handoff manifest requiredChecks must be an array');
  } else {
    for (const requiredCheck of requiredHandoffChecks) {
      if (!handoffManifest.requiredChecks.includes(requiredCheck)) {
        addError(handoffManifestFile, 'handoff manifest missing required check command', requiredCheck);
      }
    }
  }
}

function validateHandoffNotes() {
  if (!fs.existsSync(handoffNotesFile)) {
    addError(handoffNotesFile, 'HANDOFF_NOTES.md is missing');
    return;
  }

  const content = fs.readFileSync(handoffNotesFile, 'utf8');
  for (const snippet of requiredHandoffNotesSnippets) {
    if (!content.includes(snippet)) addError(handoffNotesFile, 'handoff notes missing required snippet', snippet);
  }
}

validateHandoffManifest();
validateHandoffNotes();
validateUmiPageScriptNotes();

const pageFiles = fs.existsSync(pagesDir) ? fs.readdirSync(pagesDir).filter((f) => f.endsWith('.html')) : [];
const pageFilesSet = new Set(pageFiles);
const packPageFiles = packs.flatMap((pack) => {
  const packPagesDir = path.join(pack.dir, 'pages');
  if (!fs.existsSync(packPagesDir)) return [];
  return fs.readdirSync(packPagesDir).filter((f) => f.endsWith('.html')).map((file) => ({ packName: pack.name, file: path.join(packPagesDir, file) }));
});
const knownHtmlTargets = new Set([...pageFiles, ...packPageFiles.map(({ file }) => path.basename(file))]);

for (const expectedPage of expectedStandalonePages) {
  if (!pageFilesSet.has(expectedPage)) addError(path.join(pagesDir, expectedPage), 'required standalone page is missing');
}
for (const page of pageFiles) {
  if (!expectedStandalonePages.includes(page)) addError(path.join(pagesDir, page), 'unexpected extra standalone page (not in release page list)');
}

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

  validateUmiRuntimeDataContract(file, content);

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

    const linkishRegex = /<([a-z0-9-]+)\b([^>]*)>/gi;
    for (const elementMatch of content.matchAll(linkishRegex)) {
      const attrs = elementMatch[2];
      const hrefMatch = attrs.match(/\bhref="([^"]+)"/i);
      const dataHrefMatch = attrs.match(/\bdata-href="([^"]+)"/i);
      if (!hrefMatch || !dataHrefMatch) continue;
      const hrefTarget = hrefMatch[1].trim();
      const dataHrefTarget = dataHrefMatch[1].trim();
      if (!hrefTarget.endsWith('.html') || !dataHrefTarget.endsWith('.html')) continue;
      if (hrefTarget !== dataHrefTarget) addError(file, 'href and data-href html targets must match on the same element', `${hrefTarget} !== ${dataHrefTarget}`);
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

      const buttonRegex = /<button\b([^>]*)>/gi;
      for (const buttonMatch of formInner.matchAll(buttonRegex)) {
        const buttonAttrs = buttonMatch[1];
        const typeMatch = buttonAttrs.match(/\btype="([^"]+)"/i);
        if (!typeMatch) {
          addError(file, 'button inside form is missing required type attribute', buttonMatch[0]);
          continue;
        }
        const buttonType = typeMatch[1].trim().toLowerCase();
        if (!['submit', 'reset', 'button'].includes(buttonType)) {
          addError(file, 'button inside form has unsupported type attribute', buttonMatch[0]);
          continue;
        }

        const actionMatch = buttonAttrs.match(/\bdata-action="([^"]+)"/i);
        if (buttonType === 'submit' && actionMatch) {
          const action = actionMatch[1].trim().toLowerCase();
          if (nonSubmitActionPrefixes.some((prefix) => action.startsWith(prefix))) {
            addError(file, 'button action that starts with export/download/resend/view/open/restore/print must not use type="submit" inside forms', buttonMatch[0]);
          }
        }
      }
    }
  }
}





function validateNoRawHexInPageCss() {
  const cssFiles = [path.join(rootDir, 'assets', 'css', 'pages', 'subject-card.css')];
  const hexPattern = /#[0-9a-fA-F]{3,8}\b/;

  for (const file of cssFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split(/\r?\n/);
    lines.forEach((line, idx) => {
      if (hexPattern.test(line)) addError(file, `raw hex color is forbidden in page-level CSS on line ${idx + 1}`, line.trim());
    });
  }
}

function validateSubjectCardNoNestedCards() {
  const file = path.join(pagesDir, 'subject-card.html');
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  const tagRegex = /<\/?([a-zA-Z][\w:-]*)\b[^>]*>/g;
  const voidElements = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  const stack = [];
  for (const match of content.matchAll(tagRegex)) {
    const tag = match[0];
    const tagName = match[1].toLowerCase();
    const isClose = /^<\//.test(tag);
    const isSelfClosing = /\/>$/.test(tag) || voidElements.has(tagName);

    if (isClose) {
      for (let i = stack.length - 1; i >= 0; i -= 1) {
        if (stack[i].tagName === tagName) {
          stack.length = i;
          break;
        }
      }
      continue;
    }

    const isCard = /\bclass="[^"]*\bcrm-card\b[^"]*"/i.test(tag);
    // Scan every element type (not only <div>) because subject-card uses .crm-card on semantic tags like <article>.
    if (isCard && stack.some((entry) => entry.isCard)) {
      addError(file, 'subject-card must not contain nested .crm-card inside .crm-card', `<${tagName}> ${tag.trim()}`);
      break;
    }

    if (!isSelfClosing) stack.push({ tagName, isCard });
  }
}

function findScriptIndex(content, scriptPath) {
  const escaped = scriptPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`<script[^>]*\\bsrc="${escaped}"[^>]*>\\s*</script>`, 'gi');
  const match = regex.exec(content);
  return match ? match.index : -1;
}

function extractBalancedTagByAttribute(content, tagName, attrName, attrValue) {
  const escapedAttrValue = attrValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const openTagRegex = new RegExp(`<${tagName}\\b[^>]*\\b${attrName}="${escapedAttrValue}"[^>]*>`, 'i');
  const openMatch = openTagRegex.exec(content);
  if (!openMatch) return null;

  const voidElements = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  const tagRegex = /<\/?([a-zA-Z][\w:-]*)\b[^>]*>/g;
  const fragment = content.slice(openMatch.index);
  const stack = [];

  for (const match of fragment.matchAll(tagRegex)) {
    const tag = match[0];
    const currentTag = match[1].toLowerCase();
    const isClose = /^<\//.test(tag);
    const isSelfClosing = /\/>$/.test(tag) || voidElements.has(currentTag);

    if (isClose) {
      if (stack.length && stack[stack.length - 1] === currentTag) {
        stack.pop();
        if (!stack.length) {
          const end = openMatch.index + match.index + tag.length;
          return content.slice(openMatch.index, end);
        }
      }
      continue;
    }

    if (!isSelfClosing) {
      stack.push(currentTag);
    }
  }

  return null;
}

function validateBalancedTagHelperSelfTest() {
  const file = path.join(rootDir, 'tools', 'validate-static-uikit.mjs');
  const fixture = `
<section>
  <div data-role="main-data-grid" class="crm-grid">
    <div class="crm-profile-row">A</div>
  </div>
  <div data-role="address-registration">
    <div class="crm-address-row">Primary</div>
  </div>
  <div data-role="addresses-extra">
    <div class="crm-address-row">One</div>
    <div class="crm-address-row">Two</div>
  </div>
  <table>
    <tbody data-role="representatives-table-body">
      <tr><td>Rep 1</td></tr>
      <tr><td>Rep 2</td></tr>
    </tbody>
  </table>
</section>`.trim();

  const mainDataGridBlock = extractBalancedTagByAttribute(fixture, 'div', 'data-role', 'main-data-grid');
  if (!mainDataGridBlock || !mainDataGridBlock.startsWith('<div data-role="main-data-grid"') || !/class="crm-profile-row"/.test(mainDataGridBlock)) {
    addError(file, 'balanced-tag helper self-test failed for div[data-role="main-data-grid"]');
  }

  const addressesExtraBlock = extractBalancedTagByAttribute(fixture, 'div', 'data-role', 'addresses-extra');
  const addressRowsCount = (addressesExtraBlock?.match(/class="crm-address-row"/g) || []).length;
  if (!addressesExtraBlock || !addressesExtraBlock.startsWith('<div data-role="addresses-extra"') || addressRowsCount !== 2) {
    addError(file, 'balanced-tag helper self-test failed for div[data-role="addresses-extra"]');
  }

  const repsBlock = extractBalancedTagByAttribute(fixture, 'tbody', 'data-role', 'representatives-table-body');
  const repsRowCount = (repsBlock?.match(/<tr\b/g) || []).length;
  if (!repsBlock || !repsBlock.startsWith('<tbody data-role="representatives-table-body"') || repsRowCount < 1) {
    addError(file, 'balanced-tag helper self-test failed for tbody[data-role="representatives-table-body"]');
  }

  if (extractBalancedTagByAttribute(fixture, 'div', 'data-role', 'missing-role') !== null) {
    addError(file, 'balanced-tag helper self-test failed for missing attribute lookup');
  }

  const brokenFixture = '<section><div data-role="broken"><span>Oops</section>';
  if (extractBalancedTagByAttribute(brokenFixture, 'div', 'data-role', 'broken') !== null) {
    addError(file, 'balanced-tag helper self-test failed for unbalanced target element');
  }
}

function validateSubjectCardStaticRendering() {
  const standalone = path.join(rootDir, 'pages', 'subject-card.html');
  const umiP0 = path.join(rootDir, 'umi-p0', 'pages', 'subject-card.html');
  const scriptFile = path.join(rootDir, 'assets', 'js', 'crm-static.js');
  const subjectCardScriptFile = path.join(rootDir, 'assets', 'js', 'pages', 'subject-card.js');

  const forbiddenPatterns = [/window\.subjectCardData/, /renderSubjectCardProfile\s*\(/, /createProfileRow\s*\(/, /createAddressCard\s*\(/];
  for (const file of [standalone, umiP0, scriptFile, subjectCardScriptFile]) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(content)) addError(file, 'forbidden subject-card demo runtime renderer/data pattern detected', pattern.toString());
    }
  }

  if (fs.existsSync(scriptFile)) {
    const content = fs.readFileSync(scriptFile, 'utf8');
    const forbiddenTokens = [
      'representative-modal',
      'toggle-representative-expiry',
      'representative-expiry',
      'toggle-addresses',
      'addresses-extra',
      'addresses-section',
      'open-representative-modal',
      'close-representative-modal',
      'save-representative'
    ];
    forbiddenTokens.forEach((token) => {
      if (content.includes(token)) addError(scriptFile, 'crm-static.js must stay page-agnostic and must not include subject-card-specific token', token);
    });
  }

  if (fs.existsSync(subjectCardScriptFile)) {
    const content = fs.readFileSync(subjectCardScriptFile, 'utf8');
    const pageGuardPattern = /(body\.getAttribute\(['"]data-page['"]\)\s*===\s*['"]subject-card['"]|\.crm-page\[data-page=['"]subject-card['"]\])/;
    if (!pageGuardPattern.test(content)) addError(subjectCardScriptFile, 'subject-card.js must guard execution by subject-card page detection');
    const forbiddenRenderingPatterns = [/createElement\(/, /innerHTML\s*=\s*/, /insertAdjacentHTML\s*\(/];
    forbiddenRenderingPatterns.forEach((pattern) => {
      if (pattern.test(content)) addError(subjectCardScriptFile, 'subject-card.js must be behavior-only and must not render subject-card content', pattern.toString());
    });
  }

  if (!fs.existsSync(standalone)) return;
  const content = fs.readFileSync(standalone, 'utf8');

  const crmStaticIndex = findScriptIndex(content, '../assets/js/crm-static.js');
  if (crmStaticIndex < 0) addError(standalone, 'subject-card must include ../assets/js/crm-static.js');

  const subjectCardScriptIndex = findScriptIndex(content, '../assets/js/pages/subject-card.js');
  if (subjectCardScriptIndex < 0) addError(standalone, 'subject-card must include ../assets/js/pages/subject-card.js');
  if (crmStaticIndex >= 0 && subjectCardScriptIndex >= 0 && subjectCardScriptIndex < crmStaticIndex) {
    addError(standalone, 'subject-card.js must be loaded after crm-static.js');
  }

  const mainDataGridBlock = extractBalancedTagByAttribute(content, 'div', 'data-role', 'main-data-grid');
  if (!mainDataGridBlock || !/class="[^"]*\bcrm-profile-row\b/i.test(mainDataGridBlock)) {
    addError(standalone, 'data-role="main-data-grid" must contain at least one .crm-profile-row');
  }

  const addressRegistrationBlock = extractBalancedTagByAttribute(content, 'div', 'data-role', 'address-registration');
  if (!addressRegistrationBlock || !/class="[^"]*\bcrm-address-(?:row|card)\b/i.test(addressRegistrationBlock)) {
    addError(standalone, 'data-role="address-registration" must contain .crm-address-row or .crm-address-card');
  }

  const addressesExtraBlock = extractBalancedTagByAttribute(content, 'div', 'data-role', 'addresses-extra');
  if (!addressesExtraBlock) {
    addError(standalone, 'subject-card must include data-role="addresses-extra" block');
  } else {
    const rows = addressesExtraBlock.match(/class="[^"]*\bcrm-address-row\b/gi) || [];
    if (rows.length < 2) addError(standalone, 'data-role="addresses-extra" must contain at least two .crm-address-row blocks');
  }

  const repsBlock = extractBalancedTagByAttribute(content, 'tbody', 'data-role', 'representatives-table-body');
  if (!repsBlock || !(repsBlock.match(/<tr\b/gi) || []).length) {
    addError(standalone, 'tbody[data-role="representatives-table-body"] must contain at least one <tr>');
  }
}


function validatePartials() {
  const partialFiles = fs.existsSync(partialsDir) ? fs.readdirSync(partialsDir).filter((f) => f.endsWith('.html')).map((f) => path.join(partialsDir, f)) : [];

  for (const file of partialFiles) {
    const content = fs.readFileSync(file, 'utf8');

    const lines = content.split(/\r?\n/);
    lines.forEach((line, idx) => {
      if (forbiddenExternalPattern.test(line)) addError(file, `forbidden external/CDN/analytics pattern on line ${idx + 1}`, line.trim());
      if (forbiddenApiPattern.test(line)) addError(file, `forbidden API pattern on line ${idx + 1}`, line.trim());
    });

    for (const m of content.matchAll(/\b(?:href|data-href)="([^"]+)"/g)) {
      const target = m[1].trim();
      if (!target.endsWith('.html')) continue;
      if (/placeholder|todo/i.test(target)) continue;
      if (target.startsWith('#') || target.startsWith('/') || target.includes('{{') || /^[a-z]+:/i.test(target)) continue;
      if (!pageFilesSet.has(path.basename(target))) {
        addError(file, 'partials html link target must point to existing standalone page', target);
      }
    }

    for (const match of content.matchAll(/<button\b([^>]*)>/gi)) {
      const attrs = match[1];
      if (!/\btype="[^"]+"/i.test(attrs)) addError(file, '<button> is missing required type attribute', match[0]);
    }

    for (const match of content.matchAll(/<([a-z0-9-]+)\b([^>]*)>/gi)) {
      const attrs = match[2];
      const classValue = (attrs.match(/\bclass="([^"]+)"/i) || [])[1] || '';
      const classTokens = classValue.split(/\s+/).filter(Boolean);
      const entityMatch = attrs.match(/\bdata-entity="([^"]*)"/i);
      const actionMatch = attrs.match(/\bdata-action="([^"]*)"/i);
      const statusMatch = attrs.match(/\bdata-status="([^"]*)"/i);

      if (entityMatch && !entityMatch[1].trim()) addError(file, 'data-entity must not be empty', match[0]);
      if (actionMatch && !actionMatch[1].trim()) addError(file, 'data-action must not be empty', match[0]);
      if (statusMatch && !statusMatch[1].trim()) addError(file, 'data-status must not be empty', match[0]);

      if (classTokens.includes('crm-badge')) {
        const hasStatus = /\bdata-status="[^"]+"/i.test(attrs);
        const hasDecorativeEntity = /\bdata-entity="[^"]+"/i.test(attrs);
        if (!hasStatus && !hasDecorativeEntity) addError(file, 'crm-badge must include data-status or explicit decorative data-entity', match[0]);
      }

      if (classTokens.includes('crm-empty-state')) {
        if (!/\bdata-entity="empty-state"/i.test(attrs)) addError(file, 'crm-empty-state block must include data-entity="empty-state"', match[0]);
        if (/\bdemo-hidden\b/i.test(attrs) && !/\bhidden\b/i.test(attrs)) addError(file, 'demo-hidden empty-state must use native hidden attribute', match[0]);
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

validatePartials();
validateStaticUikitLauncher();
validateStandalonePageScriptRegistry(pageFiles);
validatePageScriptsAndGlobalPurity();
validateNoRawHexInPageCss();
validateSubjectCardNoNestedCards();
validateSubjectCardStaticRendering();
validateBalancedTagHelperSelfTest();

for (const page of pageFiles) {
  const file = path.join(pagesDir, page);
  const content = fs.readFileSync(file, 'utf8');
  if (!/^\s*<!doctype html>/i.test(content)) addError(file, 'missing <!doctype html>');
  if (!/<html[^>]*\blang="ru"/i.test(content)) addError(file, 'missing <html lang="ru">');
  if (!/<meta[^>]*charset="utf-8"/i.test(content)) addError(file, 'missing <meta charset="utf-8">');
  if (!/<meta[^>]*name="viewport"[^>]*content="width=device-width,\s*initial-scale=1"/i.test(content)) {
    addError(file, 'missing required viewport meta tag');
  }

  if (!/<div[^>]*class="[^"]*\bcrm-app\b[^"]*"/i.test(content)) addError(file, 'missing .crm-app shell container');
  if (!/<aside[^>]*class="[^"]*\bcrm-sidebar\b[^"]*"/i.test(content)) addError(file, 'missing .crm-sidebar shell block');
  if (!/<main[^>]*class="[^"]*\bcrm-main\b[^"]*"/i.test(content)) addError(file, 'missing .crm-main shell block');
  if (!/<header[^>]*class="[^"]*\bcrm-topbar\b[^"]*"/i.test(content)) addError(file, 'missing .crm-topbar shell block');

  if (!/<body[^>]*\bdata-page="[^"]+"/i.test(content)) addError(file, 'missing body[data-page]');
  if (!/<section[^>]*class="[^"]*crm-page[^"]*"[^>]*\bdata-page="[^"]+"/i.test(content)) addError(file, 'missing section.crm-page[data-page]');

  const bodyPageMatch = content.match(/<body[^>]*\bdata-page="([^"]+)"/i);
  const sectionPageMatch = content.match(/<section[^>]*class="[^"]*\bcrm-page\b[^"]*"[^>]*\bdata-page="([^"]+)"/i);
  if (bodyPageMatch && sectionPageMatch && bodyPageMatch[1].trim() !== sectionPageMatch[1].trim()) {
    addError(file, 'body[data-page] must match section.crm-page[data-page]', `${bodyPageMatch[1]} !== ${sectionPageMatch[1]}`);
  }

  for (const requiredAssetRef of requiredStandaloneAssetRefs) {
    const escaped = requiredAssetRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!new RegExp(`\\b(?:href|src)="${escaped}"`, 'i').test(content)) {
      addError(file, 'missing required local standalone asset reference', requiredAssetRef);
    }
  }

  if (!/<input[^>]*\bname="global-search"/i.test(content)) addError(file, 'missing topbar global search input[name="global-search"]');
  if (!/<button[^>]*\bdata-sidebar-toggle\b/i.test(content)) addError(file, 'missing sidebar toggle button[data-sidebar-toggle]');
  validateRegistryFilterPanelStructure(file, content);
  validateFormControlPatterns(file, content);

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
    const hasDataEntity = /\bdata-entity="([^"]*)"/i.exec(attrs);
    const hasDataAction = /\bdata-action="([^"]*)"/i.exec(attrs);
    const hasDataStatus = /\bdata-status="([^"]*)"/i.exec(attrs);

    if (hasDataEntity && !hasDataEntity[1].trim()) addError(file, 'data-entity must not be empty', match[0]);
    if (hasDataAction && !hasDataAction[1].trim()) addError(file, 'data-action must not be empty', match[0]);
    if (hasDataStatus && !hasDataStatus[1].trim()) addError(file, 'data-status must not be empty', match[0]);

    if (classTokens.includes('crm-empty-state')) {
      if (!/\bdata-entity="empty-state"/i.test(attrs)) {
        addError(file, 'crm-empty-state block must include data-entity="empty-state"', match[0]);
      }
      if (!/\bhidden\b/i.test(attrs)) {
        addError(file, 'demo empty-state must use native hidden attribute', match[0]);
      }
      if (/\bdemo-hidden\b/i.test(attrs) && !/\bhidden\b/i.test(attrs)) {
        addError(file, 'demo-hidden empty-state must use native hidden attribute', match[0]);
      }
    }

    if (classTokens.includes('crm-badge') && !/\bdata-status="/i.test(attrs) && !/\bdata-entity="/i.test(attrs)) {
      addError(file, 'crm-badge must include data-status or explicit data-entity for decorative badges', match[0]);
    }
  }

  const breadcrumbsRegex = /<div[^>]*class="[^"]*\bcrm-breadcrumbs\b[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  for (const breadcrumbMatch of content.matchAll(breadcrumbsRegex)) {
    const breadcrumbHtml = breadcrumbMatch[1];
    for (const linkMatch of breadcrumbHtml.matchAll(/\bhref="([^"]+)"/gi)) {
      const target = linkMatch[1].trim();
      if (!target.endsWith('.html')) continue;
      if (/^[a-z]+:/i.test(target) || target.startsWith('/') || target.startsWith('#') || target.includes('{{')) continue;
      const resolved = path.resolve(path.dirname(file), target);
      if (!fs.existsSync(resolved)) addError(file, 'breadcrumb href target path does not exist', target);
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
